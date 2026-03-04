# 🤖 ACT WORKFLOWS ANALYSIS - Which Tests Need CI/ACT?

## 📋 Resumo: Quais testes usam `act` workflows?

```
PERGUNTA: Dos 20 testes falhando, quantos requerem GitHub Actions CI
         com act para funcionar?

RESPOSTA:
- 13 testes: Rodam em CI normal (fiscal-tests.yml)
-  4 testes: Requerem setup de secrets + act (fiscal-sign-integration.act.yml)
-  3 testes: Podem usar act, mas não obrigatório

TOTAL QUE PRECISAM DE ACT: 4-7 testes (dependendo de configuração)
```

---

## 🟢 TESTES QUE NÃO USAM ACT (13)

```
✅ CATEGORIA 1: CELERY/ASYNC (9 testes)
   - test_manifestacao_e2e_homolog.py (5 testes)
   - test_manifestacao_task.py (4 testes)

   Por quê NÃO precisam de ACT:
   → Rodam com mock de SefazClient
   → Não requerem certificado real
   → Não requerem secrets
   → Rodam em fiscal-tests.yml normal

   Rodas com: pytest apps/fiscal/tests/test_manifestacao* -q


✅ CATEGORIA 3: QR/PDF (3 testes)
   - test_qr_pdf_fallbacks.py

   Por quê NÃO precisam de ACT:
   → Rodam com mock de cv2, pyzbar, pdfplumber
   → Não requerem libraries reais
   → Não requerem secrets

   Rodas com: pytest apps/fiscal/tests/test_qr_pdf_fallbacks.py -q


✅ CATEGORIA 4: SEFAZ SYNC (3 testes)
   - test_sefaz_distrib_checkpoint.py (1 teste)
   - test_sefaz_distrib_nsu.py (1 teste)
   - test_sync_dfe.py (1 teste)

   Por quê NÃO precisam de ACT:
   → Rodam com mock de SEFAZ responses
   → Não requerem API SEFAZ real
   → Não requerem secrets

   Rodas com: pytest apps/fiscal/tests/test_sefaz* -q
```

---

## 🟡 TESTES QUE USAM ACT (4 - REQUER SECRETS)

```
⭐ CATEGORIA 2: CALLBACKS & SIGNATURES (4 testes)

test_sefaz_callback.py:
├─ test_callback_accepts_valid_signature ⭐
├─ test_callback_rejects_invalid_signature ⭐
└─ test_callback_updates_nfe_and_creates_audit ⭐

test_sefaz_client_manifestacao.py:
└─ test__sign_xml_with_real_signxml_and_pem ⭐


RAZÃO: Requerem secrets do GitHub Actions
┌─────────────────────────────────────────────────┐
│ SECRETS NECESSÁRIOS:                            │
├─────────────────────────────────────────────────┤
│ 1. FISCAL_TEST_PFX_BASE64                       │
│    └─ Certificado PKCS#12 em base64             │
│    └─ Usado em: test_sefaz_client_manifestacao  │
│                                                 │
│ 2. FISCAL_TEST_PFX_PASS                         │
│    └─ Senha do certificado PFX                  │
│    └─ Usado em: test_sefaz_client_manifestacao  │
│                                                 │
│ 3. SEFAZ_CALLBACK_SECRET (opcional)             │
│    └─ HMAC key para validar callbacks           │
│    └─ Usado em: test_sefaz_callback.py          │
└─────────────────────────────────────────────────┘


CONFIGURAÇÃO NECESSÁRIA:
┌─────────────────────────────────────────────────┐
│ .github/workflows/fiscal-sign-integration.act.yml
│                                                 │
│ on: workflow_dispatch                           │
│                                                 │
│ jobs:                                           │
│   signature-integration:                        │
│     container:                                  │
│       image: project-agro/ci:local              │
│                                                 │
│     steps:                                      │
│       - name: Restore test PFX from secrets     │
│         run: |                                  │
│           echo "${{ secrets.FISCAL_TEST_PFX_BASE64 }}" \│
│             | base64 -d > /tmp/test_cert.pfx   │
│           export FISCAL_TEST_PFX_PATH=/tmp/test_cert.pfx
│           export FISCAL_TEST_PFX_PASS=${{ secrets.FISCAL_TEST_PFX_PASS }}
│                                                 │
│       - name: Run callback tests                │
│         run: |                                  │
│           cd sistema-agropecuario/backend       │
│           python -m pytest \                    │
│             apps/fiscal/tests/test_sefaz_callback.py \
│             apps/fiscal/tests/test_sefaz_client_manifestacao.py \
│             -q                                  │
└─────────────────────────────────────────────────┘


COMO RODAR LOCALMENTE COM ACT:
┌─────────────────────────────────────────────────┐
│ # 1. Build CI Docker image:                     │
│ $ docker build -f Dockerfile.ci \               │
│     -t project-agro/ci:local .                  │
│                                                 │
│ # 2. Preparar secrets:                          │
│ $ cat > .secrets << 'EOF'                       │
│ FISCAL_TEST_PFX_BASE64=<base64-encoded-pfx>    │
│ FISCAL_TEST_PFX_PASS=<password>                 │
│ SEFAZ_CALLBACK_SECRET=testsecret123             │
│ EOF                                             │
│                                                 │
│ # 3. Rodar workflow:                            │
│ $ act --secret-file .secrets \                  │
│       -W .github/workflows/fiscal-sign-integration.act.yml
│                                                 │
│ # 4. Esperar resultado...                       │
│ $ # Esperado: 4 testes PASSING                  │
└─────────────────────────────────────────────────┘
```

---

## 📊 MATRIZ: ACT vs. CI Normal

```
╔═══════════════════════════════════════════════════════════════════╗
║ TESTE                      │ CI NORMAL │ ACT WORKFLOW │ REQUER    ║
║                            │(fiscal-   │ (sign-integ.)│ SECRETS   ║
║                            │tests.yml) │              │           ║
╠═══════════════════════════════════════════════════════════════════╣
║ Categoria 1: Celery (9)    │     ✅     │      ❌      │    ❌     ║
║ Categoria 2: Callbacks (3) │     ❌     │      ✅      │    ✅     ║
║ Categoria 2: Signxml (1)   │     ❌     │      ✅      │    ✅     ║
║ Categoria 3: QR/PDF (3)    │     ✅     │      ❌      │    ❌     ║
║ Categoria 4: SEFAZ (3)     │     ✅     │      ❌      │    ❌     ║
╚═══════════════════════════════════════════════════════════════════╝

LEGENDA:
✅ = Pode rodar em este workflow
❌ = Não roda / Não precisa deste workflow
```

---

## 🎯 DECISÃO: ACT é NECESSÁRIO?

### ✅ SIM, se você quer testar:
- Validação HMAC-SHA256 de callbacks SEFAZ
- Assinatura XML com signxml + certificado PFX
- Integração real com SEFAZ signature

**Impacto**: +4 testes (2.8%)

### ❌ NÃO, se você só quer:
- Fixar Celery mocking (Categoria 1)
- Testar QR/PDF fallbacks (Categoria 3)
- Testar SEFAZ sync com mocks (Categoria 4)

**Impacto**: +13 testes (9.2% sem ACT, 12% com ACT)

---

## 🚀 ROADMAP COM ACT

### OPÇÃO A: SEM ACT (Mais rápido, 85% cobertura)

```
Tempo: 45 min
Implementar: Categoria 1 (Celery)
Resultado: 117 → 126 (89.4%)

Por quê:
✅ Rápido (30-45 min)
✅ Sem dependências externas
✅ Impacto imediato (+6.4%)
✅ Roda em fiscal-tests.yml normal

Exemplo: CI pipeline normal continua funcionando
```

### OPÇÃO B: COM ACT (Completo, 92% cobertura)

```
Tempo: 1h45 min
Implementar: Categoria 1 + 2
Resultado: 117 → 130 (92.2%)

Por quê:
✅ Mais completo (testa assinatura real)
⚠️ Requer setup de secrets
⚠️ Requer Docker image build
⚠️ Mais complexo

Passos:
1. Build Dockerfile.ci → project-agro/ci:local
2. Gerar test PFX ou usar existente
3. Configurar secrets em GitHub Actions
4. Rodar fiscal-sign-integration.act.yml
```

---

## 📌 SECRETS CONFIGURAÇÃO

### GitHub Actions (Produção)

```yaml
# Em: Settings → Secrets and variables → Actions

Adicionar secrets:
├─ FISCAL_TEST_PFX_BASE64
│  └─ Obter: base64 -w 0 /tmp/test_cert.pfx > /tmp/pfx.b64
│
├─ FISCAL_TEST_PFX_PASS
│  └─ Valor: <password-do-certificado>
│
└─ SEFAZ_CALLBACK_SECRET
   └─ Valor: <hmac-key-para-callbacks>
```

### Local (.secrets para act)

```bash
# Criar arquivo .secrets:
cat > .secrets << 'EOF'
FISCAL_TEST_PFX_BASE64=$(base64 -w 0 /tmp/test_cert.pfx)
FISCAL_TEST_PFX_PASS=senha123
SEFAZ_CALLBACK_SECRET=testsecret123
EOF

# Usar com act:
act --secret-file .secrets -W .github/workflows/fiscal-sign-integration.act.yml
```

---

## 🔍 COMO IDENTIFICAR SE TEST USA ACT

```python
# INDICADORES DE QUE USA ACT:

# 1. Testa com certificado real
from cryptography.hazmat.primitives.serialization import pkcs12
# → Precisa de secrets (PFX)

# 2. Usa signxml
from signxml import sign
# → Precisa de certificado real

# 3. Testa HMAC signature validation
import hmac
import hashlib
sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
# → Precisa de SEFAZ_CALLBACK_SECRET

# 4. Referencia secrets do GitHub
${{ secrets.FISCAL_TEST_PFX_BASE64 }}
# → Workflow de ACT é necessário


# INDICADORES DE QUE NÃO USA ACT:

# 1. Mock de biblioteca externa
@mock.patch('cv2.QRCodeDetector')
@mock.patch('pyzbar.pyzbar.decode')
# → Não precisa de ACT

# 2. Lazy imports mockados
@mock.patch('apps.fiscal.services.sefaz_client.SefazClient')
# → Não precisa de ACT

# 3. Simula apenas comportamento lógico
with mock.patch('...') as mock_client:
    mock_client.send_manifestacao.return_value = {...}
# → Não precisa de ACT
```

---

## 🎯 RECOMENDAÇÃO FINAL

```
┌──────────────────────────────────────────────────────────┐
│ SE TEMPO < 1 HORA                                        │
├──────────────────────────────────────────────────────────┤
│ → Implementar Categoria 1 SEM ACT                        │
│ → Resultado: 89.4% (117 → 126)                           │
│ → NÃO precisa de ACT                                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ SE TEMPO 1-2 HORAS E SECRETS CONFIGURADOS                │
├──────────────────────────────────────────────────────────┤
│ → Implementar Categoria 1 + 2                            │
│ → Resultado: 92.2% (117 → 130)                           │
│ → REQUER ACT + secrets                                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ SE TEMPO > 2 HORAS E QUER MÁXIMO COVERAGE                │
├──────────────────────────────────────────────────────────┤
│ → Implementar Categoria 1 + 2 + 3                        │
│ → Resultado: 94.3% (117 → 133)                           │
│ → Categoria 3 não precisa de ACT                         │
│ → SKIP Categoria 4 (baixo ROI)                           │
└──────────────────────────────────────────────────────────┘
```

---

## 📞 CHECKLIST: ACT Setup

```
Se você decidir usar ACT, verificar:

□ Docker está instalado?
  └─ docker --version

□ Dockerfile.ci existe?
  └─ ls -la Dockerfile.ci

□ ACT está instalado?
  └─ act --version
  └─ Senão: sudo apt install act (ou brew install act)

□ Certificado PKCS#12 (PFX) disponível?
  └─ ls -la /tmp/test_cert.pfx (ou similar)

□ Secrets estão em .github/workflows/fiscal-sign-integration.act.yml?
  └─ grep FISCAL_TEST_PFX_BASE64 .github/workflows/*

□ Pode rodar act localmente?
  └─ act --secret-file .secrets -l (listar workflows)

□ Timeout suficiente?
  └─ ACT pode levar 10-15 min (build + test)
```

---

**Last Update**: 4 de fevereiro de 2026  
**Status**: 🟢 READY FOR IMPLEMENTATION

---

## 💬 SUMMARY

| Pergunta | Resposta |
|----------|----------|
| Quantos testes REQUEREM ACT? | **4 testes** (callbacks + signxml) |
| Quantos testes podem rodar SEM ACT? | **13 testes** (celery + qr/pdf + sefaz sync) |
| ACT é obrigatório para passar 90%+ testes? | **NÃO** - 89.4% sem ACT |
| Quando usar ACT? | **Apenas para testar assinatura XML real** |
| Impacto de ignorar ACT? | **-2.8% (126 vs 130)**, ainda aceitável |
