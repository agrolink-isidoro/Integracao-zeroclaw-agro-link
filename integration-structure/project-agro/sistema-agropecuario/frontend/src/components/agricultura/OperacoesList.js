import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import operacoesService from '../../services/operacoes';
export const OperacoesList = () => {
    const [operacoes, setOperacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        carregarOperacoes();
    }, []);
    const carregarOperacoes = async () => {
        try {
            setLoading(true);
            const data = await operacoesService.listar();
            setOperacoes(data);
            setError(null);
        }
        catch (err) {
            setError('Erro ao carregar operações: ' + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleConcluir = async (id) => {
        if (!window.confirm('Confirma a conclusão desta operação? Essa ação consumirá reservas e finalizará a operação.'))
            return;
        try {
            await operacoesService.atualizar(id, { status: 'concluida' });
            await carregarOperacoes();
        }
        catch (err) {
            alert('Erro ao concluir operação: ' + err.message);
        }
    };
    const handleCancelar = async (id) => {
        if (!window.confirm('Deseja realmente cancelar esta operação?'))
            return;
        try {
            await operacoesService.atualizar(id, { status: 'cancelada' });
            await carregarOperacoes();
        }
        catch (err) {
            alert('Erro ao cancelar operação: ' + err.message);
        }
    };
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'planejada':
                return 'bg-primary';
            case 'em_andamento':
                return 'bg-warning text-dark';
            case 'concluida':
                return 'bg-success';
            case 'cancelada':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };
    if (loading) {
        return (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '400px' }, children: _jsx("div", { className: "spinner-border text-success", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "alert alert-danger m-3", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), error, _jsx("button", { onClick: carregarOperacoes, className: "btn btn-sm btn-outline-danger ms-3", children: "Tentar novamente" })] }));
    }
    return (_jsx("div", { className: "container-fluid", children: operacoes.length === 0 ? (_jsx("div", { className: "card shadow-sm", children: _jsxs("div", { className: "card-body text-center py-5", children: [_jsx("i", { className: "bi bi-inbox display-1 text-muted" }), _jsx("h5", { className: "mt-3", children: "Nenhuma opera\u00E7\u00E3o cadastrada" }), _jsx("p", { className: "text-muted", children: "Comece criando uma nova opera\u00E7\u00E3o agr\u00EDcola." })] }) })) : (_jsx("div", { className: "card shadow-sm", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover mb-0", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: "ID" }), _jsx("th", { scope: "col", children: "Categoria / Tipo" }), _jsx("th", { scope: "col", children: "Data" }), _jsx("th", { scope: "col", children: "\u00C1rea (ha)" }), _jsx("th", { scope: "col", children: "Status" }), _jsx("th", { scope: "col", children: "Custo Total" }), _jsx("th", { scope: "col", className: "text-end", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: operacoes.map((operacao) => (_jsxs("tr", { children: [_jsxs("td", { className: "fw-semibold", children: ["#", operacao.id] }), _jsxs("td", { children: [_jsx("div", { className: "fw-medium", children: operacao.categoria_display || operacao.categoria || '-' }), _jsx("small", { className: "text-muted", children: operacao.tipo_display || operacao.tipo || '-' })] }), _jsx("td", { children: operacao.data_operacao ? new Date(operacao.data_operacao).toLocaleDateString('pt-BR') : '-' }), _jsxs("td", { children: [operacao.area_total_ha ? operacao.area_total_ha.toFixed(2) : '0.00', " ha"] }), _jsx("td", { children: _jsx("span", { className: `badge ${getStatusBadgeColor(operacao.status)}`, children: operacao.status }) }), _jsxs("td", { className: "fw-semibold", children: ["R$ ", (operacao.custo_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }), _jsxs("td", { className: "text-end", children: [_jsx("button", { onClick: () => window.location.href = `/agricultura/operacoes/${operacao.id}`, className: "btn btn-sm btn-outline-primary me-1", title: "Ver detalhes", children: _jsx("i", { className: "bi bi-eye" }) }), _jsx("button", { onClick: () => {
                                                    // TODO: Implementar modal de edição ou redirecionar
                                                    window.location.href = `/agricultura/operacoes/${operacao.id}/editar`;
                                                }, className: "btn btn-sm btn-outline-secondary me-1", title: "Editar", children: _jsx("i", { className: "bi bi-pencil" }) }), (operacao.status !== 'concluida' && operacao.status !== 'cancelada') && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleConcluir(operacao.id), className: "btn btn-sm btn-success me-1", title: "Concluir", children: _jsx("i", { className: "bi bi-check2-circle" }) }), _jsx("button", { onClick: () => handleCancelar(operacao.id), className: "btn btn-sm btn-outline-danger me-1", title: "Cancelar", children: _jsx("i", { className: "bi bi-x-circle" }) })] })), _jsx("button", { onClick: async () => {
                                                    if (window.confirm('Deseja realmente excluir esta operação?')) {
                                                        try {
                                                            await operacoesService.deletar(operacao.id);
                                                            carregarOperacoes();
                                                        }
                                                        catch (err) {
                                                            alert('Erro ao excluir: ' + err.message);
                                                        }
                                                    }
                                                }, className: "btn btn-sm btn-outline-danger", title: "Excluir", children: _jsx("i", { className: "bi bi-trash" }) })] })] }, operacao.id))) })] }) }) })) }));
};
export default OperacoesList;
