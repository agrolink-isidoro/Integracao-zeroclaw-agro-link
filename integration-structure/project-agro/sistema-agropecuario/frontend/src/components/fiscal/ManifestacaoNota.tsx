import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { postManifestacao, listManifestacoesForNfe, listCertificados, sincronizarNFesSefaz, verificarStatusSincronizacao } from '../../services/fiscal';
import type { CertificadoSefaz, SincronizacaoJob } from '../../services/fiscal';
import { useManifestacaoPolling } from '../../hooks/useManifestacaoPolling';
import { TIPO_MANIFESTACAO_CHOICES } from '../../utils/constants';
import { useToast } from '@/hooks/useToast';
import Tooltip from '@mui/material/Tooltip';

// Helper para formatar data/hora
const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

// Helper para obter label do tipo
const getTipoLabel = (tipo: string): string => {
  const choice = TIPO_MANIFESTACAO_CHOICES.find((c) => c.value === tipo);
  return choice?.label || tipo;
};

// Normaliza a resposta da SEFAZ para string legível no UI
const formatRespostaSefaz = (resposta: any): string => {
  if (resposta === null || resposta === undefined) return '';
  if (typeof resposta === 'string') return resposta;
  if (typeof resposta === 'object') {
    if ('message' in resposta && resposta.message) return String(resposta.message);
    if ('cStat' in resposta) {
      const msg = resposta.message ? ` - ${String(resposta.message)}` : '';
      return `${String(resposta.cStat)}${msg}`;
    }
    try {
      return JSON.stringify(resposta);
    } catch {
      return String(resposta);
    }
  }
  return String(resposta);
};

// Helper para status visual
const getStatusConfig = (status: string, resposta_sefaz?: any) => {
  switch (status) {
    case 'sent':
      return {
        icon: <CheckCircleIcon fontSize="small" />,
        color: 'success' as const,
        label: 'Aceito pela SEFAZ',
      };
    case 'failed':
      // Personalizar mensagem baseada na resposta SEFAZ (normalizar primeiro)
      const respostaText = formatRespostaSefaz(resposta_sefaz);
      const isA3Required = respostaText.includes('Certificado A3') || respostaText.toLowerCase().includes('certificado');
      return {
        icon: <ErrorIcon fontSize="small" />,
        color: 'error' as const,
        label: isA3Required ? 'Certificado A3 Necessário' : 'Rejeitado pela SEFAZ',
      };
    default: // pending
      return {
        icon: <PendingIcon fontSize="small" />,
        color: 'warning' as const,
        label: 'Processando...',
      };
  }
};

// Helper para validar se tipo de manifestação está disponível
const validateTipoDisponivel = (tipoValue: string, historico: any[], nfeDataEmissao?: string) => {
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

const ManifestacaoNota: React.FC<{ nfeId: number; nfeData?: any; onManifestado?: () => void }> = ({ nfeId, nfeData, onManifestado }) => {
  // Por questões legais a funcionalidade de manifestação deve ser visível por padrão.
  // Respeitar variável de ambiente somente se explicitamente definida para 'false'.
  const enabled = (import.meta.env.VITE_FISCAL_MANIFESTACAO_ENABLED || 'true') !== 'false';
  const [tipo, setTipo] = useState<string>('confirmacao');
  const [motivo, setMotivo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  // Estados para certificados
  const [certificados, setCertificados] = useState<CertificadoSefaz[]>([]);
  const [selectedCertificadoId, setSelectedCertificadoId] = useState<number | null>(null);
  const [loadingCerts, setLoadingCerts] = useState(false);
  
  // Estados para sincronização SEFAZ
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncCompletedRef = useRef(false);

  // Verificar se já existe manifestação (qualquer status)
  const existingManifestacao = nfeData?.manifestacoes && nfeData.manifestacoes.length > 0 
    ? nfeData.manifestacoes.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0]
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
      if (onManifestado) onManifestado();
      fetchHistory();
      showInfo(`Status da manifestação atualizado: ${getStatusLabel(newStatus, undefined)}`);
    }
  });

  if (!enabled) return null;

  const fetchCertificados = async () => {
    try {
      setLoadingCerts(true);
      const response = await listCertificados();
      const certs = response.data?.results || response.data || [];
      
      // Filtrar apenas certificados válidos (não expirados) e aptos para manifestação
      const validCerts = certs.filter((cert: CertificadoSefaz) => {
        if (!cert.validade) return true;
        const validadeDate = new Date(cert.validade);
        return validadeDate >= new Date();
      });
      // Prioritize certs that are apto_manifestacao, but keep all valid for display
      const aptoCerts = validCerts.filter((c: CertificadoSefaz) => c.apto_manifestacao !== false);
      setCertificados(validCerts);
      
      // Se houver apenas 1 certificado apto, selecionar automaticamente
      if (aptoCerts.length === 1) {
        setSelectedCertificadoId(aptoCerts[0].id);
      } else if (validCerts.length === 1) {
        setSelectedCertificadoId(validCerts[0].id);
      }
    } catch (error) {
      console.error('Erro ao buscar certificados:', error);
      showError('Erro ao carregar certificados digitais');
    } finally {
      setLoadingCerts(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const r = await listManifestacoesForNfe(nfeId);
      setHistory(r.data.results || []);
    } catch (e) {
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
  const checkSyncStatus = async (jobIdToCheck: number) => {
    // Evitar múltiplas execuções após job completar
    if (syncCompletedRef.current) {
      return;
    }

    try {
      const response = await verificarStatusSincronizacao(jobIdToCheck);
      const job: SincronizacaoJob = response.data;
      
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
          } else if (created > 0) {
            showSuccess(`Sincronização concluída! ${created} nova(s) NFe(s) encontrada(s).`);
          } else {
            showInfo('Sincronização concluída. Nenhuma NFe nova encontrada.');
          }
          
          // Atualizar apenas o histórico local desta NFe
          // NÃO chamar onManifestado() - isso causaria reload completo
          fetchHistory();
        } else {
          showError('Sincronização falhou. Verifique os logs do servidor.');
        }
      }
    } catch (error: any) {
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
      const job: SincronizacaoJob = response.data;
      setJobId(job.job_id);
      
      showInfo('Sincronização com SEFAZ iniciada! Buscando NFes distribuídas...');
      
      // Iniciar polling a cada 3 segundos (mais conservador)
      pollingIntervalRef.current = setInterval(() => {
        checkSyncStatus(job.job_id);
      }, 3000);
      
      // Primeira verificação após 1 segundo
      setTimeout(() => checkSyncStatus(job.job_id), 1000);
      
    } catch (error: any) {
      console.error('Erro ao iniciar sincronização:', error);
      showError(error?.response?.data?.detail || 'Erro ao sincronizar com SEFAZ');
      setSincronizando(false);
    }
  };

  const getStatusLabel = (status: string, resposta_sefaz?: any): string => {
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
      const payload: any = { tipo };
      if (tipo === 'nao_realizada') payload.motivo = motivo;
      if (selectedCertificadoId) payload.certificado_id = selectedCertificadoId;
      
      const response = await postManifestacao(nfeId, payload);

      // Prefer semantic fields from API
      const enqueued = response?.data?.enqueued || response?.status === 202;
      if (enqueued) {
        showInfo('Manifestação sendo processada... Aguarde a atualização.');
        // Iniciar polling para monitorar status em tempo real
        startPolling('pending');
      } else {
        showSuccess('Manifestação registrada com sucesso');
      }

      if (onManifestado) onManifestado();
      await fetchHistory();
    } catch (err: any) {
      showError(err?.response?.data?.detail || 'Erro ao manifestar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      bgcolor: 'primary.50', 
      border: '2px solid', 
      borderColor: 'primary.main', 
      borderRadius: 2, 
      p: 2.5,
      mb: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          📋 Manifestação do Destinatário
        </Typography>
        <Chip label="OBRIGATÓRIO" size="small" color="error" sx={{ fontWeight: 600 }} />
      </Box>
      <Alert severity="warning" sx={{ mb: 2, fontSize: '0.875rem', fontWeight: 500 }}>
        <strong>⚠️ ATENÇÃO FISCAL:</strong> A manifestação é uma OBRIGAÇÃO LEGAL junto à SEFAZ/Receita Federal. 
        Registre sua resposta sobre esta operação conforme exigido pela legislação vigente (Ajuste SINIEF 07/2005, NT 2012.002).
        <br /><strong>Não manifestar pode gerar multas e penalidades.</strong>
      </Alert>

      {/* Formulário de Nova Manifestação */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2.5, 
          mb: 3, 
          bgcolor: isManifestado ? 'grey.50' : 'background.paper',
          border: '1px solid',
          borderColor: isManifestado ? 'success.main' : 'divider',
          opacity: (isSent || isProcessing) ? 0.8 : 1
        }}
      >
        {/* Mostrar status da manifestação existente */}
        {isManifestado && (
          <Alert 
            severity={isSent ? "success" : isProcessing ? "info" : hasFailed ? "error" : "warning"} 
            sx={{ mb: 2, fontWeight: 500 }}
          >
            {isSent && (
              <>
                ✅ Manifestação "{TIPO_MANIFESTACAO_CHOICES.find(t => t.value === existingManifestacao.tipo)?.label}" enviada para SEFAZ!
                {existingManifestacao?.resposta_sefaz && (
                  <>
                    <br />
                    <small><strong>SEFAZ:</strong> {formatRespostaSefaz(existingManifestacao.resposta_sefaz)}</small>
                  </>
                )}
              </>
            )}
            {isProcessing && (
              <>
                🟡 Manifestação "{TIPO_MANIFESTACAO_CHOICES.find(t => t.value === existingManifestacao.tipo)?.label}" sendo processada...
                {isPolling && (
                  <>
                    <br />
                    <small>🔄 Monitorando status automaticamente...</small>
                  </>
                )}
              </>
            )}
            {hasFailed && `❌ Erro no envio da manifestação. Você pode tentar novamente.`}
            {!isSent && !isProcessing && !hasFailed && `🟡 Manifestação registrada.`}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: isManifestado && !hasFailed ? 'success.main' : 'text.primary' }}>
          {isManifestado && !hasFailed ? '✅' : '🔔'} 
          {isManifestado && !hasFailed ? 'Manifestação Já Registrada' : 'Registrar Nova Manifestação à SEFAZ'}
        </Typography>

        {/* Alerta de opções indisponíveis */}
        {!isManifestado && (() => {
          const opcoesBloqueadas = TIPO_MANIFESTACAO_CHOICES.filter(t => 
            !validateTipoDisponivel(t.value, history, nfeData?.data_emissao).disponivel
          );
          const todasBloqueadas = opcoesBloqueadas.length === TIPO_MANIFESTACAO_CHOICES.length;
          
          if (todasBloqueadas) {
            return (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>❌ Nenhum tipo de manifestação disponível</strong>
                <br />
                Todas as opções já foram utilizadas ou estão fora do prazo permitido.
              </Alert>
            );
          } else if (opcoesBloqueadas.length > 0) {
            return (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>ℹ️ Algumas opções não estão disponíveis:</strong>
                <br />
                {opcoesBloqueadas.map(t => {
                  const validacao = validateTipoDisponivel(t.value, history, nfeData?.data_emissao);
                  return (
                    <small key={t.value}>
                      • <strong>{t.label}:</strong> {validacao.motivo}
                      <br />
                    </small>
                  );
                })}
              </Alert>
            );
          }
          return null;
        })()}

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Tipo de Manifestação</InputLabel>
            <Select 
              value={tipo} 
              onChange={(e) => setTipo(e.target.value)} 
              label="Tipo de Manifestação"
              disabled={isSent || isProcessing}
            >
              {TIPO_MANIFESTACAO_CHOICES.map((t) => {
                const validacao = validateTipoDisponivel(t.value, history, nfeData?.data_emissao);
                const isDisabled = !validacao.disponivel;
                
                return (
                  <MenuItem 
                    key={t.value}
                    value={t.value} 
                    disabled={isDisabled}
                    sx={{
                      '&.Mui-disabled': {
                        opacity: 0.5,
                        textDecoration: 'line-through'
                      }
                    }}
                  >
                    {t.label}
                    {isDisabled && ' 🚫'}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {tipo === 'nao_realizada' && (
            <TextField
              size="small"
              placeholder="Motivo obrigatório"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              required
              disabled={isSent || isProcessing}
            />
          )}

          {/* Seleção de Certificado Digital */}
          {!isSent && !isProcessing ? (
            <Box sx={{ flex: 1, minWidth: 250, display: 'flex', alignItems: 'center', gap: 1 }}>
              {loadingCerts ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption">Carregando certificados...</Typography>
                </Box>
              ) : certificados.length === 0 ? (
                <Alert severity="warning" sx={{ width: '100%', py: 0.5 }}>
                  <strong>⚠️ Nenhum certificado digital válido encontrado.</strong> 
                  <br />
                  <small>Faça upload de um certificado válido antes de manifestar.</small>
                </Alert>
              ) : certificados.length === 1 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon color="success" fontSize="small" />
                  <Chip 
                    label={`${certificados[0].nome}`}
                    color="success"
                    size="small"
                    icon={<CheckCircleIcon />}
                  />
                  <Typography variant="caption" color="text.secondary">
                    (cert. selecionado)
                  </Typography>
                </Box>
              ) : (
                <FormControl size="small" sx={{ minWidth: 250 }}>
                  <InputLabel>Certificado Digital *</InputLabel>
                  <Select
                    value={selectedCertificadoId || ''}
                    onChange={(e) => setSelectedCertificadoId(e.target.value as number)}
                    label="Certificado Digital *"
                    required
                  >
                    {certificados.map((cert) => (
                      <MenuItem
                        key={cert.id}
                        value={cert.id}
                        disabled={cert.apto_manifestacao === false}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <SecurityIcon
                            fontSize="small"
                            color={cert.apto_manifestacao === false ? 'warning' : 'success'}
                          />
                          {cert.nome}
                          {cert.tipo_certificado && (
                            <Chip
                              label={cert.tipo_certificado}
                              size="small"
                              variant="outlined"
                              color={cert.apto_manifestacao ? 'success' : 'warning'}
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          )}
                          {cert.validade && (
                            <Typography variant="caption" color="text.secondary">
                              (até {new Date(cert.validade).toLocaleDateString('pt-BR')})
                            </Typography>
                          )}
                          {cert.apto_manifestacao === false && (
                            <Typography variant="caption" color="warning.main">
                              (e-CPF — não manifesta)
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          ) : null}

          <Button
            variant="contained"
            size="medium"
            disabled={
              loading || 
              isSent ||
              isProcessing ||
              !tipo ||
              (tipo === 'nao_realizada' && !motivo.trim()) ||
              !selectedCertificadoId ||  // Sempre exigir certificado selecionado
              !validateTipoDisponivel(tipo, history, nfeData?.data_emissao).disponivel
            }
            onClick={handleSubmit}
            color={(isSent || isProcessing) && !hasFailed ? "success" : "primary"}
            sx={{ 
              minWidth: 140,
              fontWeight: 600,
              bgcolor: (isSent || isProcessing) && !hasFailed ? 'success.main' : 'primary.main',
              '&:hover': { 
                bgcolor: (isSent || isProcessing) && !hasFailed ? 'success.dark' : 'primary.dark'
              }
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            {loading ? 'Enviando à SEFAZ...' : 
             (isSent || isProcessing) && !hasFailed ? '✅ Já Manifestado' :
             hasFailed ? '🔄 Tentar Novamente' :
             '✉️ Enviar Manifestação'}
          </Button>
        </Box>
      </Paper>

      {/* Sincronização com SEFAZ */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'info.lighter', border: '1px solid', borderColor: 'info.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudDownloadIcon fontSize="small" />
              Consultar SEFAZ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Busca manifestações registradas diretamente no portal da SEFAZ. 
              Útil se você manifestou em outro sistema ou quer confirmar o status oficial.
              {ultimaSincronizacao && (
                <>
                  <br />
                  <strong>Última sincronização:</strong> {ultimaSincronizacao.toLocaleString('pt-BR')}
                </>
              )}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={sincronizando ? <CircularProgress size={16} /> : <SyncIcon />}
            onClick={handleSincronizar}
            disabled={sincronizando}
            sx={{ minWidth: 140 }}
          >
            {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
        </Box>
      </Paper>

      {/* Histórico de Manifestações */}
      {history.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Histórico de Manifestações ({history.length})
          </Typography>
          <Timeline sx={{ p: 0, m: 0 }}>
            {history.map((h, idx) => {
              const statusConfig = getStatusConfig(h.status_envio, h.resposta_sefaz);
              const isLast = idx === history.length - 1;

              return (
                <TimelineItem key={h.id}>
                  <TimelineOppositeContent
                    sx={{ flex: 0.3, py: 1 }}
                    color="text.secondary"
                    variant="caption"
                  >
                    {formatDateTime(h.criado_em)}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot color={statusConfig.color} variant="outlined">
                      {statusConfig.icon}
                    </TimelineDot>
                    {!isLast && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent sx={{ py: 1, px: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getTipoLabel(h.tipo)}
                      </Typography>
                      <Chip
                        label={statusConfig.label}
                        size="small"
                        color={statusConfig.color}
                        variant="outlined"
                      />
                    </Box>
                    {h.motivo && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Motivo: {h.motivo}
                      </Typography>
                    )}
                    {h.enviado_em && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Enviado em: {formatDateTime(h.enviado_em)}
                      </Typography>
                    )}
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        </>
      )}

      {history.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
          <InfoIcon sx={{ color: 'text.secondary', fontSize: '3rem', mb: 1.5 }} />
          <Typography variant="h6" color="text.primary" sx={{ mb: 1, fontWeight: 600 }}>
            Nenhuma manifestação registrada ainda
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Esta nota fiscal ainda não possui registros de manifestação neste sistema.
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1, border: '1px solid', borderColor: 'info.light' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              <strong>💡 Nota:</strong> Se você já manifestou no portal da SEFAZ ou em outro sistema,
              use o botão <strong>"Sincronizar"</strong> acima para buscar essas informações.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Caso contrário, registre sua manifestação usando o formulário acima (obrigatório por lei).
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ManifestacaoNota;
