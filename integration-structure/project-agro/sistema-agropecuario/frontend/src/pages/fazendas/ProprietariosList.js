import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatCPFCNPJ, formatPhone } from '../../utils/formatters';
import ProprietarioForm from './ProprietarioForm';
const ProprietariosList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingProprietario, setEditingProprietario] = useState(null);
    const [deleteProprietario, setDeleteProprietario] = useState(null);
    // Queries
    const { data: proprietarios = [], isLoading, error } = useApiQuery(['proprietarios'], '/proprietarios/');
    // Mutations
    const deleteMutation = useApiDelete('/proprietarios/', [['proprietarios']]);
    const handleEdit = (proprietario) => {
        setEditingProprietario(proprietario);
    };
    const handleDelete = (proprietario) => {
        setDeleteProprietario(proprietario);
    };
    const confirmDelete = async () => {
        if (deleteProprietario) {
            try {
                await deleteMutation.mutateAsync(deleteProprietario.id);
                setDeleteProprietario(null);
            }
            catch (error) {
                console.error('Erro ao excluir proprietário:', error);
            }
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingProprietario(null);
    };
    const columns = [
        {
            key: 'nome',
            header: 'Nome',
            sortable: true,
            render: (value) => (_jsxs("span", { className: "fw-semibold text-dark", children: [_jsx("i", { className: "bi bi-person-circle me-2 text-primary" }), value] }))
        },
        {
            key: 'cpf_cnpj',
            header: 'CPF/CNPJ',
            render: (value, _item) => (_jsxs("span", { className: "badge bg-info-subtle text-info font-monospace", children: [_jsx("i", { className: "bi bi-card-text me-1" }), formatCPFCNPJ(value)] })),
            sortable: true
        },
        {
            key: 'telefone',
            header: 'Telefone',
            render: (value, _item) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-telephone me-1" }), formatPhone(value) || '-'] }))
        },
        {
            key: 'email',
            header: 'Email',
            render: (value) => (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-envelope me-1" }), value || '-'] }))
        }
    ];
    if (error) {
        return (_jsx("div", { className: "p-4", children: _jsx(ErrorMessage, { message: "Erro ao carregar propriet\u00E1rios" }) }));
    }
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-people text-primary me-2" }), "Propriet\u00E1rios"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie os donos das propriedades" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Novo Propriet\u00E1rio"] })] }), _jsx("div", { className: "row g-3 mb-4", children: _jsx("div", { className: "col-12 col-md-4", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: proprietarios.length }), _jsxs("small", { className: "text-white-50", children: ["propriet\u00E1rio", proprietarios.length !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-people fs-3" }) })] }) }) }) }) }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-primary text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Propriet\u00E1rios", _jsx("span", { className: "badge bg-white text-primary ms-2", children: proprietarios.length })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: proprietarios, columns: columns, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhum propriet\u00E1rio cadastrado" }) })] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingProprietario, title: editingProprietario ? 'Editar Proprietário' : 'Novo Proprietário', onClose: handleCloseModal, children: _jsx(ProprietarioForm, { proprietario: editingProprietario, onSuccess: handleCloseModal }) }), _jsx(ConfirmDialog, { isOpen: !!deleteProprietario, title: "Excluir Propriet\u00E1rio", message: `Tem certeza que deseja excluir o proprietário "${deleteProprietario?.nome}"? Esta ação não pode ser desfeita.`, confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteProprietario(null) })] }));
};
export default ProprietariosList;
