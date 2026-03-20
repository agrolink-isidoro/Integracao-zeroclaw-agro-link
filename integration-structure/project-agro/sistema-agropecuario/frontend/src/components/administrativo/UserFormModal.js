import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
const UserFormModal = ({ show, onClose, onSave, user, groups, assignedGroupIds, onGroupToggle, saving = false, tenants = [], isSuperuser = false, }) => {
    const isEdit = !!user;
    const [form, setForm] = useState({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        is_active: true,
        is_staff: false,
        cargo: '',
        telefone: '',
        tenant: '',
    });
    const [error, setError] = useState('');
    useEffect(() => {
        if (user) {
            setForm({
                username: user.username,
                email: user.email,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                password: '',
                is_active: user.is_active,
                is_staff: user.is_staff,
                cargo: user.cargo || '',
                telefone: user.telefone || '',
                tenant: user.tenant || '',
            });
        }
        else {
            setForm({
                username: '',
                email: '',
                first_name: '',
                last_name: '',
                password: '',
                is_active: true,
                is_staff: false,
                cargo: '',
                telefone: '',
                tenant: '',
            });
        }
        setError('');
    }, [user, show]);
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.username.trim()) {
            setError('Username é obrigatório.');
            return;
        }
        if (!isEdit && !form.password) {
            setError('Senha é obrigatória para novo usuário.');
            return;
        }
        try {
            const payload = { ...form };
            // Don't send empty password on edit
            if (isEdit && !payload.password) {
                delete payload.password;
            }
            // Não enviar tenant vazio — deixa o backend decidir
            if (!payload.tenant) {
                delete payload.tenant;
            }
            await onSave(payload);
        }
        catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Erro ao salvar usuário.');
        }
    };
    if (!show)
        return null;
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: `bi ${isEdit ? 'bi-pencil' : 'bi-person-plus'} me-2` }), isEdit ? 'Editar Usuário' : 'Novo Usuário'] }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose, disabled: saving })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-body", children: [error && (_jsx("div", { className: "alert alert-danger py-2", children: error })), _jsxs("div", { className: "row g-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Username *" }), _jsx("input", { type: "text", className: "form-control", name: "username", value: form.username, onChange: handleChange, disabled: isEdit, required: true })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "E-mail" }), _jsx("input", { type: "email", className: "form-control", name: "email", value: form.email, onChange: handleChange })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Nome" }), _jsx("input", { type: "text", className: "form-control", name: "first_name", value: form.first_name, onChange: handleChange })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Sobrenome" }), _jsx("input", { type: "text", className: "form-control", name: "last_name", value: form.last_name, onChange: handleChange })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Cargo" }), _jsx("input", { type: "text", className: "form-control", name: "cargo", value: form.cargo, onChange: handleChange, placeholder: "Ex: Gerente, T\u00E9cnico, Operador" })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: "Telefone" }), _jsx("input", { type: "text", className: "form-control", name: "telefone", value: form.telefone, onChange: handleChange, placeholder: "(00) 00000-0000" })] }), isSuperuser && tenants.length > 0 && (_jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-building me-1" }), "Tenant (Fazenda / Empresa)", !isEdit && _jsx("span", { className: "text-danger ms-1", children: "*" })] }), _jsxs("select", { className: "form-select", name: "tenant", value: form.tenant || '', onChange: (e) => setForm(prev => ({ ...prev, tenant: e.target.value || null })), children: [_jsx("option", { value: "", children: "\u2014 Selecione o tenant do usu\u00E1rio \u2014" }), tenants.filter(t => t.ativo).map(t => (_jsxs("option", { value: t.id, children: [t.nome, " (", t.slug, ")"] }, t.id)))] }), _jsxs("div", { className: "form-text", children: ["Usu\u00E1rios no mesmo tenant ", _jsx("strong", { children: "compartilham os mesmos dados" }), ". Para dados isolados, crie um tenant separado."] })] })), _jsxs("div", { className: "col-md-6", children: [_jsx("label", { className: "form-label", children: isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha *' }), _jsx("input", { type: "password", className: "form-control", name: "password", value: form.password, onChange: handleChange, required: !isEdit })] }), _jsxs("div", { className: "col-md-6 d-flex align-items-end gap-4", children: [_jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", className: "form-check-input", name: "is_active", id: "isActive", checked: form.is_active, onChange: handleChange }), _jsx("label", { className: "form-check-label", htmlFor: "isActive", children: "Ativo" })] }), _jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", className: "form-check-input", name: "is_staff", id: "isStaff", checked: form.is_staff, onChange: handleChange }), _jsx("label", { className: "form-check-label", htmlFor: "isStaff", children: "Staff" })] })] })] }), _jsx("hr", { className: "my-3" }), _jsxs("h6", { children: [_jsx("i", { className: "bi bi-shield-check me-2" }), "Perfis de Permiss\u00E3o"] }), _jsx("p", { className: "text-muted small mb-2", children: "Selecione os perfis/grupos que este usu\u00E1rio deve pertencer:" }), _jsx("div", { className: "row g-2", children: groups.map((g) => (_jsx("div", { className: "col-md-6 col-lg-4", children: _jsxs("div", { className: `border rounded p-2 d-flex align-items-center ${assignedGroupIds.includes(g.id) ? 'border-primary bg-primary bg-opacity-10' : ''}`, style: { cursor: 'pointer' }, onClick: () => onGroupToggle(g.id, !assignedGroupIds.includes(g.id)), children: [_jsx("input", { type: "checkbox", className: "form-check-input me-2", checked: assignedGroupIds.includes(g.id), onChange: () => onGroupToggle(g.id, !assignedGroupIds.includes(g.id)) }), _jsxs("div", { children: [_jsx("strong", { className: "small", children: g.nome }), g.is_system && (_jsx("span", { className: "badge bg-secondary ms-1", style: { fontSize: '0.65rem' }, children: "sistema" }))] })] }) }, g.id))) })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: saving, children: saving ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-1" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-lg me-1" }), isEdit ? 'Salvar' : 'Criar Usuário'] })) })] })] })] }) }) }));
};
export default UserFormModal;
