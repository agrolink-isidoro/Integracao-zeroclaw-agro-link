
# API Endpoints - Agrolink

**Status Atual (03-Mar-2026)**

- **Multi-tenant:** Implementado ✅ — endpoints são `tenant-aware`; confirme o tenant ativo via header/context quando necessário.
- **Payload mismatch (contratos):** Nota importante — alguns formulários frontend enviam `FormData` esperando campos planos (ex.: `documento_contrato`) enquanto o backend usa `JSONField` com `documento`. Recomenda-se padronizar para `documento` no frontend (`JSON.stringify`) ou ajustar serializadores para compatibilidade.
- **E2E & Docs:** Consulte `docs/archived/API_ENDPOINTS.md` para endpoints detalhados arquivados.

**Última Revisão:** Março 2026
**Backend:** Django REST Framework  
**Base URL:** `http://localhost:8000/api/`  
**Autenticação:** JWT (djangorestframework-simplejwt)

---

## 💰 Financeiro — Resumo

### Resumo Financeiro
```http
GET /financeiro/resumo/
```
**Resposta (200):**
```json
{
  "vencimentos": { "total_pendente": number, "total_pago": number, "total_atrasado": number },
  "financiamentos": { "total_financiado": number, "total_pendente": number, "count_ativos": number },
  "emprestimos": { "total_emprestado": number, "total_pendente": number, "count_ativos": number },
  "data_referencia": "YYYY-MM-DD"
}
```

### Rateios — Aprovações & Permissões
- Listar aprovações pendentes / ações
```http
GET /financeiro/rateios-approvals/
```
- Aprovar/Rejeitar (ações):
```http
POST /financeiro/rateios-approvals/{id}/approve/
POST /financeiro/rateios-approvals/{id}/reject/
```
- Permissão do usuário atual para aprovar/rejeitar (útil para UI condicional):
```http
GET /financeiro/rateios-approvals/permissions/
```
Resposta (200):
```json
{ "can_approve": true | false, "can_reject": true | false }
```
Notas:
- Usuários admin (is_staff/is_superuser) são considerados aprovadores para os fins do endpoint de permissões, além de membros do grupo `financeiro.rateio_approver`.
- Use o endpoint de permissões para ocultar/desabilitar controles Aprovar/Rejeitar no lado cliente e evitar mutações que causem 403.

### Quitação de Vencimentos (Livro Caixa)
- Quitar um vencimento (total ou parcial) e criar um `LancamentoFinanceiro`:
```http
POST /financeiro/vencimentos/{id}/quitar/
Content-Type: application/json

# Payload (opcional):
{ "valor_pago": 100.0, "conta_id": 1, "data_pagamento": "YYYY-MM-DD", "reconciliar": true }
```
Resposta (200):
```json
{
  "vencimento": { /* representação do vencimento atualizado */ },
  "lancamento": { /* repr. do lancamento criado (conta, tipo, valor, data, origem) */ }
}
```
Comportamento:
- Se `valor_pago` não for fornecido, quita o valor total do vencimento.
- Se `valor_pago` for menor que o `valor` original, o sistema cria (quando aplicável) um novo vencimento com o saldo pendente (split) e gera o lançamento para a parte paga.
- O endpoint é idempotente: se um `LancamentoFinanceiro` já estiver vinculado ao vencimento, retorna o lançamento existente.

- Quitar múltiplos vencimentos em lote:
```http
POST /financeiro/vencimentos/bulk_quitar/
Content-Type: application/json

{ "ids": [1,2,3], "conta_id": 1, "data_pagamento": "YYYY-MM-DD", "reconciliar": true }
```
Resposta (200):
```json
{ "message": "N vencimentos quitados", "lancamentos": [<ids>], "falhas": [] }
```
Notas:
- Recomendado fornecer `conta_id` para registro no livro caixa; se omitido, o lançamento ficará sem conta (campo `conta` nulo).
- O endpoint é protegido por autenticação (JWT).

**Status de implementação:** Endpoints de quitação e bulk_quitar foram implementados no Sprint 1 (PR #105). Testes unitários, integração e E2E foram adicionados; veja PR: https://github.com/tyrielbr/project-agro/pull/105

### Transferências entre Contas
- Listar transferências:
```http
GET /financeiro/transferencias/
```
- Criar transferência (DOC/TED/PIX):
```http
POST /financeiro/transferencias/
Content-Type: application/json

{
  "conta_origem_id": 1,
  "conta_destino_id": 2,
  "valor": 1000.00,
  "tipo_transferencia": "DOC|TED|PIX",
  "data_transferencia": "YYYY-MM-DD",
  "descricao": "Transferência entre contas"
}
```
- Detalhes de uma transferência:
```http
GET /financeiro/transferencias/{id}/
PUT /financeiro/transferencias/{id}/
DELETE /financeiro/transferencias/{id}/
```

### Fluxo de Caixa
- Obter fluxo de caixa com filtros:
```http
GET /financeiro/fluxo-caixa/?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD&conta_id=1&tipo=entrada|saida
```
**Resposta (200):**
```json
{
  "periodo": { "inicio": "YYYY-MM-DD", "fim": "YYYY-MM-DD" },
  "saldo_inicial": 5000.00,
  "movimentacoes": [
    {
      "data": "YYYY-MM-DD",
      "tipo": "entrada|saida",
      "valor": 1000.00,
      "conta": "Nome da Conta",
      "categoria": "Categoria",
      "descricao": "Descrição"
    }
  ],
  "saldo_final": 6000.00,
  "totais": { "entradas": 1500.00, "saidas": 1000.00, "net": 500.00 }
}
```

### Vencimentos com Ordenação e Badges
- Listar vencimentos com filtros e ordenação:
```http
GET /financeiro/vencimentos/?ordering=-data_vencimento&status=pendente|atrasado|pago&data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
```
**Resposta (200):** Lista paginada com badges indicando status (pendente, atrasado, pago).

Notas:
- Usado pelo dashboard frontend para renderizar KPIs e gráficos.
- Considere adicionar endpoints de cache e agregação para grandes conjuntos de dados.

---

## 👥 Administrativo

### Funcionários
```http
GET /administrativo/funcionarios/
POST /administrativo/funcionarios/
GET /administrativo/funcionarios/{id}/
PUT /administrativo/funcionarios/{id}/
DELETE /administrativo/funcionarios/{id}/
```

### Centros de Custo
```http
GET /administrativo/centros-custo/
POST /administrativo/centros-custo/
GET /administrativo/centros-custo/{id}/
PUT /administrativo/centros-custo/{id}/
DELETE /administrativo/centros-custo/{id}/
```

### Folha de Pagamento
```http
GET /administrativo/folha-pagamento/
POST /administrativo/folha-pagamento/
GET /administrativo/folha-pagamento/{id}/
PUT /administrativo/folha-pagamento/{id}/
DELETE /administrativo/folha-pagamento/{id}/
```

### Despesas Administrativas
```http
GET /administrativo/despesas/
POST /administrativo/despesas/
GET /administrativo/despesas/{id}/
PUT /administrativo/despesas/{id}/
DELETE /administrativo/despesas/{id}/
```

---

## 🧾 Fiscal — Notas Fiscais & Manifestações (Resumo de Endpoints)

### Listar Notas Fiscais
```http
GET /api/fiscal/nfes/
```
**Query Parameters:** `search=<texto>`, `paginate_by=<int>`, etc.

Resposta (200):
```json
{
  "count": 45,
  "next": "http://localhost:8001/api/fiscal/nfes/?page=2",
  "previous": null,
  "results": [
    { "id": 1, "chave": "35220102123456000167550010000000123456789012", "numero": "123", "serie": "1", ... },
    ...
  ]
}
```

**Otimizações (Implementação):**
- Endpoint utiliza `select_related('processado_por', 'fornecedor')` para otimizar queries e evitar N+1.
- Prefetch das relações `itens` e `manifestacoes` para listar NFes com seus items e status de manifestação.
- ⚠️ **Fix (11/02/2026):** Corrigido `FieldError` causado por tentativa de usar `select_related('certificado')`, que não existe no modelo NFe. O modelo usa apenas `processado_por` (CustomUser) e `fornecedor` (Fornecedor). Ver Commit: `cb134b90`.

### Registrar Manifestação
```http
POST /api/fiscal/notas/{id}/manifestacao/
Content-Type: application/json
{
  "tipo": "ciencia" | "confirmacao" | "desconhecimento" | "nao_realizada",
  "motivo": "texto opcional (obrigatório para 'nao_realizada', 15-255 caracteres)",
  "certificado_id": 5  // opcional, se omitido usa prioridade automática
}
```

### Overrides de Itens NFe (Ajustes de Estoque)
- CRUD de overrides:
```http
GET /api/fiscal/item-overrides/
POST /api/fiscal/item-overrides/  # criar override (campo 'aplicado' opcional)
GET /api/fiscal/item-overrides/{id}/
PATCH /api/fiscal/item-overrides/{id}/
DELETE /api/fiscal/item-overrides/{id}/
```

- Aplicar override explicitamente (marca `aplicado=True` e, se necessário, cria ajustes de estoque):
```http
POST /api/fiscal/item-overrides/{id}/apply/
```
Resposta (200): { "detail": "applied" }

- Verificar divergências entre NFe e estoque (overrides não-aplicados):
```http
GET /api/fiscal/nfes/{id}/divergencias/
```
Resposta (200): lista de entradas com campos como `item_id`, `override_id`, `original_quantidade`, `override_quantidade`, `quantidade_delta`, `original_valor_unitario`, `override_valor_unitario`, `valor_delta`.

Comportamento:
- `confirmar_estoque()` usa valores efetivos: `override` mais recente aplicado > valores originais de `ItemNFe`.
- Se `apply` for executado contra um override e a NFe já tiver `estoque_confirmado=True`, será gerada automaticamente uma `MovimentacaoEstoque` de ajuste (origem=`ajuste`, documento_referencia contendo `override-id`) quando houver diferença de quantidade; se apenas o valor unitário mudou, será gerado um `ProdutoAuditoria` registrando a alteração de preço e o `custo_unitario` do produto será recalculado baseado no custo médio ponderado de todas as entradas.
- **Aplicação por item:** a aplicação de overrides é exclusivamente por item (ação explícita do usuário). O endpoint que aplicava batch/"refletir tudo" foi removido — privilégios e ações devem ser tomadas por item individualmente na UI. Recomendado e implementado: apenas usuários com a permissão `fiscal.apply_itemnfeoverride` podem aplicar overrides quando a NFe já tiver `estoque_confirmado=true`. Isso vale para a ação explícita `POST /api/fiscal/item-overrides/{id}/apply/`, para `PATCH/PUT` que marquem `aplicado=true`, e para `POST` que criem um override já com `aplicado=true` (neste caso o servidor retorna 403 se o usuário não tiver a permissão necessária). **Nota:** O apply só funciona se a NFe estiver confirmada (`estoque_confirmado=True`); caso contrário, a operação é pulada silenciosamente. See: `docs/04-Modulos/Fiscal/NOTA_FISCAL_OVERRIDES.md` for runbook and rationale.

Notas importantes:
- Os ajustes usam o serviço transacional `apps.estoque.services.create_movimentacao` para garantir locks, snapshots e criação de `MovimentacaoStatement`/`ProdutoAuditoria` automaticamente.
- Testes: `apps/fiscal/tests/test_item_override.py`, `apps/fiscal/tests/test_override_apply.py`.
**Resposta (201):**
```json
{ 
  "manifestacao": { 
    "id": 123, 
    "nfe": 456, 
    "tipo": "confirmacao", 
    "status_envio": "pending",
    "certificado": 5
  }, 
  "enqueued": true 
}
```

### Refletir Fornecedor (Criação/Atualização)
```http
POST /api/fiscal/nfes/{id}/reflect_fornecedor/
Content-Type: application/json

{ "force": false }
```

Resposta (200 — happy path):
```json
{
  "fornecedor_id": 123,
  "created": true,
  "updated": false,
  "conflict": false,
  "fornecedor": { /* comercial.serializers.FornecedorSerializer */ }
}
```

Comportamento / Regras:
- Cria um `Fornecedor` a partir dos dados do emitente da NFe quando não existe correspondência.
- Tentativa de matching por `cpf_cnpj` (quando presente, normalizado) e, em seguida, por `nome` exato.
- Se um `Fornecedor` existente for encontrado com divergências, o endpoint retorna `conflict: true` e um `diff` de campos; se `force=true` no body a operação sobrescreve os campos divergentes.
- Permissões: requer `fiscal.change_nfe` e (`comercial.add_fornecedor` ou `comercial.change_fornecedor`).
- Operação transacional e com log mínimo; não cria modelos de auditoria adicionais nesta versão.

Notas:
- Endpoint projetado para ser usado pela interface de edição da NFe (`NfeEditModal`). Em caso de conflito a UI deve apresentar o `diff` e permitir que o usuário force a atualização.
- Pré-condições operacionais (a validar em futuras iterações): considerar exigir que a NFe esteja manifestada/confirmada antes de permitir reflexão automática.

### Preview XML (sem persistir)
```http
POST /api/fiscal/nfes/preview_xml/
Content-Type: multipart/form-data

xml_file: <arquivo .xml>
```

Resposta (200):
```json
{
  "chave_acesso": "35...",
  "numero": "123",
  "serie": "1",
  "data_emissao": "2026-01-15",
  "natureza_operacao": "VENDA",
  "emitente": { "cnpj": "...", "nome": "...", "fantasia": "...", "inscricao_estadual": "..." },
  "destinatario": { "cnpj": "...", "cpf": "...", "nome": "...", "inscricao_estadual": "...", "email": "..." },
  "totais": { "valor_produtos": "1000.00", "valor_nota": "1100.00", "valor_icms": "180.00", ... },
  "itens": [{ "numero_item": "1", "descricao": "...", "ncm": "...", "cfop": "...", "quantidade": "10", "valor_unitario": "100.00", "valor_total": "1000.00" }],
  "duplicatas": [{ "numero": "001", "data_vencimento": "2026-02-15", "valor": "550.00" }],
  "pagamentos": [{ "tPag": "01", "vPag": "1100.00", "label": "Dinheiro" }],
  "already_imported": false
}
```

Comportamento:
- Analisa o XML e retorna dados estruturados **sem criar registros no banco**.
- Se `already_imported: true`, a chave de acesso já existe no sistema.
- Usado pelo frontend `NfeUploadModal` (wizard de 3 passos) antes do upload definitivo.

### Refletir Cliente (Criação/Atualização)
```http
POST /api/fiscal/nfes/{id}/reflect_cliente/
Content-Type: application/json

{ "force": false }
```

Resposta (200/201):
```json
{
  "cliente_id": 42,
  "created": true,
  "updated": false,
  "conflict": false,
  "divergencias": []
}
```

Comportamento:
- Cria ou atualiza um `Cliente` a partir dos dados do **destinatário** da NFe.
- Matching por `cpf_cnpj`; se existente com divergências e `force=false`, retorna `conflict: true` com `divergencias`.
- Auto-executado via signal para NFes de saída (`tipo_operacao='1'`).

**Validações:**
- Certificado: válido, ownership, não expirado
- Ciência: bloqueada após manifestação conclusiva
- Tipos conclusivos: máximo 2 ocorrências por tipo
- Prazos: Ciência 10 dias, Conclusivas 180 dias

### Sincronizar com SEFAZ
```http
POST /api/fiscal/nfes/sincronizar/
```
**Resposta (202 Accepted):**
```json
{
  "job_id": 123,
  "status": "pending"
}
```
**Descrição:** Consulta manifestações registradas em outros sistemas via NFeDistribuicaoDFe e atualiza histórico local.

### Listar Certificados
```http
GET /api/fiscal/certificados/
```
**Resposta (200):**
```json
{
  "results": [
    {
      "id": 1,
      "nome": "Certificado A1 - Empresa XYZ",
      "validade": "2026-12-31",
      "fingerprint": "AB:CD:EF...",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Reenfileirar Manifestação (Administrativo)
```http
POST /api/fiscal/manifestacoes/{id}/retry/
```
**Resposta (200):** `{ "enqueued": true|false }`  
**Permissão:** staff ou ModulePermission específica

### Listagens
```http
GET /api/fiscal/manifestacoes/?nfe=456&tipo=confirmacao
GET /api/fiscal/notas/{id}/manifestacoes/
```

### Configurações & Flags
- `FISCAL_MANIFESTACAO_ENABLED` (bool) — ativa endpoints/UI
- `VITE_FISCAL_MANIFESTACAO_ENABLED` — habilita componente frontend no build para E2E/QA

📚 **Documentação completa:** [docs/04-Modulos/Fiscal/Manifestacao.md](04-Modulos/Fiscal/Manifestacao.md)  
✅ **Status:** Implementado (02/2026) — Certificado digital, validações preventivas, sincronização SEFAZ


### Configurações do Sistema
```http
GET /administrativo/configuracoes/
POST /administrativo/configuracoes/
GET /administrativo/configuracoes/{id}/
PUT /administrativo/configuracoes/{id}/
DELETE /administrativo/configuracoes/{id}/
```

### Logs de Auditoria
```http
GET /administrativo/logs-auditoria/
POST /administrativo/logs-auditoria/
GET /administrativo/logs-auditoria/{id}/
PUT /administrativo/logs-auditoria/{id}/
DELETE /administrativo/logs-auditoria/{id}/
```

### Backups
```http
GET /administrativo/backups/
POST /administrativo/backups/
GET /administrativo/backups/{id}/
PUT /administrativo/backups/{id}/
DELETE /administrativo/backups/{id}/
```

### Notificações
```http
GET /administrativo/notificacoes/
POST /administrativo/notificacoes/
GET /administrativo/notificacoes/{id}/
PUT /administrativo/notificacoes/{id}/
DELETE /administrativo/notificacoes/{id}/
```

### Backfill Rateios
```http
POST /administrativo/backfill-rateios/
```
**Descrição:** Endpoint para backfill de rateios, utilizado para sincronizar dados históricos.

---

## 🔐 RBAC (Role-Based Access Control) - Documentado

### Status: APIs Criadas, Middleware Pendente
O sistema RBAC possui modelo e APIs implementados, mas o middleware de enforcement e interface completa estão pendentes.

### Usuários e Perfis
- Listar usuários com perfis RBAC:
```http
GET /core/users/
```
- Detalhes de um usuário:
```http
GET /core/users/{id}/
PUT /core/users/{id}/
```
- Criar usuário (apenas admin):
```http
POST /core/users/
Content-Type: application/json

{
  "username": "usuario",
  "email": "usuario@exemplo.com",
  "first_name": "Nome",
  "last_name": "Sobrenome",
  "profile": "Funcionário Temporário|Funcionário|Gerente|Administrador|Proprietário"
}
```

### Permissões por Módulo
- Listar permissões do usuário atual:
```http
GET /core/permissions/
```
**Resposta (200):**
```json
{
  "user_id": 1,
  "profile": "Gerente",
  "permissions": {
    "financeiro": { "read": true, "write": true, "admin": false },
    "fazendas": { "read": true, "write": true, "admin": false },
    "agricultura": { "read": true, "write": false, "admin": false }
  }
}
```

### ModulePermission Model
- CRUD para permissões granulares:
```http
GET /core/module-permissions/
POST /core/module-permissions/
GET /core/module-permissions/{id}/
PUT /core/module-permissions/{id}/
DELETE /core/module-permissions/{id}/
```
**Payload para criação:**
```json
{
  "user_id": 1,
  "module": "financeiro",
  "permission_type": "read|write|admin"
}
```

### Perfis Hierárquicos
Os 7 perfis em ordem crescente de privilégios:
1. Funcionário Temporário (acesso básico, leitura limitada)
2. Funcionário (leitura em módulos específicos)
3. Gerente (escrita em módulos específicos)
4. Administrador (escrita em todos os módulos)
5. Proprietário (acesso total, incluindo configurações do sistema)

---



> Nota: Algumas respostas são paginadas por padrão (DRF PageNumberPagination) e retornam o formato `{count, next, previous, results}`. Alguns endpoints ou views podem estar configurados para retornar uma lista bruta (por ex., `/api/users/`, `/api/fazendas/`) — ver comentários nos endpoints específicos.

### Movimentações de Carga
```http
POST /agricultura/movimentacoes-carga/
Content-Type: application/json
```
- Payload aceita um objeto `transporte` aninhado com os campos `placa`, `motorista`, `tara`, `peso_bruto`, `descontos`, `custo_transporte`.
- Exemplo:
```json
{
  "session_item": 1,
  "talhao": 3,
  "destino_tipo": "armazenagem_interna",
  "transporte": {
    "placa": "ABC1234",
    "motorista": "Joao",
    "tara": "1000",
    "peso_bruto": "1500",
    "descontos": "5.5"
  }
}
```
- Ao criar, o sistema calculará `peso_liquido` (peso_bruto - tara - descontos) e, se a movimentação estiver vinculada a um `session_item`, marcará o item como `carregado` e verificará a finalização da sessão.

#### Ações adicionais
- `POST /agricultura/movimentacoes-carga/{id}/reconcile/` — marca a movimentação como reconciliada e (quando possível) cria uma `MovimentacaoEstoque` de `entrada` vinculada ao produto correspondente à cultura/safra. Uso típico: confirmar peso líquido e registrar entrada em estoque.

#### Ajustes pós-reconciliação
- `POST /agricultura/movimentacoes-carga/{id}/adjust/` — aplica um ajuste auditável sobre uma movimentação já reconciliada.

Requisição (application/json):
```json
{ "new_quantity": 123.45, "reason": "ajuste por umidade" }
```

Comportamento:
- Cria uma `MovimentacaoEstoque` de compensação:
  - `tipo = entrada` se `new_quantity > original_quantity` (aumenta estoque)
  - `tipo = saida` se `new_quantity < original_quantity` (reduz estoque)
- Atualiza `MovimentacaoCarga.peso_liquido` para o valor `new_quantity`.
- Atualiza `Lote.quantidade_atual` para refletir o novo total confirmado (paridade com o peso final).

Justificativa: a alteração é representada como uma movimentação de estoque separada para manter um histórico claro e audível das correções.

### Colheitas
- O campo `is_estimada` (boolean) identifica se a colheita é apenas uma estimativa (padrão: `true`). Colheitas estimadas não alteram estoque automaticamente.
- Para transformar uma colheita estimada em entrada em estoque use:
```http
POST /agricultura/colheitas/{id}/armazenar_estoque/
Content-Type: application/json
```
Payload:
```json
{
  "local_armazenamento_id": 12,
  "lote_numero": "COL-12345"
}
```
Resposta (200): retorna a colheita atualizada com `is_estimada=false` e `movimentacao_estoque` populada.


## 🌾 Agricultura - Operações

### Listar Operações
```http
GET /agricultura/operacoes/
```

**Parâmetros de Consulta:**
- `categoria` (string): Filtrar por categoria
- `status` (string): Filtrar por status
- `plantio` (int): Filtrar por safra/plantio
- `fazenda` (int): Filtrar por fazenda
- `data_inicio` (date): A partir de
- `data_fim` (date): Até
- `search` (string): Busca textual
- `ordering` (string): Ordenação (ex: `-data_operacao`)

**Resposta (200):**
```json
[
  {
    "id": 1,
    "categoria": "pulverizacao",
    "tipo": "pulv_herbicida",
    "categoria_display": "Pulverização (Fitossanitário)",
    "tipo_display": "Aplicação de Herbicida",
    "data_operacao": "2025-12-24",
    "status": "planejada",
    "area_total_ha": 82.2,
    "custo_total": null,
    "cultura_nome": "Milho"
  }
]
```

---

### Criar Operação
```http
POST /agricultura/operacoes/
Content-Type: application/json
```

**Corpo da Requisição:**
```json
{
  "categoria": "preparacao",
  "tipo": "prep_arado",
  "plantio": 1,
  "talhoes": [1, 2, 3],
  "data_operacao": "2025-12-24",
  "data_inicio": "2025-12-24T08:00:00Z",
  "data_fim": "2025-12-24T17:00:00Z",
  "status": "planejada",
  "observacoes": "Primeira aração da safra",
  "custo_mao_obra": 500.00,
  "custo_maquina": 800.00,
  "custo_insumos": 0.00,
  "trator": 1,
  "implemento": 2
}
```

**Campos Obrigatórios:**
- `categoria` ✓
- `tipo` ✓
- `talhoes` ✓ (array, min 1)
- `data_operacao` ✓
- `data_inicio` ✓
- `status` ✓

**Campos Opcionais:**
- `plantio` (safra associada)
- `fazenda`
- `data_fim`
- `observacoes`
- `custo_mao_obra`, `custo_maquina`, `custo_insumos`
- `trator`, `implemento`
- `produtos_input` (array de produtos)
- `dados_especificos` (JSON livre)

**Resposta (201):**
```json
{
  "id": 4,
  "categoria": "preparacao",
  "tipo": "prep_arado",
  "categoria_display": "Preparação do Solo",
  "tipo_display": "Aração",
  "plantio": 1,
  "fazenda": null,
  "talhoes": [1, 2, 3],
  "talhoes_info": [
    {
      "id": 1,
      "nome": "Talhão A",
      "area_hectares": 50.5
    }
  ],
  "data_operacao": "2025-12-24",
  "data_inicio": "2025-12-24T08:00:00Z",
  "data_fim": "2025-12-24T17:00:00Z",
  "status": "planejada",
  "status_display": "Planejada",
  "area_total_ha": 150.5,
  "custo_total": 1300.00,
  "custo_mao_obra": 500.00,
  "custo_maquina": 800.00,
  "custo_insumos": 0.00,
  "observacoes": "Primeira aração da safra",
  "cultura_nome": "Milho",
  "criado_em": "2025-12-24T19:00:00Z",
  "atualizado_em": "2025-12-24T19:00:00Z"
}
```

---

### Buscar Operação por ID
```http
GET /agricultura/operacoes/{id}/
```

**Resposta (200):**
```json
{
  "id": 1,
  "categoria": "preparacao",
  "tipo": "prep_arado",
  "categoria_display": "Preparação do Solo",
  "tipo_display": "Aração",
  "plantio": 1,
  "plantio_info": {
    "id": 1,
    "cultura_nome": "Milho",
    "data_plantio": "2025-09-01"
  },
  "talhoes_info": [...],
  "area_total_ha": 150.5,
  "custo_total": 1300.00,
  "dados_especificos": {},
  "criado_por": 1,
  "criado_por_nome": "Admin",
  "criado_em": "2025-12-24T19:00:00Z",
  "atualizado_em": "2025-12-24T19:00:00Z"
}
```

**Resposta (404):**
```json
{
  "detail": "Não encontrado."
}
```

---

### Atualizar Operação
```http
PATCH /agricultura/operacoes/{id}/
Content-Type: application/json
```

**Corpo da Requisição (parcial):**
```json
{
  "status": "em_andamento",
  "data_inicio": "2025-12-24T09:00:00Z",
  "observacoes": "Atualizado"
}
```

**Resposta (200):** Operação atualizada completa

---

### Deletar Operação
```http
DELETE /agricultura/operacoes/{id}/
```

**Resposta (204):** No Content

---

### Tipos por Categoria
```http
GET /agricultura/operacoes/tipos-por-categoria/?categoria={categoria}
```

**Categorias Válidas:**
- `preparacao`
- `adubacao`
- `plantio`
- `tratos`
- `pulverizacao`
- `mecanicas`

**Resposta (200):**
```json
{
  "categoria": "preparacao",
  "tipos": [
    {
      "value": "prep_arado",
      "label": "Aração"
    },
    {
      "value": "prep_grade",
      "label": "Gradagem"
    },
    {
      "value": "prep_subsolagem",
      "label": "Subsolagem"
    },
    {
      "value": "prep_nivelamento",
      "label": "Nivelamento"
    },
    {
      "value": "prep_outra",
      "label": "Outra Preparação"
    }
  ]
}
```

**Response (400):**
```json
{
  "error": "Parâmetro 'categoria' é obrigatório"
}
```

---

### Estatísticas
```http
GET /agricultura/operacoes/estatisticas/?fazenda={id}&plantio={id}&data_inicio={date}&data_fim={date}
```

**Response (200):**
```json
{
  "total_operacoes": 45,
  "por_categoria": {
    "preparacao": 10,
    "adubacao": 8,
    "plantio": 5,
    "tratos": 12,
    "pulverizacao": 8,
    "mecanicas": 2
  },
  "por_status": {
    "planejada": 15,
    "em_andamento": 5,
    "finalizada": 25
  },
  "custos": {
    "total": 125000.00,
    "mao_obra": 45000.00,
    "maquina": 60000.00,
    "insumos": 20000.00
  },
  "area_total_ha": 1250.5
}
```

---

## 🏡 Fazendas

### Listar Fazendas
```http
GET /fazendas/
```

**Nota:** Para conveniência alguns recursos são expostos sem prefixos adicionais (ex.: `/api/fazendas/`), veja a seção "Roteamento" abaixo para convenções de URL.

**Response (200):**
```json
[
  {
    "id": 1,
    "nome": "Fazenda Santana",
    "area_total": 500.00,
    "proprietario": 1,
    "proprietario_nome": "João Silva",
    "cidade": "Uberaba",
    "estado": "MG"
  }
]
```

---

### Listar Talhões
```http
GET /fazendas/talhoes/
```

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Talhão A",
    "area_hectares": 50.5,
    "area_size": "50.50",
    "fazenda_id": 1,
    "fazenda_nome": "Fazenda Santana",
    "area": 9,
    "area_nome": "Matrícula 20"
  }
]
```

---

## 🌱 Agricultura - Plantios

### Listar Plantios/Safras
```http
GET /agricultura/plantios/
```

**Response (200):**
```json
[
  {
    "id": 1,
    "fazenda": 1,
    "fazenda_nome": "Fazenda Santana",
    "talhoes": [1, 2, 3],
    "talhoes_info": [
      {
        "id": 1,
        "nome": "Talhão A",
        "area_hectares": 50.5
      }
    ],
    "cultura": 7,
    "cultura_nome": "Milho",
    "data_plantio": "2025-09-01",
    "area_total_ha": 150.5,
    "status": "em_andamento",
    "nome_safra": "Safra Milho 2025/26"
  }
]
```

---

### Listar Culturas
```http
GET /agricultura/culturas/
```

**Response (200):**
```json
[
  {
    "id": 1,
    "nome": "Milho",
    "nome_cientifico": "Zea mays",
    "tipo_cultura": "graos",
    "ciclo_dias": 120
  }
]
```

---

## � Core - Usuários

### Listar Usuários (aviso: endpoint não requer autenticação em ambientes de teste)
```http
GET /users/
```

**Response (200):**
```json
[
  { "id":1, "username":"alice", "email":"alice@example.com" }
]
```


## �🚜 Máquinas

### Listar Equipamentos
```http
GET /maquinas/equipamentos/
```

**Response (200):**
```json
[
  {
    "id": 1,
    "tipo": "trator",
    "modelo": "John Deere 7215R",
    "ano": 2020,
    "status": "ativo"
  }
]
```

---

## 📦 Estoque - Produtos

### Listar Produtos
```http
GET /estoque/produtos/
```

**Observações importantes:**
- Resposta paginada por padrão: `{count, next, previous, results}`.
- Os produtos aceitam campos agronômicos relevantes: `principio_ativo` e `composicao_quimica` (agora expostos no serializer e aceitos em PATCH).
- Atualizações parciais (PATCH) respeitam valores já existentes na instância: enviar apenas os campos que deseja alterar. Ex: `{ "preco_venda": 200 }` em um `inseticida` com `principio_ativo` já existente não deverá falhar.

**Response (200):**
```json
[
  {
    "id": 1,
    "nome": "Glifosato 480g/L",
    "categoria": "herbicida",
    "unidade": "L",
    "estoque_atual": 500.00
  }
]
```

---

## 🔐 Autenticação

### Login
```http
POST /auth/login/
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  },
  "token": "abc123..."
}
```

---

### Logout
```http
POST /auth/logout/
```

**Response (200):**
```json
{
  "detail": "Logout realizado com sucesso"
}
```

---

## 📊 Códigos de Status HTTP

- **200** OK - Sucesso
- **201** Created - Recurso criado
- **204** No Content - Deletado com sucesso
- **400** Bad Request - Dados inválidos
- **401** Unauthorized - Não autenticado
- **403** Forbidden - Sem permissão
- **404** Not Found - Recurso não encontrado
- **500** Internal Server Error - Erro no servidor

---

## 🔍 Filtros e Busca

### Ordering (Ordenação)
```http
GET /agricultura/operacoes/?ordering=-data_operacao
```

**Opções:**
- `data_operacao` (crescente)
- `-data_operacao` (decrescente)
- `custo_total`, `-custo_total`
- `criado_em`, `-criado_em`

### Busca
```http
GET /agricultura/operacoes/?search=herbicida
```

Busca nos campos:
- `categoria`
- `tipo`
- `observacoes`

### Paginação
```http
GET /agricultura/operacoes/?limit=10&offset=0
```

**Resposta:**
```json
{
  "count": 45,
  "next": "http://localhost:8000/api/agricultura/operacoes/?limit=10&offset=10",
  "previous": null,
  "results": [...]
}
```

---

## Comercial - Novos Endpoints

- GET /api/comercial/clientes/ — Lista clientes (suporta parâmetro de consulta `search`).
- POST /api/comercial/clientes/ — Cria um cliente. Campos relevantes: `nome`, `tipo_pessoa`, `cpf_cnpj`, `telefone`, `email`, `endereco`, `status`.
- GET /api/comercial/contratos/ — Lista contratos comerciais (com filtro e paginação).
- POST /api/comercial/contratos/ — Cria um contrato. Campos principais: `numero_contrato`, `titulo`, `tipo_contrato`, `categoria`, `status`, `valor_total`, `data_inicio`, `partes` (array).
- GET /api/comercial/vendas-compras/ — Endpoint unificado que lista vendas e compras (tipo_operacao: `venda` ou `compra`).
- POST /api/comercial/vendas-compras/ — Cria uma operação (payload deve incluir `tipo_operacao` igual a `compra` ou `venda` com os campos correspondentes).

## 🛠️ Ferramentas de Teste

### cURL
```bash
# Listar operações
curl http://localhost:8000/api/agricultura/operacoes/

# Criar operação
curl -X POST http://localhost:8000/api/agricultura/operacoes/ \
  -H "Content-Type: application/json" \
  -d '{
    "categoria": "preparacao",
    "tipo": "prep_arado",
    "talhoes": [1],
    "data_operacao": "2025-12-24",
    "data_inicio": "2025-12-24T08:00:00Z",
    "status": "planejada"
  }'

# Buscar por ID
curl http://localhost:8000/api/agricultura/operacoes/1/
```

### HTTPie
```bash
# Listar
http GET localhost:8000/api/agricultura/operacoes/

# Criar
http POST localhost:8000/api/agricultura/operacoes/ \
  categoria=preparacao \
  tipo=prep_arado \
  talhoes:='[1]' \
  data_operacao=2025-12-24 \
  data_inicio=2025-12-24T08:00:00Z \
  status=planejada
```

### Coleção Postman
**TODO:** Criar coleção Postman

---

## 📝 Notas

### Validações Backend
- Categoria deve existir em `CATEGORIA_CHOICES`
- Tipo deve corresponder à categoria
- Data término > data início (quando presente)
- Talhões não podem estar vazios
- Custos não podem ser negativos

### Performance
- Use `select_related` e `prefetch_related` para otimizar queries
- Limite resultados com paginação
- Cache de tipos/categorias recomendado

### Versionamento
- API atual: v1 (implícito)
- Futuro: /api/v2/ quando necessário

---

**Documento mantido manualmente. Atualizar após mudanças na API.**

**Última atualização:** 24/12/2025


- Arquivado: detalhes sobre endpoints movidos para [docs/archived/API_ENDPOINTS.md](docs/archived/API_ENDPOINTS.md).