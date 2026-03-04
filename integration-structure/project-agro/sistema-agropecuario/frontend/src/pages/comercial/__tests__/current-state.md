# Estado Atual do Sistema
Versão: 0.1
Última atualização: 2026-01-05

## Módulos Funcionais (MVP)
- Administrativo: folha de pagamento, centros de custo, funcionários, testes automatizados, pendente apenas alertas/relatórios customizados.
- Agricultura: colheitas, movimentações, integrações, testes automatizados, pendente apenas alertas/relatórios.
- Estoque: locais de armazenagem, movimentações, auto-rateio, testes automatizados, pendente apenas alertas/relatórios.
- Máquinas: ordens de serviço, abastecimentos, testes automatizados, pendente apenas alertas/relatórios.
- Fazendas: cadastro, arrendamentos, talhões, proprietários, testes automatizados, pendente apenas alertas/relatórios.

## Módulos em Desenvolvimento
- Comercial: dashboard, contratos, vendas, clientes, relatórios. Necessita finalizar fluxo completo e expandir testes.
  - Próximos passos prioritários:
    1. Implementar **RBAC** e checagens de segurança nos endpoints (veja `docs/COMERCIAL_RBAC_AND_NEXT_STEPS.md`).
    2. Adicionar **testes unitários e de integração** para permissões e CSV export.
    3. Implementar **FE** de agregação e download CSV.
    4. Adicionar **teste E2E Playwright** para o fluxo completo.
  - Nota: @implementer execute `/exec` conforme o documento acima.
- Financeiro: despesas, rateios, aprovações, histórico, relatórios. Necessita aprimorar UI, integrações e expandir testes E2E.
- Fiscal: upload/validação de NFes, conformidade, impostos, relatórios. Necessita completar funcionalidades e expandir testes.

## Integração e Arquitetura
- APIs RESTful integradas entre módulos.
- Frontend modular com React Query, componentes e páginas específicas.
- Docker Compose para ambiente de desenvolvimento/produção.

## Testes
- Cobertura automatizada backend e frontend para todos módulos MVP.
- Testes unitários, integração e E2E em andamento para Comercial, Fiscal e Financeiro.

## Pendências Gerais
- Implementar alertas e relatórios customizados nos módulos MVP.
- Finalizar funcionalidades e expandir testes nos módulos Comercial, Fiscal e Financeiro.
- Revisar e atualizar documentação técnica e de onboarding.
- Planejar releases incrementais e adotar rotinas de revisão de código.