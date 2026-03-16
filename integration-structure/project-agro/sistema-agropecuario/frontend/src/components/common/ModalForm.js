import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
const ModalForm = ({ isOpen, title, onClose, children, size = 'md' }) => {
    if (!isOpen)
        return null;
    const sizeClasses = {
        sm: 'modal-sm',
        md: '',
        lg: 'modal-lg',
        xl: 'modal-xl'
    };
    return (_jsx(_Fragment, { children: _jsx("div", { className: "modal show d-block", tabIndex: -1, style: { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }, children: _jsx("div", { className: `modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeClasses[size]}`, children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: title }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose, "aria-label": "Close" })] }), _jsx("div", { className: "modal-body", children: _jsx(ErrorBoundary, { children: children }) })] }) }) }) }));
};
export default ModalForm;
