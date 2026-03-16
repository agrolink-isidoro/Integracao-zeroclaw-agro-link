import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatDate, formatCurrency } from '../../utils/formatters';
import ArrendamentoForm from './ArrendamentoForm';
const ArrendamentosList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingArrendamento, setEditingArrendamento] = useState(null);
    // Queries
    const { data: arrendamentos = [], isLoading, error } = useApiQuery(['arrendamentos'], '/arrendamentos/');
    const deleteMutation = useApiDelete('/arrendamentos/', [['arrendamentos']]);
    const handleEdit = (arrendamento) => {
        setEditingArrendamento(arrendamento);
    };
    const handleDelete = async (arrendamento) => {
        if (!window.confirm(`Tem certeza que deseja remover o arrendamento de "${arrendamento.fazenda_detail?.name}"?`)) {
            return;
        }
        try {
            await deleteMutation.mutateAsync(arrendamento.id);
        }
        catch (error) {
            console.error('Error deleting arrendamento:', error);
            alert('Erro ao remover arrendamento. Tente novamente.');
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingArrendamento(null);
    };
    const columns = [
        {
            key: 'arrendador_nome',
            header: 'Arrendador (Dono)',
            render: (_value, item) => (_jsxs("span", { className: "fw-semibold text-dark", children: [_jsx("i", { className: "bi bi-person-badge me-2 text-primary" }), item.arrendador_detail?.nome || '-'] })),
            sortable: true
        },
        {
            key: 'arrendatario_nome',
            header: 'Arrendatário (Usuário)',
            render: (_value, item) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-person me-1" }), item.arrendatario_detail?.nome || '-'] })),
            sortable: true
        },
        {
            key: 'fazenda_name',
            header: 'Fazenda',
            render: (_value, item) => (_jsxs("span", { className: "badge bg-info-subtle text-info", children: [_jsx("i", { className: "bi bi-building me-1" }), item.fazenda_detail?.name || '-'] })),
            sortable: true
        },
        {
            key: 'start_date',
            header: 'Data Início',
            render: (value, _item) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-calendar-check me-1" }), formatDate(value)] })),
            sortable: true
        },
        {
            key: 'end_date',
            header: 'Data Fim',
            render: (value, _item) => value ? (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-calendar-x me-1" }), formatDate(value)] })) : (_jsx("span", { className: "badge bg-success", children: "Ativo" }))
        },
        {
            key: 'custo_sacas_hectare',
            header: 'Custo (sacas/ha)',
            render: (value) => (_jsxs("span", { className: "badge bg-warning-subtle text-warning fs-6", children: [_jsx("i", { className: "bi bi-basket me-1" }), value, " sacas/ha"] }))
        },
        {
            key: 'custo_total_atual',
            header: 'Custo Total',
            render: (value) => value ? (_jsxs("span", { className: "text-success fw-semibold", children: [_jsx("i", { className: "bi bi-cash-coin me-1" }), formatCurrency(value)] })) : '-'
        }
    ];
    if (error) {
        return (_jsx("div", { className: "p-4", children: _jsx(ErrorMessage, { message: "Erro ao carregar arrendamentos" }) }));
    }
    const arrendamentosAtivos = arrendamentos.filter(a => !a.end_date || new Date(a.end_date) >= new Date());
    const custoTotal = arrendamentosAtivos.reduce((sum, a) => sum + (a.custo_total_atual || 0), 0);
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-file-earmark-text text-primary me-2" }), "Arrendamentos"] }), _jsx("p", { className: "text-muted mb-0", children: "Controle de \u00E1reas arrendadas" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Novo Arrendamento"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: arrendamentos.length }), _jsxs("small", { className: "text-white-50", children: ["contrato", arrendamentos.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-file-text fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "ATIVOS" }), _jsx("h3", { className: "mb-0 fw-bold", children: arrendamentosAtivos.length }), _jsx("small", { className: "text-white-50", children: "em vig\u00EAncia" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-check-circle fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-warning bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "CUSTO TOTAL ATIVOS" }), _jsx("h3", { className: "mb-0 fw-bold", children: formatCurrency(custoTotal) }), _jsxs("small", { className: "text-white-50", children: [arrendamentosAtivos.length, " arrendamento", arrendamentosAtivos.length !== 1 ? 's' : '', " ativo", arrendamentosAtivos.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-cash-stack fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-primary text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Arrendamentos", _jsx("span", { className: "badge bg-white text-primary ms-2", children: arrendamentos.length }), _jsxs("span", { className: "badge bg-success ms-2", children: [arrendamentosAtivos.length, " ativo", arrendamentosAtivos.length !== 1 ? 's' : ''] })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { columns: columns, data: arrendamentos, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhum arrendamento cadastrado" }) }), arrendamentosAtivos.length > 0 && (_jsx("div", { className: "card-footer bg-light border-top", children: _jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2", children: [_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Resumo de arrendamentos ativos"] }), _jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("span", { className: "text-muted", children: [arrendamentosAtivos.length, " ativo", arrendamentosAtivos.length !== 1 ? 's' : ''] }), _jsxs("span", { className: "badge bg-warning fs-6 px-3 py-2", children: [_jsx("i", { className: "bi bi-cash-coin me-2" }), formatCurrency(custoTotal)] })] })] }) }))] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingArrendamento, onClose: handleCloseModal, title: editingArrendamento ? 'Editar Arrendamento' : 'Novo Arrendamento', children: _jsx(ArrendamentoForm, { arrendamento: editingArrendamento, onSuccess: handleCloseModal }) })] }));
};
export default ArrendamentosList;
