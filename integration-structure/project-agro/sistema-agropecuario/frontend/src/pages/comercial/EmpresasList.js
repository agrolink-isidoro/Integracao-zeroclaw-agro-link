import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import ModalForm from '@/components/common/ModalForm';
import EmpresaCreate from './EmpresaCreate';
import ComercialService from '@/services/comercial';
const EmpresasList = () => {
    const { data, isLoading, error } = useEmpresas();
    const empresas = Array.isArray(data) ? data : [];
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEmpresa, setEditingEmpresa] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const navigate = useNavigate();
    const qc = useQueryClient();
    if (isLoading)
        return _jsx("div", { children: "Carregando empresas..." });
    if (error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar empresas." });
    const handleDelete = async () => {
        if (!deleteConfirm)
            return;
        setDeleteLoading(true);
        try {
            await ComercialService.deleteEmpresa(deleteConfirm.id);
            qc.invalidateQueries({ queryKey: ['empresas'] });
            setDeleteConfirm(null);
        }
        catch (e) {
            console.error('Erro ao deletar empresa:', e);
        }
        finally {
            setDeleteLoading(false);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h2", { children: "Empresas / Prestadoras" }), _jsx("button", { className: "btn btn-primary", onClick: () => setShowCreateModal(true), children: "Nova Empresa" })] }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Nome" }), _jsx("th", { children: "CNPJ" }), _jsx("th", { children: "Contato" }), _jsx("th", { children: "Endere\u00E7o" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: empresas.length ? empresas.map((e) => (_jsxs("tr", { children: [_jsx("td", { children: e.nome }), _jsx("td", { children: e.cnpj }), _jsx("td", { children: e.contato || '-' }), _jsx("td", { children: e.endereco || '-' }), _jsx("td", { children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-info", title: "Visualizar", onClick: () => navigate(`/comercial/empresas/${e.id}`), children: _jsx("i", { className: "bi bi-eye" }) }), _jsx("button", { className: "btn btn-outline-warning", title: "Editar", onClick: () => setEditingEmpresa(e), children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-danger", title: "Deletar", onClick: () => setDeleteConfirm({ id: e.id, nome: e.nome }), children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, e.id))) : (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "text-center", children: "Nenhuma empresa encontrada." }) })) })] }) }) }) }), _jsx(ModalForm, { isOpen: showCreateModal, onClose: () => setShowCreateModal(false), title: "Nova Empresa", children: _jsx(EmpresaCreate, { onSuccess: (data) => { setShowCreateModal(false); navigate(`/comercial/empresas/${data.id}`); }, onCancel: () => setShowCreateModal(false) }) }), _jsx(ModalForm, { isOpen: !!editingEmpresa, onClose: () => setEditingEmpresa(null), title: "Editar Empresa", children: _jsx(EmpresaCreate, { initialData: editingEmpresa, onSuccess: () => { setEditingEmpresa(null); qc.invalidateQueries({ queryKey: ['empresas'] }); }, onCancel: () => setEditingEmpresa(null) }) }), deleteConfirm && (_jsx("div", { className: "modal d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title text-danger", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Confirmar exclus\u00E3o"] }), _jsx("button", { className: "btn-close", onClick: () => setDeleteConfirm(null), disabled: deleteLoading })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["Tem certeza que deseja excluir ", _jsx("strong", { children: deleteConfirm.nome }), "?"] }), _jsx("p", { className: "text-muted small mb-0", children: "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita." })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setDeleteConfirm(null), disabled: deleteLoading, children: "Cancelar" }), _jsxs("button", { className: "btn btn-danger", onClick: handleDelete, disabled: deleteLoading, children: [deleteLoading ? _jsx("span", { className: "spinner-border spinner-border-sm me-1" }) : _jsx("i", { className: "bi bi-trash me-1" }), "Deletar"] })] })] }) }) }))] }));
};
export default EmpresasList;
