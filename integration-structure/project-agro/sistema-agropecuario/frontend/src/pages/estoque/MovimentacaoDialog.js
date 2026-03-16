import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Alert, Grid, Typography, Autocomplete, } from '@mui/material';
import { SwapHoriz as SwapIcon } from '@mui/icons-material';
import localizacoesService from '../../services/localizacoes';
import produtosService from '../../services/produtos';
const MovimentacaoDialog = ({ open, onClose, onSuccess }) => {
    const [localizacoes, setLocalizacoes] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        produto: 0,
        localizacao_origem: 0,
        localizacao_destino: 0,
        quantidade: 0,
        lote: '',
        observacao: '',
    });
    useEffect(() => {
        if (open) {
            carregarDados();
        }
    }, [open]);
    const carregarDados = async () => {
        try {
            const [locResponse, prodResponse] = await Promise.all([
                localizacoesService.listar({ ativa: true, page_size: 100 }),
                produtosService.listar({ ativo: true, page_size: 100 }),
            ]);
            setLocalizacoes(locResponse.results);
            setProdutos(prodResponse.results);
        }
        catch (err) {
            setError('Erro ao carregar dados');
        }
    };
    const handleSubmit = async () => {
        setError(null);
        // Validações
        if (!formData.produto) {
            setError('Selecione um produto');
            return;
        }
        if (!formData.localizacao_origem) {
            setError('Selecione a localização de origem');
            return;
        }
        if (!formData.localizacao_destino) {
            setError('Selecione a localização de destino');
            return;
        }
        if (formData.localizacao_origem === formData.localizacao_destino) {
            setError('Origem e destino devem ser diferentes');
            return;
        }
        if (!formData.quantidade || formData.quantidade <= 0) {
            setError('Quantidade deve ser maior que zero');
            return;
        }
        setLoading(true);
        try {
            await localizacoesService.movimentarEntreLocalizacoes(formData);
            onSuccess();
            handleClose();
        }
        catch (err) {
            setError(err.response?.data?.message || 'Erro ao realizar movimentação');
        }
        finally {
            setLoading(false);
        }
    };
    const handleClose = () => {
        setFormData({
            produto: 0,
            localizacao_origem: 0,
            localizacao_destino: 0,
            quantidade: 0,
            lote: '',
            observacao: '',
        });
        setError(null);
        onClose();
    };
    const produtoSelecionado = produtos.find(p => p.id === formData.produto);
    return (_jsxs(Dialog, { open: open, onClose: handleClose, maxWidth: "md", fullWidth: true, children: [_jsx(DialogTitle, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SwapIcon, {}), "Movimentar Entre Localiza\u00E7\u00F5es"] }) }), _jsxs(DialogContent, { children: [error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, onClose: () => setError(null), children: error })), _jsxs(Grid, { container: true, spacing: 2, sx: { mt: 1 }, children: [_jsx(Grid, { size: { xs: 12 }, children: _jsx(Autocomplete, { options: produtos, getOptionLabel: (option) => `${option.codigo} - ${option.nome}`, value: produtoSelecionado || null, onChange: (_, value) => {
                                        setFormData(prev => ({ ...prev, produto: value?.id || 0 }));
                                    }, renderInput: (params) => (_jsx(TextField, { ...params, label: "Produto", required: true, placeholder: "Selecione o produto..." })), disabled: loading }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsxs(TextField, { fullWidth: true, select: true, required: true, label: "Localiza\u00E7\u00E3o de Origem", value: formData.localizacao_origem || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        localizacao_origem: Number(e.target.value)
                                    })), disabled: loading, children: [_jsx(MenuItem, { value: "", children: "Selecione..." }), localizacoes.map(loc => (_jsxs(MenuItem, { value: loc.id, disabled: loc.id === formData.localizacao_destino, children: [loc.nome, " (", loc.tipo, ")"] }, loc.id)))] }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsxs(TextField, { fullWidth: true, select: true, required: true, label: "Localiza\u00E7\u00E3o de Destino", value: formData.localizacao_destino || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        localizacao_destino: Number(e.target.value)
                                    })), disabled: loading, children: [_jsx(MenuItem, { value: "", children: "Selecione..." }), localizacoes.map(loc => (_jsxs(MenuItem, { value: loc.id, disabled: loc.id === formData.localizacao_origem, children: [loc.nome, " (", loc.tipo, ")"] }, loc.id)))] }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { fullWidth: true, required: true, type: "number", label: "Quantidade", value: formData.quantidade || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        quantidade: Number(e.target.value)
                                    })), inputProps: { min: 0, step: 0.01 }, helperText: produtoSelecionado ? `Unidade: ${produtoSelecionado.unidade}` : '', disabled: loading }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { fullWidth: true, label: "Lote", value: formData.lote || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        lote: e.target.value
                                    })), placeholder: "Ex: LOTE001", disabled: loading }) }), _jsx(Grid, { size: { xs: 12 }, children: _jsx(TextField, { fullWidth: true, label: "Observa\u00E7\u00E3o", value: formData.observacao || '', onChange: (e) => setFormData(prev => ({
                                        ...prev,
                                        observacao: e.target.value
                                    })), multiline: true, rows: 3, placeholder: "Informa\u00E7\u00F5es adicionais sobre a movimenta\u00E7\u00E3o...", disabled: loading }) }), produtoSelecionado && (_jsx(Grid, { size: { xs: 12 }, children: _jsx(Alert, { severity: "info", children: _jsxs(Typography, { variant: "body2", children: [_jsx("strong", { children: "Estoque Atual:" }), " ", produtoSelecionado.quantidade_estoque, " ", produtoSelecionado.unidade] }) }) }))] })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleClose, disabled: loading, children: "Cancelar" }), _jsx(Button, { onClick: handleSubmit, variant: "contained", disabled: loading, children: loading ? 'Movimentando...' : 'Movimentar' })] })] }));
};
export default MovimentacaoDialog;
