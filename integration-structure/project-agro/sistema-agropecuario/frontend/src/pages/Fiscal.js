import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import NfeList from '../components/fiscal/NfeList';
import NfeListImpostos from '../components/fiscal/NfeListImpostos';
import FiscalDashboard from '../components/fiscal/FiscalDashboard';
import CertificadosList from '../components/fiscal/CertificadosList';
import NfeUploadModal from '../components/fiscal/NfeUploadModal';
import { useDragDrop } from '../hooks/useDragDrop';
import { Button } from '@mui/material';
const Fiscal = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [draggedFiles, setDraggedFiles] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [importedNfeForEdit, setImportedNfeForEdit] = useState(null);
    const { isDragging } = useDragDrop({
        onFilesDragged: (files) => {
            setDraggedFiles(files);
            setUploadModalOpen(true);
        },
        acceptedTypes: ['.xml'],
    });
    const handleRefreshData = () => {
        setRefreshKey((prev) => prev + 1);
    };
    const menuItems = [
        { id: 'dashboard', label: 'Visão Geral', icon: 'bi bi-speedometer2' },
        { id: 'impostos', label: 'Impostos', icon: 'bi bi-receipt' },
        { id: 'notas-fiscais', label: 'Notas Fiscais', icon: 'bi bi-file-earmark-text' },
        { id: 'baixar-nfes', label: 'Baixar NFes', icon: 'bi bi-cloud-arrow-down' },
        { id: 'certificados', label: 'Certificados', icon: 'bi bi-shield-lock' },
        { id: 'relatorios', label: 'Relatórios', icon: 'bi bi-bar-chart' }
    ];
    const renderDashboard = () => (_jsx(FiscalDashboard, {}, `dashboard-${refreshKey}`));
    const renderImpostos = () => (_jsx(NfeListImpostos, {}, `impostos-${refreshKey}`));
    const renderNotasFiscais = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsx(NfeList, { forceLocal: true, autoOpenEditNfeId: importedNfeForEdit?.id ?? null }, `nfes-${refreshKey}`) }) }));
    const renderBaixarNfes = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsx(NfeList, { forceRemote: true }, `baixar-${refreshKey}`) }) }));
    const renderCertificados = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsx(CertificadosList, {}, `certificados-${refreshKey}`) }) }));
    const renderRelatorios = () => (_jsx("div", { className: "row", children: _jsx("div", { className: "col-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h5", { className: "mb-0", children: "Relat\u00F3rios Fiscais" }) }), _jsx("div", { className: "card-body", children: _jsx("p", { className: "text-muted", children: "M\u00F3dulo de relat\u00F3rios em desenvolvimento..." }) })] }) }) }));
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'impostos':
                return renderImpostos();
            case 'notas-fiscais':
                return renderNotasFiscais();
            case 'baixar-nfes':
                return renderBaixarNfes();
            case 'certificados':
                return renderCertificados();
            case 'relatorios':
                return renderRelatorios();
            default:
                return renderDashboard();
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "h3 mb-0", children: "Fiscal" }), _jsx("p", { className: "text-muted", children: "Controle fiscal e conformidade tribut\u00E1ria" })] }), _jsx("div", { style: { display: 'flex', gap: '0.5rem' }, children: _jsx(Button, { variant: "contained", color: "primary", onClick: () => setUploadModalOpen(true), startIcon: _jsx("i", { className: "bi bi-plus-circle" }), children: "IMPORTAR XML" }) })] }), _jsx("div", { className: "d-flex align-items-center mb-4", style: { overflowX: 'auto' }, children: _jsx("ul", { className: "nav nav-tabs mb-0 flex-nowrap", children: menuItems.map((item) => (_jsx("li", { className: "nav-item", children: _jsxs("button", { className: `nav-link ${activeTab === item.id ? 'active' : ''}`, onClick: () => setActiveTab(item.id), children: [_jsx("i", { className: `${item.icon} me-2` }), item.label] }) }, item.id))) }) }), renderContent(), _jsx(NfeUploadModal, { open: uploadModalOpen, onClose: () => {
                    setUploadModalOpen(false);
                    setDraggedFiles([]);
                }, onSuccess: (createdNfe) => {
                    handleRefreshData();
                    if (createdNfe && createdNfe.id) {
                        // Request NFe list to refresh and store id for auto-open by NfeList
                        setImportedNfeForEdit(createdNfe);
                    }
                }, initialFiles: draggedFiles }), isDragging && (_jsx("div", { style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    pointerEvents: 'none',
                }, children: _jsxs("div", { style: {
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    }, children: [_jsx("i", { className: "bi bi-cloud-arrow-down", style: { fontSize: '2rem', color: '#0d6efd', marginBottom: '0.5rem' } }), _jsx("h5", { style: { marginTop: '0.5rem', marginBottom: 0 }, children: "Solte para importar XML" }), _jsx("p", { style: { color: '#6c757d', marginTop: '0.25rem', marginBottom: 0 }, children: "Nota Fiscal Eletr\u00F4nica (.xml)" })] }) }))] }));
};
export default Fiscal;
