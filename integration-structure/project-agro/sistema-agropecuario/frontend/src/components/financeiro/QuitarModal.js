import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import Tooltip from '@/components/common/Tooltip';
const QuitarModal = ({ show, onClose, vencimentoId, onSuccess }) => {
    const [valor, setValor] = useState('');
    // normalize commas to dots on blur for convenience
    const normalizeAndSetValor = (v) => { setValor(v.replace(/,/g, '.')); };
    const [conta, setConta] = useState('');
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
    const [reconciliar, setReconciliar] = useState(false);
    const { data: contas = [], refetch } = useApiQuery(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!show) {
            setValor('');
            setConta('');
            setReconciliar(false);
            setDataPagamento(new Date().toISOString().slice(0, 10));
        }
        else {
            // When modal opens, ensure we have the freshest list of contas (useful for tests that create conta via API)
            try {
                refetch();
            }
            catch (err) { /* ignore */ }
        }
    }, [show, refetch]);
    if (!show || !vencimentoId)
        return null;
    async function handleSubmit(e) {
        e.preventDefault();
        console.log('[QuitarModal] submit', { vencimentoId, valor, conta, reconciliar });
        setSubmitting(true);
        try {
            const payload = {};
            if (valor)
                payload.valor_pago = Number(valor);
            if (conta)
                payload.conta_id = Number(conta);
            if (dataPagamento)
                payload.data_pagamento = dataPagamento;
            if (reconciliar)
                payload.reconciliar = true;
            await financeiroService.quitarVencimento(vencimentoId, payload);
            onSuccess && onSuccess();
            onClose();
        }
        catch (err) {
            console.error(err);
            alert('Erro ao quitar vencimento: ' + (err.response?.data?.detail || err.message));
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Quitar Vencimento" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onClose })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "valor_pago", children: "Valor pago (opcional)" }), _jsx("input", { id: "valor_pago", className: "form-control", type: "text", inputMode: "decimal", value: valor, onChange: (e) => setValor(e.target.value), onBlur: (e) => normalizeAndSetValor(e.target.value) }), _jsx("div", { className: "form-text", children: "Deixe vazio para quitar o valor total." })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Conta Banc\u00E1ria" }), _jsxs("select", { className: "form-select", value: String(conta), onChange: (e) => setConta(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "-- selecione --" }), contas.map(c => _jsxs("option", { value: c.id, children: [c.banco, " - ", c.conta] }, c.id))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data de pagamento" }), _jsx("input", { className: "form-control", type: "date", value: dataPagamento, onChange: (e) => setDataPagamento(e.target.value) })] }), _jsxs("div", { className: "form-check mb-3", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: reconciliar, onChange: (e) => setReconciliar(e.target.checked), id: "reconciliar" }), _jsx("label", { className: "form-check-label", htmlFor: "reconciliar", children: "Reconciliar agora" }), _jsx(Tooltip, { ariaLabel: "reconciliar-tooltip", text: "Marca o lançamento como reconciliado imediatamente (define reconciled = true e registra reconciled_at). Use quando o pagamento já consta no extrato bancário.", className: "ms-2" })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", type: "button", onClick: onClose, disabled: submitting, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: !contas.length || submitting, children: submitting ? 'Processando...' : 'Quitar' })] })] })] }) }) }));
};
export default QuitarModal;
