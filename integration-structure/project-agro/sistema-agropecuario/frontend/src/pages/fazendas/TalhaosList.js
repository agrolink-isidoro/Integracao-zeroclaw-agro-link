import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import TalhaoForm from './TalhaoForm';
const TalhaosList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTalhao, setEditingTalhao] = useState(null);
    const [deleteTalhao, setDeleteTalhao] = useState(null);
    // Queries
    const { data: talhoes = [], isLoading, error } = useApiQuery(['talhoes'], '/talhoes/');
    // Mutations
    const deleteMutation = useApiDelete('/talhoes/', [['talhoes']]);
    const handleEdit = (talhao) => {
        setEditingTalhao(talhao);
    };
    const handleDelete = (talhao) => {
        setDeleteTalhao(talhao);
    };
    const confirmDelete = async () => {
        if (deleteTalhao) {
            try {
                await deleteMutation.mutateAsync(deleteTalhao.id);
                setDeleteTalhao(null);
            }
            catch (error) {
                console.error('Erro ao excluir talhão:', error);
            }
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingTalhao(null);
    };
    const columns = [
        {
            key: 'name',
            header: 'Nome',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "fw-semibold text-dark", children: [_jsx("i", { className: "bi bi-grid-3x3-gap-fill me-2 text-primary" }), value] }))
        },
        {
            key: 'area_nome',
            header: 'Área',
            render: (_value, item) => (_jsxs("span", { className: "badge bg-success-subtle text-success", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), item.area_nome || `Área ${item.area}`] })),
            sortable: true
        },
        {
            key: 'fazenda_nome',
            header: 'Fazenda',
            render: (_value, item) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-building me-1" }), item.fazenda_nome || '-'] })),
        },
        {
            key: 'area_size',
            header: 'Tamanho',
            render: (value) => {
                const num = Number(value);
                return (!isNaN(num) && num > 0) ? (_jsxs("span", { className: "badge bg-info-subtle text-info fs-6", children: [_jsx("i", { className: "bi bi-rulers me-1" }), num.toFixed(2), " ha"] })) : '-';
            },
            sortable: true
        },
        {
            key: 'area_hectares',
            header: 'Área GIS',
            render: (value) => {
                const num = Number(value);
                return (!isNaN(num) && num > 0) ? (_jsxs("span", { className: "badge bg-warning-subtle text-warning fs-6", children: [_jsx("i", { className: "bi bi-pin-map me-1" }), num.toFixed(2), " ha"] })) : '-';
            },
        }
    ];
    if (error) {
        return (_jsx("div", { className: "p-4", children: _jsx(ErrorMessage, { message: "Erro ao carregar talh\u00F5es" }) }));
    }
    const totalHectares = talhoes.reduce((sum, t) => {
        const areaSize = typeof t.area_size === 'string' ? parseFloat(t.area_size) : t.area_size;
        return sum + (areaSize || 0);
    }, 0);
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-grid-3x3 text-primary me-2" }), "Talh\u00F5es"] }), _jsx("p", { className: "text-muted mb-0", children: "Divis\u00F5es das \u00E1reas para plantio" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Novo Talh\u00E3o"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: talhoes.length }), _jsxs("small", { className: "text-white-50", children: ["talh\u00E3o", talhoes.length !== 1 ? 'ões' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-grid-3x3 fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "\u00C1REA TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalHectares.toFixed(1) }), _jsx("small", { className: "text-white-50", children: "hectares" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-rulers fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-info bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "M\u00C9DIA POR TALH\u00C3O" }), _jsxs("h3", { className: "mb-0 fw-bold", children: [talhoes.length > 0 ? (totalHectares / talhoes.length).toFixed(2) : 0, " ha"] }), _jsx("small", { className: "text-white-50", children: "hectares por talh\u00E3o" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-calculator fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-primary text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Talh\u00F5es", _jsx("span", { className: "badge bg-white text-primary ms-2", children: talhoes.length })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { columns: columns, data: talhoes, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhum talh\u00E3o cadastrado" }) }), talhoes.length > 0 && (_jsx("div", { className: "card-footer bg-light border-top", children: _jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2", children: [_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Total de talh\u00F5es cadastrados"] }), _jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("span", { className: "text-muted", children: [talhoes.length, " talh\u00E3o", talhoes.length !== 1 ? 'ões' : ''] }), _jsxs("span", { className: "badge bg-success fs-6 px-3 py-2", children: [_jsx("i", { className: "bi bi-rulers me-2" }), totalHectares.toFixed(2), " ha"] })] })] }) }))] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingTalhao, onClose: handleCloseModal, title: editingTalhao ? 'Editar Talhão' : 'Novo Talhão', children: _jsx(TalhaoForm, { talhao: editingTalhao, onSuccess: handleCloseModal }) }), _jsx(ConfirmDialog, { isOpen: !!deleteTalhao, onCancel: () => setDeleteTalhao(null), onConfirm: confirmDelete, title: "Confirmar Exclus\u00E3o", message: `Deseja realmente excluir o talhão "${deleteTalhao?.name}"?`, confirmText: "Excluir", cancelText: "Cancelar" })] }));
};
export default TalhaosList;
