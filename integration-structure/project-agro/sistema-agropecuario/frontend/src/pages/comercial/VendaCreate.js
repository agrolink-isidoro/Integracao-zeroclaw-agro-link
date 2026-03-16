import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
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
    data_venda: yup.string().required('Data da venda é obrigatória'),
    quantidade: yup.number().transform((value, originalValue) => originalValue === '' ? undefined : Number(originalValue)).required('Quantidade é obrigatória'),
    preco_unitario: yup.number().transform((value, originalValue) => originalValue === '' ? undefined : Number(originalValue)).required('Preço unitário é obrigatório'),
    cliente: yup.number().transform((value, originalValue) => originalValue === '' ? undefined : Number(originalValue)).required('Cliente é obrigatório'),
    local_armazenamento: yup.number().nullable(),
    produto: yup.number().nullable(),
    numero_nota_fiscal: yup.string(),
    data_emissao_nota: yup.string(),
    status_emissao: yup.string(),
    observacoes: yup.string(),
});
const VendaCreate = ({ onSuccess, onCancel }) => {
    const { control, handleSubmit, setValue, watch, formState } = useForm({
        resolver: makeResolver(schema),
        defaultValues: {
            tipo_operacao: 'venda',
            data_venda: '',
            quantidade: '',
            preco_unitario: '',
            cliente: '',
            local_armazenamento: '',
            produto: '',
            numero_nota_fiscal: '',
            data_emissao_nota: '',
            status_emissao: 'pendente',
            observacoes: ''
        }
    });
    const [clientes, setClientes] = React.useState([]);
    const [locais, setLocais] = React.useState([]);
    const [produtos, setProdutos] = React.useState([]);
    const [unidadeProduto, setUnidadeProduto] = React.useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: (payload) => ComercialService.createVendaCompra(payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vendas-compras'] });
            const d = data;
            if (onSuccess)
                onSuccess(data);
            else
                navigate(`/comercial/vendas/${String(d.id)}`);
        }
    });
    const loading = mutation.status === 'pending';
    const [allProdutos, setAllProdutos] = React.useState([]);
    React.useEffect(() => {
        // load clients, locais e todos os produtos para selectors
        let mounted = true;
        ComercialService.getClientes().then((c) => {
            if (mounted)
                setClientes(c || []);
        }).catch(() => { });
        ComercialService.getLocais().then((l) => {
            if (mounted)
                setLocais(l || []);
        }).catch(() => { });
        ComercialService.getAllProdutos().then((p) => {
            if (mounted) {
                const list = Array.isArray(p) ? p : [];
                setAllProdutos(list);
                setProdutos(list);
            }
        }).catch(() => { });
        return () => { mounted = false; };
    }, []);
    const watchedQtd = watch('quantidade');
    const watchedPreco = watch('preco_unitario');
    const valorTotal = (Number(watchedQtd || 0) * Number(watchedPreco || 0)).toFixed(2);
    const onSubmit = async (data) => {
        try {
            // eslint-disable-next-line no-console
            console.log('VendaCreate onSubmit called', data);
            const d = data;
            const clean = { ...d };
            // Empty string FK fields must be null, not empty string (DRF FK validation)
            ['local_armazenamento', 'produto'].forEach((k) => {
                if (clean[k] === '' || clean[k] === undefined)
                    clean[k] = null;
            });
            // Tributos são calculados no módulo fiscal — não enviar
            delete clean.regime_tributario;
            delete clean.valor_tributos;
            const payload = { ...clean, tipo_operacao: 'venda' };
            await mutation.mutateAsync(payload);
        }
        catch (e) {
            console.error('Erro ao criar venda', e);
        }
    };
    React.useEffect(() => {
        try {
            window.__VendaCreate_onSubmit_attached = true;
        }
        catch (e) { }
        return () => {
            try {
                window.__VendaCreate_onSubmit_attached = false;
            }
            catch (e) { }
        };
    }, []);
    return (_jsxs("div", { className: "container-fluid py-4", children: [!onCancel && (_jsx("div", { className: "d-flex justify-content-between align-items-center mb-3", children: _jsx("h2", { children: "Nova Venda" }) })), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("form", { onSubmit: (e) => {
                            try {
                                console.log('PAGE LOG: VendaCreate DOM onSubmit captured');
                                window.__VendaCreate_dom_submit_fired = true;
                            }
                            catch (err) { }
                            try {
                                // call react-hook-form's handleSubmit which will call our onSubmit
                                const res = handleSubmit(async (data) => {
                                    try {
                                        console.log('PAGE LOG: VendaCreate handleSubmit wrapper invoked');
                                        window.__VendaCreate_handle_submit_invoked = true;
                                        return await onSubmit(data);
                                    }
                                    catch (e) {
                                        console.error('PAGE LOG: VendaCreate onSubmit threw', e);
                                        window.__VendaCreate_last_submit_error = String(e);
                                        throw e;
                                    }
                                })(e);
                                return res;
                            }
                            catch (err) {
                                console.error('PAGE LOG: VendaCreate submit wrapper error', err);
                                window.__VendaCreate_submit_wrapper_error = String(err);
                                throw err;
                            }
                        }, children: [_jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-cart-check me-2" }), "Dados da Venda"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "data_venda", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Data da Venda *", type: "date", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-md-8", children: _jsx(Controller, { name: "cliente", control: control, render: ({ field, fieldState }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Cliente *" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "", children: "Selecione o cliente" }), clientes.map((c) => (_jsx("option", { value: c.id, children: c.nome }, c.id)))] }), fieldState.error && _jsx("small", { className: "text-danger", children: fieldState.error.message })] })) }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Produto e Estoque"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "local_armazenamento", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Local de Armazenamento" }), _jsxs("select", { ...field, className: "form-select", onChange: async (e) => {
                                                                    field.onChange(e);
                                                                    const val = e.target.value;
                                                                    setValue('produto', '');
                                                                    setUnidadeProduto('');
                                                                    if (val) {
                                                                        // Filter from already-loaded products by local, fallback to API
                                                                        const filtered = allProdutos.filter((p) => p.local_armazenamento === Number(val) || String(p.local_armazenamento) === val);
                                                                        if (filtered.length > 0) {
                                                                            setProdutos(filtered);
                                                                        }
                                                                        else {
                                                                            const raw = await ComercialService.getProdutosByLocal(Number(val));
                                                                            const list = Array.isArray(raw) ? raw : (raw?.results ?? []);
                                                                            setProdutos(list.length > 0 ? list : allProdutos);
                                                                        }
                                                                    }
                                                                    else {
                                                                        setProdutos(allProdutos);
                                                                    }
                                                                }, children: [_jsx("option", { value: "", children: "Selecione o local" }), locais.map((l) => (_jsx("option", { value: l.id, children: l.nome }, l.id)))] })] })) }) }), _jsx("div", { className: "col-md-6", children: _jsx(Controller, { name: "produto", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Produto" }), _jsxs("select", { ...field, className: "form-select", onChange: (e) => {
                                                                    field.onChange(e);
                                                                    const found = produtos.find((p) => String(p.id) === e.target.value);
                                                                    setUnidadeProduto(found?.unidade || '');
                                                                }, children: [_jsx("option", { value: "", children: "Selecione o produto" }), produtos.map((p) => (_jsxs("option", { value: p.id, children: [p.nome, p.unidade ? ` (${p.unidade})` : ''] }, p.id)))] })] })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "quantidade", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: `Quantidade${unidadeProduto ? ` (${unidadeProduto})` : ''} *`, type: "number", step: "0.001", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "preco_unitario", control: control, render: ({ field, fieldState }) => (_jsx(Input, { label: "Pre\u00E7o Unit\u00E1rio (R$) *", type: "number", step: "0.01", ...field, error: fieldState.error?.message })) }) }), _jsx("div", { className: "col-md-4", children: _jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Valor Total (R$)" }), _jsx("input", { type: "text", className: "form-control bg-light", readOnly: true, value: `R$ ${valorTotal}` })] }) })] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-receipt me-2" }), "Informa\u00E7\u00F5es Fiscais"] }), _jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "numero_nota_fiscal", control: control, render: ({ field }) => (_jsx(Input, { label: "N\u00FAmero da NF", ...field })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "data_emissao_nota", control: control, render: ({ field }) => (_jsx(Input, { label: "Data de Emiss\u00E3o", type: "date", ...field })) }) }), _jsx("div", { className: "col-md-4", children: _jsx(Controller, { name: "status_emissao", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Status de Emiss\u00E3o" }), _jsxs("select", { ...field, className: "form-select", children: [_jsx("option", { value: "pendente", children: "Pendente" }), _jsx("option", { value: "emitida", children: "Emitida" })] })] })) }) })] }), _jsxs("p", { className: "text-muted small mt-2 mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Regime tribut\u00E1rio e impostos ser\u00E3o calculados durante a emiss\u00E3o da nota pelo m\u00F3dulo fiscal."] })] }), _jsx("hr", { className: "my-4" }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-chat-left-text me-2" }), "Informa\u00E7\u00F5es Adicionais"] }), _jsx("div", { className: "row g-3", children: _jsx("div", { className: "col-12", children: _jsx(Controller, { name: "observacoes", control: control, render: ({ field }) => (_jsxs("div", { children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { ...field, rows: 3, className: "form-control" })] })) }) }) })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2 mt-4", children: [onCancel && (_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onCancel, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Cancelar"] })), _jsxs(Button, { type: "submit", className: "btn btn-primary", disabled: loading, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), loading ? 'Salvando...' : 'Salvar Venda'] })] }), process.env.NODE_ENV === 'development' && (_jsx("pre", { "data-testid": "venda-form-errors", style: { marginTop: 10 }, children: JSON.stringify(formState.errors) }))] }) }) })] }));
};
export default VendaCreate;
