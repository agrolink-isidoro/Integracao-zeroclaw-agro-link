import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import OrdemServicoForm from '../components/maquinas/OrdemServicoFormMaquinas';
const Manutencao = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(undefined);
    const { data: ordens = [], isLoading } = useQuery({
        queryKey: ['maquinas', 'ordens-servico'],
        queryFn: async () => {
            const resp = await api.get('/maquinas/ordens-servico/');
            return resp.data.results || resp.data;
        }
    });
    const concluirMutation = useMutation({
        mutationFn: async (id) => {
            const resp = await api.post(`/maquinas/ordens-servico/${id}/concluir/`);
            return resp.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maquinas', 'ordens-servico'] })
    });
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-tools me-2" }), "Manuten\u00E7\u00E3o - Ordens de Servi\u00E7o"] }), _jsx("p", { className: "text-muted mb-0", children: "Listagem e gerenciamento de Ordens de Servi\u00E7o" })] }), _jsx("div", { children: _jsxs("button", { className: "btn btn-success", onClick: () => { setEditing(undefined); setShowModal(true); }, children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Nova OS"] }) })] }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: isLoading ? (_jsx("p", { children: "Carregando..." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "N\u00BA OS" }), _jsx("th", { children: "Equipamento" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Prioridade" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Data Abertura" }), _jsx("th", { children: "Data Prevista" }), _jsx("th", { children: "Custo Total" }), _jsx("th", {})] }) }), _jsx("tbody", { children: ordens.map((o) => (_jsxs("tr", { children: [_jsx("td", { children: o.numero_os }), _jsx("td", { children: o.equipamento_detail?.nome || o.equipamento }), _jsx("td", { children: o.tipo }), _jsx("td", { children: o.prioridade }), _jsx("td", { children: o.status }), _jsx("td", { children: o.data_abertura ? new Date(o.data_abertura).toLocaleString() : '-' }), _jsx("td", { children: o.data_previsao || '-' }), _jsx("td", { children: o.custo_total ? `R$ ${Number(o.custo_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-' }), _jsxs("td", { className: "text-end", children: [o.status !== 'concluida' && (_jsx("button", { className: "btn btn-sm btn-primary me-2", onClick: () => concluirMutation.mutate(o.id), children: "Concluir" })), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => { setEditing(o); setShowModal(true); }, children: "Editar" })] })] }, o.id))) })] }) })) }) }), showModal && (_jsx(OrdemServicoForm, { ordemServico: editing, onClose: () => { setShowModal(false); setEditing(undefined); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['maquinas', 'ordens-servico'] }); setShowModal(false); } }))] }));
};
export default Manutencao;
