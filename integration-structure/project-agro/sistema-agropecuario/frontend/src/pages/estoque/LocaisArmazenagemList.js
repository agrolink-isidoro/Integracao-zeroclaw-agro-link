import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import { getUnitLabel } from '../../utils/units';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorMessage from '../../components/common/ErrorMessage';
import LocalArmazenagemForm from './LocalArmazenagemForm';
const LocaisArmazenagemList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingLocal, setEditingLocal] = useState(null);
    const [deleteLocal, setDeleteLocal] = useState(null);
    const { data: locais = [], isLoading, error, refetch } = useApiQuery(['locais-armazenamento'], '/estoque/locais-armazenamento/');
    const deleteMutation = useApiDelete('/estoque/locais-armazenamento/', [['locais-armazenamento']]);
    const handleEdit = (local) => setEditingLocal(local);
    const handleDelete = (local) => setDeleteLocal(local);
    const confirmDelete = async () => {
        if (!deleteLocal)
            return;
        try {
            await deleteMutation.mutateAsync(deleteLocal.id);
            setDeleteLocal(null);
        }
        catch (err) {
            console.error('Erro ao excluir local:', err);
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingLocal(null);
    };
    const columns = [
        { key: 'nome', header: 'Nome', sortable: true },
        { key: 'tipo_local', header: 'Int/Ext', render: (v) => v === 'externo'
                ? _jsxs("span", { className: "badge bg-warning text-dark", children: [_jsx("i", { className: "bi bi-truck me-1" }), "Externo"] })
                : _jsxs("span", { className: "badge bg-info text-dark", children: [_jsx("i", { className: "bi bi-house-door me-1" }), "Interno"] })
        },
        { key: 'tipo', header: 'Tipo', render: (v) => _jsx("span", { className: "badge bg-light text-dark", children: String(v) }) },
        { key: 'capacidade_total', header: 'Capacidade Máx', render: (v, item) => {
                const value = v ?? item.capacidade_maxima;
                if (value != null) {
                    return `${Number(value).toLocaleString('pt-BR')} ${getUnitLabel(item.unidade_capacidade)}`;
                }
                return '-';
            } },
        { key: 'fazenda_nome', header: 'Fazenda / Fornecedor', render: (_v, item) => {
                if (item.tipo_local === 'externo') {
                    return item.fornecedor_nome ?? '-';
                }
                return item.fazenda_nome ?? item.fazenda ?? '-';
            } },
        { key: 'ativo', header: 'Ativo', render: (v) => v ? _jsx("span", { className: "badge bg-success", children: "Sim" }) : _jsx("span", { className: "badge bg-secondary", children: "N\u00E3o" }) }
    ];
    if (error)
        return _jsx("div", { className: "p-4", children: _jsx(ErrorMessage, { message: "Erro ao carregar locais" }) });
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-0", children: [_jsx("i", { className: "bi bi-box-seam me-2 text-primary" }), "Locais de Armazenamento"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie silos, armaz\u00E9ns e locais de estoque (internos e externos)" })] }), _jsx("div", { children: _jsxs("button", { className: "btn btn-success", onClick: () => setShowCreateModal(true), children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), " Novo Local"] }) })] }), _jsx("div", { className: "card border-0 shadow-sm", children: _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { columns: columns, data: locais, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhum local cadastrado" }) }) }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingLocal, onClose: handleCloseModal, title: editingLocal ? 'Editar Local' : 'Novo Local', children: _jsx(LocalArmazenagemForm, { local: editingLocal, onSuccess: () => { handleCloseModal(); refetch(); } }) }), _jsx(ConfirmDialog, { isOpen: !!deleteLocal, title: "Excluir local", message: deleteLocal ? `Tem certeza que deseja excluir o local "${deleteLocal.nome}"?` : 'Tem certeza?', confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteLocal(null) })] }));
};
export default LocaisArmazenagemList;
