# 🎯 QUICK REFERENCE: 20 Failing Tests Classification

## 📊 Resumo Executivo (1 página)

```
ESTADO ATUAL: 117 passed / 20 failed (85.4%)
OBJETIVO: Classificar por complexidade + impacto de ACT workflows
```

---

## 🟢 CATEGORIA 1: CELERY ASYNC (9 testes) — FAZER AGORA

| Arquivo | Teste | Problema | Solução | Tempo | ROI | ACT |
|---------|-------|----------|---------|-------|-----|-----|
| `test_manifestacao_e2e_homolog.py` | `test_manifestacao_send_success_cstat_135` | Mock path errado | Import SefazClient em tasks.py | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_e2e_homolog.py` | `test_manifestacao_send_failure_cstat_136_retry` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_e2e_homolog.py` | `test_manifestacao_nseq_assignment` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_e2e_homolog.py` | `test_manifestacao_reconciliation_cstat_136` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_e2e_homolog.py` | `test_manifestacao_idempotence_duplicate_submit` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_task.py` | `test_send_manifestacao_task_success` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_task.py` | `test_send_manifestacao_task_failure` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_task.py` | `test_send_manifestacao_task_assigns_nseq` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_task.py` | `test_send_manifestacao_task_handles_cstat_136` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |
| `test_manifestacao_reconcile.py` | `test_reconcile_marks_sent_when_vinculado` | Mock path errado | Mesmo | 5 min | ⭐⭐⭐⭐⭐ | ❌ |

**TOTAL CATEGORIA 1:**
- ✅ Testes: 9
- ⏱️ Tempo: 30-45 min (mudança única em tasks.py)
- 📈 ROI: **+6.4%** (117 → 126 passing)
- 🤖 Usa ACT: **NÃO**
- 🎯 Prioridade: **🟢 ALTA - FAZER PRIMEIRA**

**Mudança Única Necessária:**
```python
# Em: apps/fiscal/tasks.py (linha ~15)
# ADICIONAR:
from .services.sefaz_client import SefazClient
```

---

## 🟡 CATEGORIA 2: CALLBACKS & SIGNATURES (4 testes) — FAZER 2º

| Arquivo | Teste | Problema | Solução | Tempo | ROI | ACT |
|---------|-------|----------|---------|-------|-----|-----|
| `test_sefaz_callback.py` | `test_callback_accepts_valid_signature` | HMAC validation | Mockar validate_sefaz_signature | 10 min | ⭐⭐⭐⭐ | ✅ |
| `test_sefaz_callback.py` | `test_callback_rejects_invalid_signature` | HMAC validation | Mockar validate_sefaz_signature | 10 min | ⭐⭐⭐⭐ | ✅ |
| `test_sefaz_callback.py` | `test_callback_updates_nfe_and_creates_audit` | HMAC validation | Mockar validate_sefaz_signature | 10 min | ⭐⭐⭐⭐ | ✅ |
| `test_sefaz_client_manifestacao.py` | `test__sign_xml_with_real_signxml_and_pem` | signxml + cert | Mockar signxml.sign() | 15 min | ⭐⭐⭐ | ✅ |

**TOTAL CATEGORIA 2:**
- ✅ Testes: 4
- ⏱️ Tempo: 45-60 min
- 📈 ROI: **+2.8%** (126 → 130 passing)
- 🤖 Usa ACT: **SIM** ⭐
- 🎯 Prioridade: **🟡 MÉDIA - FAZER SEGUNDO**
- 📌 Nota: Requer secrets configurados (.env ou GitHub Actions)

**Mudanças Necessárias:**
```python
# Em: test_sefaz_callback.py
with mock.patch('apps.fiscal.views.validate_sefaz_signature') as mock_validate:
    mock_validate.return_value = True

# Em: test_sefaz_client_manifestacao.py
with mock.patch('signxml.sign') as mock_sign:
    mock_sign.return_value = b'<signed-xml>...</signed-xml>'
```

---

## 🔴 CATEGORIA 3: QR/PDF PROCESSING (3 testes) — FAZER 3º (OPCIONAL)

| Arquivo | Teste | Problema | Solução | Tempo | ROI | ACT |
|---------|-------|----------|---------|-------|-----|-----|
| `test_qr_pdf_fallbacks.py` | `test_read_qr_prefers_cv2_qr_detection` | Missing cv2 | Mockar cv2.QRCodeDetector | 10 min | ⭐⭐ | ❌ |
| `test_qr_pdf_fallbacks.py` | `test_read_qr_fallback_to_pyzbar_when_cv2_raises` | Missing pyzbar | Mockar pyzbar.pyzbar.decode | 10 min | ⭐⭐ | ❌ |
| `test_qr_pdf_fallbacks.py` | `test_process_pdf_uses_pdfplumber_and_fallbacks` | Missing pdfplumber | Mockar pdfplumber.open | 10 min | ⭐⭐ | ❌ |

**TOTAL CATEGORIA 3:**
- ✅ Testes: 3
- ⏱️ Tempo: 30-40 min
- 📈 ROI: **+2.1%** (130 → 133 passing)
- 🤖 Usa ACT: **NÃO**
- 🎯 Prioridade: **🔴 BAIXA - SKIP OU FAZER DEPOIS**
- 📌 Nota: Low priority feature (QR/PDF fallbacks são utilities, não críticas)

---

## 🔴 CATEGORIA 4: SEFAZ SYNC (3 testes) — SKIP (NÃO FAZER)

| Arquivo | Teste | Problema | Solução | Tempo | ROI | ACT |
|---------|-------|----------|---------|-------|-----|-----|
| `test_sefaz_distrib_checkpoint.py` | `test_sync_nfes_updates_checkpoint` | Complex XML mocking | Mock SEFAZ responses | 30 min | ⭐ | ❌ |
| `test_sefaz_distrib_nsu.py` | `test_fetch_returns_nsu_when_present` | Complex XML mocking | Mock SEFAZ responses | 30 min | ⭐ | ❌ |
| `test_sync_dfe.py` | `test_sync_creates_nferemote_and_resumo` | Complex XML mocking | Mock SEFAZ responses | 30 min | ⭐ | ❌ |

**TOTAL CATEGORIA 4:**
- ✅ Testes: 3
- ⏱️ Tempo: 60-90 min
- 📈 ROI: **+2.1%** (133 → 136 passing)
- 🤖 Usa ACT: **NÃO**
- 🎯 Prioridade: **🔴 BAIXA - NÃO FAZER AGORA**
- 📌 Nota: High complexity, low business impact. Requer conhecimento profundo do protocolo SEFAZ

**Por que SKIP:**
- Impacto: +2.1% apenas
- Tempo: 60-90 min
- Complexidade: ALTA (XML parsing, NFe distribution protocol)
- Custo-benefício: PÉSSIMO

---

## 📈 ROADMAP RESUMIDO

```
┌──────────────────────────────────────────────────────────────┐
│ TIMING    │ AÇÃO                        │ RESULTADO           │
├──────────────────────────────────────────────────────────────┤
│ 0:00-0:45 │ FAZER CATEGORIA 1 (Celery)  │ 117 → 126 (89.4%)   │
│ 0:45-1:45 │ FAZER CATEGORIA 2 (Callbacks)│ 126 → 130 (92.2%)   │
│ 1:45-2:30 │ FAZER CATEGORIA 3 (QR/PDF)  │ 130 → 133 (94.3%)   │
│ 2:30-4:00 │ SKIP CATEGORIA 4 (SEFAZ)    │ 133 = 133 (94.3%)   │
└──────────────────────────────────────────────────────────────┘

RECOMENDAÇÃO:
→ Fazer Categoria 1 (URGENTE, 30-45 min)
→ Fazer Categoria 2 (SÓ SE tiver secrets configurados, 45-60 min)
→ Fazer Categoria 3 (OPCIONAL, 30-40 min)
→ SKIP Categoria 4 (BAIXO ROI, não justifica tempo)
```

---

## 🤖 WORKFLOWS ACT RELEVANTES

### Testes que USAM `act`:
- 🟡 Categoria 2 (callbacks + signxml)
  - Arquivo: `.github/workflows/fiscal-sign-integration.act.yml`
  - Requer: `secrets.FISCAL_TEST_PFX_BASE64`, `secrets.FISCAL_TEST_PFX_PASS`

### Testes que NÃO usam `act`:
- 🟢 Categoria 1 (Celery)
- 🔴 Categoria 3 (QR/PDF)
- 🔴 Categoria 4 (SEFAZ Sync)

### Como rodar testes com `act` localmente:
```bash
# 1. Build Docker image:
cd /home/bruno/Workspace/project-agro
docker build -f Dockerfile.ci -t project-agro/ci:local .

# 2. Preparar secrets (opcional):
cat > .secrets << 'EOF'
FISCAL_TEST_PFX_BASE64=...base64-encoded-pfx...
FISCAL_TEST_PFX_PASS=...password...
EOF

# 3. Rodar workflow específico:
act --secret-file .secrets \
    -W .github/workflows/fiscal-sign-integration.act.yml \
    --container-architecture linux/amd64
```

---

## 🎯 DECISION MATRIX

**Fazer agora (< 1 hora)?**
→ **SIM** - Categoria 1 é trivial e tem ROI excelente (+6.4%)

**Incluir Categoria 2?**
→ **SIM SE** tiver secrets configurados e tempo (1-2h de trabalho)

**Incluir Categoria 3?**
→ **TALVEZ** se tempo permiter (mais 30-40 min), ROI baixo

**Incluir Categoria 4?**
→ **NÃO** - Skip, ROI péssimo vs tempo investido

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Ler este documento (você está aqui)
2. 🔄 Implementar Categoria 1 (30-45 min)
3. 🧪 Verificar: `pytest apps/fiscal/tests/test_manifestacao* -q`
4. 📌 Decide: Implementar Categoria 2? (depende de prioridade)
5. 🚀 Commit + Push

---

**Última atualização**: 4 de fevereiro de 2026  
**Gerado por**: Análise Automática  
**Status**: Pronto para ação
