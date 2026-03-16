import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const ErrorMessage = ({ message, className = '' }) => {
    if (!message)
        return null;
    return (_jsx("div", { className: `text-red-600 text-sm mt-1 ${className}`, children: message }));
};
export default ErrorMessage;
