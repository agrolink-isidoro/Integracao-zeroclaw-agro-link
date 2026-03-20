import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Typography, CircularProgress, Stack, Chip, Alert, } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { listNfes } from '../../services/fiscal';
import NfeImpostosDetail from './NfeImpostosDetail';
// Função auxiliar para formatar valor monetário com segurança
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
// Helper para determinar status fiscal (manifestação)
const getManifestacaoChip = (nfe) => {
    if (!nfe.manifestacoes || nfe.manifestacoes.length === 0) {
        return {
            icon: _jsx(WarningIcon, { sx: { fontSize: '1rem' } }),
            label: 'Sem Manifestação',
            color: 'warning',
        };
    }
    // Pegar a manifestação mais recente (independente do status SEFAZ)
    const manifestacaoRecente = nfe.manifestacoes
        .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
    if (!manifestacaoRecente) {
        return {
            icon: _jsx(WarningIcon, { sx: { fontSize: '1rem' } }),
            label: 'Sem Manifestação',
            color: 'warning',
        };
    }
    // Determinar status baseado no tipo e status de envio
    const statusEnvio = manifestacaoRecente.status_envio;
    const tipoManifestacao = manifestacaoRecente.tipo;
    // Se está pending/failed, mostrar status de processamento
    if (statusEnvio === 'pending') {
        return {
            icon: _jsx(WarningIcon, { sx: { fontSize: '1rem' } }),
            label: 'Processando...',
            color: 'info',
        };
    }
    if (statusEnvio === 'failed') {
        return {
            icon: _jsx(WarningIcon, { sx: { fontSize: '1rem' } }),
            label: 'Erro Envio',
            color: 'error',
        };
    }
    // Se foi enviada com sucesso, mostrar o tipo específico
    switch (tipoManifestacao) {
        case 'confirmacao':
            return {
                icon: _jsx(CheckCircleIcon, { sx: { fontSize: '1rem' } }),
                label: 'Confirmada',
                color: 'success',
            };
        case 'ciencia':
            return {
                icon: _jsx(CheckCircleIcon, { sx: { fontSize: '1rem' } }),
                label: 'Ciência',
                color: 'info',
            };
        default:
            return {
                icon: _jsx(WarningIcon, { sx: { fontSize: '1rem' } }),
                label: tipoManifestacao,
                color: 'error',
            };
    }
};
// Helper para determinar status de estoque (processo interno)
const getStatusChip = (nfe) => {
    if (nfe.estoque_confirmado) {
        return {
            icon: _jsx(CheckCircleIcon, { sx: { fontSize: '1rem' } }),
            label: 'Estoque OK',
            color: 'success',
            variant: 'filled'
        };
    }
    return {
        icon: _jsx(WarningIcon, { sx: { fontSize: '1rem' } }),
        label: 'Aguardando',
        color: 'default',
        variant: 'outlined'
    };
};
const NfeListImpostos = () => {
    const [nfes, setNfes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    // Load local NFes
    useEffect(() => {
        loadLocalNfes();
    }, []);
    const loadLocalNfes = async () => {
        try {
            setLoading(true);
            const response = await listNfes();
            setNfes(response.data.results || response.data || []);
        }
        catch (err) {
            console.error('Failed to load NFes:', err);
            setNfes([]);
        }
        finally {
            setLoading(false);
        }
    };
    // Calcular consolidado geral de impostos
    const calculateConsolidatedTaxes = () => {
        let totals = { icms: 0, pis: 0, cofins: 0, valorTotal: 0 };
        nfes.forEach((nfe) => {
            totals.valorTotal += parseFloat(nfe.valor_nota || nfe.valor || 0);
            if (Array.isArray(nfe.itens)) {
                nfe.itens.forEach((item) => {
                    if (item.imposto) {
                        totals.icms += parseFloat(item.imposto.icms_valor || 0);
                        totals.pis += parseFloat(item.imposto.pis_valor || 0);
                        totals.cofins += parseFloat(item.imposto.cofins_valor || 0);
                    }
                });
            }
        });
        return totals;
    };
    const consolidatedTaxes = calculateConsolidatedTaxes();
    const totalTaxes = consolidatedTaxes.icms + consolidatedTaxes.pis + consolidatedTaxes.cofins;
    const effectiveRate = consolidatedTaxes.valorTotal > 0
        ? ((totalTaxes / consolidatedTaxes.valorTotal) * 100).toFixed(2)
        : '0.00';
    return (_jsxs(Box, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "h5", sx: { mb: 2 }, children: "Impostos por Nota Fiscal" }), loading && (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 4 }, children: _jsx(CircularProgress, {}) })), !loading && nfes.length === 0 && (_jsx(Alert, { severity: "info", children: "Nenhuma NFe local registrada. Envie uma nota fiscal na aba \"Notas Fiscais\"." })), !loading && nfes.length > 0 && (() => {
                const nfesSemManifestacao = nfes.filter(nfe => !nfe.manifestacoes ||
                    nfe.manifestacoes.length === 0 ||
                    !nfe.manifestacoes.some((m) => m.status_envio === 'sent'));
                if (nfesSemManifestacao.length > 0) {
                    return (_jsxs(Alert, { severity: "warning", sx: { mb: 2, fontWeight: 500 }, children: [_jsx("strong", { children: "\u26A0\uFE0F OBRIGA\u00C7\u00C3O FISCAL PENDENTE:" }), " ", nfesSemManifestacao.length, " NFe(s) sem manifesta\u00E7\u00E3o \u00E0 SEFAZ.", _jsx("br", {}), _jsx(Typography, { variant: "caption", children: "Clique em uma NFe para abrir os detalhes e registrar a manifesta\u00E7\u00E3o obrigat\u00F3ria. N\u00E3o manifestar pode resultar em multas fiscais." })] }));
                }
                return null;
            })(), !loading && nfes.length > 0 && (_jsxs(_Fragment, { children: [_jsxs(Paper, { sx: { p: 3, mb: 3, bgcolor: 'background.default' }, children: [_jsx(Typography, { variant: "h6", sx: { mb: 2, fontWeight: 600 }, children: "Consolidado de Impostos" }), _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }, children: [_jsxs(Box, { sx: { bgcolor: 'primary.lighter', p: 2, borderRadius: 1, textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Impostos Estaduais (ICMS)" }), _jsxs(Typography, { variant: "h5", sx: { color: 'primary.main', fontWeight: 700, mt: 1 }, children: ["R$ ", formatCurrency(consolidatedTaxes.icms).replace('.', ',')] })] }), _jsxs(Box, { sx: { bgcolor: 'success.lighter', p: 2, borderRadius: 1, textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Impostos Federais (PIS + COFINS)" }), _jsxs(Typography, { variant: "h5", sx: { color: 'success.main', fontWeight: 700, mt: 1 }, children: ["R$ ", formatCurrency(consolidatedTaxes.pis + consolidatedTaxes.cofins).replace('.', ',')] })] }), _jsxs(Box, { sx: { bgcolor: 'info.lighter', p: 2, borderRadius: 1, textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", children: "Impostos Municipais" }), _jsx(Typography, { variant: "h5", sx: { color: 'info.main', fontWeight: 700, mt: 1 }, children: "R$ 0,00" }), _jsx(Typography, { variant: "caption", color: "text.secondary", display: "block", sx: { mt: 0.5 }, children: "(Nenhum dado municipal dispon\u00EDvel)" })] })] })] }), _jsxs(Box, { sx: { display: 'flex', gap: 2 }, children: [_jsx(Box, { sx: { flex: 1 }, children: _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { sx: { bgcolor: 'primary.light' }, children: [_jsx(TableCell, { sx: { fontWeight: 600 }, children: "Manifesta\u00E7\u00E3o" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Estoque" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Chave" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "Valor" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Emitente" }), _jsx(TableCell, { align: "center", sx: { fontWeight: 600 }, children: "A\u00E7\u00F5es" })] }) }), _jsx(TableBody, { children: nfes.map((nfe) => {
                                                    const manifestacaoChip = getManifestacaoChip(nfe);
                                                    const statusChip = getStatusChip(nfe);
                                                    return (_jsxs(TableRow, { selected: selected === nfe.id, hover: true, sx: { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }, onClick: () => setSelected(nfe.id), children: [_jsx(TableCell, { children: _jsx(Chip, { icon: manifestacaoChip.icon, label: manifestacaoChip.label, color: manifestacaoChip.color, variant: "outlined", size: "small" }) }), _jsx(TableCell, { children: _jsx(Chip, { icon: statusChip.icon, label: statusChip.label, color: statusChip.color, variant: statusChip.variant, size: "small" }) }), _jsxs(TableCell, { sx: { fontFamily: 'monospace', fontSize: '0.8rem' }, children: [nfe.chave_acesso?.substring(0, 12), "..."] }), _jsxs(TableCell, { align: "right", sx: { fontWeight: 500 }, children: ["R$ ", formatCurrency(nfe.valor_nota || nfe.valor).replace('.', ',')] }), _jsx(TableCell, { sx: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }, children: nfe.emitente_nome }), _jsx(TableCell, { align: "center", children: _jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(OpenInNewIcon, {}), onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        setSelected(nfe.id);
                                                                    }, children: "Detalhes" }) })] }, nfe.id));
                                                }) })] }) }) }), _jsx(Box, { sx: { flex: 1 }, children: selected ? (_jsx(NfeImpostosDetail, { id: selected, onClose: () => setSelected(null) })) : (_jsx(Paper, { sx: { p: 2, bgcolor: 'background.default', textAlign: 'center' }, children: _jsx(Typography, { color: "text.secondary", children: "Selecione uma nota para ver detalhes de impostos" }) })) })] })] }))] }));
};
export default NfeListImpostos;
