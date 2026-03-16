import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const Tooltip = ({ text, ariaLabel = 'tooltip', className = '' }) => {
    return (_jsx("span", { "aria-label": ariaLabel, className: `tooltip-styled ${className}`, "data-tooltip": text, style: { cursor: 'help' }, children: "\u2139\uFE0F" }));
};
export default Tooltip;
