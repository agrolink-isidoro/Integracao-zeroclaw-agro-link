import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const ModuleTabs = ({ tabs }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (to) => {
        // consider exact match or startsWith route
        return location.pathname === to || location.pathname.startsWith(to + '/') || location.pathname.startsWith(to + '?');
    };
    return (_jsx("div", { className: "mb-3", children: tabs.map((t) => (_jsxs("button", { className: isActive(t.to) ? 'btn btn-sm btn-primary me-2' : 'btn btn-sm btn-outline-secondary me-2', onClick: () => navigate(t.to), "aria-current": isActive(t.to) ? 'page' : undefined, children: [t.icon ? _jsx("i", { className: `${t.icon} me-1` }) : null, t.label] }, t.id))) }));
};
export default ModuleTabs;
