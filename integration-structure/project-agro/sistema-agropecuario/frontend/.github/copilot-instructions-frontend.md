# Copilot Instructions - Frontend React + TypeScript

## 🎯 Objetivo
Diretrizes para desenvolvimento frontend do Sistema Agropecuário usando React + TypeScript + TailwindCSS.

---

## 📋 Boas Práticas Gerais

### 1. Validação de Campos Numéricos em Formulários

**❌ ERRO COMUM - Não fazer:**
```tsx
// Problema: valores numéricos zerados (0) são convertidos para undefined
const [formData, setFormData] = useState({
  valor_aquisicao: equipamento?.valor_aquisicao || 0,  // ❌ String vira problema
});

const dataToSave = {
  valor_aquisicao: formData.valor_aquisicao || undefined  // ❌ 0 vira undefined!
};
```

**✅ CORRETO - Fazer:**
```tsx
// Sempre usar Number() ao carregar dados do backend
const [formData, setFormData] = useState({
  valor_aquisicao: Number(equipamento?.valor_aquisicao) || 0,  // ✅ Converte string
});

// Campos obrigatórios sempre enviar, mesmo se zero
const dataToSave = {
  valor_aquisicao: formData.valor_aquisicao,  // ✅ Envia 0 se necessário
};

// Campos opcionais usar comparação explícita
const dataToSave = {
  potencia_cv: formData.potencia_cv > 0 ? formData.potencia_cv : undefined,  // ✅
};
```

**Regras:**
- ✅ Usar `Number()` para converter strings do backend em números
- ✅ Campos obrigatórios: sempre enviar valor (mesmo 0)
- ✅ Campos opcionais: usar comparação `> 0` para decidir se envia
- ❌ Nunca usar `||` para valores numéricos que podem ser zero

---

### 2. Sincronização Backend ↔️ Frontend

**❌ ERRO COMUM - Adicionar campo apenas no serializer:**
```python
# Backend: serializers.py
class EquipamentoListSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            'id', 'nome', 'valor_aquisicao',
            'capacidade_litros',  # ❌ Campo não existe no modelo!
        ]
# Resultado: 500 Internal Server Error
```

**✅ PROCESSO CORRETO:**

**Passo 1:** Verificar se o campo existe no modelo Django
```bash
# Terminal
grep -r "capacidade_litros" backend/apps/maquinas/models.py
```

**Passo 2:** Se não existir, adicionar no modelo primeiro
```python
# Backend: models.py
class Equipamento(models.Model):
    capacidade_litros = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
```

**Passo 3:** Criar e executar migração
```bash
python manage.py makemigrations
python manage.py migrate
```

**Passo 4:** Adicionar no serializer
```python
# Backend: serializers.py
class EquipamentoListSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'nome', 'capacidade_litros']  # ✅
```

**Passo 5:** Atualizar interface TypeScript
```tsx
// Frontend: types/estoque_maquinas.ts
export interface Equipamento {
  id: number;
  nome: string;
  capacidade_litros?: number;  // ✅ Adicionar na interface
}
```

**Regras de Sincronização:**
- ✅ SEMPRE verificar se campo existe no modelo antes de adicionar no serializer
- ✅ Se adicionar campo novo: Modelo → Migração → Serializer → Interface TS
- ✅ Testar endpoint com curl antes de usar no frontend
- ❌ NUNCA adicionar campo no serializer que não existe no modelo

---

### 3. Debugging de Erros 400/500

**Técnica de Debug com Console Logs:**

```tsx
// No formulário (antes do envio)
console.log('=== DEBUG FORM ===');
console.log('Payload completo:', dataToSave);
console.log('====================');

// No hook useApi (durante requisição)
try {
  const response = await api.post(url, data);
  console.log('✅ Sucesso:', response.data);
  return response.data;
} catch (error: any) {
  console.error('❌ ERRO BACKEND:', {
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,  // ← Mensagem de validação do Django
  });
  throw error;
}
```

**Quando receber erro 400:**
1. Abrir DevTools Console (F12)
2. Expandir objeto `data` dentro do erro
3. Ler mensagem de validação do Django
4. Corrigir campo específico mencionado

**Quando receber erro 500:**
1. Verificar terminal do Django backend
2. Ler traceback completo
3. Procurar por `ImproperlyConfigured` ou `FieldError`
4. Corrigir campo inexistente no serializer

---

### 4. Padrões de Nomenclatura

**Backend Django → Frontend TypeScript:**

| Django (Python)       | TypeScript          | Nota                        |
|-----------------------|---------------------|-----------------------------|
| `valor_aquisicao`     | `valor_aquisicao`   | ✅ Manter snake_case        |
| `created_at`          | `created_at`        | ✅ Não usar camelCase       |
| `categoria_nome`      | `categoria_nome`    | ✅ Nome igual ao serializer |

**Regra:** Manter exatamente os mesmos nomes entre backend e frontend para evitar erros de mapping.

---

### 5. Testes de API antes de usar no Frontend

**Sempre testar endpoints com curl primeiro:**

```bash
# 1. Login e capturar token
TOKEN=$(curl -s -X POST http://localhost:8000/api/core/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

# 2. Testar POST
curl -X POST http://localhost:8000/api/maquinas/equipamentos/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "categoria": 1,
    "valor_aquisicao": 30000,
    "ano_fabricacao": 2020,
    "data_aquisicao": "2020-01-01"
  }'

# 3. Verificar resposta
# Status 201 ✅ = Sucesso
# Status 400 ❌ = Validação falhou (ler mensagem)
# Status 500 ❌ = Erro de configuração (verificar logs Django)
```

**Benefícios:**
- ✅ Confirma que backend funciona antes de debugar frontend
- ✅ Identifica rapidamente se problema é no backend ou frontend
- ✅ Valida payload correto para enviar

---

## 📚 Checklist antes de Commit

Antes de fazer commit/push, verificar:

- [ ] Campos numéricos usam `Number()` ao carregar dados
- [ ] Campos obrigatórios sempre são enviados (não viram undefined)
- [ ] Todos os campos do serializer existem no modelo Django
- [ ] Interface TypeScript está sincronizada com serializer
- [ ] Endpoint foi testado com curl e funciona
- [ ] Console logs de debug foram removidos (ou comentados)
- [ ] Nenhum erro 500 no backend ao listar/criar/editar

---

## 🚨 Erros Críticos Documentados

### Erro: "Field name `campo` is not valid for model `Modelo`"
**Causa:** Campo adicionado no serializer mas não existe no modelo Django  
**Solução:** Remover do serializer OU adicionar no modelo + migração

### Erro: 400 Bad Request com `valor_aquisicao: ["Este campo é obrigatório"]`
**Causa:** Campo obrigatório foi convertido para undefined antes do envio  
**Solução:** Sempre enviar valor, mesmo se zero: `valor_aquisicao: formData.valor_aquisicao`

### Erro: Valor não aparece ao editar formulário
**Causa:** Backend retorna string ("30000.00"), input type="number" precisa de número  
**Solução:** Usar `Number()` ao inicializar formData: `Number(equipamento?.valor_aquisicao) || 0`

---

## 📖 Referências

- [DRF Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [React Hook Form - Number Validation](https://react-hook-form.com/api/useform)
- [TypeScript - Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)

---

**Última Atualização:** 26/12/2025  
**Responsável:** Equipe de Desenvolvimento Sistema Agropecuário
