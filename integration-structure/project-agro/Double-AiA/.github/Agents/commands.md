# Commands specification

This document centralizes the slash commands supported by agents and their mappings.

| Command | Generated Value | Agent target | Permissions | Example invocation | Notes |
|---|---|---|---|---|---|
| `/plan <feature>` | `@architect, planeja essa feature: <feature>` | architect | any user (recommend: product/PO) | `@architect /plan nova integração de pagamentos` | Triggers planning flow; should create tasks and handoff. |
| `/exec` | `@architect, executa o plano aprovado` | architect / implementer | authorized (implementer/ops) | `@implementer /exec` | Triggers execution of approved plan; validate approvals first. |
| `/next` | `próximo agente, continua` | flow control | any user | `@tester /next` | Handoff signal to continue pipeline to next agent. |
| `/ask <pergunta>` | `pergunta isso pro agente: <pergunta>` | any (targeted) | any user | `@implementer /ask Precisa de mais contexto?` | Used for clarifications; agent should route to best recipient. |

**Notes & Guidelines**
- Keep commands idempotent where possible.
- Validate arguments (for example `/plan` must have non-empty `<feature>`).
- Enforce permissions for `/exec` to avoid unauthorized runs.
- Add logging/audit trail for commands executed.
