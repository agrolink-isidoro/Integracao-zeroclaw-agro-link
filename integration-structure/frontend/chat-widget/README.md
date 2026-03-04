# chat-widget (skeleton)

Componentes React para o widget de chat integrado no dashboard Agrolink.

Arquivos sugeridos:
- `ChatWidget.tsx`
- `MessageList.tsx`
- `ActionPreview.tsx`
- `InputArea.tsx` (inclui suporte a gravação de voz)

State: mensagens, typingIndicator, currentAction, connectionStatus.

Comunicação: Socket.IO para `ws://<agrolink-host>/`.
