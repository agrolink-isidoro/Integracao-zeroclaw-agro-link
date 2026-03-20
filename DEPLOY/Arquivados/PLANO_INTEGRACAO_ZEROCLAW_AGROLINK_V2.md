# 🤖 Plano de Integração: ZeroClaw ↔ Agrolink (v2.0 - REVISADO)

**Data:** 2 de março de 2026  
**Status:** Planejamento Detalhado - Versão Revisada  
**Paradigma:** Bot Consultor com Fila de Ações (Sem Execução Direta)

---

## 📋 Visão Geral Executiva

### Mudança de Paradigma

❌ **v1.0 (Descartado):** "Bot executa operações diretamente"  
✅ **v2.0 (Adotado):** "Bot prepara drafts, usuário aprova"

### Princípios do MVP

1. **Isidoro é Consultor, Não Executor**
   - Lê dados do sistema (GET only)
   - Prepara propostas (drafts) com análises
   - Usuário sempre aprova antes de executar

2. **Action Queue & Dashboard**
   - Todas as ações propostas ficam em fila
   - Interface dedica para revisar, editar, aceitar, rejeitar
   - Histórico completo de quem aprovou/rejeitou

3. **MVP Focado: Fazendas, Agricultura, Máquinas, Estoque**
   - Operações agrícolas (plantio, colheita, etc.)
   - Manutenção de máquinas
   - Movimentação de estoque
   - ❌ Comercial, Fiscal, Financeiro, Admin (Fase 2)

4. **Leitura de Todos os Módulos**
   - Pode consultar financeiro para contexto
   - Não executa ações nesses módulos

---

## 🏗️ Arquitetura Revisada

### Fluxo Fundamental

```
┌────────────────────────────────────────────────────┐
│ 1. Usuário envia mensagem                           │
│    "Plantei 50 ha de soja em Vila Nova"             │
└────────────────┬─────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 2. ZeroClaw analisa com Gemini                      │
│    - Extrai: OPERACAO_DRAFT                         │
│    - Valida dados (talhão existe? cultura ok?)      │
│    - Prompts: Preenche campos faltando              │
└────────────────┬─────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 3. Prepara Action (Draft)                           │
│    POST /api/actions/                               │
│    {                                                 │
│      "type": "operacao_agricola",                   │
│      "payload": { tipo, cultura, talhao, ... },     │
│      "status": "pending_approval"                    │
│    }                                                 │
└────────────────┬─────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 4. Responde ao usuário                              │
│    "Preparei o plantio! Aprove aqui: [link]"        │
└────────────────┬─────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 5. Usuário acessa Dashboard                         │
│    ↓                                                 │
│    [PLANTIO DE SOJA - VILA NOVA]                    │
│    📊 50 hectares | 1º mar                           │
│    ✅ [Revisar]  [Editar]  [Aprovar]  [Rejeitar]   │
└────────────────┬─────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 6. Usuário clica APROVAR                            │
│    Backend executa:                                  │
│    ↓                                                 │
│    POST /api/agricultura/operacoes/ (com dados       │
│    ↓                                                 │
│    201 Created                                       │
│    ↓                                                 │
│    Action marcada como "executed"                    │
└────────────────┬─────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────┐
│ 7. Chat atualizado                                  │
│    "✅ Plantio executado! Movimentação de estoque    │
│    registrada automaticamente."                      │
└────────────────────────────────────────────────────┘
```

---

## 📊 Modelos de Dados

### Action Model

```json
{
  "id": "action-uuid",
  "type": "operacao_agricola | entrada_estoque | saida_estoque | manutencao_maquina | ...",
  "status": "pending_approval | approved | rejected | executed | failed | archived",
  
  "created_by": "isidoro",
  "created_at": "2026-03-02T14:30:00Z",
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  
  "payload": {
    // Conteúdo específico do tipo
    "tipo": "plantio",
    "cultura": "soja",
    "talhao_id": "talhao-uuid",
    "area_hectares": 50,
    "data_operacao": "2026-03-01",
    "insumos": [
      { "insumo_id": "uuid", "quantidade": 100, "unidade": "kg" }
    ]
  },
  
  "validation": {
    "warnings": ["Estoque NPK abaixo do esperado"],
    "errors": [],
    "is_valid": true
  },
  
  "approval_info": {
    "action_url": "/dashboard/actions/action-uuid",
    "can_edit": true,
    "suggested_edit_hints": "Considere adicionar insumo Y"
  },
  
  "execution": {
    "approved_at": "2026-03-02T15:00:00Z" | null,
    "approved_by": "user-uuid" | null,
    "executed_at": "2026-03-02T15:05:00Z" | null,
    "execution_result": { "id": "operacao-uuid", "status": "created" } | null,
    "error_message": null
  }
}
```

---

## 🎯 Casos de Uso do MVP

### UC-1: Consulta Simples (Leitura)

**Usuário:** "Quantos hectares plantei de soja?"

**Fluxo:**
1. Isidoro extrai intent: QUERY_AREA(cultura=soja)
2. GET /api/agricultura/operacoes/?cultura=soja&tenant_id=X (últimos 12 meses)
3. Gemini agrega resultado
4. Responde: "Você plantou 150 hectares de soja nos últimos 12 meses"

**APIs Usadas:** GET only (leitura)

---

### UC-2: Preparação de Draft - Operação Agrícola

**Usuário:** "Plantei 50 hectares de soja ontem em Vila Nova"

**Fluxo:**
```
1. Isidoro extrai: OPERACAO_DRAFT(
     tipo=plantio, 
     cultura=soja, 
     talhao=vila-nova,
     area=50ha,
     data=2026-03-01
   )

2. Valida against /api/fazendas/talhoes/{id}:
   ✅ Talhão existe e está disponível
   
3. Faltam dados:
   ❓ Quais insumos usou?
   
4. Espera resposta do usuário ou oferece opções
   "Vou registrar com dados básicos ou quer detalhar?"

5. User responde: "100 kg de sementes + 500L adubo"

6. Prepara Action JSON:
   POST /api/actions/
   {
     "type": "operacao_agricola",
     "payload": {
       "tipo": "plantio",
       "cultura": "soja",
       "talhao_id": "uuid-vila-nova",
       "area_hectares": 50,
       "data_operacao": "2026-03-01",
       "insumos": [
         {"insumo_id": "uuid-sementes", "quantidade": 100, "unidade": "kg"},
         {"insumo_id": "uuid-adubo", "quantidade": 500, "unidade": "l"}
       ]
     }
   }
   
7. Backend retorna action_id + validation

8. Isidoro responde:
   "✏️ OPERAÇÃO: Plantio de Soja em Vila Nova
    50 hectares | 1º mar 2026
    Insumos: 100kg sementes + 500L adubo
    
    ⚠️ Aviso: Adubo em quantidade média
    ✅ Talhão disponível
    
    👉 Pode revisar e aprovar aqui: [action-dashboard-link]"
```

**APIs Usadas:**
- GET /api/fazendas/talhoes/{id}/ (validação)
- GET /api/estoque/itens/ (validação de insumos)
- POST /api/actions/ (criar draft)

---

### UC-3: Múltiplos Drafts em Sequência - Colheita

**Usuário:** "Colhi 200 toneladas de soja em Vila Nova"

**Fluxo:**
```
Isidoro reconhece que colheita impacta múltiplos dados:

✏️ ACTION #1: Registrar Colheita
   POST /api/actions/
   { type: colheita, payload: { ... } }

✏️ ACTION #2: Entrada de Estoque
   POST /api/actions/
   { type: entrada_estoque, payload: { ... } }

Resposta:
"Colheita registrada! Preparei 2 ações para você:

✏️ COLHEITA: Soja - Vila Nova
  200 toneladas | 2 mar 2026
  [REVISAR] [APROVAR] [REJEITAR]

✏️ ENTRADA ESTOQUE: Soja em Grão
  200 toneladas → Galpão A
  [REVISAR] [APROVAR] [REJEITAR]

Aprove uma ou as duas!"
```

---

### UC-4: Manutenção de Máquina

**Usuário:** "Vou fazer manutenção no John Deere amanhã"

**Fluxo:**
```
1. Isidoro extrai: MANUTENCAO_DRAFT(
     maquina=john-deere,
     data=amanha
   )

2. Valida máquina existe

3. Pergunta:
   "Qual será a manutenção? (Troca de óleo / Revisão geral / etc)
    Isso é urgente?"

4. User responde: "Revisão geral, é preventiva"

5. Cria Action:
   POST /api/actions/
   {
     "type": "manutencao_maquina",
     "payload": {
       "maquina_id": "uuid",
       "tipo": "revisao_geral",
       "data_prevista": "2026-03-03",
       "urgente": false
     }
   }

6. Resposta:
   "✏️ MANUTENÇÃO: John Deere 8320R
    Revisão geral | 3 mar 2026
    Status: Preventiva
    
    [REVISAR] [EDITAR] [APROVAR] [REJEITAR]"
```

---

### UC-5: Análise de Dados com Contexto Financeiro

**Usuário:** "Qual foi meu custo de produção de milho?"

**Fluxo:**
```
Isidoro faz leitura de múltiplos módulos:
- GET /api/agricultura/operacoes/?cultura=milho (últimos 12 meses)
- GET /api/financeiro/rateios/?cultura=milho (leitura apenas)
- GET /api/estoque/movimentacoes/?cultura=milho (leitura)

Gemini analisa:
- Custos: sementes + adubo + defensivos + mão-de-obra
- Total gasto: R$ 50.000
- Área: 150 hectares
- Custo/ha: R$ 333

Responde:
"Seu custo de produção de milho foi de R$ 333 por hectare.
Detalhes:
  • Sementes: R$ 80/ha
  • Adubo: R$ 150/ha
  • Defensivos: R$ 50/ha
  • Mão-de-obra + máquinas: R$ 53/ha"
```

**Nota:** Apenas leitura, sem ações propostas

---

### UC-6: Upload de Arquivo — Agricultura (Planilha de Operações em Lote)

**Usuário:** *[Anexa `operacoes_safra_2026.xlsx` no chat]*

**Fluxo:**
```
1. Isidoro detecta: arquivo Excel com colunas
   [talhão | cultura | tipo_operacao | data | área_ha | insumos | quantidade]

2. Parser lê cada linha:
   - Linha 1: Plantio Soja | Vila Nova | 12 fev | 48 ha | sementes 96kg
   - Linha 2: Adubação   | Bloco B   | 13 fev | 32 ha | NPK 64kg
   - Linha 3: Colheita   | Pivô 1    | 20 mar | 18 ha | -
   (N linhas...)

3. Isidoro valida cada linha contra o backend:
   GET /api/fazendas/talhoes/ → confirma existência
   GET /api/estoque/itens/    → confirma insumos disponíveis

4. Gera N Action Drafts em lote:
   POST /api/actions/bulk/
   [
     { type: operacao_agricola, payload: { tipo: plantio, ... } },
     { type: operacao_agricola, payload: { tipo: adubacao, ... } },
     { type: colheita,          payload: { ... } },
   ]

5. Resposta no chat:
   "📎 Planilha analisada! Encontrei 3 operações:

   ✏️ PLANTIO — Vila Nova | 48 ha | 12 fev
   ✏️ ADUBAÇÃO — Bloco B  | 32 ha | 13 fev
   ✏️ COLHEITA — Pivô 1   | 18 ha | 20 mar

   [✅ Aprovar Todas] [👁 Revisar Uma a Uma] [❌ Cancelar]"

6. Usuário clica [Aprovar Todas]:
   POST /api/actions/bulk-approve/
   → Backend executa todas as operações em sequência
   → Retorna: 3/3 executadas com sucesso

7. Chat atualiza:
   "✅ 3 operações registradas!"
```

**Formatos aceitos:** `.xlsx`, `.csv`, `.md`  
**Máximo de drafts por upload:** 200 linhas  
**APIs Usadas:** GET /api/fazendas/talhoes/, GET /api/estoque/itens/, POST /api/actions/bulk/

---

### UC-7: Upload de Arquivo — Máquinas (Histórico de Manutenção)

**Usuário:** *[Anexa `historico_manutencao_frota_2025.xlsx` no chat]*

**Fluxo:**
```
1. Isidoro detecta: planilha com colunas
   [máquina | tipo_manutencao | data | km_horas | custo | oficina | observação]

2. Parser lê e cruza com cadastro de máquinas:
   GET /api/maquinas/ → mapeia "John Deere 8320R" → uuid

3. Detecta anomalias e padrões:
   ⚠️ John Deere 8320R: 3 manutenções corretivas em 60 dias
   ⚠️ Plantadeira CR700: última revisão há 14 meses (vencida)
   ✅ Trator MF 7720: revisões em dia

4. Gera Action Drafts:
   ✏️ REGISTRAR HISTÓRICO — John Deere 8320R (12 entradas)
   ✏️ ALERTAR MANUTENÇÃO VENCIDA — Plantadeira CR700
   ✏️ REGISTRAR HISTÓRICO — MF 7720 (8 entradas)

5. Resposta no chat:
   "📎 Histórico de frota analisado!
   12 máquinas | 47 registros de manutenção

   ⚠️ ATENÇÃO:
   • John Deere 8320R: padrão de manutenção corretiva frequente
   • Plantadeira CR700: revisão vencida há 14 meses

   ✏️ Preparei 3 grupos de ações para aprovação.
   [✅ Aprovar Todas] [👁 Revisar Uma a Uma] [❌ Cancelar]"
```

**Formatos aceitos:** `.xlsx`, `.csv`, `.pdf` (laudos técnicos), `.docx` (relatórios de oficina)  
**PDF:** Isidoro extrai texto via `pdfplumber` → Gemini interpreta tabelas e campos  
**APIs Usadas:** GET /api/maquinas/, POST /api/actions/bulk/

---

### UC-8: Upload de Arquivo — Estoque (Nota Fiscal / Entrada em Lote)

**Usuário:** *[Anexa `nota_fiscal_fornecedor.pdf` ou `pedido_compra.xlsx` no chat]*

**Fluxo com PDF (NF de fornecedor):**
```
1. Isidoro detecta arquivo PDF

2. Backend extrai texto via pdfplumber:
   - CNPJ fornecedor: 12.345.678/0001-90
   - Itens:
     Item 01 | Fertilizante NPK 04-30-10 | 50 bags | 50kg cada | R$ 4.500
     Item 02 | Herbicida Roundup | 20 cx   | 5L cada  | R$ 3.200
     Item 03 | Semente Soja M8349 | 200 bags | 40kg      | R$ 28.000

3. Cruza com cadastro de itens:
   GET /api/estoque/itens/?nome=NPK → encontra item existente
   GET /api/estoque/itens/?nome=Roundup → não encontrado → sugere criar

4. Gera Action Drafts:
   ✏️ ENTRADA ESTOQUE: NPK 04-30-10 | 2.500 kg | Galpão A
   ✏️ ENTRADA ESTOQUE: Herbicida Roundup | 100 L | Galpão B [NOVO ITEM]
   ✏️ ENTRADA ESTOQUE: Soja M8349 | 8.000 kg | Câmara Fria

5. Resposta no chat:
   "📎 Nota fiscal lida!
   Fornecedor: [NOME] | Data: 03/03/2026 | Total: R$ 35.700

   ✏️ 3 entradas de estoque preparadas:
   • NPK 04-30-10 → 2.500 kg
   • Herbicida Roundup → 100 L ⚠️ (item novo, será criado)
   • Sememte Soja M8349 → 8.000 kg

   [✅ Aprovar Tudo] [👁 Revisar Item Novo] [❌ Cancelar]"
```

**Fluxo com Excel (inventário completo):**
```
Usuário sobe: inventario_fisico_marco.xlsx
Isidoro compara coluna "Qtd Real" vs estoque atual no sistema
Gera drafts de AJUSTE para cada item com divergência:
  ✏️ AJUSTE ESTOQUE: Ureia — Sistema: 1.200kg | Real: 980kg → Ajuste: -220kg
  ✏️ AJUSTE ESTOQUE: Óleo Diesel — Sistema: 5.000L | Real: 4.850L → Ajuste: -150L
```

**Formatos aceitos:** `.pdf` (NFs, laudos), `.xlsx` / `.csv` (inventários, pedidos), `.xml` (NF-e XML)  
**APIs Usadas:** GET /api/estoque/itens/, POST /api/actions/bulk/

---

### UC-9: Upload de Arquivo — Fazendas (KML / GeoJSON de Talhões)

**Usuário:** *[Anexa `talhoes_vila_nova.kml` exportado do QGIS ou Google Earth]*

**Fluxo:**
```
1. Isidoro detecta: arquivo KML ou GeoJSON

2. Parser geográfico lê geometrias:
   - Feature 1: Polígono "Bloco A"  → 45,2 ha | Centroide: -15.123, -47.456
   - Feature 2: Polígono "Bloco B"  → 32,8 ha | Centroide: -15.130, -47.460
   - Feature 3: Polígono "Pivô 1"   → 18,0 ha | Centroide: -15.140, -47.470
   - Feature 4: Polígono "Mata Legal"→  8,5 ha | (reserva, sem cultivo)

3. Cruza com talhões já cadastrados:
   GET /api/fazendas/talhoes/?fazenda=vila-nova
   → "Bloco A" já existe → propõe ATUALIZAR geometria
   → "Bloco B", "Pivô 1", "Mata Legal" → não existem → propõe CRIAR

4. Gera Action Drafts:
   ✏️ ATUALIZAR TALHÃO: Bloco A | Nova área: 45,2 ha (era 44,8 ha)
   ✏️ CRIAR TALHÃO: Bloco B | 32,8 ha | Fazenda Vila Nova
   ✏️ CRIAR TALHÃO: Pivô 1  | 18,0 ha | Fazenda Vila Nova
   ✏️ CRIAR TALHÃO: Mata Legal | 8,5 ha | Reserva (sem cultivo)

5. Resposta no chat:
   "📎 Mapeamento importado!
   Arquivo: talhoes_vila_nova.kml
   4 polígonos lidos | Área total: 104,5 ha

   1 talhão existente (atualização de área)
   3 talhões novos para criar

   [✅ Aprovar Todos] [🗺️ Ver no Mapa] [👁 Revisar Um a Um] [❌ Cancelar]"

6. Usuário aprova → Backend executa:
   PATCH /api/fazendas/talhoes/{id}/      (Bloco A — atualiza geometria)
   POST  /api/fazendas/talhoes/           (Bloco B, Pivô 1, Mata Legal)

7. Chat confirma:
   "✅ 4 talhões salvos! Área total da fazenda: 104,5 ha"
```

**Formatos aceitos:** `.kml`, `.kmz`, `.geojson`, `.gpx`, `.shp` (shapefile zipado)  
**Validações:** Geometria válida (sem auto-intersecção), área > 0, sobreposição com talhões existentes (aviso)  
**APIs Usadas:** GET /api/fazendas/talhoes/, POST /api/fazendas/talhoes/, PATCH /api/fazendas/talhoes/{id}/  
**Nota:** Para o MVP, FAZENDAS passa a aceitar **criação de talhões via KML** (exceção à regra de leitura apenas)

---

## 📋 Módulos no MVP

### **✅ AGRICULTURA (MVP Completo)**

**Leitura:**
- Operações (plantio, colheita, adubação, etc.)
- Culturas e safras
- Histórico e análises

**Ações (Drafts) — via chat/voz:**
- Registrar operação agrícola
- Registrar colheita
- Aplicação de defensivo/fertilizante

**Upload de Arquivos (Drafts em Lote) — UC-6:**
- `.xlsx` / `.csv` → importar planilha de operações (N linhas = N drafts)
- `.pdf` → laudos agronômicos e recomendações de manejo → drafts de aplicação
- `.md` → configurações de safra, parâmetros de cultivo → atualização de configurações
- **Aprovação em lote:** [Aprovar Todas] ou [Revisar Uma a Uma]
- **Limite:** 200 drafts por upload

**Dashboard:** Visualizar operações, recomendações, histórico de arquivos importados

---

### **✅ MÁQUINAS (MVP Completo)**

**Leitura:**
- Máquinas disponíveis
- Histórico de manutenção
- Uso recente

**Ações (Drafts) — via chat/voz:**
- Registrar manutenção
- Registrar abastecimento
- Marcar máquina como parada

**Upload de Arquivos (Drafts em Lote) — UC-7:**
- `.xlsx` / `.csv` → histórico de manutenção da frota (N registros = N drafts)
- `.pdf` → laudos técnicos de oficina → drafts de manutenção corretiva
- `.docx` → relatórios de visita técnica → extrair recomendações de manutenção
- Isidoro detecta padrões: máquinas com manutenção corretiva frequente ou vencida
- **Aprovação em lote:** [Aprovar Todas] ou [Revisar Uma a Uma]
- **Limite:** 200 drafts por upload

**Dashboard:** Status de máquinas, alertas de manutenção, histórico de arquivos importados

---

### **✅ ESTOQUE (MVP Completo)**

**Leitura:**
- Itens em estoque
- Níveis por categoria
- Histórico de movimentações
- Alertas de quantidade crítica

**Ações (Drafts) — via chat/voz:**
- Registrar entrada de item
- Registrar saída de item
- Ajuste de inventário

**Upload de Arquivos (Drafts em Lote) — UC-8:**
- `.pdf` → Nota Fiscal de fornecedor → drafts de entrada de estoque por item da NF
- `.xml` → NF-e XML (SEFAZ) → leitura estruturada de itens, quantidades, valores
- `.xlsx` / `.csv` → inventário físico → comparação com sistema → drafts de ajuste
- `.xlsx` → pedido de compra → pré-cadastro de itens esperados
- Isidoro cria item novo automaticamente se não encontrado no cadastro (draft especial)
- **Aprovação em lote:** [Aprovar Tudo] ou [Revisar Item Novo]
- **Limite:** 200 drafts por upload

**Dashboard:** Níveis de estoque, recomendações de compra, histórico de notas importadas

---

### **✅ FAZENDAS (MVP — Leitura + Upload KML)**

**Leitura:**
- Propriedades e talhões
- Geolocalização
- Área por cultura
- Status de ocupação

**Ações (Drafts) — via upload de arquivo — UC-9:**
- `.kml` / `.kmz` → importar talhões do QGIS, Google Earth, GPS agrícola
- `.geojson` → talhões exportados de plataformas de agricultura de precisão
- `.gpx` → trilhas e limites de campo coletados com receptor GPS
- `.shp` (shapefile zipado) → compatibilidade com SIG técnico
- Isidoro propõe: criar talhões novos + atualizar geometria de existentes
- Detecta sobreposição entre polígonos e avisa antes de aprovar
- Calcula área automaticamente (ha) a partir da geometria
- **Exceção MVP:** FAZENDAS passa a permitir **criação de talhões via KML** (única ação permitida)
- **Ações manuais (chat/voz):** ❌ Criar talhão ainda é Fase 2 (sem KML)

**Dashboard:** Mapa de propriedades, ocupação, talhões importados destacados

---

### **⚠️ FINANCEIRO (MVP - Leitura Apenas)**

**Leitura:**
- Fluxo de caixa
- Vencimentos pendentes
- Rentabilidade por cultura
- Custos rateados

**Ações:** ❌ Nenhuma no MVP (criar rateio/vencimento é Fase 2)

**Dashboard:** Consultas de contexto apenas

---

### **⚠️ COMERCIAL (MVP - Leitura Apenas)**

**Leitura:**
- Vendas históricas
- Preços de produtos
- Fornecedores cadastrados

**Ações:** ❌ Nenhuma no MVP (criar venda é Fase 2)

---

### **⚠️ FISCAL (MVP - Leitura Apenas)**

**Leitura:**
- NFes processadas
- Impostos por operação
- Status de compliance

**Ações:** ❌ Nenhuma no MVP (criar/manifestar NFe é Fase 2)

---

### **⚠️ ADMINISTRATIVO (MVP - Leitura Apenas)**

**Leitura:**
- Dados de custo
- Informações de funcionários

**Ações:** ❌ Nenhuma no MVP (Fase 2)

---

## 🚀 Roadmap Revisado (12 Semanas)

### **FASE 1: MVP (4 semanas)**

#### **Semana 1: Setup + Action Queue Infra**
- [ ] Criar modelo Action em Django
- [ ] Implementar endpoints /api/actions/
- [ ] Dashboard simples de actions (React)
- [ ] Testes básicos

#### **Semana 2: Agricultura Básica**
- [ ] ZeroClaw integrado para ler Agricultura
- [ ] Intent recognition: operacoes, colheitas
- [ ] Draft builder para plantio
- [ ] Teste E2E: mensagem → action criada

#### **Semana 3: Máquinas + Estoque**
- [ ] ZeroClaw integrado para ler Máquinas + Estoque
- [ ] Draft builder: manutenção, entrada/saída
- [ ] Validações de insumo + máquina
- [ ] Teste E2E: múltiplos tipos de action

#### **Semana 4: Aprovação + Audio**
- [ ] Dashboard de ações (visualizar, editar, aprovar, rejeitar)
- [ ] Execução de ações após aprovação
- [ ] Transcription Groq ou local ativa
- [ ] **MVP Pronto para Beta**

---

### **FASE 2: Refinamento + Fase 2 (4 semanas)**

#### **Semana 5-6: Análises Avançadas**
- [ ] Endpoints de agregação (custo/hectare, produtividade)
- [ ] System prompts contextuais
- [ ] Recomendações baseadas em dados historical

#### **Semana 7-8: Módulos Fase 2**
- [ ] Financeiro: drafts de rateios/vencimentos
- [ ] Comercial: drafts de vendas
- [ ] Fiscal: leitura de compliance
- [ ] Administrativo: leitura básica

---

### **FASE 3: Especialização (4 semanas)**

#### **Semana 9-10: Bot de Operações**
- [ ] Memória de contexto agrícola
- [ ] Voice input otimizado
- [ ] Sequências automáticas

#### **Semana 11-12: Bots Especializados**
- [ ] Bot Máquinas
- [ ] Bot Estoque
- [ ] Documentação + Deploy

---

## 💬 Canais de Comunicação & Chat Widget

### Arquitetura de Canais

```
┌─────────────────────────────────────────────────────┐
│ Usuario final                                       │
├──────┬──────────────────────────────────┬──────────┤
│      │                                  │          │
│ Web  │      WhatsApp (PRIMARY)          │ Telegram │
│ Chat │   (Push Notifications)           │(Fallback)│
│Widget│                                  │          │
└──────┴──────────────┬───────────────────┴──────────┘
                      │ (Unified)
         ┌────────────────────────────┐
         │ ZeroClaw/Isidoro           │
         │ (Intent → Action Draft)     │
         └────────────────────────────┘
```

### 1️⃣ WhatsApp (PRINCIPAL)

**Por que WhatsApp?**
- ✅ Maior adoção em zona rural (>95%)
- ✅ Notificação push (não precisa abrir app)
- ✅ Suporte a áudio (melhor que Telegram)
- ✅ WhatsApp Business API (SLA)
- ✅ Simplicidade (sem comandos)

**Setup:**
- Provider: Twilio ou Meta API
- Endpoint: `/api/channels/whatsapp/webhook/`
- Rate limit: 100 msg/hora por user
- Templates: Pré-aprovadas na Meta

**Fluxo:**
```
User (WhatsApp) → Twilio/Meta → Backend webhook
→ ZeroClaw → Action draft → WhatsApp reply
→ "Preparei! Ver aqui: [dashboard link]"
```

**Exemplo:**
```
User: "Plantei 50ha de soja"
Isidoro: "✅ Operação preparada!
          50 hectares | Soja | Vila Nova
          👉 Aprove: https://agrolink.com/v/actions/xyz/"
```

### 2️⃣ Web Chat Widget (INTEGRADO NA LANDING PAGE)

**Status:** ✅ Landing page do dashboard (não em aba separada)

**Características:**
- ✅ Chat integrado no Painel Principal (center)
- ✅ Pendências IA no sidebar direito
- ✅ Histórico persistido em DB
- ✅ Suporte a voz (mic button)
- ✅ **Anexo de arquivos** (Excel, CSV, Word, PPT, PDF) - NEW!
- ✅ WebSocket para real-time
- ✅ Sugestões inline com ActionPreviewCard

**Layout (conforme print atual):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Agrolink Dashboard | Central de Inteligência                   │
│ Olá, admin ✋ [Sair]                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐  SALDO MENSAL  ÁREAS CULTIVADAS ETC.   │
│  │ MENU ESQUERDO      │  ┌──────────────────────────────────┐  │
│  │                    │  │ Painel Principal                 │  │
│  │ • Dashboard ✓      │  │ R$ 0,00 | 0 ha | 0 items | 0    │  │
│  │ • Central IA       │  └──────────────────────────────────┘  │
│  │ • Fazendas         │                                         │
│  │ • Agricultura      │  ┌──────────────────────────────────┐  │
│  │ • Máquinas         │  │ 🤖 ASSISTENTE IA (Chat)          │  │
│  │ • Estoque          │  │                                  │  │
│  │ • Comercial        │  │ [Histórico de mensagens /\\\\]   │  │
│  │ • Financeiro       │  │                                  │  │
│  │ • Administrativo   │  │ User: "Plantei 50ha de soja"    │  │
│  │ • Fiscal           │  │                                  │  │
│  │                    │  │ Bot: "Preparei para aprovação!"  │  │
│  │                    │  │ [✓ APROVAR] [✏ EDITAR] [✗ REJ]  │  │
│  │                    │  │                                  │  │
│  │                    │  │ @arquivo: [Anexar]               │  │
│  │                    │  │ 🎤 [Voz] [Enviar ➜]             │  │
│  │                    │  └──────────────────────────────────┘  │
│  │                    │                         ┌──────────────┐│
│  │                    │                         │ PENDÊNCIAS IA││
│  │                    │                         │              ││
│  │                    │                         │ 🔴 Analisar  ││
│  │                    │                         │    custos    ││
│  │                    │                         │              ││
│  │                    │                         │ 🟡 Gerar     ││
│  │                    │                         │    produção  ││
│  │                    │                         │              ││
│  │                    │                         │ 🟢 Classificar││
│  │                    │                         │    notas     ││
│  │                    │                         │    fiscais   ││
│  │                    │                         │              ││
│  │                    │                         │ [Nova tarefa]││
│  │                    │                         └──────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Componentes React - NOVO Layout:**
```
Dashboard.tsx (página principal)
├─ MetricsCards (Saldo, Áreas, Estoque, Máquinas)
├─ ChatWidget.tsx (CENTER)
│  ├─ MessageList (com ActionPreviewCard inline)
│  ├─ InputArea (text + voice + file upload)
│  └─ ActionPreview inline
└─ PendingTasksPanel.tsx (SIDEBAR DIREITO)
   ├─ TaskList (tarefas geradas por IA)
   ├─ TaskCard (com status badge)
   └─ NewTaskButton
```

**File Upload Flow (NEW!):**
```
1. User clica "Anexar" ou arrasta arquivo
   ├─ Aceitos: .xlsx, .csv, .docx, .pptx, .pdf
   ├─ Max size: 10 MB
   └─ Progress bar durante upload
   
2. Backend recebe arquivo
   ├─ Salva em /tmp/ ou S3
   ├─ Lê conteúdo (pandas, python-docx, etc)
   └─ Envia para ZeroClaw/Gemini
   
3. Isidoro analisa
   ├─ Extrai dados relevantes
   ├─ Sugere operações
   └─ Exemplos:
      - Excel planilha de custos → "Sugestão: Revisar despesas"
      - CSV produtos → "Sugestão: Adicionar ao estoque"
      - PDF relatório → "Sugestão: Análise de safra"
      
4. Display sugestão
   ├─ "📎 Arquivo analisado!"
   ├─ Resumo dos dados encontrados
   ├─ [Confirmar sugestão] [Editar] [Cancelar]
   └─ Se Confirmar → Cria Action (pendência)
```

### Features do Chat (MVP)

**1. Textos & Voz**
- ✅ Texto livre
- ✅ Voz (mic button) → faster-whisper transcription
- ✅ Fallback: Se voz falhar, prompt para digitar

**2. Anexo de Arquivos (NEW!)**
- ✅ Excel (.xlsx) → análise de planilhas, produtos, custos
- ✅ CSV (.csv) → import de dados, movimentações
- ✅ Word (.docx) → leitura de documentos, propostas
- ✅ PowerPoint (.pptx) → análise de apresentações
- ✅ PDF (.pdf) → leitura de relatórios, notas fiscais

**3. Criação de Campos Repetitivos**
- Usuário: "Inclusive 5 produtos diferentes no estoque"
- Bot: Cria Action com campos iteráveis
- Dashboard mostra: [+] para adicionar mais linhas

**4. Movimentação de Cargas (Colheita)**
- Usuário: "Colhi 500 sacas de trigo zona norte"
- Bot: Sugere registrar como movimentação
- Ação: Update quantidade + registro de saída

**5. Pulverização & Manejos**
- Usuário: "Vou pulverizar inseticida em Vila Nova"
- Bot: Prepara operação com calendário
- Dashboard: Mostra sequência de operações + datas

**6. Análise IA**
- Bot lê arquivo Excel de custos
- Sugere otimizações: "Você está gastando 40% acima da média"
- User aprova → Cria Action de revisão

**7. Geração de Pendências (Action)**
- Cada sugestão aprovada = 1 Action em Pendências
- Status: em_andamento → concluída → arquivada
- Histórico completo: quem criou, aprovou, quando
- **Click em pendência (sidebar direita) = abre Modal no dashboard (edição, aprovação, rejeição)**

### 3️⃣ Telegram (FALLBACK)

**Uso:**
- Alternativa se WhatsApp indisponível
- Dev/teste
- Usuários sem WhatsApp

**Diferenças:**
- Sem templates (envios live)
- Sem Audio nativo (via Groq Whisper)
- Mais latência que WhatsApp
- Custo: Gratuito

### Prioridade de Canais

```
ENTRADA (User → Bot):
1. WhatsApp (push notification)
2. Web Chat (if logged in)
3. Telegram (fallback)

SAÍDA (Bot → User):
1. Mesmo canal de entrada
2. Se falhar, fallback para próximo
3. Sempre notifica via email backup
```

### Sincronização Entre Canais

Se user tem conversa tanto em WhatsApp quanto em Web Chat:

```
WhatsApp: "Plantei 50ha"
→ Backend cria Action
→ Web Chat notificado via WebSocket
→ User vê ação no dashboard também
→ Pode aprovar de qualquer canal
```

**Estado sincronizado:**
- ✅ Mensagens (log único)
- ✅ Ações (status único)
- ✅ Aprovações (um clique)
- ✅ Histórico (visível em ambos)

---

## 🏢 Multi-Tenant Architecture

### Isolamento de Dados por Tenant

Cada tenant (propriedade) tem seus PRÓPRIOS dados isolados:

```
Tenant: Vila Nova
  ├─ Usuários: user-1, user-2, user-3
  ├─ Fazendas: 5 propriedades
  ├─ Operações: 150 plantios/colheitas
  ├─ Máquinas: 20 equipamentos
  └─ Ações: 47 pendentes de aprovação

Tenant: Fazenda Grande
  ├─ Usuários: user-a, user-b
  ├─ Fazendas: 3 propriedades
  ├─ Operações: 89 plantios/colheitas
  ├─ Máquinas: 15 equipamentos
  └─ Ações: 12 pendentes de aprovação
```

### Como ZeroClaw Sabe o Tenant

**Opção 1 (Recomendado): Extração de JWT Token**

```json
{
  "sub": "user-456",
  "tenant_id": "vila-nova",
  "email": "operator@vilanova.com",
  "roles": ["agro_operator"],
  "exp": 1234567890
}
```

**Opção 2 (Fallback): Header X-Tenant-ID**

```bash
GET /api/actions/ \
  -H "Authorization: Bearer JWT" \
  -H "X-Tenant-ID: vila-nova"
```

### Matriz de Permissões por Tenant

```
Módulo       | Owner  | Agro Op. | Stock Op. | Finance | Admin
─────────────┼────────┼──────────┼───────────┼─────────┼──────
Agricultura  | R/W/A  | R/W/A    | -         | R       | R
Máquinas     | R/W/A  | R/W/A    | -         | R       | R
Estoque      | R/W/A  | -        | R/W/A     | R       | R
Fazendas     | R/W    | R        | R         | R       | R
─────────────┼────────┼──────────┼───────────┼─────────┼──────
Financeiro   | R      | -        | -         | R       | R
Comercial    | R      | -        | -         | R       | R
Fiscal       | R      | -        | -         | R       | R
Admin        | R/W    | -        | -         | -       | R/W/A
```

**Legenda:** R=Ler, W=Escrever/Draft, A=Aprovar, -=Bloqueado

### Validação de Tenant

**Middleware Django:**

1. Request chega com `X-Tenant-ID: vila-nova`
2. Sistema extrai tenant_id do JWT ou header
3. Valida que user.tenant_id == request.tenant_id
4. QuerySets são filtrados: `.filter(tenant="vila-nova")`
5. User NUNCA vê dados de outro tenant (segurança)

### Cenário Multi-Tenant

```
👤 Usuário1 (Vila Nova)      👤 Usuário2 (Fazenda Grande)
  "Plantei soja"              "Colhi milho"
        ↓ (tenant=vila-nova)         ↓ (tenant=fazenda-grande)
        ↓                             ↓
   ┌────────────────────────────────────────┐
   │ Backend Agrolink                       │
   │ - Valida tokens                        │
   │ - Cria 2 Actions isoladas              │
   │ - Action1.tenant = vila-nova ✅        │
   │ - Action2.tenant = fazenda-grande ✅   │
   └────────────────────────────────────────┘
        ↓                             ↓
   Dashboard1 vê     Dashboard2 vê
   só vilanova       só fazenda-grande
```

**👉 Ver detalhes:** [ZEROCLAW_MULTITENANT_ARCHITECTURE.md](ZEROCLAW_MULTITENANT_ARCHITECTURE.md)

---

## 🔧 Configurações Técnicas

### ZeroClaw Config

```toml
[providers.google]
model = "gemini-2.5-flash"
region = "us-west4"
temperature = 0.2  # Mais conservador para drafts
streaming = true
prompt_caching_enabled = true
max_tokens = 2048

[integrations.agrolink]
enabled = true
api_base_url = "http://localhost:8001/api"
auth_method = "jwt"
jwt_secret = "${AGROLINK_JWT_SECRET}"
timeout_seconds = 30

read_only = true  # Não escreve diretamente
action_queue_enabled = true
action_module = ["agricultura", "maquinas", "estoque"]

[channels.telegram]
enabled = true

[channels.telegram.transcription]
enabled = true
provider = "local"  # ou "groq"
model = "base"
language = "pt"
device = "cpu"
```

---

## 📡 APIs Necessárias - MVP

### Actions Endpoints

```typescript
// List pending actions
GET /api/actions/?status=pending_approval&tenant_id=X
Response: { results: Action[], count: 3 }

// Get action detail
GET /api/actions/{action_id}/

// Approve action
POST /api/actions/{action_id}/approve/
Body: { }
Response: { status: executed | error, execution_result: {} }

// Reject action  
POST /api/actions/{action_id}/reject/
Body: { reason: string }

// Edit action before approval
PUT /api/actions/{action_id}/
Body: { payload: {...updated data...} }

// Get action history
GET /api/actions/history/?status=executed&limit=50
```

### Agriculture Endpoints (Read-only for ZeroClaw)

```
GET /api/agricultura/operacoes/?cultura=X&talhao_id=Y&tenant_id=Z
GET /api/agricultura/culturas/
GET /api/agricultura/safras/?status=em_curso
GET /api/agricultura/colheitas/?talhao_id=X
```

### Machines Endpoints (Read-only for ZeroClaw)

```
GET /api/maquinas/maquinas/?tenant_id=X
GET /api/maquinas/manutenoes/?maquina_id=Y&ultimos_dias=30
GET /api/maquinas/abastecimentos/?maquina_id=Y
```

### Estoque Endpoints (Read-only for ZeroClaw)

```
GET /api/estoque/itens/?categoria=X&tenant_id=Y
GET /api/estoque/movimentacoes/?item_id=X
GET /api/estoque/inventario/?local=X
```

---

## 💬 Exemplos de Diálogos (Revisados)

### Exemplo 1: Draft com Validação

```
👤 Usuário: "Plantei 50ha de soja em Vila Nova ontem"

🤖 Isidoro:
"Ótimo! Deixa eu registrar isso para você.

Achei o talhão Vila Nova (50 hectares em Fazenda Central).
Preciso de mais alguns detalhes:

1️⃣ Quais insumos usou no plantio?
   (Sementes, adubo, defensivo, etc)

2️⃣ A data foi 1º de março?"

👤 Usuário: "100kg de sementes, 500L de adubo. Data ta certa."

🤖 Isidoro:
"Perfeito! Preparei tudo para você:

✏️ OPERAÇÃO: Plantio de Soja - Vila Nova
  📊 50 hectares | 1º mar 2026
  🌱 Insumos: 100kg sementes + 500L adubo
  
  ✅ Talhão disponível
  ✅ Cultura válida para a região
  ⚠️ Aviso: Estoque de adubo em nível médio

Pode revisar e aprovar aqui:
👉 [IR PARA DASHBOARD]

Ou diga 'aprova aí' e eu confirmo tudo!"

👤 Usuário: "Aprova aí"

🤖 Isidoro:
"❌ Que tal revisar primeiro no dashboard? Quer ter certeza que tudo está certo.

Se tiver dúvida, é só 'edita plantio' ou 'aprova plantio'."

👤 User goes to dashboard, clicks "APROVAR"

🤖 Isidoro:
"✅ Plantio executado com sucesso!

📋 Operação criada: OP-2026-00123
Insumos debitados do estoque automaticamente."
```

---

### Exemplo 2: Bloqueio de Ação Não-MVP

```
👤 Usuário: "Registra uma venda de 100 toneladas de soja"

🤖 Isidoro:
"Entendo, mas por enquanto não consigo registrar vendas.
No MVP, posso ajudar com:

✅ Operações agrícolas (plantio, colheita, etc)
✅ Manutenção de máquinas
✅ Movimentação de estoque

Vendas e contratos comerciais saem em breve (mês que vem)!

Posso te ajudar com outra coisa?"
```

---

### Exemplo 3: Análise com Leitura

```
👤 Usuário: "Qual foi meu maior gasto no ano com milho?"

🤖 Isidoro:
"Deixa eu checar seus dados de 2025...

📊 MILHO - Análise de Custo 2025

Você plantou 200 hectares e gastou R$ 300.000 total.

Maiores custos:
  1️⃣ Adubo: R$ 120.000 (40%)
  2️⃣ Sementes: R$ 80.000 (27%)
  3️⃣ Aplicação/Máquinas: R$ 60.000 (20%)
  4️⃣ Defensivos: R$ 40.000 (13%)

Custo médio: R$ 1.500/hectare

Comparado a 2024, você gastou 12% a mais em adubo.
Colheita compensou? Qual foi sua produtividade?"
```

---

## ✅ Checklist de Implementação

### Design & Setup
- [ ] ER Diagram com Action model
- [ ] JWT auth entre ZeroClaw e Agrolink
- [ ] Rate limiting configurado
- [ ] Audit logging preparado

### Backend (Django)
- [ ] Action model e serializers
- [ ] /api/actions/* endpoints
- [ ] Validação dupla (Isidoro + Backend)
- [ ] Trigger automático de MovimentacaoEstoque após aprovação
- [ ] Endpoints de leitura com tenant_id filter

### Frontend (React)
- [ ] Dashboard de actions (list view)
- [ ] Action detail + edit modal
- [ ] Approval/rejection buttons
- [ ] History view
- [ ] Integração com Chat widget

### ZeroClaw
- [ ] Intent recognition (agricultura, máquinas, estoque)
- [ ] Draft builders para cada tipo
- [ ] Action POST com payload
- [ ] System prompts refinados
- [ ] Error handling para módulos não-MVP

### Testes
- [ ] E2E de uma operação completa
- [ ] Validação de drafts
- [ ] Rejeição e edição de actions
- [ ] Execução após aprovação

---

## 📞 Próximos Passos

1. ✅ **Este documento** → Revisão com stakeholders
2. **Design Database** → ER Diagram com Action
3. **Sprint Planning** → Decompor em tasks (jira/github)
4. **Begin Development** → Semana 1

---

**Documento v2.0 - Paradigma de Aprovação**  
**Status:** Pronto para Implementação
