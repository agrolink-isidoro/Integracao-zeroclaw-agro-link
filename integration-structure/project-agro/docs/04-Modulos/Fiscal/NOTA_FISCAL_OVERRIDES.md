# Overrides de Itens NFe e Ajustes Automáticos de Estoque (2026-02)

Resumo
------
Este documento descreve a implementação de *overrides* para itens de NF-e (`ItemNFeOverride`) e o fluxo de aplicação automática de ajustes de estoque quando um override é aplicado após a NFe ter sido confirmada (`estoque_confirmado=True`).

Objetivo
--------
Permitir que usuários registrem alterações (quantidades e/ou valores) sobre os itens importados da NFe e garantir que essas alterações sejam:

- persistidas com histórico e auditoria (quem/quando/motivo);
- aplicáveis antes da confirmação do estoque (afetam a movimentação de confirmação);
- aplicadas após a confirmação do estoque como *movimentações de ajuste* auditadas (entrada/saída) de forma transacional e reversível.

Mudanças principais
-------------------
- Model: `ItemNFeOverride` (novo) em `apps.fiscal.models_overrides`.
  - Campos: `item (FK ItemNFe)`, `quantidade`, `valor_unitario` (currency, 2 decimal places), `valor_produto`, `criado_por`, `criado_em`, `aplicado`, `motivo`, `observacoes`.  
  - Observação: valores unitários são normalizados para 2 casas decimais (arredondamento HALF_UP) tanto na API quanto no banco de dados.
- Helpers em `ItemNFe`:
  - `_get_most_relevant_override()`: retorna o override mais recentemente criado (aplicado ou não) para exibição imediata no UI.
  - `effective_quantidade()`, `effective_valor_unitario()`: provêm o valor efetivo a ser usado por integrações e UI.
- API:
  - CRUD `ItemNFeOverride` via `ItemNFeOverrideViewSet` (rota: `/api/fiscal/item-overrides/`).
  - Ação adicional: `POST /api/fiscal/item-overrides/{id}/apply/` marca um override como `aplicado=True` e dispara o fluxo de ajuste automático quando aplicável.
- Fluxo de confirmação de estoque (`NFeViewSet.confirmar_estoque`): passa a usar valores efetivos (`item.effective_*()`) ao criar `MovimentacaoEstoque`.
- Service `apply_item_override(override, user)` em `apps.fiscal.services` realiza:
  - se `nfe.estoque_confirmado == True`: procura a movimentação original (origem='nfe', documento_referencia = `nfe.chave_acesso`) para o produto e calcula delta = new_qty - original_qty;
    - Se delta != 0: cria `MovimentacaoEstoque` de ajuste (tipo `entrada` ou `saida`) via `create_movimentacao(..., origem='ajuste', documento_referencia='{nfe.chave_acesso}#override-{override.id}')`.
    - Se delta == 0 mas `valor_unitario` mudou: cria `ProdutoAuditoria` com origem `nfe-override` registrando a alteração de preço.
  - Operação transacional (rollback em erro) e com logs de falha não bloqueantes durante criação do override.
- UI e operação: **Aplicação explícita por item somente.** A interface (`NfeEditModal`) mostra por-item a ação **"Refletir no Estoque"** quando houver divergência (endpoint `GET /api/fiscal/nfes/{id}/divergencias/`), e cada aplicação requer ação do usuário e checagem de permissões. O endpoint para aplicar batch foi removido por decisão de segurança/controle operacional.- Migration: `fiscal.0016_add_itemnfeoverride` e `0025_merge_itemnfeoverride_auto_detect` (merge para resolver heads múltiplos).
- Testes:
  - `apps/fiscal/tests/test_item_override.py` (criação + confirmar_estoque usa override)
  - `apps/fiscal/tests/test_override_apply.py` (aplicação de override em NFe confirmada: ajustes + auditoria)

Racional e decisões
-------------------
- Por que ajustes em vez de sobrescrever históricos?
  - Transparência: alterações no inventário devem ser representadas por movimentações; sobrescrever valores históricos perde rastreabilidade.
  - Auditoria: o sistema já tem `MovimentacaoStatement` e `ProdutoAuditoria` que são acionados quando `MovimentacaoEstoque` é criada; reutilizar esse fluxo garante consistência e facilita relatórios.

Permissões e segurança
----------------------
- Recomendado **exigir permissão para aplicar overrides** quando a NFe já está confirmada. Sugestão: criar permissão/module-scope `fiscal:apply_override` (ou usar `is_staff` como restrição temporária).
- Endpoint `apply` já exige autenticação; sugere-se adicionar checagem de permissão e testes de autorização (P0) antes de liberar para produção.

Nota operacional: por padrão **operações que resultariam em saldo negativo são bloqueadas**. Se for necessário permitir saldo negativo em casos excepcionais, será criado posteriormente um fluxo de autorização com permissão elevada (ex.: `fiscal.allow_negative_stock`) e registro explícito da justificativa.

Backwards compatibility e migração
----------------------------------
- Migration adiciona nova tabela. Para ambientes existentes, aplicar as migrations via `python manage.py migrate`.
- Há um merge migration (`0025`) para resolver múltiplos heads no histórico de migrações.

Rollout & QA
------------
- Testes automatizados cobrindo: criação de override, confirmar_estoque com override, aplicar override pós-confirmação com ajuste e auditoria, permissões (a implementar).
- Manual QA (sugestão):
  1. Importar NFe com item A quantidade 10.
  2. Confirmar estoque — verificar `MovimentacaoEstoque` (origem='nfe').
  3. Criar override com quantidade 7 e aplicar (POST apply) — verificar `MovimentacaoEstoque` de ajuste (tipo=saida, quantidade=3, documento_referencia contendo override id) e registro em `ProdutoAuditoria`.
  4. Criar override que altera apenas `valor_unitario` — aplicar e verificar `ProdutoAuditoria` com `origem='nfe-override'`.

Frontend: Modal de edição
-------------------------
- Foi adicionada uma modal de edição no front-end (`NfeEditModal`) acessível a partir da listagem de Notas Fiscais (`NfeList`) via o botão **"Editar Valores"**.
- Comportamento:
  - Ao abrir, a modal busca os detalhes da NFe (`GET /api/fiscal/nfes/{id}/`) e exibe os itens com os valores *efetivos* (`effective_quantidade`, `effective_valor_unitario`).
  - Campos editáveis: quantidade e valor unitário por item (inputs). Campos não editáveis são exibidos como leitura.
  - Ao salvar, para cada item com alteração é criado um `ItemNFeOverride` via `POST /api/fiscal/item-overrides/` com `aplicado=true` para que o valor alterado passe a ser efetivo imediatamente.
  - Após salvar, a lista e os detalhes são recarregados e, ao reabrir a modal, os novos valores são exibidos (consistência imediata).
- Integração com o fluxo de importação:
  - A modal abre automaticamente quando uma NFe válida é importada (upload XML ou import remoto) para permitir revisão imediata antes de confirmar/manifestar.

Documentar e testar o fluxo end-to-end no ambiente de QA antes do rollout em produção.

Arquivos impactados (resumo)
---------------------------
- `apps/fiscal/models_overrides.py` (novo)
- `apps/fiscal/models.py` (helpers)
- `apps/fiscal/serializers.py` (ItemNFeOverrideSerializer)
- `apps/fiscal/views_overrides.py` (ViewSet + apply action)
- `apps/fiscal/views.py` (confirmar_estoque uses effective values)
- `apps/fiscal/services.py` (apply_item_override)
- `apps/fiscal/tests/test_item_override.py`, `apps/fiscal/tests/test_override_apply.py` (tests)
- `apps/fiscal/migrations/0016_add_itemnfeoverride.py`, `0025_merge_itemnfeoverride_auto_detect.py` (migrations)

Notas para desenvolvedores
--------------------------
- Use `create_movimentacao` do módulo `apps.estoque.services` para criar ajustes e garantir atomicidade, snapshots e `ProdutoAuditoria`/`MovimentacaoStatement` consistentes.
- Ao estender/alterar a funcionalidade, siga o padrão de testes do projeto (TEST_POLICY_CORE) — criar testes P0 para o fluxo de ajuste e P1 para casos de borda.

Correções Recentes
------------------
- **Fevereiro 2026 (1)**: Corrigido bug onde salvar override no modal (`NfeEditModal`) não atualizava o painel de detalhes (`NfeDetail`) com os valores efetivos. Adicionado callback `onRefresh` no modal para forçar recarga do componente `NfeDetail` via `key` state. Testes adicionados: `NfeEditModal.test.tsx` ("calls onRefresh after saving overrides").
- **Fevereiro 2026 (2)**: Corrigido bug onde `effective_*` priorizava overrides aplicados em detrimento de overrides não aplicados mais recentes. Modificado `_get_most_relevant_override()` para retornar sempre o override mais recente, garantindo que alterações salvas apareçam imediatamente no UI, independentemente do status de aplicação.

Contato / responsáveis
----------------------
- Implementação: Equipe Fiscal / autor das mudanças
- Revisão: responsável pelo módulo Estoque (ver owners.md se disponível)

---

Documento gerado automaticamente a partir da implementação feita em Fevereiro/2026. Para dúvidas ou ajustes no fluxo, abrir issue em `project-agro` com label `fiscal` e referencia a este documento.