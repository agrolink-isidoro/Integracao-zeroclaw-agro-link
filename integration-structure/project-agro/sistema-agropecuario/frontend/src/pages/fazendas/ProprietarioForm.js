import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useFormValidation, cpfCnpjValidation, emailValidation, phoneValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate } from '../../hooks/useApi';
import ErrorMessage from '../../components/common/ErrorMessage';
const ProprietarioForm = ({ proprietario, onSuccess }) => {
    const [formData, setFormData] = useState({
        nome: '',
        cpf_cnpj: '',
        telefone: '',
        email: '',
        endereco: ''
    });
    const [backendErrors, setBackendErrors] = useState({});
    const validationRules = {
        nome: { required: true, minLength: 2, maxLength: 200 },
        cpf_cnpj: {
            required: true,
            custom: cpfCnpjValidation
        },
        telefone: { custom: phoneValidation },
        email: { custom: emailValidation },
        endereco: { maxLength: 500 }
    };
    const { validate, validateSingle, getFieldError, clearErrors, setFieldTouched } = useFormValidation(validationRules);
    // Mutations
    const createMutation = useApiCreate('/proprietarios/', [['proprietarios']]);
    const updateMutation = useApiUpdate('/proprietarios/', [['proprietarios']]);
    useEffect(() => {
        if (proprietario) {
            setFormData({
                nome: proprietario.nome,
                cpf_cnpj: proprietario.cpf_cnpj,
                telefone: proprietario.telefone || '',
                email: proprietario.email || '',
                endereco: proprietario.endereco || ''
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proprietario]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
    };
    const handleBlur = (name) => {
        setFieldTouched(name);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Marcar todos os campos como touched antes de validar
        Object.keys(validationRules).forEach(field => {
            setFieldTouched(field);
        });
        if (!validate(formData)) {
            return;
        }
        setBackendErrors({});
        try {
            if (proprietario) {
                await updateMutation.mutateAsync({ id: proprietario.id, ...formData });
            }
            else {
                await createMutation.mutateAsync(formData);
            }
            onSuccess();
        }
        catch (error) {
            console.error('Erro ao salvar proprietário:', error);
            const err = error;
            // Capturar erros do backend e exibir
            if (err.response?.data) {
                const errors = {};
                Object.entries(err.response.data).forEach(([key, value]) => {
                    errors[key] = Array.isArray(value) ? value[0] : value;
                });
                setBackendErrors(errors);
            }
        }
    };
    const isLoading = createMutation.isPending || updateMutation.isPending;
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-body p-3 p-md-4", children: [Object.keys(backendErrors).length > 0 && (_jsxs("div", { className: "alert alert-danger mb-3", children: [_jsxs("h6", { className: "alert-heading mb-2", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Erro ao salvar:"] }), _jsx("ul", { className: "mb-0", children: Object.entries(backendErrors).map(([field, message]) => (_jsxs("li", { children: [_jsxs("strong", { children: [field === 'cpf_cnpj' ? 'CPF/CNPJ' : field, ":"] }), " ", message] }, field))) })] })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "nome", className: "form-label", children: [_jsx("i", { className: "bi bi-person me-2" }), "Nome *"] }), _jsx("input", { type: "text", id: "nome", name: "nome", value: formData.nome, onChange: handleInputChange, onBlur: () => handleBlur('nome'), className: `form-control ${getFieldError('nome') ? 'is-invalid' : ''}`, placeholder: "Nome completo" }), _jsx(ErrorMessage, { message: getFieldError('nome') })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "cpf_cnpj", className: "form-label", children: [_jsx("i", { className: "bi bi-card-text me-2" }), "CPF/CNPJ *"] }), _jsx("input", { type: "text", id: "cpf_cnpj", name: "cpf_cnpj", value: formData.cpf_cnpj, onChange: handleInputChange, onBlur: () => handleBlur('cpf_cnpj'), className: `form-control ${getFieldError('cpf_cnpj') ? 'is-invalid' : ''}`, placeholder: "000.000.000-00 ou 00.000.000/0000-00" }), _jsx(ErrorMessage, { message: getFieldError('cpf_cnpj') })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "telefone", className: "form-label", children: [_jsx("i", { className: "bi bi-telephone me-2" }), "Telefone"] }), _jsx("input", { type: "text", id: "telefone", name: "telefone", value: formData.telefone, onChange: handleInputChange, onBlur: () => handleBlur('telefone'), className: `form-control ${getFieldError('telefone') ? 'is-invalid' : ''}`, placeholder: "(00) 00000-0000" }), _jsx(ErrorMessage, { message: getFieldError('telefone') })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "email", className: "form-label", children: [_jsx("i", { className: "bi bi-envelope me-2" }), "Email"] }), _jsx("input", { type: "email", id: "email", name: "email", value: formData.email, onChange: handleInputChange, onBlur: () => handleBlur('email'), className: `form-control ${getFieldError('email') ? 'is-invalid' : ''}`, placeholder: "email@exemplo.com" }), _jsx(ErrorMessage, { message: getFieldError('email') })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "endereco", className: "form-label", children: [_jsx("i", { className: "bi bi-pin-map me-2" }), "Endere\u00E7o"] }), _jsx("textarea", { id: "endereco", name: "endereco", value: formData.endereco, onChange: handleInputChange, onBlur: () => handleBlur('endereco'), rows: 3, className: `form-control ${getFieldError('endereco') ? 'is-invalid' : ''}`, placeholder: "Endere\u00E7o completo" }), _jsx(ErrorMessage, { message: getFieldError('endereco') })] })] })] }), _jsx("div", { className: "card-footer bg-transparent border-top pt-3", children: _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", onClick: onSuccess, className: "btn btn-secondary", disabled: isLoading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", disabled: isLoading, className: "btn btn-success", children: [isLoading && (_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" })), _jsx("i", { className: "bi bi-check-circle me-2" }), proprietario ? 'Atualizar' : 'Criar', " Propriet\u00E1rio"] })] }) })] }) }));
};
export default ProprietarioForm;
