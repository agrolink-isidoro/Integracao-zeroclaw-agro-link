# TODO — Fiscal (NF-e, Certificados, Emissão, Auditoria)

Arquivos de referência:
- docs/FISCAL_TEMP/FISCAL_API.md
- docs/FISCAL_TEMP/SEFAZ_EMISSAO_ROADMAP.md
- docs/FISCAL_TEMP/SEFAZ_CERTIFICATE_MAINTENANCE.md
- docs/FISCAL_TEMP/FISCAL_MODELS.md
- CHECKLIST_FORNECEDORES.md
- sistema-agropecuario/docs/RELATORIO_EXECUTIVO.md

Observação: mantive todos os itens existentes (com seus status atuais). Abaixo as tarefas foram reordenadas por prioridade por extenso: **Crítico** (bloqueadores/segurança), **Alta Prioridade**, **Média Prioridade**, **Baixa Prioridade**. Cada tarefa foi fragmentada em sub-tarefas atômicas quando aplicável. NENHUMA informação original foi removida; os itens novos oriundos de `docs/TODO_FINALIZACAO.md` foram adicionados e integrados sem duplicação.

---

## Crítico — Corrigir / Blockers de produção e segurança 🔥
- [x] Implementar verificação de assinatura do SEFAZ callback (`POST /api/fiscal/nfes/sefaz_callback/`) — evitar aceitação de payloads não autenticados.
  - Sub-tarefas atômicas:
    - [x] Definir mecanismo e formato de assinatura (HMAC header `X-Signature`).
    - [x] Implementar verificação segura e rejeitar payloads inválidos (tests).
      - Implementação: HMAC-SHA256 do body comparado com `X-Signature` quando `SEFAZ_CALLBACK_SECRET` está definido. Testes em `apps/fiscal/tests/test_sefaz_callback.py`.
    - [x] Documentar configuração de secrets e runbook de recuperação (docs atualizados `docs/FISCAL_TEMP/SEFAZ_CERTIFICATE_MAINTENANCE.md`, `docs/FISCAL_TEMP/FISCAL_API.md`).
- [x] Management commands e testes para migração/rotação de certificados (`migrate_cert_files`, `rotate_cert_keys`) — essencial para segurança/ops.
  - Sub-tarefas atômicas:
    - [x] `migrate_cert_files --dry-run` deve produzir relatório sem alterações (implementado e testado).
    - [x] `migrate_cert_files` deve cifrar `arquivo` para `arquivo_encrypted` e limpar filefield quando `CERT_ENCRYPTION_KEY` presente (test).
    - [x] `rotate_cert_keys --dry-run` e execução com `--new-key`/`--old-keys` (test).
  - Implementação: Comandos e helpers adicionados (testes em `apps/fiscal/tests/test_cert_migration.py` e `test_cert_rotation.py`), mensagens de relatório aparecem durante execução de migração/rotacionamento.
- [x] Implementar testes e correções para leitura e fallback de dependências críticas no CI (ex.: fixtures de NFe/PDF e `libzbar`) — evita testes flaky.
  - Sub-tarefas atômicas:
    - [x] Adicionar job que instala `libzbar` nos runners ou usar container com binários. (implementado: `.github/workflows/ci.yml` atualizado para instalar `libzbar` no job E2E)
    - [x] Garantir fixtures necessários em CI para `test_extract_nfe.py` e `test_qr_pdf_dependencies.py` (adicionado passo de verificação e `libzbar-dev` instalado no job `backend-tests`).
  - Observação: alguns testes dependentes de binários/fixtures ainda falham localmente na suíte (ver relatórios de teste abaixo).
- [x] **✅ REQUISITO TODO_FINALIZACAO CONCLUÍDO:** Criar modelo `ImpostoFederal` para registrar impostos federais
  - Sub-tarefas atômicas:
    - [x] Definir modelo `ImpostoFederal`. (implementado em `backend/apps/fiscal/models_impostos.py`)
    - [x] Criar migrations e fixtures iniciais. (migration `0011_impostotrabalhista_impostofederal.py`)
    - [x] Serializer/endpoint para consulta. (endpoint: `GET /api/fiscal/impostos/`)
    - [x] Tests unitários de persistência e integridade. (`apps/fiscal/tests/test_impostos.py`)
- [x] **✅ REQUISITO TODO_FINALIZACAO CONCLUÍDO:** Criar modelo `ImpostoTrabalhista` separado vinculado à folha
  - Sub-tarefas atômicas:
    - [x] Definir modelo `ImpostoTrabalhista` (INSS, IR, FGTS). (implementado em `backend/apps/fiscal/models_impostos.py`)
    - [x] Signal para criação/atualização ao calcular/fechar folha. (implementado em `backend/apps/fiscal/signals.py`)
    - [x] Tests de cálculos (unit e integração). (testes em `apps/fiscal/tests/test_imposto_signals.py`) 

---

## Alta Prioridade — Estabilidade e funcionalidades chave
- [x] Finalizar implementação do `SefazClient` para produção (PKCS12/TLS, retries/backoff, timeouts, logging)
  - Sub-tarefas atômicas:
    - [x] Implementar HTTP client com suporte a certificado PKCS12 (opção de passar bytes/arquivo do `CertificadoSefaz`).
      - Implementação: `backend/apps/fiscal/services/sefaz_client.py` com `_prepare_client_cert_tuple` que extrai PEM de PKCS12 para um par `(cert_path,key_path)` temporário usado pelo `requests`.
  - [x] Criar imagem Docker pré-build (runner image) com libs nativas e wheels Python (xmlsec, signxml, lxml, cryptography) e pipeline para publicar em GHCR. Prioridade: **Alta**. (Implementado: `Dockerfile.ci`, `scripts/build-fiscal-test-image.sh` e `.github/workflows/build-ci-image.yml` — publicação condicionada a `GHCR_TOKEN`).
    - [x] Adicionar retries com backoff e circuit-breaker (tests simulando falhas).
      - Implementação: `requests.Session` com `Retry`/backoff configuráveis (testes em `apps/fiscal/tests/test_sefaz_client.py`).
    - [x] Testes E2E com mock server cobrindo sucesso e erros (cobertura básica adicionada aos testes).
- [x] Job processing: cobertura e robustez de `process_emissao_job` (retry, mark_failed, reconciliation)
  - Sub-tarefas atômicas:
    - [x] Test: `EmissaoJob.mark_success()` propaga `protocolo`/`status` para NFe quando aplicável (testes atualizados).
    - [x] Test: falhas repetidas usam retry/backoff e marcam job como `failed` com `last_error`.
    - [x] Reconciliation task para jobs `pending`/`processing` estagnados.
  - Implementação: `process_emissao_job` robustecido (fallback para agendamento local quando não em Celery, helper `_schedule_retry`), `management/commands/reconcile_emissao_jobs.py` adicionado e testes `apps/fiscal/tests/test_emissao_processing.py`.
- [x] Tests e permissões para endpoints sensíveis (`emit`, `cancel`, `confirmar_estoque`)
  - Sub-tarefas atômicas:
    - [x] Testar `IsStaffOrCanSendToSefaz` behavior (401/403/200).
    - [x] Testar `IsStaffOrCanConfirmEstoque` para `confirmar_estoque`.
- [x] Management de certificados: integração com KMS/Secret Manager (opcional, prioritizar AWS)
  - Sub-tarefas atômicas:
    - [x] Implementar provider `aws` para buscar `CERT_ENCRYPTION_KEY`.
    - [x] Test: integração com Secrets Manager (test doubles/local emulated).
  - Implementação: `_get_key_from_kms_if_configured` com cache TTL (`CERT_ENCRYPTION_KMS_CACHE_TTL`) em `backend/apps/fiscal/crypto.py`, testes em `apps/fiscal/tests/test_kms_integration.py` e documentação atualizada no runbook de rotação de chaves.
- [x] Validação explícita de `chave_acesso` (NFe)
  - Sub-tarefas atômicas:
    - [x] Adicionar validação estruturada/algorítmica da `chave_acesso` no upload (implementado; teste `apps/fiscal/tests/test_upload_invalid_chave.py`).
    - [x] Adicionar validação no endpoint de download (`GET /api/fiscal/nfes/{id}/download_xml/`) — implementado e testado (teste atualizado para gerar chave válida).
    - [x] Tests unitários cobrindo formatos válidos/ inválidos e edge cases (cobertura inicial para upload; ampliar para download/import como próxima tarefa).
- [x] Endpoint para consulta de impostos por competência
  - Sub-tarefas atômicas:
    - [x] Implementar endpoint REST `GET /api/fiscal/impostos/?competencia=YYYY-MM` que retorna `ImpostoFederal`/`ImpostoTrabalhista` por competência. (implementado em `backend/apps/fiscal/views.py` `ImpostosListView`)
    - [x] Serializer e filtros (competencia, tipo_imposto, referencia, fornecedor/fazenda se aplicável). (serializers adicionados em `backend/apps/fiscal/serializers.py`)
    - [x] Tests de contrato da API e integração. (`apps/fiscal/tests/test_impostos.py`)

- [x] **✅ REQUISITO TODO_FINALIZACAO CONCLUÍDO:** Implementar NFE auto-create em compras (Fiscal ↔ Comercial)
  - Sub-tarefas atômicas:
    - [x] Sinal/integração que cria NFe automaticamente ao confirmar compra. (implementado em `apps/comercial/signals.py`)
    - [x] Tests de integração: fluxo compra → NFe criada → emissão. (teste E2E: `apps/comercial/tests/test_compra_nfe_e2e.py`)
    - [x] Notificação para fornecedor quando cadastro incompleto. (sinal em `apps/comercial/signals.py`)
- [x] **✅ REQUISITO TODO_FINALIZACAO CONCLUÍDO:** Implementar impostos sobre vendas (ICMS, PIS/COFINS) — integração Comercial ↔ Fiscal
  - Sub-tarefas atômicas:
    - [x] Definir campos e modelos para armazenar ICMS/PIS/COFINS por item/NFe. (modelos `Imposto` existentes)
    - [x] Cálculos e validações. (parsing de impostos do XML implementado)
    - [x] Tests unitários e de integração. (`backend/apps/fiscal/tests/test_impostos_vendas.py`)
- [x] **✅ REQUISITO TODO_FINALIZACAO CONCLUÍDO:** Tests: cálculos INSS / IR / FGTS e lançamentos automáticos (Folha ↔ Fiscal)
  - Sub-tarefas atômicas:
    - [x] Testes unitários cobrindo fórmulas (INSS/IR/FGTS). (`apps/administrativo/tests/test_inss_ir_django.py`)
    - [x] Testes de integração: criação de `ImpostoFederal`/`ImpostoTrabalhista` no fechamento folha. (`apps/fiscal/tests/test_imposto_federal_and_trabalhista.py`)
    - [x] Testes de regressão para evitar duplicidade e garantir idempotência. (idempotency tests)
    - [x] Cálculo automático INSS/IR a partir do `salario_bruto`. (`apps/fiscal/signals.py`)

- [x] Manifestação do Destinatário (NF-e) — mover para **Alta Prioridade** (implementação em progresso)
  - Sub-tarefas atômicas (prioridade alta):
    - [x] Criar modelo `Manifestacao` + migration (FK -> `NFe`, campos: `tipo` [ciencia|confirmacao|desconhecimento|nao_realizada], `motivo` nullable, `criado_por`, `criado_em`, `enviado`, `enviado_em`, `resposta_sefaz` JSON, `status_envio` [pending/sent/failed], `audit_metadata` JSON). Incluir índices (`nfe`, `tipo`, `criado_em`).
    - [x] Implementar `ManifestacaoSerializer` com validações legais (ex.: `xJust`/`motivo` obrigatório para `nao_realizada`) e regras de idempotência (permitir duplicatas seguras; prevenir confirmações conflitantes). Adicionar testes unitários.
    - [x] API: `POST /api/fiscal/notas/{id}/manifestacao/` (action em `NFeViewSet` ou `ManifestacaoViewSet`): validar permissões (IsAuthenticated / empresa-destinario), criar `Manifestacao` e retornar `201` com objeto ou `202` com job_id quando envio assíncrono é enfileirado. Cobrir respostas `400/401/403`. Escrever testes de contrato/integration.
    - [x] Implementar `GET /api/fiscal/notas/{id}/manifestacoes/` e `GET /api/fiscal/manifestacoes/` (list/filters: `nfe`, `tipo`, `criado_por`, `status_envio`, date range) com paginação e testes.
    - [x] Celery task `send_manifestacao_task(manifestacao_id)` (lock / select_for_update, call SefazClient.send_manifestacao, update `status_envio`/`enviado_em`/`resposta_sefaz`, criar auditoria `ManifestacaoAudit` ou usar `CertificadoActionAudit`). Escrever testes de task com mock de `SefazClient` (incluindo retry/backoff behaviour).
    - [x] Extender `SefazClient` com `send_manifestacao(chave_acesso: str, tp_evento: str, certificado=None)` em `services/sefaz_client.py`: suporta `simulate=True`, gera XML de evento, assina (XMLDSig enveloped) usando PKCS12 (via `_prepare_client_cert_tuple`) e envia ao endpoint de recepção de eventos (tratando cStat 135/136 e erros comuns). Adicionar unit tests (simulate + production-stub).
      - Status: Implementação inicial adicionada (XML generation + signing of `infEvento` with Reference URI `#ID...` using `signxml` when available). Unit tests added (mock + real `signxml` verification). Observação: a workflow condicional (`.github/workflows/fiscal-sign-integration.yml`) existe como referência, mas está **desativada/arquivada** por questões de billing; siga as instruções em `docs/FISCAL_TEMP/TEST_CERT_GENERATION.md` para validação local via container. Um script `scripts/generate_test_pfx.sh` foi adicionado para geração do certificado de teste.
    - [x] Regras de validação temporal (NT 2020.001): validar prazos (Ciência ≤10 dias, eventos conclusivos ≤180 dias) na serializer ou serviço e criar testes que cobrem restrições e mensagens de rejeição. (Implementado no `ManifestacaoSerializer.validate` e coberto por `apps/fiscal/tests/test_manifestacao_model.py`)
    - [x] Auditoria: registrar quem solicitou a manifestação, payload e resposta SEFAZ (inclui nProt, cStat, xMotivo, timestamp, XML original); criar testes de auditoria e endpoint read-only para auditor/ops quando necessário. (Implementado: criação de `CertificadoActionAudit` ao criar `Manifestacao` e audit com detalhes JSON na task `send_manifestacao_task`; testes adicionados para verificar criação de audit com cStat/nProt.)
    - [x] Frontend (alta): criar `ManifestacaoNota.tsx` (dropdown + modal para `motivo` quando aplicável), integrar chamadas ao `POST /api/fiscal/notas/{id}/manifestacao/`, mostrar histórico (`GET /api/fiscal/notas/{id}/manifestacoes/`) no `NfeDetail` e cobrir com unit + Playwright E2E tests (login → abrir NFe → manifestar → verificar histórico e toasts). (Implementação básica e testes unitários adicionados; **Playwright E2E tests added** — `sistema-agropecuario/frontend/tests/e2e/manifestacao.spec.ts` and `manifestacao-enqueued.spec.ts`.)

    - [x] Unit tests: `_extract_pems_from_pkcs12` covering no-password, passworded (`testpass`), and corrupted PKCS12 (returns None and logs). (Implemented in `apps/fiscal/tests/test_sefaz_client_manifestacao_unit.py` and passes in containerized runs when `cryptography` is available)
    - [x] Unit tests: `_sign_xml` variants — verify KeyValue-only signature verification (`require_x509=False`) and X.509-embedded signature verification (`require_x509=True`). (Implemented in `apps/fiscal/tests/test_sefaz_client_manifestacao.py` and unit variants in `apps/fiscal/tests/test_sefaz_client_manifestacao_unit.py`.)
    - [x] Gate por feature flag `FISCAL_MANIFESTACAO_ENABLED` (config env): bloquear UI e endpoints quando desativado; adicionar testes que verificam o comportamento com flag on/off.
    - [x] Documentação & Runbook: OpenAPI fragment, exemplos `curl`, instruções de uso de certificados (A1 testes via PKCS12), retries/fallback e mapeamento de `tpEvento` adicionados; atualizar `docs/API_ENDPOINTS.md` e `docs/FISCAL_MANIFESTACAO.md` (documentação consolidada). (Próximo: expandir com exemplos de homolog/integration e A3 runbook)

    # Pendências críticas (implementação/validação) — sugestões de prioridade
    # Obs: itens abaixo não estavam explicitamente atomizados no TODO; adicionei para rastreabilidade e planejamento
    - [x] Enforce de tamanho de `xJust` / `motivo` (15–255 chars) para `nao_realizada` — Implementar validação no `ManifestacaoSerializer` e testes unitários. (Prioridade: **Alta** — requisito legal / validação obrigatória).
    - [x] Bloquear submissão de `ciencia` após já existir manifestação conclusiva (`confirmacao`/`desconhecimento`/`nao_realizada`) para a mesma NFe — validar no serializer/model antes de criar. (Prioridade: **Alta** — evita incoerência legal/negócio).
    - [x] Implementar controle de ocorrências (retificações) por tipo e gerenciamento de `nSeqEvento` conforme NT2020.001 (até 2 ocorrências por tipo) — persistir contador por `(nfe, tipo)`, enviar `nSeqEvento` correto e incluir testes de integração. (Prioridade: **Alta** — conformidade normativa).
    - [x] Tratar `cStat=136` (evento registrado sem vínculo) com retentativa inteligente / reconciliation job que tente vinculação posterior/agenda retries; incluir testes de reconciliação. (Prioridade: **Alta** — operação resiliente).
    - [x] Criar modelos auxiliares para sincronização e histórico: `NfeResumo`, `EventoManifestacao`, `ProcessamentoWs`, `NsuCheckpoint`, `ArquivoXml` — modelagem e migrations + testes. (Prioridade: **Média** — estrutural para sincronia remota e auditoria).
    - [ ] Testes E2E de Manifestação contra ambiente de homolog (workflow e runbook) e criação de imagem runner com libs nativas (xmlsec/signxml/lxml/cryptography) para CI local/reprodutível. (Prioridade: **Média-Alta** — garante E2E antes de ativar em staging).

---

## Média Prioridade — Cobertura, experiência e integrações
- [ ] Cobrir lacunas de testes e E2E (cobertura mínima exigida antes de release)
  - Sub-tarefas atômicas:
    - [x] Testes para `upload_xml` cobrindo `missing_field`/`bad_fields` (edge cases adicionais). (implementados em `apps/fiscal/tests/test_bad_fields.py`)
    - [x] Adicionar teste para falha de enfileiramento no endpoint `emit` e auditoria do `enqueued` flag (implementado em `apps/fiscal/tests/test_emissao_async.py::test_emit_handles_enqueue_failure_and_reports`).
    - [ ] Testes E2E para fluxo `emit` (simulate + production mocked).
    - [x] Testes para `read_qr_code`/`process_pdf` fallback quando `cv2` ausente. (adicionados em `apps/fiscal/tests/test_qr_pdf_fallbacks.py`)
- [x] CI: marcar e condicionar testes que dependem de binários, e garantir fixtures disponíveis.
  - Sub-tarefas atômicas:
    - [x] Adicionar env var `SKIP_EXTRACT_NFE` para pular quando fixtures ausentes. (`backend/conftest.py` já respeita `SKIP_EXTRACT_NFE`)
    - [x] Job de preparação de runner (instalar `libzbar`/pdf dependencies). (implementado no workflow `ci.yml`)

- [ ] Certificados: testes de integração para migração/rotacionamento (expansão de coverage).
- [ ] Integração Comercial / Fornecedor: melhorar fluxo pós-auto-criação
  - Sub-tarefas atômicas:
    - [x] Notificação (email/in-app) para completar cadastro do fornecedor (implementado: sinal `apps/comercial/signals.py` cria `Notificacao`, e testes adicionados em `apps/comercial/tests/test_compra_auto_nfe_notifications.py`).
    - [ ] Mapeamento de categorias e data-migration para alinhar `CATEGORIA_CHOICES`.
- [ ] Integração: validações e mapeamentos de impostos entre Comercial ↔ Fiscal (ICMS/PIS/COFINS mapping)
  - Sub-tarefas atômicas:
    - [ ] Mapear campos fiscais entre `Compra`/`Venda` e `NFe`.
    - [ ] Data-migration para ajustar históricos de notas/fornecedores com regimes tributários.

- [ ] Manifestação & Sincronização remota — manter em **Média Prioridade** (coleta/import remotas) 
  - Sub-tarefas atômicas (prioridade média):
    - [x] API: `POST /api/fiscal/nfes/sincronizar/` — aciona coleta de NFes via **NFeDistribuicaoDFe** para certificados configurados. Operação assíncrona (202 Accepted) e registra logs/resultado por certificado. (Implementado: cria `ProcessamentoWs` e enfileira `sync_nfes_task` skeleton; integração com DFe pendente.)
    - [x] API: `GET /api/fiscal/nfes/remotas/` e `GET /api/fiscal/nfes/?remote=true` — listar NFes obtidas remotamente com filtros (certificado, recebido_em, import_status). Cobrir com testes. (Implementado: `NFeRemoteListView` e proxy `?remote=true` em `NFeViewSet`; testes adicionados.)
    - [x] Backend: modelar `NFeRemote` (ou `NFe.remote=true` com FK `certificado`, `received_at`, `raw_xml`, `import_metadata`) e criar migration + tests de importação. (Implementado: `NFeRemote` model e migration adicionados.)
    - [x] API: `POST /api/fiscal/nfes/remotas/{id}/import/` — importar/aceitar XML remoto; payload deve suportar `storage_location`, `storage_path`, `centro_custo_id` e `import_metadata.forma_pagamento`. Validar campos (ex.: `boleto` exige `vencimento` e `valor`) e retornar `201`/`202`. Adicionar testes de validação e integração que confirmam auditoria de importação. (Implementado: validação de `import_metadata` + criação de `NFe` a partir de `raw_xml`, persistência de `imported_nfe` e criação de `CertificadoActionAudit` com `action='import'`; testes adicionados.)
    - [x] Implementar produção em `SefazDistribClient.fetch`: chamadas WS `NFeDistribuicaoDFe`, parse de `docZip` (base64+gzip), persistência de itens e NSU checkpointing; escrever testes unitários e integração (staged).      - Status atual: **Parcialmente implementado** — `_request` agora realiza parsing SOAP com `lxml` e aplica retries com backoff exponencial e logging; `_decode_doczip` decodifica `docZip` (base64+gzip) para XML; `fetch()` implementa loop/paginação para agregar lotes (NSU pagination) respeitando `NsuCheckpoint`.
      - Testes: adicionados unit tests para parsing, paginação e tratamento de erros (`apps/fiscal/tests/test_sefaz_distrib_*.py`) e testes unitários para o worker (`apps/fiscal/tests/test_sync_nfes_task.py`). Os testes do helper `_process_fetched_items()` passam no container.
      - Observações operacionais: `sync_nfes_task` agora persiste `ArquivoXml` quando `raw_xml` está disponível e atualiza `NsuCheckpoint` com o maior NSU processado. Pendências: finalizar o consumidor de produção (coordenação por certificado, batching, idempotência) e E2E contra homolog da SEFAZ.      - Status: *Parcialmente implementado* — implementado `_request` (SOAP response parsing using `lxml`), `_decode_doczip` (base64+gzip decode), `fetch()` now respects NSU checkpoint and implements a pagination loop to aggregate multi-lote(NSU) responses; added exponential backoff & logging in `_request` for transient errors. Unit tests added: `tests/test_sefaz_distrib_request.py`, `tests/test_sefaz_distrib_fetch.py`, `tests/test_sefaz_distrib_nsu.py`, `tests/test_sefaz_distrib_checkpoint.py`, `tests/test_sefaz_distrib_pagination.py`, `tests/test_sefaz_distrib_errors.py`. `sync_nfes_task` now persists `ArquivoXml` when `raw_xml` present and updates `NsuCheckpoint` with the highest NSU seen.
      - Pendências: finalize o consumidor de produção (`sync_nfes_task`) para uso com paged/lot responses (coordenação por certificado, idempotência e batching), ampliar cobertura para SOAP fault mapping (erro semântico) e E2E tests contra ambiente homolog da SEFAZ. (Prioridade: Alta para produção segura.)
    - [ ] Frontend: filtro/toggle `Remotas` em `NotaFiscalList`, botão `Importar` que abre modal/stepper com preview do XML e formulário de decisão; validação inline e testes E2E (importação com boleto/avista/cartao).
    - [ ] Certificados: validar, ao registrar A3 (PKCS#11), que o certificado inclui `cnpj` correspondente e vincular `CertificadoSefaz` à empresa/filial; adicionar testes e documentação para runbook de A3.
    - [ ] Atualizar documentação operacional com exemplos de payload e runbook da sincronização e importação remota.

  - Importação / Aceitar XML — decisões e metadados (itens atômicos):
    - [ ] `import_metadata.storage` (local|s3|path) — implementar campo e validações.
    - [ ] `import_metadata.centro_custo_id` — obrigatoriedade e validação no import endpoint.
    - [ ] `import_metadata.forma_pagamento` — suportar `avista` (subtipo), `boleto` (requer `vencimento` + `valor`), `cartao` (opcionais) e `outra` (observação livre); adicionar testes por caso.
    - [ ] Sempre gravar auditoria de importação (quem, quando, import_metadata) e escrever testes de integração que assertam o conteúdo auditado.

    - [ ] Atualizar documentação e runbook com exemplos de payload e passos manuais para suporte e QA.

---

---

## Baixa Prioridade — UX, documentação e longo prazo
- [x] Documentação atualizada: `docs/FISCAL_TEMP/FISCAL_API.md`, `docs/FISCAL_TEMP/SEFAZ_CERTIFICATE_MAINTENANCE.md`, `docs/FISCAL_TEMP/SEFAZ_EMISSAO_ROADMAP.md`, `docs/FISCAL_TEMPEMP/SEFAZ_EMISSAO_ROADMAP.md`, `docs/FISCAL_TEMP/FISCAL_MODELS.md`.
- [ ] Frontend melhorias (UX/fluxos)
  - Sub-tarefas atômicas:
    - [ ] Tela de listagem/gestão de NFes (filtros por status, data, fornecedor).
    - [ ] Tela de detalhes da NFe (visualizar XML, status SEFAZ, emitir/cancelar quando permitido).
    - [ ] UI/Admin para gerenciar certificados (upload/rotacionamento/metadados).
    - [ ] Notificações do estado assíncrono (emissão enfileirada, erro de enqueue).
    - [ ] Indicador de status fiscal na folha (frontend) — adicionar componente `FiscalStatusBadge` e testes visuais/E2E.
- [ ] Criar exemplos consumíveis: snippets `curl` e `frontend FormData` para upload/emit/status.
- [ ] Long-term: NFC-e / mobile workflows, dashboards operacionais, integração com ERPs.

---

## Itens já implementados (referência rápida)
- [x] Upload XML: `POST /api/fiscal/nfes/upload_xml/` — parse, persistência transacional (NFe, ItemNFe, Imposto), `xml_content`, `processado_por`, `bad_fields`.
  - [x] Validação de campos obrigatórios e retorno estruturado `bad_fields` para erros de validação (tests).
- [x] Leitura de QR e Processamento de PDF (DANFE) — `POST /api/fiscal/nfes/read_qr_code/` e `POST /api/fiscal/nfes/process_pdf/` (fallback OpenCV/Pyzbar + `pdfplumber`).
  - [x] Fallbacks implementados e testados para ausência de dependências nativas (tests).
- [x] Emit endpoint — `POST /api/fiscal/nfes/{id}/emit/` cria `EmissaoJob` e tenta enfileirar Celery (`process_emissao_job`).
  - [x] Test: endpoint valida permissões (IsStaff/roles) e cria `EmissaoJob` (tests).
- [x] Download de XML — `GET /api/fiscal/nfes/{id}/download_xml/` (retorna `chave_acesso` e `xml_content`).
- [x] Status e Cancelamento — `GET /api/fiscal/nfes/{id}/status/` e `POST /api/fiscal/nfes/{id}/cancel/` (grava auditoria).
- [x] Confirmar Estoque — `POST /api/fiscal/nfes/{id}/confirmar_estoque/` (cria `Lote`/`MovimentacaoEstoque`, marca `estoque_confirmado`).
  - [x] Testes de integração cobrindo criação de lote e movimentação (tests).
- [x] Certificados: upload (`POST /api/fiscal/certificados/`), armazenamento (`arquivo_name` / `arquivo_encrypted`) e `CertificadoActionAudit` para ações sensíveis.
  - [x] Testes para upload com validação de extensão, tamanho e senha (tests).
- [x] Audit API: `CertificadoActionAuditViewSet` — filtros (`action`, `certificado`, `performed_by`), paginação e export CSV (`/api/fiscal/certificado-audits/export_csv/`).
  - [x] Sub-tarefas atômicas:
    - [x] Adicionar filtro por `action` (tests: `test_filter_by_action`).
    - [x] Adicionar filtro por `certificado` (tests: `test_filter_by_certificado`).
    - [x] Adicionar filtro por `performed_by` (tests: `test_filter_by_performed_by`).
    - [x] Paginação personalizável via query params (tests: `test_pagination`).
    - [x] Export CSV com cabeçalhos e encoding correto (tests: `test_export_csv`).
- [x] SEFAZ callback HMAC verification (`X-Signature`).
  - [x] Sub-tarefas atômicas:
    - [x] Adicionar leitura segura de `SEFAZ_CALLBACK_SECRET` e cálculo HMAC-SHA256 do raw body.
    - [x] Comparação segura (constant time) com `X-Signature` header (tests: aceita / rejeita assinaturas).
    - [x] Auditoria de callback (cria audit record quando callback recebido).
    - [x] Documentar uso e configuração (docs atualizados `docs/FISCAL_API.md`).
- [x] KMS / Secrets Manager integration: `_get_key_from_kms_if_configured` com TTL cache (`CERT_ENCRYPTION_KMS_CACHE_TTL`).
  - [x] Sub-tarefas atômicas:
    - [x] Implementar fetch com `boto3` e fallback para configuração local.
    - [x] Implementar TTL cache em memória (tests: fetch, cache hit, cache miss, error handling).
    - [x] Documentar configuração e variáveis (`CERT_ENCRYPTION_KMS_ARN`, `CERT_ENCRYPTION_KMS_CACHE_TTL`).
- [x] SefazClient improvements: session-based HTTP, retries/backoff, PKCS12 support (PEM extraction).
  - [x] Sub-tarefas atômicas:
    - [x] Implementar `requests.Session` com `Retry`/backoff e timeouts (tests: retries/backoff behaviors).
    - [x] Implementar `_prepare_client_cert_tuple` para extrair PEM de PKCS12 e devolver `(cert_path, key_path)` temporários com cleanup (tests PKCS12 flow).
    - [x] Garantir logging contextual e mensagens de erro claras quando 4xx/5xx.
- [x] Emissão robustness: `process_emissao_job` retry fallback when not in Celery, helper `_schedule_retry`, and reconciliation command `reconcile_emissao_jobs`.
  - [x] Sub-tarefas atômicas:
    - [x] Implementar `_schedule_retry` que agenda próxima tentativa localmente e registra `scheduled_at` no job.
    - [x] Corrigir dupla-incrementação de `tentativa_count` e adicionar teste `test_retry_schedules_next_attempt_when_not_celery`.
    - [x] Adicionar comando de manutenção `reconcile_emissao_jobs` que marca jobs `processing` travados como `failed` (test).
- [x] Cert migration & rotation commands and tests.
  - [x] Sub-tarefas atômicas:
    - [x] `migrate_cert_files --dry-run` e execução para cifrar arquivos plaintext (tests).
    - [x] `rotate_cert_keys --new-key --old-keys` com rollback parcial e relatório de falhas (tests).
    - [x] Testes de idempotência e tratamento de erros durante migração/rotacionamento.
- [x] Misc fixes & housekeeping:
  - [x] Corrigir IndentationError bloqueador em `views.py` que impedia startup do backend (fix + test).
  - [x] Adicionar e melhorar fixtures de testes e exemplos em `apps/fiscal/tests/fixtures/`.
  - [x] Atualizar documentação (`docs/*`) com instruções de configuração e runbooks.

---

Próximos passos sugeridos:
1) Concorda com a priorização acima? Diga “Confirmar prioridades” e eu abro issues priorizadas e atribuo labels (`Crítico`,`Alta Prioridade`,`Média Prioridade`,`Baixa Prioridade`).
2) Se aprovar, quero que eu comece criando issues para P0 e abrindo PRs para documentação & pequenas correções? (responda “Criar issues P0”).

> Observação: mantive todas as tarefas originais e apenas reorganizei por prioridade e converti algumas em sub-tarefas atômicas para facilitar planejamento e execução.
