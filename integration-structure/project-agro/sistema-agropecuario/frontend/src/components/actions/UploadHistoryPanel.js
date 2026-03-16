import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Pause, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
const UploadHistoryPanel = ({ onRetomar }) => {
    const [expanded, setExpanded] = useState(false);
    // Busca histórico de sessões
    const { data: sessions = [], isLoading, refetch } = useQuery({
        queryKey: ['upload-sessions'],
        queryFn: async () => {
            const response = await api.get('/actions/sessions/');
            return response.data;
        },
        refetchInterval: 30000, // Atualiza a cada 30 segundos
    });
    // Agrupa por status
    const emProgresso = sessions.filter(s => s.status === 'em_progresso');
    const pausadas = sessions.filter(s => s.status === 'pausada');
    const concluidas = sessions.filter(s => s.status === 'concluida');
    const handleRetomar = async (session) => {
        try {
            const response = await api.post(`/actions/sessions/${session.id}/retomar/`);
            const data = response.data;
            toast.success(`✅ ${session.upload_nome} retomada!`);
            // Notifica parent component
            if (onRetomar) {
                onRetomar(session.id, data.context_summary);
            }
            // Atualiza lista
            refetch();
        }
        catch (error) {
            const msg = error?.response?.data?.detail || 'Erro ao retomar sessão';
            toast.error(msg);
        }
    };
    const handlePausar = async (sessionId) => {
        try {
            await api.post(`/actions/sessions/${sessionId}/pausar/`);
            toast.success('Sessão pausada');
            refetch();
        }
        catch (error) {
            const msg = error?.response?.data?.detail || 'Erro ao pausar sessão';
            toast.error(msg);
        }
    };
    const getStatusBadge = (status) => {
        switch (status) {
            case 'em_progresso':
                return _jsx("span", { className: "badge bg-primary", children: "Em andamento" });
            case 'pausada':
                return _jsx("span", { className: "badge bg-warning", children: "Pausada" });
            case 'concluida':
                return _jsx("span", { className: "badge bg-success", children: "Conclu\u00EDda" });
            case 'cancelada':
                return _jsx("span", { className: "badge bg-danger", children: "Cancelada" });
            default:
                return _jsx("span", { className: "badge bg-secondary", children: status });
        }
    };
    const SessionCard = ({ session }) => (_jsx("div", { className: "card mb-3 border-1 shadow-sm", children: _jsxs("div", { className: "card-body p-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsxs("div", { className: "flex-grow-1", children: [_jsx("h6", { className: "card-title mb-1 fw-semibold", children: session.upload_nome }), _jsxs("small", { className: "text-muted", children: [new Date(session.criado_em).toLocaleDateString('pt-BR'), ' ', new Date(session.criado_em).toLocaleTimeString('pt-BR', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })] })] }), _jsx("div", { children: getStatusBadge(session.status) })] }), _jsxs("div", { className: "mb-2", children: [_jsx("div", { className: "progress bg-light", style: { height: '6px' }, children: _jsx("div", { className: `progress-bar ${session.status === 'concluida' ? 'bg-success' :
                                    session.status === 'pausada' ? 'bg-warning' :
                                        'bg-primary'}`, style: { width: `${session.progresso_percentage}%` }, role: "progressbar" }) }), _jsxs("small", { className: "d-block mt-1 text-muted", children: [session.registros_processados, " de ", session.total_registros, ' ', "(", session.progresso_percentage.toFixed(1), "%)"] })] }), session.notas.length > 0 && (_jsxs("div", { className: "mb-2", children: [_jsx("small", { className: "d-block text-muted mb-1", children: "\uD83D\uDCDD Notas:" }), _jsxs("div", { className: "d-flex flex-wrap gap-1", children: [session.notas.slice(-3).map((nota, idx) => (_jsx("span", { className: "text-truncate", style: { maxWidth: '100px' }, children: _jsx("small", { className: "badge bg-light text-dark", children: nota }) }, idx))), session.notas.length > 3 && (_jsxs("small", { className: "badge bg-light text-dark", children: ["+", session.notas.length - 3] }))] })] })), _jsxs("div", { className: "d-flex gap-2 mt-3", children: [session.status === 'em_progresso' && (_jsxs(_Fragment, { children: [_jsxs("button", { className: "btn btn-sm btn-primary flex-grow-1", onClick: () => handleRetomar(session), title: "Retomar an\u00E1lise", children: [_jsx(RotateCcw, { className: "me-1", size: 14 }), "Retomar"] }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => handlePausar(session.id), title: "Pausar an\u00E1lise", children: _jsx(Pause, { size: 14 }) })] })), session.status === 'pausada' && (_jsxs("button", { className: "btn btn-sm btn-warning w-100", onClick: () => handleRetomar(session), children: [_jsx(RotateCcw, { className: "me-1", size: 14 }), "Resumir"] })), session.status === 'concluida' && (_jsxs("button", { className: "btn btn-sm btn-secondary w-100", disabled: true, children: [_jsx(CheckCircle, { className: "me-1", size: 14 }), "Conclu\u00EDda"] }))] })] }) }));
    if (!expanded) {
        return (_jsxs("button", { className: "btn btn-outline-secondary btn-sm w-100 mb-3", onClick: () => setExpanded(true), children: [_jsx(Clock, { size: 16, className: "me-2" }), "Hist\u00F3rico de Uploads (", emProgresso.length + pausadas.length, ")"] }));
    }
    return (_jsxs("div", { className: "card mb-3 border-1", children: [_jsxs("div", { className: "card-header bg-white border-bottom d-flex align-items-center justify-content-between", children: [_jsxs("h6", { className: "mb-0 fw-semibold", children: [_jsx(Clock, { size: 18, className: "me-2", style: { display: 'inline' } }), "Hist\u00F3rico de Uploads"] }), _jsx("button", { className: "btn-close", onClick: () => setExpanded(false), "aria-label": "Fechar" })] }), _jsx("div", { className: "card-body p-3", style: { maxHeight: '500px', overflowY: 'auto' }, children: isLoading ? (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border spinner-border-sm text-primary mb-2" }), _jsx("p", { className: "text-muted small", children: "Carregando hist\u00F3rico..." })] })) : sessions.length === 0 ? (_jsx("p", { className: "text-muted text-center py-4 small", children: "Nenhuma sess\u00E3o anterior. Comece pelo upload de um arquivo!" })) : (_jsxs(_Fragment, { children: [emProgresso.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("h6", { className: "small fw-semibold text-muted mb-2", children: ["\uD83D\uDCCA Em Andamento (", emProgresso.length, ")"] }), emProgresso.map(session => (_jsx(SessionCard, { session: session }, session.id)))] })), pausadas.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("h6", { className: "small fw-semibold text-muted mb-2 mt-3", children: ["\u23F8\uFE0F Pausadas (", pausadas.length, ")"] }), pausadas.map(session => (_jsx(SessionCard, { session: session }, session.id)))] })), concluidas.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("h6", { className: "small fw-semibold text-muted mb-2 mt-3", children: ["\u2705 Conclu\u00EDdas (", concluidas.length, ")"] }), concluidas.map(session => (_jsx(SessionCard, { session: session }, session.id)))] }))] })) })] }));
};
export default UploadHistoryPanel;
