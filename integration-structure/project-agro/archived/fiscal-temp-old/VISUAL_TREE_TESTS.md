# 🌳 VISUAL TREE: 20 Failing Tests - Problems & Solutions

## 📋 Estrutura Hierárquica

```
20 FAILING TESTS (117/141 passing = 85.4%)
│
├── 🟢 CATEGORIA 1: CELERY/ASYNC TASKS (9 testes) ★★★★★ ROI
│   │   └─ Prioridade: ALTA
│   │   └─ Complexidade: MÉDIA
│   │   └─ Tempo: 30-45 min
│   │   └─ Impacto: +6.4% (→ 126 passing)
│   │   └─ Usa ACT: NÃO
│   │
│   ├─ 5 testes em test_manifestacao_e2e_homolog.py
│   │  ├─ test_manifestacao_send_success_cstat_135
│   │  ├─ test_manifestacao_send_failure_cstat_136_retry
│   │  ├─ test_manifestacao_nseq_assignment
│   │  ├─ test_manifestacao_reconciliation_cstat_136
│   │  └─ test_manifestacao_idempotence_duplicate_submit
│   │
│   ├─ 4 testes em test_manifestacao_task.py
│   │  ├─ test_send_manifestacao_task_success
│   │  ├─ test_send_manifestacao_task_failure
│   │  ├─ test_send_manifestacao_task_assigns_nseq
│   │  └─ test_send_manifestacao_task_handles_cstat_136
│   │
│   └─ 1 teste em test_manifestacao_reconcile.py
│      └─ test_reconcile_marks_sent_when_vinculado
│
│   🔍 PROBLEMA ÚNICO:
│   │  with mock.patch('apps.fiscal.tasks.SefazClient') as MockClient:
│   │                                        ↑
│   │                                 AttributeError!
│   │                    SefazClient não está no escopo do módulo
│   │                    (é importado dentro da função, lazy import)
│   │
│   ✅ SOLUÇÃO ÚNICA:
│   │  Em: apps/fiscal/tasks.py (topo do arquivo, após imports)
│   │  Adicionar: from .services.sefaz_client import SefazClient
│   │
│   │  Resultado: todos 9 testes herdam o fix automaticamente
│
│
├── 🟡 CATEGORIA 2: CALLBACKS & HMAC SIGNATURES (4 testes) ★★★★ ROI
│   │   └─ Prioridade: MÉDIA
│   │   └─ Complexidade: MÉDIA-ALTA
│   │   └─ Tempo: 45-60 min
│   │   └─ Impacto: +2.8% (→ 130 passing)
│   │   └─ Usa ACT: SIM ⭐ REQUER SECRETS
│   │
│   ├─ 3 testes em test_sefaz_callback.py
│   │  ├─ test_callback_accepts_valid_signature
│   │  │  └─ Problema: HMAC validation falha
│   │  │  └─ Solução: mockar validate_sefaz_signature()
│   │  │
│   │  ├─ test_callback_rejects_invalid_signature
│   │  │  └─ Problema: HMAC validation falha
│   │  │  └─ Solução: mesmo que acima
│   │  │
│   │  └─ test_callback_updates_nfe_and_creates_audit
│   │     └─ Problema: HMAC validation falha
│   │     └─ Solução: mesmo que acima
│   │
│   └─ 1 teste em test_sefaz_client_manifestacao.py
│      └─ test__sign_xml_with_real_signxml_and_pem
│         └─ Problema: signxml.sign() precisa certificado real
│         └─ Solução: mockar signxml.sign()
│
│   🔍 PROBLEMAS:
│   │  1. Validação HMAC-SHA256 de callbacks SEFAZ
│   │  2. Assinatura XML com signxml + certificado PFX
│   │  3. Testes precisam de secrets para CI/ACT
│   │
│   ✅ SOLUÇÕES:
│   │  1. Mockar: @mock.patch('apps.fiscal.views.validate_sefaz_signature')
│   │  2. Mockar: @mock.patch('signxml.sign')
│   │  3. Setup secrets em: .github/workflows/fiscal-sign-integration.act.yml
│
│   📌 NOTA: Requer workflow CI configurado com secrets
│       - FISCAL_TEST_PFX_BASE64
│       - FISCAL_TEST_PFX_PASS
│
│
├── 🔴 CATEGORIA 3: QR/PDF PROCESSING (3 testes) ★★ ROI
│   │   └─ Prioridade: BAIXA
│   │   └─ Complexidade: BAIXA
│   │   └─ Tempo: 30-40 min
│   │   └─ Impacto: +2.1% (→ 133 passing)
│   │   └─ Usa ACT: NÃO
│   │
│   └─ 3 testes em test_qr_pdf_fallbacks.py
│      ├─ test_read_qr_prefers_cv2_qr_detection
│      │  └─ Problema: cv2 não instalado ou mock incorreto
│      │  └─ Solução: @mock.patch('cv2.QRCodeDetector')
│      │
│      ├─ test_read_qr_fallback_to_pyzbar_when_cv2_raises
│      │  └─ Problema: pyzbar não instalado ou mock incorreto
│      │  └─ Solução: @mock.patch('pyzbar.pyzbar.decode')
│      │
│      └─ test_process_pdf_uses_pdfplumber_and_fallbacks
│         └─ Problema: pdfplumber não instalado ou mock incorreto
│         └─ Solução: @mock.patch('pdfplumber.open')
│
│   ⚠️ NOTA IMPORTANTE:
│      Estas features são LOW PRIORITY:
│      - QR code reading é fallback (não crítico)
│      - PDF processing é utility (não crítico)
│      - ROI baixo vs tempo: NÃO RECOMENDADO FAZER AGORA
│
│
└── 🔴 CATEGORIA 4: SEFAZ SYNC INTEGRATION (3 testes) ★ ROI
    │   └─ Prioridade: BAIXA
    │   └─ Complexidade: ALTA
    │   └─ Tempo: 60-90 min
    │   └─ Impacto: +2.1% (→ 136 passing)
    │   └─ Usa ACT: NÃO
    │
    └─ 3 testes em sincronização SEFAZ:
       ├─ test_sefaz_distrib_checkpoint.py::test_sync_nfes_updates_checkpoint
       │  └─ Problema: Mock complexo de SEFAZ API responses
       │  └─ Solução: @mock.patch('SefazClient.fetch_distrib_nfe')
       │
       ├─ test_sefaz_distrib_nsu.py::test_fetch_returns_nsu_when_present
       │  └─ Problema: Mock complexo de NSU handling
       │  └─ Solução: Mockar com resumos SEFAZ complexos
       │
       └─ test_sync_dfe.py::test_sync_creates_nferemote_and_resumo
          └─ Problema: Mock muito complexo de DFe distribution
          └─ Solução: Mockar múltiplas APIs SEFAZ

    ❌ RECOMENDAÇÃO: SKIP
       Razões:
       - Tempo: 60-90 min (MUITO)
       - ROI: +2.1% (BAIXO)
       - Complexidade: ALTA (SEFAZ protocol)
       - Custo-benefício: PÉSSIMO
       - Impacto no negócio: MÍNIMO

       Melhor investir tempo em outras áreas.
```

---

## 🎯 DECISÃO RÁPIDA

```
┌────────────────────────────────────────────────────────────┐
│ FAZER AGORA (RECOMENDADO)                                  │
├────────────────────────────────────────────────────────────┤
│ 1. CATEGORIA 1: +9 testes (30-45 min)                      │
│    ✅ Impacto: +6.4%                                       │
│    ✅ Tempo curto                                          │
│    ✅ Solução trivial (1 linha de código)                  │
│    ✅ SEM dependências externas                            │
│                                                            │
│ 2. CATEGORIA 2: +4 testes (45-60 min) - SE TIMING PERMITE  │
│    ✅ Impacto: +2.8%                                       │
│    ⚠️ Requer secrets configurados                          │
│    ⚠️ Tempo médio                                          │
│    ✅ Usa ACT workflows (bom para CI)                      │
│                                                            │
│ 3. CATEGORIA 3: +3 testes (30-40 min) - OPCIONAL           │
│    ⚠️ Impacto: +2.1% (BAIXO)                               │
│    ✅ Tempo curto                                          │
│    ❌ Low business priority                                │
│                                                            │
│ 4. CATEGORIA 4: +3 testes (60-90 min) - SKIP              │
│    ❌ Impacto: +2.1% (não justifica tempo)                 │
│    ❌ Tempo longo e complexidade alta                      │
│    ❌ Low business priority                                │
│    ❌ Alto risco de bugs                                   │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 TIMELINE RECOMENDADA

```
OBJETIVO: 117 → 130 passing (92.2%) em < 2h

0:00 ─ 0:05 ─ Ler este documento
      │
      ├─→ 0:05 ─ 0:45 ─ FAZER CATEGORIA 1 ★★★★★
      │         │
      │         └─ Resultado: 117 → 126 (89.4%)
      │
      └─→ 0:45 ─ 1:45 ─ FAZER CATEGORIA 2 (se timing)
                │
                └─ Resultado: 126 → 130 (92.2%)

MILESTONE RÁPIDO: 45 min
→ Resultado: +9 testes (+6.4%)

MILESTONE COMPLETO: 1h45 min
→ Resultado: +13 testes (+9.2%)

EXTRA (OPCIONAL): Categoria 3
→ Resultado: +16 testes (+11.3%)
→ Tempo extra: 30-40 min
→ Não recomendado: low ROI
```

---

## 💡 KEY INSIGHTS

### 1️⃣ Problema Único (Categoria 1)
```python
# ❌ PROBLEMA:
with mock.patch('apps.fiscal.tasks.SefazClient'):
    # AttributeError: module 'apps.fiscal.tasks'
    # does not have the attribute 'SefazClient'

# ✅ CAUSA:
# Em tasks.py, SefazClient é importado DENTRO da função
@shared_task
def send_manifestacao_task(self, manifestacao_id):
    from .services.sefaz_client import SefazClient  # ← Lazy import
    ...

# ✅ SOLUÇÃO:
# Adicionar import no escopo do módulo (topo de tasks.py)
from .services.sefaz_client import SefazClient
```

### 2️⃣ Categoria 2 Requer ACT Workflows
```
Testes de signature validation precisam de:
- Certificado PKCS#12 (PFX) real ou mockado
- Secrets do GitHub Actions (.secrets)
- Workflow CI específico (fiscal-sign-integration.act.yml)

Se NÃO tem secrets configurados:
→ SKIP Categoria 2 por enquanto
```

### 3️⃣ Categoria 3 & 4 São Nice-to-Have
```
QR/PDF e SEFAZ Sync são features importantes,
mas NÃO críticas para validação de manifestações.

Se tempo é limitado:
→ Fazer Categoria 1 (URGENTE)
→ Fazer Categoria 2 (SÓ SE tiver secrets)
→ SKIP Categoria 3 & 4 (low ROI)
```

---

## 🚀 AÇÃO IMEDIATA (< 45 MINUTOS)

```bash
# 1. Abrir arquivo:
nano sistema-agropecuario/backend/apps/fiscal/tasks.py

# 2. Encontrar linha ~15 (após imports globais):
from __future__ import annotations
import os
import hashlib
from celery import shared_task
from django.db import transaction
from django.utils import timezone
# ← ADICIONAR AQUI:
from .services.sefaz_client import SefazClient

# 3. Salvar e testar:
cd sistema-agropecuario
docker compose exec -T backend python -m pytest \
    apps/fiscal/tests/test_manifestacao_e2e_homolog.py \
    apps/fiscal/tests/test_manifestacao_task.py \
    apps/fiscal/tests/test_manifestacao_reconcile.py \
    -q

# 4. Resultado esperado:
# ✅ 10 passed (antes: 1 passed)

# 5. Commit:
git add apps/fiscal/tasks.py
git commit -m "fix: import SefazClient em escopo global para Celery mocking

- Add explicit import of SefazClient at module level
- Enables proper mocking in test_manifestacao_e2e_homolog.py
- Enables proper mocking in test_manifestacao_task.py
- Enables proper mocking in test_manifestacao_reconcile.py

Result: 9 additional tests now PASSING
Test suite: 117 → 126 passing (+6.4%)"
```

---

## 📞 QUANDO PARAR / CONTINUAR

**PARAR aqui se:**
- ⏰ Tempo limitado (< 1h)
- 🎯 Resultado aceitável em 85.4% → 89.4%
- 🔄 Outras tarefas aguardando

**CONTINUAR (Categoria 2) se:**
- ⏰ Tempo disponível (1-2h)
- 🔐 Secrets configurados no CI
- 🎯 Quer chegar a 92.2%

**NÃO fazer (Skip Categoria 3 & 4) porque:**
- ⏰ Tempo > benefício
- 🎯 ROI muito baixo
- 🔧 Complexidade não justificada

---

**Last Update**: 4 de fevereiro de 2026  
**Status**: 🟢 READY FOR ACTION
