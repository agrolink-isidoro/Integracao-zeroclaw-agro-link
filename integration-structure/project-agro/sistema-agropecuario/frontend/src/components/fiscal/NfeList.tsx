import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Toolbar,
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
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
const formatCurrency = (value: any): string => {
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
const getManifestacaoChip = (nfe: any) => {
  if (!nfe.manifestacoes || nfe.manifestacoes.length === 0) {
    return {
      icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
      label: 'Sem Manifestação',
      color: 'warning' as const,
    };
  }
  
  // Pegar a manifestação mais recente (independente do status SEFAZ)
  const manifestacaoRecente = nfe.manifestacoes
    .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
  
  if (!manifestacaoRecente) {
    return {
      icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
      label: 'Sem Manifestação',
      color: 'warning' as const,
    };
  }
  
  // Determinar status baseado no tipo e status de envio
  const statusEnvio = manifestacaoRecente.status_envio;
  const tipoManifestacao = manifestacaoRecente.tipo;
  
  // Se está pending/failed, mostrar status de processamento
  if (statusEnvio === 'pending') {
    return {
      icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
      label: 'Processando...',
      color: 'info' as const,
    };
  }
  if (statusEnvio === 'failed') {
    return {
      icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
      label: 'Erro Envio',
      color: 'error' as const,
    };
  }
  
  // Se foi enviada com sucesso, mostrar o tipo específico
  switch (tipoManifestacao) {
    case 'confirmacao':
      return {
        icon: <CheckCircleIcon sx={{ fontSize: '1rem' }} />,
        label: 'Confirmada',
        color: 'success' as const,
      };
    case 'ciencia':
      return {
        icon: <CheckCircleIcon sx={{ fontSize: '1rem' }} />,
        label: 'Ciência',
        color: 'info' as const,
      };
    default:
      return {
        icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
        label: tipoManifestacao,
        color: 'error' as const,
      };
  }
};

// Helper para determinar status de estoque (processo interno)
const getStatusChip = (nfe: any) => {
  if (nfe.estoque_confirmado) {
    return {
      icon: <CheckCircleIcon sx={{ fontSize: '1rem' }} />,
      label: 'Estoque OK',
      color: 'success' as const,
      variant: 'filled' as const
    };
  }
  return {
    icon: <WarningIcon sx={{ fontSize: '1rem' }} />,
    label: 'Aguardando',
    color: 'default' as const,
    variant: 'outlined' as const
  };
};

interface NfeListProps {
  /**
   * When true, NfeList will show remote NFes only (force remote mode).
   * When omitted, the component allows toggling between local and remote using the filter.
   */
  forceRemote?: boolean;
  /**
   * When true, NfeList will show local NFes only (force local mode).
   */
  forceLocal?: boolean;
}

type NfeListPropsExtended = NfeListProps & { autoOpenEditNfeId?: number | null };

const NfeList: React.FC<NfeListPropsExtended> = ({ forceRemote = false, forceLocal = false, autoOpenEditNfeId = null }) => {
  const [nfes, setNfes] = useState<any[]>([]);
  const [remoteNfes, setRemoteNfes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showRemote, setShowRemote] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedRemoteNfe, setSelectedRemoteNfe] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNfeId, setEditNfeId] = useState<number | null>(null);
  const [rowActionAnchor, setRowActionAnchor] = useState<null | HTMLElement>(null);
  const [rowActionTargetId, setRowActionTargetId] = useState<number | null>(null);
  const [rowLoading, setRowLoading] = useState<Record<number, boolean>>({});
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
      } else {
        loadLocalNfes();
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showRemote]);

  const loadLocalNfes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await listNfes(params);
      setNfes(response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to load NFes:', err);
      setNfes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRemoteNfes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await listNfesRemoto(params);
      setRemoteNfes(response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to load remote NFes:', err);
      setRemoteNfes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRemote = (isRemote: boolean) => {
    setShowRemote(isRemote);
    setSelected(null); // Clear selection when toggling
  };

  const handleImportClick = (nfe: any) => {
    setSelectedRemoteNfe(nfe);
    setAutoManifestAfterImport(false);
    setImportModalOpen(true);
  };

  const handleImportSuccess = (importedNfe: any): void => {
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
          } catch (err: any) {
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
  const handleImportThenManifest = async (remoteNfe: any, tipo: string) => {
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
      } catch (err: any) {
        showError(err?.response?.data?.detail || 'Erro ao criar manifestação');
      }
    } catch (err: any) {
      console.error('Erro ao importar/manifestar:', err);
      showError(err?.response?.data?.detail || 'Erro ao importar NFe');
    } finally {
      setRowLoading((s) => ({ ...s, [remoteId]: false }));
    }
  };

  return (
    <Box sx={{ pt: 2, pb: 2, px: 0 }}>
      <Typography variant="h5" sx={{ mb: 0 }}>
        Notas Fiscais
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 0 }}>
        <Box sx={{ width: { xs: '100%', sm: 420 } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por número, chave, emitente, produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Filter Bar */}
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* If forced to remote mode, show badge; if forced local, hide filter entirely. */}
          {!forceLocal && !forceRemote && (
            <>
              <NFeRemoteFilter
                showRemote={showRemote}
                onToggle={handleToggleRemote}
                remoteCount={remoteNfes.length}
              />
              {showRemote && remoteNfes.length > 0 && (
                <Chip label={`${remoteNfes.length} remotas`} color="primary" variant="outlined" />
              )}
            </>
          )}


          {/* Explicit action to ask server (SEFAZ) to list available remote NFes */}
          {(showRemote || forceRemote) && (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<CloudDownloadIcon />}
              onClick={async () => {
                try {
                  const jobResp = await sincronizarNFesSefaz();
                  const jobId = jobResp.data?.job_id;
                  showSuccess('Solicitação enviada. Aguardando listagem...');

                  if (jobId) {
                    // Poll for job completion (simple implementation)
                    let attempts = 0;
                    const maxAttempts = 20;
                    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
                    while (attempts < maxAttempts) {
                      const statusResp = await verificarStatusSincronizacao(jobId);
                      const status = statusResp.data?.status;
                      if (status === 'success' || status === 'failed') break;
                      attempts++;
                      await delay(1500);
                    }
                  }

                  // Reload remote list
                  await loadRemoteNfes();
                  showSuccess('Listagem remota atualizada');
                } catch (err: any) {
                  console.error('Erro ao solicitar listagem remota:', err);
                  showError(err?.response?.data?.detail || 'Erro ao listar NFes remotas');
                }
              }}
            >
  LISTAR NFES REMOTAS
            </Button>
          )}
        </Box>
      </Toolbar>



      {/* Content */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && currentNfes.length === 0 && (
        <Alert severity="info">
          {showRemote
            ? 'Nenhuma NFe remota disponível. Verifique a sincronização com a SEFAZ.'
            : 'Nenhuma NFe local registrada.'}
        </Alert>
      )}

      {/* Alerta de Manifestações Pendentes */}
      {!loading && currentNfes.length > 0 && (() => {
        const nfesSemManifestacao = currentNfes.filter(nfe => 
          !nfe.manifestacoes || 
          nfe.manifestacoes.length === 0 ||
          !nfe.manifestacoes.some((m: any) => m.status_envio === 'sent')
        );
        
        if (nfesSemManifestacao.length > 0) {
          return (
            <Alert severity="warning" sx={{ mb: 2, fontWeight: 500 }}>
              <strong>⚠️ OBRIGAÇÃO FISCAL PENDENTE:</strong> {nfesSemManifestacao.length} NFe(s) sem manifestação à SEFAZ.
              <br />
              <Typography variant="caption">
                Clique em uma NFe para abrir os detalhes e registrar a manifestação obrigatória.
                Não manifestar pode resultar em multas fiscais.
              </Typography>
            </Alert>
          );
        }
        return null;
      })()}

      {!loading && currentNfes.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.light' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Manifestação</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Estoque</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Chave</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Valor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Emitente</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentNfes.map((nfe) => {
                    const manifestacaoChip = getManifestacaoChip(nfe);
                    const statusChip = getStatusChip(nfe);
                    return (
                      <TableRow
                        key={nfe.id}
                        selected={selected === nfe.id}
                        hover
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                        onClick={() => setSelected(nfe.id)}
                      >
                        <TableCell>
                          <Chip
                            icon={manifestacaoChip.icon}
                            label={manifestacaoChip.label}
                            color={manifestacaoChip.color}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={statusChip.icon}
                            label={statusChip.label}
                            color={statusChip.color}
                            variant={statusChip.variant}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {nfe.chave_acesso?.substring(0, 12)}...
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>
                          R$ {formatCurrency(nfe.valor_nota || nfe.valor).replace('.', ',')}
                        </TableCell>
                        <TableCell sx={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {nfe.emitente_nome}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {showRemote && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<CloudDownloadIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImportClick(nfe);
                                  }}
                                >
                                  Importar XML
                                </Button>

                                {/* Manifest action menu for remote NFes */}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="secondary"
                                  disabled={!!rowLoading[nfe.id]}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRowActionAnchor(e.currentTarget as HTMLElement);
                                    setRowActionTargetId(nfe.id);
                                  }}
                                >
                                  {rowLoading[nfe.id] ? (
                                    <CircularProgress size={18} />
                                  ) : 'Manifestar'}
                                </Button>

                                <Menu
                                  anchorEl={rowActionAnchor}
                                  open={Boolean(rowActionAnchor) && rowActionTargetId === nfe.id}
                                  onClose={() => { setRowActionAnchor(null); setRowActionTargetId(null); }}
                                >
                                  <MenuItem onClick={async (e) => {
                                    e.stopPropagation();
                                    setRowActionAnchor(null);
                                    // Trigger import then create manifestacao (tipo: ciencia)
                                    await handleImportThenManifest(nfe, 'ciencia');
                                  }}>Ciência</MenuItem>
                                  <MenuItem onClick={async (e) => {
                                    e.stopPropagation();
                                    setRowActionAnchor(null);
                                    await handleImportThenManifest(nfe, 'confirmacao');
                                  }}>Confirmação</MenuItem>
                                  <MenuItem onClick={async (e) => {
                                    e.stopPropagation();
                                    setRowActionAnchor(null);
                                    await handleImportThenManifest(nfe, 'desconhecimento');
                                  }}>Desconhecimento</MenuItem>
                                  <MenuItem onClick={async (e) => {
                                    e.stopPropagation();
                                    setRowActionAnchor(null);
                                    await handleImportThenManifest(nfe, 'nao_realizada');
                                  }}>Operação Não Realizada</MenuItem>
                                </Menu>
                              </>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<OpenInNewIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(nfe.id);
                              }}
                            >
                              Abrir
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditNfeId(nfe.id);
                                setEditModalOpen(true);
                              }}
                            >
                              Editar Valores
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Detail Panel */}
          <Box sx={{ display: selected ? 'block' : 'none', width: { xs: '100%', md: 380 } }}>
            {selected && (
              <NfeDetail 
                key={refreshDetail}
                id={selected} 
                onClose={() => setSelected(null)}
                onUpdate={loadLocalNfes}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Import Modal */}
      {selectedRemoteNfe && (
        <ImportModalStepper
          nfeRemote={selectedRemoteNfe}
          open={importModalOpen}
          onSuccess={handleImportSuccess}
          onClose={() => {
            setImportModalOpen(false);
            setSelectedRemoteNfe(null);
          }}
        />
      )}

      {/* Edit modal for invoice item adjustments */}
      <NfeEditModal
        open={editModalOpen}
        nfeId={editNfeId}
        onClose={() => {
          setEditModalOpen(false);
          setEditNfeId(null);
        }}
        onSaved={() => {
          showSuccess('Alterações aplicadas. Atualizando lista...');
          loadLocalNfes();
        }}
        onRefresh={() => setRefreshDetail(prev => prev + 1)}
      />
    </Box>
  );
};

export default NfeList;
