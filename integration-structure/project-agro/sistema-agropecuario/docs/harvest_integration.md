Resumo da integração de Colheita / Movimentação de Carga

- Corrigi referência ao `estoque.LocalArmazenamento` (antes escrito `LocalArmazenagem`).
- Para permitir referência a empresa/contrato no momento da movimentação de carga, adicionei um modelo minimal `comercial.Empresa` como placeholder.
  - Observação: este modelo é propositalmente simples — o `Empresa` pode ser estendido ou substituído pela modelagem definitiva que você preferir.
  - O campo `MovimentacaoCarga.empresa_destino` é **opcional** (nullable). Quando a `comercial.Empresa` for ampliada, não deve ser necessário ajustar os dados históricos.
- Se preferir outra abordagem (ex: `empresa_destino` como texto livre, ou FK para outro modelo existente), eu posso adaptar rapidamente.

Próximos passos:
- Implementar os modais frontend para "Iniciar Sessão de Colheita" e "Movimentação de Carga" e adicionar E2E Playwright que valida o fluxo onde uma sessão é finalizada quando todos os talhões são carregados.

Status desta implementação:
- **Frontend**: adicionados os componentes `StartHarvestSessionModal` e `MovimentacaoCargaModal` em `frontend/src/pages/agricultura/`.
- **E2E**: adicionado teste Playwright `frontend/tests/e2e/harvest_session.spec.ts` que cria uma sessão e registra uma movimentação de carga, validando o cálculo de `peso_liquido` e a atualização do status do item/sessão.
- **Ajustes pós-reconciliação**: implementado endpoint `POST /api/agricultura/movimentacoes-carga/{id}/adjust/` que aplica ajustes auditáveis sobre uma movimentação de carga previamente reconciliada.
  - Payload esperado: `{ "new_quantity": 123.45, "reason": "ajuste por umidade" }`.
  - Comportamento:
    - Cria uma `MovimentacaoEstoque` de compensação (tipo `entrada` se o ajuste aumentar a quantidade, `saida` se reduzir).
    - Atualiza o campo `MovimentacaoCarga.peso_liquido` para o valor confirmado `new_quantity`.
    - Atualiza `Lote.quantidade_atual` para refletir o novo total confirmado (isto garante o saldo final consistente e facilita reconciliações futuras).
  - Rationale: registros de ajuste são adicionados como movimentações de estoque separadas para preservar o histórico e permitir auditoria completa.
- Observação: o teste de ajuste E2E foi adicionado em `frontend/tests/e2e/adjust_flow.spec.ts` e valida tanto aumentos quanto reduções de quantidade.
- Observação: o teste é seguro para ambientes sem *plantios* (ele detecta e pula se não houver dados de safra disponíveis).
