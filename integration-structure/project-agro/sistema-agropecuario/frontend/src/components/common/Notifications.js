import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthContext } from '@/contexts/AuthContext';
const Notifications = () => {
    const { isAuthenticated, loading: authLoading } = useAuthContext();
    const { data: notifs = [], isLoading, refetch } = useQuery({
        queryKey: ['notificacoes-nao-lidas'],
        queryFn: async () => {
            const response = await api.get('/administrativo/notificacoes/nao_lidas/');
            return response.data;
        },
        enabled: !authLoading && !!isAuthenticated,
        retry: false,
    });
    const [open, setOpen] = useState(false);
    async function markAllRead() {
        try {
            await api.post('/administrativo/notificacoes/marcar_todas_lidas/');
            refetch();
            setOpen(false);
        }
        catch (err) {
            console.error('Erro marcando notificações lidas', err);
        }
    }
    const unread = (notifs || []).length;
    return (_jsxs("div", { className: "position-relative me-3", children: [_jsxs("button", { className: "btn btn-outline-secondary btn-sm position-relative", onClick: () => setOpen(!open), "aria-label": "Notifica\u00E7\u00F5es", children: [_jsx("i", { className: "bi bi-bell" }), unread > 0 && _jsx("span", { className: "position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger", children: unread })] }), open && (_jsxs("div", { className: "card position-absolute", style: { right: 0, width: 320, zIndex: 2000 }, children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", children: [_jsx("strong", { children: "Notifica\u00E7\u00F5es" }), _jsx("button", { className: "btn btn-link btn-sm", onClick: markAllRead, children: "Marcar todas lidas" })] }), _jsxs("div", { className: "card-body", children: [isLoading && _jsx("div", { children: "Carregando..." }), !isLoading && notifs.length === 0 && _jsx("div", { className: "text-muted", children: "Nenhuma notifica\u00E7\u00E3o." }), _jsx("ul", { className: "list-group list-group-flush", children: notifs.map(n => (_jsxs("li", { className: "list-group-item", children: [_jsx("div", { children: _jsx("strong", { children: n.titulo }) }), _jsx("div", { className: "text-muted small", children: n.mensagem })] }, n.id))) })] })] }))] }));
};
export default Notifications;
