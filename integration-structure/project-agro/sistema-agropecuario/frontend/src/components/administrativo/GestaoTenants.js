import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * GestaoTenants — componente para administração de tenants.
 * Visível apenas para superusers/admins.
 */
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { tenantsService } from '../../services/tenants';
const PLANO_LABELS = {
    basico: 'Básico',
    profissional: 'Profissional',
    enterprise: 'Enterprise',
};
const PLANO_BADGE = {
    basico: 'bg-secondary',
    profissional: 'bg-primary',
    enterprise: 'bg-warning text-dark',
};
const ALL_MODULES = [
    'dashboard', 'fazendas', 'agricultura', 'comercial',
    'financeiro', 'estoque', 'maquinas', 'administrativo', 'fiscal',
];
const TenantForm = ({ initial, onSave, onCancel }) => {
    // Detecta tipo de documento ao editar
    const initialDocType = initial?.cpf ? 'cpf' : 'cnpj';
    const [docType, setDocType] = useState(initialDocType);
    const [form, setForm] = useState({
        nome: initial?.nome || '',
        cnpj: initial?.cnpj || '',
        cpf: initial?.cpf || '',
        slug: initial?.slug || '',
        plano: initial?.plano || 'basico',
        limite_usuarios: initial?.limite_usuarios || 50,
        modulos_habilitados: initial?.modulos_habilitados || [...ALL_MODULES],
    });
    const [saving, setSaving] = useState(false);
    // ── Proprietário inicial ─────────────────────────────────
    const [createOwner, setCreateOwner] = useState(false);
    const [ownerForm, setOwnerForm] = useState({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        cargo: 'proprietário',
    });
    const handleModuleToggle = (mod) => {
        setForm(prev => ({
            ...prev,
            modulos_habilitados: prev.modulos_habilitados?.includes(mod)
                ? prev.modulos_habilitados.filter(m => m !== mod)
                : [...(prev.modulos_habilitados || []), mod],
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (initial) {
                const updateData = { ...form };
                await tenantsService.update(initial.id, updateData);
                toast.success('Tenant atualizado com sucesso.');
            }
            else {
                const payload = {
                    ...form,
                    ...(createOwner ? { initial_owner: ownerForm } : {}),
                };
                const result = await tenantsService.create(payload);
                if (result.initial_owner_created) {
                    toast.success(`Tenant criado! Proprietário: @${result.initial_owner_created.username} (${result.initial_owner_created.email})`, { duration: 6000 });
                }
                else {
                    toast.success('Tenant criado com sucesso.');
                }
            }
            onSave();
        }
        catch (err) {
            const msg = err?.response?.data ? JSON.stringify(err.response.data) : 'Erro ao salvar tenant';
            toast.error(msg);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label fw-semibold", children: "Nome *" }), _jsx("input", { className: "form-control", required: true, value: form.nome, onChange: e => setForm(p => ({ ...p, nome: e.target.value })) })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("label", { className: "form-label fw-semibold mb-0", children: "Documento *" }), _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx("button", { type: "button", className: `btn ${docType === 'cnpj' ? 'btn-primary' : 'btn-outline-primary'}`, onClick: () => { setDocType('cnpj'); setForm(p => ({ ...p, cpf: '' })); }, children: "CNPJ" }), _jsx("button", { type: "button", className: `btn ${docType === 'cpf' ? 'btn-primary' : 'btn-outline-primary'}`, onClick: () => { setDocType('cpf'); setForm(p => ({ ...p, cnpj: '' })); }, children: "CPF" })] })] }), docType === 'cnpj' ? (_jsx("input", { className: "form-control", required: true, placeholder: "00.000.000/0001-00", value: form.cnpj || '', onChange: e => setForm(p => ({ ...p, cnpj: e.target.value })) }, "cnpj")) : (_jsx("input", { className: "form-control", required: true, placeholder: "000.000.000-00", value: form.cpf || '', onChange: e => setForm(p => ({ ...p, cpf: e.target.value })) }, "cpf"))] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Slug *" }), _jsx("input", { className: "form-control", required: true, placeholder: "minha-fazenda", value: form.slug, disabled: !!initial, onChange: e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })) }), initial && _jsx("small", { className: "text-muted", children: "Slug n\u00E3o pode ser alterado." })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Plano *" }), _jsxs("select", { className: "form-select", value: form.plano, onChange: e => setForm(p => ({ ...p, plano: e.target.value })), children: [_jsx("option", { value: "basico", children: "B\u00E1sico" }), _jsx("option", { value: "profissional", children: "Profissional" }), _jsx("option", { value: "enterprise", children: "Enterprise" })] })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label fw-semibold", children: "Limite de usu\u00E1rios" }), _jsx("input", { type: "number", className: "form-control", min: 1, max: 9999, value: form.limite_usuarios, onChange: e => setForm(p => ({ ...p, limite_usuarios: parseInt(e.target.value) || 50 })) })] }), _jsxs("div", { className: "col-12", children: [_jsx("label", { className: "form-label fw-semibold", children: "M\u00F3dulos habilitados" }), _jsx("div", { className: "d-flex flex-wrap gap-2", children: ALL_MODULES.map(mod => (_jsxs("div", { className: "form-check form-check-inline", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: `mod-${mod}`, checked: form.modulos_habilitados?.includes(mod) ?? false, onChange: () => handleModuleToggle(mod) }), _jsx("label", { className: "form-check-label text-capitalize", htmlFor: `mod-${mod}`, children: mod })] }, mod))) })] })] }), !initial && (_jsxs("div", { className: "card border-0 bg-light mt-4 p-3", children: [_jsxs("div", { className: "d-flex align-items-center gap-2 mb-2", children: [_jsxs("div", { className: "form-check mb-0", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "createOwnerCheck", checked: createOwner, onChange: e => setCreateOwner(e.target.checked) }), _jsxs("label", { className: "form-check-label fw-semibold", htmlFor: "createOwnerCheck", children: [_jsx("i", { className: "bi bi-person-badge me-1" }), "Cadastrar usu\u00E1rio propriet\u00E1rio agora"] })] }), _jsx("small", { className: "text-muted", children: "(opcional \u2014 pode ser feito depois em Usu\u00E1rios)" })] }), createOwner && (_jsxs("div", { className: "row g-2", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label form-label-sm fw-semibold", children: "Nome" }), _jsx("input", { className: "form-control form-control-sm", placeholder: "Primeiro nome", value: ownerForm.first_name || '', onChange: e => setOwnerForm(p => ({ ...p, first_name: e.target.value })) })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label form-label-sm fw-semibold", children: "Sobrenome" }), _jsx("input", { className: "form-control form-control-sm", placeholder: "Sobrenome", value: ownerForm.last_name || '', onChange: e => setOwnerForm(p => ({ ...p, last_name: e.target.value })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label form-label-sm fw-semibold", children: "Login (username) *" }), _jsx("input", { className: "form-control form-control-sm", required: createOwner, placeholder: "joao.silva", value: ownerForm.username, onChange: e => setOwnerForm(p => ({ ...p, username: e.target.value.trim() })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label form-label-sm fw-semibold", children: "E-mail *" }), _jsx("input", { type: "email", className: "form-control form-control-sm", required: createOwner, placeholder: "joao@fazenda.com", value: ownerForm.email, onChange: e => setOwnerForm(p => ({ ...p, email: e.target.value })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label form-label-sm fw-semibold", children: "Senha *" }), _jsx("input", { type: "password", className: "form-control form-control-sm", required: createOwner, placeholder: "M\u00EDn. 8 caracteres", value: ownerForm.password, onChange: e => setOwnerForm(p => ({ ...p, password: e.target.value })) })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("label", { className: "form-label form-label-sm fw-semibold", children: "Cargo" }), _jsxs("select", { className: "form-select form-select-sm", value: ownerForm.cargo || 'proprietário', onChange: e => setOwnerForm(p => ({ ...p, cargo: e.target.value })), children: [_jsx("option", { value: "propriet\u00E1rio", children: "Propriet\u00E1rio" }), _jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "gerente", children: "Gerente" })] })] })] }))] })), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onCancel, disabled: saving, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2" }), "Salvando..."] })) : initial ? 'Salvar alterações' : 'Criar tenant' })] })] }));
};
// ───────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────
const GestaoTenants = () => {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const loadTenants = useCallback(async () => {
        setLoading(true);
        try {
            const data = await tenantsService.list(showInactive ? {} : { ativo: true });
            setTenants(data);
        }
        catch (err) {
            toast.error('Erro ao carregar tenants');
        }
        finally {
            setLoading(false);
        }
    }, [showInactive]);
    useEffect(() => {
        loadTenants();
    }, [loadTenants]);
    const handleDeactivate = async (tenant) => {
        if (!window.confirm(`Desativar o tenant "${tenant.nome}"? Todos os usuários perderão acesso.`))
            return;
        setActionLoading(tenant.id);
        try {
            await tenantsService.deactivate(tenant.id);
            toast.success('Tenant desativado.');
            loadTenants();
        }
        catch {
            toast.error('Erro ao desativar tenant');
        }
        finally {
            setActionLoading(null);
        }
    };
    const handleReactivate = async (tenant) => {
        setActionLoading(tenant.id);
        try {
            await tenantsService.reactivate(tenant.id);
            toast.success('Tenant reativado.');
            loadTenants();
        }
        catch {
            toast.error('Erro ao reativar tenant');
        }
        finally {
            setActionLoading(null);
        }
    };
    const openCreate = () => {
        setEditingTenant(null);
        setShowForm(true);
    };
    const openEdit = (tenant) => {
        setEditingTenant(tenant);
        setShowForm(true);
    };
    const handleFormSave = () => {
        setShowForm(false);
        setEditingTenant(null);
        loadTenants();
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h4", { className: "mb-0", children: [_jsx("i", { className: "bi bi-building me-2 text-primary" }), "Gest\u00E3o de Tenants"] }), _jsx("p", { className: "text-muted small mb-0", children: "Administra\u00E7\u00E3o de tenants (empresas/fazendas) do sistema" })] }), _jsxs("div", { className: "d-flex gap-2 align-items-center", children: [_jsxs("div", { className: "form-check form-switch mb-0 me-2", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "showInactive", checked: showInactive, onChange: e => setShowInactive(e.target.checked) }), _jsx("label", { className: "form-check-label small", htmlFor: "showInactive", children: "Mostrar inativos" })] }), _jsxs("button", { className: "btn btn-primary btn-sm", onClick: openCreate, children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), "Novo Tenant"] })] })] }), showForm && (_jsxs("div", { className: "card mb-4 border-primary", children: [_jsx("div", { className: "card-header bg-primary text-white", children: _jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: "bi bi-pencil-square me-2" }), editingTenant ? `Editar: ${editingTenant.nome}` : 'Novo Tenant'] }) }), _jsx("div", { className: "card-body", children: _jsx(TenantForm, { initial: editingTenant, onSave: handleFormSave, onCancel: () => { setShowForm(false); setEditingTenant(null); } }) })] })), loading ? (_jsx("div", { className: "text-center py-5", children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }) })) : tenants.length === 0 ? (_jsxs("div", { className: "text-center py-5 text-muted", children: [_jsx("i", { className: "bi bi-building fs-1 d-block mb-2 opacity-25" }), _jsx("p", { children: "Nenhum tenant encontrado." })] })) : (_jsx("div", { className: "row g-3", children: tenants.map(tenant => (_jsx("div", { className: "col-md-6 col-xl-4", children: _jsx("div", { className: `card h-100 ${!tenant.ativo ? 'opacity-60 border-secondary' : 'border-0 shadow-sm'}`, children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsxs("div", { children: [_jsx("h6", { className: "card-title mb-0 fw-bold", children: tenant.nome }), _jsx("small", { className: "text-muted font-monospace", children: tenant.slug })] }), _jsx("span", { className: `badge ${PLANO_BADGE[tenant.plano] || 'bg-secondary'}`, children: PLANO_LABELS[tenant.plano] || tenant.plano })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("small", { className: "text-muted d-block", children: [_jsx("i", { className: "bi bi-card-text me-1" }), tenant.cnpj ? `CNPJ: ${tenant.cnpj}` : tenant.cpf ? `CPF: ${tenant.cpf}` : '—'] }), _jsxs("small", { className: "text-muted d-block", children: [_jsx("i", { className: "bi bi-people me-1" }), tenant.usuarios_count, " / ", tenant.limite_usuarios, " usu\u00E1rios"] }), _jsxs("small", { className: "text-muted d-block", children: [_jsx("i", { className: "bi bi-calendar me-1" }), "Criado em ", new Date(tenant.criado_em).toLocaleDateString('pt-BR')] })] }), _jsx("div", { className: "d-flex flex-wrap gap-1 mb-3", children: tenant.modulos_habilitados?.map(mod => (_jsx("span", { className: "badge bg-light text-dark border text-capitalize", style: { fontSize: '0.7rem' }, children: mod }, mod))) }), _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsx("span", { className: `badge ${tenant.ativo ? 'bg-success' : 'bg-danger'}`, children: tenant.ativo ? 'Ativo' : 'Inativo' }), _jsxs("div", { className: "d-flex gap-1", children: [_jsx("button", { className: "btn btn-outline-secondary btn-sm", title: "Editar", onClick: () => openEdit(tenant), disabled: actionLoading === tenant.id, children: _jsx("i", { className: "bi bi-pencil" }) }), tenant.ativo ? (_jsx("button", { className: "btn btn-outline-danger btn-sm", title: "Desativar", onClick: () => handleDeactivate(tenant), disabled: actionLoading === tenant.id, children: actionLoading === tenant.id
                                                        ? _jsx("span", { className: "spinner-border spinner-border-sm" })
                                                        : _jsx("i", { className: "bi bi-pause-circle" }) })) : (_jsx("button", { className: "btn btn-outline-success btn-sm", title: "Reativar", onClick: () => handleReactivate(tenant), disabled: actionLoading === tenant.id, children: actionLoading === tenant.id
                                                        ? _jsx("span", { className: "spinner-border spinner-border-sm" })
                                                        : _jsx("i", { className: "bi bi-play-circle" }) }))] })] })] }) }) }, tenant.id))) }))] }));
};
export default GestaoTenants;
