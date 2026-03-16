import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: _jsxs("div", { className: "flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0", children: [_jsx("div", { className: "fixed inset-0 transition-opacity", "aria-hidden": "true", children: _jsx("div", { className: "absolute inset-0 bg-gray-500 opacity-75", onClick: onClose }) }), _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-title", className: "inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full", children: [_jsx("div", { className: "bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4", children: _jsx("div", { className: "sm:flex sm:items-start", children: _jsxs("div", { className: "mt-3 text-center sm:mt-0 sm:text-left w-full", children: [_jsx("h3", { className: "text-lg leading-6 font-medium text-gray-900 mb-4", children: title }), _jsx("div", { className: "mt-2", children: children })] }) }) }), footer && (_jsx("div", { className: "bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse", children: footer }))] })] }) }));
};
export default Modal;
