import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiQuery, useApiDelete, useApiCreate, useApiUpdate } from '../../hooks/useApi';
import DataTable from '../common/DataTable';
import ModalForm from '../common/ModalForm';
import ConfirmDialog from '../common/ConfirmDialog';
import EquipamentoForm from './EquipamentoForm';
const EquipamentosList = () => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEquipamento, setEditingEquipamento] = useState(null);
    const [deleteEquipamento, setDeleteEquipamento] = useState(null);
    // Queries
    const { data: equipamentos = [], isLoading } = useApiQuery(['equipamentos'], '/maquinas/equipamentos/');
    // Mutations
    const deleteMutation = useApiDelete('/maquinas/equipamentos/', [['equipamentos']]);
    const createMutation = useApiCreate('/maquinas/equipamentos/', [['equipamentos']]);
    const updateMutation = useApiUpdate('/maquinas/equipamentos/', [['equipamentos']]);
    const handleEdit = (equipamento) => {
        setEditingEquipamento(equipamento);
    };
    const handleDelete = (equipamento) => {
        setDeleteEquipamento(equipamento);
    };
    const confirmDelete = async () => {
        if (deleteEquipamento) {
            try {
                await deleteMutation.mutateAsync(deleteEquipamento.id);
                setDeleteEquipamento(null);
            }
            catch (error) {
                console.error('Erro ao excluir equipamento:', error);
            }
        }
    };
    const handleSaveEquipamento = async (equipamentoData) => {
        try {
            console.log('=== DEBUG EQUIPAMENTOS LIST ===');
            console.log('Dados recebidos do form:', equipamentoData);
            console.log('================================');
            if (editingEquipamento) {
                // Atualizar equipamento existente
                await updateMutation.mutateAsync({ id: editingEquipamento.id, ...equipamentoData });
            }
            else {
                // Criar novo equipamento
                await createMutation.mutateAsync(equipamentoData);
            }
            // Invalidate and refresh handled by hooks; just close modal
            handleCloseModal();
        }
        catch (error) {
            console.error('Erro ao salvar equipamento:', error);
            alert('Erro ao salvar equipamento. Tente novamente.');
        }
    };
    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingEquipamento(null);
    };
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'ativo':
                return 'bg-success';
            case 'inativo':
                return 'bg-secondary';
            case 'manutenção':
                return 'bg-warning text-dark';
            case 'vendido':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };
    const getMobilidadeIcon = (tipoMobilidade) => {
        switch (tipoMobilidade) {
            case 'autopropelido':
                return 'bi-truck';
            case 'estacionario':
                return 'bi-house-gear';
            case 'rebocado':
                return 'bi-link-45deg';
            default:
                return 'bi-gear';
        }
    };
    const columns = [
        {
            key: 'nome',
            header: 'Nome',
            sortable: true,
            render: (value, item) => (_jsxs("div", { children: [_jsxs("div", { className: "fw-semibold", children: [_jsx("i", { className: `bi ${getMobilidadeIcon(item.categoria_detail?.tipo_mobilidade || '')} me-2 text-primary` }), value] }), _jsxs("small", { className: "text-muted", children: [item.marca, " ", item.modelo] })] }))
        },
        {
            key: 'categoria_detail',
            header: 'Categoria',
            render: (_value, item) => (_jsxs("span", { className: "badge bg-info-subtle text-info", children: [_jsx("i", { className: "bi bi-tag me-1" }), item.categoria_detail?.nome || 'N/A'] })),
            sortable: true
        },
        {
            key: 'status',
            header: 'Status',
            render: (value) => (_jsx("span", { className: `badge ${getStatusBadgeColor(value)}`, children: value })),
            sortable: true
        },
        {
            key: 'horimetro_atual',
            header: 'Horímetro',
            render: (value) => value ? (_jsxs("span", { className: "text-muted", children: [_jsx("i", { className: "bi bi-clock me-1" }), value.toLocaleString('pt-BR'), " h"] })) : '-',
            sortable: true
        },
        {
            key: 'valor_aquisicao',
            header: 'Valor Aquisição',
            render: (value) => value ? (_jsxs("span", { className: "text-muted", children: ["R$ ", value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] })) : '-',
            sortable: true
        },
        {
            key: 'data_aquisicao',
            header: 'Aquisição',
            render: (value) => value ? (_jsx("span", { className: "text-muted", children: new Date(value).toLocaleDateString('pt-BR') })) : '-',
            sortable: true
        }
    ];
    const totalEquipamentos = equipamentos.length;
    const equipamentosAtivos = equipamentos.filter(e => e.status === 'ativo').length;
    const emManutencao = equipamentos.filter(e => e.status === 'manutenção').length;
    const totalHoras = equipamentos.reduce((sum, e) => sum + (e.horimetro_atual || 0), 0);
    return (_jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "h2 mb-1", children: [_jsx("i", { className: "bi bi-gear text-primary me-2" }), "Equipamentos"] }), _jsx("p", { className: "text-muted mb-0", children: "Gerencie m\u00E1quinas e implementos agr\u00EDcolas" })] }), _jsxs("button", { onClick: () => setShowCreateModal(true), className: "btn btn-success btn-lg shadow-sm", children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Novo Equipamento"] })] }), _jsxs("div", { className: "row g-3 mb-4", children: [_jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-primary bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "TOTAL" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalEquipamentos }), _jsxs("small", { className: "text-white-50", children: ["equipamento", totalEquipamentos !== 1 ? 's' : ''] })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-gear fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-success bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "ATIVOS" }), _jsx("h3", { className: "mb-0 fw-bold", children: equipamentosAtivos }), _jsx("small", { className: "text-white-50", children: "em opera\u00E7\u00E3o" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-check-circle fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-warning bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "MANUTEN\u00C7\u00C3O" }), _jsx("h3", { className: "mb-0 fw-bold", children: emManutencao }), _jsx("small", { className: "text-white-50", children: "em reparo" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-tools fs-3" }) })] }) }) }) }), _jsx("div", { className: "col-6 col-md-3", children: _jsx("div", { className: "card border-0 shadow-sm h-100 bg-info bg-gradient text-white", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white-50 mb-1 small", children: "HORAS TOTAIS" }), _jsx("h3", { className: "mb-0 fw-bold", children: totalHoras.toLocaleString('pt-BR') }), _jsx("small", { className: "text-white-50", children: "horas trabalhadas" })] }), _jsx("div", { className: "bg-white bg-opacity-25 rounded-3 p-2", children: _jsx("i", { className: "bi bi-clock fs-3" }) })] }) }) }) })] }), _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-header bg-primary text-white py-3", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-list-ul me-2" }), "Lista de Equipamentos", _jsx("span", { className: "badge bg-white text-primary ms-2", children: equipamentos.length })] }) }), _jsx("div", { className: "card-body p-0", children: _jsx(DataTable, { data: equipamentos, columns: columns, loading: isLoading, onEdit: handleEdit, onDelete: handleDelete, emptyMessage: "Nenhum equipamento cadastrado" }) })] }), _jsx(ModalForm, { isOpen: showCreateModal || !!editingEquipamento, title: editingEquipamento ? 'Editar Equipamento' : 'Novo Equipamento', onClose: handleCloseModal, children: _jsx(EquipamentoForm, { equipamento: editingEquipamento || undefined, onSave: handleSaveEquipamento, onCancel: handleCloseModal }) }), _jsx(ConfirmDialog, { isOpen: !!deleteEquipamento, title: "Excluir Equipamento", message: `Tem certeza que deseja excluir o equipamento "${deleteEquipamento?.nome}"? Esta ação não pode ser desfeita.`, confirmText: "Excluir", cancelText: "Cancelar", type: "danger", onConfirm: confirmDelete, onCancel: () => setDeleteEquipamento(null) })] }));
};
export default EquipamentosList;
