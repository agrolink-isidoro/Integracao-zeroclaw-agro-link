import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, Button, Box, Typography, Chip, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert, CircularProgress, IconButton, } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getNfe } from '../../services/fiscal';
// Função auxiliar para formatar moeda
const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
        return '0.00';
    }
    return numValue.toFixed(2);
};
/**
 * NfeImpostosDetail Component
 * Displays detailed tax information for a NFe
 * Shows ICMS, PIS, COFINS breakdown by item and totals
 */
const NfeImpostosDetail = ({ id, onClose }) => {
    const [nfe, setNfe] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        setLoading(true);
        getNfe(id)
            .then((r) => setNfe(r.data))
            .catch(() => setNfe(null))
            .finally(() => setLoading(false));
    }, [id]);
    if (loading)
        return _jsx(CircularProgress, {});
    if (!nfe)
        return _jsx(Alert, { severity: "error", children: "Nota n\u00E3o encontrada." });
    // Calcular totais de impostos
    const calculateTotalTaxes = () => {
        let totals = { icms: 0, pis: 0, cofins: 0 };
        if (Array.isArray(nfe.itens)) {
            nfe.itens.forEach((item) => {
                // Os valores de impostos estão no objeto aninhado 'imposto'
                if (item.imposto?.icms_valor)
                    totals.icms += parseFloat(item.imposto.icms_valor);
                if (item.imposto?.pis_valor)
                    totals.pis += parseFloat(item.imposto.pis_valor);
                if (item.imposto?.cofins_valor)
                    totals.cofins += parseFloat(item.imposto.cofins_valor);
            });
        }
        return totals;
    };
    const taxes = calculateTotalTaxes();
    const totalValue = parseFloat(nfe.valor_nota || nfe.valor || 0);
    const totalTaxes = taxes.icms + taxes.pis + taxes.cofins;
    const effectiveRate = totalValue > 0 ? ((totalTaxes / totalValue) * 100).toFixed(2) : '0.00';
    return (_jsxs(Card, { sx: { height: '100%', display: 'flex', flexDirection: 'column' }, children: [_jsx(CardHeader, { title: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsxs(Typography, { variant: "h6", children: ["Impostos - NFe ", nfe.numero, "/", nfe.serie] }), _jsx(Chip, { label: "Detalhado", color: "info", variant: "outlined", size: "small" })] }), action: _jsx(IconButton, { size: "small", onClick: onClose, children: _jsx(CloseIcon, {}) }) }), _jsxs(CardContent, { sx: { flex: 1, overflowY: 'auto' }, children: [_jsxs(Box, { sx: { mb: 3 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600 }, children: "Refer\u00EAncia da Nota" }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Chave de Acesso" }), _jsx(Typography, { variant: "body2", sx: { fontFamily: 'monospace', fontSize: '0.8rem' }, children: nfe.chave_acesso })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Emitente" }), _jsx(Typography, { variant: "body2", children: nfe.emitente_nome })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Valor Total" }), _jsxs(Typography, { variant: "body2", sx: { fontWeight: 600, color: 'primary.main' }, children: ["R$ ", formatCurrency(totalValue).replace('.', ',')] })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Quantidade de Itens" }), _jsx(Typography, { variant: "body2", children: Array.isArray(nfe.itens) ? nfe.itens.length : 0 })] })] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", sx: { mb: 2, fontWeight: 600 }, children: "Resumo de Impostos" }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }, children: [_jsxs(Box, { sx: { bgcolor: 'error.lighter', p: 2, borderRadius: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "ICMS" }), _jsxs(Typography, { variant: "h6", sx: { color: 'error.main', fontWeight: 700 }, children: ["R$ ", formatCurrency(taxes.icms).replace('.', ',')] })] }), _jsxs(Box, { sx: { bgcolor: 'warning.lighter', p: 2, borderRadius: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "PIS" }), _jsxs(Typography, { variant: "h6", sx: { color: 'warning.main', fontWeight: 700 }, children: ["R$ ", formatCurrency(taxes.pis).replace('.', ',')] })] }), _jsxs(Box, { sx: { bgcolor: 'info.lighter', p: 2, borderRadius: 1 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "COFINS" }), _jsxs(Typography, { variant: "h6", sx: { color: 'info.main', fontWeight: 700 }, children: ["R$ ", formatCurrency(taxes.cofins).replace('.', ',')] })] })] }), _jsxs(Box, { sx: { bgcolor: 'success.lighter', p: 2, borderRadius: 1, mb: 3 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Total de Impostos" }), _jsxs(Typography, { variant: "h5", sx: { color: 'success.main', fontWeight: 700 }, children: ["R$ ", formatCurrency(totalTaxes).replace('.', ',')] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [effectiveRate, "% da nota"] })] }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", sx: { mb: 2, fontWeight: 600 }, children: "Detalhamento por Item" }), _jsx(TableContainer, { component: Paper, variant: "outlined", children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { sx: { bgcolor: 'action.hover' }, children: [_jsx(TableCell, { sx: { fontWeight: 600 }, children: "Item" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Descri\u00E7\u00E3o" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "Valor" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "ICMS" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "PIS" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "COFINS" })] }) }), _jsx(TableBody, { children: Array.isArray(nfe.itens) && nfe.itens.length > 0 ? (nfe.itens.map((item, idx) => (_jsxs(TableRow, { sx: { '&:last-child td, &:last-child th': { border: 0 } }, children: [_jsx(TableCell, { sx: { fontWeight: 500 }, children: item.numero_item }), _jsx(TableCell, { sx: { maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }, children: item.descricao }), _jsxs(TableCell, { align: "right", children: ["R$ ", formatCurrency(item.valor_produto || 0).replace('.', ',')] }), _jsxs(TableCell, { align: "right", sx: { color: 'error.main' }, children: ["R$ ", formatCurrency(item.imposto?.icms_valor || 0).replace('.', ',')] }), _jsxs(TableCell, { align: "right", sx: { color: 'warning.main' }, children: ["R$ ", formatCurrency(item.imposto?.pis_valor || 0).replace('.', ',')] }), _jsxs(TableCell, { align: "right", sx: { color: 'info.main' }, children: ["R$ ", formatCurrency(item.imposto?.cofins_valor || 0).replace('.', ',')] })] }, item.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, align: "center", sx: { py: 2 }, children: _jsx(Typography, { color: "text.secondary", children: "Nenhum item com detalhes de imposto" }) }) })) })] }) }), _jsx(Alert, { severity: "info", sx: { mt: 2 }, children: _jsx(Typography, { variant: "caption", children: "\uD83D\uDCA1 Os valores de impostos s\u00E3o extra\u00EDdos do XML da nota fiscal. Se aparecerem como R$ 0,00, os dados podem n\u00E3o estar mapeados no banco." }) })] })] }));
};
export default NfeImpostosDetail;
