import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import financeiroService from '@/services/financeiro';
const ChangeVencimentoDateModal = ({ show, id, onClose, onSaved }) => {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [loading, setLoading] = useState(false);
    if (!show || !id)
        return null;
    const handleSave = async () => {
        setLoading(true);
        try {
            await financeiroService.updateVencimento(id, { data_vencimento: date });
            onSaved && onSaved();
            onClose();
        }
        catch (e) {
            console.error('Erro ao alterar data de vencimento', e);
            alert('Falha ao alterar data: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Alterar Data de Vencimento" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onClose })] }), _jsx("div", { className: "modal-body p-3 p-md-4", children: _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Nova data" }), _jsx("input", { type: "date", className: "form-control", value: date, onChange: (e) => setDate(e.target.value) })] }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-secondary", onClick: onClose, disabled: loading, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleSave, disabled: loading, children: loading ? 'Salvando...' : 'Salvar' })] })] }) }) }));
};
export default ChangeVencimentoDateModal;
