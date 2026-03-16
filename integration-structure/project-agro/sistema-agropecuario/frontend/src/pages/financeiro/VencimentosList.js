import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import VencimentoDetailModal from '@/components/financeiro/VencimentoDetailModal';
import { useAuthContext } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import ChangeVencimentoDateModal from '@/components/financeiro/ChangeVencimentoDateModal';
import MarkAsPaidModal from '@/components/financeiro/MarkAsPaidModal';
import QuitarModal from '@/components/financeiro/QuitarModal';
import { toast } from 'react-hot-toast';
const VencimentosList = () => {
    const queryClient = useQueryClient();
    const [pageSize, setPageSize] = React.useState(1000); // Default: fetch all for reliability in tests/UI
    const { data, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'vencimentos', pageSize],
        queryFn: () => financeiroService.getVencimentos({ page_size: pageSize }),
    });
    const [searchTerm, setSearchTerm] = React.useState('');
    // Modal states
    const [detailOpen, setDetailOpen] = React.useState(false);
    const [selectedVencimento, setSelectedVencimento] = React.useState(null);
    const [changeDateOpen, setChangeDateOpen] = React.useState(false);
    const [changeVencimentoId, setChangeVencimentoId] = React.useState(null);
    const [markPaidOpen, setMarkPaidOpen] = React.useState(false);
    const [markPaidVencimentoId, setMarkPaidVencimentoId] = React.useState(null);
    const [markPaidValor, setMarkPaidValor] = React.useState(null);
    const [quitarOpen, setQuitarOpen] = React.useState(false);
    const [quitarVencimentoId, setQuitarVencimentoId] = React.useState(null);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [deleteVencimentoId, setDeleteVencimentoId] = React.useState(null);
    // permissions (fetch core permissions and check if the user can delete in financeiro)
    const { data: permissions } = useApiQuery(['permissions'], '/core/permissions/');
    const { user } = useAuthContext();
    const canDeleteVencimento = React.useMemo(() => {
        // Admin users (is_staff) can always delete
        if (user?.is_staff)
            return true;
        if (!permissions)
            return false;
        return permissions.some((p) => p.module && p.module.includes('financeiro') && Array.isArray(p.permissions) && p.permissions.includes('delete'));
    }, [permissions, user]);
    // compute memoized values *before* any early returns to keep hook order stable
    const sortedVencimentos = React.useMemo(() => {
        if (!data)
            return [];
        const todayLocal = new Date().toISOString().slice(0, 10);
        // Filter by search term
        let filtered = data;
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = data.filter(v => v.titulo.toLowerCase().includes(term) ||
                v.descricao?.toLowerCase().includes(term) ||
                v.valor.toString().includes(term));
        }
        return [...filtered].sort((a, b) => {
            const aAtrasado = a.status !== 'pago' && a.data_vencimento < todayLocal;
            const bAtrasado = b.status !== 'pago' && b.data_vencimento < todayLocal;
            // Atrasados primeiro
            if (aAtrasado && !bAtrasado)
                return -1;
            if (!aAtrasado && bAtrasado)
                return 1;
            // Depois ordena por data crescente
            return a.data_vencimento.localeCompare(b.data_vencimento);
        });
    }, [data, searchTerm]);
    const exportCsv = React.useCallback(() => {
        const rows = (sortedVencimentos || []).map(v => ({ id: v.id, titulo: v.titulo, descricao: v.descricao || '', valor: v.valor, data_vencimento: v.data_vencimento, status: v.status, conta: v.conta_bancaria_nome || '', origem: v.origem_tipo || '' }));
        const csv = toCSV(rows, ['id', 'titulo', 'descricao', 'valor', 'data_vencimento', 'status', 'conta', 'origem']);
        downloadCSV('vencimentos.csv', csv);
    }, [sortedVencimentos]);
    const today = new Date().toISOString().slice(0, 10);
    // Calculate days until/late
    const getDiasAte = (dataVencimento) => {
        const venc = new Date(dataVencimento);
        const agora = new Date();
        const diff = Math.floor((venc.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };
    const openDetail = (vencimento) => {
        setSelectedVencimento(vencimento);
        setDetailOpen(true);
    };
    if (isLoading)
        return (_jsx(LoadingSpinner, {}));
    if (error)
        return (_jsx("div", { className: "alert alert-danger", children: "Erro ao carregar vencimentos" }));
    return (_jsxs("div", { className: "container-fluid py-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Vencimentos", _jsx("span", { className: "badge bg-secondary ms-2", children: sortedVencimentos?.length || 0 })] }), _jsx("small", { className: "text-muted", children: "Gerenciar prazos e confirma\u00E7\u00F5es" })] }), _jsxs("div", { className: "d-flex gap-1 align-items-center", children: [_jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { type: "button", className: `btn btn-sm ${pageSize === 25 ? 'btn-primary' : 'btn-outline-secondary'}`, onClick: () => setPageSize(25), children: "25" }), _jsx("button", { type: "button", className: `btn btn-sm ${pageSize === 50 ? 'btn-primary' : 'btn-outline-secondary'}`, onClick: () => setPageSize(50), children: "50" }), _jsx("button", { type: "button", className: `btn btn-sm ${pageSize === 100 ? 'btn-primary' : 'btn-outline-secondary'}`, onClick: () => setPageSize(100), children: "100" }), _jsx("button", { type: "button", className: `btn btn-sm ${pageSize === 1000 ? 'btn-primary' : 'btn-outline-secondary'}`, onClick: () => setPageSize(1000), children: "\u221E" })] }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: exportCsv, title: "Exportar CSV", children: _jsx("i", { className: "bi bi-download" }) })] })] }), _jsx("div", { className: "mb-3", children: _jsx("input", { type: "text", className: "form-control", placeholder: "\uD83D\uDD0D Buscar por t\u00EDtulo, descri\u00E7\u00E3o ou valor...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) }) }), sortedVencimentos?.length > 0 && (_jsxs("div", { className: "alert alert-light py-2 px-3 mb-3 small border-start border-4 border-info", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), _jsx("strong", { children: "Como usar:" }), " Clique em ", _jsx("strong", { children: "VER" }), " para detalhes completos. Use ", _jsx("strong", { children: "Marcar como pago" }), " para confirma\u00E7\u00E3o r\u00E1pida ou ", _jsx("strong", { children: "Quitar" }), " para fluxo completo com conta banc\u00E1ria."] })), sortedVencimentos?.length === 0 && !searchTerm && (_jsxs("div", { className: "alert alert-info py-3", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhum vencimento cadastrado."] })), sortedVencimentos?.length === 0 && searchTerm && (_jsxs("div", { className: "alert alert-warning py-3", children: [_jsx("i", { className: "bi bi-search me-2" }), "Nenhum resultado para \"", searchTerm, "\"."] })), sortedVencimentos?.length > 0 && (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "T\u00EDtulo" }), _jsx("th", { className: "text-end", children: "Valor" }), _jsx("th", { children: "Vencimento" }), _jsx("th", { children: "Dias at\u00E9/Atraso" }), _jsx("th", { children: "Conta Banc\u00E1ria" }), _jsx("th", { children: "Origem" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-end", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: sortedVencimentos?.map((v) => {
                                const atrasado = v.status !== 'pago' && v.data_vencimento < today;
                                const diasAte = getDiasAte(v.data_vencimento);
                                return (_jsxs("tr", { "data-vencimento-id": v.id, className: atrasado ? 'table-danger' : '', children: [_jsxs("td", { children: [_jsxs("div", { className: "fw-medium text-truncate", style: { maxWidth: '200px' }, title: v.titulo, children: [_jsx("i", { className: "bi bi-receipt me-1" }), v.titulo] }), v.descricao && _jsx("small", { className: "text-muted text-truncate d-block", style: { maxWidth: '200px' }, title: v.descricao, children: v.descricao })] }), _jsxs("td", { className: "text-end fw-bold", children: ["R$ ", Number(v.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }), _jsx("td", { children: _jsx("small", { className: "text-monospace", children: v.data_vencimento }) }), _jsx("td", { children: diasAte < 0 && v.status !== 'pago' ? (_jsxs("span", { className: "badge bg-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), Math.abs(diasAte), " dias"] })) : diasAte <= 7 && diasAte >= 0 && v.status !== 'pago' ? (_jsxs("span", { className: "badge bg-warning text-dark", children: [_jsx("i", { className: "bi bi-clock me-1" }), diasAte, " dias"] })) : (_jsxs("span", { className: "badge bg-info", children: [diasAte, " dias"] })) }), _jsx("td", { className: "small", children: v.conta_bancaria_nome ? (_jsx("span", { children: v.conta_bancaria_nome })) : (_jsx("span", { className: "text-muted", children: "\u2014" })) }), _jsx("td", { className: "small", children: v.origem_tipo ? (_jsx("span", { className: "badge bg-secondary text-capitalize", children: v.origem_tipo })) : (_jsx("span", { className: "text-muted", children: "\u2014" })) }), _jsx("td", { children: v.status === 'pago' ? (_jsxs("span", { className: "badge bg-success", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Pago"] })) : atrasado ? (_jsxs("span", { className: "badge bg-danger", children: [_jsx("i", { className: "bi bi-exclamation-circle me-1" }), "Atrasado"] })) : (_jsxs("span", { className: "badge bg-warning text-dark", children: [_jsx("i", { className: "bi bi-hourglass-split me-1" }), "Pendente"] })) }), _jsx("td", { className: "text-end", children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsxs("button", { className: "btn btn-outline-info", title: "Visualizar detalhes", onClick: () => openDetail(v), children: [_jsx("i", { className: "bi bi-eye" }), " VER"] }), v.status !== 'pago' && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-success", title: "Marcar como pago", onClick: async () => {
                                                                    try {
                                                                        await financeiroService.marcarVencimentoPago(v.id);
                                                                        toast.success('Pago!');
                                                                        await queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
                                                                    }
                                                                    catch (err) {
                                                                        toast.error('Erro ao marcar como pago');
                                                                    }
                                                                }, children: _jsx("i", { className: "bi bi-check-lg" }) }), _jsx("button", { className: "btn btn-outline-primary", title: "Quitar (fluxo completo)", onClick: () => { setQuitarVencimentoId(v.id); setQuitarOpen(true); }, children: _jsx("i", { className: "bi bi-cash-coin" }) })] })), _jsx("button", { className: "btn btn-outline-secondary", title: "Alterar data", onClick: () => { setChangeVencimentoId(v.id); setChangeDateOpen(true); }, children: _jsx("i", { className: "bi bi-calendar-event" }) }), _jsx("button", { className: "btn btn-outline-danger", title: canDeleteVencimento ? "Deletar" : "Sem permissão", disabled: !canDeleteVencimento, onClick: () => { setDeleteVencimentoId(v.id); setDeleteOpen(true); }, children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, v.id));
                            }) })] }) })), _jsx(VencimentoDetailModal, { data: selectedVencimento, show: detailOpen, onClose: () => setDetailOpen(false) }), changeDateOpen && changeVencimentoId && (_jsx(ChangeVencimentoDateModal, { show: changeDateOpen, id: changeVencimentoId, onClose: () => { setChangeDateOpen(false); setChangeVencimentoId(null); }, onSaved: () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] }) })), markPaidOpen && markPaidVencimentoId && (_jsx(MarkAsPaidModal, { show: markPaidOpen, id: markPaidVencimentoId, valorDefault: markPaidValor || 0, onClose: () => { setMarkPaidOpen(false); setMarkPaidVencimentoId(null); setMarkPaidValor(null); }, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] }) })), quitarOpen && quitarVencimentoId && (_jsx(QuitarModal, { show: quitarOpen, onClose: () => { setQuitarOpen(false); setQuitarVencimentoId(null); }, vencimentoId: quitarVencimentoId, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] }) })), deleteOpen && deleteVencimentoId && (_jsx(ConfirmDialog, { isOpen: deleteOpen, title: "Confirmar exclus\u00E3o", message: "Tem certeza que deseja excluir este vencimento?", confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onCancel: () => { setDeleteOpen(false); setDeleteVencimentoId(null); }, onConfirm: async () => {
                    try {
                        await financeiroService.deleteVencimento(deleteVencimentoId);
                        setDeleteOpen(false);
                        setDeleteVencimentoId(null);
                        await queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
                    }
                    catch (err) {
                        console.error('Erro ao deletar vencimento', err);
                        alert('Falha ao deletar vencimento');
                    }
                } }))] }));
};
export default VencimentosList;
