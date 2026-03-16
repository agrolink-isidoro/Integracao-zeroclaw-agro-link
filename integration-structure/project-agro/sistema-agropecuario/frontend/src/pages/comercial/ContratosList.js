import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import contratosService from '../../services/contratos';
import ComercialService from '../../services/comercial';
import ContratoFormModal from '../../components/comercial/ContratoFormModal';
const ContratosList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [contratos, setContratos] = useState([]);
    const [error, setError] = useState(null);
    const [showContratoModal, setShowContratoModal] = useState(false);
    // Filtros
    const [filtros, setFiltros] = useState({
        status: '',
        tipo: '',
        search: ''
    });
    // Paginação
    const [paginacao, setPaginacao] = useState({
        total: 0,
        paginaAtual: 1,
        totalPaginas: 1
    });
    useEffect(() => {
        carregarContratos();
    }, [filtros, paginacao.paginaAtual]);
    const carregarContratos = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { page: paginacao.paginaAtual };
            if (filtros.status)
                params.status = filtros.status;
            if (filtros.tipo)
                params.tipo = filtros.tipo;
            if (filtros.search)
                params.search = filtros.search;
            const response = await contratosService.listar(params);
            setContratos(response.results);
            setPaginacao(prev => ({
                ...prev,
                total: response.count,
                totalPaginas: Math.ceil(response.count / 10)
            }));
        }
        catch (err) {
            console.error('Erro ao carregar contratos:', err);
            setError('Erro ao carregar contratos');
        }
        finally {
            setLoading(false);
        }
    };
    const handleCancelar = async (contrato) => {
        if (!confirm(`Deseja realmente cancelar o contrato ${contrato.numero_contrato}?`)) {
            return;
        }
        try {
            await contratosService.cancelar(contrato.id);
            alert('Contrato cancelado com sucesso!');
            carregarContratos();
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
            CANCELADO: 'bg-danger'
        };
        return `badge ${badges[status] || 'bg-secondary'}`;
    };
    const getTipoLabel = (tipo) => {
        const labels = {
            A_VISTA: 'À Vista',
            PARCELADO: 'Parcelado',
            ANTECIPADO: 'Antecipado',
            FUTURO: 'Futuro'
        };
        return labels[tipo] || tipo;
    };
    return (_jsxs(_Fragment, { children: [_jsx(ContratoFormModal, { isOpen: showContratoModal, onClose: () => setShowContratoModal(false), onSubmit: async (data) => {
                    try {
                        const result = await ComercialService.createContrato(data);
                        setShowContratoModal(false);
                        carregarContratos();
                    }
                    catch (err) {
                        console.error('Erro ao criar contrato:', err);
                    }
                } }), _jsx("div", { className: "container-fluid", children: _jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("h3", { className: "card-title", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Contratos de Venda"] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-primary", onClick: () => navigate('/comercial/contratos/novo'), children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Novo Contrato"] }), _jsxs("button", { className: "btn btn-success", onClick: () => setShowContratoModal(true), children: [_jsx("i", { className: "bi bi-lightning me-2" }), "Novo Contrato (M)"] })] })] }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-md-3", children: _jsx("input", { type: "text", className: "form-control", placeholder: "Buscar...", value: filtros.search, onChange: (e) => setFiltros({ ...filtros, search: e.target.value }) }) }), _jsx("div", { className: "col-md-3", children: _jsxs("select", { className: "form-select", value: filtros.status, onChange: (e) => setFiltros({ ...filtros, status: e.target.value }), children: [_jsx("option", { value: "", children: "Todos os Status" }), _jsx("option", { value: "RASCUNHO", children: "Rascunho" }), _jsx("option", { value: "ATIVO", children: "Ativo" }), _jsx("option", { value: "ENCERRADO", children: "Encerrado" }), _jsx("option", { value: "CANCELADO", children: "Cancelado" })] }) }), _jsx("div", { className: "col-md-3", children: _jsxs("select", { className: "form-select", value: filtros.tipo, onChange: (e) => setFiltros({ ...filtros, tipo: e.target.value }), children: [_jsx("option", { value: "", children: "Todos os Tipos" }), _jsx("option", { value: "A_VISTA", children: "\u00C0 Vista" }), _jsx("option", { value: "PARCELADO", children: "Parcelado" }), _jsx("option", { value: "ANTECIPADO", children: "Antecipado" }), _jsx("option", { value: "FUTURO", children: "Futuro" })] }) }), _jsx("div", { className: "col-md-3", children: _jsxs("button", { className: "btn btn-outline-secondary w-100", onClick: () => setFiltros({ status: '', tipo: '', search: '' }), children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Limpar Filtros"] }) })] }), error && (_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), error] })), loading ? (_jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }), _jsx("p", { className: "mt-3", children: "Carregando contratos..." })] })) : contratos.length === 0 ? (_jsxs("div", { className: "alert alert-info text-center", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhum contrato encontrado"] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "N\u00BA Contrato" }), _jsx("th", { children: "Cliente" }), _jsx("th", { children: "Produto" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-end", children: "Valor Total" }), _jsx("th", { className: "text-center", children: "Parcelas" }), _jsx("th", { children: "Data" }), _jsx("th", { className: "text-center", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: contratos.map(contrato => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: contrato.numero_contrato }) }), _jsx("td", { children: contrato.cliente_nome || `Cliente #${contrato.cliente}` }), _jsx("td", { children: contrato.produto_nome || `Produto #${contrato.produto}` }), _jsx("td", { children: _jsx("span", { className: "badge bg-info", children: getTipoLabel(contrato.tipo) }) }), _jsx("td", { children: _jsx("span", { className: getStatusBadge(contrato.status), children: contrato.status }) }), _jsxs("td", { className: "text-end", children: ["R$ ", contrato.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }), _jsxs("td", { className: "text-center", children: [contrato.numero_parcelas, "x"] }), _jsx("td", { children: new Date(contrato.data_contrato).toLocaleDateString('pt-BR') }), _jsx("td", { className: "text-center", children: _jsxs("div", { className: "btn-group btn-group-sm", role: "group", children: [_jsx("button", { className: "btn btn-outline-primary", onClick: () => navigate(`/comercial/contratos/${contrato.id}`), title: "Visualizar", children: _jsx("i", { className: "bi bi-eye" }) }), contrato.status === 'ATIVO' && (_jsx("button", { className: "btn btn-outline-danger", onClick: () => handleCancelar(contrato), title: "Cancelar", children: _jsx("i", { className: "bi bi-x-circle" }) }))] }) })] }, contrato.id))) })] }) }), paginacao.totalPaginas > 1 && (_jsxs("div", { className: "d-flex justify-content-between align-items-center mt-3", children: [_jsxs("div", { children: ["Mostrando ", contratos.length, " de ", paginacao.total, " contratos"] }), _jsx("nav", { children: _jsxs("ul", { className: "pagination mb-0", children: [_jsx("li", { className: `page-item ${paginacao.paginaAtual === 1 ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPaginacao({ ...paginacao, paginaAtual: paginacao.paginaAtual - 1 }), children: "Anterior" }) }), Array.from({ length: paginacao.totalPaginas }, (_, i) => i + 1).map(page => (_jsx("li", { className: `page-item ${paginacao.paginaAtual === page ? 'active' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPaginacao({ ...paginacao, paginaAtual: page }), children: page }) }, page))), _jsx("li", { className: `page-item ${paginacao.paginaAtual === paginacao.totalPaginas ? 'disabled' : ''}`, children: _jsx("button", { className: "page-link", onClick: () => setPaginacao({ ...paginacao, paginaAtual: paginacao.paginaAtual + 1 }), children: "Pr\u00F3xima" }) })] }) })] }))] }))] })] }) }) }) })] }));
};
export default ContratosList;
