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
  Typography,
  CircularProgress,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { listNfes } from '../../services/fiscal';
import NfeImpostosDetail from './NfeImpostosDetail';

// Função auxiliar para formatar valor monetário com segurança
const formatCurrency = (value: any): string => {
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

const NfeListImpostos: React.FC = () => {
  const [nfes, setNfes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  // Load local NFes
  useEffect(() => {
    loadLocalNfes();
  }, []);

  const loadLocalNfes = async () => {
    try {
      setLoading(true);
      const response = await listNfes();
      setNfes(response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to load NFes:', err);
      setNfes([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcular consolidado geral de impostos
  const calculateConsolidatedTaxes = () => {
    let totals = { icms: 0, pis: 0, cofins: 0, valorTotal: 0 };
    
    nfes.forEach((nfe: any) => {
      totals.valorTotal += parseFloat(nfe.valor_nota || nfe.valor || 0);
      
      if (Array.isArray(nfe.itens)) {
        nfe.itens.forEach((item: any) => {
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

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Impostos por Nota Fiscal
      </Typography>

      {/* Content */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && nfes.length === 0 && (
        <Alert severity="info">
          Nenhuma NFe local registrada. Envie uma nota fiscal na aba "Notas Fiscais".
        </Alert>
      )}

      {/* Alerta de Manifestações Pendentes */}
      {!loading && nfes.length > 0 && (() => {
        const nfesSemManifestacao = nfes.filter(nfe => 
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

      {!loading && nfes.length > 0 && (
        <>
          {/* Consolidado Geral de Impostos */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Consolidado de Impostos
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <Box sx={{ bgcolor: 'primary.lighter', p: 2, borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Impostos Estaduais (ICMS)
                </Typography>
                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700, mt: 1 }}>
                  R$ {formatCurrency(consolidatedTaxes.icms).replace('.', ',')}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'success.lighter', p: 2, borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Impostos Federais (PIS + COFINS)
                </Typography>
                <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 700, mt: 1 }}>
                  R$ {formatCurrency(consolidatedTaxes.pis + consolidatedTaxes.cofins).replace('.', ',')}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'info.lighter', p: 2, borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Impostos Municipais
                </Typography>
                <Typography variant="h5" sx={{ color: 'info.main', fontWeight: 700, mt: 1 }}>
                  R$ 0,00
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  (Nenhum dado municipal disponível)
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2 }}>
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
                  {nfes.map((nfe) => {
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
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<OpenInNewIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(nfe.id);
                            }}
                          >
                            Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Detail Panel - Impostos */}
          <Box sx={{ flex: 1 }}>
            {selected ? (
              <NfeImpostosDetail id={selected} onClose={() => setSelected(null)} />
            ) : (
              <Paper sx={{ p: 2, bgcolor: 'background.default', textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Selecione uma nota para ver detalhes de impostos
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
        </>
      )}
    </Box>
  );
};

export default NfeListImpostos;
