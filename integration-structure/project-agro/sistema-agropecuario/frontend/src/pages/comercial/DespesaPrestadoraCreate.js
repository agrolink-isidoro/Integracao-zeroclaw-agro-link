import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import SelectFK from '@/components/common/SelectFK';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
import { useApiQuery } from '@/hooks/useApi';
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
    empresa: yup.number().required('Empresa é obrigatória'),
    prestador: yup.number().nullable(),
    data: yup.string().required('Data é obrigatória'),
    categoria: yup.string().required('Categoria é obrigatória'),
    valor: yup.number().required('Valor é obrigatório').moreThan(0, 'Valor deve ser maior que zero')
});
const DespesaPrestadoraCreate = ({ onSuccess, onCancel }) => {
    const location = useLocation();
    const q = new URLSearchParams(location.search);
    const empresaPrefill = q.get('empresa') ? Number(q.get('empresa')) : undefined;
    const { control, handleSubmit, setValue } = useForm({ resolver: makeResolver(schema), defaultValues: { empresa: empresaPrefill || undefined, prestador: undefined, data: new Date().toISOString().slice(0, 10), categoria: '', valor: '', centro_custo: undefined, descricao: '' } });
    const { data: centros = [] } = useApiQuery(['centros-custo'], '/administrativo/centros-custo/');
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    useEffect(() => {
        if (empresaPrefill)
            setValue('empresa', empresaPrefill);
    }, [empresaPrefill, setValue]);
    const mutation = useMutation({
        mutationFn: (payload) => ComercialService.createDespesaPrestadora(payload),
        onSuccess: (data) => {
            // refresh company expenses and navigate to company detail if possible
            const d = data;
            queryClient.invalidateQueries({ queryKey: ['empresa', d.empresa] });
            if (onSuccess)
                onSuccess(data);
            else
                navigate(`/comercial/empresas/${String(d.empresa)}`);
        }
    });
    const loading = mutation.status === 'pending';
    const onSubmit = async (data) => {
        try {
            const d = data;
            await mutation.mutateAsync({ empresa: Number(d.empresa), prestador: d.prestador == null ? null : Number(d.prestador), data: String(d.data || ''), categoria: String(d.categoria || ''), valor: Number(d.valor || 0), centro_custo: d.centro_custo == null ? null : Number(d.centro_custo), descricao: String(d.descricao || '') });
        }
        catch (e) {
            console.error('Erro ao criar despesa prestadora', e);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [!onCancel && (_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h2", { children: "Nova Despesa (Prestadora)" }) })), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body p-3 p-md-4", children: _jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "row g-2 g-md-3", children: [_jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "empresa", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Empresa" }), _jsx(SelectFK, { endpoint: "/comercial/empresas/", value: field.value, onChange: (v) => field.onChange(Number(v)), placeholder: "Selecione uma empresa", error: fieldState.error?.message })] })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "prestador", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Prestador" }), _jsx(SelectFK, { endpoint: "/comercial/prestadores-servico/", value: field.value, onChange: (v) => field.onChange(Number(v)), placeholder: "Selecione um prestador (opcional)" })] })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "data", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Data", type: "date", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "categoria", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Categoria", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-sm-6 col-md-4", children: _jsx(Controller, { name: "valor", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Valor", type: "number", step: "0.01", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-12 col-md-6", children: _jsx(Controller, { name: "centro_custo", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Centro de Custo" }), _jsxs("select", { className: "form-select", value: String(field.value ?? ''), onChange: (e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value)), children: [_jsx("option", { value: "", children: "-- selecione --" }), centros.map(c => _jsxs("option", { value: c.id, children: [c.codigo, " - ", c.nome] }, c.id))] })] })) }) }), _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "descricao", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Descri\u00E7\u00E3o" }), _jsx("textarea", { ...field, rows: 3, className: "form-control" })] })) }) })] }), _jsxs("div", { className: "mt-3", children: [_jsx(Button, { type: "submit", className: "btn btn-primary", disabled: loading, children: "Salvar Despesa" }), onCancel && (_jsx("button", { type: "button", className: "btn btn-outline-secondary ms-2", onClick: onCancel, children: "Cancelar" }))] })] }) }) })] }));
};
export default DespesaPrestadoraCreate;
