---
title: ImportError: No module named 'apps.financeiro.services.models' on vencimentos/quitar endpoint
labels: bug, backend, finance
assignees: []
---

## Resumo
Ao chamar o endpoint `POST /api/financeiro/vencimentos/{id}/quitar/` a API retorna erro:

```json
{"error":"No module named 'apps.financeiro.services.models'"}
```

## Como reproduzir
1. Startar serviços: `./start-servers.sh` (backend disponível em http://localhost:8001)
2. Autenticar: `POST /api/auth/login/` (admin/admin123)
3. Criar um vencimento: `POST /api/financeiro/vencimentos/` (body mínimo)
4. Chamar: `POST /api/financeiro/vencimentos/{id}/quitar/` com `{ "valor_pago": "100.00" }`

Resposta: HTTP 400 com o payload acima.

## Logs relevantes / Traceback
Trecho do traceback (extraído de `docker compose logs backend` e de execução via `manage.py shell`):

```
ModuleNotFoundError: No module named 'apps.financeiro.services.models'
  File "/app/backend/apps/financeiro/services/financeiro_services.py", line 862, in quitar_vencimento
    from .models import LancamentoFinanceiro, ContaBancaria
```

## Causa provável
Uma importação relativa incorreta dentro de `apps.financeiro.services.financeiro_services`: a instrução `from .models import LancamentoFinanceiro, ContaBancaria` quando executada no contexto do package `apps.financeiro.services` tenta resolver `apps.financeiro.services.models` (módulo inexistente) em vez de `apps.financeiro.models`.

## Sugestão de correção (proposta)
Corrigir a importação para apontar ao módulo correto:

- Trocar `from .models import LancamentoFinanceiro, ContaBancaria`
- Por `from ..models import LancamentoFinanceiro, ContaBancaria`

Adicionalmente, adicionar um teste unitário que invoque `quitar_vencimento` em um `Vencimento` e verifique a criação do `LancamentoFinanceiro` e idempotência quando chamado novamente.

## Checklist / To-Do ✅
- [ ] Criar issue (este arquivo) — feito
- [ ] Confirmar reprodução local com curl / manage.py shell — feito (logs anexados)
- [ ] Criar branch `fix/financeiro-quitar-import` (aguardando autorização do revisor)
- [ ] Implementar correção de import (1 linha)
- [ ] Adicionar teste unitário cobrindo `quitar_vencimento` (inclui caso idempotente)
- [ ] Rodar testes unitários e executar quick E2E focado no fluxo financeiro
- [ ] Abrir PR descrevendo mudança, linkar essa issue, e marcar reviewers
- [ ] Merged + monitorar Playwright E2E runs para confirmar finanças funcionando

## Observações
- Não modifiquei código neste rascunho; se autorizar eu abro a branch e submeto um PR com a correção mínima e o teste.
- Artefatos e traces estão em `/tmp/playwright/results/.../trace.zip` e logs de backend podem ser obtidos via `docker compose logs backend`.

Cc: @maintainers
