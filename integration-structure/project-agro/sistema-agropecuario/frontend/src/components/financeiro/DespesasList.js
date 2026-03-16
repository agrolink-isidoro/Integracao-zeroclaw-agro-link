import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useApiQuery } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import RateioPreviewModal from './RateioPreviewModal';
const DespesasList = ({ onOpenForm }) => {
    const queryClient = useQueryClient();
    const { data: despesas = [], isLoading, error, refetch } = useApiQuery(['despesas'], '/administrativo/despesas/');
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewData, setPreviewData] = React.useState(null);
    const [currentDespesa, setCurrentDespesa] = React.useState(null);
    async function previewRateio(despesaId) {
        try {
            const res = await api.post(`/administrativo/despesas/${despesaId}/preview_rateio/`);
            const data = res.data;
            const preview = {
                valor_total: data.valor_total || data.valor || null,
                parts: data.parts || data || []
            };
            setPreviewData(preview);
            setCurrentDespesa(despesaId);
            setPreviewOpen(true);
        }
        catch (err) {
            console.error(err);
            alert('Erro ao gerar preview de rateio');
        }
    }
    async function createRateio(despesaId) {
        if (!window.confirm('Criar rateio para esta despesa?'))
            return;
        try {
            const res = await api.post(`/administrativo/despesas/${despesaId}/create_rateio/`);
            alert('Rateio criado com sucesso (id: ' + res.data.id + ')');
            refetch();
            queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateios'] });
            queryClient.invalidateQueries({ queryKey: ['rateios-approvals'] });
        }
        catch (err) {
            console.error(err);
            alert('Erro ao criar rateio: ' + (err.response?.data?.detail || err.message));
        }
    }
    function rateioStatus(d) {
        if (d.rateio)
            return _jsxs("span", { className: "badge bg-success", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Rateado"] });
        if (d.pendente_rateio)
            return _jsxs("span", { className: "badge bg-warning text-dark", children: [_jsx("i", { className: "bi bi-hourglass-split me-1" }), "Pendente"] });
        return _jsx("span", { className: "badge bg-secondary", children: "N/A" });
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-receipt me-2" }), "Despesas Administrativas"] }), _jsxs("div", { children: [_jsxs("button", { className: "btn btn-sm btn-outline-secondary me-2", onClick: () => refetch(), children: [_jsx("i", { className: "bi bi-arrow-clockwise" }), " Atualizar"] }), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => onOpenForm?.(), children: [_jsx("i", { className: "bi bi-plus" }), " Nova Despesa"] })] })] }), isLoading && _jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border spinner-border-sm" }), " Carregando..."] }), error && _jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Erro ao carregar despesas"] }), !isLoading && despesas.length === 0 && (_jsxs("div", { className: "text-muted text-center py-4", children: [_jsx("i", { className: "bi bi-inbox d-block fs-1 mb-2" }), "Nenhuma despesa encontrada."] })), despesas.length > 0 && (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover table-sm align-middle", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "#" }), _jsx("th", { children: "T\u00EDtulo" }), _jsx("th", { children: "Centro" }), _jsx("th", { children: "Fornecedor" }), _jsx("th", { children: "Safra" }), _jsx("th", { children: "Doc. Ref." }), _jsx("th", { className: "text-end", children: "Valor" }), _jsx("th", { children: "Data" }), _jsx("th", { children: "Rateio" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: despesas.map((d) => (_jsxs("tr", { children: [_jsx("td", { className: "text-muted", children: d.id }), _jsx("td", { className: "fw-semibold", children: d.titulo }), _jsx("td", { children: _jsx("small", { children: d.centro_nome || '-' }) }), _jsx("td", { children: _jsx("small", { children: d.fornecedor_nome || '-' }) }), _jsx("td", { children: _jsx("small", { children: d.safra_nome || '-' }) }), _jsx("td", { children: _jsx("small", { className: "text-muted", children: d.documento_referencia || '-' }) }), _jsxs("td", { className: "text-end text-nowrap fw-semibold", children: ["R$ ", Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }), _jsx("td", { className: "text-nowrap", children: d.data }), _jsx("td", { children: rateioStatus(d) }), _jsxs("td", { className: "text-nowrap", children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary me-1", title: "Preview rateio", onClick: () => previewRateio(d.id), disabled: !!d.rateio, children: _jsx("i", { className: "bi bi-eye" }) }), _jsx("button", { className: "btn btn-sm btn-outline-primary", title: "Criar rateio", onClick: () => createRateio(d.id), disabled: !!d.rateio, children: _jsx("i", { className: "bi bi-pie-chart" }) })] })] }, d.id))) })] }) })), previewOpen && (_jsx(RateioPreviewModal, { show: previewOpen, preview: previewData, onClose: () => { setPreviewOpen(false); setPreviewData(null); setCurrentDespesa(null); }, onCreate: async () => {
                    if (currentDespesa) {
                        await createRateio(currentDespesa);
                        setPreviewOpen(false);
                        setPreviewData(null);
                        setCurrentDespesa(null);
                    }
                } }))] }));
};
export default DespesasList;
