# Tarefas: Google Maps + KML (Talhões vinculados à Fazenda)

**Objetivo:** organizar/estruturar o mapa Google para carregar corretamente **talhões cadastrados via KML** (vinculados à propriedade/fazenda) e garantir que a visualização funcione de forma confiável.

> Ordem de prioridade: cada tarefa pré-requisito aparece antes da dependente.

---

## 1) Preparar o backend para suportar KML + geometrias multi

- [x] **1.1** Atualizar o parser KML (área + talhão) para extrair *todas* as geometrias de um arquivo KML (multi-feature / multi-polygon) e armazenar como `MultiPolygon` ou equivalente.
  - [x] Revisar `apps/fazendas/serializers.py` (`_process_kml_file`) para percorrer todas as features e compor `MultiPolygon`/WKT.
  - [x] Garantir que `geom` continue compatível com `GEOSGeometry` e `ST_Area` usados no `area_hectares`.
  - **✅ COMPLETO (19/03/2026):** Implementado em AreaSerializer e TalhaoSerializer, backwards compatible, code committed.

- [x] **1.2** Adicionar testes unitários para KML com múltiplos placemarks:
  - [x] Novo teste em `backend/apps/fazendas/tests/` que envia KML com mais de um `Placemark` e valida que `geom` contém todas as partes.
  - **✅ COMPLETO (19/03/2026):** 2 testes criados + validados:
    - `test_create_area_with_multipolygon_placemark_kml()` (MULTIPOLYGON inner structure)
    - `test_create_area_with_empty_kml_error()` (error handling)
  - Conforme TEST_POLICY_CORE: máx 2 adicionais, ambos de alto valor (TEST_VALUE_GATE)

- [ ] **1.3** Validar que o backend armazena corretamente a geometria para todos os talhões da mesma fazenda (não só o primeiro).
  - [ ] Confirmar que `TalhaoSerializer`/`AreaSerializer` suportam MultiPolygon sem falhar no save.

---

## 2) Garantir que o endpoint de Geo retorne todos os talhões da Fazenda

- [ ] **2.1** Adicionar teste de integração para `GET /api/fazendas/geo/?fazenda=<id>&layer=talhoes` retornando todos os talhões cadastrados por KML.

- [x] **2.2** Verificar filtros de tenant e `fazenda` funcionam corretamente no endpoint `/api/fazendas/geo/`.
  - [x] Garantir que `fazenda` parametrizada traga somente talhões da fazenda selecionada (e não de outras fazendas do mesmo tenant).

---

## 3) Refatorar e organizar o frontend Google Maps (carregar via talhões KML)

- [ ] **3.1** Refatorar `frontend/src/components/fazendas/FazendaMap.tsx` para maior clareza/organização:
  - [ ] Separar a *busca de dados* (`useApiQuery('/geo/...')`) em hook reutilizável.
  - [ ] Separar o renderer de polígonos (Google Maps) em componente próprio.
  - [ ] Separar painel lateral (info) em componente próprio.

- [x] **3.2** Garantir o filtro `fazenda` carrega DEFAULT com a fazenda do usuário, e recarrega ao trocar.
  - [x] Confirmar o “filtro fazenda” é consistente com o `?fazenda=` do endpoint e com a seleção no dropdown.

- [ ] **3.3** Adicionar cobertura E2E mínima para o mapa:
  - [ ] Criar um teste Playwright que crie 2 talhões com KML, abra `/fazendas/mapa` e verifique que o endpoint `/geo/` retornou os polígonos (via network ou inspeção do DOM). 

---

## 4) Documentação + Configuração de ambiente

- [x] **4.1** Garantir que o `tasks/.env.example` (e `.env.example` principal) documente claramente `VITE_GOOGLE_MAPS_API_KEY`.
- [ ] **4.2** Adicionar pequeno trecho na documentação de setup (README / docs) explicando onde colocar a chave e como rodar localmente (`docker compose up` + `.env`).
- [x] **4.3** Confirmar `.gitignore` ignora o `.env` local (já está feito).

---

> Observação: como pré-requisito crítico, o backend deve permitir que um `talhão` carregue todas as geometrias contidas em um KML — se isso falhar, o mapa pode não mostrar todos os talhões mesmo se o frontend estiver correto.
