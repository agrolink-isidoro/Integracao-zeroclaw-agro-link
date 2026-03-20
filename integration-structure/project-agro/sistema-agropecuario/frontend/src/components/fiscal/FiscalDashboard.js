import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, CircularProgress, Alert, Grid, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress, Divider, } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { listNfes } from '../../services/fiscal';
// Safe currency formatting
const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') {
        return '0,00';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
        return '0,00';
    }
    return numValue.toFixed(2).replace('.', ',');
};
const FiscalDashboard = () => {
    const [stats, setStats] = useState({
        totalNfes: 0,
        totalValue: 0,
        totalICMS: 0,
        totalPIS: 0,
        totalCOFINS: 0,
        processedNfes: 0,
        pendingNfes: 0,
        complianceRate: 0,
        loading: true,
        error: null,
    });
    useEffect(() => {
        loadDashboardData();
    }, []);
    const loadDashboardData = async () => {
        try {
            setStats((prev) => ({ ...prev, loading: true, error: null }));
            const response = await listNfes();
            const nfes = response.data.results || response.data || [];
            // Also fetch certificates to compute expiry warnings
            const certResp = await (await import('../../services/fiscal')).listCertificados();
            const certs = certResp.data.results || certResp.data || [];
            // Calculate consolidated values
            let totalValue = 0;
            let totalICMS = 0;
            let totalPIS = 0;
            let totalCOFINS = 0;
            let processedCount = 0;
            let pendingCount = 0;
            const obligations = [];
            nfes.forEach((nfe) => {
                const value = parseFloat(nfe.valor_nota || nfe.valor || 0) || 0;
                totalValue += value;
                // Accumulate taxes from items
                if (Array.isArray(nfe.itens)) {
                    nfe.itens.forEach((item) => {
                        if (item.imposto) {
                            totalICMS += parseFloat(item.imposto.icms_valor || 0) || 0;
                            totalPIS += parseFloat(item.imposto.pis_valor || 0) || 0;
                            totalCOFINS += parseFloat(item.imposto.cofins_valor || 0) || 0;
                        }
                    });
                }
                // Duplicatas (obrigacoes) — if available, extract upcoming vencimentos
                if (Array.isArray(nfe.duplicatas)) {
                    nfe.duplicatas.forEach((d) => {
                        const due = d.data_vencimento || d.data || null;
                        const val = parseFloat(d.valor || 0) || 0;
                        if (due) {
                            const dueDate = new Date(due);
                            const now = new Date();
                            const status = dueDate < now ? 'vencido' : 'pendente';
                            obligations.push({
                                name: `Duplicata NF ${nfe.numero}/${nfe.serie}`,
                                type: 'Duplicata',
                                dueDate: due,
                                status,
                                value: val,
                            });
                        }
                    });
                }
                // Count status
                if (nfe.estoque_confirmado) {
                    processedCount++;
                }
                else {
                    pendingCount++;
                }
            });
            // Certificates expiring within 30 days
            const now = new Date();
            const thirty = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const certsExpiringSoon = (certs || []).filter((c) => c.validade && new Date(c.validade) <= thirty).length;
            // Sort obligations by due date ascending and keep next 10
            obligations.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            const nextObligations = obligations.slice(0, 10);
            // Calculate compliance rate: processed / total * 100
            const complianceRate = nfes.length > 0 ? (processedCount / nfes.length) * 100 : 0;
            setStats({
                totalNfes: nfes.length,
                totalValue,
                avgNfeValue: nfes.length > 0 ? totalValue / nfes.length : 0,
                totalICMS,
                totalPIS,
                totalCOFINS,
                processedNfes: processedCount,
                pendingNfes: pendingCount,
                complianceRate: Math.round(complianceRate),
                certsExpiringSoon,
                obligations: nextObligations,
                loading: false,
                error: null,
            });
        }
        catch (err) {
            console.error('Failed to load dashboard data:', err);
            let message = 'Erro ao carregar dados do dashboard';
            if (err?.response?.status === 401) {
                message = 'Não autorizado. Por favor, faça login.';
            }
            else if (err?.response?.status === 500) {
                message = 'Erro no servidor ao carregar dados fiscais. Contate o suporte.';
            }
            setStats((prev) => ({
                ...prev,
                loading: false,
                error: message,
            }));
        }
    };
    if (stats.loading) {
        return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }, children: _jsx(CircularProgress, {}) }));
    }
    const totalTaxes = stats.totalICMS + stats.totalPIS + stats.totalCOFINS;
    const effectiveTaxRate = stats.totalValue > 0 ? ((totalTaxes / stats.totalValue) * 100).toFixed(2) : '0';
    // Upcoming obligations (mock structure - could be fetched from API in future)
    const obligations = [
        {
            name: 'ICMS - Janeiro 2025',
            type: 'Imposto Estadual',
            dueDate: '20/01/2025',
            status: 'pendente',
            value: stats.totalICMS || 0,
        },
        {
            name: 'PIS/COFINS - Janeiro 2025',
            type: 'Imposto Federal',
            dueDate: '25/01/2025',
            status: 'pago',
            value: stats.totalPIS + stats.totalCOFINS || 0,
        },
    ];
    const getStatusColor = (status) => {
        switch (status) {
            case 'pago':
                return 'success';
            case 'pendente':
                return 'warning';
            case 'processando':
                return 'info';
            default:
                return 'default';
        }
    };
    return (_jsxs(Box, { sx: { p: 2 }, children: [stats.error && (_jsx(Alert, { severity: "error", sx: { mb: 2 }, children: stats.error })), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Box, { sx: {
                                                bgcolor: 'error.lighter',
                                                p: 1.5,
                                                borderRadius: 1,
                                                display: 'flex',
                                                justifyContent: 'center',
                                            }, children: _jsx(WarningIcon, { sx: { color: 'error.main', fontSize: '2rem' } }) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Impostos Totais" }), _jsxs(Typography, { variant: "h6", children: ["R$ ", formatCurrency(totalTaxes)] }), _jsxs(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: ["Al\u00EDquota efetiva: ", effectiveTaxRate, "%"] })] })] }) }) }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Box, { sx: {
                                                bgcolor: 'primary.lighter',
                                                p: 1.5,
                                                borderRadius: 1,
                                                display: 'flex',
                                                justifyContent: 'center',
                                            }, children: _jsx(TrendingUpIcon, { sx: { color: 'primary.main', fontSize: '2rem' } }) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Notas Emitidas" }), _jsx(Typography, { variant: "h6", children: stats.totalNfes }), _jsxs(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: ["Total: R$ ", formatCurrency(stats.totalValue)] })] })] }) }) }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Box, { sx: {
                                                bgcolor: 'success.lighter',
                                                p: 1.5,
                                                borderRadius: 1,
                                                display: 'flex',
                                                justifyContent: 'center',
                                            }, children: _jsx(CheckCircleIcon, { sx: { color: 'success.main', fontSize: '2rem' } }) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Conformidade" }), _jsxs(Typography, { variant: "h6", children: [stats.complianceRate, "%"] }), _jsxs(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: [stats.processedNfes, " de ", stats.totalNfes, " processadas"] })] })] }) }) }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Box, { sx: {
                                                bgcolor: 'warning.lighter',
                                                p: 1.5,
                                                borderRadius: 1,
                                                display: 'flex',
                                                justifyContent: 'center',
                                            }, children: _jsx(InfoIcon, { sx: { color: 'warning.main', fontSize: '2rem' } }) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Pend\u00EAncias" }), _jsx(Typography, { variant: "h6", children: stats.pendingNfes }), _jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Aguardando processamento" })] })] }) }) }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsx(Card, { children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [_jsx(Box, { sx: { bgcolor: 'warning.lighter', p: 1.5, borderRadius: 1, display: 'flex', justifyContent: 'center' }, children: _jsx(WarningIcon, { sx: { color: 'warning.main', fontSize: '2rem' } }) }), _jsxs(Box, { sx: { flex: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Certificados (30d)" }), _jsx(Typography, { variant: "h6", children: stats.certsExpiringSoon ?? 0 }), _jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "expirando em 30 dias" })] })] }) }) }) })] }), _jsxs(Grid, { container: true, spacing: 2, sx: { mb: 3 }, children: [_jsx(Grid, { size: { xs: 12, md: 8 }, children: _jsxs(Card, { children: [_jsx(CardHeader, { title: "Pr\u00F3ximas Obriga\u00E7\u00F5es Fiscais", subheaderTypographyProps: { variant: 'caption' } }), _jsx(CardContent, { sx: { p: 0 }, children: _jsx(TableContainer, { children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { sx: { bgcolor: 'action.hover' }, children: _jsxs(TableRow, { children: [_jsx(TableCell, { sx: { fontWeight: 600 }, children: "Obriga\u00E7\u00E3o" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Tipo" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Vencimento" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Status" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "Valor" })] }) }), _jsx(TableBody, { children: (stats.obligations && stats.obligations.length > 0) ? (stats.obligations.map((obligation, index) => (_jsxs(TableRow, { hover: true, children: [_jsx(TableCell, { children: obligation.name }), _jsx(TableCell, { children: obligation.type }), _jsx(TableCell, { children: new Date(obligation.dueDate).toLocaleDateString() }), _jsx(TableCell, { children: _jsx(Chip, { label: obligation.status === 'pago' ? 'Pago' : (obligation.status === 'vencido' ? 'Vencido' : 'Pendente'), color: getStatusColor(obligation.status), variant: "filled", size: "small" }) }), _jsxs(TableCell, { align: "right", children: ["R$ ", formatCurrency(obligation.value)] })] }, index)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center text-muted", children: "Nenhuma obriga\u00E7\u00E3o encontrada (verifique duplicatas nas NFes)." }) })) })] }) }) })] }) }), _jsxs(Grid, { size: { xs: 12, md: 4 }, children: [_jsxs(Card, { sx: { mb: 2 }, children: [_jsx(CardHeader, { title: "Alertas Fiscais" }), _jsxs(CardContent, { sx: { pt: 0 }, children: [stats.pendingNfes > 0 && (_jsxs(Alert, { severity: "warning", sx: { mb: 1 }, children: [_jsxs("strong", { children: [stats.pendingNfes, " nota(s)"] }), " aguardando processamento"] })), stats.complianceRate < 100 && (_jsxs(Alert, { severity: "info", sx: { mb: 1 }, children: ["Taxas de conformidade em ", stats.complianceRate, "%"] })), stats.totalNfes === 0 && (_jsx(Alert, { severity: "info", children: "Nenhuma nota fiscal registrada. Importe uma nota para come\u00E7ar." })), stats.complianceRate === 100 && stats.totalNfes > 0 && (_jsxs(Alert, { severity: "success", children: [_jsx(CheckCircleIcon, { sx: { mr: 1, fontSize: '1rem' } }), "Todas as notas processadas"] }))] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { title: "Status de Conformidade" }), _jsxs(CardContent, { sx: { pt: 1 }, children: [_jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 0.5 }, children: [_jsx(Typography, { variant: "caption", children: "Notas Processadas" }), _jsxs(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: [stats.complianceRate, "%"] })] }), _jsx(LinearProgress, { variant: "determinate", value: stats.complianceRate })] }), _jsxs(Box, { sx: { mb: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between', mb: 0.5 }, children: [_jsx(Typography, { variant: "caption", children: "Impostos Calculados" }), _jsx(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: stats.totalNfes > 0 ? '100%' : '0%' })] }), _jsx(LinearProgress, { variant: "determinate", value: stats.totalNfes > 0 ? 100 : 0, color: "success" })] }), _jsx(Divider, { sx: { my: 1.5 } }), _jsxs(Box, { sx: { display: 'flex', justifyContent: 'space-between' }, children: [_jsx(Typography, { variant: "caption", sx: { fontWeight: 600 }, children: "\u00CDndice Geral" }), _jsxs(Typography, { variant: "body2", sx: { fontWeight: 600, color: 'success.main' }, children: [Math.round((stats.complianceRate + (stats.totalNfes > 0 ? 100 : 0)) / 2), "%"] })] })] })] })] })] }), stats.totalNfes > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { title: "Resumo de Impostos" }), _jsx(CardContent, { children: _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "ICMS" }), _jsxs(Typography, { variant: "h6", sx: { color: 'error.main', mt: 0.5 }, children: ["R$ ", formatCurrency(stats.totalICMS)] })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "PIS" }), _jsxs(Typography, { variant: "h6", sx: { color: 'warning.main', mt: 0.5 }, children: ["R$ ", formatCurrency(stats.totalPIS)] })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "COFINS" }), _jsxs(Typography, { variant: "h6", sx: { color: 'info.main', mt: 0.5 }, children: ["R$ ", formatCurrency(stats.totalCOFINS)] })] }) }), _jsx(Grid, { size: { xs: 12, sm: 6, md: 3 }, children: _jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Typography, { variant: "caption", sx: { color: 'text.secondary' }, children: "Total" }), _jsxs(Typography, { variant: "h6", sx: { color: 'primary.main', mt: 0.5 }, children: ["R$ ", formatCurrency(totalTaxes)] })] }) })] }) })] }))] }));
};
export default FiscalDashboard;
