import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
const EmprestimoDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const emprestimoId = Number(id || 0);
    const { data: emprestimo, isLoading, error } = useQuery({
        queryKey: ['financeiro', 'emprestimo', emprestimoId],
        queryFn: () => financeiroService.getEmprestimoById(emprestimoId),
        enabled: !!emprestimoId,
    });
    const { data: parcelas } = useQuery({
        queryKey: ['financeiro', 'parcelas-emprestimo', emprestimoId],
        queryFn: () => financeiroService.getParcelasEmprestimo({}),
        enabled: !!emprestimoId,
    });
    const { showSuccess, showError } = useToast();
    const handleGerarParcelas = async () => {
        if (!emprestimo)
            return;
        if (!window.confirm('Confirma gerar parcelas para este empréstimo?'))
            return;
        try {
            await financeiroService.gerarParcelasEmprestimo(emprestimo.id);
            showSuccess('Parcelas geradas com sucesso');
            qc.invalidateQueries({ queryKey: ['financeiro', 'emprestimos'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo', emprestimo?.id ?? 0] });
        }
        catch (err) {
            console.error('Erro ao gerar parcelas', err);
            showError('Erro ao gerar parcelas');
        }
    };
    const handleMarcarPago = async (parcelaId) => {
        try {
            await financeiroService.marcarParcelaEmprestimoPago(parcelaId);
            showSuccess('Parcela marcada como paga');
            qc.invalidateQueries({ queryKey: ['financeiro', 'parcelas-emprestimo', emprestimoId] });
        }
        catch (err) {
            console.error('Erro ao marcar parcela paga', err);
            showError('Erro ao marcar parcela como paga');
        }
    };
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar empr\u00E9stimo" });
    if (!emprestimo)
        return _jsx("div", { className: "alert alert-warning", children: "Empr\u00E9stimo n\u00E3o encontrado" });
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsx("h3", { children: emprestimo.descricao || `#${emprestimo.id}` }), _jsxs("p", { className: "text-muted mb-0", children: ["Valor: R$ ", emprestimo.valor_emprestimo] })] }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-outline-secondary me-2", onClick: () => navigate('/financeiro/emprestimos'), children: "Voltar" }), _jsx("button", { className: "btn btn-outline-primary", onClick: handleGerarParcelas, children: "Gerar Parcelas" })] })] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-8", children: _jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: "Parcelas" }), _jsx("div", { className: "card-body", children: parcelas?.length ? (_jsx("div", { className: "list-group", children: parcelas.map(p => (_jsxs("div", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: p.numero_parcela }), _jsx("div", { children: _jsxs("small", { children: ["Venc: ", p.data_vencimento] }) })] }), _jsxs("div", { children: [_jsxs("div", { children: ["R$ ", p.valor_parcela] }), _jsx("div", { className: "mt-2", children: p.status !== 'pago' && _jsx("button", { className: "btn btn-sm btn-outline-success", onClick: () => handleMarcarPago(p.id), children: "Marcar pago" }) })] })] }, p.id))) })) : (_jsx("p", { children: "Nenhuma parcela encontrada." })) })] }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: "Resumo" }), _jsxs("div", { className: "card-body", children: [_jsxs("p", { children: [_jsx("strong", { children: "Parcelas:" }), " ", emprestimo.numero_parcelas] }), _jsxs("p", { children: [_jsx("strong", { children: "Valor total:" }), " R$ ", emprestimo.valor_emprestimo] })] })] }) })] })] }));
};
export default EmprestimoDetail;
