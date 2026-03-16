import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
const FinanciamentoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const financiamentoId = Number(id || 0);
    const { data: financiamento, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'financiamento', financiamentoId],
        queryFn: () => financeiroService.getFinanciamentoById(financiamentoId),
        enabled: !!financiamentoId,
    });
    const { data: parcelas } = useQuery({
        queryKey: ['financeiro', 'parcelas-financiamento', financiamentoId],
        queryFn: () => financeiroService.getParcelasFinanciamento({}),
        enabled: !!financiamentoId,
    });
    const { showSuccess, showError } = useToast();
    const handleGerarParcelas = async () => {
        if (!financiamento)
            return;
        if (!window.confirm('Confirma gerar parcelas para este financiamento?'))
            return;
        try {
            await financeiroService.gerarParcelasFinanciamento(financiamento.id);
            showSuccess('Parcelas geradas com sucesso');
            qc.invalidateQueries({ queryKey: ['financeiro', 'financiamentos'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento', financiamento?.id ?? 0] });
        }
        catch (err) {
            console.error('Erro ao gerar parcelas', err);
            showError('Erro ao gerar parcelas');
        }
    };
    const handleMarcarPago = async (parcelaId) => {
        try {
            await financeiroService.marcarParcelaFinanciamentoPago(parcelaId);
            showSuccess('Parcela marcada como paga');
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-financiamento', financiamentoId] });
        }
        catch (err) {
            console.error('Erro ao marcar parcela paga', err);
            showError('Erro ao marcar parcela como paga');
        }
    };
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar financiamento" });
    if (!financiamento)
        return _jsx("div", { className: "alert alert-warning", children: "Financiamento n\u00E3o encontrado" });
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsx("h3", { children: financiamento.descricao || `#${financiamento.id}` }), _jsxs("p", { className: "text-muted mb-0", children: ["Valor: R$ ", financiamento.valor_financiado] })] }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-outline-secondary me-2", onClick: () => navigate('/financeiro/financiamentos'), children: "Voltar" }), _jsx("button", { className: "btn btn-outline-primary", onClick: handleGerarParcelas, children: "Gerar Parcelas" })] })] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-8", children: _jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: "Parcelas" }), _jsx("div", { className: "card-body", children: parcelas?.length ? (_jsx("div", { className: "list-group", children: parcelas.map(p => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: p.numero_parcela }), _jsx("div", { children: _jsxs("small", { children: ["Venc: ", p.data_vencimento] }) })] }), _jsxs("div", { children: [_jsxs("div", { children: ["R$ ", p.valor_parcela] }), _jsx("div", { className: "mt-2", children: p.status !== 'pago' && _jsx("button", { className: "btn btn-sm btn-outline-success", onClick: () => handleMarcarPago(p.id), children: "Marcar pago" }) })] })] }, p.id))) })) : (_jsx("p", { children: "Nenhuma parcela encontrada." })) })] }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: "Resumo" }), _jsxs("div", { className: "card-body", children: [_jsxs("p", { children: [_jsx("strong", { children: "Parcelas:" }), " ", financiamento.numero_parcelas] }), _jsxs("p", { children: [_jsx("strong", { children: "Valor financiado:" }), " R$ ", financiamento.valor_financiado] }), _jsxs("p", { children: [_jsx("strong", { children: "Taxa de juros:" }), " ", financiamento.taxa_juros, "% / ", financiamento.frequencia_taxa] }), _jsxs("p", { children: [_jsx("strong", { children: "1\u00BA vencimento:" }), " ", financiamento.data_primeiro_vencimento || '—'] }), _jsxs("p", { children: [_jsx("strong", { children: "Prazo (meses):" }), " ", financiamento.prazo_meses] }), _jsxs("p", { children: [_jsx("strong", { children: "Car\u00EAncia (meses):" }), " ", financiamento.carencia_meses ?? 0, " ", (financiamento.juros_embutidos) ? '• Juros embutidos' : ''] }), _jsxs("p", { children: [_jsx("strong", { children: "Tipo:" }), " ", financiamento.tipo_financiamento] }), _jsxs("p", { children: [_jsx("strong", { children: "N\u00BA contrato:" }), " ", financiamento.numero_contrato || '—'] }), _jsxs("p", { children: [_jsx("strong", { children: "Juros acumulado (parcelas):" }), " ", parcelas && parcelas.length ? parcelas.reduce((s, p) => s + (Number(p.juros) || 0), 0).toFixed(2) : (() => {
                                                    const est = (Number(financiamento.valor_financiado) || 0) * ((Number(financiamento.taxa_juros) || 0) / 100) * ((Number(financiamento.prazo_meses) || 0) / 12);
                                                    return est.toFixed(2);
                                                })()] }), _jsxs("p", { children: [_jsx("strong", { children: "Valor total estimado (principal + juros):" }), " R$ ", ((Number(financiamento.valor_financiado) || 0) + (parcelas && parcelas.length ? parcelas.reduce((s, p) => s + (Number(p.juros) || 0), 0) : ((Number(financiamento.valor_financiado) || 0) * ((Number(financiamento.taxa_juros) || 0) / 100) * ((Number(financiamento.prazo_meses) || 0) / 12)))).toFixed(2)] })] })] }) })] })] }));
};
export default FinanciamentoDetail;
