import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import financeiroService from '@/services/financeiro';
import Tooltip from '@/components/common/Tooltip';
const MarkAsPaidModal = ({ show, id, valorDefault = 0, onClose, onSuccess }) => {
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
    const [valorPago, setValorPago] = useState(valorDefault != null ? String(valorDefault) : '0.00');
    const normalizeAndSetValorPago = (v) => { setValorPago(v.replace(/,/g, '.')); };
    const [reconciliar, setReconciliar] = useState(false);
    const [loading, setLoading] = useState(false);
    if (!show || !id)
        return null;
    const handleConfirm = async () => {
        setLoading(true);
        try {
            const payload = { data_pagamento: dataPagamento, valor_pago: Number(String(valorPago).replace(',', '.')) };
            if (reconciliar)
                payload.reconciliar = true;
            await financeiroService.quitarVencimento(id, payload);
            onSuccess && onSuccess();
            onClose();
        }
        catch (e) {
            console.error('Erro ao marcar como pago', e);
            alert('Falha ao marcar como pago: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Marcar como pago" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data de pagamento" }), _jsx("input", { type: "date", className: "form-control", value: dataPagamento, onChange: (e) => setDataPagamento(e.target.value) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Valor pago" }), _jsx("input", { className: "form-control", value: valorPago, onChange: (e) => setValorPago(e.target.value), onBlur: (e) => normalizeAndSetValorPago(e.target.value) }), _jsx("div", { className: "form-text", children: "Use ponto (.) como separador decimal (ex: 123.45)" })] }), _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: reconciliar, onChange: (e) => setReconciliar(e.target.checked), id: "mark-reconciliar" }), _jsx("label", { className: "form-check-label", htmlFor: "mark-reconciliar", children: "Reconciliar agora" }), _jsx(Tooltip, { ariaLabel: "reconciliar-tooltip", text: "Marca o lançamento como reconciliado imediatamente (define reconciled = true e registra reconciled_at). Use quando o pagamento já consta no extrato bancário.", className: "ms-2" }), _jsx("div", { className: "form-text", children: "Marcar o lan\u00E7amento como reconciliado imediatamente (vinculado a extrato banc\u00E1rio)" })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: onClose, disabled: loading, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleConfirm, disabled: loading, children: loading ? 'Processando...' : 'Confirmar' })] })] }) }) }));
};
export default MarkAsPaidModal;
