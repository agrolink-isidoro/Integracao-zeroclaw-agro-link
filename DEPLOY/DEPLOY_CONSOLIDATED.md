# Resumo Consolidado de Deploy — Projeto Agro Link

Objetivo
- Consolidar instruções, arquitetura e checklist de deploy existentes na pasta `DEPLOY/` para referência rápida de operações e implantação.

Visão Geral da Arquitetura
- Infraestrutura: Google Cloud Platform (GCP). Serviços-chave: GKE / Cloud Run (variável entre docs), Cloud SQL (Postgres/PostGIS), Cloud Storage, Pub/Sub para eventos, Secret Manager.
- Multitenancy: arquitetura com isolamento por tenant (dois domínios suportados em algumas configurações), rotas e validações aplicadas no backend.
- Componentes:
  - Backend: Django + DRF, dependência em PostGIS/GEOS/GDAL para geodados.
  - Frontend: React + Vite, Playwright para E2E.
  - Serviços auxiliares: Workers / Celery (ou tasks), integrações WhatsApp/Notificações, jobs de importação (KML).

Resumo das Integrações Importantes
- WhatsApp: suporte para dois domínios/instâncias; preservar isolamento de mensagens e webhooks; configurar chaves e rotas HTTPS; revisar ARQUITETURA_WHATSAPP_2DOMINIOS.md.
- Google Cloud: executar `gcp-setup.sh` (quando aplicável) e seguir `GOOGLE_CLOUD_SETUP.md` para IAM, APIs e provisionamento de recursos.
- KML / Geodados: backend exige GDAL/GEOS instalados no ambiente; ver `DEPLOY/` e `ADR.md` para restrições de imagens Docker.

Checklist Rápido de Pré-Deploy (ambiente local / CI)
- [ ] Node + npm instalados para frontend.
- [ ] Executar `npm ci` e `npx tsc --noEmit` no frontend.
- [ ] Executar `pip install -r requirements.txt` no backend e garantir dependências nativas (gdal, geos) ou usar imagem base com suporte.
- [ ] Migrar banco: `python manage.py migrate` (ver backups antes).
- [ ] Secrets: provisionar segredos em Secret Manager e configurar variáveis de ambiente no CI/CD.
- [ ] Playwright: instalar browsers em CI com `npx playwright install --with-deps` se E2E for executado.

Checklist de Deploy em GCP
- [ ] Projetos e Billing configurados.
- [ ] APIs habilitadas (Cloud Run, Cloud SQL, IAM, Secret Manager, etc.).
- [ ] Criar/atualizar imagens Docker e armazenar em Artifact Registry.
- [ ] Configurar serviços (Cloud Run / GKE) com variáveis de ambiente e acesso a Cloud SQL (conector ou privado).
- [ ] Testar health checks e readiness probes.

Custos e Observações Operacionais
- Principais custos: Cloud SQL (CPU/Storage), GKE/Cloud Run (CPU/Memory), Cloud Storage, tráfego de rede e serviços de integração (WhatsApp provider).
- Recomenda-se sizing incremental e monitoramento (Stackdriver/Cloud Monitoring) antes de escalonamento.

Problemas Conhecidos e Boas Práticas
- Playwright requer instalação explícita de navegadores em runners/containers.
- Ambientes de build devem incluir toolchain nativo para GDAL/GEOS se builds que geram wheel nativo forem necessários.
- Incluir `npx playwright install` e `npx tsc --noEmit` nos pipelines para garantir verificações E2E/TS.

Procedimentos de Recuperação / Rollback
- Manter backups automáticos do Cloud SQL e snapshots antes de alterações de esquema.
- Versionar imagens Docker e permitir rollback para tags anteriores.

Links e Referências (na pasta DEPLOY)
- Arquitetura detalhada, scripts e checklists estão distribuídos em vários MDs dentro de `DEPLOY/` (ex.: `GOOGLE_CLOUD_SETUP.md`, `CHECKLIST_IMPLEMENTACAO_MVP.md`, `ARQUITETURA_WHATSAPP_2DOMINIOS.md`, `00-LEIA-PRIMEIRO.md`).

Próximos Passos Sugeridos
- Adicionar um job CI que instala Node, roda `npx tsc --noEmit` e executa `npx playwright install` antes dos testes.
- Atualizar Dockerfile de build/runner para incluir dependências nativas (GDAL/GEOS) ou usar imagem base pronta.
- Consolidar este resumo numa página interna de Runbook e referenciar no README de deploy.

Contato
- Para dúvidas operacionais ou mudanças de infra, seguir owner definido nos documentos de DEPLOY ou abrir issue no repositório.

---
Gerado automaticamente a partir dos MDs existentes em DEPLOY em /Integracao-zeroclaw-agro-link/DEPLOY/
