import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo, useState } from 'react';
// Basic date helpers to avoid additional dependencies
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d) => { const copy = new Date(d); const day = copy.getDay(); copy.setDate(copy.getDate() - day); copy.setHours(0, 0, 0, 0); return copy; };
const endOfWeek = (d) => { const copy = new Date(d); const day = copy.getDay(); copy.setDate(copy.getDate() + (6 - day)); copy.setHours(23, 59, 59, 999); return copy; };
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const pad2 = (n) => n < 10 ? '0' + n : '' + n;
const format = (d, fmt = 'yyyy-MM-dd') => {
    if (fmt === 'yyyy-MM-dd')
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (fmt === 'd')
        return '' + d.getDate();
    return d.toISOString();
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { toCSV, downloadCSV } from '@/utils/csv';
import QuitarModal from '@/components/financeiro/QuitarModal';
const VencimentosCalendar = () => {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(today);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedVencimentos, setSelectedVencimentos] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    // Fetch vencimentos for the month
    const { data, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'vencimentos', 'calendar', format(monthStart, 'yyyy-MM-dd')],
        queryFn: () => financeiroService.getVencimentos({ data_inicio: format(monthStart, 'yyyy-MM-dd'), data_fim: format(monthEnd, 'yyyy-MM-dd') }),
    });
    // Debug: log calendar query and returned data for current month (must be unconditionally declared before any returns)
    React.useEffect(() => {
        try {
            const key = ['financeiro', 'vencimentos', 'calendar', format(monthStart, 'yyyy-MM-dd')];
            console.log('📅 VencimentosCalendar (early) queryKey:', key);
            console.log('📦 Calendar data length (early):', (data || []).length);
            console.log('🆔 Calendar vencimentos ids (early):', (data || []).map(v => v.id));
        }
        catch (e) {
            console.warn('⚠️ Erro debug calendar logs (early):', e);
        }
    }, [data, monthStart]);
    // Compute month totals and counts
    const monthStats = React.useMemo(() => {
        const stats = { total_value: 0, pendente: 0, pago: 0, atrasado: 0 };
        (data || []).forEach((v) => {
            const val = parseFloat(String(v.valor || 0)) || 0;
            stats.total_value += val;
            if (v.status === 'pago')
                stats.pago += 1;
            else if (v.status === 'atrasado')
                stats.atrasado += 1;
            else
                stats.pendente += 1;
        });
        return stats;
    }, [data]);
    // Important: declare query client, mutations and confirmation state BEFORE any early returns to keep hook order stable
    const queryClient = useQueryClient();
    const markMutation = useMutation({
        mutationFn: (id) => financeiroService.marcarVencimentoPago(id),
        onMutate: async (id) => {
            // Optimistic update: mark selectedVencimentos locally to 'pago'
            setSelectedVencimentos((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'pago' } : v)));
            return { id };
        },
        onError: (err) => {
            console.error('Erro ao marcar vencimento como pago', err);
            toast.error('Erro ao marcar como pago');
            // revert optimistic update by refetching
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
        },
        onSuccess: (data, id) => {
            toast.success('Vencimento marcado como pago');
            // refetch calendar and lists
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos', 'calendar'] });
            // update local selectedVencimentos fully to include server response if provided
            setSelectedVencimentos((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'pago', data_pagamento: data.data_pagamento || v.data_pagamento } : v)));
        }
    });
    // confirmation modal state
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmId, setConfirmId] = React.useState(null);
    const [confirmDate, setConfirmDate] = React.useState(null);
    // quick quit modal
    const [quitarOpen, setQuitarOpen] = React.useState(false);
    const [quitarId, setQuitarId] = React.useState(null);
    // help modal state
    const [helpOpen, setHelpOpen] = React.useState(false);
    const openConfirm = (id, defaultDate) => {
        setConfirmId(id);
        setConfirmDate(defaultDate || null);
        setConfirmOpen(true);
    };
    const closeConfirm = () => {
        setConfirmOpen(false);
        setConfirmId(null);
        setConfirmDate(null);
    };
    const confirmMark = async () => {
        if (!confirmId)
            return;
        try {
            await markMutation.mutateAsync(confirmId);
            closeConfirm();
        }
        catch (e) {
            // error handled by mutation onError
        }
    };
    const mapByDate = useMemo(() => {
        const map = new Map();
        (data || []).forEach((v) => {
            const k = v.data_vencimento;
            const arr = map.get(k) || [];
            arr.push(v);
            map.set(k, arr);
        });
        return map;
    }, [data]);
    // Filtered view depending on statusFilter
    const filteredMapByDate = useMemo(() => {
        if (statusFilter === 'all')
            return mapByDate;
        const fm = new Map();
        Array.from(mapByDate.entries()).forEach(([k, arr]) => {
            const filtered = arr.filter((v) => v.status === statusFilter);
            if (filtered.length)
                fm.set(k, filtered);
        });
        return fm;
    }, [mapByDate, statusFilter]);
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar vencimentos" });
    const rows = [];
    let day = startDate;
    while (day <= endDate) {
        const week = [];
        for (let i = 0; i < 7; i++) {
            week.push(day);
            day = addDays(day, 1);
        }
        rows.push(week);
    }
    // NOTE: no hooks should be conditionally invoked below this point
    // openDay depends on mapByDate which is defined later; it is safe to reference
    const openDay = (d) => {
        setSelectedDay(d);
        const key = format(d, 'yyyy-MM-dd');
        setSelectedVencimentos(filteredMapByDate.get(key) || []);
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsx("h4", { children: "Calend\u00E1rio de Vencimentos" }), _jsx("p", { className: "text-muted mb-0", children: "Visualize vencimentos por dia e marque como pagos." }), _jsxs("div", { className: "mt-2", children: [_jsx("strong", { children: currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }) }), _jsxs("div", { className: "small text-muted", children: ["Total m\u00EAs: R$ ", monthStats.total_value.toFixed(2), " \u2014 ", _jsxs("span", { className: "text-warning", children: ["Pendente ", monthStats.pendente] }), " \u2022 ", _jsxs("span", { className: "text-success", children: ["Pago ", monthStats.pago] }), " \u2022 ", _jsxs("span", { className: "text-danger", children: ["Atrasado ", monthStats.atrasado] })] }), _jsxs("div", { className: "mt-2 d-flex align-items-center", children: [_jsxs("div", { "aria-label": "Legenda de status", "data-testid": "legend", children: [_jsx("span", { className: "badge bg-warning me-1", title: "Pendente: vencimentos ainda n\u00E3o pagos", children: "Pendente" }), _jsx("span", { className: "badge bg-success me-1", title: "Pago: vencimentos marcados como pagos", children: "Pago" }), _jsx("span", { className: "badge bg-danger me-1", title: "Atrasado: vencimentos em atraso", children: "Atrasado" })] }), _jsx("button", { className: "btn btn-sm btn-outline-secondary ms-3", "aria-label": "Ajuda legenda", title: "Badges mostram os vencimentos do dia; clique no dia para ver detalhes; use o filtro para limitar por status", onClick: () => setHelpOpen(true), children: "?" })] })] })] }), _jsx("div", { children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsxs("div", { className: "me-3", children: [_jsx("label", { htmlFor: "statusFilter", className: "form-label small mb-1", children: "Filtrar status" }), _jsxs("select", { id: "statusFilter", "aria-label": "Filtrar status", className: "form-select form-select-sm", value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), children: [_jsx("option", { value: "all", children: "Todos" }), _jsx("option", { value: "pendente", children: "Pendente" }), _jsx("option", { value: "pago", children: "Pago" }), _jsx("option", { value: "atrasado", children: "Atrasado" })] })] }), _jsx("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)), children: "Anterior" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)), children: "Pr\u00F3ximo" }), _jsx("button", { "data-testid": "export-csv", className: "btn btn-sm btn-outline-secondary me-2", onClick: () => {
                                        const rows = (data || []).map(v => ({ id: v.id, titulo: v.titulo, descricao: v.descricao || '', valor: v.valor, data_vencimento: v.data_vencimento, status: v.status }));
                                        const csv = toCSV(rows, ['id', 'titulo', 'descricao', 'valor', 'data_vencimento', 'status']);
                                        downloadCSV(`vencimentos-${format(monthStart, 'yyyy-MM-dd')}.csv`, csv);
                                    }, children: "Exportar CSV" }), _jsx("button", { "data-testid": "export-pdf", className: "btn btn-sm btn-outline-secondary", onClick: () => {
                                        // export month as PDF (basic HTML print approach)
                                        const rows = (data || []).map(v => ({ id: v.id, titulo: v.titulo, descricao: v.descricao || '', valor: v.valor, data_vencimento: v.data_vencimento, status: v.status }));
                                        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Vencimentos - ${format(monthStart, 'yyyy-MM-dd')}</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px}</style></head><body><h3>Vencimentos - ${currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3><table><thead><tr><th>ID</th><th>Titulo</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.id}</td><td>${r.titulo}</td><td>R$ ${r.valor}</td><td>${r.data_vencimento}</td><td>${r.status}</td></tr>`).join('')}</tbody></table></body></html>`;
                                        const win = window.open('', '_blank');
                                        if (win && win.document) {
                                            win.document.open();
                                            win.document.write(html);
                                            win.document.close();
                                            // try to trigger print (in browser it will open print dialog)
                                            try {
                                                win.focus();
                                                win.print();
                                            }
                                            catch (e) { /* noop in tests */ }
                                        }
                                    }, children: "Exportar PDF" })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-body", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-bordered", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Dom" }), _jsx("th", { children: "Seg" }), _jsx("th", { children: "Ter" }), _jsx("th", { children: "Qua" }), _jsx("th", { children: "Qui" }), _jsx("th", { children: "Sex" }), _jsx("th", { children: "S\u00E1b" })] }) }), _jsx("tbody", { children: rows.map((week, wi) => (_jsx("tr", { children: week.map((d) => {
                                                const key = format(d, 'yyyy-MM-dd');
                                                const dayVenc = filteredMapByDate.get(key) || [];
                                                const isOtherMonth = d.getMonth() !== monthStart.getMonth();
                                                return (_jsx("td", { className: isOtherMonth ? 'text-muted' : '', style: { verticalAlign: 'top', minWidth: 120 }, children: _jsxs("div", { onClick: () => openDay(d), style: { cursor: 'pointer' }, children: [_jsx("strong", { children: format(d, 'd') }), _jsxs("div", { children: [dayVenc.slice(0, 3).map((v) => (_jsxs("div", { className: `badge ${v.status === 'pago' ? 'bg-success' : v.status === 'atrasado' ? 'bg-danger' : 'bg-warning'} me-1`, title: `${v.titulo} — ${v.status}`, children: ["R$ ", v.valor] }, v.id))), dayVenc.length > 0 && (_jsxs("div", { className: "small text-muted mt-1", children: ["Total: R$ ", dayVenc.reduce((s, it) => s + (parseFloat(String(it.valor || 0)) || 0), 0).toFixed(2), " \u2014", _jsxs("span", { className: "ms-1 text-warning", children: ["P ", dayVenc.filter(x => x.status !== 'pago' && x.status !== 'atrasado').length] }), _jsxs("span", { className: "ms-1 text-success", children: ["Pago ", dayVenc.filter(x => x.status === 'pago').length] }), _jsxs("span", { className: "ms-1 text-danger", children: ["Atr ", dayVenc.filter(x => x.status === 'atrasado').length] })] })), dayVenc.length > 3 && _jsxs("div", { className: "text-muted small", children: ["+", dayVenc.length - 3, " mais"] })] })] }) }, key));
                                            }) }, wi))) })] }) }) }), _jsxs("div", { className: "card-footer small text-muted d-flex justify-content-between align-items-center", children: [_jsxs("div", { "data-testid": "footer-legend", children: [_jsx("span", { className: "badge bg-warning me-1", children: "Pendente" }), _jsx("span", { className: "badge bg-success me-1", children: "Pago" }), _jsx("span", { className: "badge bg-danger me-1", children: "Atrasado" })] }), _jsx("div", { className: "text-end", children: _jsx("small", { children: "Dica: clique em um dia para abrir detalhes" }) })] })] }), selectedDay && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", "aria-label": "day-modal", children: _jsx("div", { className: "modal-dialog modal-dialog-centered", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: ["Vencimentos - ", format(selectedDay, 'yyyy-MM-dd')] }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setSelectedDay(null) })] }), _jsxs("div", { className: "modal-body", children: [selectedVencimentos.length === 0 && _jsx("p", { children: "Nenhum vencimento neste dia." }), selectedVencimentos.map((v) => (_jsxs("div", { className: "d-flex justify-content-between align-items-center border-bottom py-2", children: [_jsxs("div", { children: [_jsx("strong", { children: v.titulo }), _jsx("div", { children: _jsx("small", { children: v.descricao }) })] }), _jsxs("div", { className: "text-end", children: [_jsxs("div", { children: ["R$ ", v.valor] }), v.status !== 'pago' && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm btn-outline-primary me-2 mt-2", onClick: () => { setSelectedVencimentos((prev) => prev); setQuitarId(v.id); setQuitarOpen(true); }, children: "Quitar" }), _jsx("button", { "data-testid": `mark-${v.id}`, className: "btn btn-sm btn-success mt-2", onClick: () => openConfirm(v.id, v.data_vencimento), children: "Marcar como pago" })] }))] })] }, v.id)))] })] }) }) })), confirmOpen && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", "aria-label": "confirm-mark-modal", children: _jsx("div", { className: "modal-dialog modal-dialog-centered", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Confirmar pagamento" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: closeConfirm })] }), _jsxs("div", { className: "modal-body", children: [_jsx("p", { children: "Voc\u00EA tem certeza que deseja marcar este vencimento como pago?" }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data de pagamento" }), _jsx("input", { "data-testid": "confirm-date", type: "date", className: "form-control", value: confirmDate || '', onChange: (e) => setConfirmDate(e.target.value) })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: closeConfirm, children: "Cancelar" }), _jsx("button", { "data-testid": "confirm-mark-btn", className: "btn btn-primary", onClick: confirmMark, children: "Confirmar" })] })] }) }) })), quitarOpen && quitarId && (_jsx(QuitarModal, { show: quitarOpen, vencimentoId: quitarId, onClose: () => { setQuitarOpen(false); setQuitarId(null); }, onSuccess: () => { } })), helpOpen && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", "aria-label": "help-modal", children: _jsx("div", { className: "modal-dialog modal-dialog-centered", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Ajuda - Legenda e filtros" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setHelpOpen(false) })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["As badges representam vencimentos no dia. Cores: ", _jsx("strong", { children: "Amarelo" }), " = Pendente, ", _jsx("strong", { children: "Verde" }), " = Pago, ", _jsx("strong", { children: "Vermelho" }), " = Atrasado."] }), _jsxs("p", { children: ["Use o filtro para mostrar apenas um status e clique em um dia para ver ou marcar vencimentos como pagos. Use ", _jsx("strong", { children: "Exportar CSV" }), " e ", _jsx("strong", { children: "Exportar PDF" }), " para salvar o m\u00EAs atual."] })] }), _jsx("div", { className: "modal-footer", children: _jsx("button", { className: "btn btn-secondary", onClick: () => setHelpOpen(false), children: "Fechar" }) })] }) }) }))] }));
};
export default VencimentosCalendar;
