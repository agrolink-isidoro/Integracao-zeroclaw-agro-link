# FASE 5: Integração de Conciliação Bancária

## 📋 Resumo Executivo

Implementada **OPÇÃO 1: Integração Incremental** - sistema que combina o import genérico existente (BankStatementImport) com o novo sistema de conciliação avançada (ItemExtratoBancario + ConciliacaoService).

**Status:** ✅ Completo (Backend + Frontend)

**Commit:** `5d814962` - feat(FASE5): Integração sistema antigo + novo para conciliação bancária

---

## 🏗️ Arquitetura da Integração

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD (Sistema Antigo - Staging)                            │
├─────────────────────────────────────────────────────────────────┤
│ CSV File → BankStatementImport → BankTransaction (genérico)    │
│ - Upload via ExtratosUpload.tsx                                 │
│ - Parser genérico (date, amount, description)                   │
│ - Deduplicação por hash SHA256                                  │
│ - Celery queue support                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. CONVERSÃO (Bridge Layer)                                     │
├─────────────────────────────────────────────────────────────────┤
│ POST /bank-statements/{id}/conciliar/                          │
│ - ConciliacaoService.converter_bank_transactions()              │
│ - BankTransaction → ItemExtratoBancario                         │
│ - Detecção de duplicados                                        │
│ - Preserva metadados (arquivo_origem, linha_original)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. CONCILIAÇÃO (Sistema Novo - Matching)                       │
├─────────────────────────────────────────────────────────────────┤
│ ConciliacaoService.match_automatico()                           │
│ - Algoritmo de similaridade (data ±3 dias, valor, descrição)   │
│ - Score-based matching                                          │
│ - Auto-conciliação (similaridade ≥ 90%)                         │
│ - Sugestões manuais (60-89%)                                    │
│ - Atualiza Vencimento.confirmado_extrato = True                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. REVISÃO MANUAL (UI)                                          │
├─────────────────────────────────────────────────────────────────┤
│ - ExtratosUpload.tsx mostra resultado                           │
│ - Tabela de sugestões com score                                 │
│ - POST /itens-extrato/{id}/conciliar_manual/                   │
│ - POST /itens-extrato/{id}/desconciliar/                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend: Componentes Implementados

### 1. Serializers (`financeiro/serializers.py`)

#### `ItemExtratoBancarioSerializer`
```python
fields = [
    'id', 'conta_bancaria', 'conta_bancaria_nome', 'data', 'descricao',
    'valor', 'tipo', 'conciliado', 'conciliado_em', 'conciliado_por',
    'vencimento', 'vencimento_titulo', 'transferencia', ...
]
```

- Nested serialization para vencimento/transferência
- Read-only fields para conciliação (automática)
- Display fields para UI (nomes, títulos)

---

### 2. ViewSets (`financeiro/api.py`)

#### `BankStatementImportViewSet.conciliar_importacao()` (NEW)
```python
@action(detail=True, methods=['post'], url_path='conciliar')
def conciliar_importacao(self, request, pk=None):
    """
    POST /financeiro/bank-statements/{id}/conciliar/
    
    Converts BankTransaction → ItemExtratoBancario
    Runs match_automatico()
    Returns: {
        itens_criados, itens_duplicados, erros,
        matches_automaticos: {conciliados, sugestoes}
    }
    """
```

**Validações:**
- Status deve ser 'success'
- Verifica duplicados antes de criar ItemExtratoBancario

#### `ItemExtratoBancarioViewSet` (NEW)
```python
# Actions disponíveis:
- list()              # GET /itens-extrato/
- retrieve()          # GET /itens-extrato/{id}/
- conciliar_manual()  # POST /itens-extrato/{id}/conciliar_manual/
- desconciliar()      # POST /itens-extrato/{id}/desconciliar/
- pendentes()         # GET /itens-extrato/pendentes/
```

**Filtros:**
- `conta_bancaria`, `conciliado`, `tipo`, `data`
- Search: `descricao`
- Ordering: `data`, `valor`, `conciliado`

---

### 3. Services (`financeiro/services/conciliacao.py`)

#### `ConciliacaoService.converter_bank_transactions()` (NEW)
```python
def converter_bank_transactions(importacao, usuario):
    """
    Converte BankTransaction → ItemExtratoBancario
    
    Returns:
        {
            itens_criados: int,
            itens_duplicados: int,
            erros: List[str],
            total_transacoes: int
        }
    """
```

**Lógica de Duplicação:**
- Verifica: `conta_bancaria` + `data` + `valor` + `descricao[:50]`
- Preserva `arquivo_origem`, `linha_original` para auditoria

**Detecção de Tipo:**
- `amount < 0` → `DEBITO`
- `amount ≥ 0` → `CREDITO`

---

### 4. URLs (`financeiro/urls.py`)

```python
# Rotas registradas:
router.register(r'bank-statements', BankStatementImportViewSet)  # Existente
router.register(r'itens-extrato', ItemExtratoBancarioViewSet)     # NOVO
```

**Endpoints Disponíveis:**
```
GET    /financeiro/bank-statements/              # Lista imports
POST   /financeiro/bank-statements/              # Upload CSV
POST   /financeiro/bank-statements/{id}/conciliar/  # NOVO: Conciliar

GET    /financeiro/itens-extrato/                # Lista itens
GET    /financeiro/itens-extrato/pendentes/      # Lista não conciliados
GET    /financeiro/itens-extrato/{id}/           # Detalhes
POST   /financeiro/itens-extrato/{id}/conciliar_manual/
POST   /financeiro/itens-extrato/{id}/desconciliar/
DELETE /financeiro/itens-extrato/{id}/           # Admin only
```

---

## 💻 Frontend: Componentes Implementados

### 1. Types (`types/financeiro.ts`)

```typescript
interface BankStatementImport {
  id: number;
  conta: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  transactions?: BankTransaction[];
}

interface ItemExtratoBancario {
  id: number;
  conta_bancaria: number;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'DEBITO' | 'CREDITO';
  conciliado: boolean;
  vencimento?: number;
  vencimento_titulo?: string;
}

interface ConciliacaoResult {
  matches_encontrados: number;
  conciliados: number;
  nao_conciliados: number;
  sugestoes: ConciliacaoSugestao[];
}
```

---

### 2. Service (`services/conciliacao.ts`) - NOVO

```typescript
class ConciliacaoService {
  // Import management
  getBankStatementImports(conta?: number)
  getBankStatementImportById(id: number)
  conciliarImportacao(importId: number): ConciliacaoResult
  
  // ItemExtrato CRUD
  getItensExtrato(params?)
  getItensPendentes(contaBancaria?: number)
  getItemExtratoById(id: number)
  deleteItemExtrato(id: number)
  
  // Conciliação
  conciliarManual(itemId: number, vencimentoId: number)
  conciliarComTransferencia(itemId: number, transferenciaId: number)
  desconciliar(itemId: number)
}

export default new ConciliacaoService();
```

---

### 3. ExtratosUpload.tsx (ENHANCED)

#### Estados Adicionados
```typescript
const [lastImportId, setLastImportId] = useState<number | null>(null);
const [conciliacaoResult, setConciliacaoResult] = useState<any>(null);
const [loadingConciliacao, setLoadingConciliacao] = useState(false);
```

#### handleImport() - Modificado
```typescript
// Agora preserva lastImportId para permitir conciliação
setLastImportId(data.import_id || data.id);
// Não reseta modal imediatamente
```

#### handleConciliar() - NOVO
```typescript
const handleConciliar = async () => {
  const result = await conciliacaoService.conciliarImportacao(lastImportId);
  setConciliacaoResult(result);
  // Mostra alert com estatísticas
};
```

#### UI Enhancements

**Botão de Conciliação:**
```tsx
{lastImportId && (
  <button className="btn btn-success" onClick={handleConciliar}>
    🔗 Conciliar
  </button>
)}
```

**Resultado da Conciliação:**
- Cards com métricas (itens criados, conciliados, sugestões, duplicados)
- Tabela de sugestões com score de similaridade
- Badge colorido por faixa de score:
  - Verde: ≥ 80%
  - Amarelo: 60-79%
  - Cinza: < 60%

**Sugestões de Review Manual:**
```tsx
<table>
  <tr>
    <td>Data</td>
    <td>Extrato (descrição + valor)</td>
    <td>Vencimento (título + valor)</td>
    <td>Similaridade (%)</td>
  </tr>
</table>
```

---

## 🎯 Casos de Uso

### Fluxo 1: Import + Conciliação Automática
```
1. Usuário faz upload de CSV
2. Sistema cria BankStatementImport + BankTransactions
3. Usuário clica "Conciliar"
4. Sistema:
   - Converte → ItemExtratoBancario
   - Executa match_automatico()
   - Concilia itens com score ≥ 90%
5. UI mostra:
   - 10 itens criados
   - 7 conciliados automaticamente
   - 3 sugestões para revisão manual
```

### Fluxo 2: Conciliação Manual
```
1. Usuário revisa sugestões (score 60-89%)
2. Identifica match correto
3. Chamada API:
   POST /itens-extrato/{item_id}/conciliar_manual/
   Body: {"vencimento_id": 123}
4. Sistema:
   - item.conciliar_com_vencimento()
   - vencimento.confirmado_extrato = True
   - vencimento.status = 'pago'
```

### Fluxo 3: Correção de Erro
```
1. Usuário identifica conciliação errada
2. POST /itens-extrato/{id}/desconciliar/
3. Sistema:
   - item.desconciliar()
   - vencimento.confirmado_extrato = False
   - vencimento.status = 'pendente'
4. Item volta para lista de pendentes
```

---

## ⚙️ Configuração e Testes

### Backend Setup

1. **Migrations já aplicadas:**
   ```bash
   python manage.py migrate financeiro  # 0016_fase5_conciliacao
   ```

2. **URLs já registradas:**
   - `/financeiro/itens-extrato/` ✅
   - `/financeiro/bank-statements/{id}/conciliar/` ✅

### Frontend Setup

1. **Serviço registrado:**
   ```typescript
   import conciliacaoService from '@/services/conciliacao';
   ```

2. **Componente atualizado:**
   - `ExtratosUpload.tsx` já tem botão "Conciliar" ✅

### Teste Manual

```bash
# 1. Importar extrato CSV
POST /financeiro/bank-statements/
FormData: {conta: 1, arquivo: stmt.csv}

# 2. Conciliar importação
POST /financeiro/bank-statements/{id}/conciliar/

# 3. Listar pendentes
GET /financeiro/itens-extrato/pendentes/?conta_bancaria=1

# 4. Conciliar manual
POST /financeiro/itens-extrato/{id}/conciliar_manual/
Body: {"vencimento_id": 123}
```

---

## 📊 Algoritmo de Matching

### Score de Similaridade

```python
def calcular_score(item_extrato, vencimento):
    """
    Critérios:
    1. Data: ±3 dias de tolerância
    2. Valor: exato ou ≤ R$ 0.01 diferença
    3. Descrição: SequenceMatcher (difflib)
    
    Returns: 0.0 - 1.0 (similaridade)
    """
```

### Thresholds

- **Auto-conciliação:** `score ≥ 0.9` AND `|valor_diff| ≤ 0.01`
- **Sugestão manual:** `0.6 ≤ score < 0.9`
- **Ignorado:** `score < 0.6`

### Ordenação de Candidatos

```python
sorted(key=lambda x: (
    -x['similaridade'],      # Maior score primeiro
    x['diferenca_dias'],     # Menor diferença de dias
    x['diferenca_valor']     # Menor diferença de valor
))
```

---

## 🔐 Segurança e Validações

### Backend Validations

1. **converter_bank_transactions:**
   - Verifica duplicados (conta + data + valor + descrição)
   - Usa `@transaction.atomic` para rollback em erro

2. **conciliar_manual:**
   - Valida existência de item e vencimento
   - Verifica se item já está conciliado

3. **Permissions:**
   - `IsAuthenticated` em todos os endpoints
   - `importado_por` / `conciliado_por` rastreiam usuário

### Frontend Validations

1. **ExtratosUpload:**
   - Só permite conciliar se `lastImportId` existe
   - Desabilita botões durante loading

2. **Feedback Visual:**
   - Badges coloridos por score
   - Alerts de sucesso/erro
   - Contadores de métricas

---

## 🚀 Próximos Passos (Futuro)

### Melhorias Sugeridas

1. **Componente ConciliacaoList.tsx:**
   - Tela dedicada para revisar pendentes
   - Drag-and-drop para matching manual
   - Filtros por conta, data, valor

2. **Parser Auto-detect:**
   - Usar `ConciliacaoService` parsers específicos (BB, Itaú, etc.)
   - Auto-detectar formato no `converter_bank_transactions()`

3. **Webhooks/Notificações:**
   - Notificar quando conciliação é completada (Celery)
   - Email com resumo de matches

4. **Relatórios:**
   - Taxa de conciliação automática
   - Itens pendentes por idade
   - Vencimentos não confirmados

5. **Bulk Operations:**
   - Conciliar múltiplos itens de uma vez
   - Desconciliar em lote

---

## 📚 Referências

### Arquivos Modificados

**Backend:**
- `backend/apps/financeiro/serializers.py` (+35 linhas)
- `backend/apps/financeiro/api.py` (+130 linhas)
- `backend/apps/financeiro/services/conciliacao.py` (+65 linhas)
- `backend/apps/financeiro/urls.py` (+3 linhas)

**Frontend:**
- `frontend/src/types/financeiro.ts` (+75 linhas)
- `frontend/src/services/conciliacao.ts` (+154 linhas - novo arquivo)
- `frontend/src/pages/financeiro/ExtratosUpload.tsx` (+150 linhas)

### Commits Relacionados

- `5d814962` - feat(FASE5): Integração sistema antigo + novo para conciliação bancária
- `09a78bcd` - fix: Reorganiza services package e corrige imports
- `f153e1be` - feat(FASE5): Adiciona models e services de conciliação bancária
- `8e6c20a2` - feat(FASE5): Expande modelos ContaBancaria e Vencimento

---

## ✅ Checklist de Validação

- [x] Backend: ItemExtratoBancarioSerializer criado
- [x] Backend: ItemExtratoBancarioViewSet com actions (conciliar_manual, desconciliar, pendentes)
- [x] Backend: BankStatementImportViewSet.conciliar_importacao() action
- [x] Backend: ConciliacaoService.converter_bank_transactions() método
- [x] Backend: URLs registradas
- [x] Frontend: Tipos TypeScript criados
- [x] Frontend: conciliacaoService.ts criado
- [x] Frontend: ExtratosUpload.tsx com botão "Conciliar"
- [x] Frontend: UI para mostrar resultado e sugestões
- [x] Nenhum erro TypeScript/Python
- [x] Commit criado e pushed para GitHub

---

## 🎉 Conclusão

A integração FASE 5 está **completa e funcional**. O sistema agora permite:

1. ✅ Upload de CSV genérico (sistema antigo)
2. ✅ Conversão inteligente para ItemExtratoBancario
3. ✅ Matching automático com vencimentos (≥90% score)
4. ✅ Sugestões para revisão manual (60-89% score)
5. ✅ UI intuitiva com feedback visual
6. ✅ Rastreabilidade completa (auditoria)

**Próximo passo recomendado:** Testar com extratos reais dos bancos suportados (BB, Itaú, Bradesco, Caixa, Sicoob).
