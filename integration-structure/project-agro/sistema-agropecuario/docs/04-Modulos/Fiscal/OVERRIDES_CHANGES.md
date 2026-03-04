# Histórico de alterações — ItemNFeOverride & Fluxo de aplicação (Resumo)

Última atualização: 2026-02-09

## 1) Resumo das alterações aplicadas (implementação e fixes)

- **Backend**
  - `apps/fiscal/services/overrides.py`
    - Implementado `apply_item_override(override, user, force=False)` para criar movimentações de ajuste (entrada/saída) e registros de `ProdutoAuditoria` quando necessário.
    - Adicionados logs debug (prints/diagnósticos) para investigar inconsistências de visibilidade após commit.
    - Implementado agendamento via `transaction.on_commit` para criação de movimentos/auditorias em alguns pontos durante a investigação (mais tarde alterado parcialmente durante iterações).
    - Ajustes: registro de `origem='nfe-override-apply'` em auditorias e fallback de logs para falhas.

  - `apps/fiscal/views_overrides.py`
    - `ItemNFeOverrideViewSet` com endpoints CRUD para `ItemNFeOverride` e ação `POST /api/fiscal/item-overrides/{id}/apply/`.
    - `apply` inicialmente executava apply síncrono; mudou para agendado via `transaction.on_commit` para resolver problemas de visibilidade, e incluiu fluxo de notificação em caso de falha no on_commit.
    - Controle de permissões: ao aplicar override em NFe confirmada, requer permissão `fiscal.apply_itemnfeoverride`.

  - `apps/fiscal/views.py` (`NFeViewSet.confirmar_estoque`)
    - Quando NFe já confirmada, reconfirma aplica overrides ativos (chama `apply_item_override`).
    - `confirmar_estoque` utiliza `item.effective_*()` para criar as movimentações iniciais.

  - `apps/fiscal/serializers.py`
    - `ItemNFESerializer` formata `effective_valor_unitario` com exatamente 2 casas decimais (string) para estabilidade na UI.
    - `ItemNFeOverrideSerializer` valida e força `valor_unitario` para 2 casas decimais ao salvar.

- **Tests (backend)**
  - `apps/fiscal/tests/*`
    - Adicionados/ajustados testes de overrides e confirmação de estoque.
    - `test_override_apply.py` acabou sendo atualizado para `TransactionTestCase` e recebeu testes que cobrem o novo comportamento (aplicação agendada, falha gerando `Notificacao`).

- **Frontend**
  - `frontend/src/components/fiscal/NfeEditModal.tsx`
    - Modal de edição dos valores da NFe criada/ajustada para carregar `effective_*` do backend.
    - Checkbox `Aplicar também no estoque` (envia `aplicado=true` no payload quando marcado).
    - Implementado fallback: se API retornar 403 ao tentar aplicar em NFe confirmada, cria override com `aplicado=false` e mostra mensagem amigável.

  - `frontend/src/services/fiscal.ts`
    - Funções `getNfe`, `createItemOverride`, `confirmarEstoque` já expostas e usadas pela modal.

- **Notificações**
  - Ao detectar falha na aplicação agendada (on_commit), o backend cria um registro de `Notificacao` para o usuário solicitante (ou para superusers como fallback).

## 2) Observações técnicas e motivos das alterações

- A aplicação foi inicialmente projetada como síncrona: marcar `aplicado` e criar ajustes imediatamente. Durante os testes encontramos questões de visibilidade (movimentação aparentava ter sido criada porém não era encontrada por consultas subsequentes no mesmo escopo de transação), o que nos levou a experimentar `transaction.on_commit` para garantir visibilidade pós-commit.
- Para debugar e garantir rastreabilidade criamos logs e um mecanismo de notificação para falhas no on_commit.
- Decisão atual do usuário: deseja que a aplicação seja síncrona e que a modal monitore divergências entre NFe e Estoque para exibir botão "Refletir no Estoque". Isso será implementado conforme lista de tarefas.

## 3) Lista de tarefas (com checkboxes para acompanhamento)

### Concluídos ✅
- [x] Implementar modelo `ItemNFeOverride` e CRUD básico.
- [x] Implementar `apply_item_override` (serviço) que cria movimentações de ajuste e auditoria.
- [x] Adicionar endpoint `POST /api/fiscal/item-overrides/{id}/apply/` para aplicar override.
- [x] Adicionar `NfeEditModal` no frontend e conectar a APIs (`getNfe`, `createItemOverride`).
- [x] Tratar 403 no frontend: criar override sem aplicar e mostrar mensagem.
- [x] Adicionar logs e debug em `apply_item_override` para investigar persistência.
- [x] Implementar notificação (`Notificacao`) para falhas de aplicação agendada (on_commit) e testes que validam isso.
- [x] Converter/ajustar testes relevantes para `TransactionTestCase` quando necessário.

---

## Sessão 2026-02-10 — Fixes finais, testes e documentação 🧾

**Resumo técnico:** Durante esta sessão corrigimos um bug crítico de UX/consistência: alterações salvas na modal da NFe **devem** aparecer imediatamente na própria NFe (`effective_*`), enquanto a aplicação aos módulos externos (Ex.: Estoque) só deve ocorrer quando o usuário **explicitamente** clicar em **Refletir no Estoque**. Também simplificamos a mensagem de confirmação exibida ao salvar em NFes confirmadas e garantimos que a UI recarregue a NFe após salvar para mostrar os valores persistidos.

**O que foi feito (arquivos principais):**
- Backend
  - `apps/fiscal/models.py` — `_get_most_relevant_override()` e `get_active_override()` ajustados para garantir que a NFe mostre **o último override salvo** (aplicado > último salvo) e compatibilidade de método.
  - `apps/fiscal/views.py` — `confirmar_estoque` atualizado para:
    - usar valores atuais da NFe ao criar ou ajustar `MovimentacaoEstoque`;
    - atualizar movimentação existente quando houver um override aplicado e ajustar `Produto.quantidade_estoque` de forma consistente;
    - proteger contra valores None em saldos e quantidades.
  - `apps/fiscal/views_overrides.py` — fluxo de `perform_create`/`apply` manteve comportamento de aplicar sincronamente com guards de permissão e notificações em falhas.
- Frontend
  - `frontend/src/components/fiscal/NfeEditModal.tsx` — remoção da aplicação automática ao salvar; salvar cria override não-aplicado (`aplicado=false`) e recarrega a NFe. Implementado comportamento de **Refletir no Estoque** por-item (create+apply ou apply de override existente) com feedback síncrono e tratamento de 403.
- Tests
  - Backend: `apps/fiscal/tests/test_item_override_api_unapplied.py` ajustado para validar que salvar atualiza a NFe (effective values).
  - Frontend: `frontend/src/__tests__/NfeEditModal.test.tsx` atualizado para validar:
    - salvar atualiza NFe (re-fetch) e mostra valores salvos;
    - fluxo de reflect (aplicação síncrona) e tratamento de 403;
    - confirmação simples ao salvar em NFes confirmadas.
- Docs
  - `docs/04-Modulos/Fiscal/OVERRIDES_CHANGES.md` (esta página) atualizada com detalhes desta sessão.
  - `docs/04-Modulos/Fiscal/OVERRIDES_2026-02-10.md` atualizado anteriormente para refletir comportamento síncrono de apply e prevenção de duplicação.

**Testes e comandos usados durante a sessão:**
- Backend (containers):
  - `docker compose up -d --build backend db redis frontend`
  - `docker compose exec -T backend python -m pytest apps/fiscal/tests -k override -q` ✅ (20 passed for override suite)
  - `docker compose exec -T backend python -m pytest apps/fiscal/tests/test_item_override_api_unapplied.py -q` ✅
- Frontend (container):
  - `docker compose exec -T frontend npm test -- -t NfeEditModal --runInBand` ✅ (NfeEditModal tests passed)

**Commits e branch:**
- Branch usada: `feat/fiscal/integacao-modulos`
- Commits relevantes (resumo):
  - `fix(fiscal): do not let unapplied overrides change NFe effective values; update tests` (nota: revertido parcialmente — comportamento restaurado para salvar visível na NFe)
  - `fix(fiscal): restore UI behavior — saved overrides update NFe effective values; update tests and docs`
  - `fix(fiscal): add get_active_override compatibility method to ItemNFe`
  - `fix(fiscal): when confirming estoque update existing movimento to reflect applied override and adjust product stock`
  - `fix(fiscal): guard None values when updating existing movimentacao during confirmar_estoque`
- PR: ainda não aberto — aguardo sua autorização para abrir PR com o resumo e checklist de QA.

**E2E Playwright:** teste Playwright original para o fluxo `refletir` foi instável e resultou em autenticações 401; por decisão e orientação do usuário, o teste foi arquivado em `frontend/tests/e2e/archived/refletir.spec.ts` e substituído por testes unitários essenciais.

**QA Manual (passo a passo):**
1. Criar NFe com item (quantidade 10, valor_unitario 9.00).
2. Abrir `NfeEditModal`, alterar quantidade para 7 e clicar Salvar.
3. Confirmar: `GET /api/fiscal/nfes/{id}/` deve retornar `itens[0].effective_quantidade == '7.0000'`.
4. Sem clicar em Refletir, `MovimentacaoEstoque` para a NFe **não** deve ter sido criada/ajustada.
5. Ao clicar `Refletir no Estoque` por item (aplicação síncrona), verificar criação/ajuste de `MovimentacaoEstoque` e atualização de `Produto.quantidade_estoque`.

Se desejar, faço um PR com descrição detalhada, links para testes adicionados e checklist de QA. 👍

### Pendentes / Prioridade e sequência (P0 / P1 / P2)

> Observação: as tarefas abaixo estão ordenadas por prioridade, considerando pré‑requisitos e a necessidade de garantir testes primeiro (Test‑First).

#### P0 — Crítico (implementar primeiro)
- [ ] Implementar testes backend (Test‑First) que validem comportamento síncrono:
  - [ ] POST `/api/fiscal/item-overrides/` com `aplicado=true` em NFe confirmada por usuário com permissão → deve aplicar ajustes **síncronamente**, criar `MovimentacaoEstoque` e atualizar `Produto.quantidade_estoque`.
  - [ ] POST `/api/fiscal/item-overrides/` com `aplicado=true` em NFe confirmada por usuário **sem** permissão → deve retornar 403 e não aplicar.
  - [ ] POST `/api/fiscal/item-overrides/{id}/apply/` aplica sincronamente e retorna 200 (ou 400 em caso de validação/estoque insuficiente).
- [ ] Tornar a aplicação de overrides **síncrona** no backend:
  - [ ] Remover/ajustar `transaction.on_commit` onde atrapalha o fluxo síncrono.
  - [ ] Executar `apply_item_override` dentro do request de forma atômica (`transaction.atomic()`), marcando `aplicado=True` **apenas** após sucesso da movimentação.
  - [ ] Garantir rollback e mensagens de erro HTTP apropriadas (400 para validação, 403 para permissão).
- [ ] Testes de regressão: rodar e ajustar a suíte backend para confirmar que não há quebras.

#### P1 — Necessário (após P0 estável)
- [x] Frontend: **detectar divergência** entre NFe (effective) e Estoque por item na `NfeEditModal`:
  - [x] Incluir lookup de produto (ex.: `GET /api/estoque/produtos/?search=<codigo_produto>`) e armazenar `quantidade_estoque`.
  - [x] Mostrar indicador "Diverge do Estoque" quando detectar diferença (regras: quantidade exata, sem tolerância por agora).
- [x] Frontend: **botão "Refletir no Estoque"** (por item somente):
  - [x] Ao clicar, aplicar **um** override **específico** (`aplicado=true`) de forma **síncrona**; aguardar resultado e re‑fetch de NFe e produto para refletir mudanças.
  - [x] Tratar 403 (mostrar mensagem e fallback para criar override sem aplicar automaticamente).
  - [x] Testes frontend (Jest / RTL) cobrindo fluxo de divergência e ação de refletir; mocks para APIs e assert de UI comportamental (tests added).
**Comportamento importante (especificação clara):**
- Ao **Salvar** na modal da NFe (sem usar qualquer ação de "Refletir"), **os novos valores devem aparecer na própria Nota Fiscal** (API `GET /api/fiscal/nfes/{id}/` deve refletir as alterações via `effective_*`).
- **Salvar não deve** alterar o Estoque, Financeiro ou quaisquer sistemas externos. Somente uma ação explícita de **Refletir no Estoque** aplicará as mudanças a esses módulos.
- Quando uma NFe for confirmada (`confirmar_estoque`), o sistema deve usar os valores atuais da NFe (que incluem overrides salvos) para criar as movimentações iniciais.
- [x] Testes unitários essenciais (backend + frontend) adicionados; E2E Playwright não é necessário para este fluxo (arquivado).

#### P2 — Desejável / Observabilidade & Docs (após P1)
- [ ] UX: melhorar lista/toast de `Notificacao` para falhas de apply; integrar leitura em UI (toast + link para inbox).
- [ ] Observabilidade: métricas/contadores para falhas de apply, latência, contagem de overrides aplicados.
- [ ] Atualizar documentação detalhada e CHANGELOG com a política final (aplicação síncrona, permissões e códigos de resposta).

---

> Nota técnica: garanta que os testes backend cruciais sejam escritos antes da alteração do código (Test‑First). Assegure validações e limites de campos (ex.: comprimento de `origem`/`documento_referencia`) para evitar erros de DB durante aplicação automática.

## 4) Instruções para desenvolvedores / como reproduzir localmente

- Rodar testes relevantes:
  - Backend: `docker compose exec -T backend python -m pytest apps/fiscal/tests -q -k override` (ou `python manage.py test apps.fiscal.tests.test_override_apply` para testes específicos)
  - Frontend: `pnpm test` (ou `npm test` conforme seu setup)
- Repetir fluxo manual:
  - Criar NFe (upload XML ou via fixtures), `POST /api/fiscal/nfes/{id}/confirmar_estoque/` → verifica `MovimentacaoEstoque`.
  - Abrir modal na UI, editar valor e marcar `Aplicar também no estoque` → salvar.
  - Verificar que override criado/aplicado (ou fallback se 403) e que `MovimentacaoEstoque` é criado quando aplicável.

## 5) Correção de Cache — 2026-02-11

### Problema identificado
Após aplicar override fiscal via "Refletir no Estoque", o usuário via valores incorretos na interface (ex: 126.00 aparecia como 250.00).

### Root Cause
- Backend funcionava corretamente (produto.custo_unitario atualizado para 126.00)
- API retornava valor correto (126.00)
- Problema: Cache React Query não era invalidado para queries com filtros

### Queries afetadas
```tsx
// Query original
queryKey: ['produtos', JSON.stringify(filters)]

// Invalidação incorreta (não afetava queries filtradas)
queryClient.invalidateQueries({ queryKey: ['produtos'] });
```

### Correção aplicada
```tsx
// Correção: invalidar todas as queries que começam com 'produtos'
queryClient.invalidateQueries({ queryKey: ['produtos'], exact: false });
```

**Arquivos corrigidos:**
- `frontend/src/components/fiscal/NfeEditModal.tsx` (linha 214)
- `frontend/src/components/estoque/ProdutosList.tsx` (linha 61)

### Verificação
- Override ID=30 (126.00) aplicado corretamente
- Produto CALC001 custo atualizado para 126.00
- API retorna 126.00
- Interface agora mostra valor correto após aplicação

**Referência:** `docs/FISCAL_OVERRIDE_CACHE_FIX.md`
