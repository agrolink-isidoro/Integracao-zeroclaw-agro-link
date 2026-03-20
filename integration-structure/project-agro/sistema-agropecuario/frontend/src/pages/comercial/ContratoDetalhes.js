import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import contratosService from '../../services/contratos';
const ContratoDetalhes = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [contrato, setContrato] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (id) {
            carregarContrato(parseInt(id));
        }
    }, [id]);
    const carregarContrato = async (contratoId) => {
        setLoading(true);
        setError(null);
        try {
            const data = await contratosService.buscar(contratoId);
            setContrato(data);
        }
        catch (err) {
            console.error('Erro ao carregar contrato:', err);
            setError('Erro ao carregar contrato');
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancelar = async () => {
        if (!contrato || !confirm(`Deseja realmente cancelar o contrato ${contrato.numero_contrato}?`)) {
            return;
        }
        try {
            await contratosService.cancelar(contrato.id);
            alert('Contrato cancelado com sucesso!');
            navigate('/comercial/contratos');
        }
        catch (err) {
            console.error('Erro ao cancelar contrato:', err);
            alert(err.response?.data?.error || 'Erro ao cancelar contrato');
        }
    };
    const getStatusBadge = (status) => {
        const badges = {
            RASCUNHO: 'bg-secondary',
            ATIVO: 'bg-success',
            ENCERRADO: 'bg-primary',
            CANCELADO: 'bg-danger',
            pendente: 'bg-warning',
            pago: 'bg-success',
            atrasado: 'bg-danger',
            cancelado: 'bg-secondary'
        };
        return `badge ${badges[status] || 'bg-secondary'}`;
    };
    if (loading) {
        return (_jsx("div", { className: "container-fluid", children: _jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }), _jsx("p", { className: "mt-3", children: "Carregando contrato..." })] }) }));
    }
    if (error || !contrato) {
        return (_jsx("div", { className: "container-fluid", children: _jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), error || 'Contrato não encontrado'] }) }));
    }
    return (_jsx("div", { className: "container-fluid", children: _jsx("div", { className: "row", children: _jsxs("div", { className: "col-12", children: [_jsx("div", { className: "card mb-3", children: _jsx("div", { className: "card-header", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsxs("h3", { className: "card-title mb-0", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Contrato ", contrato.numero_contrato] }), _jsx("span", { className: `${getStatusBadge(contrato.status)} mt-2`, children: contrato.status })] }), _jsxs("div", { className: "btn-group", children: [_jsxs("button", { className: "btn btn-outline-secondary", onClick: () => navigate('/comercial/contratos'), children: [_jsx("i", { className: "bi bi-arrow-left me-2" }), "Voltar"] }), contrato.status === 'ATIVO' && (_jsxs("button", { className: "btn btn-outline-danger", onClick: handleCancelar, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar Contrato"] }))] })] }) }) }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-md-6 mb-3", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "card-title mb-0", children: "Informa\u00E7\u00F5es Gerais" }) }), _jsx("div", { className: "card-body", children: _jsx("table", { className: "table table-sm", children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { style: { width: '40%' }, children: "Cliente:" }), _jsx("td", { children: contrato.cliente_nome || `#${contrato.cliente}` })] }), _jsxs("tr", { children: [_jsx("th", { children: "Produto:" }), _jsx("td", { children: contrato.produto_nome || `#${contrato.produto}` })] }), _jsxs("tr", { children: [_jsx("th", { children: "Tipo:" }), _jsx("td", { children: _jsx("span", { className: "badge bg-info", children: contrato.tipo }) })] }), _jsxs("tr", { children: [_jsx("th", { children: "Data do Contrato:" }), _jsx("td", { children: new Date(contrato.data_contrato).toLocaleDateString('pt-BR') })] }), contrato.data_entrega_prevista && (_jsxs("tr", { children: [_jsx("th", { children: "Entrega Prevista:" }), _jsx("td", { children: new Date(contrato.data_entrega_prevista).toLocaleDateString('pt-BR') })] }))] }) }) })] }) }), _jsx("div", { className: "col-md-6 mb-3", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "card-title mb-0", children: "Valores e Quantidades" }) }), _jsx("div", { className: "card-body", children: _jsx("table", { className: "table table-sm", children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { style: { width: '40%' }, children: "Quantidade Total:" }), _jsx("td", { children: contrato.quantidade_total.toLocaleString('pt-BR') })] }), _jsxs("tr", { children: [_jsx("th", { children: "Pre\u00E7o Unit\u00E1rio:" }), _jsxs("td", { children: ["R$ ", contrato.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Valor Total:" }), _jsx("td", { children: _jsxs("strong", { className: "text-success", children: ["R$ ", contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }) })] }), _jsxs("tr", { children: [_jsx("th", { children: "Parcelas:" }), _jsxs("td", { children: [contrato.numero_parcelas, "x (", contrato.periodicidade_parcelas, ")"] })] }), _jsxs("tr", { children: [_jsx("th", { children: "Valor da Parcela:" }), _jsxs("td", { children: ["R$ ", (contrato.valor_total / contrato.numero_parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] })] }) }) })] }) })] }), contrato.observacoes && (_jsxs("div", { className: "card mb-3", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "card-title mb-0", children: "Observa\u00E7\u00F5es" }) }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "mb-0", children: contrato.observacoes }) })] })), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsxs("h5", { className: "card-title mb-0", children: [_jsx("i", { className: "bi bi-calendar-check me-2" }), "Parcelas (", contrato.parcelas?.length || 0, ")"] }) }), _jsx("div", { className: "card-body", children: contrato.parcelas && contrato.parcelas.length > 0 ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-center", children: "Parcela" }), _jsx("th", { children: "Data de Vencimento" }), _jsx("th", { className: "text-end", children: "Valor" }), _jsx("th", { children: "Vencimento (Financeiro)" }), _jsx("th", { className: "text-center", children: "Status" })] }) }), _jsx("tbody", { children: contrato.parcelas.map((parcela) => (_jsxs("tr", { children: [_jsx("td", { className: "text-center", children: _jsxs("strong", { children: [parcela.numero_parcela, "/", contrato.numero_parcelas] }) }), _jsx("td", { children: new Date(parcela.data_vencimento).toLocaleDateString('pt-BR') }), _jsxs("td", { className: "text-end", children: ["R$ ", parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }), _jsx("td", { children: parcela.vencimento_titulo || '-' }), _jsx("td", { className: "text-center", children: parcela.vencimento_status ? (_jsx("span", { className: getStatusBadge(parcela.vencimento_status), children: parcela.vencimento_status })) : (_jsx("span", { className: "text-muted", children: "-" })) })] }, parcela.id))) })] }) })) : (_jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma parcela encontrada"] })) })] })] }) }) }));
};
export default ContratoDetalhes;
