import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
// lightweight resolver to avoid adding @hookform/resolvers dependency in tests
const makeResolver = (schema) => async (values) => {
    try {
        const validated = await schema.validate(values, { abortEarly: false });
        return { values: validated, errors: {} };
    }
    catch (err) {
        const inner = err?.inner || [];
        const errors = inner.reduce((acc, e) => {
            if (e && e.path)
                acc[e.path] = { type: e.type || 'validation', message: e.message || 'Invalid' };
            return acc;
        }, {});
        return { values: {}, errors };
    }
};
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import SelectFK from '@/components/common/SelectFK';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
const schema = yup.object().shape({
    fornecedor: yup.number().required('Fornecedor é obrigatório'),
    data: yup.string().required('Data é obrigatória'),
    valor_total: yup.number().required('Valor é obrigatório').moreThan(0, 'Valor deve ser maior que zero'),
    descricao: yup.string(),
});
const CompraCreate = ({ onSuccess, onCancel }) => {
    const { control, handleSubmit } = useForm({ resolver: makeResolver(schema), defaultValues: { fornecedor: undefined, data: '', valor_total: '', descricao: '' } });
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: (payload) => ComercialService.createCompra(payload),
        onSuccess: (data) => {
            // invalidate compras list and navigate to list view
            queryClient.invalidateQueries({ queryKey: ['compras'] });
            if (onSuccess)
                onSuccess(data);
            else
                navigate('/comercial/compras');
        }
    });
    // helper to know loading state across mutation
    const loading = mutation.status === 'pending';
    const onSubmit = async (data) => {
        try {
            const d = data;
            await mutation.mutateAsync({
                fornecedor: Number(d.fornecedor),
                data: String(d.data || ''),
                valor_total: Number(d.valor_total || 0),
                descricao: String(d.descricao || ''),
            });
        }
        catch (e) {
            // show error toast in real app
            console.error('Erro ao criar compra', e);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [!onCancel && (_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h2", { children: "Nova Compra" }) })), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-cart-plus me-2" }), "Dados da Compra"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-8", children: _jsx(Controller, { name: "fornecedor", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Fornecedor *" }), _jsx(SelectFK, { testId: "fornecedor-select", endpoint: "/comercial/fornecedores/", value: field.value, onChange: (v) => field.onChange(Number(v)), placeholder: "Selecione o fornecedor", error: fieldState.error?.message })] })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "data", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Data *", type: "date", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "valor_total", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Valor Total (R$) *", type: "number", step: "0.01", ...field, error: fieldState.error?.message })) }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-chat-left-text me-2" }), "Informa\u00E7\u00F5es Adicionais"] }), _jsx("div", { className: "row g-3", children: _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "descricao", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o" }), _jsx("textarea", { ...field, rows: 3, className: "form-control" })] })) }) }) })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4", children: [onCancel && (_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onCancel, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Cancelar"] })), _jsxs(Button, { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : 'Salvar Compra'] })] })] }) }) })] }));
};
export default CompraCreate;
