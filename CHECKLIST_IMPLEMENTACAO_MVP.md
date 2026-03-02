# ✅ Checklist de Implementação - MVP (Semanas 1-4)

**Atualizado:** 2 de março de 2026  
**Responsável:** Equipe de Desenvolvimento  
**Prioridade:** 🔴 CRÍTICO - Bloqueia Semana 1

---

## Phase 0: Design & Validação (3-5 dias)

### Banco de Dados
- [ ] **Criar ER Diagram** com modelo `Action`
  - Campos: id, tenant_id, user_id, module, action_type, draft_data, status, created_at, approved_by, approved_at, executed_at, rejection_reason
  - Indices: (tenant_id, status), (user_id, status), (created_at)
  - Foreign keys: user_id → auth_user, tenant_id → tenant
  
- [ ] **Criar migration Django**
  ```
  python manage.py makemigrations action
  python manage.py migrate
  ```

- [ ] **Validar estrutura no PostgreSQL**
  ```sql
  SELECT * FROM action_action;
  ```

### API Endpoints (Backend)
- [ ] **Revisar endpoints necessários:**
  ```
  GET /api/agricultura/operacoes/        [Isidoro lê]
  GET /api/agricultura/operacoes/{id}/   [Isidoro lê detalhes]
  POST /api/actions/                     [Isidoro escreve draft]
  GET /api/actions/pending/               [Dashboard lista]
  PATCH /api/actions/{id}/edit/           [Usuário edita]
  POST /api/actions/{id}/approve/         [Usuário aprova]
  POST /api/actions/{id}/reject/          [Usuário rejeita]
  GET /api/actions/{id}/execute-preview/  [Mostra o que vai fazer]
  ```

- [ ] **Documentar com OpenAPI/Swagger**

### Frontend
- [ ] **Design Figma/mockup** da tela de aprovação
  - Lista de ações pendentes
  - Botões: EDITAR, APROVAR, REJEITAR
  - Detalhes expandíveis
  - Timeline de histórico

### Permissões RBAC
- [ ] **Criar roles:**
  - `role_agro_operator` → pode aprovar ações de agricultura
  - `role_machine_operator` → pode aprovar ações de máquinas
  - `role_stock_operator` → pode aprovar ações de estoque
  - `role_farm_viewer` → só leitura de fazendas
  
- [ ] **Configurar Django permissions** em cada permission group

### Multi-Tenant Isolation
- [ ] **Adicionar tenant_id a TODOS os models:**
  ```python
  class Action(models.Model):
      tenant = ForeignKey(Tenant, on_delete=models.CASCADE)
      # ...
  ```
  
- [ ] **Implementar TenantIsolationMiddleware:**
  - Extrai tenant_id de JWT ou X-Tenant-ID header
  - Valida: user.tenant_id == request.tenant_id
  - Filtra QuerySets por tenant automaticamente
  
- [ ] **Criar índices de performance:**
  ```python
  class Meta:
      indexes = [
          models.Index(fields=["tenant", "status"]),
          models.Index(fields=["tenant", "created_at"]),
      ]
  ```
  
- [ ] **Ver:** [ZEROCLAW_MULTITENANT_ARCHITECTURE.md](ZEROCLAW_MULTITENANT_ARCHITECTURE.md)

---

## Semana 1: Backend Action Queue

### Models & Migrations
- [ ] Criar `Action` model em `apps/actions/models.py`
  ```python
  class ActionStatus(models.TextChoices):
      PENDING_APPROVAL = "pending_approval"
      REJECTED = "rejected"
      APPROVED = "approved"
      EXECUTED = "executed"
      FAILED = "failed"
      ARCHIVED = "archived"
  
  class Action(models.Model):
      tenant = ForeignKey(Tenant)
      creator = ForeignKey(User)
      approver = ForeignKey(User, null=True)
      module = CharField(max_length=50)  # "agricultura", "estoque", etc
      action_type = CharField(max_length=50)  # "plant", "harvest", "add_stock"
      draft_data = JSONField()  # {"talhao": 5, "cultura": "soja", "ha": 50}
      status = CharField(choices=ActionStatus)
      rejection_reason = TextField(blank=True)
      created_at = DateTimeField(auto_now_add=True)
      approved_at = DateTimeField(null=True)
      executed_at = DateTimeField(null=True)
      meta = JSONField(default=dict)  # trace, version, etc
  ```
- [ ] Run migrations
- [ ] Create admin interface

### Serializers
- [ ] Create `ActionSerializer` (DRF)
  - Full: pending, rejected, approved, executed status view
  - Nested: show creator name, approver name
- [ ] Create `ActionCreateSerializer` (draft validation)
- [ ] Validation rules per module/action_type

### Views (Viewsets)
- [ ] Implement `ActionsViewSet`
  - `create` → POST /api/actions/ (Isidoro only?)
  - `list` → GET /api/actions/ (filtered by tenant + status)
  - `retrieve` → GET /api/actions/{id}/
  - `approve` → POST /api/actions/{id}/approve/
  - `reject` → POST /api/actions/{id}/reject/
  - `edit` → PATCH /api/actions/{id}/ (only if pending)

- [ ] Add permissions:
  ```python
  permission_classes = [IsAuthenticated, IsTenantMember]
  filterset_fields = ["status", "module", "action_type"]
  ```

### URL Routing
- [ ] Register in `apps/actions/urls.py`
- [ ] Add to main `urls.py`

### Tests
- [ ] Unit tests for Action model
- [ ] API tests (create, approve, reject, archive)
- [ ] Permission tests (only approver can approve, etc)

**Deliverable:** Functional Action API with approval flow

---

## Semana 2: ZeroClaw Integration

### Intent Recognition
- [ ] **Map Isidoro → Action model**
  - Isidoro says: "Plantei 50ha de soja em Vila Nova"
  - ZeroClaw detects: module=agricultura, action_type=plant
  - Isidoro extracts: {"cultura": "soja", "ha": 50, "talhao_id": 5}
  
- [ ] **Create ZeroClaw config** for intent detection
  ```toml
  [intent_mapping.agricultura]
  plant = ["plantei", "Vou plantar", "nova plantação"]
  harvest = ["colhendo", "colheita", "colhi"]
  irrigate = ["irrigar", "água", "rega"]
  
  [intent_mapping.estoque]
  add = ["recebi", "entrada", "compra chegou"]
  remove = ["saiu", "uso", "consumo"]
  ```

- [ ] **Create intent router** (ZeroClaw agent)
  ```python
  # ~isidoro/.zeroclaw/agents/agriculture_assistant.yaml
  name: "Agriculture Assistant"
  capabilities: 
    - read_operacoes
    - draft_plant
    - draft_harvest
    - draft_irrigate
  ```

### API Client Integration
- [ ] **Create ZeroClaw API client** in `apps/actions/integrations/zeroclaw.py`
  ```python
  class ZeroclawClient:
      def create_action_draft(module, action_type, data):
          return POST /api/actions/
      
      def get_read_only_data(module, filters):
          return GET /api/{module}/
  ```

- [ ] **Test with curl/Postman**
  ```bash
  curl -X POST http://localhost:8000/api/actions/ \
    -H "Authorization: Bearer $ZEROCLAW_TOKEN" \
    -H "X-Tenant-ID: agrolink-demo" \
    -d '{"module": "agricultura", "action_type": "plant", "draft_data": {...}}'
  ```

### ZeroClaw Config
- [ ] Update `~/.zeroclaw/config.toml`
  ```toml
  [providers.agrolink]
  base_url = "http://localhost:8000/api"
  api_key = "xxxxxxxx"
  tenant_id = "agrolink-demo"
  
  [modules.agricultura]
  enabled = true
  read_only = false
  permissions = ["plant", "harvest", "irrigate"]
  ```

### WhatsApp Integration (NEW!)
- [ ] **Setup Twilio/Meta account**
  - Criar conta Twilio ou usar Meta API direto
  - Verificar phone number (WhatsApp Business)
  - Pedir aprovação para templates

- [ ] **Create webhook endpoint**
  - `POST /api/channels/whatsapp/webhook/`
  - Validar assinatura (X-Twilio-Signature ou Meta token)
  - Save incoming messages

- [ ] **Create WhatsAppUser & Message models**
  ```python
  class WhatsAppUser(models.Model):
      phone_number = CharField(unique=True)
      tenant = ForeignKey(Tenant)
      blocked = BooleanField(default=False)
  
  class Message(models.Model):
      channel = CharField(choices=[("whatsapp", ...), ("telegram", ...), ("web", ...)])
      user = ForeignKey(User)
      content = TextField()
      sender = CharField(choices=[("user", ...), ("isidoro", ...)])
  ```

- [ ] **Add rate limiting**
  - 100 messages/hour per user
  - 10 messages/minute per user
  - Redis cache para contadores

- [ ] **Send WhatsApp replies via Twilio/Meta**
  - Template: "Preparei ação! Ver aqui: [link]"
  - Link direto para `/dashboard/actions/{id}`

- [ ] **Handle audio (if present)**
  - Download de WhatsApp
  - Send to Whisper (faster-whisper local)
  - Transcribe e processa como text

**Deliverable:** WhatsApp integration working (pode enviar/receber mensagens)

---

## Semana 3: Frontend Dashboard & Action Approval Flow

**Goal:** Dashboard básico com actions list + approval flow + initial chat UI

**Hours:** 80h (Full-time team: 2 devs × 40h)

### Action Management UI (Core MVP)
- [ ] **ActionsList Component** (`src/components/ActionsList.tsx`)
  - [ ] Table rows: icon, title, status, created_at, actions
  - [ ] Status colors: pending (🟡), approved (🟢), rejected (🔴)
  - [ ] Filters: status, module, date range
  - [ ] Search: title + description
  - [ ] Sort: date (newest first), status
  - [ ] Pagination: 20 actions per page

- [ ] **ActionDetail Component** (`src/components/ActionDetail.tsx`)
  - [ ] Side panel or Modal with full action details
  - [ ] Display: title, description, details JSON
  - [ ] Show timeline: created → approved/rejected
  - [ ] Edit button (state: draft → reviewing)
  - [ ] Approve button (state: draft → approved)
  - [ ] Reject button + reason textarea

- [ ] **ActionEditor Component** (`src/components/ActionEditor.tsx`)
  - [ ] Edit form for action fields
  - [ ] Inline validation (e.g., hectares > 0)
  - [ ] Save as draft / Cancel
  - [ ] Unsaved changes warning

- [ ] **ActionApprovalFlow Component** (`src/components/ActionApprovalFlow.tsx`)
  - [ ] Visual workflow: draft → reviewing → approved/rejected
  - [ ] Timestamps at each stage
  - [ ] User who approved/rejected (if applicable)
  - [ ] Notes/feedback field

### Chat Widget - Integrated Landing Page (NEW!)

**⚠️ Layout Change:** Chat now in main Dashboard center (not separate tab)

- [ ] **ChatWidget.tsx** (Main interface)
  - [ ] Message history (scrollable, oldest → newest)
  - [ ] ActionPreviewCard inline (bot suggestions)
  - [ ] Typing indicator ("Isidoro está digitando...")
  - [ ] Real-time updates via WebSocket

- [ ] **ChatMessage.tsx** (Message bubbles)
  - [ ] User messages (right-aligned, blue)
  - [ ] Bot messages (left-aligned, gray)
  - [ ] Timestamp display
  - [ ] Avatar icons

- [ ] **ChatInputArea.tsx** (Input + file upload)
  - [ ] Text input field (multiline)
  - [ ] Mic button (voice recording)
  - [ ] **[Anexar] file upload button** (NEW!)
  - [ ] Send button

- [ ] **FileUploadHandler.tsx** (NEW!)
  - [ ] Accept: .xlsx, .csv, .docx, .pptx, .pdf
  - [ ] Max 10 MB
  - [ ] Drag & drop support
  - [ ] Progress bar
  - [ ] Error handling
  - [ ] Analyze button after upload

- [ ] **ActionPreviewCard.tsx** (Inline suggestions)
  - [ ] Embedded in chat
  - [ ] Title + description
  - [ ] [✅ Confirmar] [✏️ Editar] [❌ Rejeitar]
  - [ ] Styled as info card (green)

- [ ] **PendingTasksPanel.tsx** (Right sidebar) (NEW!)
  - [ ] Title: "Pendências IA"
  - [ ] Task list with status badges
  - [ ] Task cards: status + description + date
  - [ ] **Click task card → opens TaskModal (centered overlay)**
  - [ ] [+ Nova tarefa IA] button

- [ ] **TaskModal.tsx** (Modal for task detail/approval) (NEW!)
  - [ ] Opens when clicking a pending task from sidebar
  - [ ] Displayed as centered overlay on dashboard
  - [ ] Header: Task title + close button [✕]
  - [ ] Content sections:
    - [ ] Status badge (pending/approved/rejected)
    - [ ] Description + details
    - [ ] Draft data (formatted or editable form)
    - [ ] Timeline: created_at, creator, etc.
  - [ ] Action buttons at bottom:
    - [ ] [✅ Confirmar/Aprovar]
    - [ ] [✏️ Editar] → toggle edit mode
    - [ ] [❌ Rejeitar] → show reason textarea
    - [ ] [✕ Fechar] → close modal
  - [ ] Behavior:
    - [ ] On click edit → enable form fields, change button to [Salvar]
    - [ ] On click Confirmar → POST /api/actions/{id}/approve/
    - [ ] On click Rejeitar → textarea for reason → POST with status=rejected
    - [ ] On close → refresh PendingTasksPanel list
    - [ ] Keyboard: ESC to close

### Dashboard Layout (NEW! - LANDING PAGE FOCUSED)

- [ ] **Main route: `/dashboard` (Landing page with Chat)**
  - [ ] Single page with metrics + chat + pending tasks
  - [ ] No separate tabs for chat/actions
  - [ ] Responsive: Mobile stacks vertically

- [ ] **Grid layout:**
  - [ ] Top: MetricsCards (Saldo, Áreas, Estoque, Máquinas)
  - [ ] Center: ChatWidget with file upload
  - [ ] Right: PendingTasksPanel sidebar
  - [ ] Left: Navigation menu (existing)
  - [ ] **Overlay:** TaskModal (when task selected from sidebar)

- [ ] **Sidebar menu (unchanged):**
  - [ ] Dashboard (main)
  - [ ] Central de Inteligência
  - [ ] Fazendas, Agricultura, etc.
  - [ ] Settings

- [ ] **Modal behavior:**
  - [ ] Click task in PendingTasksPanel → TaskModal opens
  - [ ] Modal is centered overlay on dashboard
  - [ ] Can edit, approve, or reject task
  - [ ] Click [Fechar] or outside modal → closes, refreshes list

### State Management
- [ ] **Context API setup** (`src/context/ActionContext.tsx`)
  - [ ] Provide: actions[], selectedAction, filters
  - [ ] Dispatch: setActions, selectAction, updateFilter
  - [ ] Hook: useActions()

- [ ] **WebSocket placeholder**
  - [ ] Create Socket.IO client (not connected yet)
  - [ ] Stub for future: chat:message event
  - [ ] Endpoint: ws://localhost:8000/ws/chat/

### Integration with Backend
- [ ] **API calls:**
  - [ ] GET `/api/actions/` (list with filters)
  - [ ] GET `/api/actions/{id}/` (detail)
  - [ ] PATCH `/api/actions/{id}/` (update)
  - [ ] POST `/api/actions/{id}/approve/` (approve)
  - [ ] POST `/api/actions/{id}/reject/` (reject + reason)

- [ ] **Error handling:**
  - [ ] Toast/alert for API errors
  - [ ] Retry button on timeout

### Testing (Semana 3)
- [ ] **Component tests:**
  - [ ] ActionsList renders 20 rows
  - [ ] ActionDetail updates on selection
  - [ ] ActionApprovalFlow shows correct timeline
  - [ ] ChatWidget renders input (placeholder)

- [ ] **Integration tests:**
  - [ ] Load actions → Select → See detail
  - [ ] Approve flow: click approve → API call → status changes
  - [ ] Reject flow: click reject → reason required → API call

- [ ] **E2E tests (basic):**
  - [ ] User sees actions list
  - [ ] User clicks action → sees detail
  - [ ] User approves → sees status change
  - [ ] User rejects → sees status change + reason saved

### CSS/Styling
- [ ] **Tailwind setup** (or Bootstrap)
- [ ] **Color scheme:** Primary (green/agrícola), secondary, neutral
- [ ] **Responsive:** Mobile (actions go full-width), Tablet, Desktop
- [ ] **Dark mode placeholder** (prep for future)

### Deliverable
✅ Working dashboard with:
- [ ] Actions list with filtering + pagination
- [ ] Approval/rejection flow functional
- [ ] Chat widget skeleton (not fully integrated yet)
- [ ] All components styled
- [ ] Unit + integration tests passing

---

## Semana 3.5: Chat Widget Deep Integration (OVERLAPS w/ Semana 4 if needed)

**Goal:** Full chat widget with WebSocket, voice, history, real-time updates

**Hours:** 60h (Full-time: 1-2 devs × 30-40h, can run parallel with Semana 3)

### Chat Backend Integration
- [ ] **Socket.IO server** (Django + Channels, ASGI)
  - [ ] Install: `channels[daphne]`, `channels-redis`
  - [ ] Update `asgi.py`: Wrap Django with Channels
  - [ ] Create WebSocket consumer: `chat/consumers.py`
  - [ ] Namespace: `/ws/chat/{tenant_id}/{user_id}/`
  - [ ] Events:
    - [ ] `chat:message` (user sends message)
    - [ ] `chat:typing` (user typing...)
    - [ ] `chat:action_created` (bot creates action)

- [ ] **Chat message API** (REST + WebSocket)
  - [ ] POST `/api/channels/messages/` (save message)
  - [ ] GET `/api/channels/messages/?limit=50&offset=0` (pagination)
  - [ ] WebSocket event broadcasts save → show in real-time

### Chat Components - Full Version
- [ ] **ChatWidget.tsx** (Expanded)
  - [ ] Connect to Socket.IO on mount
  - [ ] Load initial messages on mount
  - [ ] Subscribe to incoming messages (real-time)
  - [ ] Subscribe to typing indicator
  - [ ] Show "Isidoro is typing..." when bot:typing event

- [ ] **ChatMessage.tsx** (Enhanced)
  - [ ] Support formatting: markdown, ** bold **, links
  - [ ] Embed action cards (ActionPreviewCard)
  - [ ] Copy message button
  - [ ] Timestamp tooltip (exact time)

- [ ] **ChatInputArea.tsx** (Full version)
  - [ ] Text input + send button
  - [ ] Mic button (for voice, see below)
  - [ ] Emoji picker (optional)
  - [ ] Sends via WebSocket (not HTTP)

- [ ] **ActionPreviewCard.tsx** (New component)
  - [ ] Displays action inline in chat
  - [ ] Title, description, action button
  - [ ] "VIEW DETAILS" → link to /dashboard/actions/{id}
  - [ ] "APPROVE HERE" → inline approval with reason
  - [ ] "REJECT HERE" → inline rejection with reason
  - [ ] Shows even if user is only on web chat (no need to go to dashboard)

### Voice Input
- [ ] **Voice recording** (`src/utils/voiceRecorder.ts`)
  - [ ] Use browser Web Audio API
  - [ ] Mic button: tap to start, tap to stop
  - [ ] Visual feedback: red dot pulsing while recording
  - [ ] Time counter (00:15 elapsed)

- [ ] **Voice transcription flow**
  - [ ] Record → blob (WAV format)
  - [ ] Send blob via WebSocket or HTTP POST
  - [ ] Backend: Save audio file (temp storage)
  - [ ] Backend: Call faster-whisper: `whisper-cli /tmp/audio.wav`
  - [ ] Backend: Get transcription text
  - [ ] Backend: Send transcription back to client via WebSocket
  - [ ] Frontend: Display transcript in input field
  - [ ] User can edit before sending
  - [ ] User clicks send → message goes as text

- [ ] **Error handling (voice)**
  - [ ] Browser doesn't support recording → fallback to text input
  - [ ] Whisper transcription fails → prompt: "Sorry, couldn't transcribe. Try again or type."
  - [ ] Long audio (>30s) → truncate or warn

### Chat History & Pagination
- [ ] **Initial load on mount:**
  - [ ] GET `/api/channels/messages/?limit=50`
  - [ ] Display messages (oldest → newest, newest at bottom)

- [ ] **Infinite scroll (when user scrolls up):**
  - [ ] Detect: user scrolled to top
  - [ ] GET `/api/channels/messages/?limit=50&offset=50`
  - [ ] Prepend to message list (don't lose current scroll position)
  - [ ] If no more msgs, stop loading

- [ ] **Persistence:**
  - [ ] All messages saved in DB (Message model)
  - [ ] Links to Action records (if applicable)
  - [ ] Cross-channel visibility (if user switches devices)

### Real-Time Updates
- [ ] **Message sent:**
  - [ ] User sends → WebSocket emit to server
  - [ ] Server broadcasts to all users in room
  - [ ] All tabs/devices see message instantly

- [ ] **Action created:**
  - [ ] Bot sends "Preparei ação!" + ActionPreviewCard
  - [ ] WebSocket event: `chat:action_created { action_id, title }`
  - [ ] Chat displays card
  - [ ] Also triggers ActionsList refresh (Context update)

- [ ] **User approves in chat:**
  - [ ] User clicks "APPROVE HERE" in ActionPreviewCard
  - [ ] Modal/form: confirm + optional reason
  - [ ] POST `/api/actions/{id}/approve/`
  - [ ] Action status → approved
  - [ ] Chat shows confirmation: "✅ Ação aprovada!"
  - [ ] ActionsList also updates (Context refresh)

### Notifications
- [ ] **Browser notifications** (if user has tab open but not focused)
  - [ ] New message from bot → show notification
  - [ ] Ask permission on first load
  - [ ] Icon: Isidoro avatar
  - [ ] Click notification → focus chat tab

- [ ] **Unread badge**
  - [ ] Sidebar: "Chat (3)" if 3 unread
  - [ ] Clears when user opens chat

### Styling (Chat)
- [ ] **Chat bubble colors:**
  - [ ] User messages: light blue background, right-aligned
  - [ ] Bot messages: light gray, left-aligned
  - [ ] Action cards: light green background, prominent

- [ ] **Responsive:**
  - [ ] Mobile: full-width chat
  - [ ] Tablet: split left-right
  - [ ] Desktop: split left-right with wider action panel

- [ ] **Animations:**
  - [ ] Message fade-in (subtle)
  - [ ] Typing animation (4 dots, repeat)
  - [ ] Mic recording pulse

### Testing (Semana 3.5)
- [ ] **Unit tests:**
  - [ ] ChatMessage renders with correct styling
  - [ ] ChatInputArea sends message on Enter key
  - [ ] Voice recorder starts/stops correctly

- [ ] **Integration tests:**
  - [ ] User sends message → appears in list (WebSocket)
  - [ ] User approves in chat → action status changes
  - [ ] Voice input → transcription displayed
  - [ ] Infinite scroll loads more messages

- [ ] **E2E tests:**
  - [ ] Full chat flow: User sends → Bot responds → User approves → Status changes
  - [ ] Voice flow: User records → Transcription → Send → See in chat
  - [ ] Cross-tab sync: Open 2 tabs, send in one, see in other

### Code Examples (Snippets)

**WebSocket connection (React):**
```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function ChatWidget() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const s = io('ws://localhost:8000', {
      path: '/ws/chat/',
      query: { tenant_id: getTenantId(), user_id: getUserId() }
    });

    s.on('chat:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    setSocket(s);
    return () => s.close();
  }, []);

  return <div>{/* Chat UI */}</div>;
}
```

**Voice recording (Web Audio API):**
```typescript
const recorder = new MediaRecorder(stream);
const chunks = [];

recorder.ondataavailable = (e) => chunks.push(e.data);
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/wav' });
  // Send blob to server via WebSocket or HTTP
  socket.emit('chat:voice', { audio: blob, tenant_id });
};

recorder.start();
// Later: recorder.stop();
```

**Backend WebSocket consumer (Django Channels):**
```python
from channels.generic.websocket import AsyncWebsocketConsumer
import json

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.tenant_id = self.scope['query_string'].decode().split('=')[1]
        await self.channel_layer.group_add(f'chat_{self.tenant_id}', self.channel_name)
        await self.accept()

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    async def receive(self, text_data):
        data = json.loads(text_data)
        # Save to DB, process with ZeroClaw, etc.
        await self.channel_layer.group_send(
            f'chat_{self.tenant_id}',
            {'type': 'chat.message', 'message': data['content']}
        )
```

### Deliverable
✅ Fully functional chat widget with:
- [ ] Real-time messaging (WebSocket)
- [ ] Voice input with Whisper transcription
- [ ] Action cards with inline approval
- [ ] Chat history (pagination, infinite scroll)
- [ ] Browser notifications
- [ ] All tests passing
- [ ] Mobile-responsive
- [ ] Ready for WhatsApp integration testing

---

## Semana 4: Refinements & Testing

### Whats App Integration Completion (Semana 2 carryover)
- [ ] **Test WhatsApp end-to-end**
  - Send message via WhatsApp phone
  - Verify webhook receives it
  - Verify ZeroClaw processes it
  - Verify reply sent back
  - Verify messages saved in DB

- [ ] **Handle edge cases**
  - Message longer than 1 SMS (segmentation)
  - Audio fail → fallback to text prompt
  - WhatsApp down → queue and retry
  - Rate limit exceeded → friendly message

- [ ] **Templates setup** (Meta Business approval)
  - "Preparei ação! Ver: {url}"
  - "Ação executada com sucesso"
  - "Ação rejeitada: {reason}"

### Chat Widget Completion & Polish (Semana 3 carryover)
- [ ] **Keyboard shortcuts**
  - Enter = send
  - Shift+Enter = new line
  - Ctrl+Shift+V = paste

- [ ] **Auto-scroll**
  - New messages scroll to bottom
  - Unless user scrolled up (reading history)

- [ ] **Typing animation**
  - Dots animation ("Isidoro está digitando...")
  - Disappear when message arrives

- [ ] **Accessibility (a11y)**
  - [X] ARIA labels on buttons
  - [X] Keyboard navigation (tab through messages)
  - [X] High contrast for readability
  - [X] Voice reader support

### Scenario Testing
- [ ] **Scenario 1: Chat via WhatsApp → Approve in Web**
  - User envia via WhatsApp: "Plantei 50ha soja"
  - Bot responde: "Preparei! Ver: [link]"
  - User clica link → abre /dashboard/actions
  - User aprova no dashboard
  - Bot responde no WhatsApp: "✅ Executado!"

- [ ] **Scenario 2: Chat via Web Widget → Receive in WhatsApp**
  - User digita no web chat: "Colhendo milho"
  - Bot responde no web chat
  - User também recebe no WhatsApp (sync)
  - Pode continuar conversa em qualquer canal

- [ ] **Scenario 3: Voice input via Web Chat**
  - User clica mic button
  - Grava: "Plantei soja em Vila Nova"
  - Transcrição aparece e envia
  - Bot responde normalmente

- [ ] **Scenario 4: Rejeição via Chat**
  - User rejeita ação diretamente no chat
  - [VER] → [REJEITAR AQUI]
  - Ação marcada como rejected
  - Feedback no chat

### Performance Testing
- [ ] Load test: 100 concurrent chat connections
- [ ] WebSocket latency < 500ms
- [ ] Message delivery < 2 seconds
- [ ] Chat history load < 1 second
- [ ] Database queries optimized (índices em message_at, tenant_id, user_id)

### Security Audit
- [ ] JWT validation in every WebSocket frame
- [ ] Tenant isolation in WebSocket rooms
- [ ] Rate limiting per user (prevent spam)
- [ ] XSS prevention in message content (sanitize)
- [ ] CSRF protection in message send
- [ ] Audit log: who said what, when (compliance)

### WhatsApp Security Specifics
- [ ] Validate Twilio/Meta webhook signatures
- [ ] Never log phone numbers in plain text (hash)
- [ ] Encrypt phone_number in DB (or pseudonymize)
- [ ] PII (Personally Identifiable Info) handling
  - Don't repeat user's phone in responses
  - Privacy in audit logs

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
  - `/api/channels/whatsapp/webhook/`
  - `/api/channels/messages/`
  - `/ws/chat/{tenant_id}/{user_id}/`
  
- [ ] User guide
  - How to chat with Isidoro
  - How to voice message
  - How to approve actions from chat
  
- [ ] Dev guide
  - How to extend chat widget
  - How to add new channel (Slack, etc)
  - WebSocket architecture
  
- [ ] Admin guide
  - Monitor WhatsApp webhook health
  - View message logs
  - Manage blocked users
  - Analytics: messages per user, approval rate

### Deployment Prep
- [ ] Environment variables (.env template)
  - WHATSAPP_PROVIDER
  - TWILIO_ACCOUNT_SID
  - SOCKET_IO_REDIS_URL
  
- [ ] Database migrations
  - apps/channels/migrations/
  
- [ ] Redis setup (WebSocket)
  - Redis server running
  - Connection string in settings
  
- [ ] Monitoring setup
  - Logs for webhook failures
  - Alerts for slow responses
  - Metrics: messages/min, delivery rate
  
- [ ] Rollback plan
  - If WhatsApp down: Fall back to web chat only
  - If WebSocket down: Fall back to polling
  - If ZeroClaw down: Queue messages till recovery

**Deliverable:** MVP ready for pilot testing (WhatsApp + Web Chat fully functional)

---

## 📋 Blocking Dependencies

| Item | Bloqueado Por | Ação |
|------|---------------|------|
| Semana 2 | Semana 1 | Backend API completo |
| Semana 3 | Semana 1 | API endpoints estáveis |
| Semana 4 | Semana 1-3 | Tudo funcional |

---

## 👥 Equipe & Assignment

| Papel | Dev | Horas | Semana |
|-------|-----|-------|--------|
| Backend (Models, Views, Tests) | Dev A | 40 | 1 |
| ZeroClaw Integration | Dev B | 30 | 2 |
| Frontend Dashboard (Actions) | Dev C | 40 | 3 |
| Chat Widget (WebSocket, Voice) | Dev D | 60 | 3.5 |
| WhatsApp Completion & Testing | Dev B | 20 | 4 |
| QA & Documentation | Dev A/C | 20 | 4 |
| DevOps (Deployment) | Dev E | 15 | 4 |

**Total:** ~225 horas / ~4-5 devs / 4.5 semanas (can overlap 3 + 3.5)

---

## 🚀 Próximos Passos

1. [ ] Copie este checklist para Jira/GitHub
2. [ ] Assign developers
3. [ ] Create GitHub milestones por semana
4. [ ] Daily standups (15min)
5. [ ] Friday demos (product owner)

**Kickoff:** Segunda-feira próxima
**MVP Ready:** 4.5 semanas depois (Semana 3 + 3.5 podem overlap)
