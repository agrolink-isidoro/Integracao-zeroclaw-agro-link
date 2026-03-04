# Project Name
## Como Trabalhar com os Agentes
- Invoque no chat: `@architect /plan [feature]` — solicita planejamento da feature.
- Comandos disponíveis:
  - `/plan <feature>` → `@architect, planeja essa feature: <feature>`
  - `/exec` → `@architect, executa o plano aprovado`
  - `/next` → `próximo agente, continua` (handoff)
  - `/ask <pergunta>` → `pergunta isso pro agente: <pergunta>`
- Agents leem docs/ – preencha lá, incluindo `docs/best-practices.md` para OWASP, Clean Code, DevSecOps, etc.
- Use `/next` para prosseguir o loop.
- Para rodar um agente em background (sem selecionar manualmente), use o comando de runtime no chat: `@architect /start` — o runner interpreta o `run:` do agente e inicia o serviço. Em ambiente local você pode usar o runner: `python scripts/agents_runner.py start architect --yes`.