import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
    // Use Bootstrap button classes to match the app's global styling
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger',
    };
    const sizeClasses = {
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg',
    };
    // Use Bootstrap utility classes for layout so icon/text alignment works without Tailwind
    // Ensure pointer cursor is present and default type is 'button' to avoid accidental form submissions
    const baseClasses = `btn d-inline-flex align-items-center ${variantClasses[variant]} ${sizeClasses[size]} cursor-pointer`.trim();
    const finalProps = { type: 'button', ...props };
    return (_jsx("button", { className: `${baseClasses} ${className}`, ...finalProps }));
};
export default Button;
