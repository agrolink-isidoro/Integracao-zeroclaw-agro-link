import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const Input = ({ label, error, className = '', ...props }) => {
    // If value is undefined, make it a controlled input with empty string to avoid
    // React warning about uncontrolled -> controlled transitioning.
    const { value, defaultValue, type } = props;
    const finalProps = { ...props };
    if (type !== 'file') {
        if (value === undefined && defaultValue === undefined) {
            finalProps.value = '';
        }
    }
    return (_jsxs("div", { className: "mb-3", children: [label && (_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: label })), _jsx("input", { className: `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`, ...finalProps }), error && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: error }))] }));
};
export default Input;
