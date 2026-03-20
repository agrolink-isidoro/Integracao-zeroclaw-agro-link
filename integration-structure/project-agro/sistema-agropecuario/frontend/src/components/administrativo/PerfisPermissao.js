import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../../services/rbac';
import { ALL_MODULES, MODULE_LABELS } from '../../types/rbac';
import toast from 'react-hot-toast';
const PerfisPermissao = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // New group form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rbacService.getGroups();
            setGroups(data);
        }
        catch {
            toast.error('Erro ao carregar perfis');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadGroups();
    }, [loadGroups]);
    const selectGroup = async (id) => {
        try {
            const detail = await rbacService.getGroup(id);
            setSelectedGroup(detail);
        }
        catch {
            toast.error('Erro ao carregar detalhes do perfil');
        }
    };
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim())
            return;
        setSaving(true);
        try {
            const created = await rbacService.createGroup({ nome: newGroupName, descricao: newGroupDesc });
            toast.success('Perfil criado!');
            setShowCreateForm(false);
            setNewGroupName('');
            setNewGroupDesc('');
            await loadGroups();
            selectGroup(created.id);
        }
        catch (err) {
            toast.error(err?.response?.data?.nome?.[0] || 'Erro ao criar perfil');
        }
        finally {
            setSaving(false);
        }
    };
    const handleDeleteGroup = async (group) => {
        if (group.is_system) {
            toast.error('Perfis de sistema não podem ser excluídos.');
            return;
        }
        if (!confirm(`Excluir o perfil "${group.nome}"?`))
            return;
        try {
            await rbacService.deleteGroup(group.id);
            toast.success('Perfil excluído');
            if (selectedGroup?.id === group.id)
                setSelectedGroup(null);
            loadGroups();
        }
        catch (err) {
            toast.error(err?.response?.data?.error || 'Erro ao excluir perfil');
        }
    };
    const togglePermission = async (module, field, currentValue) => {
        if (!selectedGroup)
            return;
        setSaving(true);
        // Find existing permission entry for this module
        const existing = selectedGroup.permissions.find((p) => p.module === module);
        try {
            if (existing) {
                await rbacService.updateGroupPermission(existing.id, { [field]: !currentValue });
            }
            else {
                // Create new entry with the toggled field
                await rbacService.setGroupPermission({
                    group: selectedGroup.id,
                    module,
                    can_view: field === 'can_view' ? !currentValue : false,
                    can_edit: field === 'can_edit' ? !currentValue : false,
                    can_respond: field === 'can_respond' ? !currentValue : false,
                });
            }
            // Refresh
            const updated = await rbacService.getGroup(selectedGroup.id);
            setSelectedGroup(updated);
        }
        catch (err) {
            toast.error('Erro ao atualizar permissão');
        }
        finally {
            setSaving(false);
        }
    };
    const getPermissionForModule = (module) => {
        return selectedGroup?.permissions.find((p) => p.module === module);
    };
    if (loading) {
        return (_jsx("div", { className: "text-center py-5", children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }) }));
    }
    return (_jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-shield-lock me-2" }), "Perfis"] }), _jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => setShowCreateForm(!showCreateForm), children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), " Novo"] })] }), showCreateForm && (_jsxs("form", { onSubmit: handleCreateGroup, className: "card card-body mb-3", children: [_jsx("div", { className: "mb-2", children: _jsx("input", { type: "text", className: "form-control form-control-sm", placeholder: "Nome do perfil", value: newGroupName, onChange: (e) => setNewGroupName(e.target.value), required: true }) }), _jsx("div", { className: "mb-2", children: _jsx("textarea", { className: "form-control form-control-sm", placeholder: "Descri\u00E7\u00E3o (opcional)", rows: 2, value: newGroupDesc, onChange: (e) => setNewGroupDesc(e.target.value) }) }), _jsxs("div", { className: "d-flex gap-2", children: [_jsx("button", { type: "submit", className: "btn btn-sm btn-success", disabled: saving, children: "Criar" }), _jsx("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => setShowCreateForm(false), children: "Cancelar" })] })] })), _jsxs("div", { className: "list-group", children: [groups.map((g) => (_jsxs("div", { className: `list-group-item list-group-item-action d-flex justify-content-between align-items-start ${selectedGroup?.id === g.id ? 'active' : ''}`, style: { cursor: 'pointer' }, onClick: () => selectGroup(g.id), children: [_jsxs("div", { children: [_jsx("strong", { children: g.nome }), g.is_system && (_jsx("span", { className: "badge bg-secondary ms-1", style: { fontSize: '0.6rem' }, children: "sistema" })), _jsx("br", {}), _jsxs("small", { className: selectedGroup?.id === g.id ? 'text-white-50' : 'text-muted', children: [g.user_count, " usu\u00E1rio(s)"] })] }), !g.is_system && (_jsx("button", { className: `btn btn-sm ${selectedGroup?.id === g.id ? 'btn-outline-light' : 'btn-outline-danger'}`, onClick: (e) => {
                                            e.stopPropagation();
                                            handleDeleteGroup(g);
                                        }, title: "Excluir perfil", children: _jsx("i", { className: "bi bi-trash" }) }))] }, g.id))), groups.length === 0 && (_jsx("div", { className: "text-center text-muted py-3", children: "Nenhum perfil cadastrado." }))] })] }), _jsx("div", { className: "col-md-8", children: selectedGroup ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsx("h5", { className: "mb-0", children: selectedGroup.nome }), _jsx("small", { className: "text-muted", children: selectedGroup.descricao || 'Sem descrição' })] }), _jsxs("span", { className: "badge bg-primary", children: [selectedGroup.user_count, " usu\u00E1rio(s)"] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-grid-3x3 me-2" }), "Matriz de Permiss\u00F5es"] }) }), _jsx("div", { className: "card-body p-0", children: _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0 align-middle", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "M\u00F3dulo" }), _jsxs("th", { className: "text-center", title: "Pode visualizar dados", children: [_jsx("i", { className: "bi bi-eye me-1" }), "Visualizar"] }), _jsxs("th", { className: "text-center", title: "Pode criar e editar dados", children: [_jsx("i", { className: "bi bi-pencil me-1" }), "Editar"] }), _jsxs("th", { className: "text-center", title: "Pode aprovar, rejeitar ou responder", children: [_jsx("i", { className: "bi bi-check2-circle me-1" }), "Responder"] })] }) }), _jsx("tbody", { children: ALL_MODULES.map((mod) => {
                                                        const perm = getPermissionForModule(mod);
                                                        return (_jsxs("tr", { children: [_jsx("td", { children: _jsx("strong", { children: MODULE_LABELS[mod] }) }), _jsx("td", { className: "text-center", children: _jsx("div", { className: "form-check form-switch d-inline-block", children: _jsx("input", { type: "checkbox", className: "form-check-input", checked: perm?.can_view ?? false, onChange: () => togglePermission(mod, 'can_view', perm?.can_view ?? false), disabled: saving }) }) }), _jsx("td", { className: "text-center", children: _jsx("div", { className: "form-check form-switch d-inline-block", children: _jsx("input", { type: "checkbox", className: "form-check-input", checked: perm?.can_edit ?? false, onChange: () => togglePermission(mod, 'can_edit', perm?.can_edit ?? false), disabled: saving }) }) }), _jsx("td", { className: "text-center", children: _jsx("div", { className: "form-check form-switch d-inline-block", children: _jsx("input", { type: "checkbox", className: "form-check-input", checked: perm?.can_respond ?? false, onChange: () => togglePermission(mod, 'can_respond', perm?.can_respond ?? false), disabled: saving }) }) })] }, mod));
                                                    }) })] }) }) })] }), _jsxs("div", { className: "mt-2 text-muted small", children: [_jsx("i", { className: "bi bi-clock me-1" }), "Criado em: ", new Date(selectedGroup.criado_em).toLocaleDateString('pt-BR'), " | Atualizado: ", new Date(selectedGroup.atualizado_em).toLocaleDateString('pt-BR')] })] })) : (_jsxs("div", { className: "text-center text-muted py-5", children: [_jsx("i", { className: "bi bi-shield-lock", style: { fontSize: '3rem' } }), _jsx("p", { className: "mt-3", children: "Selecione um perfil \u00E0 esquerda para visualizar e editar suas permiss\u00F5es." })] })) })] }));
};
export default PerfisPermissao;
