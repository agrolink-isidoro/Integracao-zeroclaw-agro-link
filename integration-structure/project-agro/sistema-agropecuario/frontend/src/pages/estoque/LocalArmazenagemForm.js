import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import { UNIDADES_CAPACIDADE } from '../../types/estoque_maquinas';
import { getUnitLabel } from '../../utils/units';
import SelectDropdown from '../../components/common/SelectDropdown';
import LoadingSpinner from '../../components/common/LoadingSpinner';
const LocalArmazenagemForm = ({ local, onSuccess }) => {
    const [formData, setFormData] = useState({
        nome: '',
        tipo: 'armazem',
        tipo_local: 'interno',
        capacidade_total: undefined,
        unidade_capacidade: 'kg',
        fazenda: undefined,
        fornecedor: undefined,
        ativo: true
    });
    const [customErrors, setCustomErrors] = useState({});
    // Validation rules change depending on tipo_local
    const getRules = () => {
        const rules = {
            nome: { required: true, minLength: 2 },
        };
        if (formData.tipo_local === 'interno') {
            rules.fazenda = { required: true };
        }
        else {
            rules.fornecedor = { required: true };
        }
        return rules;
    };
    const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(getRules());
    const createMutation = useApiCreate('/estoque/locais-armazenamento/', [['locais-armazenamento']]);
    const updateMutation = useApiUpdate('/estoque/locais-armazenamento/', [['locais-armazenamento']]);
    const { data: fazendas = [], isLoading: loadingFazendas } = useApiQuery(['fazendas'], '/fazendas/');
    const { data: fornecedores = [], isLoading: loadingFornecedores } = useApiQuery(['fornecedores-ativos'], '/comercial/fornecedores/?status=ativo&page_size=500');
    useEffect(() => {
        if (local) {
            setFormData({
                nome: local.nome,
                tipo: local.tipo,
                tipo_local: local.tipo_local || 'interno',
                capacidade_total: local.capacidade_total ?? local.capacidade_maxima,
                unidade_capacidade: local.unidade_capacidade,
                fazenda: local.fazenda ?? undefined,
                fornecedor: local.fornecedor ?? undefined,
                ativo: local.ativo
            });
            clearErrors();
            setCustomErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [local]);
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const processed = type === 'number' ? (value === '' ? undefined : Number(value)) : value;
        setFormData(prev => ({ ...prev, [name]: processed }));
        validateSingle(name, processed);
    };
    const handleTipoLocalChange = (newTipoLocal) => {
        setFormData(prev => ({
            ...prev,
            tipo_local: newTipoLocal,
            fazenda: newTipoLocal === 'interno' ? prev.fazenda : undefined,
            fornecedor: newTipoLocal === 'externo' ? prev.fornecedor : undefined,
        }));
        clearErrors();
        setCustomErrors({});
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate(formData)) {
            return;
        }
        try {
            const payload = { ...formData };
            // Ensure opposite FK is null
            if (payload.tipo_local === 'interno') {
                payload.fornecedor = null;
            }
            else {
                payload.fazenda = null;
            }
            if (local) {
                await updateMutation.mutateAsync({ id: local.id, ...payload });
            }
            else {
                await createMutation.mutateAsync(payload);
            }
            onSuccess();
        }
        catch (error) {
            console.error('Erro ao salvar local de armazenagem:', error);
            if (error.response?.data) {
                const fieldErrors = {};
                Object.keys(error.response.data).forEach(k => {
                    fieldErrors[k] = Array.isArray(error.response.data[k]) ? error.response.data[k].join('\n') : String(error.response.data[k]);
                });
                setCustomErrors(fieldErrors);
            }
        }
    };
    if (loadingFazendas || loadingFornecedores) {
        return (_jsx("div", { className: "d-flex justify-content-center py-4", children: _jsx(LoadingSpinner, {}) }));
    }
    const isInterno = formData.tipo_local === 'interno';
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-signpost-split me-2" }), "Local Interno / Externo ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("div", { className: "btn-group w-100", role: "group", children: [_jsxs("button", { type: "button", className: `btn ${isInterno ? 'btn-primary' : 'btn-outline-primary'}`, onClick: () => handleTipoLocalChange('interno'), children: [_jsx("i", { className: "bi bi-house-door me-2" }), "Interno (Pr\u00F3prio)"] }), _jsxs("button", { type: "button", className: `btn ${!isInterno ? 'btn-primary' : 'btn-outline-primary'}`, onClick: () => handleTipoLocalChange('externo'), children: [_jsx("i", { className: "bi bi-truck me-2" }), "Externo (Terceiros)"] })] }), _jsx("small", { className: "text-muted d-block mt-1", children: isInterno
                                ? 'Local dentro de uma fazenda própria (silo, armazém, galpão, etc.)'
                                : 'Local de um fornecedor ou terceiro (armazém terceirizado, revenda, etc.)' })] }), _jsx("div", { className: "col-12", children: isInterno ? (_jsxs(_Fragment, { children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Fazenda ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.fazenda ? String(formData.fazenda) : '', onChange: (v) => setFormData(prev => ({ ...prev, fazenda: Number(v) })), options: (fazendas || []).map((f) => ({ value: String(f.id), label: f.name })), placeholder: "Selecione uma fazenda", error: getFieldError('fazenda') || customErrors.fazenda })] })) : (_jsxs(_Fragment, { children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Fornecedor ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.fornecedor ? String(formData.fornecedor) : '', onChange: (v) => setFormData(prev => ({ ...prev, fornecedor: Number(v) })), options: (fornecedores || []).map((f) => ({ value: String(f.id), label: `${f.nome} (${f.cpf_cnpj || ''})` })), placeholder: "Selecione um fornecedor", error: getFieldError('fornecedor') || customErrors.fornecedor })] })) }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-building me-2" }), "Nome do Local ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { name: "nome", id: "nome", className: `form-control ${getFieldError('nome') || customErrors.nome ? 'is-invalid' : ''}`, value: formData.nome || '', onChange: handleChange, placeholder: "Ex: Silo 01, Armaz\u00E9m Central, Dep\u00F3sito Revenda..." }), (getFieldError('nome') || customErrors.nome) && (_jsx("div", { className: "invalid-feedback", children: getFieldError('nome') || customErrors.nome }))] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-folder me-2" }), "Tipo"] }), _jsxs("select", { name: "tipo", className: "form-select", value: formData.tipo, onChange: handleChange, children: [_jsx("option", { value: "silo", children: "Silo" }), _jsx("option", { value: "armazem", children: "Armaz\u00E9m" }), _jsx("option", { value: "galpao", children: "Galp\u00E3o" }), _jsx("option", { value: "dep\u00F3sito", children: "Dep\u00F3sito" }), _jsx("option", { value: "almoxerifado", children: "Almoxarifado" }), _jsx("option", { value: "barracao", children: "Barrac\u00E3o" }), _jsx("option", { value: "patio", children: "P\u00E1tio" }), _jsx("option", { value: "posto", children: "Posto de Combust\u00EDvel" }), _jsx("option", { value: "outro", children: "Outro" })] })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-rulers me-2" }), "Unidade de Capacidade"] }), _jsx("select", { name: "unidade_capacidade", value: formData.unidade_capacidade, onChange: handleChange, className: "form-select", children: UNIDADES_CAPACIDADE.map(u => (_jsx("option", { value: u, children: getUnitLabel(u) }, u))) })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-123 me-2" }), "Capacidade M\u00E1xima"] }), _jsx("input", { type: "number", step: "0.01", min: "0", name: "capacidade_total", className: "form-control", value: formData.capacidade_total ?? '', onChange: handleChange })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check form-switch", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "ativo", name: "ativo", checked: !!formData.ativo, onChange: (e) => setFormData(prev => ({ ...prev, ativo: e.target.checked })) }), _jsx("label", { className: "form-check-label", htmlFor: "ativo", children: "Ativo" })] }) }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-2", children: [_jsxs("button", { type: "button", className: "btn btn-secondary", onClick: () => onSuccess(), children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-primary", children: [_jsx("i", { className: "bi bi-save me-2" }), local ? 'Atualizar' : 'Cadastrar'] })] }) })] }) }));
};
export default LocalArmazenagemForm;
