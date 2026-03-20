import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import FazendaForm from './FazendaForm';
const FazendasList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingFazenda, setEditingFazenda] = useState(null);
    const [deleteFazenda, setDeleteFazenda] = useState(null);
    // Queries
    const { data: fazendas = [], isLoading, error } = useApiQuery(['fazendas'], '/fazendas/');
    // Mutations
    const deleteMutation = useApiDelete('/fazendas/', [['fazendas']]);
    const handleEdit = (fazenda) => {
        setEditingFazenda(fazenda);
    };
    const handleDelete = (fazenda) => {
        setDeleteFazenda(fazenda);
    };
    const confirmDelete = async () => {
        if (deleteFazenda) {
            try {
                await deleteMutation.mutateAsync(deleteFazenda.id);
                setDeleteFazenda(null);
            }
            catch (error) {
                console.error('Erro ao excluir fazenda:', error);
            }
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingFazenda(null);
    };
    const columns = [
        {
            key: 'name',
            header: 'Nome',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "fw-semibold text-dark", children: [_jsx("i", { className: "bi bi-building-fill me-2 text-primary" }), value] }))
        },
        {
            key: 'matricula',
            header: 'Matrícula',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "badge bg-info-subtle text-info", children: [_jsx("i", { className: "bi bi-file-earmark-text me-1" }), value] }))
        },
        {
            key: 'proprietario_nome',
            header: 'Proprietário',
            render: (value, item) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-person-fill me-1" }), item.proprietario_detail?.nome || value || '-'] })),
            sortable: true
        },
        {
            key: 'areas_count',
            header: 'Áreas',
            render: (_value, item) => (_jsxs("span", { className: "badge bg-success-subtle text-success fs-6", children: [_jsx("i", { className: "bi bi-geo-alt-fill me-1" }), item.areas_count || 0, " \u00E1rea", (item.areas_count || 0) !== 1 ? 's' : ''] }))
        },
        {
            key: 'total_hectares',
            header: 'Total (ha)',
            render: (_value, item) => (_jsxs("span", { className: "text-dark fw-semibold", children: [_jsx("i", { className: "bi bi-arrows-angle-expand me-1 text-info" }), item.total_hectares?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00', " ha"] })),
            sortable: true
        }
    ];
    if (error) {
        return (_jsx("div", { className: "p-4", children: _jsx(ErrorMessage, { message: "Erro ao carregar fazendas" }) }));
    }
    const totalAreas = fazendas.reduce((sum, f) => sum + (f.areas_count || 0), 0);
    const totalHectares = fazendas.reduce((sum, f) => sum + (f.total_hectares || 0), 0);
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-building text-primary me-2" }), "Fazendas"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie suas propriedades rurais" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova Fazenda"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: fazendas.length }), _jsxs("small", { className: "text-white-50", children: ["fazenda", fazendas.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-building fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "\u00C1REAS" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalAreas }), _jsxs("small", { className: "text-white-50", children: ["cadastrada", totalAreas !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-geo-alt fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-warning bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "HECTARES" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalHectares.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }), _jsx("small", { className: "text-white-50", children: "total de \u00E1rea" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-arrows-angle-expand fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-info bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "M\u00C9DIA" }), _jsx("h3", { className: "mb-0 fw-bold", children: fazendas.length > 0 ? (totalAreas / fazendas.length).toFixed(1) : 0 }), _jsx("small", { className: "text-white-50", children: "\u00E1reas/fazenda" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-bar-chart fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-primary text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Fazendas", _jsx("span", { className: "badge bg-white text-primary ms-2", children: fazendas.length })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: fazendas, columns: columns, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhuma fazenda cadastrada" }) })] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingFazenda, title: editingFazenda ? 'Editar Fazenda' : 'Nova Fazenda', onClose: handleCloseModal, children: _jsx(FazendaForm, { fazenda: editingFazenda, onSuccess: handleCloseModal }) }), _jsx(ConfirmDialog, { isOpen: !!deleteFazenda, title: "Excluir Fazenda", message: `Tem certeza que deseja excluir a fazenda "${deleteFazenda?.name}"? Esta ação não pode ser desfeita.`, confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteFazenda(null) })] }));
};
export default FazendasList;
