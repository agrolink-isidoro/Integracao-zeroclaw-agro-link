# 💬 Chat Widget & WhatsApp Integration - ZeroClaw Agrolink

**Data:** 2 de março de 2026  
**Versão:** 1.0  
**Escopo:** Web Chat + WhatsApp (Primário) + Telegram (Alternativa)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura de Canais](#arquitetura-de-canais)
3. [Web Chat Widget](#web-chat-widget)
4. [WhatsApp Integration](#whatsapp-integration)
5. [Telegram (Fallback)](#telegram-fallback)
6. [Fluxo Completo](#fluxo-completo)
7. [Implementação](#implementação)
8. [Configuração](#configuração)

---

## Visão Geral

### Objetivo

Usuário pode interagir com Isidoro (ZeroClaw):
1. **Web Chat Widget** (dentro do dashboard Agrolink)
2. **WhatsApp** (principal - fora do app)
3. **Telegram** (fallback - fora do app)

### Arquitetura

```
┌─────────────────────────────────────────────────────┐
│ Usuario final                                       │
├──────┬──────────────────────────────────┬──────────┤
│      │                                  │          │
│ Web  │        WhatsApp (PRIMARY)        │ Telegram │
│ Chat │        (Push + Direct)           │(Fallback)│
└──────┴──────────────┬───────────────────┴──────────┘
                      │
                      ↓ (Unified)
         ┌────────────────────────────┐
         │ ZeroClaw/Isidoro           │
         │ (Gemini 2.5-flash)         │
         │                            │
         │ intent_recognition →        │
         │ action_draft → backend      │
         └────────────────────────────┘
                      │
                      ↓ (Webhook)
         ┌────────────────────────────┐
         │ Agrolink Backend            │
         │ /api/actions/               │
         │ /api/messages/              │
         └────────────────────────────┘
                      ↑
                      │ (Responder)
         ┌────────────────────────────┐
         │ Frontend Dashboard          │
         │ Chat Widget visível         │
         │ Action list visível         │
         └────────────────────────────┘
```

---

## Arquitetura de Canais

### Prioridade de Canais

```
PRIMÁRIO:      WhatsApp (Business API)
ALTERNATIVA:   Telegram (Groq API)
INTERNO:       Web Chat (WebSocket)
```

### Características por Canal

| Canal | Entrada | Saída | Autenticação | Custo | Latência | Uso |
|-------|---------|-------|--------------|-------|----------|-----|
| WhatsApp | Text/Voice | Text | Phone | $0.005/msg | ~2s | Conversas com usuário final |
| Telegram | Text/Voice | Text | Chat ID | Gratuito | ~5s | Fallback/Dev |
| Web Chat | Text | Text | JWT Token | Gratuito | ~1s | Dashboard integrado |

---

## Web Chat Widget

### O Componente

Chat integrado **dentro do dashboard** Agrolink.

```
┌────────────────────────────────────────────────┐
│ Agrolink Dashboard                             │
├─────────────────────┬──────────────────────────┤
│ Sidebar             │ Main Content             │
│ ├─ Fazendas        │ ┌──────────────────────┐ │
│ ├─ Agricultura    │ │ Chat Widget Isidoro │ │
│ ├─ Máquinas       │ ├──────────────────────┤ │
│ ├─ Estoque        │ │ 14:30 Olá!           │ │
│ ├─ **Chat** ✨    │ │      Como posso       │ │
│ └─ Ações Pendentes│ │      ajudar?          │ │
│                    │ │                      │ │
│                    │ │ 14:35 Plantei 50ha  │ │
│                    │ │      de soja         │ │
│                    │ │                      │ │
│                    │ │ ✅ Ação preparada!  │ │
│                    │ │    Ver dashboard... │ │
│                    │ │ [_Digita aqui_____] │ │
│                    │ │ [Enviar] [Voz]  🎙️ │ │
│                    └──────────────────────┘ │
└────────────────────────────────────────────────┘
```

### Componentes React

```
ChatWidget.tsx
├─ ChatContainer
│   └─ MessageList
│       └─ Message[] (user & bot)
├─ ActionPreview
│   ├─ ActionCard (quando bot prepara ação)
│   └─ Buttons [VER DASHBOARD] [REJEITAR]
├─ InputArea
│   ├─ TextInput
│   ├─ VoiceInput (mic button)
│   └─ SendButton
└─ TypingIndicator (bot escrevendo...)
```

### Características

✅ **Mensagens em Tempo Real**
- WebSocket para update instantâneo
- Typing indicator ("Isidoro está digitando...")
- User vê quando ação foi preparada

✅ **Suporte a Voz**
- Botão 🎙️ para gravar áudio
- Envia para Whisper (faster-whisper local)
- Transcrição aparece no chat

✅ **Integração com Action Queue**
- Bot propõe ação → aparece no chat
- Card clicável → abre ActionDetail
- [VER NO DASHBOARD] button

✅ **Histórico**
- Últimas 50 mensagens carregam ao abrir
- Scroll infinite loading
- Search: "Buscar nos chats"

### State Management

```typescript
interface ChatState {
  messages: Message[];
  typingIndicator: boolean;
  currentAction: Action | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  unreadCount: number;
}

interface Message {
  id: string;
  sender: "user" | "isidoro";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  actionReference?: Action;
}
```

### WebSocket Connection

```typescript
// ~/socket.io connection
const socket = io("ws://localhost:8000");

socket.on("message", (data) => {
  // New message from ZeroClaw
  addMessage({
    sender: "isidoro",
    content: data.message,
    actionReference: data.action_id
  });
});

socket.emit("message", {
  content: userInput,
  tenant_id: currentTenant,
  user_id: currentUser
});
```

---

## WhatsApp Integration

### Por Que WhatsApp?

1. ✅ **Adoção:** 99% dos usuarios rurais tem WhatsApp
2. ✅ **Direto:** Não precisa abrir app Agrolink (push notification)
3. ✅ **Confiável:** WhatsApp Business API (SLA)
4. ✅ **Voz:** Suporta áudio (melhor que Telegram)
5. ✅ **Simples:** Sem comando (tipo /plant, basta descrever)

### Arquitetura

```
WhatsApp User
   │ (message + voz)
   ↓
Twilio/WhatsApp Business API
   │ (webhook)
   ↓
Backend Agrolink: /api/channels/whatsapp/webhook/
   │
   ├─ Save message em db
   ├─ Send conversa para ZeroClaw
   └─ Receive resposta + action_draft
   │
   ↓
Response via Twilio/WhatsApp Business
   │
   ↓
WhatsApp User
   └─ "Preparei plantio! Aprova aqui: [dashboard link gerado]"
```

### Setup

**Provider:** Twilio (recomendado) ou Meta API direto

#### Opção 1: Twilio (Mais Simples)

```python
# settings.py

WHATSAPP = {
    "provider": "twilio",
    "account_sid": os.getenv("TWILIO_ACCOUNT_SID"),
    "auth_token": os.getenv("TWILIO_AUTH_TOKEN"),
    "phone_number": os.getenv("WHATSAPP_PHONE_NUMBER"),  # +55 11 98765-4321
    "webhook_url": "https://agrolink.com/api/channels/whatsapp/webhook/",
}
```

**Setup Passo a Passo:**
```
1. Criar conta Twilio (https://twilio.com)
2. Setup WhatsApp Business Account
3. Verificar phone number
4. Approve teste com business
5. Adicionar template messages (aprovação da Meta)
6. Configurar webhook em settings.py
```

#### Opção 2: Meta API Direto (Mais Barato)

```python
WHATSAPP = {
    "provider": "meta",
    "phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID"),
    "business_account_id": os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID"),
    "access_token": os.getenv("WHATSAPP_ACCESS_TOKEN"),
    "webhook_url": "https://agrolink.com/api/channels/whatsapp/webhook/",
}
```

### Webhook Endpoint

```python
# apps/channels/views.py

@csrf_exempt
@require_http_methods(["POST"])
def whatsapp_webhook(request):
    """Recebe mensagens do WhatsApp"""
    
    data = json.loads(request.body)
    
    # 1. Extrair informação
    message_text = data["messages"][0]["text"]["body"]
    phone_number = data["messages"][0]["from"]
    message_id = data["messages"][0]["id"]
    
    # Se tem áudio
    if "audio" in data["messages"][0]:
        audio_url = data["messages"][0]["audio"]["link"]
        # Download + Whisper transcription
        message_text = transcribe_audio(audio_url)
    
    # 2. Find or create User
    user = WhatsAppUser.objects.get_or_create(
        phone_number=phone_number
    )[0]
    
    # 3. Save message
    Message.objects.create(
        channel="whatsapp",
        user=user,
        content=message_text,
        external_id=message_id
    )
    
    # 4. Send to ZeroClaw
    zeroclaw_response = zeroclaw_client.chat(
        message=message_text,
        user_context={
            "phone": phone_number,
            "tenant_id": user.tenant.id
        }
    )
    
    # 5. Save action if created
    if zeroclaw_response.get("action"):
        action = Action.objects.create(**zeroclaw_response["action"])
    
    # 6. Send response back
    send_whatsapp_message(
        phone_number=phone_number,
        message=zeroclaw_response["message"],
        action_id=action.id if action else None
    )
    
    return JsonResponse({"status": "ok"})

def send_whatsapp_message(phone_number, message, action_id=None):
    """Envia mensagem pelo WhatsApp"""
    
    if WHATSAPP["provider"] == "twilio":
        client = TwilioClient(
            WHATSAPP["account_sid"],
            WHATSAPP["auth_token"]
        )
        
        # Message com link para dashboard
        dashboard_link = f"https://agrolink.com/v/actions/{action_id}/"
        
        full_message = f"{message}\n\n👉 Ver no dashboard: {dashboard_link}"
        
        client.messages.create(
            from_=f"whatsapp:{WHATSAPP['phone_number']}",
            to=f"whatsapp:{phone_number}",
            body=full_message
        )
    
    elif WHATSAPP["provider"] == "meta":
        # Meta API call
        requests.post(
            f"https://graph.instagram.com/v18.0/{WHATSAPP['phone_number_id']}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": phone_number,
                "type": "text",
                "text": {"body": full_message}
            },
            headers={"Authorization": f"Bearer {WHATSAPP['access_token']}"}
        )
```

### Limites & Rate Limiting

```python
# apps/channels/middleware.py

class WhatsAppRateLimiter:
    """Evita spam"""
    
    MAX_MESSAGES_PER_HOUR = 100
    MAX_MESSAGES_PER_MINUTE = 10
    
    @staticmethod
    def check_rate_limit(phone_number):
        """Returns (is_allowed, messages_left)"""
        
        cache_key = f"whatsapp:{phone_number}:hourly"
        count = cache.get(cache_key, 0)
        
        if count >= WhatsAppRateLimiter.MAX_MESSAGES_PER_HOUR:
            return False, 0
        
        cache.set(cache_key, count + 1, 3600)  # 1h expiry
        
        return True, WhatsAppRateLimiter.MAX_MESSAGES_PER_HOUR - count - 1
```

### Tratamento de Erros

```python
try:
    send_whatsapp_message(phone_number, message)
except TwilioRestException as e:
    # Log error
    Message.objects.create(
        channel="whatsapp",
        user=user,
        status="failed",
        error=str(e)
    )
    # Retry com backoff exponencial
    send_whatsapp_message_delayed.apply_async(
        args=[phone_number, message],
        countdown=60  # Retry in 1 min
    )
```

---

## Telegram (Fallback)

### Setup Básico

```python
# settings.py

TELEGRAM = {
    "enabled": True,
    "bot_token": os.getenv("TELEGRAM_BOT_TOKEN"),
    "webhook_url": "https://agrolink.com/api/channels/telegram/webhook/",
    "allowed_chat_ids": [int(x) for x in os.getenv("TELEGRAM_ALLOWED_CHATS", "").split(",")]
}
```

### Webhook Endpoint

```python
@csrf_exempt
@require_http_methods(["POST"])
def telegram_webhook(request):
    """Recebe atualizações do Telegram via ZeroClaw"""
    
    # ZeroClaw já cuida dos detalhes de Telegram
    # Nós só precisamos processar a resposta
    
    data = json.loads(request.body)
    
    if "message" in data:
        message = data["message"]
        chat_id = message["chat"]["id"]
        
        # Validar que chat_id está permitido
        if chat_id not in TELEGRAM["allowed_chat_ids"]:
            return JsonResponse({"error": "Unauthorized"}, status=403)
        
        # ZeroClaw processou, nós só salvamos em db
        # (para histórico)
        # ...
    
    return JsonResponse({"ok": True})
```

---

## Fluxo Completo

### Cenário: Usuário no Campo com WhatsApp

```
┌─────────────────────────────────────────────┐
│ 1. Farmer no campo (offline dashboard)       │
│    "Plantei 50ha de soja"                    │
└──────────────────┬──────────────────────────┘
                   │
                   ↓ (WhatsApp)
         ┌─────────────────────┐
         │ Twilio/Meta API     │
         ├─────────────────────┤
         │ POST webhook        │
         └──────────┬──────────┘
                    │
                    ↓
         ┌─────────────────────┐
         │ Backend Agrolink    │
         │ /api/channels/      │
         │   whatsapp/webhook/ │
         ├─────────────────────┤
         │ 1. Save message     │
         │ 2. Transcribe (if   │
         │    audio)           │
         │ 3. Send to ZeroClaw │
         └──────────┬──────────┘
                    │
                    ↓
         ┌─────────────────────┐
         │ ZeroClaw/Gemini     │
         │ intent: plant       │
         │ extract: 50ha soja  │
         │ create draft        │
         └──────────┬──────────┘
                    │
                    ↓
         ┌─────────────────────┐
         │ Backend: POST       │
         │ /api/actions/       │
         ├─────────────────────┤
         │ Action created      │
         │ status: pending     │
         └──────────┬──────────┘
                    │
                    ↓
         ┌─────────────────────┐
         │ WhatsApp Reply      │
         │ "Preparei plantio!  │
         │ Ver aqui: [link]"   │
         └──────────┬──────────┘
                    │
                    ↓
         ┌─────────────────────┐
         │ WebSocket (on       │
         │ background HTTP)    │
         │ Notify dashboard:   │
         │ "Nova ação!"        │
         └──────────┬──────────┘
                    │
                    ↓ (Farmer volta para office)
         ┌─────────────────────┐
         │ Agrolink Dashboard  │
         │ /dashboard/actions  │
         ├─────────────────────┤
         │ ✨ Nova ação       │
         │ [VER]→ Editar      │
         │ [APROVAR/REJEITAR] │
         └─────────────────────┘

2min depois...
Farmer clica APROVAR

         ┌─────────────────────┐
         │ Backend: POST       │
         │ /api/actions/{id}/  │
         │ approve/            │
         ├─────────────────────┤
         │ Action executed     │
         │ operacao_agricola   │
         │ criada no banco     │
         └──────────┬──────────┘
                    │
                    ↓
         ┌─────────────────────┐
         │ WhatsApp Reply      │
         │ "✅ Plantio        │
         │ executado!"         │
         └─────────────────────┘
```

---

## Implementação

### Timeline

**Semana 1-2** (em paralelo com Action Backend)
- [ ] Setup Twilio/Meta account
- [ ] Template messages in Meta Business
- [ ] Webhook endpoint `/api/channels/whatsapp/webhook/`
- [ ] WhatsAppUser model
- [ ] Message model (para histórico)
- [ ] Rate limiting

**Semana 3** (em paralelo com Frontend Dashboard)
- [ ] Web Chat Widget React component
- [ ] WebSocket setup (Socket.IO server)
- [ ] Chat integration com ZeroClaw
- [ ] Voice input (mic button)

**Semana 3.5** (refinements)
- [ ] Telegram fallback
- [ ] Error handling & retry
- [ ] Analytics (messages per user, etc)
- [ ] Moderation (block spam)

### Models

```python
# apps/channels/models.py

class Message(models.Model):
    CHANNEL_CHOICES = [
        ("whatsapp", "WhatsApp"),
        ("telegram", "Telegram"),
        ("web", "Web Chat"),
    ]
    
    STATUS_CHOICES = [
        ("sent", "Enviado"),
        ("delivered", "Entregue"),
        ("read", "Lido"),
        ("failed", "Falhou"),
    ]
    
    channel = CharField(max_length=20, choices=CHANNEL_CHOICES)
    user = ForeignKey(User)
    tenant = ForeignKey(Tenant)
    
    content = TextField()
    sender = CharField(max_length=20, choices=[("user", "User"), ("isidoro", "Bot")])
    
    external_id = CharField(max_length=255, null=True)  # WhatsApp msg_id
    
    status = CharField(max_length=20, choices=STATUS_CHOICES, default="sent")
    error_message = TextField(blank=True)
    
    attachments = JSONField(default=list)  # [{"type": "audio", "url": "..."}]
    
    action_reference = ForeignKey(Action, null=True, on_delete=models.SET_NULL)
    
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

class WhatsAppUser(models.Model):
    """Profile específico para WhatsApp"""
    phone_number = CharField(max_length=20, unique=True)
    user = ForeignKey(User, null=True)
    tenant = ForeignKey(Tenant)
    
    blocked = BooleanField(default=False)
    last_message_at = DateTimeField(null=True)
    
    created_at = DateTimeField(auto_now_add=True)
```

---

## Configuração

### .env Template

```bash
# WhatsApp
WHATSAPP_PROVIDER=twilio  # ou "meta"
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
WHATSAPP_PHONE_NUMBER=+55 11 98765 4321
WHATSAPP_PHONE_NUMBER_ID=...  # For Meta API
WHATSAPP_BUSINESS_ACCOUNT_ID=...  # For Meta API
WHATSAPP_ACCESS_TOKEN=...  # For Meta API

# Telegram (fallback)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ALLOWED_CHATS=123456,789012

# WebSocket
WEBSOCKET_URL=ws://localhost:8000/ws/chat/
SOCKET_IO_SERVER=http://localhost:8000
```

### settings.py

```python
# Configuration

CHANNELS = {
    "whatsapp": {
        "enabled": True,
        "provider": os.getenv("WHATSAPP_PROVIDER", "twilio"),
        "rate_limit_per_hour": 100,
        "rate_limit_per_minute": 10,
    },
    "telegram": {
        "enabled": True,
        "fallback_only": True,
        "rate_limit_per_hour": 50,
    },
    "web": {
        "enabled": True,
        "websocket_enabled": True,
        "max_history": 50,  # messages
    }
}

# WebSocket
ASGI_APPLICATION = "project.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

### Docker Compose (Futura)

```yaml
version: '3.8'

services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
  
  django:
    build: .
    ports:
      - "8000:8000"
    environment:
      - WHATSAPP_PROVIDER=twilio
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    depends_on:
      - redis
  
  websocket:
    image: node:16
    ports:
      - "3001:3001"
    volumes:
      - ./websocket:/app
    command: node server.js
```

---

## Checklist de Implementação

### Phase 0: Design
- [ ] Escolher Twilio vs Meta API
- [ ] Design UI do chat widget (Figma)
- [ ] Decidir WebSocket vs Polling

### Phase 1: WhatsApp (Semana 1-2)
- [ ] Setup Twilio/Meta account
- [ ] Webhook endpoint
- [ ] Models (Message, WhatsAppUser)
- [ ] Rate limiting
- [ ] Error handling

### Phase 2: Web Chat Widget (Semana 3)
- [ ] React components
- [ ] WebSocket connection
- [ ] Chat history
- [ ] Voice input

### Phase 3: Polish (Semana 3.5)
- [ ] Telegram fallback
- [ ] Analytics
- [ ] Moderation
- [ ] Documentation

---

## Monitoramento & Alertas

```python
# apps/channels/monitoring.py

class ChannelHealthCheck:
    """Monitor saúde dos canais"""
    
    @staticmethod
    def check_whatsapp():
        """Testa se webhook do WhatsApp está funcionando"""
        last_message = Message.objects.filter(
            channel="whatsapp"
        ).latest("created_at")
        
        time_since = timezone.now() - last_message.created_at
        
        if time_since > timedelta(hours=2):
            alert("WhatsApp webhook pode estar inactive")
    
    @staticmethod
    def check_zeroclaw_response_time():
        """Se ZeroClaw demora muito, alertar"""
        slow_messages = Message.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=1),
            # Check response time
        ).count()
        
        if slow_messages > 10:
            alert(f"ZeroClaw lento: {slow_messages} mensagens de resposta lenta")
```

---

**Documento:** ZEROCLAW_CHAT_WHATSAPP_INTEGRATION.md  
**Data:** 2 de março de 2026  
**Versão:** 1.0  
**Status:** Ready for implementation
