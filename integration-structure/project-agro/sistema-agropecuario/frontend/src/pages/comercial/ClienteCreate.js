import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import Input from '@/components/common/Input';
import Button from '@/components/Button';
import ComercialService from '@/services/comercial';
import { validarCPFouCNPJ, mascaraCPFouCNPJ, mascaraTelefone, mascaraCEP } from '@/utils/validators';
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
    tipo_pessoa: yup.string().required('Tipo de pessoa é obrigatório'),
    cpf_cnpj: yup.string()
        .required('CPF/CNPJ é obrigatório')
        .test('cpf-cnpj-valido', 'CPF/CNPJ inválido', (value) => {
        if (!value)
            return false;
        return validarCPFouCNPJ(value);
    }),
    rg_ie: yup.string(),
    inscricao_estadual: yup.string(),
    telefone: yup.string(),
    celular: yup.string(),
    email: yup.string().email('E-mail inválido'),
    cep: yup.string(),
    endereco: yup.string(),
    numero: yup.string(),
    complemento: yup.string(),
    bairro: yup.string(),
    cidade: yup.string(),
    estado: yup.string(),
    status: yup.string(),
    observacoes: yup.string(),
});
const ClienteCreate = ({ onSuccess, onCancel, initialData }) => {
    const { id: routeId } = useParams();
    const id = initialData?.id ? String(initialData.id) : routeId;
    const isEditing = !!id;
    const { control, handleSubmit, watch, reset } = useForm({
        resolver: makeResolver(schema),
        defaultValues: {
            nome: '',
            tipo_pessoa: 'pf',
            cpf_cnpj: '',
            rg_ie: '',
            inscricao_estadual: '',
            telefone: '',
            celular: '',
            email: '',
            cep: '',
            endereco: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            status: 'ativo',
            observacoes: ''
        }
    });
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const tipoPessoa = watch('tipo_pessoa');
    // Load existing data when editing
    React.useEffect(() => {
        if (!isEditing)
            return;
        // If initialData is passed directly, use it (modal mode)
        if (initialData) {
            const safeStr = (v) => (v === null || v === undefined ? '' : String(v));
            reset({
                nome: safeStr(initialData.nome),
                tipo_pessoa: initialData.tipo_pessoa || 'pf',
                cpf_cnpj: safeStr(initialData.cpf_cnpj),
                rg_ie: safeStr(initialData.rg_ie),
                inscricao_estadual: safeStr(initialData.inscricao_estadual),
                telefone: safeStr(initialData.telefone),
                celular: safeStr(initialData.celular),
                email: safeStr(initialData.email),
                cep: safeStr(initialData.cep),
                endereco: safeStr(initialData.endereco),
                numero: safeStr(initialData.numero),
                complemento: safeStr(initialData.complemento),
                bairro: safeStr(initialData.bairro),
                cidade: safeStr(initialData.cidade),
                estado: safeStr(initialData.estado),
                status: initialData.status || 'ativo',
                observacoes: safeStr(initialData.observacoes),
            });
            return;
        }
        // Otherwise fetch from API (route mode)
        ComercialService.getClienteById(Number(id)).then((data) => {
            const safeStr = (v) => (v === null || v === undefined ? '' : String(v));
            reset({
                nome: safeStr(data.nome),
                tipo_pessoa: data.tipo_pessoa || 'pf',
                cpf_cnpj: safeStr(data.cpf_cnpj),
                rg_ie: safeStr(data.rg_ie),
                inscricao_estadual: safeStr(data.inscricao_estadual),
                telefone: safeStr(data.telefone),
                celular: safeStr(data.celular),
                email: safeStr(data.email),
                cep: safeStr(data.cep),
                endereco: safeStr(data.endereco),
                numero: safeStr(data.numero),
                complemento: safeStr(data.complemento),
                bairro: safeStr(data.bairro),
                cidade: safeStr(data.cidade),
                estado: safeStr(data.estado),
                status: data.status || 'ativo',
                observacoes: safeStr(data.observacoes),
            });
        }).catch(console.error);
    }, [id, isEditing, initialData, reset]);
    const mutation = useMutation({
        mutationFn: (payload) => isEditing
            ? ComercialService.updateCliente(Number(id), payload)
            : ComercialService.createCliente(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            const d = data;
            if (onSuccess)
                onSuccess(data);
            else
                navigate(`/comercial/clientes/${String(d.id)}`);
        }
    });
    const loading = mutation.status === 'pending';
    const onSubmit = async (data) => {
        try {
            await mutation.mutateAsync(data);
        }
        catch (e) {
            console.error('Erro ao criar cliente', e);
        }
    };
    const formContent = (_jsxs("form", { onSubmit: handleSubmit(onSubmit), children: [_jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Dados Principais"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "nome", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Nome / Raz\u00E3o Social *", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-md-3", children: _jsx(Controller, { name: "tipo_pessoa", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Tipo de Pessoa *" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "pf", children: "Pessoa F\u00EDsica" }), _jsx("option", { value: "pj", children: "Pessoa Jur\u00EDdica" })] }), fieldState.error && _jsx("small", { className: "text-danger", children: fieldState.error.message })] })) }) }), _jsx("div", { className: "col-md-3", children: _jsx(Controller, { name: "status", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "ativo", children: "Ativo" }), _jsx("option", { value: "inativo", children: "Inativo" }), _jsx("option", { value: "bloqueado", children: "Bloqueado" })] })] })) }) }), _jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "cpf_cnpj", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: tipoPessoa === 'pf' ? 'CPF *' : 'CNPJ *', ...field, onChange: (e) => field.onChange(mascaraCPFouCNPJ(e.target.value)), error: fieldState.error?.message })) }) }), tipoPessoa === 'pf' ? (_jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "rg_ie", control: control, render: ({ field }) => (_jsx(Input, { label: "RG", ...field })) }) })) : (_jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "inscricao_estadual", control: control, render: ({ field }) => (_jsx(Input, { label: "Inscri\u00E7\u00E3o Estadual", ...field })) }) }))] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-telephone me-2" }), "Contato"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "telefone", control: control, render: ({ field }) => (_jsx(Input, { label: "Telefone", ...field, onChange: (e) => field.onChange(mascaraTelefone(e.target.value)) })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "celular", control: control, render: ({ field }) => (_jsx(Input, { label: "Celular", ...field, onChange: (e) => field.onChange(mascaraTelefone(e.target.value)) })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "email", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "E-mail", ...field, error: fieldState.error?.message })) }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Endere\u00E7o"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-3", children: _jsx(Controller, { name: "cep", control: control, render: ({ field }) => (_jsx(Input, { label: "CEP", ...field, onChange: (e) => field.onChange(mascaraCEP(e.target.value)) })) }) }), _jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "endereco", control: control, render: ({ field }) => (_jsx(Input, { label: "Endere\u00E7o", ...field })) }) }), _jsx("div", { className: "col-md-3", children: _jsx(Controller, { name: "numero", control: control, render: ({ field }) => (_jsx(Input, { label: "N\u00FAmero", ...field })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "complemento", control: control, render: ({ field }) => (_jsx(Input, { label: "Complemento", ...field })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "bairro", control: control, render: ({ field }) => (_jsx(Input, { label: "Bairro", ...field })) }) }), _jsx("div", { className: "col-md-3", children: _jsx(Controller, { name: "cidade", control: control, render: ({ field }) => (_jsx(Input, { label: "Cidade", ...field })) }) }), _jsx("div", { className: "col-md-1", children: _jsx(Controller, { name: "estado", control: control, render: ({ field }) => (_jsx(Input, { label: "UF", ...field, maxLength: 2 })) }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-chat-left-text me-2" }), "Informa\u00E7\u00F5es Adicionais"] }), _jsx("div", { className: "row g-3", children: _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "observacoes", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { ...field, rows: 3, className: "form-control" })] })) }) }) })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4", children: [onCancel && (_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onCancel, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Cancelar"] })), _jsxs(Button, { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : isEditing ? 'Atualizar Cliente' : 'Salvar Cliente'] })] })] }));
    // Modal mode: render form directly without container/card wrappers
    if (onCancel) {
        return formContent;
    }
    // Page mode: wrap with container, heading and card
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h2", { children: isEditing ? 'Editar Cliente' : 'Novo Cliente' }) }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: formContent }) })] }));
};
export default ClienteCreate;
