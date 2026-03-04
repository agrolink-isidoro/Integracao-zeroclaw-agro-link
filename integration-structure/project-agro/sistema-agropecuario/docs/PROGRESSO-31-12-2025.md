```markdown
# Progresso - 31/12/2025

**Resumo da Sessão (31/12/2025)**

- Foco no backend: implementei a migração `Produto.quantidade_reservada`, adicionei tipos de movimentação (`reserva`, `liberacao`, `reversao`) e criei os serviços para `reserve` / `commit` / `release` de reservas; integrei esses serviços no `OperacaoSerializer` (reserva ao criar, commit ao marcar `concluida`, release ao cancelar).
- Também finalizei as atividades frontend (Concluir/Cancelar UI, filtros de Movimentações e testes unitários/E2E) e adicionei testes backend que verificam os fluxos de reserva/commit/liberação.

## O que foi feito

- Backend:
  - Migração aplicada: `Produto.quantidade_reservada` e campo `operacao` em `MovimentacaoEstoque`.
  - Criados tipos `reserva`, `liberacao`, `reversao` em `MovimentacaoEstoque` e `MovimentacaoStatement`.
  - Implementados serviços:
    - `reserve_operacao_stock(operacao, criado_por)`
    - `commit_reservations_for_operacao(operacao, criado_por)`
    - `release_reservations_for_operacao(operacao, criado_por)`
  - Integração: `OperacaoSerializer.create` chama `reserve_operacao_stock`; `update` chama `commit`/`release` com base em mudança de status.
  - Testes unitários e de integração adicionados para garantir comportamento correto (apps.estoque + apps.agricultura tests passing locally).

- Frontend:
  - Botões **Concluir**/**Cancelar** implementados em `OperacoesList.tsx` e `OperacaoDetalhes.tsx` com confirmações.
  - `Movimentacoes` UI: adicionado filtro `Origem` e opção `Reserva` em `Tipo`; coluna Origem exibida.
  - Testes: adicionado teste unitário para `OperacoesList` e E2E Playwright para fluxo de conclusão (mocked); testes locais executados.

## Pendências / Próximos passos

- Ajustar E2E para rodar contra backend real (configurar ambiente / servidores antes de executar).
- Integrar reservas para Ordens de Serviço e Abastecimentos (planejar e executar). 
- Melhorar modal de confirmação ao concluir operação (mostrar impacto no estoque; require explicit confirmation text).
- Atualizar documentação do usuário e guias de operação com o novo fluxo de reservas.

**Autor:** GitHub Copilot
**Data:** 31/12/2025

```