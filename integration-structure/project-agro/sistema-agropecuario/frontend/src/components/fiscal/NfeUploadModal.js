import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Alert, Box, Typography, Stepper, Step, StepLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Divider, } from '@mui/material';
import UploadZone from './UploadZone';
import { uploadXml, previewXml } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';
import { getStoredTokens } from '../../hooks/useAuth';
const STEPS = ['Selecionar XML', 'Revisar Dados', 'Confirmar'];
const formatCurrency = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n))
        return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
const NfeUploadModal = ({ open, onClose, onSuccess, initialFiles = [], }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [nfeFile, setNfeFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [validationErrors, setValidationErrors] = useState([]);
    const { showSuccess, showError } = useToast();
    // Process initial files from drag-and-drop
    React.useEffect(() => {
        if (initialFiles.length > 0 && open) {
            const file = initialFiles[0];
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            if (ext === '.xml') {
                setNfeFile(file);
                setErrors({});
                setValidationErrors([]);
            }
        }
    }, [initialFiles, open]);
    const handleNfeFilesSelect = (files) => {
        if (files.length > 0) {
            setNfeFile(files[0]);
            setErrors((prev) => ({ ...prev, nfe: '' }));
            // Reset preview when new file selected
            setPreview(null);
            setActiveStep(0);
        }
    };
    /* Step 1 → Step 2: preview XML */
    const handlePreview = useCallback(async () => {
        if (!nfeFile) {
            setErrors((prev) => ({ ...prev, nfe: 'Selecione um arquivo XML' }));
            return;
        }
        const form = new FormData();
        form.append('xml_file', nfeFile);
        try {
            setLoading(true);
            setErrors({});
            const resp = await previewXml(form);
            const data = resp.data;
            if (data.error) {
                setErrors({ nfe: data.error });
                showError(data.error);
                return;
            }
            if (data.already_imported) {
                setErrors({ nfe: 'Esta NF-e já foi importada anteriormente.' });
                showError('NF-e já importada.');
                return;
            }
            setPreview(data);
            setActiveStep(1);
        }
        catch (err) {
            const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Erro ao analisar XML';
            setErrors({ nfe: msg });
            showError(msg);
        }
        finally {
            setLoading(false);
        }
    }, [nfeFile, showError]);
    /* Step 2 → Step 3: confirm */
    const handleGoConfirm = () => setActiveStep(2);
    /* Step 3: upload definitivo */
    const handleConfirm = useCallback(async () => {
        if (!nfeFile)
            return;
        const form = new FormData();
        form.append('xml_file', nfeFile);
        try {
            console.debug('[NfeUpload] Preparing upload', { fileName: nfeFile?.name, fileSize: nfeFile?.size });
            try {
                const tokens = getStoredTokens();
                console.debug('[NfeUpload] hasToken:', !!tokens?.access);
            }
            catch (e) { /* ignore */ }
            setLoading(true);
            const resp = await uploadXml(form);
            showSuccess('NF-e processada com sucesso');
            setNfeFile(null);
            setPreview(null);
            setValidationErrors([]);
            setErrors({});
            setActiveStep(0);
            const created = resp?.data;
            onSuccess?.(created);
            onClose();
        }
        catch (err) {
            const data = err?.response?.data;
            const statusCode = err?.response?.status;
            console.error('[NfeUpload] uploadXml error', { status: statusCode, data });
            if (statusCode === 401) {
                setErrors({ nfe: 'Sessão expirada ou não autenticado. Faça login.' });
                showError('Sessão expirada. Por favor entre novamente.');
                if (typeof window !== 'undefined')
                    window.location.href = '/login';
            }
            else if (data?.error === 'validation_error' && Array.isArray(data.bad_fields)) {
                setValidationErrors(data.bad_fields);
                showError('Erro de validação: verifique os campos indicados');
            }
            else if (data?.error) {
                const errMsg = data.error === 'NFe already imported'
                    ? `NF-e já importada (id=${data.nfe_id || '?'})`
                    : (data.detail || data.error || JSON.stringify(data));
                setErrors({ nfe: errMsg });
                showError(errMsg);
            }
            else if (data?.detail) {
                setErrors({ nfe: data.detail });
                showError(data.detail);
            }
            else {
                const raw = JSON.stringify(data || err?.message).slice(0, 300);
                setErrors({ nfe: `Erro ao processar NF-e: ${raw}` });
                showError(`Erro ao processar NF-e`);
            }
        }
        finally {
            setLoading(false);
        }
    }, [nfeFile, showSuccess, showError, onSuccess, onClose]);
    const handleBack = () => {
        if (activeStep > 0)
            setActiveStep((s) => s - 1);
    };
    const handleClose = () => {
        if (!loading) {
            setNfeFile(null);
            setPreview(null);
            setErrors({});
            setValidationErrors([]);
            setActiveStep(0);
            onClose();
        }
    };
    /* Renders */
    const renderStep0 = () => (_jsxs(_Fragment, { children: [errors.nfe && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: errors.nfe })), _jsx(UploadZone, { onFilesSelect: handleNfeFilesSelect, acceptedTypes: ['.xml'], maxSize: 50 * 1024 * 1024 }), nfeFile && (_jsxs(Box, { sx: { mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: '4px' }, children: [_jsx(Typography, { variant: "body2", color: "textSecondary", children: _jsx("strong", { children: "Arquivo selecionado:" }) }), _jsxs(Typography, { variant: "body2", sx: { mt: 0.5 }, children: ["\uD83D\uDCC4 ", nfeFile.name] }), _jsxs(Typography, { variant: "caption", color: "textSecondary", children: [(nfeFile.size / 1024).toFixed(2), " KB"] })] })), validationErrors.length > 0 && (_jsxs(Alert, { severity: "warning", sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: "Erros de valida\u00E7\u00E3o:" }), _jsx("ul", { style: { margin: 0, paddingLeft: '1.2rem' }, children: validationErrors.map((err, idx) => (_jsx("li", { children: _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: err.field }), ": ", err.message] }) }, idx))) })] }))] }));
    const renderStep1 = () => {
        if (!preview)
            return null;
        return (_jsxs(Box, { sx: { maxHeight: '60vh', overflowY: 'auto' }, children: [_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", color: "primary", children: "Chave de acesso" }), _jsx(Typography, { variant: "body2", sx: { wordBreak: 'break-all', fontFamily: 'monospace' }, children: preview.chave_acesso }), _jsxs(Box, { sx: { display: 'flex', gap: 2, mt: 1 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "N\u00BA:" }), " ", preview.numero] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "S\u00E9rie:" }), " ", preview.serie] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Emiss\u00E3o:" }), " ", preview.data_emissao] })] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Nat. Opera\u00E7\u00E3o:" }), " ", preview.natureza_operacao] })] }), _jsx(Divider, { sx: { my: 1 } }), _jsx(Typography, { variant: "subtitle2", color: "primary", gutterBottom: true, children: "Emitente" }), _jsxs(Box, { sx: { mb: 2, pl: 1 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "CNPJ:" }), " ", preview.emitente.cnpj] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Raz\u00E3o Social:" }), " ", preview.emitente.nome] }), preview.emitente.fantasia && (_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Fantasia:" }), " ", preview.emitente.fantasia] })), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "IE:" }), " ", preview.emitente.inscricao_estadual] })] }), _jsx(Typography, { variant: "subtitle2", color: "primary", gutterBottom: true, children: "Destinat\u00E1rio" }), _jsxs(Box, { sx: { mb: 2, pl: 1 }, children: [_jsxs(Typography, { variant: "body2", children: [_jsxs("strong", { children: [preview.destinatario.cnpj ? 'CNPJ' : 'CPF', ":"] }), ' ', preview.destinatario.cnpj || preview.destinatario.cpf] }), _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Nome:" }), " ", preview.destinatario.nome] }), preview.destinatario.email && (_jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Email:" }), " ", preview.destinatario.email] }))] }), _jsx(Divider, { sx: { my: 1 } }), _jsx(Typography, { variant: "subtitle2", color: "primary", gutterBottom: true, children: "Totais" }), _jsx(Box, { sx: { display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }, children: [
                        { label: 'Produtos', val: preview.totais.valor_produtos },
                        { label: 'Nota', val: preview.totais.valor_nota },
                        { label: 'ICMS', val: preview.totais.valor_icms },
                        { label: 'PIS', val: preview.totais.valor_pis },
                        { label: 'COFINS', val: preview.totais.valor_cofins },
                        { label: 'IPI', val: preview.totais.valor_ipi },
                        { label: 'Frete', val: preview.totais.valor_frete },
                        { label: 'Desconto', val: preview.totais.valor_desconto },
                    ].map(({ label, val }) => (_jsx(Chip, { label: `${label}: ${formatCurrency(val)}`, size: "small", variant: "outlined", sx: { fontWeight: 500 } }, label))) }), _jsxs(Typography, { variant: "subtitle2", color: "primary", gutterBottom: true, children: ["Itens (", preview.itens.length, ")"] }), _jsx(TableContainer, { component: Paper, variant: "outlined", sx: { mb: 2, maxHeight: 250 }, children: _jsxs(Table, { size: "small", stickyHeader: true, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "#" }), _jsx(TableCell, { children: "Descri\u00E7\u00E3o" }), _jsx(TableCell, { children: "NCM" }), _jsx(TableCell, { children: "CFOP" }), _jsx(TableCell, { align: "right", children: "Qtde" }), _jsx(TableCell, { align: "right", children: "Vlr Unit." }), _jsx(TableCell, { align: "right", children: "Vlr Total" })] }) }), _jsx(TableBody, { children: preview.itens.map((item, idx) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: item.numero_item }), _jsx(TableCell, { sx: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: item.descricao }), _jsx(TableCell, { children: item.ncm }), _jsx(TableCell, { children: item.cfop }), _jsxs(TableCell, { align: "right", children: [item.quantidade, " ", item.unidade] }), _jsx(TableCell, { align: "right", children: formatCurrency(item.valor_unitario) }), _jsx(TableCell, { align: "right", children: formatCurrency(item.valor_total) })] }, idx))) })] }) }), preview.duplicatas.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "subtitle2", color: "primary", gutterBottom: true, children: ["Duplicatas / Parcelas (", preview.duplicatas.length, ")"] }), _jsx(TableContainer, { component: Paper, variant: "outlined", sx: { mb: 2 }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "N\u00BA" }), _jsx(TableCell, { children: "Vencimento" }), _jsx(TableCell, { align: "right", children: "Valor" })] }) }), _jsx(TableBody, { children: preview.duplicatas.map((dup, idx) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: dup.numero }), _jsx(TableCell, { children: dup.data_vencimento }), _jsx(TableCell, { align: "right", children: formatCurrency(dup.valor) })] }, idx))) })] }) })] })), preview.pagamentos.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "subtitle2", color: "primary", gutterBottom: true, children: ["Formas de Pagamento (", preview.pagamentos.length, ")"] }), _jsx(Box, { sx: { display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }, children: preview.pagamentos.map((pag, idx) => (_jsx(Chip, { label: `${pag.label}: ${formatCurrency(pag.vPag)}`, size: "small", color: "info", variant: "outlined" }, idx))) })] }))] }));
    };
    const renderStep2 = () => (_jsxs(Box, { sx: { textAlign: 'center', py: 3 }, children: [_jsx(Typography, { variant: "h6", gutterBottom: true, children: "Confirmar importa\u00E7\u00E3o?" }), _jsxs(Typography, { variant: "body2", color: "textSecondary", children: ["A NF-e ", _jsx("strong", { children: preview?.numero }), " de", ' ', _jsx("strong", { children: preview?.emitente?.nome }), " ser\u00E1 importada no sistema."] }), _jsxs(Typography, { variant: "body2", color: "textSecondary", sx: { mt: 1 }, children: ["Valor total: ", _jsx("strong", { children: formatCurrency(preview?.totais?.valor_nota || '0') })] }), errors.nfe && (_jsx(Alert, { severity: "error", sx: { mt: 2 }, children: errors.nfe })), validationErrors.length > 0 && (_jsxs(Alert, { severity: "warning", sx: { mt: 2 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: "Erros de valida\u00E7\u00E3o:" }), _jsx("ul", { style: { margin: 0, paddingLeft: '1.2rem' }, children: validationErrors.map((err, idx) => (_jsx("li", { children: _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: err.field }), ": ", err.message] }) }, idx))) })] }))] }));
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "md", fullWidth: true, PaperProps: { sx: { borderRadius: '8px' } }, children: [_jsx(DialogTitle, { sx: { pb: 1 }, children: _jsx(Typography, { variant: "h6", component: "span", children: "Importar XML" }) }), _jsxs(DialogContent, { sx: { pt: 2 }, children: [_jsx(Stepper, { activeStep: activeStep, sx: { mb: 3 }, children: STEPS.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), activeStep === 0 && renderStep0(), activeStep === 1 && renderStep1(), activeStep === 2 && renderStep2()] }), _jsxs(DialogActions, { sx: { p: 2, pt: 1 }, children: [_jsx(Button, { onClick: handleClose, disabled: loading, children: "Cancelar" }), activeStep > 0 && (_jsx(Button, { onClick: handleBack, disabled: loading, children: "Voltar" })), activeStep === 0 && (_jsx(Button, { onClick: handlePreview, variant: "contained", disabled: loading || !nfeFile, startIcon: loading && _jsx(CircularProgress, { size: 20 }), children: loading ? 'Analisando...' : 'Visualizar' })), activeStep === 1 && (_jsx(Button, { onClick: handleGoConfirm, variant: "contained", color: "primary", children: "Prosseguir" })), activeStep === 2 && (_jsx(Button, { onClick: handleConfirm, variant: "contained", color: "success", disabled: loading, startIcon: loading && _jsx(CircularProgress, { size: 20 }), children: loading ? 'Importando...' : 'Confirmar Importação' }))] })] }));
};
export default NfeUploadModal;
