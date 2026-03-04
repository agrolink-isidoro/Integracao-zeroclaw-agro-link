/**
 * contexts/ActionsContext.tsx
 *
 * Contexto global para o Action Queue:
 *   - Lista de actions pendentes com contagem (badge no nav)
 *   - WebSocket para receber novas actions em tempo real
 *   - Funções de aprovar/rejeitar acessíveis de qualquer componente
 *   - Estado do chat com Isidoro (mensagens, loading)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type Action,
  type ActionModule,
  approveAction,
  rejectAction,
  bulkApproveActions,
  listPendingActions,
  uploadFile,
  type BulkApproveResult,
} from '../services/actions';
import useAuth, { getStoredTokens } from '../hooks/useAuth';

// ─────────────────────────────────────────────────────────────────────────────
// Chat Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: 'user' | 'isidoro';
  text: string;
  timestamp: string;
  isError?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Interface
// ─────────────────────────────────────────────────────────────────────────────

interface ActionsContextValue {
  // Fila de ações
  pendingActions: Action[];
  pendingCount: number;
  isLoadingActions: boolean;
  refreshActions: () => Promise<void>;

  // Transições de estado
  handleApprove: (actionId: string) => Promise<void>;
  handleReject: (actionId: string, motivo?: string) => Promise<void>;
  handleBulkApprove: (ids: string[]) => Promise<BulkApproveResult>;

  // Chat com Isidoro
  chatMessages: ChatMessage[];
  isChatConnected: boolean;
  isChatTyping: boolean;
  sendChatMessage: (text: string) => void;
  clearChat: () => void;
  uploadChatFile: (file: File, module: ActionModule, onProgress?: (pct: number) => void) => Promise<void>;
}

const ActionsContext = createContext<ActionsContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function ActionsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  // ── Carregar actions pendentes ────────────────────────────────────────────

  const refreshActions = useCallback(async () => {
    const accessToken = getStoredTokens()?.access;
    if (!accessToken) return;
    setIsLoadingActions(true);
    try {
      const actions = await listPendingActions();
      setPendingActions(actions);
    } catch (err) {
      console.error('[Actions] Erro ao carregar pendentes:', err);
    } finally {
      setIsLoadingActions(false);
    }
  }, []); // uses getStoredTokens() internally

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshActions();
    const interval = setInterval(refreshActions, 30_000);
    return () => clearInterval(interval);
  }, [refreshActions, isAuthenticated]);

  // ── Transições de estado ───────────────────────────────────────────────────

  const handleApprove = useCallback(async (actionId: string) => {
    await approveAction(actionId);
    await refreshActions();
    queryClient.invalidateQueries({ queryKey: ['actions'] });
  }, [refreshActions, queryClient]);

  const handleReject = useCallback(async (actionId: string, motivo = '') => {
    await rejectAction(actionId, motivo);
    await refreshActions();
    queryClient.invalidateQueries({ queryKey: ['actions'] });
  }, [refreshActions, queryClient]);

  const handleBulkApprove = useCallback(async (ids: string[]): Promise<BulkApproveResult> => {
    const result = await bulkApproveActions(ids);
    await refreshActions();
    queryClient.invalidateQueries({ queryKey: ['actions'] });
    return result;
  }, [refreshActions, queryClient]);

  // ── WebSocket Chat ─────────────────────────────────────────────────────────

  const connectWebSocket = useCallback(() => {
    const accessToken = getStoredTokens()?.access;
    if (!accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;
    destroyedRef.current = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/chat/?token=${accessToken}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsChatConnected(true);
      console.log('[Chat] WebSocket conectado');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handleWsMessage(data);
      } catch {
        console.error('[Chat] Mensagem WebSocket inválida:', event.data);
      }
    };

    ws.onclose = (e) => {
      setIsChatConnected(false);
      setIsChatTyping(false);
      console.warn('[Chat] WebSocket fechado — code:', e.code);
      // Reconectar após 3s (exceto se foi fechado intencionalmente ou componente desmontado)
      if (e.code !== 1000 && !destroyedRef.current && getStoredTokens()?.access) {
        reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('[Chat] WebSocket erro:', err);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleWsMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string;

    if (type === 'message') {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: (data.sender as string) === 'isidoro' ? 'isidoro' : 'user',
        text: data.text as string,
        timestamp: (data.timestamp as string) || new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, msg]);
    } else if (type === 'typing') {
      setIsChatTyping(data.is_typing as boolean);
    } else if (type === 'action_created') {
      // Novas actions criadas → atualiza fila
      refreshActions();
    } else if (type === 'error') {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'isidoro',
        text: `⚠️ ${data.message as string}`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setChatMessages((prev) => [...prev, msg]);
    }
  }, [refreshActions]);

  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    // Adiciona mensagem do usuário localmente (imediato)
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    // Envia pelo WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text }));
    } else {
      console.warn('[Chat] WebSocket não conectado — tentando reconectar');
      connectWebSocket();
    }
  }, [connectWebSocket]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const uploadChatFile = useCallback(async (
    file: File,
    module: ActionModule,
    onProgress?: (pct: number) => void,
  ) => {
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
        wsRef.current.send(
          JSON.stringify({
            type: 'upload_result',
            upload_id: result.id,
            module,
            filename: file.name,
          })
        );
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const detail =
        data?.detail ??
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
    connectWebSocket();
    return () => {
      destroyedRef.current = true;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connectWebSocket, isAuthenticated]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ActionsContext.Provider
      value={{
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
      }}
    >
      {children}
    </ActionsContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useActions(): ActionsContextValue {
  const ctx = useContext(ActionsContext);
  if (!ctx) {
    throw new Error('useActions deve ser usado dentro de <ActionsProvider>');
  }
  return ctx;
}
