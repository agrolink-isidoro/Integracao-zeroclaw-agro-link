# Manual prático para uso dos agentes de IA autônomos/background (versão 2026)

Este guia resume como acionar, monitorar e automatizar agentes de IA no projeto, tanto via comandos de chat quanto por scripts/sistema.

## 1. Conceito geral
- Cada agente (ex: architect, implementer, tester, reviewer) é um serviço autônomo, capaz de rodar em background.
- Os agentes são acionados por comandos padronizados (slash commands) no chat ou por scripts automatizados.
- Toda a configuração de automação está documentada nos arquivos `.agent.md` e `.github/Agents/automation.md`.

## 2. Comandos principais (chat ou terminal)
- `@architect /plan <feature>` — Planeja uma nova feature.
- `@implementer /exec` — Executa o plano aprovado.
- `@tester /next` — Passa para o próximo agente.
- `@reviewer /ask <pergunta>` — Encaminha dúvida para outro agente.
- `@<agente> /start` — Inicia o agente em background.
- `@<agente> /stop` — Para o agente.
- `@<agente> /status` — Mostra status (running/stopped).

## 3. Automação e background
- Cada agente tem um bloco `run:` YAML no seu `.agent.md` com instruções para automação (start_command, health_check, etc).
- O script `scripts/agents_runner.py` permite listar, iniciar, parar e checar status dos agentes:
  - Listar: `python3 scripts/agents_runner.py list`
  - Status: `python3 scripts/agents_runner.py status architect`
  - Iniciar: `python3 scripts/agents_runner.py start architect --yes`
  - Parar: `python3 scripts/agents_runner.py stop architect`
- O runner usa health-check HTTP ou status do sistema para garantir que o agente está rodando.

## 4. Webhook e integração com chat
- O webhook (`scripts/agents_webhook.py`) permite acionar agentes via comandos do chat (Slack, Teams, etc).
- Configure o segredo `AGENTS_WEBHOOK_SECRET` e rode:  
  `python3 scripts/agents_webhook.py`
- Envie comandos como `@architect /start` para o endpoint `/webhook` com o header `X-Agents-Secret`.

## 5. Produção: systemd
- Use o template `.github/Agents/systemd/agent@.service.example` para rodar agentes como serviços systemd.
- Instale com o helper:  
  `scripts/install_agent_service.sh architect`
- Gerencie com:  
  `sudo systemctl status architect-agent`  
  `sudo systemctl stop architect-agent`  
  `sudo systemctl start architect-agent`

## 6. Boas práticas
- Sempre use comandos padronizados para automação.
- Prefira `/start` e `/stop` para evitar múltiplas instâncias.
- Use `/status` para checar se o agente está rodando antes de acionar tarefas.
- Consulte `.github/Agents/automation.md` para detalhes e troubleshooting.

## 7. Onde encontrar exemplos e instruções
- `.github/Agents/automation.md` — Guia completo de automação, systemd, webhook.- `docs/PROJETO_ESTRUTURA.md` — **OBRIGATÓRIO:** Estrutura correta do projeto para evitar duplicações.
- `docs/current-state.md` — Status atual do sistema e módulos implementados.

## 8. ATENÇÃO: Estrutura do Projeto

**⚠️ IMPORTANTE:** Antes de criar qualquer tarefa ou executar comandos, consulte `docs/PROJETO_ESTRUTURA.md`.

**Estrutura correta:**
```
/home/felip/projeto-agro/
└── sistema-agropecuario/  ← TRABALHE AQUI!
    ├── backend/           ← Django
    └── frontend/          ← React
```

**NUNCA crie pastas no root como:**
- ❌ `/home/felip/projeto-agro/backend/`
- ❌ `/home/felip/projeto-agro/frontend/`
- ❌ `/home/felip/projeto-agro/project-agro/`

Veja detalhes completos em `docs/PROJETO_ESTRUTURA.md`.- `.github/Agents/commands.md` — Tabela de comandos suportados.
- Cada `.agent.md` — Bloco `run:` e exemplos de uso.

Salve este manual e consulte sempre que precisar relembrar como acionar, monitorar ou automatizar os agentes de IA do projeto!
