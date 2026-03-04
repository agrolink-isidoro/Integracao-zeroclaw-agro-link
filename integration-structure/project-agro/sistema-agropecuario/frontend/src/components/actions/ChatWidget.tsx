import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useActions } from '../../contexts/ActionsContext';
import type { ChatMessage } from '../../contexts/ActionsContext';
import type { ActionModule } from '../../services/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function detectModule(filename: string): ActionModule {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'xml') return 'fiscal';
  if (['kml', 'kmz', 'geojson', 'gpx'].includes(ext)) return 'fazendas';
  if (['pdf', 'xlsx', 'xls', 'csv'].includes(ext)) return 'estoque';
  return 'estoque';
}

const ACCEPT = '.xml,.pdf,.xlsx,.xls,.csv,.kml,.kmz,.geojson,.gpx,.docx,.doc,.odt,.ods,.odp,.txt,.md';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.sender === 'user';
  return (
    <div className={`d-flex mb-2 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
      {!isUser && (
        <div
          className="rounded-circle bg-success d-flex align-items-center justify-content-center me-2 flex-shrink-0"
          style={{ width: 28, height: 28, fontSize: '0.75rem', color: '#fff' }}
        >
          AI
        </div>
      )}
      <div
        className={`px-3 py-2 rounded-3 small ${
          isUser
            ? 'bg-primary text-white'
            : msg.isError
            ? 'bg-danger bg-opacity-10 text-danger border border-danger'
            : 'bg-light text-dark border'
        }`}
        style={{ maxWidth: '78%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {msg.text}
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => (
  <div className="d-flex justify-content-start mb-2">
    <div
      className="rounded-circle bg-success d-flex align-items-center justify-content-center me-2 flex-shrink-0"
      style={{ width: 28, height: 28, fontSize: '0.75rem', color: '#fff' }}
    >
      AI
    </div>
    <div className="bg-light border px-3 py-2 rounded-3 d-flex align-items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#6c757d',
            display: 'inline-block',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────────────────────────────────────

const ChatWidget: React.FC = () => {
  const {
    chatMessages,
    sendChatMessage,
    isChatConnected,
    isChatTyping,
    clearChat,
    pendingActions,
    uploadChatFile,
  } = useActions();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, chatMessages, isChatTyping]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || !isChatConnected) return;
    sendChatMessage(text);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── File handling ────────────────────────────────────────────────────────

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFileChosen = useCallback(async (file: File) => {
    const module = detectModule(file.name);
    setUploadProgress(0);
    try {
      await uploadChatFile(file, module, (pct) => setUploadProgress(pct));
    } finally {
      setUploadProgress(null);
    }
  }, [uploadChatFile]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChosen(file);
    e.target.value = '';
  };

  // ── Drag and drop ────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileChosen(file);
  }, []);

  const pendingCount = pendingActions.length;

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .chat-drag-overlay {
          position: absolute;
          inset: 0;
          background: rgba(25, 135, 84, 0.12);
          border: 2.5px dashed #198754;
          border-radius: 16px;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Floating button */}
      {!isOpen && (
        <button
          className="btn btn-success rounded-circle shadow-lg d-flex align-items-center justify-content-center"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            zIndex: 1050,
            fontSize: '1.3rem',
          }}
          onClick={() => setIsOpen(true)}
          title="Abrir Isidoro – Assistente IA"
        >
          <i className="bi bi-robot"></i>
          {pendingCount > 0 && (
            <span
              className="badge bg-danger rounded-pill"
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                fontSize: '0.65rem',
                minWidth: 18,
                height: 18,
                lineHeight: '18px',
                padding: '0 4px',
              }}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className="card shadow-lg border-0"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 370,
            maxWidth: 'calc(100vw - 32px)',
            height: 540,
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="chat-drag-overlay">
              <div className="text-success fw-semibold small text-center">
                <i className="bi bi-cloud-upload fs-3 d-block mb-1"></i>
                Solte o arquivo aqui
              </div>
            </div>
          )}

          {/* Header */}
          <div className="d-flex align-items-center gap-2 px-3 py-2 bg-success text-white flex-shrink-0">
            <i className="bi bi-robot fs-5"></i>
            <div className="flex-grow-1">
              <div className="fw-semibold small lh-1">Isidoro</div>
              <div className="opacity-75" style={{ fontSize: '0.7rem' }}>
                {isChatConnected ? (
                  <><span className="me-1" style={{ color: '#90ee90' }}>●</span>Conectado</>
                ) : (
                  <><span className="me-1" style={{ color: '#ffcccc' }}>●</span>Reconectando…</>
                )}
              </div>
            </div>
            {chatMessages.length > 0 && (
              <button
                className="btn btn-sm btn-link text-white text-decoration-none p-0 me-2 opacity-75"
                onClick={clearChat}
                title="Limpar conversa"
                style={{ fontSize: '0.75rem' }}
              >
                <i className="bi bi-trash"></i>
              </button>
            )}
            <button
              className="btn btn-sm btn-link text-white text-decoration-none p-0"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              style={{ fontSize: '1rem' }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-grow-1 p-3 overflow-auto"
            style={{ backgroundColor: '#f8f9fa', position: 'relative' }}
          >
            {chatMessages.length === 0 && !isChatTyping && (
              <div className="text-center text-muted py-4 small">
                <i className="bi bi-chat-dots fs-2 d-block mb-2 opacity-50"></i>
                Olá! Sou o <strong>Isidoro</strong>, seu assistente agrícola.
                <br />
                Posso registrar operações, colheitas, manutenções e muito mais. Como posso ajudar?
                <div className="mt-3 opacity-50" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-paperclip me-1"></i>
                  Arraste um arquivo ou clique em 📎 para enviar documentos.
                </div>
              </div>
            )}
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isChatTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {chatMessages.length === 0 && uploadProgress === null && (
            <div className="px-3 py-2 border-top flex-shrink-0" style={{ backgroundColor: '#f0f0f0' }}>
              <div className="d-flex gap-1 flex-wrap">
                {[
                  'Registrar operação agrícola',
                  'Entrada de estoque NF',
                  'Abastecer trator',
                ].map((s) => (
                  <button
                    key={s}
                    className="btn btn-outline-secondary btn-sm"
                    style={{ fontSize: '0.7rem' }}
                    onClick={() => { setInputValue(s); inputRef.current?.focus(); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <div className="px-3 py-2 border-top bg-white flex-shrink-0">
              <div className="d-flex align-items-center gap-2 small text-muted mb-1">
                <i className="bi bi-cloud-upload"></i>
                Enviando arquivo… {uploadProgress}%
              </div>
              <div className="progress" style={{ height: 6 }}>
                <div
                  className="progress-bar bg-success"
                  style={{ width: `${uploadProgress}%`, transition: 'width 0.2s' }}
                />
              </div>
            </div>
          )}

          {/* Text input */}
          {uploadProgress === null && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 border-top bg-white flex-shrink-0">
              <button
                className="btn btn-outline-secondary btn-sm flex-shrink-0"
                onClick={openFilePicker}
                title="Anexar arquivo"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <i className="bi bi-paperclip"></i>
              </button>
              <input
                ref={inputRef}
                type="text"
                className="form-control form-control-sm"
                placeholder={isChatConnected ? 'Mensagem para Isidoro…' : 'Aguardando conexão…'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isChatConnected}
                maxLength={1000}
              />
              <button
                className="btn btn-success btn-sm flex-shrink-0"
                onClick={handleSend}
                disabled={!isChatConnected || !inputValue.trim()}
                title="Enviar"
              >
                <i className="bi bi-send-fill"></i>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
