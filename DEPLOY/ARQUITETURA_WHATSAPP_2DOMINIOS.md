# 🏗️ Arquitetura Técnica - 2 Domínios + WhatsApp

**Data:** 14 de março de 2026  
**Status:** Documentação de Arquitetura  
**Objetivo:** Clarificar fluxos e integrações

---

## 🌐 Arquitetura de Domínios

### Domínio 1: www.agro-link.ia.br (Frontend + Login)

**Responsabilidade:**
- Site institucional
- Dashboard de login
- Interface do usuário

**Arquitetura:**
```
┌─────────────────────────────────────────┐
│  Usuário Final (Browser/Mobile)         │
└────────────┬────────────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────────────┐
│ Cloud Load Balancer (SSL/TLS)           │
│ - Balanceamento de carga                │
│ - Rate limiting                         │
│ - WAF (Cloud Armor)                     │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│ Cloud CDN (Caching Global)              │
│ - Cache de assets (JS, CSS, imgs)       │
│ - Compressão gzip                       │
│ - Edge locations (100+ worldwide)       │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│ Cloud Storage (Static Assets)           │
│ - React build output                    │
│ - Imagens otimizadas                    │
│ - Manifests & service workers           │
└────────────┬────────────────────────────┘
             │
             └──→ REST API (agrol1nk.com.br)
```

**Componentes Específicos:**

| Componente | Tecnologia | Custo |
|-----------|-----------|-------|
| Cloud Load Balancer | Google LB | $32/mês |
| Cloud CDN | Google CDN | ~$40/mês |
| Cloud Storage | 50-100 GB | ~$2-5/mês |
| Cloud Armor | WAF Básico | $5/mês |
| Logging | Stackdriver | ~$50/mês |
| **Total Frontend** | | **~$129/mês** |

**Deploy Frontend:**
```bash
# Build React
npm run build

# Upload para Cloud Storage
gsutil -m cp -r build/* gs://agro-link-frontend/

# Invalidar CDN (após deploy)
gcloud compute url-maps invalidate-cdn-cache frontend-https \
  --path "/*"

# Verificar: https://www.agro-link.ia.br (CDN cache headers)
curl -I https://www.agro-link.ia.br
# X-Goog-Stored-Content-Length: ...
# Age: 3600
```

---

### Domínio 2: www.agrol1nk.com.br (Backend APIs)

**Responsabilidade:**
- REST APIs (Django/FastAPI)
- Processamento de negócio
- Acesso a dados
- Integrações externas

**Arquitetura:**
```
┌─────────────────────────────────────────┐
│ Frontend (agro-link.ia.br)              │
│ + Twilio (WhatsApp)                     │
│ + Próprios (batch jobs)                 │
└────────────┬────────────────────────────┘
             │ HTTPS (mTLS opcional)
             ↓
┌─────────────────────────────────────────┐
│ Cloud Run (Serverless Backend)          │
│ - Django/FastAPI container              │
│ - Auto-scaling (0 → 100 instâncias)     │
│ - Cold start otimizado                  │
│ - Healthchecks automáticos              │
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┬─────────┐
    ↓        ↓        ↓         ↓
┌───────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Cloud  │ │Redis │ │Cloud │ │Tasks │
│ SQL   │ │Cache │ │Store │ │      │
│(DB)   │ │      │ │      │ │Queue │
└───────┘ └──────┘ └──────┘ └──────┘
```

**Componentes Específicos:**

| Componente | Tecnologia | Instâncias | Custo |
|-----------|-----------|-----------|-------|
| Cloud Run | Python 3.11 | 2-5 (auto) | $60-360/mês |
| Cloud SQL | PostgreSQL 15 | 1 (HA opt.) | $223-446/mês |
| Memorystore | Redis 7.2 | 1 (HA opt.) | $70-280/mês |
| Cloud Storage | GCS | 1 | $7-46/mês |
| Cloud Tasks | Task Queue | - | $0.50/mês |
| Pub/Sub | Message Queue | - | $20/mês |
| Cloud Build | CI/CD | - | ~$10/mês |
| **Total Backend** | | | **$385-1,458/mês** |

**Deploy Backend:**
```bash
# Build & push image
gcloud builds submit --tag=gcr.io/PROJECT_ID/agro-backend:latest

# Deploy no Cloud Run
gcloud run deploy agro-backend \
  --image=gcr.io/PROJECT_ID/agro-backend:latest \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --add-cloudsql-instances=PROJECT_ID:us-central1:INSTANCE \
  --set-env-vars=DATABASE_URL=...,REDIS_URL=... \
  --allow-unauthenticated \
  --service-account=agro-backend@PROJECT_ID.iam.gserviceaccount.com

# Obter URL
gcloud run services describe agro-backend --region=us-central1 \
  --format='value(status.url)'
# Output: https://agro-backend-XXXXX.run.app

# Apontar domínio
# DNS: CNAME agrol1nk.com.br → agro-backend-XXXXX.run.app
```

---

## 💬 Integração WhatsApp

### Fluxo Completo

```
┌──────────────────────────────────────────────────────────┐
│  USUÁRIO NO WHATSAPP                                     │
│  "Plantei 50 ha de soja em Vila Nova"                    │
└────────────┬─────────────────────────────────────────────┘
             │
             ↓ (SMS Protocol via Twilio)
┌──────────────────────────────────────────────────────────┐
│  TWILIO WHATSAPP API                                     │
│  - Recebe mensagem                                       │
│  - Valida número/thread                                  │
│  - Faz webhook para backend                              │
└────────────┬─────────────────────────────────────────────┘
             │ POST /api/whatsapp/webhook
             ↓
┌──────────────────────────────────────────────────────────┐
│  CLOUD RUN BACKEND (www.agrol1nk.com.br)                │
│  /api/whatsapp/webhook (@ views.py)                      │
│                                                           │
│  def webhook(request):                                   │
│      # 1. Valida assinatura Twilio                       │
│      # 2. Extrai texto + número                          │
│      # 3. Cria/busca User por telefone                   │
│      # 4. Enfileira job de processamento                 │
│      return Response({'status': 'ok'})                   │
└────────────┬─────────────────────────────────────────────┘
             │
             ↓ (Async Task via Cloud Tasks)
┌──────────────────────────────────────────────────────────┐
│  CLOUD TASKS / CELERY JOB                                │
│  "process_whatsapp_message"                              │
│                                                           │
│  def process_whatsapp_message(task):                     │
│      # 1. Chama Zero-Claw / Gemini                       │
│      #    "Analisa: plantei 50 ha soja"                  │
│      # 2. Extrai estrutura:                              │
│      #    {type: 'operacao_agricola',                    │
│      #     payload: {tipo: 'plantio',                    │
│      #              cultura: 'soja',                     │
│      #              area: 50,                            │
│      #              talhao: 'Vila Nova'}}                │
│      # 3. Cria Action (draft) no BD                      │
│      # 4. Envia resposta via Twilio                      │
└────────────┬─────────────────────────────────────────────┘
             │
             ↓ (Twilio API)
┌──────────────────────────────────────────────────────────┐
│  TWILIO WHATSAPP API (OUTBOUND)                          │
│  - Envia: "Preparei o plantio!"                          │
│           "Aprove aqui: https://agro-link.ia.br/actions" │
└────────────┬─────────────────────────────────────────────┘
             │
             ↓ (SMS Protocol via Twilio)
┌──────────────────────────────────────────────────────────┐
│  USUÁRIO RECEBE NO WHATSAPP                              │
│  "Preparei o plantio!                                    │
│   Aprove aqui: https://agro-link.ia.br/actions/123456"  │
│                                                           │
│  Clica no link → Abre www.agro-link.ia.br               │
│  Dashboard → Action → [Aprovar] [Editar] [Rejeitar]     │
└────────────────────────────────────────────────────────┘
```

### Implementação Técnica

**Instalações necessárias:**
```bash
pip install twilio django-celery-beat
```

**Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=yyyyyyyyyyyyyyyyy
TWILIO_WHATSAPP_FROM=whatsapp:+55xxxxxxxxxx

ZEROCLAW_API_KEY=zzzzzzzzzzz
ZEROCLAW_MODEL=gemini-pro

DJANGO_ALLOWED_HOSTS=agrol1nk.com.br,localhost
```

**URLs do Django:**
```python
# urls.py
urlpatterns = [
    path('api/whatsapp/webhook', WhatsAppWebhookView.as_view()),
]
```

**View Handler:**
```python
# views.py
from twilio.rest import Client
from twilio.request_validator import RequestValidator

class WhatsAppWebhookView(APIView):
    def post(self, request):
        # 1. Valida assinatura
        validator = RequestValidator(TWILIO_AUTH_TOKEN)
        if not validator.validate(request.build_absolute_uri(),
                                   request.POST,
                                   request.META['HTTP_X_TWILIO_SIGNATURE']):
            return Response({'error': 'Invalid signature'}, status=403)
        
        # 2. Extrai dados
        incoming_msg = request.POST.get('Body')
        sender_number = request.POST.get('From').replace('whatsapp:', '')
        
        # 3. Busca/cria usuário
        user, _ = User.objects.get_or_create(
            telegram_phone=sender_number
        )
        
        # 4. Enfileira processamento
        process_whatsapp_message.delay(
            message=incoming_msg,
            user_id=user.id,
            sender=sender_number
        )
        
        return Response({'status': 'queued'})
```

**Task (Async):**
```python
# tasks.py
from celery import shared_task
from zero_claw_api import ZeroClawClient

@shared_task
def process_whatsapp_message(message, user_id, sender):
    user = User.objects.get(id=user_id)
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    # Processa com Zero-Claw
    zclaw = ZeroClawClient(ZEROCLAW_API_KEY)
    analysis = zclaw.analyze(
        text=message,
        context={'farm_id': user.farm_id, 'tenant': user.tenant}
    )
    
    if analysis.action_type == 'operacao_agricola':
        # Cria Action
        action = Action.objects.create(
            tenant=user.tenant,
            user=user,
            type='operacao_agricola',
            payload=analysis.payload,
            status='pending_approval'
        )
        
        # Responde ao usuário
        response_text = (
            f"✅ Preparei o {analysis.payload['tipo']}!"
            f"\n📋 {analysis.payload['area']} ha de {analysis.payload['cultura']}"
            f"\n🔗 Aprove: https://agro-link.ia.br/actions/{action.id}"
        )
    else:
        response_text = f"❓ Não entendi: {message}"
    
    # Envia via Twilio
    client.messages.create(
        from_=f'whatsapp:{TWILIO_WHATSAPP_FROM}',
        body=response_text,
        to=f'whatsapp:{sender}'
    )
```

---

## 📊 Custos WhatsApp Detalhados

### Twilio Pricing (Recomendado para MVP)

**Modelos de Preço:**
```
Mensagem Outbound: $0.0075/msg (WhatsApp)
Mensagem Inbound:  $0.0075/msg (WhatsApp)
Voice Call:        $0.0275/min (optional)
2FA SMS:           $0.01/msg   (auth verification)
```

**Volumes Estimados:**
```
Fase 1 (Dev):    100  msgs/mês → $0.75/mês
Fase 2 (Beta):   5K   msgs/mês → $37.50/mês
Fase 3 (Prod):   20K  msgs/mês → $150/mês
Fase 4 (Escala): 100K msgs/mês → $750/mês
```

**Comparação com Alternativas:**

| Serviço | Outbound | Inbound | Monthly Fee | Notes |
|---------|----------|---------|------------|--------|
| **Twilio** | $0.0075 | $0.0075 | $0 | Simples, boa integração |
| **Meta API** | $0.0436 | FREE | $15 | Mais barato em escala |
| **Zenvia** | $0.025 | $0.025 | $50 | Melhor para Brasil |
| **Alibaba** | $0.008 | $0.008 | FREE | Opcão mais barata |

**Recomendação:** Começar com **Twilio** (simples), migrar para **Meta API** quando atingir 10K+ msgs/mês.

---

## 📱 Casos de Uso WhatsApp

### UC-1: Notificação de Nova Ação Pendente
```
Backend cria Action (plantio aprovado)
    ↓
Cloud Tasks enfileira job
    ↓
Job notifica via Twilio
    ↓
Usuário recebe: "✅ Plantio aprovado! Área 50 ha - Vila Nova"
```

### UC-2: Alerta de Anomalia
```
Scheduler roda análises períodicas (a cada 1h)
    ↓
Detecta anomalia (ex: máquina parada > 4h)
    ↓
Twilio envia alerta
    ↓
Usuário recebe: "⚠️ Máquina XXXX sem atividade. Verificar?"
```

### UC-3: Pedido de Confirmação
```
Usuário dita: "Aprovei o plantio de soja"
    ↓
Zero-Claw: "Qual talhão?" (prompt)
    ↓
Twilio responde com opções
    ↓
Usuário: "Vila Nova"
    ↓
Backend executa ação
```

### UC-4: Relatório Diário
```
Scheduler todos os dias 7 AM
    ↓
Gera relatório (operações, alertas, etc)
    ↓
Twilio envia PDF/imagem
    ↓
Usuário recebe: "📊 Relatório de hoje..." + imagem
```

---

## 🔒 Segurança WhatsApp

### Validação Twilio

```python
from twilio.request_validator import RequestValidator

def validate_twilio_request(post_body, http_headers):
    validator = RequestValidator(TWILIO_AUTH_TOKEN)
    return validator.validate(
        uri,
        post_body,
        http_headers['X-Twilio-Signature']
    )
```

### Rate Limiting

```python
from django_ratelimit.decorators import ratelimit

@ratelimit(key='post:From', rate='10/m')  # 10 msgs por minuto
def whatsapp_webhook(request):
    ...
```

### Criptografia End-to-End

```python
# Twilio já faz HTTPS
# Adicionar verificação de certificado
import ssl
ssl.SSLContext.check_hostname = True
```

### Logging Seguro

```python
# NÃO logar mensagens de usuário em texto plano
import hashlib

message_hash = hashlib.sha256(message.encode()).hexdigest()
logger.info(f"Processed message: {message_hash}")  # ✅
```

---

## 📈 Monitoramento WhatsApp

### Métricas Importantes

```
1. Taxa de Entrega
   - Mensagens enviadas / Mensagens delivered
   - Meta: >97%

2. Latência
   - Tempo entre webhook → resposta
   - Meta: <5s

3. Volume
   - Mensagens/hora (detectar spikes)
   - Alertar se > 2x média

4. Taxa de Erro
   - Falhas de envio (network, blocked numbers)
   - Meta: <0.5%
```

### Dashboard (Recomendado)

```bash
gcloud monitoring dashboards create --config=whatsapp-dashboard.json
```

---

## 🔄 Fluxo Completo de Ordem (Exemplo)

```
┌─────────────────────────────────────────────────────────┐
│ 1. Usuário WhatsApp                                     │
│    "Plantei soja hoje em Vila Nova, 50 hectares"        │
└────────┬────────────────────────────────────────────────┘
         ↓ Webhook Twilio
┌─────────────────────────────────────────────────────────┐
│ 2. Backend recebe + valida                              │
│    - Extrai: tipo=plantio, cultura=soja, area=50        │
│    - Busca talhão "Vila Nova"                           │
│    - Cria Action(pending_approval)                      │
└────────┬────────────────────────────────────────────────┘
         ↓ Async Task
┌─────────────────────────────────────────────────────────┐
│ 3. Backend responde via Twilio                          │
│    "✅ Plantio de 50 ha soja em Vila Nova preparado!"   │
│    "Aprove aqui: https://agro-link.ia.br/actions/123"   │
└────────┬────────────────────────────────────────────────┘
         ↓ Usuário clica link
┌─────────────────────────────────────────────────────────┐
│ 4. Dashboard www.agro-link.ia.br                        │
│    - Mostra ação pendente com detalhes                  │
│    - Usuário revisa e clica [Aprovar]                   │
└────────┬────────────────────────────────────────────────┘
         ↓ API POST /actions/123/approve/
┌─────────────────────────────────────────────────────────┐
│ 5. Backend executa ação                                 │
│    - Cria registro OperacaoAgricola                     │
│    - Atualiza talhão                                    │
│    - Notifica via Twilio (confirmação)                  │
└────────┬────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Usuário recebe confirmação final WhatsApp            │
│    "✅ Plantio confirmado! 50 ha soja em Vila Nova"     │
│                                                          │
│    Dashboard atualizado → histórico + timeline          │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Checklist de Implementação WhatsApp

- [ ] Conta Twilio criada
- [ ] TWILIO_ACCOUNT_SID + AUTH_TOKEN configurados
- [ ] Número WhatsApp business obtido
- [ ] Webhook URL apontada para backend
- [ ] Validação de assinatura Twilio implementada
- [ ] Rate limiting ativo
- [ ] Logging seguro (hash de mensagens)
- [ ] Testes E2E com números reais
- [ ] Alertas de falha configurados
- [ ] Dashboard de monitoramento criado
- [ ] Documentação de troubleshooting
- [ ] Plan de escalabilidade (migração Meta API se necessário)

---

**Próximo passo:** Implementar webhook Twilio no backend Django/FastAPI
