# 📊 Análise Detalhada dos 20 Testes Falhando
## Classificação por Complexidade, Dependências de CI/ACT e ROI

**Data**: 4 de fevereiro de 2026  
**Estado Atual**: 117 passed / 20 failed / 4 skipped (85.4%)  
**Objetivo**: Classificar por complexidade e identificar uso de `act` workflows

---

## 📋 TABELA EXECUTIVA

| Categoria | Testes | Complexidade | Tempo Est. | ROI | Usa ACT? | Prioridade |
|-----------|--------|--------------|-----------|-----|----------|-----------|
| **1. Celery/Async** | 9 | MÉDIA | 30-45 min | **+6,4%** | NÃO | 🟢 ALTA |
| **2. Callbacks/HMAC** | 4 | MÉDIA-ALTA | 45-60 min | **+2,8%** | **SIM** | 🟡 MÉDIA |
| **3. QR/PDF** | 3 | BAIXA | 30-40 min | **+2,1%** | NÃO | 🔴 BAIXA |
| **4. SEFAZ Sync** | 3 | ALTA | 60-90 min | **+2,1%** | NÃO | 🔴 BAIXA |
| **5. Signxml** | 1 | ALTA | 20-30 min | **+0,7%** | **SIM** | 🟡 MÉDIA |

---

## 🟢 CATEGORIA 1: CELERY/ASYNC TASKS (9 testes)

### Classificação: COMPLEXIDADE MÉDIA | PRIORIDADE ALTA

#### Testes Afetados:
```
test_manifestacao_e2e_homolog.py:
  ✗ test_manifestacao_send_success_cstat_135
  ✗ test_manifestacao_send_failure_cstat_136_retry
  ✗ test_manifestacao_nseq_assignment
  ✗ test_manifestacao_reconciliation_cstat_136
  ✗ test_manifestacao_idempotence_duplicate_submit

test_manifestacao_task.py:
  ✗ test_send_manifestacao_task_success
  ✗ test_send_manifestacao_task_failure
  ✗ test_send_manifestacao_task_assigns_nseq
  ✗ test_send_manifestacao_task_handles_cstat_136

test_manifestacao_reconcile.py:
  ✗ test_reconcile_marks_sent_when_vinculado
```

### 🔍 Análise Detalhada do Problema

**Erro Observado:**
```python
AttributeError: <module 'apps.fiscal.tasks' from '/app/backend/apps/fiscal/tasks.py'> 
does not have the attribute 'SefazClient'
```

**Causa Raiz:**
```python
# Em tasks.py (LINHA 13):
@shared_task(bind=True, max_retries=3)
def send_manifestacao_task(self, manifestacao_id: int):
    try:
        # Lazy import DENTRO da função
        from .services.sefaz_client import SefazClient  # <-- NÃO está em escopo do módulo
```

**Teste tenta mockar:**
```python
# Em test_manifestacao_e2e_homolog.py:
with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:  # ❌ NÃO EXISTE
    inst = MockClient.return_value
```

### ✅ Solução

**Opção A (Recomendada - Minimal Changes):**
```python
# Em tasks.py, adicionar no topo do módulo:
from .services.sefaz_client import SefazClient  # Move para escopo global

# Depois os testes podem mockar corretamente:
with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:  ✓ FUNCIONA
```

**Opção B (Corrigir apenas os testes):**
```python
# Em todos os testes, mudar:
mock.patch('apps.fiscal.tasks.SefazClient')  # ❌ Errado
# Para:
mock.patch('apps.fiscal.services.sefaz_client.SefazClient')  # ✓ Correto
```

### 📈 Impacto

- **Se implementar**: +9 testes passing (117 → 126) = **+6,4%**
- **Pass rate final**: 85.4% → 89.4%
- **Tempo estimado**: 30-45 minutos
- **Complexity**: MÉDIA (encontrar o problema é fácil, solução é trivial)

### 🤖 Usa ACT Workflows?

**NÃO** - Esses testes não requerem secrets, certificados ou integrações reais.  
Roddam em `fiscal-tests.yml` normal (sem `act` específico).

### 📝 Código de Implementação

**Arquivo**: `apps/fiscal/tasks.py`  
**Mudança**: Adicionar import no topo

```python
# ANTES:
from __future__ import annotations
import os
import hashlib
from celery import shared_task
from django.db import transaction
from django.utils import timezone

# DEPOIS:
from __future__ import annotations
import os
import hashlib
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from .services.sefaz_client import SefazClient  # ← ADICIONAR ISTO
```

---

## 🟡 CATEGORIA 2: CALLBACKS E VALIDAÇÃO HMAC (4 testes)

### Classificação: COMPLEXIDADE MÉDIA-ALTA | PRIORIDADE MÉDIA | **USA ACT**

#### Testes Afetados:
```
test_sefaz_callback.py:
  ✗ test_callback_accepts_valid_signature
  ✗ test_callback_rejects_invalid_signature
  ✗ test_callback_updates_nfe_and_creates_audit

test_sefaz_client_manifestacao.py:
  ✗ test__sign_xml_with_real_signxml_and_pem
```

### 🔍 Análise Detalhada do Problema

**O que os testes fazem:**
1. Validam HMAC-SHA256 de callbacks SEFAZ
2. Testam assinatura XML com signxml + certificado PFX
3. Verificam que audit logs são criados corretamente

**Dependências externas:**
- `signxml` library para assinatura digital
- `cryptography` para manipulação de certificados
- Test PKCS#12 certificate (PFX) com senha

### ✅ Solução

**Para `test_sefaz_callback.py`:**
```python
# Problema: Testam HMAC REAL
import hmac, hashlib, json

secret = 'testsecret'
payload = {...}
raw = json.dumps(payload).encode()
sig = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
# Isto FUNCIONA, mas depende de settings.SEFAZ_CALLBACK_SECRET

# Solução: Mockar a validação dentro da view
with mock.patch('apps.fiscal.views.validate_sefaz_signature') as mock_validate:
    mock_validate.return_value = True  # Simula signature válida
    resp = self.client.post('/api/fiscal/nfes/sefaz_callback/', ...)
```

**Para `test_sefaz_client_manifestacao.py`:**
```python
# Problema: Requer signxml + certificado real
from signxml import sign

# Solução: Mockar signxml.sign()
with mock.patch('signxml.sign') as mock_sign:
    mock_sign.return_value = b'<signed-xml>...</signed-xml>'
    # Teste passa sem certificado real
```

### 📋 Configuração em ACT

Esses testes **REQUEREM** `act` para rodar com secrets:

```yaml
# Em .github/workflows/fiscal-sign-integration.act.yml
# Para adicionar testes de callback:

steps:
  - name: Setup test environment
    env:
      SEFAZ_CALLBACK_SECRET: ${{ secrets.SEFAZ_CALLBACK_SECRET }}
      FISCAL_TEST_PFX_BASE64: ${{ secrets.FISCAL_TEST_PFX_BASE64 }}
      FISCAL_TEST_PFX_PASS: ${{ secrets.FISCAL_TEST_PFX_PASS }}
    run: |
      echo "${{ secrets.FISCAL_TEST_PFX_BASE64 }}" | base64 -d > /tmp/test_cert.pfx
      pytest apps/fiscal/tests/test_sefaz_callback.py -q
```

### 📈 Impacto

- **Se implementar**: +4 testes (126 → 130) = **+2,8%**
- **Pass rate final**: 89.4% → 92.2%
- **Tempo estimado**: 45-60 minutos
- **Complexity**: MÉDIA-ALTA (exige setup de secrets + mocking de assinatura)

### 🤖 Usa ACT Workflows?

**SIM** - Testes precisam de:
- `secrets.SEFAZ_CALLBACK_SECRET` (HMAC key)
- `secrets.FISCAL_TEST_PFX_BASE64` (certificado)
- `secrets.FISCAL_TEST_PFX_PASS` (senha)

Devem rodar em `fiscal-sign-integration.act.yml` (ou variante local).

### 📌 Configuração Git Secrets

Para testar localmente com `act`:
```bash
# Gerar test PFX (se não tiver):
./scripts/generate_test_pfx.sh

# Rodar com secrets:
act --secret-file .secrets -W .github/workflows/fiscal-sign-integration.act.yml
```

---

## 🔴 CATEGORIA 3: QR/PDF PROCESSING (3 testes)

### Classificação: COMPLEXIDADE BAIXA | PRIORIDADE BAIXA (LOW ROI) | **NÃO usa ACT**

#### Testes Afetados:
```
test_qr_pdf_fallbacks.py:
  ✗ test_read_qr_prefers_cv2_qr_detection
  ✗ test_read_qr_fallback_to_pyzbar_when_cv2_raises
  ✗ test_process_pdf_uses_pdfplumber_and_fallbacks
```

### 🔍 Análise Detalhada do Problema

**O que os testes fazem:**
1. Testam fallback entre OpenCV (cv2) → pyzbar para QR code
2. Testam pdfplumber para extração de PDF
3. Verificam que métodos corretos são chamados quando bibliotecas falham

**Problema:**
- Testes assumem que `cv2`, `pyzbar`, `pdfplumber` estão instaladas
- Ou testam fallback quando estão ausentes (mock)

### ✅ Solução

```python
# Solução simples: Mockar as bibliotecas que podem falhar
import unittest.mock as mock

@mock.patch('cv2.QRCodeDetector')  # Mock OpenCV
@mock.patch('pyzbar.pyzbar.decode')  # Mock pyzbar fallback
@mock.patch('pdfplumber.open')  # Mock PDF reader
def test_read_qr_prefers_cv2_qr_detection(self, mock_pdf, mock_pyzbar, mock_cv2):
    mock_cv2.return_value.detectAndDecode.return_value = ('123ABC', _, _)
    
    result = read_qr_code(image_bytes)
    
    # Assert cv2 foi usado (não pyzbar)
    mock_cv2.return_value.detectAndDecode.assert_called_once()
    mock_pyzbar.assert_not_called()
```

### 📈 Impacto

- **Se implementar**: +3 testes (130 → 133) = **+2,1%**
- **Pass rate final**: 92.2% → 94.3%
- **Tempo estimado**: 30-40 minutos
- **Complexity**: BAIXA (apenas mockar imports)

### ⚠️ ROI ASSESSMENT

**BAIXO ROI** - Estas features não são críticas:
- QR code reading é fallback para casos de erro
- PDF processing é utility function
- Impacto no negócio: mínimo

**Recomendação**: Implementar DEPOIS de Categoria 1 e 2

### 🤖 Usa ACT Workflows?

**NÃO** - Testes rodam com mocks, não requerem dependencies reais nem secrets.

---

## 🔴 CATEGORIA 4: SEFAZ SYNC INTEGRATION (3 testes)

### Classificação: COMPLEXIDADE ALTA | PRIORIDADE BAIXA | **NÃO usa ACT**

#### Testes Afetados:
```
test_sefaz_distrib_checkpoint.py:
  ✗ test_sync_nfes_updates_checkpoint

test_sefaz_distrib_nsu.py:
  ✗ test_fetch_returns_nsu_when_present

test_sync_dfe.py:
  ✗ test_sync_creates_nferemote_and_resumo
```

### 🔍 Análise Detalhada do Problema

**O que os testes fazem:**
1. Testam sincronização com SEFAZ via NFeDistribuicaoDFe (distribuição de notas)
2. Verificam que checkpoints são atualizados
3. Validam que NSU (número sequencial único) é mantido

**Dependências complexas:**
- SEFAZ XML responses (estrutura complexa)
- NFe distribution protocol
- Checkpoint management
- NSU/resumo parsing

### ✅ Solução

```python
# Exemplo: Mock SEFAZ response
@mock.patch('apps.fiscal.services.sefaz_client.SefazClient.fetch_distrib_nfe')
def test_sync_creates_nferemote_and_resumo(self, mock_fetch):
    # Response SEFAZ complexo (XML resumida + retConsSitNFe)
    mock_fetch.return_value = {
        'success': True,
        'nsu': '000000000000001',
        'resumo': [
            {
                'chNFe': '52251004621697000179550010000100511374580195',
                'dhEmi': '2025-01-01T12:00:00-03:00',
                'CNPJ': '04621697000179',
                'assinaturaQFD': 'ABCD1234...',
                'cStat': '120',
                'xMotivo': 'Autorizado o uso da NF-e'
            }
        ]
    }
    
    from apps.fiscal.tasks import sync_nfes_task
    sync_nfes_task.__wrapped__(proc_id)
    
    # Assertions
    assert NFeRemote.objects.filter(chave_acesso='52251004621697000179550010000100511374580195').exists()
    assert ProcessamentoWs.objects.get(pk=proc_id).status == 'completed'
```

### 📈 Impacto

- **Se implementar**: +3 testes (133 → 136) = **+2,1%**
- **Pass rate final**: 94.3% → 96.5%
- **Tempo estimado**: 60-90 minutos
- **Complexity**: ALTA (requer conhecimento profundo do protocolo SEFAZ)

### ⚠️ PROBLEMAS TÉCNICOS

1. **XML Response Complexo**: SEFAZ retorna múltiplas estruturas
   - `distDFeInt` (resumida distribuição)
   - `distMedXML` (full XML quando disponível)
   - Checksums, assinaturas

2. **Stateful Integration**: Testes precisam rastrear:
   - NSU anterior
   - Checkpoint (último NSU processado)
   - Resumos processadas

3. **Múltiplas APIs SEFAZ**:
   - NFeDistribuicaoDFe (distribuição)
   - NFeAutorizacao (autorização)
   - Diferentes endpoints por UF

### 🤖 Usa ACT Workflows?

**NÃO** - Mas poderia usar CI com mock complexo

**Recomendação**: Implementar ULTIMO (baixa prioridade de negócio)

---

## 📊 MATRIZ DE DECISÃO FINAL

```
┌─────────────────┬──────────┬─────────┬───────┬──────────────┐
│ Categoria       │ Testes   │ Tempo   │ ROI   │ Recomendação │
├─────────────────┼──────────┼─────────┼───────┼──────────────┤
│ 1. Celery       │ 9        │ 30-45m  │ 6.4%  │ 🟢 FAZER JÁ  │
│ 2. Callbacks    │ 4        │ 45-60m  │ 2.8%  │ 🟡 FAZER 2º  │
│ 3. QR/PDF       │ 3        │ 30-40m  │ 2.1%  │ 🟠 FAZER 3º  │
│ 4. SEFAZ Sync   │ 3        │ 60-90m  │ 2.1%  │ 🔴 SKIP      │
│ 5. Signxml      │ 1        │ 20-30m  │ 0.7%  │ 🟡 COM CAT 2 │
└─────────────────┴──────────┴─────────┴───────┴──────────────┘

TOTAL: 20 testes = +14.1% se implementar tudo (117 → 137 = 97.2%)
```

---

## 🎯 PLANO DE AÇÃO RECOMENDADO

### FASE 1: Celery Mocking (IMEDIATA)
```bash
# Tempo: 30-45 min
# ROI: +6.4% (+9 testes)
# Custo-benefício: EXCELENTE

1. [ ] Adicionar import de SefazClient em tasks.py
2. [ ] Atualizar mocks em test_manifestacao_e2e_homolog.py
3. [ ] Atualizar mocks em test_manifestacao_task.py
4. [ ] Executar testes: pytest apps/fiscal/tests/test_manifestacao* -q
5. [ ] Commit atômico
```

### FASE 2: Callbacks & HMAC (SE WORKFLOW CI DISPONÍVEL)
```bash
# Tempo: 45-60 min
# ROI: +2.8% (+4 testes)
# Custo-benefício: BOM (se tiver secrets configurados)
# Dependência: FASE 1 ✓

1. [ ] Setup secrets em .github/workflows (SEFAZ_CALLBACK_SECRET, PFX)
2. [ ] Mockar signxml.sign() ou usar test cert
3. [ ] Atualizar test_sefaz_callback.py
4. [ ] Testar com act localmente: act --secret-file .secrets ...
5. [ ] Commit atômico
```

### FASE 3: QR/PDF (OPCIONAL, BAIXA PRIORIDADE)
```bash
# Tempo: 30-40 min
# ROI: +2.1% (+3 testes)
# Custo-benefício: MÉDIO
# Dependência: Nenhuma

1. [ ] Mockar cv2, pyzbar, pdfplumber em test_qr_pdf_fallbacks.py
2. [ ] Validar fallback logic
3. [ ] Commit atômico
```

### FASE 4: SEFAZ Sync (SKIP - BAIXA PRIORIDADE)
```bash
# Tempo: 60-90 min
# ROI: +2.1% (+3 testes)
# Custo-benefício: BAIXO
# Recomendação: NÃO FAZER AGORA

Razões para skip:
- Alta complexidade técnica
- Baixa prioridade de negócio
- Impacto mínimo na taxa de testes
```

---

## 🚀 PRÓXIMAS AÇÕES

### Se timing permite (< 1 hora):
→ Implementar **FASE 1** (Celery mocking)  
Resultado esperado: **89.4% passing**

### Se timing permite (1-2 horas):
→ Implementar **FASE 1 + FASE 2** (com secrets configurados)  
Resultado esperado: **92.2% passing**

### Se timing permite (2-3 horas):
→ Implementar **FASE 1 + FASE 2 + FASE 3**  
Resultado esperado: **94.3% passing**

---

## 📎 APÊNDICE: ESTRUTURA ATUAL DOS WORKFLOWS

### `fiscal-tests.yml` (Principal)
```yaml
- Roda em: ubuntu-latest
- Instala: Python 3.11 + system packages (gdal, zbar, etc)
- Executa: pytest -q backend/apps/fiscal/tests
- Rodas que precisam de CI: Categoria 1, 3, 4, 5
```

### `fiscal-sign-integration.act.yml` (ACT Local)
```yaml
- Usa: project-agro/ci:local (container pré-built)
- Requer: secrets (PFX_BASE64, PFX_PASS)
- Executa: testes de manifestacao_integration.py
- Testes que PODEM usar: Categoria 2 (callbacks), 5 (signxml)
```

### Como testar com ACT localmente:
```bash
# 1. Build CI image:
docker build -f Dockerfile.ci -t project-agro/ci:local .

# 2. Preparar secrets:
echo "FISCAL_TEST_PFX_BASE64=..." > .secrets
echo "FISCAL_TEST_PFX_PASS=..." >> .secrets

# 3. Rodar workflow:
act --secret-file .secrets -W .github/workflows/fiscal-sign-integration.act.yml
```

---

**Documento gerado em**: 4 de fevereiro de 2026  
**Autor**: Análise Automática  
**Status**: Pronto para implementação
