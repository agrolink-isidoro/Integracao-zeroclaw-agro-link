import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../../services/rbac';
import { tenantsService } from '../../services/tenants';
import UserFormModal from './UserFormModal';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';
const GestaoUsuarios = () => {
    const { user: currentUser } = useAuthContext();
    const isSuperuser = !!currentUser?.is_superuser;
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);
    // Group assignments for the user being edited
    const [userAssignments, setUserAssignments] = useState([]);
    const [pendingGroupChanges, setPendingGroupChanges] = useState(new Map());
    // Tenants para modal de root
    const [tenants, setTenants] = useState([]);
    const [showRootModal, setShowRootModal] = useState(false);
    const [rootTargetUser, setRootTargetUser] = useState(null);
    const [selectedTenantId, setSelectedTenantId] = useState('');
    const [settingRoot, setSettingRoot] = useState(false);
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const reqs = [rbacService.getUsers(), rbacService.getGroups()];
            if (isSuperuser)
                reqs.push(tenantsService.list());
            const results = await Promise.all(reqs);
            setUsers(results[0]);
            setGroups(results[1]);
            if (isSuperuser && results[2])
                setTenants(results[2]);
        }
        catch (err) {
            console.error('Error loading users:', err);
            toast.error('Erro ao carregar usuários');
        }
        finally {
            setLoading(false);
        }
    }, [isSuperuser]);
    useEffect(() => {
        loadData();
    }, [loadData]);
    const openCreate = () => {
        setEditingUser(null);
        setUserAssignments([]);
        setPendingGroupChanges(new Map());
        setShowModal(true);
    };
    const openEdit = async (user) => {
        setEditingUser(user);
        setPendingGroupChanges(new Map());
        try {
            const assignments = await rbacService.getUserGroupAssignments({ user: user.id });
            setUserAssignments(assignments);
        }
        catch {
            setUserAssignments([]);
        }
        setShowModal(true);
    };
    const handleSave = async (data) => {
        setSaving(true);
        try {
            let savedUser;
            if (editingUser) {
                savedUser = await rbacService.updateUser(editingUser.id, data);
            }
            else {
                savedUser = await rbacService.createUser(data);
            }
            // Apply group changes
            for (const [groupId, shouldAssign] of pendingGroupChanges.entries()) {
                if (shouldAssign) {
                    try {
                        await rbacService.assignUserToGroup(savedUser.id, groupId);
                    }
                    catch (err) {
                        // Ignore duplicate assignment errors
                        if (!err?.response?.data?.non_field_errors?.[0]?.includes('already exists')) {
                            throw err;
                        }
                    }
                }
                else {
                    // Find the assignment to remove
                    const assignment = userAssignments.find((a) => a.group === groupId);
                    if (assignment) {
                        await rbacService.removeUserFromGroup(assignment.id);
                    }
                }
            }
            toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
            setShowModal(false);
            loadData();
        }
        catch (err) {
            const detail = err?.response?.data;
            const msg = typeof detail === 'string'
                ? detail
                : detail?.detail || detail?.username?.[0] || detail?.email?.[0] || 'Erro ao salvar';
            toast.error(msg);
            throw err; // Let modal display the error too
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (user) => {
        if (!confirm(`Excluir o usuário "${user.username}"? Esta ação não pode ser desfeita.`))
            return;
        try {
            await rbacService.deleteUser(user.id);
            toast.success('Usuário excluído');
            loadData();
        }
        catch {
            toast.error('Erro ao excluir usuário');
        }
    };
    const handleToggleActive = async (user) => {
        try {
            await rbacService.updateUser(user.id, { is_active: !user.is_active });
            toast.success(user.is_active ? 'Usuário desativado' : 'Usuário ativado');
            loadData();
        }
        catch {
            toast.error('Erro ao alterar status');
        }
    };
    const openRootModal = (user) => {
        setRootTargetUser(user);
        setSelectedTenantId(user.tenant || '');
        setShowRootModal(true);
    };
    const handleSetRoot = async () => {
        if (!rootTargetUser || !selectedTenantId)
            return;
        setSettingRoot(true);
        try {
            const result = await rbacService.setTenantOwner(selectedTenantId, rootTargetUser.id);
            toast.success(result.detail);
            setShowRootModal(false);
            loadData();
        }
        catch (err) {
            const msg = err?.response?.data?.detail || 'Erro ao definir proprietário';
            toast.error(msg);
        }
        finally {
            setSettingRoot(false);
        }
    };
    const handleGroupToggle = (groupId, assign) => {
        setPendingGroupChanges((prev) => {
            const next = new Map(prev);
            // Check if this is reverting an existing state
            const currentlyAssigned = userAssignments.some((a) => a.group === groupId);
            if (assign === currentlyAssigned) {
                next.delete(groupId); // No change needed
            }
            else {
                next.set(groupId, assign);
            }
            return next;
        });
    };
    // Compute effective assigned group IDs considering pending changes
    const getAssignedGroupIds = () => {
        const baseIds = new Set(userAssignments.map((a) => a.group));
        for (const [groupId, assign] of pendingGroupChanges.entries()) {
            if (assign)
                baseIds.add(groupId);
            else
                baseIds.delete(groupId);
        }
        return Array.from(baseIds);
    };
    const filtered = users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.cargo || '').toLowerCase().includes(search.toLowerCase()));
    if (loading) {
        return (_jsx("div", { className: "text-center py-5", children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }) }));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-people me-2" }), "Gest\u00E3o de Usu\u00E1rios"] }), _jsxs("small", { className: "text-muted", children: [users.length, " usu\u00E1rio(s) cadastrado(s)"] })] }), _jsxs("button", { className: "btn btn-primary", onClick: openCreate, children: [_jsx("i", { className: "bi bi-person-plus me-1" }), " Novo Usu\u00E1rio"] })] }), _jsx("div", { className: "mb-3", children: _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-group-text", children: _jsx("i", { className: "bi bi-search" }) }), _jsx("input", { type: "text", className: "form-control", placeholder: "Buscar por nome, username, email ou cargo...", value: search, onChange: (e) => setSearch(e.target.value) }), search && (_jsx("button", { className: "btn btn-outline-secondary", onClick: () => setSearch(''), children: _jsx("i", { className: "bi bi-x" }) }))] }) }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover align-middle", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "Usu\u00E1rio" }), _jsx("th", { children: "Nome" }), _jsx("th", { children: "Cargo" }), _jsx("th", { children: "Tenant / Fun\u00E7\u00E3o" }), _jsx("th", { children: "Perfis" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-end", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "text-center text-muted py-4", children: search ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.' }) })) : (filtered.map((u) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("div", { children: [_jsx("strong", { children: u.username }), _jsx("br", {}), _jsx("small", { className: "text-muted", children: u.email })] }) }), _jsx("td", { children: u.first_name || u.last_name
                                            ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                            : _jsx("span", { className: "text-muted", children: "\u2014" }) }), _jsx("td", { children: u.cargo || _jsx("span", { className: "text-muted", children: "\u2014" }) }), _jsx("td", { children: u.tenant_info ? (_jsxs("div", { children: [_jsxs("span", { className: "badge bg-primary bg-opacity-75 me-1", title: `Slug: ${u.tenant_info.slug}`, children: [_jsx("i", { className: "bi bi-building me-1" }), u.tenant_info.nome] }), (u.cargo || '').trim().toLowerCase() === 'proprietário' && (_jsx("span", { className: "badge bg-warning text-dark ms-1", title: "Root / Propriet\u00E1rio", children: _jsx("i", { className: "bi bi-star-fill" }) }))] })) : (_jsx("span", { className: "text-muted small", children: "Sem tenant" })) }), _jsx("td", { children: u.groups_display && u.groups_display.length > 0 ? (_jsx("div", { className: "d-flex flex-wrap gap-1", children: u.groups_display.map((g) => (_jsx("span", { className: "badge bg-info text-dark", style: { fontSize: '0.7rem' }, children: g.nome }, g.id))) })) : (_jsx("span", { className: "text-muted small", children: "Sem perfil" })) }), _jsxs("td", { children: [_jsx("span", { className: `badge ${u.is_active ? 'bg-success' : 'bg-danger'}`, style: { cursor: 'pointer' }, onClick: () => handleToggleActive(u), title: u.is_active ? 'Clique para desativar' : 'Clique para ativar', children: u.is_active ? 'Ativo' : 'Inativo' }), u.is_staff && (_jsx("span", { className: "badge bg-warning text-dark ms-1", children: "Staff" }))] }), _jsx("td", { className: "text-end", children: _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { className: "btn btn-outline-primary", onClick: () => openEdit(u), title: "Editar", children: _jsx("i", { className: "bi bi-pencil" }) }), _jsx("button", { className: "btn btn-outline-warning", onClick: () => openRootModal(u), title: "Definir como Propriet\u00E1rio de Tenant", children: _jsx("i", { className: "bi bi-star" }) }), _jsx("button", { className: "btn btn-outline-danger", onClick: () => handleDelete(u), title: "Excluir", children: _jsx("i", { className: "bi bi-trash" }) })] }) })] }, u.id)))) })] }) }), showRootModal && rootTargetUser && (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-star me-2 text-warning" }), "Definir Propriet\u00E1rio de Tenant"] }), _jsx("button", { type: "button", className: "btn-close", onClick: () => setShowRootModal(false), disabled: settingRoot })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { className: "mb-3", children: ["Selecione o tenant para o qual ", _jsxs("strong", { children: ["@", rootTargetUser.username] }), " ser\u00E1 definido como ", _jsx("strong", { children: "propriet\u00E1rio (root)" }), ":"] }), _jsxs("p", { className: "text-muted small mb-3", children: ["O cargo do usu\u00E1rio ser\u00E1 alterado para ", _jsx("code", { children: "propriet\u00E1rio" }), " e ele receber\u00E1 acesso total ao tenant selecionado."] }), _jsxs("select", { className: "form-select", value: selectedTenantId, onChange: e => setSelectedTenantId(e.target.value), children: [_jsx("option", { value: "", children: "\u2014 Selecione um tenant \u2014" }), tenants.map(t => (_jsxs("option", { value: t.id, children: [t.nome, " (", t.slug, ") ", !t.ativo ? '— Inativo' : ''] }, t.id)))] }), rootTargetUser.tenant_info && (_jsxs("small", { className: "text-muted d-block mt-2", children: ["Tenant atual: ", _jsx("strong", { children: rootTargetUser.tenant_info.nome })] }))] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setShowRootModal(false), disabled: settingRoot, children: "Cancelar" }), _jsx("button", { className: "btn btn-warning", onClick: handleSetRoot, disabled: !selectedTenantId || settingRoot, children: settingRoot
                                            ? _jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2" }), "Salvando..."] })
                                            : _jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-star-fill me-1" }), "Confirmar"] }) })] })] }) }) })), _jsx(UserFormModal, { show: showModal, onClose: () => setShowModal(false), onSave: handleSave, user: editingUser, groups: groups, assignedGroupIds: getAssignedGroupIds(), onGroupToggle: handleGroupToggle, saving: saving, tenants: tenants, isSuperuser: isSuperuser })] }));
};
export default GestaoUsuarios;
