# Atualização 2026-02-10 — Aplicação Síncrona de Overrides e Prevenção de Duplicação ✅

**Resumo curto:** Implementamos aplicação síncrona de `ItemNFeOverride` (sem agendamento), garantimos que `confirmar_estoque` não crie movimentações duplicadas e adicionamos testes que validam o comportamento. Esta atualização altera contratuais de API (códigos de resposta) e melhora a previsibilidade para a UI (feedback imediato).

---

## Alterações principais 🔧

- Backend:
  - `POST /api/fiscal/item-overrides/` aceitando `aplicado=true` passa a aplicar o override **síncronamente** quando a NFe já estiver confirmada (requer permissão `fiscal.apply_itemnfeoverride`).
  - `POST /api/fiscal/item-overrides/{id}/apply/` agora executa `apply_item_override` dentro da mesma transação e retorna:
    - **200** em caso de sucesso (override aplicado e movimentações/auditoria criadas)
    - **400** em caso de falha de validação/estoque insuficiente (override **não** marcado como aplicado)
    - **403** quando usuário sem permissão tenta aplicar em NFe confirmada
  - `apply_item_override` cria **sincronamente** `MovimentacaoEstoque` e `ProdutoAuditoria` (antes havia partes agendadas com `transaction.on_commit`).
  - `NFeViewSet.confirmar_estoque` passa a checar e **evitar duplicação**: se já existe uma `entrada` com `documento_referencia=nfe.chave_acesso` para o produto, não cria outra.

- Frontend:
  - Comportamento da `NfeEditModal` deve ser adaptado para esperar resposta síncrona ao aplicar uma alteração com "Aplicar também no estoque". A UI recebe feedback imediato para sucesso/falha.

- Tests:
  - Testes que esperavam comportamento agendado (HTTP 202) foram atualizados para comportamento síncrono (200/400).
  - Adicionados testes (backend) que validam idempotência de `confirmar_estoque` e aplicação síncrona de overrides.

## Impacto e Breaking changes ⚠️

- Consumidores que tratavam o response `202 apply_scheduled` devem ser atualizados para lidar com os novos códigos `200`/`400`/`403` e comportamento síncrono.
- Performance: operações que antes eram assíncronas agora são síncronas — normalmente rápidas, mas é recomendado monitorar latência em ambientes com alto tráfego.

## Testes adicionados / nomes relevantes ✅

- `apps/fiscal/tests/test_override_apply.py` — ajustado para esperar resultados síncronos
  - `test_apply_override_creates_adjustment_when_nfe_confirmed` (espera HTTP 200)
  - `test_apply_override_records_audit_for_valor_change`
  - `test_apply_override_allows_negative_stock` (espera erro 400 quando não possível)
- `apps/fiscal/tests/test_override_sync_apply.py` — novos testes para comportamento síncrono
  - `test_create_override_applies_immediately_when_nfe_confirmed_and_user_has_permission`
  - `test_create_override_returns_403_when_applying_on_confirmed_nfe_without_permission`
  - `test_apply_endpoint_applies_synchronously`

(Além disso, novos testes de divergência serão adicionados na próxima tarefa — ver seção "Próximo passo".)

## QA checklist / Como testar localmente 🧪

1. Rodar testes automáticos:
   - `cd sistema-agropecuario/backend && python manage.py test apps.fiscal.tests -k override -q`
2. Fluxo manual:
   - Criar NFe e ItemNFe
   - `POST /api/fiscal/nfes/{id}/confirmar_estoque/` → deve criar `MovimentacaoEstoque` (entrada)
   - Criar override via `POST /api/fiscal/item-overrides/` com `aplicado=true` como usuário com permissão → deve retornar 200 e atualizar `MovimentacaoEstoque`/estoque imediatamente
   - Tentar aplicar sem permissão → deve retornar 403 e não criar movimentação
   - Confirmar que repetir `POST /api/fiscal/nfes/{id}/confirmar_estoque/` não cria duplicatas

## Rollback / Plano de Mitigação 🚨

- Se for necessário reverter para comportamento agendado (temporário):
  1. Reverter commit `feat/fiscal: make apply synchronous...` na branch onde foi implementado
  2. Restaurar `transaction.on_commit` nas rotinas de criação de movimentação/auditoria
  3. Rolar a alteração no CHANGELOG e avisar times de frontend/integração

---

## Próximo passo (Test‑First): "Refletir no Estoque" (P1)

- Objetivo imediato: detectar divergências entre NFe (itens/overrides não aplicados) e Estoque, e permitir ação UI **por item** "Refletir no Estoque" que aplica **apenas** o override selecionado de forma síncrona. Não será fornecida operação de aplicar todos de uma vez; aplicação deve ser explícita por item. (Coberto por testes unitários essenciais; E2E Playwright arquivado para este fluxo.)

---

*Documento criado automaticamente na sequência das implementações do dia 2026-02-10.*
