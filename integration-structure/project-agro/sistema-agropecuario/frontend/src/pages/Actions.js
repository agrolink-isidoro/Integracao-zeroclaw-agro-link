import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import ActionsPanel from '../components/actions/ActionsPanel';
import FileUploadHandler from '../components/actions/FileUploadHandler';
import { useActions } from '../contexts/ActionsContext';
const Actions = () => {
    const [activeTab, setActiveTab] = useState('fila');
    const { pendingActions } = useActions();
    const pendingCount = pendingActions.length;
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsx("div", { className: "d-flex align-items-center justify-content-between mb-4", children: _jsxs("div", { children: [_jsxs("h4", { className: "mb-1 d-flex align-items-center gap-2", children: [_jsx("i", { className: "bi bi-robot text-success" }), "Isidoro \u2014 Fila de A\u00E7\u00F5es IA"] }), _jsx("p", { className: "text-muted small mb-0", children: "Revise, edite e aprove as a\u00E7\u00F5es geradas pelo assistente Isidoro antes de aplic\u00E1-las ao sistema." })] }) }), _jsxs("ul", { className: "nav nav-tabs mb-4", children: [_jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${activeTab === 'fila' ? 'active' : ''}`, onClick: () => setActiveTab('fila'), children: [_jsx("i", { className: "bi bi-list-check me-1" }), "Fila de A\u00E7\u00F5es", pendingCount > 0 && (_jsx("span", { className: "badge bg-warning text-dark ms-1", children: pendingCount }))] }) }), _jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${activeTab === 'upload' ? 'active' : ''}`, onClick: () => setActiveTab('upload'), children: [_jsx("i", { className: "bi bi-cloud-upload me-1" }), "Upload de Arquivo"] }) })] }), activeTab === 'fila' && _jsx(ActionsPanel, {}), activeTab === 'upload' && (_jsx("div", { className: "row justify-content-center", children: _jsx("div", { className: "col-xl-9", children: _jsx(FileUploadHandler, {}) }) }))] }));
};
export default Actions;
