# Integration Structure (auto-generated)

Esta pasta contém a estrutura sugerida para a integração ZeroClaw ↔ Agrolink, baseada na documentação do projeto.

Estrutura principal:
- project-agro/: skeleton do backend Agrolink (Django)
- zeroclaw/: skeleton do agente ZeroClaw (Node.js)
- isidoro-configuration/: arquivos de configuração e memória
- frontend/chat-widget/: código do widget de chat React
- infra/: docker/k8s/bicep para deploy
- scripts/: deploy e migrações
- samples/: exemplos de payloads e fixtures
- tests/: testes de integração/contrato

Preenchimento posterior: adicionar implementações, exemplos e CI.
