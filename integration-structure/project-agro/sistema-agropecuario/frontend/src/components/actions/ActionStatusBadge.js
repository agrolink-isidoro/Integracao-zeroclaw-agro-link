import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { ACTION_STATUS_LABELS, ACTION_STATUS_COLORS } from '../../services/actions';
const ActionStatusBadge = ({ status, className = '' }) => {
    const color = ACTION_STATUS_COLORS[status] ?? 'secondary';
    const label = ACTION_STATUS_LABELS[status] ?? status;
    return (_jsx("span", { className: `badge bg-${color} ${className}`, children: label }));
};
export default ActionStatusBadge;
