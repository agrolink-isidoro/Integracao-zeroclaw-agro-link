import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ManejoForm } from './ManejoForm';
import { OrdemServicoForm } from './OrdemServicoForm';
export const OperacoesList = () => {
    const qc = useQueryClient();
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [showManejoForm, setShowManejoForm] = useState(false);
    const [showOSForm, setShowOSForm] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    // Buscar manejos
    const { data: manejos = [], isLoading: loadingManejos } = useQuery({
        queryKey: ['manejos'],
        queryFn: async () => {
            const response = await api.get('/agricultura/manejos/');
            return response.data;
        },
    });
    // Buscar ordens de serviço
    const { data: ordensServico = [], isLoading: loadingOrdens } = useQuery({
        queryKey: ['ordens-servico'],
        queryFn: async () => {
            const response = await api.get('/agricultura/ordens-servico/');
            return response.data;
        },
    });
    // Unificar em operações
    const operacoes = [
        ...manejos.map(m => ({
            id: m.id,
            tipo_origem: 'manejo',
            tipo: m.tipo,
            data: m.data_manejo,
            descricao: m.descricao,
            custo: m.custo || 0,
            equipamento: m.equipamento,
            plantio: m.plantio,
            fazenda: m.fazenda,
            talhoes: m.talhoes || [],
            talhoes_info: m.talhoes_info
        })),
        ...ordensServico.map((os) => ({
            id: os.id,
            tipo_origem: 'ordem_servico',
            tipo: os.tarefa,
            data: os.data_inicio,
            descricao: os.tarefa,
            custo: (os.custo_total) || 0,
            maquina: os.maquina,
            status: os.status,
            fazenda: os.fazenda,
            talhoes: os.talhoes || [],
            talhoes_info: os.talhoes_info
        }))
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const isLoading = loadingManejos || loadingOrdens;
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    const handleDelete = async () => {
        if (!deleteConfirm)
            return;
        setDeleteLoading(true);
        try {
            const endpoint = deleteConfirm.tipo_origem === 'manejo'
                ? `/agricultura/manejos/${deleteConfirm.id}/`
                : `/agricultura/ordens-servico/${deleteConfirm.id}/`;
            await api.delete(endpoint);
            qc.invalidateQueries({ queryKey: ['manejos'] });
            qc.invalidateQueries({ queryKey: ['ordens-servico'] });
            setDeleteConfirm(null);
        }
        catch (e) {
            console.error('Erro ao deletar operação:', e);
        }
        finally {
            setDeleteLoading(false);
        }
    };
    // Filtrar operações
    const operacoesFiltradas = operacoes.filter(op => {
        if (filtroTipo !== 'todos' && op.tipo_origem !== filtroTipo)
            return false;
        if (filtroStatus !== 'todos') {
            if (op.tipo_origem === 'ordem_servico' && op.status !== filtroStatus)
                return false;
        }
        return true;
    });
    const getIconeOperacao = (tipo, tipo_origem) => {
        if (tipo_origem === 'ordem_servico')
            return '📋';
        // Ícones por tipo de manejo
        const icones = {
            preparo_solo: '🚜',
            aracao: '🚜',
            gradagem: '🚜',
            plantio_direto: '🌱',
            plantio_convencional: '🌱',
            adubacao_base: '🌿',
            adubacao_cobertura: '🌿',
            pulverizacao: '💧',
            controle_pragas: '🐛',
            irrigacao: '💦',
            poda: '✂️',
            capina: '🔪',
            rocada: '🌾',
            colheita: '🌽'
        };
        return icones[tipo] || '🔧';
    };
    const getCorOperacao = (tipo_origem) => {
        return tipo_origem === 'manejo' ? 'primary' : 'warning';
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-list-check me-2" }), "Opera\u00E7\u00F5es Agr\u00EDcolas"] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-primary", onClick: () => setShowManejoForm(true), children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova Opera\u00E7\u00E3o (Manejo)"] }), _jsxs("button", { className: "btn btn-warning", onClick: () => setShowOSForm(true), children: [_jsx("i", { className: "bi bi-clipboard-plus me-2" }), "Nova OS"] })] })] }), _jsx("div", { className: "card mb-4", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-3", children: [_jsx("label", { className: "form-label", children: "Tipo de Registro" }), _jsxs("select", { className: "form-select", value: filtroTipo, onChange: (e) => setFiltroTipo(e.target.value), children: [_jsx("option", { value: "todos", children: "Todos" }), _jsx("option", { value: "manejo", children: "Manejos" }), _jsx("option", { value: "ordem_servico", children: "Ordens de Servi\u00E7o" })] })] }), _jsxs("div", { className: "col-md-3", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: filtroStatus, onChange: (e) => setFiltroStatus(e.target.value), children: [_jsx("option", { value: "todos", children: "Todos" }), _jsx("option", { value: "pendente", children: "Pendente" }), _jsx("option", { value: "aprovada", children: "Aprovada" }), _jsx("option", { value: "ativa", children: "Ativa" }), _jsx("option", { value: "concluida", children: "Conclu\u00EDda" })] })] })] }) }) }), _jsxs("div", { className: "row mb-4", children: [_jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "text-muted mb-2", children: "Total de Opera\u00E7\u00F5es" }), _jsx("h3", { className: "mb-0", children: operacoes.length })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "text-muted mb-2", children: "Manejos" }), _jsx("h3", { className: "mb-0 text-primary", children: manejos.length })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "text-muted mb-2", children: "Ordens de Servi\u00E7o" }), _jsx("h3", { className: "mb-0 text-warning", children: ordensServico.length })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card", children: _jsxs("div", { className: "card-body", children: [_jsx("h6", { className: "text-muted mb-2", children: "Custo Total" }), _jsxs("h3", { className: "mb-0 text-success", children: ["R$ ", operacoes.reduce((sum, op) => sum + op.custo, 0).toFixed(2)] })] }) }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Hist\u00F3rico de Opera\u00E7\u00F5es" }) }), _jsx("div", { className: "card-body", children: operacoesFiltradas.length === 0 ? (_jsxs("div", { className: "alert alert-info text-center", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma opera\u00E7\u00E3o encontrada"] })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Opera\u00E7\u00E3o" }), _jsx("th", { children: "Fazenda/Safra" }), _jsx("th", { children: "Equipamento" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-end", children: "Custo" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: operacoesFiltradas.map((op) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("small", { className: "text-muted", children: new Date(op.data).toLocaleDateString() }) }), _jsx("td", { children: _jsx("span", { className: `badge bg-${getCorOperacao(op.tipo_origem)}`, children: op.tipo_origem === 'manejo' ? 'Manejo' : 'OS' }) }), _jsx("td", { children: _jsxs("div", { className: "d-flex align-items-center", children: [_jsx("span", { className: "me-2", style: { fontSize: '1.5rem' }, children: getIconeOperacao(op.tipo, op.tipo_origem) }), _jsxs("div", { children: [_jsx("strong", { children: op.tipo }), op.descricao && (_jsx("div", { children: _jsx("small", { className: "text-muted", children: op.descricao }) }))] })] }) }), _jsx("td", { children: _jsxs("small", { className: "text-muted", children: [op.fazenda_nome || '-', _jsx("br", {}), op.plantio_nome && _jsx("span", { className: "badge bg-secondary", children: op.plantio_nome })] }) }), _jsx("td", { children: _jsx("small", { children: op.equipamento || op.maquina || '-' }) }), _jsx("td", { children: op.status && (_jsx("span", { className: `badge bg-${op.status === 'concluida' ? 'success' :
                                                            op.status === 'ativa' ? 'primary' :
                                                                op.status === 'aprovada' ? 'info' : 'secondary'}`, children: op.status })) }), _jsx("td", { className: "text-end", children: _jsxs("strong", { children: ["R$ ", op.custo.toFixed(2)] }) }), _jsx("td", { children: _jsx("button", { className: "btn btn-sm btn-outline-danger", title: "Deletar", onClick: () => setDeleteConfirm({ id: op.id, tipo_origem: op.tipo_origem, nome: op.descricao || op.tipo }), children: _jsx("i", { className: "bi bi-trash" }) }) })] }, `${op.tipo_origem}-${op.id}`))) })] }) })) })] }), showManejoForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(ManejoForm, { onClose: () => setShowManejoForm(false), onSuccess: () => {
                                setShowManejoForm(false);
                            } }) }) }) })), showOSForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(OrdemServicoForm, { onClose: () => setShowOSForm(false), onSuccess: () => {
                                setShowOSForm(false);
                            } }) }) }) })), deleteConfirm && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title text-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Confirmar exclus\u00E3o"] }), _jsx("button", { className: "btn-close", onClick: () => setDeleteConfirm(null), disabled: deleteLoading })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["Excluir opera\u00E7\u00E3o ", _jsx("strong", { children: deleteConfirm.nome }), "?"] }), _jsx("p", { className: "text-muted small mb-0", children: "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita." })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setDeleteConfirm(null), disabled: deleteLoading, children: "Cancelar" }), _jsxs("button", { className: "btn btn-danger", onClick: handleDelete, disabled: deleteLoading, children: [deleteLoading ? _jsx("span", { className: "spinner-border spinner-border-sm me-1" }) : _jsx("i", { className: "bi bi-trash me-1" }), "Deletar"] })] })] }) }) }))] }));
};
export default OperacoesList;
