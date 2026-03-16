import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useActions } from '../../contexts/ActionsContext';
import { getStoredTokens } from '../../hooks/useAuth';
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function detectModule(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'xml')
        return 'fiscal';
    if (['kml', 'kmz', 'geojson', 'gpx'].includes(ext))
        return 'fazendas';
    if (['pdf', 'xlsx', 'xls', 'csv'].includes(ext))
        return 'estoque';
    return 'estoque';
}
const ACCEPT = '.xml,.pdf,.xlsx,.xls,.csv,.kml,.kmz,.geojson,.gpx,.docx,.doc,.odt,.ods,.odp,.txt,.md';
/** Check if message text looks like a report (has KPIs / tables / bullet lists) */
function isReportMessage(text) {
    const indicators = ['**', '###', '| ', '- ', '* ', 'R$', 'Total', 'Resumo', 'Relatório', 'KPI'];
    let score = 0;
    for (const ind of indicators) {
        if (text.includes(ind))
            score++;
    }
    return score >= 3 && text.length > 300;
}
// ─────────────────────────────────────────────────────────────────────────────
// PDF Export — WeasyPrint Server-side (selectable text) — ONLY METHOD
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Export chat message to PDF via WeasyPrint server endpoint.
 * Generates text-selectable PDFs (not image-based).
 * This is the ONLY PDF export method available.
 */
async function exportMessageToPdf(messageElement, title = 'Relatório Isidoro') {
    try {
        const tokens = getStoredTokens();
        if (!tokens?.access) {
            throw new Error('Autenticação necessária. Por favor, faça login novamente.');
        }
        const htmlContent = messageElement.innerHTML;
        const response = await fetch('/api/actions/chat-pdf-export/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access}`,
            },
            body: JSON.stringify({
                html_content: htmlContent,
                title: title,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log(`✓ PDF exportado via WeasyPrint: ${a.download}`);
    }
    catch (error) {
        console.error('❌ Erro ao exportar PDF:', error);
        alert(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_STYLES = `
  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  @keyframes chatModalIn {
    from { opacity: 0; transform: scale(0.92) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
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

  /* ── Markdown message styles ───────────────────────────────────── */
  .isidoro-msg {
    line-height: 1.65;
    font-size: 0.84rem;
    color: #1e293b;
  }
  .isidoro-msg p { margin: 0 0 0.5em; }
  .isidoro-msg p:last-child { margin-bottom: 0; }
  .isidoro-msg strong { font-weight: 700; color: #0f172a; }
  .isidoro-msg em { font-style: italic; }
  .isidoro-msg u { text-decoration: underline; text-underline-offset: 2px; }

  .isidoro-msg ul, .isidoro-msg ol {
    margin: 0.3em 0 0.6em;
    padding-left: 1.6em;
  }
  .isidoro-msg li {
    margin-bottom: 0.25em;
    line-height: 1.55;
  }
  .isidoro-msg li::marker { color: #198754; font-weight: 700; }

  .isidoro-msg h1, .isidoro-msg h2, .isidoro-msg h3,
  .isidoro-msg h4, .isidoro-msg h5, .isidoro-msg h6 {
    margin: 0.8em 0 0.3em;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }
  .isidoro-msg h1 { font-size: 1.15rem; }
  .isidoro-msg h2 { font-size: 1.05rem; }
  .isidoro-msg h3 { font-size: 0.97rem; }
  .isidoro-msg h4 { font-size: 0.92rem; }

  .isidoro-msg hr {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin: 0.7em 0;
  }

  .isidoro-msg blockquote {
    border-left: 3px solid #198754;
    margin: 0.5em 0;
    padding: 0.3em 0 0.3em 0.8em;
    color: #475569;
    background: #f0fdf4;
    border-radius: 0 6px 6px 0;
  }

  .isidoro-msg code {
    background: #f1f5f9;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.82em;
    color: #be185d;
    font-family: 'Fira Code', 'Consolas', monospace;
  }

  .isidoro-msg pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 0.8em 1em;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0.5em 0;
    font-size: 0.8em;
    line-height: 1.5;
  }
  .isidoro-msg pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    font-size: inherit;
  }

  .isidoro-msg table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5em 0;
    font-size: 0.82em;
  }
  .isidoro-msg th {
    background: #f0fdf4;
    font-weight: 700;
    text-align: left;
    padding: 0.4em 0.6em;
    border-bottom: 2px solid #198754;
    color: #166534;
  }
  .isidoro-msg td {
    padding: 0.35em 0.6em;
    border-bottom: 1px solid #e2e8f0;
  }
  .isidoro-msg tr:hover td { background: #f8fafc; }

  /* ── Modal backdrop & transitions ──────────────────────────── */
  .chat-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    z-index: 1060;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: chatModalIn 0.2s ease-out;
  }

  /* ── Textarea autosize ─────────────────────────────────────── */
  .chat-textarea {
    resize: none;
    overflow-y: auto;
    max-height: 120px;
    min-height: 38px;
    line-height: 1.45;
    scrollbar-width: thin;
    transition: height 0.1s ease;
  }
  .chat-textarea:focus {
    box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25);
    border-color: #198754;
  }

  /* ── PDF button ────────────────────────────────────────────── */
  .pdf-export-btn {
    font-size: 0.7rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    opacity: 0.7;
    transition: opacity 0.15s, background-color 0.15s;
  }
  .pdf-export-btn:hover { opacity: 1; }
`;
// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, onExportPdf }) => {
    const isUser = msg.sender === 'user';
    const showPdf = !isUser && !msg.isError && isReportMessage(msg.text);
    return (_jsxs("div", { className: `d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`, children: [!isUser && (_jsx("div", { className: "rounded-circle bg-success d-flex align-items-center justify-content-center me-2 flex-shrink-0", style: { width: 30, height: 30, fontSize: '0.72rem', color: '#fff', marginTop: 2 }, children: "AI" })), _jsxs("div", { style: { maxWidth: '82%' }, children: [_jsx("div", { className: `px-3 py-2 rounded-3 ${isUser
                            ? 'bg-primary text-white'
                            : msg.isError
                                ? 'bg-danger bg-opacity-10 text-danger border border-danger'
                                : 'bg-white text-dark border shadow-sm'}`, style: {
                            wordBreak: 'break-word',
                            ...(isUser ? { whiteSpace: 'pre-wrap', fontSize: '0.84rem' } : {}),
                        }, children: isUser ? (msg.text) : (_jsx("div", { className: "isidoro-msg", "data-msg-id": msg.id, children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: msg.text }) })) }), showPdf && (_jsx("div", { className: "mt-1 text-end", children: _jsxs("button", { className: "btn btn-outline-success pdf-export-btn d-inline-flex align-items-center gap-1", onClick: onExportPdf, title: "Exportar relat\u00F3rio como PDF", children: [_jsx("i", { className: "bi bi-file-earmark-pdf" }), "Gerar PDF"] }) }))] })] }));
};
const TypingIndicator = () => (_jsxs("div", { className: "d-flex justify-content-start mb-2", children: [_jsx("div", { className: "rounded-circle bg-success d-flex align-items-center justify-content-center me-2 flex-shrink-0", style: { width: 30, height: 30, fontSize: '0.72rem', color: '#fff' }, children: "AI" }), _jsx("div", { className: "bg-white border shadow-sm px-3 py-2 rounded-3 d-flex align-items-center gap-1", children: [0, 1, 2].map((i) => (_jsx("span", { style: {
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#6c757d',
                    display: 'inline-block',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                } }, i))) })] }));
/** How many recent messages to show initially (older ones behind "load more") */
const INITIAL_VISIBLE = 20;
const LOAD_MORE_STEP = 20;
const ChatWidget = () => {
    const { chatMessages, sendChatMessage, isChatConnected, isChatTyping, clearChat, pendingActions, uploadChatFile, } = useActions();
    const [mode, setMode] = useState('closed');
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    // Upload state
    const [uploadProgress, setUploadProgress] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [pdfExporting, setPdfExporting] = useState(false);
    // "Load more" pagination — shows only the N most recent messages
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
    const totalMessages = chatMessages.length;
    const hiddenCount = Math.max(0, totalMessages - visibleCount);
    const visibleMessages = hiddenCount > 0 ? chatMessages.slice(hiddenCount) : chatMessages;
    // Reset visible count when chat is opened (show recent) or messages cleared
    useEffect(() => {
        setVisibleCount(INITIAL_VISIBLE);
    }, [mode, totalMessages === 0]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleLoadMore = useCallback(() => {
        setVisibleCount((prev) => prev + LOAD_MORE_STEP);
    }, []);
    // Auto-scroll & focus on open
    useEffect(() => {
        if (mode !== 'closed') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [mode, chatMessages, isChatTyping]);
    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = '38px';
            ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        }
    }, [inputValue]);
    // Close modal on Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && mode === 'modal')
                setMode('widget');
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [mode]);
    const handleSend = () => {
        const text = inputValue.trim();
        if (!text || !isChatConnected)
            return;
        sendChatMessage(text);
        setInputValue('');
        // Reset textarea height
        if (textareaRef.current)
            textareaRef.current.style.height = '38px';
    };
    const handleKeyDown = (e) => {
        // Enter → send (unless Shift or Alt is held)
        if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            handleSend();
        }
        // Alt+Enter → new line (default textarea behavior, no preventDefault needed)
    };
    const handleExportPdf = useCallback(async (msgId) => {
        const el = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (!el)
            return;
        setPdfExporting(true);
        try {
            await exportMessageToPdf(el, 'Relatório Isidoro');
        }
        catch (err) {
            console.error('PDF export failed:', err);
        }
        finally {
            setPdfExporting(false);
        }
    }, []);
    // ── File handling ────────────────────────────────────────────────────────
    const openFilePicker = () => fileInputRef.current?.click();
    const handleFileChosen = useCallback(async (file) => {
        const module = detectModule(file.name);
        setUploadProgress(0);
        try {
            await uploadChatFile(file, module, (pct) => setUploadProgress(pct));
        }
        finally {
            setUploadProgress(null);
        }
    }, [uploadChatFile]);
    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file)
            handleFileChosen(file);
        e.target.value = '';
    };
    // ── Drag and drop ────────────────────────────────────────────────────────
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback((e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file)
            handleFileChosen(file);
    }, [handleFileChosen]);
    const pendingCount = pendingActions.length;
    const isModal = mode === 'modal';
    // ── Shared chat body ─────────────────────────────────────────────────────
    const chatBody = (_jsxs(_Fragment, { children: [isDragging && (_jsx("div", { className: "chat-drag-overlay", children: _jsxs("div", { className: "text-success fw-semibold small text-center", children: [_jsx("i", { className: "bi bi-cloud-upload fs-3 d-block mb-1" }), "Solte o arquivo aqui"] }) })), _jsxs("div", { className: "d-flex align-items-center gap-2 px-3 py-2 bg-success text-white flex-shrink-0", style: { borderRadius: isModal ? '12px 12px 0 0' : '16px 16px 0 0' }, children: [_jsx("i", { className: "bi bi-robot fs-5" }), _jsxs("div", { className: "flex-grow-1", children: [_jsx("div", { className: "fw-semibold small lh-1", children: "Isidoro" }), _jsx("div", { className: "opacity-75", style: { fontSize: '0.7rem' }, children: isChatConnected ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "me-1", style: { color: '#90ee90' }, children: "\u25CF" }), "Conectado"] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "me-1", style: { color: '#ffcccc' }, children: "\u25CF" }), "Reconectando\u2026"] })) })] }), _jsxs("div", { className: "d-flex align-items-center gap-1", children: [chatMessages.length > 0 && (_jsx("button", { className: "btn btn-sm btn-link text-white text-decoration-none p-0 opacity-75", onClick: clearChat, title: "Limpar conversa", style: { fontSize: '0.8rem' }, children: _jsx("i", { className: "bi bi-trash" }) })), _jsx("button", { className: "btn btn-sm btn-link text-white text-decoration-none p-0 opacity-75", onClick: () => setMode(isModal ? 'widget' : 'modal'), title: isModal ? 'Modo janela' : 'Expandir', style: { fontSize: '0.9rem' }, children: _jsx("i", { className: `bi ${isModal ? 'bi-arrows-angle-contract' : 'bi-arrows-angle-expand'}` }) }), _jsx("button", { className: "btn btn-sm btn-link text-white text-decoration-none p-0", onClick: () => setMode('closed'), "aria-label": "Fechar", style: { fontSize: '1rem' }, children: _jsx("i", { className: "bi bi-x-lg" }) })] })] }), _jsxs("div", { className: "flex-grow-1 p-3 overflow-auto", style: { backgroundColor: '#f8f9fa', position: 'relative' }, children: [chatMessages.length === 0 && !isChatTyping && (_jsxs("div", { className: "text-center text-muted py-4 small", children: [_jsx("i", { className: "bi bi-chat-dots fs-2 d-block mb-2 opacity-50" }), "Ol\u00E1! Sou o ", _jsx("strong", { children: "Isidoro" }), ", seu assistente agr\u00EDcola.", _jsx("br", {}), "Posso registrar opera\u00E7\u00F5es, gerar relat\u00F3rios, consultar dados e muito mais.", _jsxs("div", { className: "mt-2 d-flex flex-column gap-1 align-items-center", style: { fontSize: '0.72rem' }, children: [_jsxs("span", { children: [_jsx("i", { className: "bi bi-paperclip me-1" }), " Arraste ou clique \uD83D\uDCCE para enviar documentos"] }), _jsxs("span", { children: [_jsx("kbd", { className: "bg-secondary text-white px-1 rounded", style: { fontSize: '0.65rem' }, children: "Alt" }), "+", _jsx("kbd", { className: "bg-secondary text-white px-1 rounded", style: { fontSize: '0.65rem' }, children: "Enter" }), " para nova linha"] })] })] })), hiddenCount > 0 && (_jsx("div", { className: "text-center mb-3", children: _jsxs("button", { className: "btn btn-sm btn-outline-secondary rounded-pill px-3", onClick: handleLoadMore, style: { fontSize: '0.72rem' }, children: [_jsx("i", { className: "bi bi-clock-history me-1" }), "Carregar mais (", hiddenCount, " mensagens anteriores)"] }) })), visibleMessages.map((msg) => (_jsx(MessageBubble, { msg: msg, onExportPdf: () => handleExportPdf(msg.id) }, msg.id))), isChatTyping && _jsx(TypingIndicator, {}), _jsx("div", { ref: messagesEndRef })] }), chatMessages.length === 0 && uploadProgress === null && (_jsx("div", { className: "px-3 py-2 border-top flex-shrink-0", style: { backgroundColor: '#f0f0f0' }, children: _jsx("div", { className: "d-flex gap-1 flex-wrap", children: [
                        'Resumo geral da fazenda',
                        'Relatório financeiro',
                        'Relatório de estoque',
                        'Registrar operação agrícola',
                    ].map((s) => (_jsx("button", { className: "btn btn-outline-secondary btn-sm", style: { fontSize: '0.7rem' }, onClick: () => { setInputValue(s); textareaRef.current?.focus(); }, children: s }, s))) }) })), uploadProgress !== null && (_jsxs("div", { className: "px-3 py-2 border-top bg-white flex-shrink-0", children: [_jsxs("div", { className: "d-flex align-items-center gap-2 small text-muted mb-1", children: [_jsx("i", { className: "bi bi-cloud-upload" }), "Enviando arquivo\u2026 ", uploadProgress, "%"] }), _jsx("div", { className: "progress", style: { height: 6 }, children: _jsx("div", { className: "progress-bar bg-success", style: { width: `${uploadProgress}%`, transition: 'width 0.2s' } }) })] })), pdfExporting && (_jsxs("div", { className: "px-3 py-2 border-top bg-white flex-shrink-0 text-center", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-success me-2", role: "status" }), _jsx("span", { className: "small text-muted", children: "Gerando PDF\u2026" })] })), uploadProgress === null && (_jsxs("div", { className: "d-flex align-items-end gap-2 px-3 py-2 border-top bg-white flex-shrink-0", children: [_jsx("button", { className: "btn btn-outline-secondary btn-sm flex-shrink-0", onClick: openFilePicker, title: "Anexar arquivo", style: { padding: '0.3rem 0.5rem', marginBottom: 1 }, children: _jsx("i", { className: "bi bi-paperclip" }) }), _jsx("textarea", { ref: textareaRef, className: "form-control form-control-sm chat-textarea", placeholder: isChatConnected ? 'Mensagem para Isidoro… (Alt+Enter: nova linha)' : 'Aguardando conexão…', value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: handleKeyDown, disabled: !isChatConnected, maxLength: 4000, rows: 1 }), _jsx("button", { className: "btn btn-success btn-sm flex-shrink-0", onClick: handleSend, disabled: !isChatConnected || !inputValue.trim(), title: "Enviar (Enter)", style: { marginBottom: 1 }, children: _jsx("i", { className: "bi bi-send-fill" }) })] }))] }));
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: CHAT_STYLES }), _jsx("input", { ref: fileInputRef, type: "file", accept: ACCEPT, style: { display: 'none' }, onChange: handleFileInputChange }), mode === 'closed' && (_jsxs("button", { className: "btn btn-success rounded-circle shadow-lg d-flex align-items-center justify-content-center", style: {
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    width: 56,
                    height: 56,
                    zIndex: 1050,
                    fontSize: '1.3rem',
                }, onClick: () => setMode('widget'), title: "Abrir Isidoro \u2013 Assistente IA", children: [_jsx("i", { className: "bi bi-robot" }), pendingCount > 0 && (_jsx("span", { className: "badge bg-danger rounded-pill", style: {
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            fontSize: '0.65rem',
                            minWidth: 18,
                            height: 18,
                            lineHeight: '18px',
                            padding: '0 4px',
                        }, children: pendingCount > 99 ? '99+' : pendingCount }))] })), mode === 'widget' && (_jsx("div", { className: "card shadow-lg border-0", style: {
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    width: 400,
                    maxWidth: 'calc(100vw - 32px)',
                    height: 580,
                    maxHeight: 'calc(100vh - 48px)',
                    zIndex: 1050,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 16,
                    overflow: 'hidden',
                }, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, children: chatBody })), mode === 'modal' && (_jsx("div", { className: "chat-modal-backdrop", onClick: (e) => { if (e.target === e.currentTarget)
                    setMode('widget'); }, children: _jsx("div", { className: "card border-0 shadow-lg", style: {
                        width: '90vw',
                        maxWidth: 860,
                        height: '88vh',
                        maxHeight: 900,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 12,
                        overflow: 'hidden',
                        animation: 'chatModalIn 0.22s ease-out',
                    }, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, children: chatBody }) }))] }));
};
export default ChatWidget;
