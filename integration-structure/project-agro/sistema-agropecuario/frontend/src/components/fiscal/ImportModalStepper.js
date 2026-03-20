import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Stepper, Step, StepLabel, Button, Stack, TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Alert, CircularProgress, Paper, Typography, MenuItem, Select, InputLabel, } from '@mui/material';
import { useToast } from '@/hooks/useToast';
import { importNFeRemote, listCentroCusto } from '@/services/fiscal';
const STEPS = ['Preview', 'Centro de Custo', 'Forma de Pagamento', 'Confirmar'];
// Função auxiliar para formatar valor monetário com segurança
const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    // Converter para número
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    // Verificar se é número válido
    if (isNaN(numValue)) {
        return '0.00';
    }
    return numValue.toFixed(2);
};
/**
 * ImportModalStepper Component
 * Multi-step wizard for importing remote NFes
 * Steps:
 * 1. Preview XML metadata
 * 2. Select centro_custo
 * 3. Choose forma_pagamento + conditional fields
 * 4. Confirm & submit
 */
export const ImportModalStepper = ({ nfeRemote, open, onSuccess, onClose, }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [centroCustoOptions, setCentroCustoOptions] = useState([]);
    const { showSuccess, showError } = useToast();
    const [formData, setFormData] = useState({
        centro_custo_id: null,
        forma_pagamento: 'boleto',
        vencimento: '',
        valor: nfeRemote.valor || undefined,
        observacao: '',
    });
    // Load centro_custo options on mount
    React.useEffect(() => {
        if (open && centroCustoOptions.length === 0) {
            loadCentroCustos();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const loadCentroCustos = async () => {
        try {
            const response = await listCentroCusto();
            setCentroCustoOptions(response.data.results || []);
        }
        catch (err) {
            console.error('Failed to load centro_custo:', err);
        }
    };
    const handleNext = () => {
        // Validate current step before moving
        if (activeStep === 1 && !formData.centro_custo_id) {
            setError('Por favor, selecione um centro de custo');
            return;
        }
        setError(null);
        setActiveStep((prev) => prev + 1);
    };
    const handleBack = () => {
        setError(null);
        setActiveStep((prev) => prev - 1);
    };
    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };
    const validateAndSubmit = async () => {
        // Validate forma_pagamento rules
        if (formData.forma_pagamento === 'boleto') {
            if (!formData.vencimento) {
                setError('Vencimento é obrigatório para boleto');
                return;
            }
            if (formData.valor === undefined || formData.valor <= 0) {
                setError('Valor é obrigatório e deve ser maior que zero');
                return;
            }
        }
        setLoading(true);
        setError(null);
        try {
            const payload = {
                centro_custo_id: formData.centro_custo_id,
                import_metadata: {
                    forma_pagamento: formData.forma_pagamento,
                    ...(formData.forma_pagamento === 'boleto' && {
                        vencimento: formData.vencimento,
                        valor: formData.valor,
                    }),
                    ...(formData.forma_pagamento === 'outra' && {
                        observacao: formData.observacao,
                    }),
                },
            };
            const response = await importNFeRemote(nfeRemote.id, payload);
            showSuccess('NFe importada com sucesso');
            onSuccess(response.data);
            onClose();
        }
        catch (err) {
            const errorMsg = err?.response?.data?.detail ||
                err?.response?.data?.error ||
                'Erro ao importar NFe';
            setError(errorMsg);
            showError(errorMsg);
        }
        finally {
            setLoading(false);
        }
    };
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                // Preview
                return (_jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { variant: "h6", children: "Informa\u00E7\u00F5es da NFe" }), _jsx(Paper, { sx: { p: 2, bgcolor: 'background.default' }, children: _jsxs(Stack, { spacing: 2, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Chave de Acesso" }), _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace' }, children: nfeRemote.chave_acesso })] }), nfeRemote.emitente_nome && (_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Emitente" }), _jsx(Typography, { variant: "body2", children: nfeRemote.emitente_nome })] })), nfeRemote.valor && (_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Valor" }), _jsxs(Typography, { variant: "body2", children: ["R$ ", formatCurrency(nfeRemote.valor)] })] })), nfeRemote.received_at && (_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Data de Recebimento" }), _jsx(Typography, { variant: "body2", children: new Date(nfeRemote.received_at).toLocaleString('pt-BR') })] }))] }) }), _jsx(Alert, { severity: "info", children: "Voc\u00EA est\u00E1 importando uma NFe distribu\u00EDda pela SEFAZ. Esta opera\u00E7\u00E3o criar\u00E1 uma NFe local e a vincular\u00E1 aos registros de compra." })] }));
            case 1:
                // Centro de Custo
                return (_jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { variant: "h6", children: "Centro de Custo" }), _jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { children: "Centro de Custo" }), _jsxs(Select, { value: formData.centro_custo_id || '', label: "Centro de Custo", onChange: (e) => handleFormChange('centro_custo_id', e.target.value || null), children: [_jsx(MenuItem, { value: "", children: _jsx("em", { children: "Selecione..." }) }), centroCustoOptions.map((cc) => (_jsx(MenuItem, { value: cc.id, children: cc.nome || `Centro ${cc.id}` }, cc.id)))] })] }), _jsx(Alert, { severity: "info", children: "O centro de custo selecionado ser\u00E1 usado para registrar a entrada da NFe." })] }));
            case 2:
                // Forma de Pagamento
                return (_jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { variant: "h6", children: "Forma de Pagamento" }), _jsxs(FormControl, { component: "fieldset", children: [_jsx(FormLabel, { component: "legend", children: "Selecione a forma de pagamento" }), _jsxs(RadioGroup, { value: formData.forma_pagamento, onChange: (e) => handleFormChange('forma_pagamento', e.target.value), children: [_jsx(FormControlLabel, { value: "boleto", control: _jsx(Radio, {}), label: "Boleto" }), _jsx(FormControlLabel, { value: "avista", control: _jsx(Radio, {}), label: "\u00C0 Vista" }), _jsx(FormControlLabel, { value: "cartao", control: _jsx(Radio, {}), label: "Cart\u00E3o" }), _jsx(FormControlLabel, { value: "outra", control: _jsx(Radio, {}), label: "Outra" })] })] }), formData.forma_pagamento === 'boleto' && (_jsxs(Stack, { spacing: 1, children: [_jsx(TextField, { label: "Vencimento", type: "date", value: formData.vencimento || '', onChange: (e) => handleFormChange('vencimento', e.target.value), InputLabelProps: { shrink: true }, required: true }), _jsx(TextField, { label: "Valor", type: "number", value: formData.valor || '', onChange: (e) => handleFormChange('valor', parseFloat(e.target.value)), inputProps: { step: '0.01' }, required: true })] })), formData.forma_pagamento === 'outra' && (_jsx(TextField, { label: "Observa\u00E7\u00E3o", multiline: true, rows: 3, value: formData.observacao || '', onChange: (e) => handleFormChange('observacao', e.target.value), placeholder: "Descreva a forma de pagamento customizada..." })), error && _jsx(Alert, { severity: "error", children: error })] }));
            case 3:
                // Confirm
                return (_jsxs(Stack, { spacing: 2, children: [_jsx(Typography, { variant: "h6", children: "Confirmar Importa\u00E7\u00E3o" }), _jsx(Paper, { sx: { p: 2, bgcolor: 'background.default' }, children: _jsxs(Stack, { spacing: 1, children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Chave:" }), " ", nfeRemote.chave_acesso] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Centro de Custo:" }), ' ', centroCustoOptions.find((cc) => cc.id === formData.centro_custo_id)
                                                ?.nome || 'N/A'] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Forma de Pagamento:" }), ' ', formData.forma_pagamento === 'boleto' && 'Boleto', formData.forma_pagamento === 'avista' && 'À Vista', formData.forma_pagamento === 'cartao' && 'Cartão', formData.forma_pagamento === 'outra' && 'Outra'] }), formData.forma_pagamento === 'boleto' && (_jsxs(_Fragment, { children: [_jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Vencimento:" }), " ", formData.vencimento] }), _jsxs(Typography, { variant: "body2", color: "text.secondary", children: [_jsx("strong", { children: "Valor:" }), " R$ ", formatCurrency(formData.valor)] })] }))] }) }), _jsx(Alert, { severity: "info", children: "Clique em \"Importar\" para concluir o processo. Uma NFe local ser\u00E1 criada vinculada aos dados acima." }), error && _jsx(Alert, { severity: "error", children: error })] }));
            default:
                return null;
        }
    };
    return (_jsxs(Dialog, { open: open, onClose: onClose, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Importar NFe Remota" }), _jsxs(DialogContent, { sx: { pt: 2 }, children: [_jsx(Stepper, { activeStep: activeStep, sx: { mb: 3 }, children: STEPS.map((label) => (_jsx(Step, { children: _jsx(StepLabel, { children: label }) }, label))) }), _jsx(Box, { children: renderStepContent() })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, disabled: loading, children: "Cancelar" }), activeStep > 0 && (_jsx(Button, { onClick: handleBack, disabled: loading, children: "Voltar" })), activeStep < STEPS.length - 1 && (_jsx(Button, { onClick: handleNext, variant: "contained", disabled: loading, children: "Pr\u00F3ximo" })), activeStep === STEPS.length - 1 && (_jsx(Button, { onClick: validateAndSubmit, variant: "contained", disabled: loading, startIcon: loading ? _jsx(CircularProgress, { size: 20 }) : undefined, children: loading ? 'Importando...' : 'Importar' }))] })] }));
};
export default ImportModalStepper;
