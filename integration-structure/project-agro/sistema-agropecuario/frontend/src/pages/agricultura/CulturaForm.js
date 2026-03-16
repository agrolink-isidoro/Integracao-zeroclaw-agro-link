import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useApiCreate, useApiUpdate } from '../../hooks/useApi';
import { TIPO_CULTURA_CHOICES, UNIDADE_PRODUCAO_CHOICES } from '../../types/agricultura';
const CulturaForm = ({ cultura, onSuccess }) => {
    const [formData, setFormData] = useState({
        nome: '',
        tipo: 'graos',
        descricao: '',
        ciclo_dias: '',
        zoneamento_apto: true,
        ativo: true,
        unidade_producao: 'tonelada',
        variedades: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Mutations
    const createMutation = useApiCreate('/agricultura/culturas/', [['culturas']]);
    const updateMutation = useApiUpdate('/agricultura/culturas/', [['culturas']]);
    // Initialize form data when editing
    useEffect(() => {
        if (cultura) {
            setFormData({
                nome: cultura.nome,
                tipo: cultura.tipo,
                descricao: cultura.descricao || '',
                ciclo_dias: cultura.ciclo_dias?.toString() || '',
                zoneamento_apto: cultura.zoneamento_apto,
                ativo: cultura.ativo,
                unidade_producao: cultura.unidade_producao || 'tonelada',
                variedades: cultura.variedades || '',
            });
        }
    }, [cultura]);
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = e.target.checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.nome.trim()) {
            newErrors.nome = 'Nome é obrigatório';
        }
        else if (formData.nome.length < 2) {
            newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
        }
        else if (formData.nome.length > 100) {
            newErrors.nome = 'Nome deve ter no máximo 100 caracteres';
        }
        if (!formData.tipo) {
            newErrors.tipo = 'Tipo é obrigatório';
        }
        if (formData.ciclo_dias) {
            const ciclo = parseInt(formData.ciclo_dias);
            if (isNaN(ciclo) || ciclo < 1 || ciclo > 3650) {
                newErrors.ciclo_dias = 'Ciclo deve ser entre 1 e 3650 dias';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setIsSubmitting(true);
        const submitData = {
            ...formData,
            ciclo_dias: formData.ciclo_dias ? parseInt(formData.ciclo_dias) : null,
            descricao: formData.descricao || null,
            variedades: formData.variedades || null,
        };
        try {
            if (cultura?.id) {
                await updateMutation.mutateAsync({
                    id: cultura.id,
                    ...submitData,
                });
            }
            else {
                await createMutation.mutateAsync(submitData);
            }
            onSuccess();
        }
        catch (error) {
            const err = error;
            if (err.response?.data) {
                const apiErrors = {};
                Object.entries(err.response.data).forEach(([key, value]) => {
                    apiErrors[key] = Array.isArray(value) ? value[0] : value;
                });
                setErrors(apiErrors);
            }
            else {
                setErrors({ submit: 'Erro ao salvar cultura. Tente novamente.' });
            }
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "needs-validation", noValidate: true, children: [errors.submit && (_jsxs("div", { className: "alert alert-danger", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), errors.submit] })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "nome", className: "form-label", children: [_jsx("i", { className: "bi bi-flower1 me-2" }), "Nome da Cultura ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: `form-control ${errors.nome ? 'is-invalid' : ''}`, id: "nome", name: "nome", value: formData.nome, onChange: handleInputChange, placeholder: "Ex: Soja, Milho, Trigo...", maxLength: 100, required: true }), errors.nome && _jsx("div", { className: "invalid-feedback", children: errors.nome })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "tipo", className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Tipo ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { className: `form-select ${errors.tipo ? 'is-invalid' : ''}`, id: "tipo", name: "tipo", value: formData.tipo, onChange: handleInputChange, required: true, children: TIPO_CULTURA_CHOICES.map(choice => (_jsx("option", { value: choice.value, children: choice.label }, choice.value))) }), errors.tipo && _jsx("div", { className: "invalid-feedback", children: errors.tipo })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "ciclo_dias", className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Ciclo (dias) ", _jsx("small", { className: "text-muted", children: "(opcional)" })] }), _jsx("input", { type: "number", className: `form-control ${errors.ciclo_dias ? 'is-invalid' : ''}`, id: "ciclo_dias", name: "ciclo_dias", value: formData.ciclo_dias, onChange: handleInputChange, placeholder: "Ex: 120", min: "1", max: "3650" }), errors.ciclo_dias && _jsx("div", { className: "invalid-feedback", children: errors.ciclo_dias }), _jsx("small", { className: "form-text text-muted", children: "N\u00FAmero de dias at\u00E9 a colheita" })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "descricao", className: "form-label", children: [_jsx("i", { className: "bi bi-text-paragraph me-2" }), "Descri\u00E7\u00E3o ", _jsx("small", { className: "text-muted", children: "(opcional)" })] }), _jsx("textarea", { className: `form-control ${errors.descricao ? 'is-invalid' : ''}`, id: "descricao", name: "descricao", value: formData.descricao, onChange: handleInputChange, rows: 3, placeholder: "Informa\u00E7\u00F5es adicionais sobre a cultura..." }), errors.descricao && _jsx("div", { className: "invalid-feedback", children: errors.descricao })] }), _jsxs("div", { className: "col-12", children: [_jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: "zoneamento_apto", name: "zoneamento_apto", checked: formData.zoneamento_apto, onChange: handleInputChange }), _jsxs("label", { className: "form-check-label", htmlFor: "zoneamento_apto", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), "Zoneamento Agr\u00EDcola Apto"] })] }), _jsx("small", { className: "form-text text-muted d-block mb-3", children: "Indica se a cultura \u00E9 apta para o zoneamento agr\u00EDcola da regi\u00E3o" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "unidade_producao", className: "form-label", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Unidade de Produ\u00E7\u00E3o ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { className: "form-select", id: "unidade_producao", name: "unidade_producao", value: formData.unidade_producao, onChange: handleInputChange, children: UNIDADE_PRODUCAO_CHOICES.map(choice => (_jsx("option", { value: choice.value, children: choice.label }, choice.value))) }), _jsx("small", { className: "form-text text-muted", children: "Usado para exibir a produtividade no painel (sacas, toneladas...)" })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "variedades", className: "form-label", children: [_jsx("i", { className: "bi bi-diagram-2 me-2" }), "Variedades ", _jsx("small", { className: "text-muted", children: "(opcional)" })] }), _jsx("input", { type: "text", className: "form-control", id: "variedades", name: "variedades", value: formData.variedades, onChange: handleInputChange, placeholder: "Ex: M6210, B2801, Nidera 5909" }), _jsx("small", { className: "form-text text-muted", children: "Variedades cultivadas, separadas por v\u00EDrgula" })] }), _jsxs("div", { className: "col-12", children: [_jsxs("div", { className: "form-check", children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: "ativo", name: "ativo", checked: formData.ativo, onChange: handleInputChange }), _jsxs("label", { className: "form-check-label", htmlFor: "ativo", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Cultura Ativa"] })] }), _jsx("small", { className: "form-text text-muted", children: "Apenas culturas ativas ficam dispon\u00EDveis para novos plantios" })] })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 gap-md-3 mt-4 pt-3 border-top", children: [_jsxs("button", { type: "button", className: "btn btn-secondary", onClick: onSuccess, disabled: isSubmitting, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsx("button", { type: "submit", className: "btn btn-success", disabled: isSubmitting, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), cultura ? 'Atualizar' : 'Salvar', " Cultura"] })) })] })] }));
};
export default CulturaForm;
