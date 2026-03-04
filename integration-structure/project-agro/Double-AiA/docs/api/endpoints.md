# Endpoints Principais da API

Este documento lista os principais endpoints RESTful do sistema agropecuário, organizados por módulo.

## Fazendas
- `/api/fazendas/fazendas/` (CRUD fazendas)
- `/api/fazendas/areas/` (CRUD áreas)
- `/api/fazendas/talhoes/` (CRUD talhões)
- `/api/fazendas/arrendamentos/` (CRUD arrendamentos)

## Agrícola
- `/api/agricola/ordens-servico/` (CRUD ordens de serviço)
- `/api/agricola/lavouras/` (CRUD lavouras)
- `/api/agricola/culturas/` (CRUD culturas)
- `/api/agricola/produtos/` (cálculo produtividade)
- `/api/agricola/safra-plano/` (IA, WebSockets)

## Estoque
- `/api/estoque/insumos/` (CRUD insumos)
- `/api/estoque/notas/` (CRUD notas fiscais, nfelib)
- `/api/estoque/subestoques/` (CRUD subestoques)
- `/api/estoque/baixas/` (CRUD baixas)
- `/api/estoque/emprestimos/` (CRUD empréstimos)
- `/api/estoque/alertas/` (GET alertas Celery)
- `/api/estoque/locais-armazenagem/` (CRUD locais)
- `/api/estoque/graos-armazenados/` (GET resumo grãos)

## Administrativo
- `/api/administrativo/centros-custo/` (CRUD centros de custo)
- `/api/administrativo/funcionarios/` (CRUD funcionários)

## Máquinas
- `/api/maquinas/maquinas/` (CRUD máquinas)
- `/api/maquinas/abastecimentos/` (CRUD abastecimentos)
- `/api/maquinas/manutencoes/` (CRUD manutenções)
- `/api/maquinas/implementos/` (CRUD implementos)

## Comercial
- `/api/comercial/vendas/` (CRUD vendas)
- `/api/comercial/compras/` (CRUD compras)
- `/api/comercial/notas/` (CRUD notas fiscais)
- `/api/comercial/dashboard/` (GET dashboards)

## Fiscal
- `/api/fiscal/notas/` (CRUD notas fiscais)
- `/api/fiscal/manifestacoes/` (CRUD manifestações)
- `/api/fiscal/estornos/` (CRUD estornos)
- `/api/fiscal/sincronizacao/` (GET sincronização SEFAZ)

## Financeiro
- `/api/financeiro/fluxo-caixa/` (GET previsão fluxo de caixa)
- `/api/financeiro/financiamentos/` (CRUD financiamentos)
- `/api/financeiro/contratos/` (CRUD contratos)
- `/api/financeiro/vencimentos/` (CRUD vencimentos)
