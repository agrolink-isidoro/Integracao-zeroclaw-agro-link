import { jsx as _jsx } from "react/jsx-runtime";
/**
 * contexts/ActionsContext.tsx
 *
 * Contexto global para o Action Queue:
 *   - Lista de actions pendentes com contagem (badge no nav)
 *   - WebSocket para receber novas actions em tempo real
 *   - Funções de aprovar/rejeitar acessíveis de qualquer componente
 *   - Estado do chat com Isidoro (mensagens, loading)
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState, } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { approveAction, rejectAction, bulkApproveActions, listPendingActions, uploadFile, } from '../services/actions';
import useAuth, { getStoredTokens } from '../hooks/useAuth';
const ActionsContext = createContext(null);
// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function ActionsProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();
    const [pendingActions, setPendingActions] = useState([]);
    const [isLoadingActions, setIsLoadingActions] = useState(false);
    // Chat state — persiste no localStorage para sobreviver ao fechamento da janela
    const CHAT_STORAGE_KEY = `isidoro_chat_${typeof window !== 'undefined' ? (window.location.hostname) : 'local'}`;
    const MAX_STORED_MSGS = 150;
    const [chatMessages, setChatMessages] = useState(() => {
        try {
            const stored = localStorage.getItem(CHAT_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        }
        catch {
            return [];
        }
    });
    const [isChatConnected, setIsChatConnected] = useState(false);
    const [isChatTyping, setIsChatTyping] = useState(false);
    // Persiste mensagens no localStorage sempre que mudam
    useEffect(() => {
        try {
            const toStore = chatMessages.slice(-MAX_STORED_MSGS);
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
        }
        catch {
            // quota excedida ou contexto sem storage — ignora silenciosamente
        }
    }, [chatMessages, CHAT_STORAGE_KEY]);
    const wsRef = useRef(null);
    const reconnectTimeout = useRef(null);
    const destroyedRef = useRef(false);
    const reconnectAttemptRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 10;
    // ── Carregar actions pendentes ────────────────────────────────────────────
    const refreshActions = useCallback(async () => {
        const accessToken = getStoredTokens()?.access;
        if (!accessToken)
            return;
        setIsLoadingActions(true);
        try {
            const actions = await listPendingActions();
            setPendingActions(actions);
        }
        catch (err) {
            console.error('[Actions] Erro ao carregar pendentes:', err);
        }
        finally {
            setIsLoadingActions(false);
        }
    }, []); // uses getStoredTokens() internally
    useEffect(() => {
        if (!isAuthenticated)
            return;
        refreshActions();
        const interval = setInterval(refreshActions, 30_000);
        return () => clearInterval(interval);
    }, [refreshActions, isAuthenticated]);
    // ── Transições de estado ───────────────────────────────────────────────────
    const handleApprove = useCallback(async (actionId) => {
        await approveAction(actionId);
        await refreshActions();
        queryClient.invalidateQueries({ queryKey: ['actions'] });
    }, [refreshActions, queryClient]);
    const handleReject = useCallback(async (actionId, motivo = '') => {
        await rejectAction(actionId, motivo);
        await refreshActions();
        queryClient.invalidateQueries({ queryKey: ['actions'] });
    }, [refreshActions, queryClient]);
    const handleBulkApprove = useCallback(async (ids) => {
        const result = await bulkApproveActions(ids);
        await refreshActions();
        queryClient.invalidateQueries({ queryKey: ['actions'] });
        return result;
    }, [refreshActions, queryClient]);
    // ── WebSocket Chat ─────────────────────────────────────────────────────────
    const connectWebSocket = useCallback(() => {
        const accessToken = getStoredTokens()?.access;
        if (!accessToken)
            return;
        if (wsRef.current?.readyState === WebSocket.OPEN)
            return;
        if (wsRef.current?.readyState === WebSocket.CONNECTING)
            return;
        destroyedRef.current = false;
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Determine backend host:
        // - In Docker: use relative URL (both services on same network)
        // - In dev: detect if frontend is on port 5173 and backend on 8001
        let wsUrl;
        if (window.location.port === '5173') {
            // Development: frontend on 5173, backend on 8001
            wsUrl = `${protocol}//localhost:8001/ws/chat/?token=${accessToken}`;
        }
        else {
            // Production/Docker: use relative URL to same host
            wsUrl = `${protocol}//${window.location.host}/ws/chat/?token=${accessToken}`;
        }
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            setIsChatConnected(true);
            reconnectAttemptRef.current = 0; // reset backoff on success
            console.log('[Chat] WebSocket conectado');
        };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWsMessage(data);
            }
            catch {
                console.error('[Chat] Mensagem WebSocket inválida:', event.data);
            }
        };
        ws.onclose = (e) => {
            setIsChatConnected(false);
            setIsChatTyping(false);
            // Reconectar com backoff exponencial (exceto fechamento intencional ou componente desmontado)
            if (e.code !== 1000 && !destroyedRef.current && getStoredTokens()?.access) {
                if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.warn(`[Chat] WebSocket fechado (code: ${e.code}) — máximo de tentativas atingido`);
                    return;
                }
                const attempt = reconnectAttemptRef.current++;
                // Backoff: 2s, 4s, 8s, 16s, 30s (max), com jitter ±25%
                const baseDelay = Math.min(2000 * Math.pow(2, attempt), 30000);
                const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
                const delay = Math.round(baseDelay + jitter);
                console.warn(`[Chat] WebSocket fechado (code: ${e.code}) — reconectando em ${(delay / 1000).toFixed(1)}s (tentativa ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
                reconnectTimeout.current = setTimeout(connectWebSocket, delay);
            }
        };
        ws.onerror = (err) => {
            console.error('[Chat] WebSocket erro:', err);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const handleWsMessage = useCallback((data) => {
        const type = data.type;
        if (type === 'message') {
            const msg = {
                id: crypto.randomUUID(),
                sender: data.sender === 'isidoro' ? 'isidoro' : 'user',
                text: data.text,
                timestamp: data.timestamp || new Date().toISOString(),
            };
            setChatMessages((prev) => [...prev, msg]);
        }
        else if (type === 'typing') {
            setIsChatTyping(data.is_typing);
        }
        else if (type === 'action_created') {
            // Novas actions criadas → atualiza fila
            refreshActions();
        }
        else if (type === 'error') {
            const msg = {
                id: crypto.randomUUID(),
                sender: 'isidoro',
                text: `⚠️ ${data.message}`,
                timestamp: new Date().toISOString(),
                isError: true,
            };
            setChatMessages((prev) => [...prev, msg]);
        }
    }, [refreshActions]);
    const sendChatMessage = useCallback((text) => {
        if (!text.trim())
            return;
        // Adiciona mensagem do usuário localmente (imediato)
        const userMsg = {
            id: crypto.randomUUID(),
            sender: 'user',
            text,
            timestamp: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, userMsg]);
        // Envia pelo WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'message', text }));
        }
        else {
            console.warn('[Chat] WebSocket não conectado — tentando reconectar');
            connectWebSocket();
        }
    }, [connectWebSocket]);
    const clearChat = useCallback(() => {
        setChatMessages([]);
        try {
            localStorage.removeItem(CHAT_STORAGE_KEY);
        }
        catch { /* noop */ }
    }, [CHAT_STORAGE_KEY]);
    const uploadChatFile = useCallback(async (file, module, onProgress) => {
        // Add user message showing the file being sent
        const uploadMsgId = `upload-${Date.now()}`;
        setChatMessages((prev) => [
            ...prev,
            {
                id: uploadMsgId,
                sender: 'user',
                text: `📎 Enviando: ${file.name}`,
                timestamp: new Date().toISOString(),
            },
        ]);
        try {
            const result = await uploadFile(file, module, onProgress);
            // Notify Isidoro via WebSocket so it can process the file
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'upload_result',
                    upload_id: result.id,
                    module,
                    filename: file.name,
                }));
            }
        }
        catch (err) {
            const data = err?.response?.data;
            const detail = data?.detail ??
                (typeof data === 'object' && data !== null
                    ? Object.entries(data)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join('; ')
                    : null) ??
                'Tente novamente.';
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `upload-err-${Date.now()}`,
                    sender: 'isidoro',
                    text: `Não consegui receber o arquivo "${file.name}". ${detail}`,
                    timestamp: new Date().toISOString(),
                    isError: true,
                },
            ]);
        }
    }, []);
    // Conecta WebSocket quando o usuário estiver autenticado
    useEffect(() => {
        if (!isAuthenticated) {
            wsRef.current?.close(1000, 'User logged out');
            return;
        }
        // Small delay prevents React StrictMode's double-invoke from closing a
        // CONNECTING WebSocket (which would cause an abnormal 1006 close error).
        destroyedRef.current = false;
        reconnectAttemptRef.current = 0;
        const timer = setTimeout(() => {
            if (!destroyedRef.current)
                connectWebSocket();
        }, 50);
        return () => {
            clearTimeout(timer);
            destroyedRef.current = true;
            if (reconnectTimeout.current)
                clearTimeout(reconnectTimeout.current);
            wsRef.current?.close(1000, 'Component unmounted');
        };
    }, [connectWebSocket, isAuthenticated]);
    // ─────────────────────────────────────────────────────────────────────────
    return (_jsx(ActionsContext.Provider, { value: {
            pendingActions,
            pendingCount: pendingActions.length,
            isLoadingActions,
            refreshActions,
            handleApprove,
            handleReject,
            handleBulkApprove,
            chatMessages,
            isChatConnected,
            isChatTyping,
            sendChatMessage,
            clearChat,
            uploadChatFile,
        }, children: children }));
}
// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useActions() {
    const ctx = useContext(ActionsContext);
    if (!ctx) {
        throw new Error('useActions deve ser usado dentro de <ActionsProvider>');
    }
    return ctx;
}
