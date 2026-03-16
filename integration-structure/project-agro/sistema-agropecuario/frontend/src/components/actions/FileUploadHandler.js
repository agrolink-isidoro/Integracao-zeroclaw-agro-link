import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { uploadFile, getUploadStatus, listPendingActions, MODULE_ACCEPT_FORMATS, MODULE_MAX_SIZE, } from '../../services/actions';
import BulkActionModal from './BulkActionModal';
const UPLOAD_MODULES = [
    {
        value: 'agricultura',
        label: 'Agricultura',
        icon: 'bi-tree',
        description: 'XLSX, CSV, Markdown — operações e colheitas',
    },
    {
        value: 'maquinas',
        label: 'Máquinas',
        icon: 'bi-truck',
        description: 'XLSX, CSV, PDF, DOCX — manutenção e abastecimento',
    },
    {
        value: 'estoque',
        label: 'Estoque',
        icon: 'bi-box-seam',
        description: 'XML NF-e, PDF, XLSX, CSV — entradas e saídas',
    },
    {
        value: 'fazendas',
        label: 'Fazendas',
        icon: 'bi-map',
        description: 'KML, KMZ, GeoJSON, GPX, SHP — talhões e áreas',
    },
];
const FileUploadHandler = () => {
    const queryClient = useQueryClient();
    const [selectedModule, setSelectedModule] = useState('estoque');
    const [uploadState, setUploadState] = useState({ phase: 'idle' });
    const [isDragOver, setIsDragOver] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const fileInputRef = useRef(null);
    // Poll upload status while parsing
    const parsingUploadId = uploadState.phase === 'parsing' ? uploadState.uploadId : null;
    const { data: polledUpload } = useQuery({
        queryKey: ['upload-status', parsingUploadId],
        queryFn: () => getUploadStatus(parsingUploadId),
        enabled: parsingUploadId !== null,
        refetchInterval: 2500,
    });
    useEffect(() => {
        if (!polledUpload)
            return;
        const { status } = polledUpload;
        if (status === 'completed' || status === 'drafts_created') {
            // Fetch all pending actions (newly created ones are in here)
            listPendingActions()
                .then((actions) => {
                setUploadState({ phase: 'done', upload: polledUpload, actions });
                setShowBulkModal(true);
                queryClient.invalidateQueries({ queryKey: ['actions'] });
            })
                .catch(() => {
                setUploadState({ phase: 'done', upload: polledUpload, actions: [] });
                setShowBulkModal(true);
            });
        }
        else if (status === 'failed' || status === 'error') {
            setUploadState({
                phase: 'error',
                message: polledUpload.mensagem_erro ?? 'Falha ao processar arquivo.',
            });
        }
        // While still processing (uploaded/processing/parsed) do nothing — keep polling
    }, [polledUpload, queryClient]);
    const processFile = useCallback(async (file) => {
        const maxMb = MODULE_MAX_SIZE[selectedModule] ?? 10;
        if (file.size > maxMb * 1024 * 1024) {
            toast.error(`Arquivo muito grande. Máximo: ${maxMb} MB.`);
            return;
        }
        setUploadState({ phase: 'uploading', progress: 0 });
        try {
            const uploaded = await uploadFile(file, selectedModule, (pct) => {
                setUploadState({ phase: 'uploading', progress: pct });
            });
            setUploadState({ phase: 'parsing', uploadId: uploaded.id });
        }
        catch (err) {
            const msg = err?.response?.data?.detail ?? err?.message ?? 'Erro ao enviar arquivo.';
            setUploadState({ phase: 'error', message: msg });
            toast.error(msg);
        }
    }, [selectedModule]);
    const handleFileInput = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file)
            processFile(file);
    }, [processFile]);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file)
            processFile(file);
    }, [processFile]);
    const handleReset = () => {
        setUploadState({ phase: 'idle' });
        setShowBulkModal(false);
        setResetKey((k) => k + 1);
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    };
    const acceptRef = MODULE_ACCEPT_FORMATS[selectedModule] ?? '.xlsx,.csv,.pdf';
    const moduleInfo = UPLOAD_MODULES.find((m) => m.value === selectedModule);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-header bg-white border-bottom d-flex align-items-center gap-2", children: [_jsx("i", { className: "bi bi-cloud-upload text-primary fs-5" }), _jsx("h6", { className: "mb-0 fw-semibold", children: "Upload de Arquivo \u2014 Isidoro IA" })] }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "form-label fw-medium small mb-2", children: "M\u00F3dulo de destino" }), _jsx("div", { className: "row g-2", children: UPLOAD_MODULES.map((mod) => (_jsx("div", { className: "col-sm-6 col-lg-3", children: _jsx("div", { role: "button", tabIndex: 0, className: `card h-100 border-2 cursor-pointer ${selectedModule === mod.value
                                                    ? 'border-primary bg-primary bg-opacity-10'
                                                    : 'border-light'}`, style: { cursor: 'pointer' }, onClick: () => {
                                                    setSelectedModule(mod.value);
                                                    handleReset();
                                                }, onKeyDown: (e) => e.key === 'Enter' && setSelectedModule(mod.value), children: _jsxs("div", { className: "card-body p-2 text-center", children: [_jsx("i", { className: `bi ${mod.icon} fs-4 ${selectedModule === mod.value ? 'text-primary' : 'text-muted'}` }), _jsx("p", { className: "small fw-medium mb-0 mt-1", children: mod.label }), _jsx("p", { className: "text-muted", style: { fontSize: '0.7rem' }, children: mod.description })] }) }) }, mod.value))) })] }), uploadState.phase === 'idle' && (_jsxs("div", { className: `border border-2 border-dashed rounded p-4 text-center ${isDragOver ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`, style: { cursor: 'pointer' }, onDragOver: (e) => { e.preventDefault(); setIsDragOver(true); }, onDragLeave: () => setIsDragOver(false), onDrop: handleDrop, onClick: () => fileInputRef.current?.click(), children: [_jsx("i", { className: "bi bi-file-earmark-arrow-up fs-1 text-muted d-block mb-2" }), _jsxs("p", { className: "fw-medium mb-1", children: ["Arraste e solte ou", ' ', _jsx("span", { className: "text-primary text-decoration-underline", children: "clique para selecionar" })] }), _jsxs("p", { className: "text-muted small mb-0", children: [acceptRef, " \u00B7 M\u00E1x ", MODULE_MAX_SIZE[selectedModule] ?? 10, " MB"] }), _jsx("input", { ref: fileInputRef, type: "file", accept: acceptRef, className: "d-none", onChange: handleFileInput }, resetKey)] })), uploadState.phase === 'uploading' && (_jsxs("div", { className: "py-3", children: [_jsxs("p", { className: "small text-muted mb-2", children: [_jsx("i", { className: "bi bi-cloud-upload me-1" }), "Enviando arquivo\u2026"] }), _jsx("div", { className: "progress", children: _jsx("div", { className: "progress-bar progress-bar-striped progress-bar-animated", style: { width: `${uploadState.progress}%` }, role: "progressbar" }) }), _jsxs("small", { className: "text-muted", children: [uploadState.progress, "%"] })] })), uploadState.phase === 'parsing' && (_jsxs("div", { className: "text-center py-4", children: [_jsx("div", { className: "spinner-border text-primary mb-2", role: "status" }), _jsx("p", { className: "text-muted small mb-0", children: "Isidoro est\u00E1 lendo o arquivo e criando rascunhos\u2026" })] })), uploadState.phase === 'done' && (_jsxs("div", { className: "alert alert-success d-flex align-items-center justify-content-between", children: [_jsxs("div", { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), _jsxs("strong", { children: [uploadState.actions.length, " rascunho(s) criado(s)."] }), ' ', "Revise e aprove na fila de a\u00E7\u00F5es."] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-sm btn-success", onClick: () => setShowBulkModal(true), children: [_jsx("i", { className: "bi bi-list-check me-1" }), "Revisar"] }), _jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: handleReset, children: "Novo upload" })] })] })), uploadState.phase === 'error' && (_jsxs("div", { className: "alert alert-danger d-flex align-items-center justify-content-between", children: [_jsxs("div", { children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), uploadState.message] }), _jsx("button", { className: "btn btn-sm btn-outline-danger", onClick: handleReset, children: "Tentar novamente" })] }))] }), moduleInfo && uploadState.phase === 'idle' && (_jsxs("div", { className: "card-footer bg-light border-0 small text-muted py-2 px-3", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), _jsxs("strong", { children: [moduleInfo.label, ":"] }), " ", moduleInfo.description] }))] }), showBulkModal && uploadState.phase === 'done' && (_jsx(BulkActionModal, { title: `Revisar rascunhos — ${moduleInfo?.label ?? selectedModule}`, actions: uploadState.actions, onClose: () => setShowBulkModal(false), onDone: () => {
                    setShowBulkModal(false);
                    handleReset();
                } }))] }));
};
export default FileUploadHandler;
