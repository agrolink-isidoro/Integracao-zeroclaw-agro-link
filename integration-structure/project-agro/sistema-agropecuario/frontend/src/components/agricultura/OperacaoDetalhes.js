import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import operacoesService from '../../services/operacoes';
const OperacaoDetalhes = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [operacao, setOperacao] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (id) {
            carregarOperacao();
        }
    }, [id]);
    const carregarOperacao = async () => {
        try {
            setLoading(true);
            const data = await operacoesService.buscar(Number(id));
            setOperacao(data);
            setError(null);
        }
        catch (err) {
            setError('Erro ao carregar operação: ' + err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleConcluir = async () => {
        if (!window.confirm('Confirma a conclusão desta operação? Essa ação consumirá reservas e finalizará a operação.'))
            return;
        try {
            if (!id)
                return;
            await operacoesService.atualizar(Number(id), { status: 'concluida' });
            await carregarOperacao();
        }
        catch (err) {
            alert('Erro ao concluir operação: ' + err.message);
        }
    };
    const handleCancelar = async () => {
        if (!window.confirm('Deseja realmente cancelar esta operação?'))
            return;
        try {
            if (!id)
                return;
            await operacoesService.atualizar(Number(id), { status: 'cancelada' });
            await carregarOperacao();
            navigate('/agricultura/operacoes');
        }
        catch (err) {
            alert('Erro ao cancelar operação: ' + err.message);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "container-fluid py-4", children: _jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: '400px' }, children: _jsx("div", { className: "spinner-border text-success", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }) }) }));
    }
    if (error || !operacao) {
        return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), error || 'Operação não encontrada'] }), _jsxs("button", { onClick: () => navigate('/agricultura/operacoes'), className: "btn btn-secondary", children: [_jsx("i", { className: "bi bi-arrow-left me-2" }), "Voltar"] })] }));
    }
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-file-text me-2" }), "Detalhes da Opera\u00E7\u00E3o #", operacao.id] }), _jsxs("div", { children: [_jsxs("button", { onClick: () => navigate('/agricultura/operacoes'), className: "btn btn-secondary me-2", children: [_jsx("i", { className: "bi bi-arrow-left me-2" }), "Voltar"] }), (operacao.status !== 'concluida' && operacao.status !== 'cancelada') && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: handleConcluir, className: "btn btn-success me-2", title: "Concluir", children: [_jsx("i", { className: "bi bi-check2-circle me-2" }), "Concluir"] }), _jsxs("button", { onClick: handleCancelar, className: "btn btn-outline-danger me-2", title: "Cancelar", children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] })] })), _jsxs("button", { onClick: () => navigate(`/agricultura/operacoes/${id}/editar`), className: "btn btn-primary", children: [_jsx("i", { className: "bi bi-pencil me-2" }), "Editar"] })] })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-8", children: _jsxs("div", { className: "card shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-light", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Informa\u00E7\u00F5es Gerais"] }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-bold", children: "Categoria:" }), _jsx("p", { className: "form-control-plaintext", children: operacao.categoria_display })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-bold", children: "Tipo:" }), _jsx("p", { className: "form-control-plaintext", children: operacao.tipo_display })] })] }), _jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-bold", children: "Data de Opera\u00E7\u00E3o:" }), _jsx("p", { className: "form-control-plaintext", children: operacao.data_operacao ? new Date(operacao.data_operacao).toLocaleDateString('pt-BR') : '-' })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-bold", children: "Status:" }), _jsx("p", { className: "form-control-plaintext", children: _jsx("span", { className: `badge ${operacao.status === 'planejada' ? 'bg-primary' :
                                                                    operacao.status === 'em_andamento' ? 'bg-warning text-dark' :
                                                                        operacao.status === 'concluida' ? 'bg-success' : 'bg-danger'}`, children: operacao.status_display || operacao.status }) })] })] }), _jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-bold", children: "Data In\u00EDcio:" }), _jsx("p", { className: "form-control-plaintext", children: operacao.data_inicio ? new Date(operacao.data_inicio).toLocaleString('pt-BR') : '-' })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-bold", children: "Data T\u00E9rmino:" }), _jsx("p", { className: "form-control-plaintext", children: operacao.data_fim ? new Date(operacao.data_fim).toLocaleString('pt-BR') : '-' })] })] }), operacao.observacoes && (_jsx("div", { className: "row mb-3", children: _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-bold", children: "Observa\u00E7\u00F5es:" }), _jsx("p", { className: "form-control-plaintext", children: operacao.observacoes })] }) }))] })] }) }), _jsxs("div", { className: "col-lg-4", children: [_jsxs("div", { className: "card shadow-sm mb-4", children: [_jsx("div", { className: "card-header bg-light", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-calculator me-2" }), "Resumo"] }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex justify-content-between mb-3", children: [_jsx("span", { className: "text-muted", children: "\u00C1rea Total:" }), _jsxs("span", { className: "fw-bold", children: [operacao.area_total_ha.toFixed(2), " ha"] })] }), _jsxs("div", { className: "d-flex justify-content-between mb-3", children: [_jsx("span", { className: "text-muted", children: "Custo Total:" }), _jsxs("span", { className: "fw-bold text-success", children: ["R$ ", (operacao.custo_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] }), _jsxs("div", { className: "d-flex justify-content-between mb-3", children: [_jsx("span", { className: "text-muted", children: "Custo M\u00E3o de Obra:" }), _jsxs("span", { children: ["R$ ", (operacao.custo_mao_obra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] }), _jsxs("div", { className: "d-flex justify-content-between mb-3", children: [_jsx("span", { className: "text-muted", children: "Custo M\u00E1quina:" }), _jsxs("span", { children: ["R$ ", (operacao.custo_maquina || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] }), _jsxs("div", { className: "d-flex justify-content-between", children: [_jsx("span", { className: "text-muted", children: "Custo Insumos:" }), _jsxs("span", { children: ["R$ ", (operacao.custo_insumos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })] })] })] }), _jsxs("div", { className: "card shadow-sm", children: [_jsx("div", { className: "card-header bg-light", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-clock-history me-2" }), "Hist\u00F3rico"] }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "mb-2", children: [_jsx("small", { className: "text-muted", children: "Criado em:" }), _jsx("p", { className: "mb-0", children: new Date(operacao.criado_em).toLocaleString('pt-BR') })] }), operacao.atualizado_em && (_jsxs("div", { children: [_jsx("small", { className: "text-muted", children: "Atualizado em:" }), _jsx("p", { className: "mb-0", children: new Date(operacao.atualizado_em).toLocaleString('pt-BR') })] }))] })] })] })] })] }));
};
export default OperacaoDetalhes;
