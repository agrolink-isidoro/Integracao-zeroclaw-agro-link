import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
const ConfirmDialog = ({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, type = 'danger' }) => {
    if (!isOpen)
        return null;
    const typeClasses = {
        danger: 'btn-danger',
        warning: 'btn-warning',
        info: 'btn-info'
    };
    return (_jsx(_Fragment, { children: _jsx("div", { className: "modal fade show d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: title }), _jsx("button", { type: "button", className: "btn-close", onClick: onCancel })] }), _jsx("div", { className: "modal-body", children: _jsx("p", { children: message }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onCancel, children: cancelText }), _jsx("button", { type: "button", className: `btn ${typeClasses[type]}`, onClick: onConfirm, children: confirmText })] })] }) }) }) }));
};
export default ConfirmDialog;
