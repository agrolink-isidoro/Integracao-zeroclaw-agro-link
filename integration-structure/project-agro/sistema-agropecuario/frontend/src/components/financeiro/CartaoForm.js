import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useApiCreate, useApiUpdate, useApiQuery } from '@/hooks/useApi';
const BANDEIRA_OPTIONS = [
    { value: '01', label: 'Visa' },
    { value: '02', label: 'Mastercard' },
    { value: '03', label: 'American Express' },
    { value: '04', label: 'Sorocred' },
    { value: '05', label: 'Diners Club' },
    { value: '06', label: 'Elo' },
    { value: '07', label: 'Hipercard' },
    { value: '08', label: 'Aura' },
    { value: '09', label: 'Cabal' },
    { value: '99', label: 'Outros' },
];
const CartaoForm = ({ initialData, onClose, onSaved }) => {
    const [bandeiraCodigo, setBandeiraCodigo] = React.useState(initialData?.bandeira_codigo || '');
    const [bandeira, setBandeira] = React.useState(initialData?.bandeira || '');
    const [numero, setNumero] = React.useState(initialData?.numero_masked || '');
    const [conta, setConta] = React.useState(initialData?.conta || null);
    const [agencia, setAgencia] = React.useState(initialData?.agencia || '');
    const [validade, setValidade] = React.useState(initialData?.validade || '');
    const [diaVencimento, setDiaVencimento] = React.useState(initialData?.dia_vencimento_fatura || '');
    const { data: contas = [] } = useApiQuery(['contas-bancarias'], '/financeiro/contas/');
    const create = useApiCreate('/financeiro/cartoes/', [['cartoes']]);
    const update = useApiUpdate('/financeiro/cartoes/', [['cartoes']]);
    // Auto-set bandeira name when codigo changes
    React.useEffect(() => {
        if (bandeiraCodigo) {
            const opt = BANDEIRA_OPTIONS.find(o => o.value === bandeiraCodigo);
            if (opt)
                setBandeira(opt.label);
        }
    }, [bandeiraCodigo]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic frontend validation
        if (!numero || numero.length < 4) {
            alert('Informe um número de cartão válido (últimos 4 dígitos)');
            return;
        }
        const last4 = String(numero).slice(-4);
        if (last4.length !== 4 || !/^[0-9]{4}$/.test(last4)) {
            alert('Os últimos 4 caracteres do cartão devem ser números');
            return;
        }
        const payload = {
            bandeira,
            bandeira_codigo: bandeiraCodigo || null,
            numero_masked: numero,
            numero_last4: last4,
            conta,
            agencia,
            validade,
            dia_vencimento_fatura: diaVencimento ? Number(diaVencimento) : null
        };
        try {
            if (initialData?.id) {
                await update.mutateAsync({ id: initialData.id, data: payload });
            }
            else {
                await create.mutateAsync(payload);
            }
            onSaved && onSaved();
        }
        catch (err) {
            console.error('Erro salvando cartão', err);
            alert('Falha ao salvar cartão');
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-credit-card me-2" }), "Bandeira (c\u00F3digo NFe)"] }), _jsxs("select", { className: "form-select", value: bandeiraCodigo, onChange: (e) => setBandeiraCodigo(e.target.value), children: [_jsx("option", { value: "", children: "Selecione..." }), BANDEIRA_OPTIONS.map(o => _jsxs("option", { value: o.value, children: [o.value, " - ", o.label] }, o.value))] }), _jsx("small", { className: "text-muted", children: "C\u00F3digo usado na NFe para identificar automaticamente o cart\u00E3o" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-credit-card me-2" }), "Bandeira (nome)"] }), _jsx("input", { className: "form-control", value: bandeira, onChange: (e) => setBandeira(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-credit-card me-2" }), "N\u00FAmero (mascarado)"] }), _jsx("input", { className: "form-control", value: numero, onChange: (e) => setNumero(e.target.value), placeholder: "**** **** **** 1234" })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Conta Banc\u00E1ria" }), _jsxs("select", { className: "form-select", value: conta || '', onChange: (e) => setConta(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "Nenhuma" }), contas.map((c) => _jsxs("option", { value: c.id, children: [c.banco, " - ", c.conta] }, c.id))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Ag\u00EAncia" }), _jsx("input", { className: "form-control", value: agencia, onChange: (e) => setAgencia(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Validade" }), _jsx("input", { className: "form-control", value: validade, onChange: (e) => setValidade(e.target.value), placeholder: "MM/AAAA" })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-check me-2" }), "Dia do Vencimento da Fatura"] }), _jsx("input", { type: "number", min: "1", max: "31", className: "form-control", value: diaVencimento, onChange: (e) => setDiaVencimento(e.target.value), placeholder: "Ex: 10" }), _jsx("small", { className: "text-muted", children: "Dia do m\u00EAs em que a fatura do cart\u00E3o vence (1-31)" })] }), _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-end gap-2", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Salvar" })] })] }));
};
export default CartaoForm;
