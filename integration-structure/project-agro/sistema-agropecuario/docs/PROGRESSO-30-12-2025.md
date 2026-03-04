```markdown
# Progresso - 30/12/2025

**Resumo da Sessão (30/12/2025)**

- Atualizei o plano de execução detalhado para incluir o workflow de **reserva/commit de estoque** (reservar ao criar operação, consumir ao finalizar), a ampliação do livro de **Movimentações** (reservas, entradas, saídas, reversões) e os botões de ação na UI (`<Cancelar> <Editar> <Concluir>`).

## O que foi feito

- Editei `docs/PLANO_EXECUCAO_DETALHADO.md` para descrever o **workflow de reserva/commit** (reservar ao criar, consumir ao concluir): migração `Produto.quantidade_reservada`, novo tipo `reserva` em `MovimentacaoEstoque` e serviços `reserve`/`commit`/`release`.
- Adicionei itens de trabalho para a **UI**: inserir botões `<Cancelar> <Editar> <Concluir>` em `OperacoesList.tsx` / `OperacaoDetalhes.tsx` com confirmações e integração ao commit/release.
- Atualizei o escopo do **Livro de Movimentações** para exibir reservas, entradas, saídas, reversões e vincular eventos a `Operacao`/`OrdemServico`/`Abastecimento` com filtros por origem.
- Salvei o documento (`docs/PLANO_EXECUCAO_DETALHADO.md`) e atualizei a data de última modificação para **30/12/2025**.
- Verifiquei o estado do repositório, criei `docs/PROGRESSO-30-12-2025.md`, e commit/push das mudanças (commit: `5957545`, branch `main`).
- Confirmei que não havia outras alterações não commitadas antes do push.

## Pendências imediatas

- Implementar migração para `quantidade_reservada` e criar testes unitários (2-3 dias estimados).
- Implementar os serviços de reserva/commit e integrar ao `OperacaoSerializer` (1-2 dias backend + 1 dia frontend).
- Adicionar botões `<Cancelar> <Editar> <Concluir>` e modais de confirmação na UI; ligar ações a commit/release (1-2 dias).
- Atualizar `MovimentacaoEstoquesList.tsx` para exibir reservas e permitir filtros por origem (1 dia).

## Detalhes técnicos e decisões tomadas hoje

- Decisão de design: adotar o **fluxo de reserva ao criar Operação e commit ao concluir** (não permitir estoque negativo). Esta abordagem foi documentada no plano e será seguida na implementação.
- Base técnica: reutilizar `create_movimentacao` em `apps/estoque/services.py` como base para `reserve`/`commit`/`release` para garantir atomicidade e auditoria.
- Testes: backend unitários para validar contagens de `quantidade_reservada` e bloquear criação quando insuficiente; testes de integração para o fluxo completo (create → reserve → commit).

## Metadados de versão

- Commit gerado: `5957545` — "docs: update execution plan (reservation/commit) and add progress note 30-12-2025"
- Branch: `main`
- Push: origin/main updated (local -> remote)

**Autor:** GitHub Copilot
**Data:** 30/12/2025

**Autor:** GitHub Copilot
**Data:** 30/12/2025

```