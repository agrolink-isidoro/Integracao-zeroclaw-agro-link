import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Select, MenuItem, TextField, FormControl, InputLabel, CircularProgress, Chip, Paper, Divider, Alert, } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, TimelineOppositeContent, } from '@mui/lab';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { postManifestacao, listManifestacoesForNfe, listCertificados, sincronizarNFesSefaz, verificarStatusSincronizacao } from '../../services/fiscal';
import { useManifestacaoPolling } from '../../hooks/useManifestacaoPolling';
import { TIPO_MANIFESTACAO_CHOICES } from '../../utils/constants';
import { useToast } from '@/hooks/useToast';
import Tooltip from '@mui/material/Tooltip';
// Helper para formatar data/hora
const formatDateTime = (dateString) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    catch {
        return dateString;
    }
};
// Helper para obter label do tipo
const getTipoLabel = (tipo) => {
    const choice = TIPO_MANIFESTACAO_CHOICES.find((c) => c.value === tipo);
    return choice?.label || tipo;
};
// Normaliza a resposta da SEFAZ para string legível no UI
const formatRespostaSefaz = (resposta) => {
    if (resposta === null || resposta === undefined)
        return '';
    if (typeof resposta === 'string')
        return resposta;
    if (typeof resposta === 'object') {
        if ('message' in resposta && resposta.message)
            return String(resposta.message);
        if ('cStat' in resposta) {
            const msg = resposta.message ? ` - ${String(resposta.message)}` : '';
            return `${String(resposta.cStat)}${msg}`;
        }
        try {
            return JSON.stringify(resposta);
        }
        catch {
            return String(resposta);
        }
    }
    return String(resposta);
};
// Helper para status visual
const getStatusConfig = (status, resposta_sefaz) => {
    switch (status) {
        case 'sent':
            return {
                icon: _jsx(CheckCircleIcon, { fontSize: "small" }),
                color: 'success',
                label: 'Aceito pela SEFAZ',
            };
        case 'failed':
            // Personalizar mensagem baseada na resposta SEFAZ (normalizar primeiro)
            const respostaText = formatRespostaSefaz(resposta_sefaz);
            const isA3Required = respostaText.includes('Certificado A3') || respostaText.toLowerCase().includes('certificado');
            return {
                icon: _jsx(ErrorIcon, { fontSize: "small" }),
                color: 'error',
                label: isA3Required ? 'Certificado A3 Necessário' : 'Rejeitado pela SEFAZ',
            };
        default: // pending
            return {
                icon: _jsx(PendingIcon, { fontSize: "small" }),
                color: 'warning',
                label: 'Processando...',
            };
    }
};
// Helper para validar se tipo de manifestação está disponível
const validateTipoDisponivel = (tipoValue, historico, nfeDataEmissao) => {
    const conclusivas = ['confirmacao', 'desconhecimento', 'nao_realizada'];
    const manifestacoesSent = historico.filter(m => m.status_envio === 'sent');
    // Regra 1: Ciência não pode ser registrada após manifestação conclusiva
    if (tipoValue === 'ciencia') {
        const hasConclusiva = manifestacoesSent.some(m => conclusivas.includes(m.tipo));
        if (hasConclusiva) {
            return { disponivel: false, motivo: 'Ciência não permitida após manifestação conclusiva já registrada' };
        }
        // Verificar prazo de 10 dias
        if (nfeDataEmissao) {
            const dataEmissao = new Date(nfeDataEmissao);
            const hoje = new Date();
            const diffDays = Math.floor((hoje.getTime() - dataEmissao.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 10) {
                return { disponivel: false, motivo: 'Ciência deve ser registrada em até 10 dias após autorização' };
            }
        }
    }
    // Regra 2: Máximo de 2 ocorrências por tipo conclusivo (retificações)
    if (conclusivas.includes(tipoValue)) {
        const count = manifestacoesSent.filter(m => m.tipo === tipoValue).length;
        if (count >= 2) {
            return { disponivel: false, motivo: `Máximo de 2 ocorrências permitidas para este tipo (já registradas: ${count})` };
        }
        // Verificar prazo de 180 dias
        if (nfeDataEmissao) {
            const dataEmissao = new Date(nfeDataEmissao);
            const hoje = new Date();
            const diffDays = Math.floor((hoje.getTime() - dataEmissao.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 180) {
                return { disponivel: false, motivo: 'Eventos conclusivos devem ser registrados em até 180 dias após autorização' };
            }
        }
    }
    return { disponivel: true, motivo: '' };
};
const ManifestacaoNota = ({ nfeId, nfeData, onManifestado }) => {
    // Por questões legais a funcionalidade de manifestação deve ser visível por padrão.
    // Respeitar variável de ambiente somente se explicitamente definida para 'false'.
    const enabled = (import.meta.env.VITE_FISCAL_MANIFESTACAO_ENABLED || 'true') !== 'false';
    const [tipo, setTipo] = useState('confirmacao');
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    // Estados para certificados
    const [certificados, setCertificados] = useState([]);
    const [selectedCertificadoId, setSelectedCertificadoId] = useState(null);
    const [loadingCerts, setLoadingCerts] = useState(false);
    // Estados para sincronização SEFAZ
    const [sincronizando, setSincronizando] = useState(false);
    const [ultimaSincronizacao, setUltimaSincronizacao] = useState(null);
    const [jobId, setJobId] = useState(null);
    const pollingIntervalRef = useRef(null);
    const syncCompletedRef = useRef(false);
    // Verificar se já existe manifestação (qualquer status)
    const existingManifestacao = nfeData?.manifestacoes && nfeData.manifestacoes.length > 0
        ? nfeData.manifestacoes.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0]
        : null;
    const isManifestado = existingManifestacao !== null;
    const isProcessing = existingManifestacao?.status_envio === 'pending';
    const isSent = existingManifestacao?.status_envio === 'sent';
    const hasFailed = existingManifestacao?.status_envio === 'failed';
    // Polling para atualizações em tempo real
    const { currentStatus, isPolling, startPolling } = useManifestacaoPolling({
        nfeId,
        enabled: isProcessing,
        onStatusChange: (newStatus) => {
            if (onManifestado)
                onManifestado();
            fetchHistory();
            showInfo(`Status da manifestação atualizado: ${getStatusLabel(newStatus, undefined)}`);
        }
    });
    if (!enabled)
        return null;
    const fetchCertificados = async () => {
        try {
            setLoadingCerts(true);
            const response = await listCertificados();
            const certs = response.data?.results || response.data || [];
            // Filtrar apenas certificados válidos (não expirados) e aptos para manifestação
            const validCerts = certs.filter((cert) => {
                if (!cert.validade)
                    return true;
                const validadeDate = new Date(cert.validade);
                return validadeDate >= new Date();
            });
            // Prioritize certs that are apto_manifestacao, but keep all valid for display
            const aptoCerts = validCerts.filter((c) => c.apto_manifestacao !== false);
            setCertificados(validCerts);
            // Se houver apenas 1 certificado apto, selecionar automaticamente
            if (aptoCerts.length === 1) {
                setSelectedCertificadoId(aptoCerts[0].id);
            }
            else if (validCerts.length === 1) {
                setSelectedCertificadoId(validCerts[0].id);
            }
        }
        catch (error) {
            console.error('Erro ao buscar certificados:', error);
            showError('Erro ao carregar certificados digitais');
        }
        finally {
            setLoadingCerts(false);
        }
    };
    const fetchHistory = async () => {
        try {
            const r = await listManifestacoesForNfe(nfeId);
            setHistory(r.data.results || []);
        }
        catch (e) {
            // ignore
        }
    };
    useEffect(() => {
        fetchHistory();
        fetchCertificados();
        // Inicializar estado com manifestação existente (se houver)
        if (existingManifestacao) {
            setTipo(existingManifestacao.tipo);
            if (existingManifestacao.tipo === 'nao_realizada') {
                setMotivo(existingManifestacao.motivo || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Sincronizar estado local quando manifestação failed carregar
    useEffect(() => {
        if (hasFailed && existingManifestacao) {
            setTipo(existingManifestacao.tipo);
            if (existingManifestacao.tipo === 'nao_realizada') {
                setMotivo(existingManifestacao.motivo || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasFailed, existingManifestacao?.id]);
    const { showSuccess, showError, showInfo } = useToast();
    // Limpar polling ao desmontar componente
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, []);
    // Função para verificar status da sincronização
    const checkSyncStatus = async (jobIdToCheck) => {
        // Evitar múltiplas execuções após job completar
        if (syncCompletedRef.current) {
            return;
        }
        try {
            const response = await verificarStatusSincronizacao(jobIdToCheck);
            const job = response.data;
            if (job.status === 'success' || job.status === 'failed') {
                // Marcar como completado ANTES de qualquer outra ação
                syncCompletedRef.current = true;
                // Job completado, parar polling IMEDIATAMENTE
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                setSincronizando(false);
                if (job.status === 'success') {
                    setUltimaSincronizacao(job.updated_at ? new Date(job.updated_at) : new Date());
                    const created = job.details?.created || 0;
                    const errors = job.details?.errors || [];
                    if (errors.length > 0) {
                        showError(`Sincronização com erros. ${errors.length} certificado(s) falharam.`);
                    }
                    else if (created > 0) {
                        showSuccess(`Sincronização concluída! ${created} nova(s) NFe(s) encontrada(s).`);
                    }
                    else {
                        showInfo('Sincronização concluída. Nenhuma NFe nova encontrada.');
                    }
                    // Atualizar apenas o histórico local desta NFe
                    // NÃO chamar onManifestado() - isso causaria reload completo
                    fetchHistory();
                }
                else {
                    showError('Sincronização falhou. Verifique os logs do servidor.');
                }
            }
        }
        catch (error) {
            console.error('Erro ao verificar status da sincronização:', error);
            // Não mostra erro ao usuário para não poluir a UI durante polling
        }
    };
    const handleSincronizar = async () => {
        // Limpar estado anterior
        syncCompletedRef.current = false;
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        setSincronizando(true);
        try {
            const response = await sincronizarNFesSefaz();
            const job = response.data;
            setJobId(job.job_id);
            showInfo('Sincronização com SEFAZ iniciada! Buscando NFes distribuídas...');
            // Iniciar polling a cada 3 segundos (mais conservador)
            pollingIntervalRef.current = setInterval(() => {
                checkSyncStatus(job.job_id);
            }, 3000);
            // Primeira verificação após 1 segundo
            setTimeout(() => checkSyncStatus(job.job_id), 1000);
        }
        catch (error) {
            console.error('Erro ao iniciar sincronização:', error);
            showError(error?.response?.data?.detail || 'Erro ao sincronizar com SEFAZ');
            setSincronizando(false);
        }
    };
    const getStatusLabel = (status, resposta_sefaz) => {
        switch (status) {
            case 'pending': return 'Processando...';
            case 'sent': return 'Manifestação aceita pela SEFAZ';
            case 'failed': {
                // Mensagem personalizada baseada na resposta
                const respostaText = formatRespostaSefaz(resposta_sefaz);
                if (respostaText.includes('Certificado A3') || respostaText.toLowerCase().includes('certificado')) {
                    return 'Rejeitado: Certificado A3 digital necessário';
                }
                return 'Manifestação rejeitada pela SEFAZ';
            }
            default: return status;
        }
    };
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = { tipo };
            if (tipo === 'nao_realizada')
                payload.motivo = motivo;
            if (selectedCertificadoId)
                payload.certificado_id = selectedCertificadoId;
            const response = await postManifestacao(nfeId, payload);
            // Prefer semantic fields from API
            const enqueued = response?.data?.enqueued || response?.status === 202;
            if (enqueued) {
                showInfo('Manifestação sendo processada... Aguarde a atualização.');
                // Iniciar polling para monitorar status em tempo real
                startPolling('pending');
            }
            else {
                showSuccess('Manifestação registrada com sucesso');
            }
            if (onManifestado)
                onManifestado();
            await fetchHistory();
        }
        catch (err) {
            showError(err?.response?.data?.detail || 'Erro ao manifestar');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs(Box, { sx: {
            bgcolor: 'primary.50',
            border: '2px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
            p: 2.5,
            mb: 3
        }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }, children: [_jsx(Typography, { variant: "h6", sx: { fontWeight: 700, color: 'primary.main' }, children: "\uD83D\uDCCB Manifesta\u00E7\u00E3o do Destinat\u00E1rio" }), _jsx(Chip, { label: "OBRIGAT\u00D3RIO", size: "small", color: "error", sx: { fontWeight: 600 } })] }), _jsxs(Alert, { severity: "warning", sx: { mb: 2, fontSize: '0.875rem', fontWeight: 500 }, children: [_jsx("strong", { children: "\u26A0\uFE0F ATEN\u00C7\u00C3O FISCAL:" }), " A manifesta\u00E7\u00E3o \u00E9 uma OBRIGA\u00C7\u00C3O LEGAL junto \u00E0 SEFAZ/Receita Federal. Registre sua resposta sobre esta opera\u00E7\u00E3o conforme exigido pela legisla\u00E7\u00E3o vigente (Ajuste SINIEF 07/2005, NT 2012.002).", _jsx("br", {}), _jsx("strong", { children: "N\u00E3o manifestar pode gerar multas e penalidades." })] }), _jsxs(Paper, { elevation: 3, sx: {
                    p: 2.5,
                    mb: 3,
                    bgcolor: isManifestado ? 'grey.50' : 'background.paper',
                    border: '1px solid',
                    borderColor: isManifestado ? 'success.main' : 'divider',
                    opacity: (isSent || isProcessing) ? 0.8 : 1
                }, children: [isManifestado && (_jsxs(Alert, { severity: isSent ? "success" : isProcessing ? "info" : hasFailed ? "error" : "warning", sx: { mb: 2, fontWeight: 500 }, children: [isSent && (_jsxs(_Fragment, { children: ["\u2705 Manifesta\u00E7\u00E3o \"", TIPO_MANIFESTACAO_CHOICES.find(t => t.value === existingManifestacao.tipo)?.label, "\" enviada para SEFAZ!", existingManifestacao?.resposta_sefaz && (_jsxs(_Fragment, { children: [_jsx("br", {}), _jsxs("small", { children: [_jsx("strong", { children: "SEFAZ:" }), " ", formatRespostaSefaz(existingManifestacao.resposta_sefaz)] })] }))] })), isProcessing && (_jsxs(_Fragment, { children: ["\uD83D\uDFE1 Manifesta\u00E7\u00E3o \"", TIPO_MANIFESTACAO_CHOICES.find(t => t.value === existingManifestacao.tipo)?.label, "\" sendo processada...", isPolling && (_jsxs(_Fragment, { children: [_jsx("br", {}), _jsx("small", { children: "\uD83D\uDD04 Monitorando status automaticamente..." })] }))] })), hasFailed && `❌ Erro no envio da manifestação. Você pode tentar novamente.`, !isSent && !isProcessing && !hasFailed && `🟡 Manifestação registrada.`] })), _jsxs(Typography, { variant: "subtitle2", sx: { mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: isManifestado && !hasFailed ? 'success.main' : 'text.primary' }, children: [isManifestado && !hasFailed ? '✅' : '🔔', isManifestado && !hasFailed ? 'Manifestação Já Registrada' : 'Registrar Nova Manifestação à SEFAZ'] }), !isManifestado && (() => {
                        const opcoesBloqueadas = TIPO_MANIFESTACAO_CHOICES.filter(t => !validateTipoDisponivel(t.value, history, nfeData?.data_emissao).disponivel);
                        const todasBloqueadas = opcoesBloqueadas.length === TIPO_MANIFESTACAO_CHOICES.length;
                        if (todasBloqueadas) {
                            return (_jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: [_jsx("strong", { children: "\u274C Nenhum tipo de manifesta\u00E7\u00E3o dispon\u00EDvel" }), _jsx("br", {}), "Todas as op\u00E7\u00F5es j\u00E1 foram utilizadas ou est\u00E3o fora do prazo permitido."] }));
                        }
                        else if (opcoesBloqueadas.length > 0) {
                            return (_jsxs(Alert, { severity: "info", sx: { mb: 2 }, children: [_jsx("strong", { children: "\u2139\uFE0F Algumas op\u00E7\u00F5es n\u00E3o est\u00E3o dispon\u00EDveis:" }), _jsx("br", {}), opcoesBloqueadas.map(t => {
                                        const validacao = validateTipoDisponivel(t.value, history, nfeData?.data_emissao);
                                        return (_jsxs("small", { children: ["\u2022 ", _jsxs("strong", { children: [t.label, ":"] }), " ", validacao.motivo, _jsx("br", {})] }, t.value));
                                    })] }));
                        }
                        return null;
                    })(), _jsxs(Box, { sx: { display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }, children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 220 }, children: [_jsx(InputLabel, { children: "Tipo de Manifesta\u00E7\u00E3o" }), _jsx(Select, { value: tipo, onChange: (e) => setTipo(e.target.value), label: "Tipo de Manifesta\u00E7\u00E3o", disabled: isSent || isProcessing, children: TIPO_MANIFESTACAO_CHOICES.map((t) => {
                                            const validacao = validateTipoDisponivel(t.value, history, nfeData?.data_emissao);
                                            const isDisabled = !validacao.disponivel;
                                            return (_jsxs(MenuItem, { value: t.value, disabled: isDisabled, sx: {
                                                    '&.Mui-disabled': {
                                                        opacity: 0.5,
                                                        textDecoration: 'line-through'
                                                    }
                                                }, children: [t.label, isDisabled && ' 🚫'] }, t.value));
                                        }) })] }), tipo === 'nao_realizada' && (_jsx(TextField, { size: "small", placeholder: "Motivo obrigat\u00F3rio", value: motivo, onChange: (e) => setMotivo(e.target.value), sx: { flex: 1, minWidth: 200 }, required: true, disabled: isSent || isProcessing })), !isSent && !isProcessing ? (_jsx(Box, { sx: { flex: 1, minWidth: 250, display: 'flex', alignItems: 'center', gap: 1 }, children: loadingCerts ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CircularProgress, { size: 20 }), _jsx(Typography, { variant: "caption", children: "Carregando certificados..." })] })) : certificados.length === 0 ? (_jsxs(Alert, { severity: "warning", sx: { width: '100%', py: 0.5 }, children: [_jsx("strong", { children: "\u26A0\uFE0F Nenhum certificado digital v\u00E1lido encontrado." }), _jsx("br", {}), _jsx("small", { children: "Fa\u00E7a upload de um certificado v\u00E1lido antes de manifestar." })] })) : certificados.length === 1 ? (_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { color: "success", fontSize: "small" }), _jsx(Chip, { label: `${certificados[0].nome}`, color: "success", size: "small", icon: _jsx(CheckCircleIcon, {}) }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "(cert. selecionado)" })] })) : (_jsxs(FormControl, { size: "small", sx: { minWidth: 250 }, children: [_jsx(InputLabel, { children: "Certificado Digital *" }), _jsx(Select, { value: selectedCertificadoId || '', onChange: (e) => setSelectedCertificadoId(e.target.value), label: "Certificado Digital *", required: true, children: certificados.map((cert) => (_jsx(MenuItem, { value: cert.id, disabled: cert.apto_manifestacao === false, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(SecurityIcon, { fontSize: "small", color: cert.apto_manifestacao === false ? 'warning' : 'success' }), cert.nome, cert.tipo_certificado && (_jsx(Chip, { label: cert.tipo_certificado, size: "small", variant: "outlined", color: cert.apto_manifestacao ? 'success' : 'warning', sx: { height: 20, fontSize: '0.7rem' } })), cert.validade && (_jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["(at\u00E9 ", new Date(cert.validade).toLocaleDateString('pt-BR'), ")"] })), cert.apto_manifestacao === false && (_jsx(Typography, { variant: "caption", color: "warning.main", children: "(e-CPF \u2014 n\u00E3o manifesta)" }))] }) }, cert.id))) })] })) })) : null, _jsxs(Button, { variant: "contained", size: "medium", disabled: loading ||
                                    isSent ||
                                    isProcessing ||
                                    !tipo ||
                                    (tipo === 'nao_realizada' && !motivo.trim()) ||
                                    !selectedCertificadoId || // Sempre exigir certificado selecionado
                                    !validateTipoDisponivel(tipo, history, nfeData?.data_emissao).disponivel, onClick: handleSubmit, color: (isSent || isProcessing) && !hasFailed ? "success" : "primary", sx: {
                                    minWidth: 140,
                                    fontWeight: 600,
                                    bgcolor: (isSent || isProcessing) && !hasFailed ? 'success.main' : 'primary.main',
                                    '&:hover': {
                                        bgcolor: (isSent || isProcessing) && !hasFailed ? 'success.dark' : 'primary.dark'
                                    }
                                }, children: [loading ? _jsx(CircularProgress, { size: 20, sx: { mr: 1 } }) : null, loading ? 'Enviando à SEFAZ...' :
                                        (isSent || isProcessing) && !hasFailed ? '✅ Já Manifestado' :
                                            hasFailed ? '🔄 Tentar Novamente' :
                                                '✉️ Enviar Manifestação'] })] })] }), _jsx(Paper, { elevation: 2, sx: { p: 2, mb: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.light' }, children: _jsxs(Box, { sx: { display: 'flex', alignItems: 'flex-start', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }, children: [_jsxs(Box, { sx: { flex: 1 }, children: [_jsxs(Typography, { variant: "subtitle2", sx: { fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }, children: [_jsx(CloudDownloadIcon, { fontSize: "small" }), "Consultar SEFAZ"] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: ["Busca manifesta\u00E7\u00F5es registradas diretamente no portal da SEFAZ. \u00DAtil se voc\u00EA manifestou em outro sistema ou quer confirmar o status oficial.", ultimaSincronizacao && (_jsxs(_Fragment, { children: [_jsx("br", {}), _jsx("strong", { children: "\u00DAltima sincroniza\u00E7\u00E3o:" }), " ", ultimaSincronizacao.toLocaleString('pt-BR')] }))] })] }), _jsx(Button, { variant: "outlined", size: "small", startIcon: sincronizando ? _jsx(CircularProgress, { size: 16 }) : _jsx(SyncIcon, {}), onClick: handleSincronizar, disabled: sincronizando, sx: { minWidth: 140 }, children: sincronizando ? 'Sincronizando...' : 'Sincronizar' })] }) }), history.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Divider, { sx: { my: 2 } }), _jsxs(Typography, { variant: "subtitle2", sx: { mb: 2, fontWeight: 600 }, children: ["Hist\u00F3rico de Manifesta\u00E7\u00F5es (", history.length, ")"] }), _jsx(Timeline, { sx: { p: 0, m: 0 }, children: history.map((h, idx) => {
                            const statusConfig = getStatusConfig(h.status_envio, h.resposta_sefaz);
                            const isLast = idx === history.length - 1;
                            return (_jsxs(TimelineItem, { children: [_jsx(TimelineOppositeContent, { sx: { flex: 0.3, py: 1 }, color: "text.secondary", variant: "caption", children: formatDateTime(h.criado_em) }), _jsxs(TimelineSeparator, { children: [_jsx(TimelineDot, { color: statusConfig.color, variant: "outlined", children: statusConfig.icon }), !isLast && _jsx(TimelineConnector, {})] }), _jsxs(TimelineContent, { sx: { py: 1, px: 2 }, children: [_jsxs(Box, { sx: { display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600 }, children: getTipoLabel(h.tipo) }), _jsx(Chip, { label: statusConfig.label, size: "small", color: statusConfig.color, variant: "outlined" })] }), h.motivo && (_jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: ["Motivo: ", h.motivo] })), h.enviado_em && (_jsxs(Typography, { variant: "caption", color: "text.secondary", display: "block", children: ["Enviado em: ", formatDateTime(h.enviado_em)] }))] })] }, h.id));
                        }) })] })), history.length === 0 && (_jsxs(Paper, { variant: "outlined", sx: { p: 3, textAlign: 'center', bgcolor: 'background.default' }, children: [_jsx(InfoIcon, { sx: { color: 'text.secondary', fontSize: '3rem', mb: 1.5 } }), _jsx(Typography, { variant: "h6", color: "text.primary", sx: { mb: 1, fontWeight: 600 }, children: "Nenhuma manifesta\u00E7\u00E3o registrada ainda" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 1.5 }, children: "Esta nota fiscal ainda n\u00E3o possui registros de manifesta\u00E7\u00E3o neste sistema." }), _jsxs(Box, { sx: { p: 2, bgcolor: 'info.lighter', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }, children: [_jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { display: 'block', mb: 1 }, children: [_jsx("strong", { children: "\uD83D\uDCA1 Nota:" }), " Se voc\u00EA j\u00E1 manifestou no portal da SEFAZ ou em outro sistema, use o bot\u00E3o ", _jsx("strong", { children: "\"Sincronizar\"" }), " acima para buscar essas informa\u00E7\u00F5es."] }), _jsx(Typography, { variant: "caption", color: "text.secondary", children: "Caso contr\u00E1rio, registre sua manifesta\u00E7\u00E3o usando o formul\u00E1rio acima (obrigat\u00F3rio por lei)." })] })] }))] }));
};
export default ManifestacaoNota;
