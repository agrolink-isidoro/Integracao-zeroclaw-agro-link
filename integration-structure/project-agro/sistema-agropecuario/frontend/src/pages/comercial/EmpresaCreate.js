import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
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
const schema = yup.object().shape({
    nome: yup.string().required('Nome é obrigatório'),
    cnpj: yup.string().required('CNPJ é obrigatório'),
    contato: yup.string(),
    endereco: yup.string(),
});
const EmpresaCreate = ({ onSuccess, onCancel, initialData }) => {
    const isEditing = !!(initialData?.id);
    const { control, handleSubmit, reset } = useForm({ resolver: makeResolver(schema), defaultValues: { nome: '', cnpj: '', contato: '', endereco: '' } });
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    useEffect(() => {
        if (initialData) {
            reset({
                nome: initialData.nome || '',
                cnpj: initialData.cnpj || '',
                contato: initialData.contato || '',
                endereco: initialData.endereco || '',
            });
        }
    }, [initialData, reset]);
    const mutation = useMutation({
        mutationFn: (payload) => {
            const p = payload;
            if (isEditing)
                return ComercialService.updateEmpresa(initialData.id, p);
            return ComercialService.createEmpresa(p);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['empresas'] });
            const d = data;
            if (onSuccess) {
                onSuccess(data);
            }
            else {
                navigate(`/comercial/empresas/${String(d.id)}`);
            }
        }
    });
    const loading = mutation.status === 'pending';
    const onSubmit = async (data) => {
        try {
            const d = data;
            await mutation.mutateAsync({ nome: String(d.nome || ''), cnpj: String(d.cnpj || ''), contato: String(d.contato || ''), endereco: String(d.endereco || '') });
        }
        catch (e) {
            console.error('Erro ao salvar empresa', e);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [!onCancel && (_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h2", { children: "Nova Empresa / Prestadora" }) })), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body p-3 p-md-4", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [!onCancel && (_jsx("h2", { className: "mb-3", children: isEditing ? 'Editar Empresa' : 'Nova Empresa / Prestadora' })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "nome", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Nome", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "cnpj", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "CNPJ", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "contato", control: control, render: ({ field }) => (_jsx(Input, { label: "Contato", ...field })) }) }), _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "endereco", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Endere\u00E7o" }), _jsx("textarea", { ...field, rows: 3, className: "form-control" })] })) }) })] }), _jsxs("div", { className: "mt-3", children: [_jsx(Button, { type: "submit", className: "btn btn-primary", disabled: loading, children: isEditing ? 'Atualizar Empresa' : 'Salvar Empresa' }), onCancel && (_jsx("button", { type: "button", className: "btn btn-outline-secondary ms-2", onClick: onCancel, children: "Cancelar" }))] })] }) }) })] }));
};
export default EmpresaCreate;
