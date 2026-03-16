import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../../services/rbac';
import toast from 'react-hot-toast';
const LogAuditoria = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (actionFilter)
                params.action = actionFilter;
            const data = await rbacService.getAuditLog(params);
            setLogs(data);
        }
        catch {
            toast.error('Erro ao carregar logs de auditoria');
        }
        finally {
            setLoading(false);
        }
    }, [actionFilter]);
    useEffect(() => {
        loadLogs();
    }, [loadLogs]);
    const actionBadge = (action) => {
        const colors = {
            create_user: 'bg-success',
            update_user: 'bg-info',
            delete_user: 'bg-danger',
            assign_group: 'bg-primary',
            remove_group: 'bg-warning',
            create_group: 'bg-success',
            update_group: 'bg-info',
            delete_group: 'bg-danger',
            grant_permission: 'bg-success',
            revoke_permission: 'bg-danger',
            update_permission: 'bg-info',
            delegate_permission: 'bg-primary',
            revoke_delegation: 'bg-warning',
            access_denied: 'bg-danger',
        };
        return colors[action] || 'bg-secondary';
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-journal-text me-2" }), "Log de Auditoria"] }), _jsxs("div", { className: "d-flex gap-2 align-items-center", children: [_jsxs("select", { className: "form-select form-select-sm", style: { width: 'auto' }, value: actionFilter, onChange: (e) => setActionFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todas as a\u00E7\u00F5es" }), _jsx("option", { value: "create_user", children: "Usu\u00E1rio criado" }), _jsx("option", { value: "update_user", children: "Usu\u00E1rio atualizado" }), _jsx("option", { value: "delete_user", children: "Usu\u00E1rio removido" }), _jsx("option", { value: "assign_group", children: "Atribu\u00EDdo a grupo" }), _jsx("option", { value: "remove_group", children: "Removido de grupo" }), _jsx("option", { value: "grant_permission", children: "Permiss\u00E3o concedida" }), _jsx("option", { value: "revoke_permission", children: "Permiss\u00E3o revogada" }), _jsx("option", { value: "access_denied", children: "Acesso negado" })] }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: loadLogs, title: "Atualizar", children: _jsx("i", { className: "bi bi-arrow-clockwise" }) })] })] }), loading ? (_jsx("div", { className: "text-center py-4", children: _jsx("div", { className: "spinner-border spinner-border-sm text-primary", role: "status" }) })) : logs.length === 0 ? (_jsxs("div", { className: "text-center text-muted py-4", children: [_jsx("i", { className: "bi bi-journal", style: { fontSize: '2rem' } }), _jsx("p", { className: "mt-2", children: "Nenhum registro de auditoria encontrado." })] })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover align-middle", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Data/Hora" }), _jsx("th", { children: "A\u00E7\u00E3o" }), _jsx("th", { children: "Executado por" }), _jsx("th", { children: "Usu\u00E1rio alvo" }), _jsx("th", { children: "M\u00F3dulo" }), _jsx("th", { children: "Detalhes" })] }) }), _jsx("tbody", { children: logs.map((log) => (_jsxs("tr", { children: [_jsx("td", { className: "small text-nowrap", children: new Date(log.timestamp).toLocaleString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        }) }), _jsx("td", { children: _jsx("span", { className: `badge ${actionBadge(log.action)}`, style: { fontSize: '0.7rem' }, children: log.action_display }) }), _jsx("td", { className: "small", children: log.user_username || 'sistema' }), _jsx("td", { className: "small", children: log.target_user_username || '—' }), _jsx("td", { className: "small", children: log.module || '—' }), _jsx("td", { className: "small", children: Object.keys(log.changes).length > 0 && (_jsxs("code", { className: "small", style: { fontSize: '0.7rem' }, children: [JSON.stringify(log.changes).substring(0, 80), JSON.stringify(log.changes).length > 80 ? '...' : ''] })) })] }, log.id))) })] }) }))] }));
};
export default LogAuditoria;
