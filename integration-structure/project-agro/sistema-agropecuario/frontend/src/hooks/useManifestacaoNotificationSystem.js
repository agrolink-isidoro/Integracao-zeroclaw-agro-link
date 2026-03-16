import { useState, useEffect, useRef } from 'react';
export const useManifestacaoNotificationSystem = ({ enabled = false, intervalMs = 10000, // 10 segundos - menos frequente que o polling individual
maxRetries = 3, onNotification }) => {
    const [isActive, setIsActive] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const intervalRef = useRef(null);
    const enabledRef = useRef(enabled);
    const retriesRef = useRef(0);
    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);
    const checkPendingManifestacoes = async () => {
        try {
            // Esta seria uma chamada para uma nova API endpoint que verifica todas as manifestações pendentes
            // Por enquanto, retornamos um array vazio para não gerar erros
            // TODO: Implementar endpoint no backend:
            // const response = await fetch('/api/fiscal/manifestacoes/pending/');
            // const data = await response.json();
            // return data.map(item => ({
            //   nfeId: item.nfe_id,
            //   status: item.status_envio,
            //   chaveAcesso: item.nfe.chave_acesso,
            //   timestamp: new Date()
            // }));
            retriesRef.current = 0; // Reset retries on success
            return [];
        }
        catch (error) {
            console.warn('Erro ao verificar manifestações pendentes:', error);
            retriesRef.current += 1;
            if (retriesRef.current >= maxRetries) {
                console.warn('Máximo de tentativas atingido, pausando notificações');
                stopNotifications();
            }
            return [];
        }
    };
    const stopNotifications = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsActive(false);
        retriesRef.current = 0;
    };
    const startNotifications = () => {
        if (intervalRef.current) {
            stopNotifications();
        }
        setIsActive(true);
        retriesRef.current = 0;
        intervalRef.current = setInterval(async () => {
            if (!enabledRef.current) {
                stopNotifications();
                return;
            }
            const newNotifications = await checkPendingManifestacoes();
            if (newNotifications.length > 0) {
                setNotifications(prev => [...prev, ...newNotifications]);
                // Notificar cada nova manifestação
                newNotifications.forEach(notification => {
                    if (onNotification) {
                        onNotification(notification);
                    }
                });
            }
        }, intervalMs);
    };
    const clearNotifications = () => {
        setNotifications([]);
    };
    const removeNotification = (nfeId) => {
        setNotifications(prev => prev.filter(n => n.nfeId !== nfeId));
    };
    // Cleanup no unmount
    useEffect(() => {
        return () => {
            stopNotifications();
        };
    }, []);
    return {
        isActive,
        notifications,
        startNotifications,
        stopNotifications,
        clearNotifications,
        removeNotification
    };
};
