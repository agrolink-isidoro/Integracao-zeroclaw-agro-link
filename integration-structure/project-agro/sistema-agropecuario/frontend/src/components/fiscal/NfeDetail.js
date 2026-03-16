import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardActions, Button, Box, Typography, Chip, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Menu, MenuItem, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { getNfe, confirmarEstoque } from '../../services/fiscal';
import { getStoredUser } from '../../hooks/useAuth';
import ManifestacaoNota from './ManifestacaoNota';
import { useToast } from '../../hooks/useToast';
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
// Helper para formatar data
const formatDate = (dateString) => {
    if (!dateString)
        return '—';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }
    catch {
        return dateString;
    }
};
// Helper para determinar status de manifestação fiscal
const getManifestacaoStatus = (nfe) => {
    if (!nfe.manifestacoes || nfe.manifestacoes.length === 0) {
        return { tipo: null, label: '🔵 Sem Manifestação', color: 'info' };
    }
    // Pegar a manifestação mais recente (independente do status SEFAZ)
    const manifestacaoRecente = nfe.manifestacoes
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
    if (!manifestacaoRecente) {
        return { tipo: null, label: '🔵 Sem Manifestação', color: 'info' };
    }
    // Determinar status baseado no tipo e status de envio
    const statusEnvio = manifestacaoRecente.status_envio;
    const tipoManifestacao = manifestacaoRecente.tipo;
    // Se está pending/failed, mostrar status de processamento
    if (statusEnvio === 'pending') {
        return { tipo: tipoManifestacao, label: '🟡 Processando Manifestação...', color: 'warning' };
    }
    if (statusEnvio === 'failed') {
        return { tipo: tipoManifestacao, label: '❌ Erro no Envio', color: 'error' };
    }
    // Se foi enviada com sucesso, mostrar o tipo específico
    switch (tipoManifestacao) {
        case 'confirmacao':
            return { tipo: 'confirmacao', label: '✅ Operação Confirmada', color: 'success' };
        case 'ciencia':
            return { tipo: 'ciencia', label: '👁️ Ciência Registrada', color: 'info' };
        case 'desconhecimento':
            return { tipo: 'desconhecimento', label: '⚠️ Operação Desconhecida', color: 'error' };
        case 'nao_realizada':
            return { tipo: 'nao_realizada', label: '❌ Não Realizada', color: 'error' };
        default:
            return { tipo: null, label: '🔵 Sem Manifestação', color: 'info' };
    }
};
// Helper para determinar status de estoque (processo interno)
const getEstoqueStatus = (nfe) => {
    // Verificar se há manifestação confirmada (enviada com sucesso)
    const manifestacaoConfirmada = nfe.manifestacoes?.find((m) => m.status_envio === 'sent' && m.tipo === 'confirmacao');
    // Só mostrar status de estoque se houver confirmação da operação
    if (!manifestacaoConfirmada) {
        return null; // Não mostrar status de estoque
    }
    if (nfe.estoque_confirmado) {
        return { label: '✓ Estoque Confirmado', color: 'success' };
    }
    return { label: '⏳ Aguardando Estoque', color: 'warning' };
};
const NfeDetail = ({ id, onClose, onUpdate }) => {
    const [nfe, setNfe] = useState(null);
    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [forceConfirm, setForceConfirm] = useState(false);
    const { showSuccess, showError } = useToast();
    useEffect(() => {
        setLoading(true);
        getNfe(id)
            .then((r) => setNfe(r.data))
            .catch(() => setNfe(null))
            .finally(() => setLoading(false));
    }, [id]);
    const handleConfirm = async (force = false) => {
        setConfirming(true);
        setConfirmDialogOpen(false);
        try {
            await confirmarEstoque(id, force ? { force: true } : {});
            showSuccess('Estoque confirmado com sucesso!');
            // Refresh
            const refreshed = await getNfe(id);
            setNfe(refreshed.data);
            // Notify parent to update list
            if (onUpdate) {
                onUpdate();
            }
        }
        catch (err) {
            const data = err?.response?.data;
            if (data?.error === 'unmapped_items') {
                const items = data.unmapped_items || [];
                showError(`Existem ${items.length} item(ns) sem mapeamento: ${items.slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`);
            }
            else {
                showError(data?.detail || 'Erro ao confirmar estoque');
            }
        }
        finally {
            setConfirming(false);
        }
    };
    const handleConfirmClick = () => {
        setForceConfirm(false);
        setConfirmDialogOpen(true);
    };
    const handleForceConfirmClick = () => {
        setForceConfirm(true);
        setConfirmDialogOpen(true);
    };
    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    if (loading)
        return _jsx(CircularProgress, {});
    if (!nfe)
        return _jsx(Typography, { color: "error", children: "Nota n\u00E3o encontrada." });
    const manifestacaoStatus = getManifestacaoStatus(nfe);
    const estoqueStatus = getEstoqueStatus(nfe);
    const podeConfirmarEstoque = manifestacaoStatus.tipo === 'confirmacao' && !nfe.estoque_confirmado;
    const user = getStoredUser ? getStoredUser() : null;
    const devForceEnabled = import.meta?.env?.VITE_FISCAL_SIMULATE_SEFAZ_SUCCESS === 'true';
    const podeForcarConfirmacao = (!!user?.is_staff || devForceEnabled) && !nfe.estoque_confirmado;
    const totalItems = Array.isArray(nfe.itens) ? nfe.itens.length : 0;
    const totalWeight = Array.isArray(nfe.itens)
        ? nfe.itens.reduce((sum, it) => sum + (parseFloat(it.quantidade_comercial) || 0), 0)
        : 0;
    return (_jsxs(Card, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsx(CardHeader, { title: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }, children: [_jsxs(Typography, { variant: "h6", children: ["NFe ", nfe.numero, "/", nfe.serie] }), _jsx(Chip, { label: manifestacaoStatus.label, color: manifestacaoStatus.color, size: "small", variant: "outlined" }), estoqueStatus && _jsx(Chip, { label: estoqueStatus.label, color: estoqueStatus.color, size: "small", variant: "filled" })] }), action: _jsx(IconButton, { size: "small", onClick: onClose, children: _jsx(CloseIcon, {}) }) }), _jsxs(CardContent, { sx: { flex: 1, overflowY: 'auto' }, children: [_jsxs(Box, { sx: { mb: 2 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Chave de Acesso" }), _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }, children: nfe.chave_acesso })] }), _jsxs(Box, { sx: { mb: 3 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Emitente" }), _jsx(Typography, { variant: "body2", sx: { fontWeight: 500 }, children: nfe.emitente_nome }), nfe.fornecedor_nome && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: nfe.fornecedor_nome }))] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: "Dados Operacionais" }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "S\u00E9rie" }), _jsx(Typography, { variant: "body2", children: nfe.serie })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "N\u00FAmero" }), _jsx(Typography, { variant: "body2", children: nfe.numero })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Data de Emiss\u00E3o" }), _jsx(Typography, { variant: "body2", children: formatDate(nfe.data_emissao) })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "CFOP" }), _jsx(Typography, { variant: "body2", children: nfe.cfop || '—' })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: "Totalizadores" }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }, children: [_jsxs(Box, { sx: { bgcolor: 'primary.lighter', p: 1.5, borderRadius: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Valor Total" }), _jsxs(Typography, { variant: "h6", sx: { color: 'primary.main', fontWeight: 700 }, children: ["R$ ", formatCurrency(nfe.valor_nota || nfe.valor).replace('.', ',')] })] }), _jsxs(Box, { sx: { bgcolor: 'info.lighter', p: 1.5, borderRadius: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Peso Total" }), _jsxs(Typography, { variant: "h6", sx: { color: 'info.main', fontWeight: 700 }, children: [totalWeight.toFixed(3), " t"] })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsxs(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: ["Itens (", totalItems, ")"] }), _jsx(TableContainer, { component: Paper, variant: "outlined", children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { sx: { bgcolor: 'action.hover' }, children: [_jsx(TableCell, { sx: { fontWeight: 600 }, children: "Item" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Descri\u00E7\u00E3o" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "Qtd" }), _jsx(TableCell, { align: "center", sx: { fontWeight: 600 }, children: "Un" })] }) }), _jsx(TableBody, { children: Array.isArray(nfe.itens) && nfe.itens.map((it) => (_jsxs(TableRow, { sx: { '&:last-child td, &:last-child th': { border: 0 } }, children: [_jsx(TableCell, { sx: { fontWeight: 500 }, children: it.numero_item }), _jsx(TableCell, { children: it.descricao }), _jsx(TableCell, { align: "right", children: parseFloat(it.quantidade_comercial).toFixed(3) }), _jsx(TableCell, { align: "center", children: it.unidade_comercial })] }, it.id))) })] }) })] }), _jsx(Divider, {}), _jsxs(CardActions, { sx: { flexDirection: 'column', gap: 0, p: 0 }, children: [_jsx(Box, { sx: { width: '100%', p: 2, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }, children: _jsx(ManifestacaoNota, { nfeId: nfe.id, nfeData: nfe, onManifestado: async () => {
                                // Aguardar um momento para a task ser processada
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                // Polling para aguardar processamento (máximo 8 tentativas - 16 segundos)
                                let attempts = 0;
                                const maxAttempts = 8;
                                while (attempts < maxAttempts) {
                                    const refreshed = await getNfe(id);
                                    const recentManifest = refreshed.data.manifestacoes?.slice().sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
                                    // Se a manifestação mais recente foi processada (não pending), parar
                                    if (recentManifest && recentManifest.status_envio !== 'pending') {
                                        setNfe(refreshed.data);
                                        break;
                                    }
                                    attempts++;
                                    if (attempts < maxAttempts) {
                                        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s entre tentativas
                                    }
                                    else {
                                        // Após tentativas, atualizar mesmo assim
                                        setNfe(refreshed.data);
                                    }
                                }
                                // Notify parent to update list
                                if (onUpdate) {
                                    onUpdate();
                                }
                            } }) }), _jsxs(Box, { sx: { width: '100%', p: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600, color: 'text.secondary' }, children: "\uD83D\uDCE6 Entrada em Estoque (Processo Interno)" }), !nfe.estoque_confirmado && manifestacaoStatus.tipo !== 'confirmacao' && (_jsxs(Alert, { severity: "warning", sx: { fontSize: '0.875rem', mb: 1.5 }, children: [_jsx("strong", { children: "Aten\u00E7\u00E3o:" }), " Antes de confirmar a entrada em estoque, \u00E9 necess\u00E1rio manifestar a ", _jsx("strong", { children: "\"Confirma\u00E7\u00E3o da Opera\u00E7\u00E3o\"" }), " junto \u00E0 SEFAZ.", manifestacaoStatus.tipo === 'ciencia' && (_jsxs(_Fragment, { children: [_jsx("br", {}), "Voc\u00EA registrou apenas Ci\u00EAncia. Confirme a opera\u00E7\u00E3o para prosseguir."] })), manifestacaoStatus.tipo === null && (_jsxs(_Fragment, { children: [_jsx("br", {}), "Registre sua manifesta\u00E7\u00E3o fiscal acima."] }))] })), manifestacaoStatus.tipo === 'nao_realizada' && (_jsxs(Alert, { severity: "error", sx: { mb: 1.5 }, children: [_jsx("strong", { children: "Opera\u00E7\u00E3o N\u00E3o Realizada:" }), " Esta nota foi marcada como \"Opera\u00E7\u00E3o n\u00E3o Realizada\". N\u00E3o \u00E9 poss\u00EDvel confirmar entrada em estoque."] })), manifestacaoStatus.tipo === 'desconhecimento' && (_jsxs(Alert, { severity: "error", sx: { mb: 1.5 }, children: [_jsx("strong", { children: "Opera\u00E7\u00E3o Desconhecida:" }), " Esta nota foi reportada como desconhecida (poss\u00EDvel fraude). N\u00E3o \u00E9 poss\u00EDvel confirmar entrada em estoque."] })), !nfe.estoque_confirmado && (_jsxs(Button, { variant: "contained", color: "success", fullWidth: true, size: "large", disabled: confirming || !podeConfirmarEstoque, onClick: handleConfirmClick, sx: { mb: 1.5, py: 1.5 }, children: [confirming ? _jsx(CircularProgress, { size: 20, sx: { mr: 1 } }) : '✓', confirming ? ' Processando...' : ' Confirmar Entrada em Estoque'] })), !nfe.estoque_confirmado && podeForcarConfirmacao && (_jsx(Button, { variant: "outlined", color: "warning", fullWidth: true, size: "large", onClick: handleForceConfirmClick, disabled: confirming, sx: { mb: 1 }, children: "\u26A0\uFE0F For\u00E7ar Confirma\u00E7\u00E3o (staff)" })), nfe.estoque_confirmado && (_jsx(Chip, { label: "\u2713 Estoque Confirmado", color: "success", sx: { width: '100%', py: 2, fontSize: '1rem' } })), _jsx(Box, { sx: { display: 'flex', justifyContent: 'flex-end', mt: 1 }, children: _jsx(IconButton, { size: "small", onClick: handleMenuOpen, title: "Mais op\u00E7\u00F5es", children: _jsx(MoreVertIcon, {}) }) })] }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, children: [_jsx(MenuItem, { onClick: () => {
                                    handleMenuClose();
                                    handleForceConfirmClick();
                                }, disabled: confirming || nfe.estoque_confirmado || !podeForcarConfirmacao, children: "\u26A0\uFE0F For\u00E7ar Processamento" }), _jsx(MenuItem, { disabled: true, children: "\uD83D\uDCE4 Enviar para Sefaz (em breve)" }), _jsx(MenuItem, { disabled: true, children: "\uD83D\uDD04 Reprocessar (em breve)" }), _jsx(MenuItem, { disabled: true, children: "\u2193 Download XML (em breve)" })] })] }), _jsxs(Dialog, { open: confirmDialogOpen, onClose: () => setConfirmDialogOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: forceConfirm ? '⚠️ Forçar Confirmação de Estoque?' : 'Confirmar Entrada em Estoque?' }), _jsx(DialogContent, { children: _jsx(DialogContentText, { children: forceConfirm ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: "Aten\u00E7\u00E3o:" }), " Voc\u00EA est\u00E1 prestes a ", _jsx("strong", { children: "for\u00E7ar" }), " a confirma\u00E7\u00E3o de estoque. Isso pode causar inconsist\u00EAncias se houver itens sem mapeamento correto.", _jsx("br", {}), _jsx("br", {}), "Deseja realmente continuar?"] })) : (_jsxs(_Fragment, { children: ["Ao confirmar a entrada em estoque, os produtos desta nota fiscal ser\u00E3o adicionados \u00E0s quantidades dispon\u00EDveis.", _jsx("br", {}), _jsx("br", {}), _jsx("strong", { children: "NFe:" }), " ", nfe?.numero, "/", nfe?.serie, _jsx("br", {}), _jsx("strong", { children: "Emitente:" }), " ", nfe?.emitente_nome, _jsx("br", {}), _jsx("strong", { children: "Valor:" }), " R$ ", formatCurrency(nfe?.valor_nota || nfe?.valor).replace('.', ','), _jsx("br", {}), _jsx("br", {}), "Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita. Deseja continuar?"] })) }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setConfirmDialogOpen(false), color: "inherit", children: "Cancelar" }), _jsx(Button, { onClick: () => handleConfirm(forceConfirm), color: forceConfirm ? 'warning' : 'success', variant: "contained", autoFocus: true, children: forceConfirm ? 'Forçar Confirmação' : 'Confirmar' })] })] })] }));
};
export default NfeDetail;
