import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import { TIPO_CULTURA_CHOICES } from '../../types/agricultura';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import CulturaForm from './CulturaForm';
const CulturasList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCultura, setEditingCultura] = useState(null);
    const [deleteCultura, setDeleteCultura] = useState(null);
    // Queries
    const { data: culturas = [], isLoading, error } = useApiQuery(['culturas'], '/agricultura/culturas/');
    // Buscar plantios para contar safras em andamento
    const { data: plantios = [] } = useApiQuery(['plantios'], '/agricultura/plantios/');
    // Mutations
    const deleteMutation = useApiDelete('/agricultura/culturas/', [['culturas']]);
    const handleEdit = (cultura) => {
        setEditingCultura(cultura);
    };
    const handleDelete = (cultura) => {
        setDeleteCultura(cultura);
    };
    const confirmDelete = async () => {
        if (deleteCultura) {
            try {
                console.log('Deletando cultura:', deleteCultura.id);
                await deleteMutation.mutateAsync(deleteCultura.id);
                console.log('Cultura deletada com sucesso');
                setDeleteCultura(null);
            }
            catch (error) {
                console.error('Erro ao excluir cultura:', error);
                alert('Erro ao excluir cultura. Verifique o console para mais detalhes.');
            }
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingCultura(null);
    };
    const getTipoLabel = (tipo) => {
        const choice = TIPO_CULTURA_CHOICES.find(c => c.value === tipo);
        return choice?.label || tipo;
    };
    const getTipoBadgeColor = (tipo) => {
        const colors = {
            graos: 'warning',
            hortalicas: 'success',
            fruticultura: 'danger',
            outros: 'info',
        };
        return colors[tipo] || 'secondary';
    };
    const columns = [
        {
            key: 'nome',
            header: 'Nome',
            sortable: true,
            render: (value, item) => (_jsxs("span", { className: "fw-semibold text-dark", children: [_jsx("i", { className: "bi bi-flower1 me-2 text-success" }), value, !item.ativo && (_jsx("span", { className: "badge bg-secondary ms-2", children: "Inativo" }))] }))
        },
        {
            key: 'tipo',
            header: 'Tipo',
            sortable: true,
            render: (value) => (_jsx("span", { className: `badge bg-${getTipoBadgeColor(value)}-subtle text-${getTipoBadgeColor(value)} fs-6`, children: getTipoLabel(value) }))
        },
        {
            key: 'ciclo_dias',
            header: 'Ciclo',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-calendar-event me-1" }), value ? `${value} dias` : '-'] }))
        },
        {
            key: 'zoneamento_apto',
            header: 'Zoneamento',
            render: (value) => value ? (_jsxs("span", { className: "badge bg-success", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Apto"] })) : (_jsxs("span", { className: "badge bg-warning", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), "N\u00E3o Apto"] }))
        },
    ];
    if (error) {
        return (_jsx("div", { className: "p-4", children: _jsx(ErrorMessage, { message: "Erro ao carregar culturas" }) }));
    }
    // Estatísticas
    const totalAtivas = culturas.filter(c => c.ativo).length;
    const safrasEmAndamento = plantios.filter((p) => p.status === 'em_andamento').length;
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-flower1 text-success me-2" }), "Culturas"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie as culturas dispon\u00EDveis para plantio" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova Cultura"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: culturas.length }), _jsxs("small", { className: "text-white-50", children: ["cultura", culturas.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-flower1 fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "SAFRAS EM ANDAMENTO" }), _jsx("h3", { className: "mb-0 fw-bold", children: safrasEmAndamento }), _jsxs("small", { className: "text-white-50", children: ["safra", safrasEmAndamento !== 1 ? 's' : '', " ativa", safrasEmAndamento !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-arrow-repeat fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-lg-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-info bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "DISPON\u00CDVEIS" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalAtivas }), _jsxs("small", { className: "text-white-50", children: ["habilitada", totalAtivas !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-check-circle fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-success text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Culturas", _jsx("span", { className: "badge bg-white text-success ms-2", children: culturas.length })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: culturas, columns: columns, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhuma cultura cadastrada" }) })] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingCultura, title: editingCultura ? 'Editar Cultura' : 'Nova Cultura', onClose: handleCloseModal, children: _jsx(CulturaForm, { cultura: editingCultura, onSuccess: handleCloseModal }) }), _jsx(ConfirmDialog, { isOpen: !!deleteCultura, title: "Excluir Cultura", message: `Tem certeza que deseja excluir a cultura "${deleteCultura?.nome}"? Esta ação não pode ser desfeita e pode afetar plantios existentes.`, confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteCultura(null) })] }));
};
export default CulturasList;
