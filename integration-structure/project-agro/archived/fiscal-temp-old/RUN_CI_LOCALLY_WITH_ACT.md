# Rodando a verificação de assinatura (workflow) localmente com `act` ✅

## Objetivo deste documento 🎯
Este documento explica, passo a passo e em linguagem acessível, como replicar localmente o que a workflow GitHub Actions `fiscal-sign-integration.yml` faz. Foi escrito _para leigos_: cada termo técnico vem com uma explicação simples e exemplos práticos. O foco é executar o teste que valida a geração e verificação de assinaturas digitais (PKCS#12 / `.pfx`) sem usar minutos pagos do GitHub Actions.

---

## 1) Por que essa workflow existe? (explicação simples)
- O que ela faz: instala dependências do sistema (bibliotecas nativas), instala dependências Python, restaura um arquivo de certificado PKCS#12 (.pfx) a partir de secrets seguros e executa um teste que verifica se a assinatura XML produzida pelo sistema é válida.
- Por que é importante: a SEFAZ (autoridade fiscal) exige assinaturas digitais válidas em eventos fiscais. Se a assinatura estiver incorreta por problemas de ambiente (bibliotecas nativas, versões de `xmlsec`, etc.) as notificações fiscais podem ser rejeitadas — o que quebra operações fiscais.
- Conclusão rápida: esse teste garante que a lógica de assinatura funciona não só no código, mas também num ambiente com as bibliotecas nativas corretas.

---

## 2) O que perdemos se nunca rodarmos essa workflow?
- Risco de regressões relacionadas a dependências nativas (xmlsec/libxml2), que só aparecem em ambientes parecidos com o do CI/homolog.
- Maior chance de erro ao integrar com a SEFAZ (que exige formatos e assinaturas estritas).
- Mais trabalho manual para reproduzir problemas de assinatura.

Se sua equipe prefere evitar custos do GitHub Actions, rodar localmente ou usar um self-hosted runner é a alternativa prática e gratuita.

---

## 3) Opções gratuitas para validar a assinatura (comparação rápida)
- `act` (recomendado para devs): simula o GitHub Actions localmente usando Docker. É grátis (usa seus recursos locais). ✅
- Self-hosted runner: registra sua máquina como um runner do GitHub (gratuito se você usar infra própria). Bom para runs repetidas e integradas. ✅
- Teste direto com `pytest`: exportar variáveis e executar o teste específico sem o act (mais direto, útil para debugging rápido). ✅

---

## 4) Pré-requisitos (o que você precisa ter instalado)
- Docker instalado e em execução (o `act` usa containers para simular o ambiente). Se não tem Docker, instale primeiro.
- Repositório clonado e atualizado (ramo `feat/fiscal-manifestacao` recomendado).
- (opcional) `xclip` se você quiser manipular o clipboard.

---

## 5) Guia passo-a-passo: instalar e usar `act` (muito detalhado)
### 5.1 O que é o `act`?
`act` é uma ferramenta que permite executar jobs de GitHub Actions localmente dentro de containers Docker. Ele usa os mesmos steps e geralmente reproduz bem os resultados do CI remoto.

### 5.2 Como instalar (Linux)
1. Assegure que o Docker esteja instalado e que você consiga rodar containers (`docker run hello-world`).
2. Instale `act` (instalador oficial):
```bash
curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```
OBS: pode pedir `sudo` para instalar. Se preferir, siga as instruções oficiais em: https://github.com/nektos/act

### 5.3 Preparar o certificado de teste (local)
1. Gerar usando o script já fornecido (caso ainda não tenha):
```bash
chmod +x scripts/generate_test_pfx.sh
./scripts/generate_test_pfx.sh
```
Esse script cria `scripts/certs/test.pfx` com senha padrão `testpass` (você pode alterar com a variável `PFX_PASS`).

2. Criar a versão base64 (como a workflow espera o secret como base64 sem quebras):
```bash
base64 -w0 scripts/certs/test.pfx > /tmp/test.pfx.b64
```

### 5.4 Executar `act` (com secrets)
1. Exporte as variáveis de ambiente (apenas na sua sessão local):
```bash
export FISCAL_TEST_PFX_B64="$(cat /tmp/test.pfx.b64)"
export FISCAL_TEST_PFX_PASS="testpass"
```
2. Executar o job que replica a workflow (o nome do job é *Signature Integration (conditional)*):
```bash
act -j "Signature Integration (conditional)" \
  -s FISCAL_TEST_PFX_BASE64="$FISCAL_TEST_PFX_B64" \
  -s FISCAL_TEST_PFX_PASS="$FISCAL_TEST_PFX_PASS" \
  -P ubuntu-latest=nektos/act-environments-ubuntu:18.04
```
- O `-P` mapeia a imagem que o `act` usará para o rótulo `ubuntu-latest`; usamos uma imagem comum pré-configurada.
- O primeiro tempo de execução pode demorar (o container será baixado, apt será executado dentro do container, etc.).

> **Observação importante:** durante a investigação encontramos incompatibilidades do `act` com algumas Actions JavaScript (runtime/versions), o que impediu a execução completa de alguns passos. Para reprodutibilidade e investigação determinística, recomendamos usar o **método em container** descrito em `docs/FISCAL_TEMP/TEST_CERT_GENERATION.md`.

### Impacto para sua máquina (estimativa)
- CPU: pico durante builds e instalação (varia por máquina); espere uso intenso por alguns minutos.
- Memória: algumas combinações podem chegar a 1.5–3 GB quando `pip`/`pytest` e dependências nativas são instaladas/executadas em container.
- Disco: downloads de apt/pip e imagens Docker podem somar 500MB–2GB.

Dica: monitore com `top`/`htop` e `docker stats`, e limpe imagens antigas com `docker system prune -f` se precisar de espaço.

### 5.5 O que esperar na saída
- O `act` mostrará logs similares aos do GitHub Actions: passos `Checkout`, `Setup Python`, `Install system dependencies`, `Restore test PFX`, `Run signature integration test`.
- Se tudo passar, você verá o `pytest` terminando com algo como `1 passed` para o teste específico.

### 5.6 Possíveis problemas e como resolver (FAQ)
- Erro: "Docker não está rodando" → start Docker e tente novamente.
- Erro: permissão negada ao acessar socket Docker → execute `sudo` ou adicione seu usuário ao grupo `docker`.
- Erro: apt falha (tempo limite / pacotes) → verifique internet e tente reexecutar; às vezes a imagem base pode estar temporariamente indisponível.
- Erro: testes falham por falta de `xmlsec`/`libxmlsec` → o job tenta instalar `libxml2-dev libxmlsec1-dev` dentro do container; se falhar, cole os logs na issue e eu ajudo.

---

## 6) Alternativa rápida: rodar o teste diretamente com `pytest` (sem act)
Se você só quer verificar a assinatura localmente e tem um ambiente Python configurado:
```bash
export FISCAL_TEST_PFX_PATH=$(pwd)/scripts/certs/test.pfx
export FISCAL_TEST_PFX_PASS=testpass
export RUN_HOMOLOG_INTEGRATION=true
pytest sistema-agropecuario/backend/apps/fiscal/tests/test_manifestacao_integration.py::ManifestacaoIntegrationTest::test_sign_with_local_pfx_if_present -q
```
Vantagens: Rápido, não depende de Docker. Desvantagens: não garante que as libs nativas do sistema (xmlsec) serão instaladas do mesmo modo que o CI faria.

Dica prática: para a maioria dos desenvolvedores, o fluxo mais rápido e reprodutível é rodar os *unit tests* diretamente no container `backend` via `docker compose exec` (evita reinstalações e utiliza a stack do projeto). Exemplo para rodar os testes unitários que não requerem `xmlsec`:

```bash
cd sistema-agropecuario
docker compose exec -T -e USE_SQLITE_FOR_TESTS=1 -e DJANGO_SETTINGS_MODULE=sistema_agropecuario.settings.minimal_test backend python -m pytest apps/fiscal/tests/test_sefaz_client_manifestacao_unit.py -q
```

Isso executa os testes em SQLite em memória e com settings mínimos (`minimal_test`), reduzindo tempo e evitando falhas por dependências de apps não necessárias para os testes unitários.

---

## 7) Segurança e limpeza (muito importante)
- **NUNCA** commit o `test.pfx` nem o `test.pfx.b64` no repositório. O `.gitignore` já inclui `scripts/certs/` e `*.pfx`.
- Para limpar arquivos locais e clipboard:
```bash
rm -f scripts/certs/test.pfx.b64 scripts/certs/test.pfx /tmp/test.pfx /tmp/test_cert.pfx 2>/dev/null || true
printf '' | xclip -selection clipboard -i || true
```
- Se por erro você cometeu um arquivo sensível no git, avise-me e eu oriento o procedimento seguro para remoção do histórico (git filter-repo) e rotação de chaves.

---

## 8) Self-hosted runner (opcional) — resumo prático
- Utilidade: roda GitHub Actions na sua própria máquina (sem consumir minutos pagos). Bom se você quer que o workflow execute automaticamente na PR/merge em vez de manual local.
- Riscos: o runner tem acesso ao código e secrets do repo; **rode em máquina confiável**.
- Passos gerais:
  1. GitHub → Settings → Actions → Runners → New self-hosted runner. Copie comandos.
  2. Faça o download e execute `./config.sh` com o token fornecido.
  3. Inicie o serviço `./svc.sh install && ./svc.sh start`.

Quer que eu escreva um guia detalhado de 1-click para instalar o runner na sua máquina? Posso criar um `scripts/setup-self-hosted-runner.sh` e documentar os riscos.

---

## 9) Exemplo de checklist (rápido) ✅
- [ ] ter Docker funcionando localmente
- [ ] gerar `scripts/certs/test.pfx` com `scripts/generate_test_pfx.sh`
- [ ] criar `/tmp/test.pfx.b64` (base64 sem quebras)
- [ ] executar `act` com as variáveis de ambiente
- [ ] validar resultado do pytest (`1 passed`)
- [ ] limpar artefatos locais

---

## 10) Onde verificar o workflow no repositório
- Arquivo: `.github/workflows/fiscal-sign-integration.yml`
- O job principal chama um teste localizado em: `sistema-agropecuario/backend/apps/fiscal/tests/test_manifestacao_integration.py`.
- Observação: o workflow foi modificado para **pular** (skip) quando os secrets não estiverem presentes — por isso não consome minutos do GitHub caso não tenha secrets.

---

## Precisa de ajuda prática agora? 🤝
- Posso executar o `act` aqui localmente e trazer a saída dos logs para você (faço a execução e te passo o resultado). Quer que eu rode agora? (responda: **Sim — roda act**)
- Posso também escrever um `README` curto no diretório `docs/FISCAL_TEMP/` com estes passos resumidos (faço isso automaticamente se você confirmar). Quer que eu adicione o README agora? (responda: **Sim — adiciona README**)

---

Se quiser, adapto o documento com mais imagens, prints de tela do `act` em execução, ou transformo em um tutorial passo-a-passo com checkboxes para estilos de onboarding. Quer que eu melhore algo específico no texto? 👇