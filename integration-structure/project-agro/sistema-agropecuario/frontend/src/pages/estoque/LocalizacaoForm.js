import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
const TIPOS_LOCALIZACAO = [
    { value: 'interna', label: 'Interna' },
    { value: 'externa', label: 'Externa' },
];
const LocalizacaoForm = ({ localizacao, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nome: '',
        tipo: 'interna',
        endereco: '',
        capacidade_total: 0,
        capacidade_ocupada: 0,
        ativa: true,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (localizacao) {
            setFormData(localizacao);
        }
    }, [localizacao]);
    const handleChange = (field) => (event) => {
        const value = event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        // Validações
        if (!formData.nome?.trim()) {
            setError('Nome é obrigatório');
            return;
        }
        if (!formData.capacidade_total || formData.capacidade_total <= 0) {
            setError('Capacidade total deve ser maior que zero');
            return;
        }
        if (formData.capacidade_ocupada && formData.capacidade_ocupada < 0) {
            setError('Capacidade ocupada não pode ser negativa');
            return;
        }
        if (formData.capacidade_ocupada &&
            formData.capacidade_total &&
            formData.capacidade_ocupada > formData.capacidade_total) {
            setError('Capacidade ocupada não pode ser maior que a capacidade total');
            return;
        }
        setLoading(true);
        try {
            await onSave(formData);
        }
        catch (err) {
            setError(err.message || 'Erro ao salvar localização');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [error && (_jsxs("div", { className: "alert alert-danger alert-dismissible fade show", role: "alert", children: [error, _jsx("button", { type: "button", className: "btn-close", onClick: () => setError(null) })] })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Nome ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: "form-control", value: formData.nome || '', onChange: handleChange('nome'), placeholder: "Ex: Armaz\u00E9m Central", disabled: loading, required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-folder me-2" }), "Tipo ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { className: "form-select", value: formData.tipo || 'interna', onChange: handleChange('tipo'), disabled: loading, required: true, children: TIPOS_LOCALIZACAO.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-map me-2" }), "Endere\u00E7o"] }), _jsx("textarea", { className: "form-control", value: formData.endereco || '', onChange: handleChange('endereco'), placeholder: "Ex: Setor A - Galp\u00E3o 1", rows: 2, disabled: loading })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-123 me-2" }), "Capacidade Total ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "number", className: "form-control", value: formData.capacidade_total || '', onChange: handleChange('capacidade_total'), min: "0", step: "0.01", disabled: loading, required: true }), _jsx("small", { className: "form-text text-muted", children: "Capacidade total de armazenamento" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-speedometer2 me-2" }), "Capacidade Ocupada"] }), _jsx("input", { type: "number", className: "form-control", value: formData.capacidade_ocupada || '', onChange: handleChange('capacidade_ocupada'), min: "0", step: "0.01", disabled: loading || !!localizacao, readOnly: !!localizacao }), _jsx("small", { className: "form-text text-muted", children: "Capacidade atualmente ocupada" })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: formData.ativa ?? true, onChange: handleChange('ativa'), disabled: loading }), _jsx("label", { className: "form-check-label", children: "Localiza\u00E7\u00E3o Ativa" })] }) }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex gap-2 justify-content-end mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-secondary", onClick: onCancel, disabled: loading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-save me-2" }), loading ? 'Salvando...' : 'Salvar'] })] }) })] })] }));
};
export default LocalizacaoForm;
