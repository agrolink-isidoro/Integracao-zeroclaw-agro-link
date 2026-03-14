# ✅ REVISÃO - Arquivos Atualizados com Domínios & WhatsApp

**Data:** 14 de março de 2026  
**Status:** Verificação e Consolidação  
**Escopo:** 7 Documentos base + 2 domínios + WhatsApp

---

## 📋 Mapeamento de Domínios (Confirmado)

### ✅ www.agro-link.ia.br (PRINCIPAL - Frontend + Login + Comunicações)

**Responsabilidade:**
```
├─ Site Institucional
│  └─ Fonte: Project-Agro-Business/Site
│  └─ Tecnologia: React + Static Assets
│  └─ Hosting: Cloud Storage + CDN
│
├─ Dashboard de Login
│  └─ Fonte: Integracao-zeroclaw-agro-link
│  └─ Autenticação: SSO/Token JWT
│  └─ Rota: /login → Dashboard
│
└─ Comunicações
   ├─ Email (transacional, newsletters)
   ├─ Notificações (push, in-app)
   └─ Chat com usuários (via WhatsApp integrado)
```

**Infraestrutura GCP:**
```
Cloud Load Balancer (HTTPS)
       ↓
Cloud CDN (Cache global)
       ↓
Cloud Storage (React build)
       └─ Custo: ~$130/mês
```

**DNS Apontamento:**
```
Seu registrador de domínio:
CNAME www.agro-link.ia.br → c.storage.googleapis.com
     (ou Cloud Load Balancer endpoint)

Certificado SSL: Let's Encrypt (automático)
```

---

### ✅ www.agrol1nk.com.br (BACKEND - Sustentação da Aplicação)

**Responsabilidade:**
```
├─ REST APIs (Django REST Framework)
│  └─ Fonte: project-agro/sistema-agropecuario
│  └─ 7 Módulos: Agricultura, Máquinas, Estoque, Fazendas, etc
│  └─ Endpoints: /api/v1/{module}/*
│
├─ Processamento de Negócio
│  ├─ Celery + Cloud Tasks (async jobs)
│  ├─ Zero-Claw Bot (intent recognition + IA)
│  └─ Gemini API (processamento de IA)
│
├─ Acesso a Dados
│  ├─ Cloud SQL PostgreSQL
│  ├─ Memorystore Redis (cache + sessions)
│  └─ Cloud Storage (NF-e, certificados A3, PDFs)
│
└─ Integrações Externas
   ├─ Twilio WhatsApp (webhook + messaging)
   ├─ SEFAZ (NF-e manifestação)
   ├─ Bancos (PIX, TED, DOC)
   └─ Third-party APIs

```

**Infraestrutura GCP:**
```
Cloud Run (Django backend)
       ↓
  ┌────┴───┬────────┬──────┐
  ↓        ↓        ↓      ↓
Cloud   Redis  Cloud  Cloud
SQL  (cache)  Tasks   Pub/Sub
  └─ Custo: ~$750-885/mês (produção inicial)
```

**DNS Apontamento:**
```
Seu registrador de domínio:
CNAME agrol1nk.com.br → agro-backend-xxxxx.run.app
                       (gerado pelo Cloud Run deploy)

Certificado SSL: Google Cloud (automático para *.run.app)
```

---

## 🔗 Fluxo de Integração WhatsApp (Confirmado)

### Cenário Completo: Usuário → WA → Bot → Dashboard → Execução

```
┌──────────────────────────────────────────────────────────────┐
│ 1. ENTRADA DO USUÁRIO                                        │
│    Plataforma: WhatsApp                                      │
│    Mensagem: "Plantei 50 ha de soja em Vila Nova"            │
│    Número: +55 62 9999-4484                                  │
└────────────┬─────────────────────────────────────────────────┘
             │ (SMS Protocol via Twilio)
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. TWILIO WHATSAPP (Recepção)                                │
│    Endpoint: POST /api/whatsapp/webhook                      │
│    Validação: X-Twilio-Signature                             │
│    Payload: {From, Body, MessageSid, ...}                    │
└────────────┬─────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. CLOUD RUN BACKEND (www.agrol1nk.com.br)                  │
│    Função: WhatsAppWebhookView                               │
│    Ações:                                                     │
│    • Valida assinatura Twilio                                │
│    • Extrai: sender, message, timestamp                      │
│    • Busca/cria User por telefone                            │
│    • Enfileira processamento async                           │
└────────────┬─────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. CLOUD TASKS (Async Processing)                            │
│    Job: process_whatsapp_message                             │
│    Ações:                                                     │
│    • Chama Zero-Claw/Gemini API                              │
│    • Análise: "Plantei 50 ha soja" →                         │
│      {type: operacao_agricola,                               │
│       cultura: soja,                                         │
│       area: 50,                                              │
│       talhao: Vila Nova}                                     │
│    • Cria Action (draft) no banco                            │
│    • Envia resposta via Twilio                               │
└────────────┬─────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. TWILIO WHATSAPP (Resposta)                                │
│    Mensagem: "✅ Preparei o plantio!                         │
│               📋 50 ha de soja em Vila Nova                   │
│               🔗 Aprove: https://agro-link.ia.br/actions/123"│
└────────────┬─────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. USUÁRIO RECEBE WA + CLICA LINK                            │
│    Link: https://www.agro-link.ia.br/actions/123             │
│    Abre: Dashboard (www.agro-link.ia.br)                     │
│    Localiza: Action em estado "pending_approval"             │
└────────────┬─────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 7. DASHBOARD (www.agro-link.ia.br)                           │
│    Componente: ActionDetail                                  │
│    Mostra: Talhão, cultura, área, data                       │
│    Botões: [Revisar] [Editar] [Aprovar] [Rejeitar]          │
│    Usuário clica: [Aprovar]                                  │
└────────────┬─────────────────────────────────────────────────┘
             │ (HTTPS API call)
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 8. BACKEND EXECUTA (www.agrol1nk.com.br)                    │
│    Endpoint: POST /api/actions/{id}/approve/                 │
│    Ações:                                                     │
│    • Valida permissão de usuário                             │
│    • Atualiza Action status para "approved"                  │
│    • Cria registro OperacaoAgricola no BD                    │
│    • Atualiza Talhão (status, última op)                     │
│    • Enfileira notificação                                   │
└────────────┬─────────────────────────────────────────────────┘
             │
             ↓
┌──────────────────────────────────────────────────────────────┐
│ 9. TWILIO WHATSAPP (Confirmação Final)                       │
│    Mensagem: "✅ PLANTIO CONFIRMADO!                         │
│               Vila Nova - 50 ha                              │
│               Data: 14/03/2026 às 10h32                      │
│               Status: Ativo 🌱"                              │
└────────────────────────────────────────────────────────────────┘
```

### Endpoints WhatsApp (Backend)

```http
# Receber mensagem
POST /api/whatsapp/webhook
Content-Type: application/x-www-form-urlencoded
X-Twilio-Signature: ...

From=whatsapp%3A%2B5562999954484&Body=Plantei+soja

# Resposta webhook
HTTP/1.1 200 OK
{"status": "queued"}
```

### Implementação Django (Backend)

```python
# urls.py
from django.urls import path
from .views import WhatsAppWebhookView

urlpatterns = [
    path('api/whatsapp/webhook', WhatsAppWebhookView.as_view(), 
         name='whatsapp_webhook'),
]

# views.py
from twilio.request_validator import RequestValidator
from twilio.rest import Client
from rest_framework.views import APIView
from rest_framework.response import Response

class WhatsAppWebhookView(APIView):
    """
    Recebe mensagens WhatsApp via Twilio
    Processa com Zero-Claw/IA
    Responde automaticamente
    """
    
    def post(self, request):
        # 1. Validar assinatura Twilio
        validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
        url = request.build_absolute_uri()
        signature = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
        
        if not validator.validate(url, request.POST, signature):
            return Response({'error': 'Invalid signature'}, status=403)
        
        # 2. Extrair dados
        sender = request.POST.get('From', '').replace('whatsapp:', '')
        message_text = request.POST.get('Body', '')
        message_sid = request.POST.get('MessageSid', '')
        
        # 3. Encontrar/criar usuário
        user, _ = User.objects.get_or_create(
            phone=sender,
            defaults={'is_verified': False}
        )
        
        # 4. Enfileirar processamento
        from .tasks import process_whatsapp_message
        process_whatsapp_message.delay(
            message_text=message_text,
            user_id=user.id,
            sender=sender,
            message_sid=message_sid
        )
        
        # 5. Resposta imediata (Twilio valida status 200)
        return Response({'status': 'queued'}, status=200)

# tasks.py (Celery/Cloud Tasks)
@shared_task
def process_whatsapp_message(message_text, user_id, sender, message_sid):
    """
    Processa mensagem WhatsApp com IA
    Cria Action (draft)
    Responde ao usuário
    """
    user = User.objects.get(id=user_id)
    client = Client(settings.TWILIO_ACCOUNT_SID, 
                    settings.TWILIO_AUTH_TOKEN)
    
    try:
        # Chamar Zero-Claw para análise
        from integrations.zeroclaw import ZeroClawClient
        zclaw = ZeroClawClient(api_key=settings.ZEROCLAW_API_KEY)
        
        analysis = zclaw.analyze(
            text=message_text,
            context={
                'user_id': user.id,
                'farm_id': user.default_farm_id,
                'tenant': user.tenant,
            }
        )
        
        # Criar Action (draft)
        action = Action.objects.create(
            tenant=user.tenant,
            user=user,
            type=analysis.action_type,
            payload=analysis.extracted_data,
            status='pending_approval',
            source='whatsapp'
        )
        
        # Montar resposta
        if analysis.action_type == 'operacao_agricola':
            link = f"https://www.agro-link.ia.br/actions/{action.id}"
            response_msg = (
                f"✅ Preparei o {analysis.get_tipo()}!\\n"
                f"📊 {analysis.area} ha de {analysis.cultura}\\n"
                f"🔗 Aprove: {link}"
            )
        else:
            response_msg = f"❓ Não entendi bem: {message_text}"
        
        # Enviar resposta via Twilio
        client.messages.create(
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            body=response_msg,
            to=f"whatsapp:{sender}"
        )
        
        # Log
        logger.info(f"WhatsApp message processed: {action.id} for {sender}")
        
    except Exception as e:
        logger.error(f"Error processing WhatsApp message: {str(e)}")
        
        # Responder ao usuário sobre erro
        client.messages.create(
            from_=f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
            body="⚠️ Ocorreu um erro ao processar sua mensagem. "
                 "Tente novamente ou entre em contato.",
            to=f"whatsapp:{sender}"
        )
```

### Variáveis de Ambiente (Backend)

```bash
# .env.gcp

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+55xxxxxxxxxx  # Number do seu account Twilio

# Zero-Claw IA
ZEROCLAW_API_KEY=sk_xxx_xxx_xxx
ZEROCLAW_MODEL=gemini-pro

# Django
DEBUG=False
ALLOWED_HOSTS=agrol1nk.com.br,www.agrol1nk.com.br,*.run.app
```

---

## 📊 Custos WhatsApp (Confirmado)

### Twilio Pricing

```
Tipo               Custo      Quando Usar
─────────────────────────────────────────
Outbound message   $0.0075/msg Resposta bot
Inbound message    $0.0075/msg Entrada usuário
Voice call         $0.0275/min Notificações (opcional)
Number (mensal)    $1.00      Seu número WA
2FA SMS            $0.01/msg   Autenticação

Estimativa (MVP):
10K msgs/mês (entrada+saída) × $0.0075 = $75/mês
```

### Alternativas (Comparação)

| Serviço | Outbound | Inbound | Setup | Melhor para |
|---------|----------|---------|-------|------------|
| **Twilio** | $0.0075 | $0.0075 | $0 | MVP (simples, boa API) |
| **Meta API** | $0.0436 | FREE | $15/mês | Escala (10K+ msgs) |
| **Zenvia** | $0.025 | $0.025 | $50/mês | Brasil (melhor suporte) |

**Recomendação:** Começar com **Twilio**, migrar para **Meta** em produção se volume > 10K msgs/mês

---

## 🗂️ Estrutura de Arquivos Criados

```
Integracao-zeroclaw-agro-link/DEPLOY/
├── 📄 GOOGLE_CLOUD_SETUP.md              (Setup GCP - 13KB)
├── 📄 GOOGLE_CLOUD_QUICKSTART.md         (Quick start 5min - 5KB)
├── 📄 gcp-setup.sh                       (Script auto - 12KB) ⚡ EXECUTÁVEL
├── 📄 SIMULACAO_CUSTOS_GCP.md            (Custos detalhados - 18KB)
│   └─ COM: 2 domínios + WhatsApp preços
├── 📄 ARQUITETURA_WHATSAPP_2DOMINIOS.md  (Arquitetura - 20KB)
│   └─ COM: Fluxos completos + código
├── 📄 PLANILHA_CUSTOS_DINAMICA.md        (Dinâmicas - 16KB)
│   └─ COM: Calculadora Python + descontos
├── 📄 RESUMO_EXECUTIVO_CUSTOS.md         (5min exec - 12KB)
│   └─ COM: ROI + timeline
├── 📄 REVISAO_DOMINIOS_WHATSAPP.md       (Consolidação - 15KB)
│   └─ COM: Mapeamento + verificação
├── 📄 INDICE_DOCUMENTACAO.md              (Índice nav - 12KB)
│   └─ COM: Guia por perfil
└── 📄 (outros arquivos de documentação do projeto)
```

---

## ✅ Checklist de Revisão Documentos

### SIMULACAO_CUSTOS_GCP.md
- [x] www.agro-link.ia.br mapeado (Frontend + Login + Comun)
- [x] www.agrol1nk.com.br mapeado (Backend + Sustentação)
- [x] WhatsApp Twilio incluído (preços + arquitetura)
- [x] 3 cenários (Dev, Inicial, Escala)
- [x] Projeção 12 meses

### ARQUITETURA_WHATSAPP_2DOMINIOS.md
- [x] Domínio 1 detalhado com componentes
- [x] Domínio 2 detalhado com componentes
- [x] Fluxo WhatsApp passo-a-passo
- [x] Código de implementação (Django)
- [x] Segurança & validação Twilio
- [x] Monitoramento

### PLANILHA_CUSTOS_DINAMICA.md
- [x] Preços estruturados (JSON)
- [x] Estimativas por cenário (CSV)
- [x] Calculadora Python executável

### RESUMO_EXECUTIVO_CUSTOS.md
- [x] Timeline visual
- [x] Breakdown por domínio
- [x] ROI estimado (mês 12)
- [x] Decisões respondidas
- [x] Próximos passos

---

## 🎯 Guia de Uso por Perfil

### 👨‍💼 Executivo/CFO (5 min)
**Leia:** RESUMO_EXECUTIVO_CUSTOS.md
- Custos resumidos
- Timeline
- ROI (88% margem bruta!)
- Budget: $15K-20K/ano

### 👨‍💻 Developer (Completo)
**Leia na ordem:**
1. GOOGLE_CLOUD_QUICKSTART.md (5 min)
2. ARQUITETURA_WHATSAPP_2DOMINIOS.md (implementação)
3. SIMULACAO_CUSTOS_GCP.md (context custos)
4. Código: veja arquivos para templates

### 🛠️ DevOps/SRE (Infraestrutura)
**Leia na ordem:**
1. GOOGLE_CLOUD_SETUP.md (guia completo)
2. gcp-setup.sh (script auto)
3. SIMULACAO_CUSTOS_GCP.md (componentes)
4. PLANILHA_CUSTOS_DINAMICA.md (monitoramento)

### 📊 Product Owner
**Leia:**
- RESUMO_EXECUTIVO_CUSTOS.md
- Seção "ROI Estimado"
- Seção "Próximos passos"

---

## 🚀 Próximos Passos (Recomendado)

### ✅ Semana 1: Autenticação e Projeto
```bash
cd Integracao-zeroclaw-agro-link/DEPLOY
gcloud auth login
./gcp-setup.sh
```

### ✅ Semana 2: Backend
```bash
gcloud builds submit --tag=gcr.io/PROJECT_ID/agro-backend
gcloud run deploy agro-backend --image=...
```

### ✅ Semana 3: Frontend
```bash
npm run build (Project-Agro-Business)
gsutil cp -r dist/* gs://agro-link-frontend/
```

### ✅ Semana 4: WhatsApp
```
1. Criar conta Twilio
2. Integrar webhook
3. Testes com números reais
4. Deploy em produção
```

### ✅ Semana 5+: Monitoramento
```
1. Ativar Cloud Logging
2. Configure alertas
3. Dashboard
4. Otimizações
```

---

## 📋 Checklist Final

- [x] Documentação completa (7 arquivos)
- [x] 2 domínios mapeados (www.agro-link.ia.br + www.agrol1nk.com.br)
- [x] WhatsApp integrado (Twilio)
- [x] Custos simulados (3 cenários)
- [x] Código de exemplo (Django)
- [x] Script automático GCP
- [x] ROI calculado
- [ ] Você executar ./gcp-setup.sh (próximo)
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Configurar WhatsApp
- [ ] Em produção! 🚀

---

**Status:** ✅ REVISÃO COMPLETA - Pronto para produção

*Dúvidas sobre domínios ou WhatsApp? Ver ARQUITETURA_WHATSAPP_2DOMINIOS.md*
