import { useState, useEffect, useRef } from 'react';
import { listManifestacoesForNfe } from '../services/fiscal';
export const useManifestacaoPolling = ({ nfeId, enabled = false, intervalMs = 3000, // 3 segundos
maxAttempts = 20, // 1 minuto total
onStatusChange }) => {
    const [currentStatus, setCurrentStatus] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const intervalRef = useRef(null);
    const enabledRef = useRef(enabled);
    // Atualizar ref quando enabled muda
    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);
    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsPolling(false);
        setAttempts(0);
    };
    const checkManifestacaoStatus = async () => {
        try {
            const response = await listManifestacoesForNfe(nfeId);
            const manifestacoes = response.data?.results || [];
            if (manifestacoes.length === 0) {
                return null;
            }
            // Pegar a manifestação mais recente
            const latest = manifestacoes.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
            return latest?.status_envio || null;
        }
        catch (error) {
            console.warn('Erro ao verificar status da manifestação:', error);
            return null;
        }
    };
    const startPolling = (initialStatus = 'pending') => {
        if (intervalRef.current) {
            stopPolling();
        }
        setCurrentStatus(initialStatus);
        setIsPolling(true);
        setAttempts(0);
        intervalRef.current = setInterval(async () => {
            if (!enabledRef.current) {
                stopPolling();
                return;
            }
            const newStatus = await checkManifestacaoStatus();
            setAttempts(prev => {
                const nextAttempts = prev + 1;
                // Se status mudou ou chegou no limite
                if (newStatus && newStatus !== 'pending') {
                    setCurrentStatus(newStatus);
                    if (onStatusChange) {
                        onStatusChange(newStatus, null); // Pode expandir para retornar manifestação completa
                    }
                    stopPolling();
                }
                else if (nextAttempts >= maxAttempts) {
                    // Timeout - parar polling mas não considerar erro
                    stopPolling();
                }
                return nextAttempts;
            });
        }, intervalMs);
    };
    // Cleanup no unmount
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, []);
    return {
        currentStatus,
        isPolling,
        attempts,
        startPolling,
        stopPolling,
        checkStatus: checkManifestacaoStatus
    };
};
