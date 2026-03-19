# ============================================

# AGENT EXECUTION SPEC

# VERSION: 1.1

# ============================================

## 1. CORE_CONTROL

- Escopo: instruções operacionais obrigatórias para agentes de IA.
- Agentes-alvo: todos (prioridade para Raptor Mini).
- Idioma obrigatório: português.
- Leitura obrigatória: sequencial, do início ao fim.
- Regra de erro: qualquer falha → STATE_ERROR (HALT).

---

## 2. PRIORITY_MODEL (GLOBAL — MÁXIMAS)

### PRIORITY_1 — TESTES (MÁXIMA)

- Testes têm precedência sobre:
  - novas funcionalidades
  - CI verde
  - velocidade

- Regras definidas exclusivamente em `TEST_POLICY_CORE`.

### PRIORITY_2 — SEGURANÇA / PERMISSÕES

- Qualquer ação invasiva requer autorização explícita.
- Regras definidas em `PERMISSION_GUARD`.

### PRIORITY_3 — ESCOPO AUTORIZADO

- Modificações fora do escopo são proibidas.
- Regras definidas em `SCOPE_AND_CHANGE_CONTROL`.

**Regra de precedência:**
Nenhuma transição, ação ou exceção pode violar o PRIORITY_MODEL.

---

## 3. EXECUTION_MODEL (COM IMPLEMENTATION_CYCLE INTEGRADO)

Este modelo define **estados, transições e regras operacionais obrigatórias**.
Cada execução do agente **DEVE** seguir este modelo **integralmente**.

O **IMPLEMENTATION_CYCLE** ocorre **dentro deste modelo**, como a sequência operacional dos estados.

**Regra estrutural adicional (escopo):**

- O agente **DEVE atuar exclusivamente dentro do escopo definido e autorizado**.
- Qualquer necessidade fora do escopo **interrompe a execução** e exige comunicação ao usuário (ver `SCOPE_AND_CHANGE_CONTROL`).

---

### 3.1 FLAGS VERIFICÁVEIS

- `TASK_DEFINED` — existe issue, ticket, prompt ou instrução explícita
- `CONTEXT_READY` — `README.md` e `docs/` lidos
- `TESTS_DEFINED` — critérios de aprovação e testes definidos **conforme `TEST_POLICY_CORE`**
- `TESTS_APPROVED` — testes executados e aprovados
- `DOCS_UPDATED` — documentação sincronizada
- `PERMISSION_GRANTED` — autorização explícita recebida
- `BRANCH_AUTHORIZED` — autorização explícita recebida

---

### 3.2 STATES

- `STATE_IDLE`
- `STATE_CONTEXT_LOADED`
- `STATE_IMPLEMENTING`
- `STATE_TESTING`
- `STATE_DOCUMENTING`
- `STATE_DONE`
- `STATE_ERROR` (**HALT**)

---

### 3.3 STATE SEMANTICS (IMPLEMENTATION_CYCLE)

Cada estado executa **um subconjunto fixo e exclusivo** do ciclo de implementação.
Nenhum passo pode ser pulado, reordenado ou fundido.

---

#### STATE_IDLE

**Objetivo:** validar existência de trabalho.

- Verificar `TASK_DEFINED`
- Se não houver implementação atribuída:
  - selecionar por prioridade e relevância
  - priorizar itens `Crítico` ou `Alta Prioridade`
  - confirmar escopo quando necessário

---

#### STATE_CONTEXT_LOADED

**Objetivo:** carregar contexto completo.

- Ler obrigatoriamente:
  - `README.md`
  - `docs/`
  - código relacionado

- Identificar:
  - dependências
  - efeitos colaterais
  - requisitos de segurança

- Sincronizar documentação prévia se desatualizada
  (sem remover roadmaps ou objetivos futuros)

Condição de saída:

- `CONTEXT_READY = true`

---

#### STATE_IMPLEMENTING

**Objetivo:** definir testes e implementar código.

**Regra de escopo (obrigatória):**

- Toda definição de testes e toda implementação **DEVEM ocorrer estritamente dentro do escopo definido**.
- Qualquer desvio de escopo ⇒ `STATE_ERROR`.

Ordem obrigatória:

1. TEST_DEFINITION (TDD MINIMALISTA — OBRIGATÓRIO)

- definir APENAS:
  - o comportamento principal esperado
  - 1 cenário válido (happy path)

- criar no máximo:
  - 1 teste unitário inicial

- é PROIBIDO nesta fase:
  - edge cases
  - cenários alternativos
  - testes de erro
  - testes de integração ou contrato

- Objetivo do teste:
  → guiar a primeira implementação correta, nada além disso.
  - regras de testes **DEVEM seguir exclusivamente `TEST_POLICY_CORE`**
  - criar **apenas testes essenciais** que protejam comportamento observável, invariantes críticas e fluxos principais (ver `TEST_POLICY_CORE` — TEST_VALUE_GATE). **Não** criar testes para detalhes de implementação, métodos privados, ou casos redundantes.
  - quando estiver em dúvida sobre o valor do teste, optar por **não** criar e consultar `TEST_POLICY_CORE` para orientação
  - preferir test-first

2. **IMPLEMENTATION**
   - modificar código **somente** dentro do escopo
   - mudanças devem ser:
     - pequenas
     - reversíveis
     - testáveis

   - proibido:
     - otimização prematura
     - refatoração fora do escopo

Condição de saída:

- alteração funcional concluída

---

#### STATE_TESTING

**Objetivo:** validar implementação.

- Executar testes definidos **conforme `TEST_POLICY_CORE`**
- Implementação só é válida se:
  - `TESTS_APPROVED = true`

Falha em testes:

- transição imediata para `STATE_ERROR`

---

#### STATE_DOCUMENTING

**Objetivo:** sincronizar rastreabilidade.

- Atualizar quando aplicável:
  - documentação técnica
  - runbooks
  - CHANGELOG
  - rotas públicas

- Preparar commit:
  - título preciso
  - corpo com:
    - motivação
    - alterações
    - referências
    - instruções de QA ou rollback

Condição de saída:

- `DOCS_UPDATED = true`

---

#### STATE_DONE

**Objetivo:** finalizar execução.

- Nenhuma ação adicional permitida
- Loop:
  - retorno implícito ao `STATE_IDLE` para nova tarefa

---

### 3.4 TRANSITIONS

- `STATE_IDLE → STATE_CONTEXT_LOADED`
  Condição: `TASK_DEFINED = true`

- `STATE_CONTEXT_LOADED → STATE_IMPLEMENTING`
  Condição: `CONTEXT_READY = true`

- `STATE_IMPLEMENTING → STATE_TESTING`
  Condição: alteração funcional realizada

- `STATE_TESTING → STATE_DOCUMENTING`
  Condição: `TESTS_APPROVED = true`

- `STATE_DOCUMENTING → STATE_DONE`
  Condição: `DOCS_UPDATED = true`

- **QUALQUER_ESTADO → STATE_ERROR**
  Condição: erro, falha, violação de regra, violação de prioridade **ou violação de escopo**

---

### 3.5 STATE_ERROR (HALT)

Ao entrar neste estado:

- Parar imediatamente
- Capturar logs (máx. 200 linhas)
- Reportar erro
- Não aplicar correções invasivas
- Aguardar instrução explícita do usuário

---

## 4. GLOBAL_RULESET (ATÔMICO)

- Sempre ler README.md e docs/ antes de agir.
- Sempre capturar stdout, stderr e exit code.
- Nunca executar ação invasiva sem PERMISSION_GRANTED.
- Nunca prosseguir após falha sem HALT.
- Sempre respeitar PRIORITY_MODEL.
- Sempre documentar alterações funcionais.

**Definição formal — Alteração funcional:**
Mudança que altera entrada, saída, estado persistente ou contrato público.

---

## 5. CHANGE_POLICY (CRÍTICO)

Mudanças são permitidas **apenas** se obedecerem integralmente a esta política.

### REGRAS ABSOLUTAS

- Proibido:
  - mudanças grandes e acopladas
  - alterações irreversíveis
  - modificações não cobertas por testes

- Toda mudança deve:
  - ter justificativa clara
  - ser rastreável
  - ser revertível sem impacto sistêmico

---

### 5.1 Pequenas, Reversíveis e Testáveis

**PEQUENAS**

- Uma funcionalidade por mudança.
- Um motivo claro por commit.
- Um impacto controlável.

**REVERSÍVEIS**

- Deve ser possível reverter sem:
  - migrações destrutivas
  - perda de dados
  - efeitos colaterais ocultos

**TESTÁVEIS**

- Cada mudança deve:
  - introduzir testes novos ou
  - manter testes existentes válidos

- Código sem teste associado é inválido.

---

## 6. EXECUTION_ENVIRONMENT (CRÍTICO)

Define **como executar backend, frontend e testes**.
Este é um **contrato operacional**, não sugestão.

---

### REGRAS GERAIS

- Preferência obrigatória: **Docker**
- Executar **apenas um caminho por vez** (Docker **ou** Local)
- Registrar qual caminho foi escolhido

---

### 6.1 Ambiente Padrão (Docker)

Docker Compose é o **ambiente padrão**.

**Regra operacional:**
➡️ O `docker-compose.yml` **define backend e frontend conjuntamente**.
➡️ Subir a stack completa é o comportamento padrão.

**Observação:** Os arquivos de configuração do Docker Compose estão em `integration-structure/project-agro/sistema-agropecuario`. Execute os comandos abaixo a partir dessa pasta. Para comandos locais que atuam apenas no backend, execute-os a partir de `integration-structure/project-agro/sistema-agropecuario/backend`.

---

### 6.2 Subir Stack Completa (Backend + Frontend)

**Comando padrão:**

```bash
docker compose up -d --build
```

Este comando sobe:

- backend
- frontend
- dependências (db, redis, etc.)

---

### 6.3 Execução Isolada (Uso Específico)

Permitido apenas quando **explicitamente necessário**.

**Backend apenas:**

```bash
docker compose up -d --build backend
```

**Frontend apenas:**

```bash
docker compose up -d --build frontend
```

---

### 6.4 Execução de Testes

**Testes de integração (Docker):**

```bash
docker compose exec -T backend python -m pytest
```

**Testes locais rápidos (sem Docker, app fiscal):**

> Execute os comandos abaixo a partir de `integration-structure/project-agro/sistema-agropecuario/backend`.

```bash
python3 -m venv venv \
&& source venv/bin/activate \
&& python -m pip install -r requirements.txt \
&& export USE_SQLITE_FOR_TESTS=1 \
&& venv/bin/python -m pytest apps/fiscal/tests -q
```

**Regras obrigatórias:**

- Registrar stdout, stderr e exit code.
- Não modificar banco local sem permissão explícita.

---

### 6.5 Reset de Ambiente (Somente se Autorizado)

```bash
docker compose down -v && docker compose up -d --build
```

---

## 7. TEST_POLICY_CORE

### OBJETIVO

Garantir **integridade e robustez reais do sistema**.
Não maximizar cobertura, quantidade de testes ou CI verde.

---

### TDD_MINIMAL_TEST_RULE (REGRA DURA)

Durante TEST_DEFINITION:

- criar exatamente 1 teste unitário inicial
- testes adicionais são PROIBIDOS antes da primeira implementação

Após implementação inicial:

- no máximo 2 testes unitários adicionais são permitidos
- somente se surgirem bugs reais ou lógica condicional explícita

---

### TEST_VALUE_GATE (ANTI OVER-TESTING — PRIORIDADE MÁXIMA)

ANTES de criar, manter ou refatorar um teste, o agente DEVE validar:

- protege **comportamento essencial observável**?
- falha indica **bug real ou risco real**?
- aumenta **confiança do sistema**?

IF qualquer resposta = NÃO
→ **NÃO criar** ou **REMOVER o teste**.

---

### TEST_SCOPE_RULE (TDD RESTRITO)

PERMITIDO:

- teste unitário de função ou classe isolada
- comportamento determinístico
- entrada → saída direta

PROIBIDO:

- múltiplos cenários no mesmo ciclo
- variações do mesmo comportamento
- testes defensivos ou especulativos
- antecipação de requisitos futuros

**Regra dura:**
Refactor válido que quebra teste ⇒ **teste inválido**.

---

### TDD_STOP_RULE (OBRIGATÓRIA)

O ciclo TDD DEVE parar quando:

- o teste inicial passa E
- a funcionalidade mínima funciona conforme esperado

É PROIBIDO:

- adicionar novos testes apenas para aumentar confiança
- explorar casos não observados em produção
- “completar cobertura”

---

### EDGE_CASE_POLICY (TDD)

Edge cases:

- NÃO fazem parte do ciclo inicial de TDD
- só podem gerar testes se:
  - causarem bug real OU
  - quebrarem contrato público existente

Caso contrário:
→ documentar, NÃO testar.

---

### TEST_STRENGTH_RULE (TESTES FRACOS — PROIBIDOS)

#### PROIBIDO:

```python
assert result
assert response
assert result is not None
assert len(x) > 0
```

#### OBRIGATÓRIO:

- asserts específicos
- expectativas semânticas
- contrato explícito

```python
assert total == 150.75
assert status_code == 403
assert is_active is False
```

**É PROIBIDO flexibilizar testes apenas para que passem.**

---

### TEST_DECOUPLING_RULE (DESACOPLAMENTO — PRIORIDADE MÁXIMA)

Cada teste DEVE:

- rodar isoladamente
- ser independente
- não depender de ordem

OBRIGATÓRIO:

- limpar estado entre testes
- evitar singletons mutáveis
- evitar cache global
- evitar fixtures com estado compartilhado

Testes passam isolados e falham juntos ⇒ **BUG DE TESTE (ALTA PRIORIDADE)**.

---

### TEST_PRIORITY_MODEL (COMPRESSÃO)

#### P0_CRITICO

- poucos
- muito fortes
- falha = bug grave
- integração > unitário

#### P1_ESSENCIAL

- fluxo principal
- 1 erro real

#### P2_SUPORTE

- NÃO obrigatório
- NÃO bloqueante
- REMOVÍVEL se gerar ruído

---

### REGRESSAO_RULE (AJUSTADA)

Bug real ⇒ teste de regressão **SOMENTE** se:

- proteger comportamento essencial
- não duplicar cobertura existente

NÃO criar regressão para:

- bug trivial
- detalhe interno
- código auxiliar

---

### MOCK_POLICY (RESUMO)

- mockar APENAS fronteiras externas / IO / terceiros
- NÃO mockar regras de negócio
- mocks seguem contrato único e consistente

---

### TEST_REMOVAL_RULE

É PERMITIDO e INCENTIVADO:

- remover testes redundantes
- remover testes frágeis
- remover testes de implementação
- remover P2 ruidosos

Garantir que comportamento essencial continue coberto.

---

### AGENT_BEHAVIOR_OVERRIDE (ANTI PRESSÃO)

Testes falhando **NÃO autorizam**:

- afrouxar asserts
- generalizar expectativas
- esconder falhas

Fluxo correto:

1. validar teste
2. validar comportamento esperado
3. corrigir código **OU** remover/refatorar teste

Nunca “fazer passar” sem justificativa técnica.

---

### REGRA FINAL (MEMORIZE)

> **Teste bom protege o sistema.
> Teste ruim protege o CI.
> Teste ruim deve ser removido.**

---

## 8. EXECUTION_PATHS

Define **caminhos mutuamente exclusivos** de execução.
**Apenas um PATH pode ser ativo por execução.**

### REGRAS GERAIS

- Selecionar exatamente **1 PATH**
- Registrar o PATH selecionado
- Não misturar comandos de PATHs diferentes
- PATH_DOCKER é o padrão

---

### 8.1 PATH_LOCAL

Uso **excepcional**.
Permitido apenas quando:

- Docker não estiver disponível **ou**
- for explicitamente solicitado pelo usuário

**Regras:**

- Não instalar dependências globais
- Não modificar sistema operacional
- Não alterar banco local sem permissão
- Usar variáveis de ambiente isoladas

---

### 8.2 PATH_DOCKER (DEFAULT)

PATH padrão e preferencial.

**Regras:**

- Usar `docker compose`
- Executar backend, frontend e testes via containers
- Não executar comandos locais equivalentes em paralelo

**Obrigatório:**

- Registrar comandos executados
- Registrar stdout, stderr e exit code

---

### 8.3 PATH_CI_ACT

Uso exclusivo para simulação de CI.

**Regras:**

- Não substituir testes locais
- Não usado como validação final
- Não alterar comportamento do pipeline oficial

**Objetivo único:**

- Verificar compatibilidade com workflows CI existentes

---

## 9. PERMISSION_GUARD

Controla ações potencialmente destrutivas ou invasivas.
**Nenhuma exceção implícita é permitida.**

---

### 9.1 Ações Proibidas sem Permissão

Proibido executar sem autorização explícita do usuário:

- `sudo` ou equivalentes
- Instalação de pacotes do sistema
- Alteração de permissões de arquivos
- Criação, remoção ou modificação de serviços
- Edição de arquivos em:
  - `/etc`
  - `/usr`
  - `/var`

- Reset de volumes Docker
- Migrações destrutivas
- Criação de branches
- Abertura de Pull Requests

---

### 9.2 Solicitação de Permissão (Formato Obrigatório)

Antes de executar ação restrita, solicitar permissão **neste formato exato**:

- **Ação proposta:** descrição objetiva
- **Motivo:** por que é necessária
- **Comandos exatos:** lista completa
- **Impacto esperado:** técnico e operacional
- **Riscos:** claros e diretos

**Regra:**

- Aguardar confirmação explícita por escrito.
- Sem confirmação → **HALT**.

---

## 10. SCOPE_AND_CHANGE_CONTROL

Garante controle funcional e técnico das mudanças.

---

### 10.1 Controle de Escopo

Antes de qualquer modificação:

- Definir explicitamente:
  - funcionalidade alvo
  - arquivos afetados
  - camadas envolvidas

- Trabalhar **somente** dentro do escopo definido

**Se surgir necessidade fora do escopo:**

- Não implementar
- Registrar em:
  - `current-state.md` **ou**
  - `docs/<arquivo>.md` **ou**
  - issue

- Comunicar ao usuário
- Interromper execução

---

### 10.2 Branches e Pull Requests (CRÍTICO)

**AUTORIZAÇÃO OBRIGATÓRIA**

Antes de:

- criar branch
- iniciar trabalho em branch nova
- abrir Pull Request

é obrigatório:

- obter autorização explícita do usuário

**Regras adicionais:**

- PRs pequenos e controlados
- Um PR por funcionalidade
- Commits atômicos
- Branches nomeadas claramente:
  - `feat/*`
  - `fix/*`
  - `chore/*`

**Sem autorização explícita → proibido agir.**

---

## 11. DOCUMENTATION_AND_TRACEABILITY

Toda mudança deve ser rastreável.

**Obrigatório atualizar quando aplicável:**

- documentação técnica
- runbooks
- CHANGELOG
- documentação pública de rotas/APIs

**Regras:**

- Não duplicar informação
- Refletir estado real do código
- Manter histórico claro de decisões

---

## 12. REPOSITORY_MAP (READ_ONCE_ONLY)

Mapa funcional do repositório.

- **Entrada principal:** `README.md`

- **Documentação:** `docs/`
  - `README.md`
  - `GUIA_RAPIDO.md`
  - `FASE_ATUAL.md`
  - `FISCAL_API.md`
  - `API_ENDPOINTS.md`
  - `ESTRUTURA_CODIGO.md`

- **Aplicação principal:** `integration-structure/project-agro/sistema-agropecuario/`
  - `docker-compose.yml`
  - `backend/`
  - `frontend/`
  - `docs/`
  - `tests/`
  - `scripts/`

- **Backend:** `integration-structure/project-agro/sistema-agropecuario/backend/`
  - Django
  - `manage.py`
  - `requirements.txt`
  - `Dockerfile`
  - `tests/`

- **Frontend:** `integration-structure/project-agro/sistema-agropecuario/frontend/`
  - Vite
  - variável obrigatória: `VITE_API_BASE`

- **CI & automação:**
  - `.github/workflows/`
  - `Makefile`

- **Agentes & scripts:**
  - `AGENTS.md`
  - `scripts/`
  - `scripts/agents_runner.py`

- **Projeto adicional (não necessário para rodar o sistema):** `integration-structure/zeroclaw/` (ZeroClaw runtime/SDK Rust)

---

## **13. DOCUMENTATION_MANAGEMENT_POLICY (CRÍTICO)**

Define **como o agente DEVE criar, atualizar, refatorar, consolidar e remover documentações**.

---

### 13.1 Escopo e Localização (REGRA DURA)

- Documentação **SOMENTE** em `docs/`
- **Obrigatório** uso de subpastas semânticas
- **Proibido** criar documentos fora de `docs/`

Antes de criar novo arquivo, **verificar equivalência semântica**.

---

### 13.2 Papel do README.md

Uso **exclusivo** para visão geral.

DEVE conter apenas:

- visão geral e objetivo
- instruções de execução
- requisitos e dependências
- estrutura do repositório
- fluxo básico de desenvolvimento
- como rodar testes

É proibido incluir:

- detalhes de implementação
- regras específicas de módulos
- documentação temporária

---

### 13.3 Criação, Consolidação e Divisão

Novo documento **SOMENTE SE**:

- não existir equivalente **OU**
- documento atual excessivamente longo

Regra padrão: **consolidar**.

---

### 13.4 Documentação Temporária

- Marcar como **TEMPORÁRIA**
- Encerrar tarefa:
  - excluir **OU**
  - migrar conteúdo

**Proibido** manter após a tarefa.

---

### 13.5 Atualização e Mesclagem Inteligente

Atualizar documentação **NÃO é append de texto**.

Ao adicionar ou migrar informação, o agente DEVE:

- inserir no local semântico correto
- mesclar com conteúdo existente (pode exigir reescrita)
- garantir que:
  - não haja duplicação
  - informações semelhantes estejam agrupadas
  - não existam contradições

**Regra final:** aumentar coesão.
