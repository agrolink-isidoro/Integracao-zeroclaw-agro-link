import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Toolbar, Typography, CircularProgress, Stack, Chip, Alert, TextField, InputAdornment, } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { listNfes, listNfesRemoto, sincronizarNFesSefaz, verificarStatusSincronizacao, importNFeRemote, postManifestacao } from '../../services/fiscal';
import NfeDetail from './NfeDetail';
import NfeEditModal from './NfeEditModal';
import NFeRemoteFilter from './NFeRemoteFilter';
import ImportModalStepper from './ImportModalStepper';
import { useToast } from '@/hooks/useToast';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
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
const NfeList = ({ forceRemote = false, forceLocal = false, autoOpenEditNfeId = null }) => {
    const [nfes, setNfes] = useState([]);
    const [remoteNfes, setRemoteNfes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const [showRemote, setShowRemote] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedRemoteNfe, setSelectedRemoteNfe] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editNfeId, setEditNfeId] = useState(null);
    const [rowActionAnchor, setRowActionAnchor] = useState(null);
    const [rowActionTargetId, setRowActionTargetId] = useState(null);
    const [rowLoading, setRowLoading] = useState({});
    const [autoManifestAfterImport, setAutoManifestAfterImport] = useState(false);
    const [refreshDetail, setRefreshDetail] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const { showSuccess, showError } = useToast();
    // Load local NFes
    useEffect(() => {
        loadLocalNfes();
    }, []);
    // Auto-open edit modal when parent signals a newly imported NFe
    useEffect(() => {
        if (autoOpenEditNfeId) {
            setEditNfeId(autoOpenEditNfeId);
            setEditModalOpen(true);
        }
    }, [autoOpenEditNfeId]);
    // Initialize forced mode when component mounts
    useEffect(() => {
        if (forceRemote) {
            setShowRemote(true);
        }
        if (forceLocal) {
            setShowRemote(false);
        }
    }, [forceRemote, forceLocal]);
    // Load remote NFes when showRemote changes
    useEffect(() => {
        if (showRemote) {
            loadRemoteNfes();
        }
    }, [showRemote]);
    // Reload when search query changes (with debounce)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (showRemote) {
                loadRemoteNfes();
            }
            else {
                loadLocalNfes();
            }
        }, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery, showRemote]);
    const loadLocalNfes = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            const response = await listNfes(params);
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
    const loadRemoteNfes = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            const response = await listNfesRemoto(params);
            setRemoteNfes(response.data.results || response.data || []);
        }
        catch (err) {
            console.error('Failed to load remote NFes:', err);
            setRemoteNfes([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleToggleRemote = (isRemote) => {
        setShowRemote(isRemote);
        setSelected(null); // Clear selection when toggling
    };
    const handleImportClick = (nfe) => {
        setSelectedRemoteNfe(nfe);
        setAutoManifestAfterImport(false);
        setImportModalOpen(true);
    };
    const handleImportSuccess = (importedNfe) => {
        showSuccess('NFe importada com sucesso!');
        setImportModalOpen(false);
        // Atualizar lista local IMEDIATAMENTE com a NFe importada
        if (importedNfe) {
            setNfes((prevNfes) => {
                // Evitar duplicatas
                const exists = prevNfes.some((nfe) => nfe.id === importedNfe.id);
                if (exists) {
                    return prevNfes;
                }
                return [importedNfe, ...prevNfes];
            });
            // Selecionar a NFe importada para visualizar
            setSelected(importedNfe.id);
            // Trocar para view local se estava em remoto
            setShowRemote(false);
            // If user intended to manifest immediately after import, do so
            if (autoManifestAfterImport) {
                // Post a default 'ciencia' as a convenience; user receives toasts on result
                (async () => {
                    try {
                        await postManifestacao(importedNfe.id, { tipo: autoManifestAfterImport === true ? 'ciencia' : 'ciencia' });
                        showSuccess('Manifestação criada. Aguarde envio.');
                        // Refresh local list/details
                        loadLocalNfes();
                    }
                    catch (err) {
                        showError(err?.response?.data?.detail || 'Erro ao manifestar após importação');
                    }
                })();
            }
        }
        // Recarregar listas em background
        loadRemoteNfes();
        loadLocalNfes();
        // Open edit modal automatically for imported NFe so user can adjust values
        if (importedNfe && importedNfe.id) {
            setEditNfeId(importedNfe.id);
            setEditModalOpen(true);
        }
    };
    const currentNfes = showRemote ? remoteNfes : nfes;
    // Import then create manifestacao helper (for remote NFes)
    const handleImportThenManifest = async (remoteNfe, tipo) => {
        const remoteId = remoteNfe.id;
        setRowLoading((s) => ({ ...s, [remoteId]: true }));
        try {
            showSuccess('Iniciando importação para manifestação...');
            // Minimal payload: use 'outra' forma de pagamento with a note to allow import
            const payload = { centro_custo_id: null, import_metadata: { forma_pagamento: 'outra', observacao: 'Import para manifestação' } };
            const importResp = await importNFeRemote(remoteId, payload);
            const imported = importResp.data;
            showSuccess('NFe importada para manifestação');
            // Create manifestacao
            const nfeId = imported.id;
            try {
                await postManifestacao(nfeId, { tipo });
                showSuccess('Manifestação criada com sucesso.');
                // Refresh lists
                loadLocalNfes();
                loadRemoteNfes();
                // Select imported NFe
                setSelected(nfeId);
            }
            catch (err) {
                showError(err?.response?.data?.detail || 'Erro ao criar manifestação');
            }
        }
        catch (err) {
            console.error('Erro ao importar/manifestar:', err);
            showError(err?.response?.data?.detail || 'Erro ao importar NFe');
        }
        finally {
            setRowLoading((s) => ({ ...s, [remoteId]: false }));
        }
    };
    return (_jsxs(Box, { sx: { pt: 2, pb: 2, px: 0 }, children: [_jsx(Typography, { variant: "h5", sx: { mb: 0 }, children: "Notas Fiscais" }), _jsx(Box, { sx: { display: 'flex', justifyContent: 'flex-start', mb: 0 }, children: _jsx(Box, { sx: { width: { xs: '100%', sm: 420 } }, children: _jsx(TextField, { fullWidth: true, size: "small", placeholder: "Buscar por n\u00FAmero, chave, emitente, produto...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), InputProps: {
                            startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, {}) })),
                        }, variant: "outlined" }) }) }), _jsx(Toolbar, { sx: {
                    display: 'flex',
                    justifyContent: 'flex-start',
                    mb: 2,
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                }, children: _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center' }, children: [!forceLocal && !forceRemote && (_jsxs(_Fragment, { children: [_jsx(NFeRemoteFilter, { showRemote: showRemote, onToggle: handleToggleRemote, remoteCount: remoteNfes.length }), showRemote && remoteNfes.length > 0 && (_jsx(Chip, { label: `${remoteNfes.length} remotas`, color: "primary", variant: "outlined" }))] })), (showRemote || forceRemote) && (_jsx(Button, { size: "small", variant: "outlined", color: "primary", startIcon: _jsx(CloudDownloadIcon, {}), onClick: async () => {
                                try {
                                    const jobResp = await sincronizarNFesSefaz();
                                    const jobId = jobResp.data?.job_id;
                                    showSuccess('Solicitação enviada. Aguardando listagem...');
                                    if (jobId) {
                                        // Poll for job completion (simple implementation)
                                        let attempts = 0;
                                        const maxAttempts = 20;
                                        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
                                        while (attempts < maxAttempts) {
                                            const statusResp = await verificarStatusSincronizacao(jobId);
                                            const status = statusResp.data?.status;
                                            if (status === 'success' || status === 'failed')
                                                break;
                                            attempts++;
                                            await delay(1500);
                                        }
                                    }
                                    // Reload remote list
                                    await loadRemoteNfes();
                                    showSuccess('Listagem remota atualizada');
                                }
                                catch (err) {
                                    console.error('Erro ao solicitar listagem remota:', err);
                                    showError(err?.response?.data?.detail || 'Erro ao listar NFes remotas');
                                }
                            }, children: "LISTAR NFES REMOTAS" }))] }) }), loading && (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 4 }, children: _jsx(CircularProgress, {}) })), !loading && currentNfes.length === 0 && (_jsx(Alert, { severity: "info", children: showRemote
                    ? 'Nenhuma NFe remota disponível. Verifique a sincronização com a SEFAZ.'
                    : 'Nenhuma NFe local registrada.' })), !loading && currentNfes.length > 0 && (() => {
                const nfesSemManifestacao = currentNfes.filter(nfe => !nfe.manifestacoes ||
                    nfe.manifestacoes.length === 0 ||
                    !nfe.manifestacoes.some((m) => m.status_envio === 'sent'));
                if (nfesSemManifestacao.length > 0) {
                    return (_jsxs(Alert, { severity: "warning", sx: { mb: 2, fontWeight: 500 }, children: [_jsx("strong", { children: "\u26A0\uFE0F OBRIGA\u00C7\u00C3O FISCAL PENDENTE:" }), " ", nfesSemManifestacao.length, " NFe(s) sem manifesta\u00E7\u00E3o \u00E0 SEFAZ.", _jsx("br", {}), _jsx(Typography, { variant: "caption", children: "Clique em uma NFe para abrir os detalhes e registrar a manifesta\u00E7\u00E3o obrigat\u00F3ria. N\u00E3o manifestar pode resultar em multas fiscais." })] }));
                }
                return null;
            })(), !loading && currentNfes.length > 0 && (_jsxs(Box, { sx: { display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }, children: [_jsx(Box, { sx: { flex: 1 }, children: _jsx(TableContainer, { component: Paper, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { sx: { bgcolor: 'primary.light' }, children: [_jsx(TableCell, { sx: { fontWeight: 600 }, children: "Manifesta\u00E7\u00E3o" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Estoque" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Chave" }), _jsx(TableCell, { align: "right", sx: { fontWeight: 600 }, children: "Valor" }), _jsx(TableCell, { sx: { fontWeight: 600 }, children: "Emitente" }), _jsx(TableCell, { align: "center", sx: { fontWeight: 600 }, children: "A\u00E7\u00F5es" })] }) }), _jsx(TableBody, { children: currentNfes.map((nfe) => {
                                            const manifestacaoChip = getManifestacaoChip(nfe);
                                            const statusChip = getStatusChip(nfe);
                                            return (_jsxs(TableRow, { selected: selected === nfe.id, hover: true, sx: { cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }, onClick: () => setSelected(nfe.id), children: [_jsx(TableCell, { children: _jsx(Chip, { icon: manifestacaoChip.icon, label: manifestacaoChip.label, color: manifestacaoChip.color, variant: "outlined", size: "small" }) }), _jsx(TableCell, { children: _jsx(Chip, { icon: statusChip.icon, label: statusChip.label, color: statusChip.color, variant: statusChip.variant, size: "small" }) }), _jsxs(TableCell, { sx: { fontFamily: 'monospace', fontSize: '0.8rem' }, children: [nfe.chave_acesso?.substring(0, 12), "..."] }), _jsxs(TableCell, { align: "right", sx: { fontWeight: 500 }, children: ["R$ ", formatCurrency(nfe.valor_nota || nfe.valor).replace('.', ',')] }), _jsx(TableCell, { sx: { maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }, children: nfe.emitente_nome }), _jsx(TableCell, { align: "center", children: _jsxs(Stack, { direction: "row", spacing: 0.5, justifyContent: "center", children: [showRemote && (_jsxs(_Fragment, { children: [_jsx(Button, { size: "small", variant: "outlined", color: "primary", startIcon: _jsx(CloudDownloadIcon, {}), onClick: (e) => {
                                                                                e.stopPropagation();
                                                                                handleImportClick(nfe);
                                                                            }, children: "Importar XML" }), _jsx(Button, { size: "small", variant: "outlined", color: "secondary", disabled: !!rowLoading[nfe.id], onClick: (e) => {
                                                                                e.stopPropagation();
                                                                                setRowActionAnchor(e.currentTarget);
                                                                                setRowActionTargetId(nfe.id);
                                                                            }, children: rowLoading[nfe.id] ? (_jsx(CircularProgress, { size: 18 })) : 'Manifestar' }), _jsxs(Menu, { anchorEl: rowActionAnchor, open: Boolean(rowActionAnchor) && rowActionTargetId === nfe.id, onClose: () => { setRowActionAnchor(null); setRowActionTargetId(null); }, children: [_jsx(MenuItem, { onClick: async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setRowActionAnchor(null);
                                                                                        // Trigger import then create manifestacao (tipo: ciencia)
                                                                                        await handleImportThenManifest(nfe, 'ciencia');
                                                                                    }, children: "Ci\u00EAncia" }), _jsx(MenuItem, { onClick: async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setRowActionAnchor(null);
                                                                                        await handleImportThenManifest(nfe, 'confirmacao');
                                                                                    }, children: "Confirma\u00E7\u00E3o" }), _jsx(MenuItem, { onClick: async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setRowActionAnchor(null);
                                                                                        await handleImportThenManifest(nfe, 'desconhecimento');
                                                                                    }, children: "Desconhecimento" }), _jsx(MenuItem, { onClick: async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setRowActionAnchor(null);
                                                                                        await handleImportThenManifest(nfe, 'nao_realizada');
                                                                                    }, children: "Opera\u00E7\u00E3o N\u00E3o Realizada" })] })] })), _jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(OpenInNewIcon, {}), onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        setSelected(nfe.id);
                                                                    }, children: "Abrir" }), _jsx(Button, { size: "small", variant: "outlined", color: "secondary", onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        setEditNfeId(nfe.id);
                                                                        setEditModalOpen(true);
                                                                    }, children: "Editar Valores" })] }) })] }, nfe.id));
                                        }) })] }) }) }), _jsx(Box, { sx: { display: selected ? 'block' : 'none', width: { xs: '100%', md: 380 } }, children: selected && (_jsx(NfeDetail, { id: selected, onClose: () => setSelected(null), onUpdate: loadLocalNfes }, refreshDetail)) })] })), selectedRemoteNfe && (_jsx(ImportModalStepper, { nfeRemote: selectedRemoteNfe, open: importModalOpen, onSuccess: handleImportSuccess, onClose: () => {
                    setImportModalOpen(false);
                    setSelectedRemoteNfe(null);
                } })), _jsx(NfeEditModal, { open: editModalOpen, nfeId: editNfeId, onClose: () => {
                    setEditModalOpen(false);
                    setEditNfeId(null);
                }, onSaved: () => {
                    showSuccess('Alterações aplicadas. Atualizando lista...');
                    loadLocalNfes();
                }, onRefresh: () => setRefreshDetail(prev => prev + 1) })] }));
};
export default NfeList;
