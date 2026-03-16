import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import SelectDropdown from '../../components/common/SelectDropdown';
import ErrorMessage from '../../components/common/ErrorMessage';
const FazendaForm = ({ fazenda, onSuccess }) => {
    const [formData, setFormData] = useState({
        proprietario: 0,
        name: '',
        matricula: ''
    });
    const validationRules = {
        proprietario: {
            required: true,
            custom: (value) => {
                if (!value || value === 0 || value === '0') {
                    return 'Proprietário é obrigatório';
                }
                return null;
            }
        },
        name: { required: true, minLength: 2, maxLength: 200 },
        matricula: { required: true, minLength: 1, maxLength: 100 }
    };
    const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(validationRules);
    // Query proprietários
    const { data: proprietarios = [], isLoading: loadingProprietarios } = useApiQuery(['proprietarios'], '/proprietarios/');
    // Mutations
    const createMutation = useApiCreate('/fazendas/', [['fazendas']]);
    const updateMutation = useApiUpdate('/fazendas/', [['fazendas']]);
    useEffect(() => {
        if (fazenda) {
            setFormData({
                proprietario: fazenda.proprietario || 0,
                name: fazenda.name,
                matricula: fazenda.matricula
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fazenda]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
    };
    const handleProprietarioChange = (value) => {
        setFormData(prev => ({ ...prev, proprietario: Number(value) }));
        validateSingle('proprietario', value);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate(formData)) {
            return;
        }
        try {
            if (fazenda) {
                await updateMutation.mutateAsync({ id: fazenda.id, ...formData });
            }
            else {
                await createMutation.mutateAsync(formData);
            }
            onSuccess();
        }
        catch (error) {
            console.error('Erro ao salvar fazenda:', error);
            const err = error;
            // Handle specific errors (e.g., duplicate matricula)
            if (err.response?.data?.matricula) {
                // Error will be handled by the validation system
            }
        }
    };
    const proprietarioOptions = proprietarios.map(prop => ({
        value: prop.id,
        label: `${prop.nome} (${prop.cpf_cnpj})`
    }));
    const isLoading = createMutation.isPending || updateMutation.isPending;
    // Get all errors
    const allErrors = [
        getFieldError('proprietario'),
        getFieldError('name'),
        getFieldError('matricula')
    ].filter(Boolean);
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-body p-3 p-md-4", children: [allErrors.length > 0 && (_jsxs("div", { className: "alert alert-danger mb-3", children: [_jsxs("h6", { className: "alert-heading", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Erros de valida\u00E7\u00E3o:"] }), _jsx("ul", { className: "mb-0", children: allErrors.map((error, idx) => (_jsx("li", { children: error }, idx))) })] })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Propriet\u00E1rio *"] }), _jsx(SelectDropdown, { options: proprietarioOptions, value: formData.proprietario || '', onChange: handleProprietarioChange, placeholder: "Selecione o propriet\u00E1rio", loading: loadingProprietarios, error: getFieldError('proprietario'), allowCreate: true, onCreate: async (nome) => {
                                                // TODO: Implementar criação rápida de proprietário
                                                console.log('Criar proprietário:', nome);
                                            } }), _jsx(ErrorMessage, { message: getFieldError('proprietario') })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "name", className: "form-label", children: [_jsx("i", { className: "bi bi-house-door me-2" }), "Nome da Fazenda *"] }), _jsx("input", { type: "text", id: "name", name: "name", value: formData.name, onChange: handleInputChange, className: `form-control ${getFieldError('name') ? 'is-invalid' : ''}`, placeholder: "Nome da fazenda" }), _jsx(ErrorMessage, { message: getFieldError('name') })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "matricula", className: "form-label", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Matr\u00EDcula/Registro *"] }), _jsx("input", { type: "text", id: "matricula", name: "matricula", value: formData.matricula, onChange: handleInputChange, className: `form-control ${getFieldError('matricula') ? 'is-invalid' : ''}`, placeholder: "N\u00FAmero da matr\u00EDcula ou registro" }), _jsx(ErrorMessage, { message: getFieldError('matricula') })] })] })] }), _jsx("div", { className: "card-footer bg-transparent border-top pt-3", children: _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", onClick: onSuccess, className: "btn btn-secondary", disabled: isLoading, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", disabled: isLoading, className: "btn btn-success", children: [isLoading && (_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" })), _jsx("i", { className: "bi bi-check-circle me-2" }), fazenda ? 'Atualizar' : 'Criar', " Fazenda"] })] }) })] }) }));
};
export default FazendaForm;
