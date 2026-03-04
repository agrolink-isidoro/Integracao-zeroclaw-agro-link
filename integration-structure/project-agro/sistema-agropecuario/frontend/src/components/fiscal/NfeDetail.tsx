import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { getNfe, confirmarEstoque } from '../../services/fiscal';
import { getStoredUser } from '../../hooks/useAuth';
import ManifestacaoNota from './ManifestacaoNota';
import { useToast } from '../../hooks/useToast';

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

// Helper para formatar data
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
};

// Helper para determinar status de manifestação fiscal
const getManifestacaoStatus = (nfe: any) => {
  if (!nfe.manifestacoes || nfe.manifestacoes.length === 0) {
    return { tipo: null, label: '🔵 Sem Manifestação', color: 'info' as const };
  }
  
  // Pegar a manifestação mais recente (independente do status SEFAZ)
  const manifestacaoRecente = nfe.manifestacoes
    .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
  
  if (!manifestacaoRecente) {
    return { tipo: null, label: '🔵 Sem Manifestação', color: 'info' as const };
  }
  
  // Determinar status baseado no tipo e status de envio
  const statusEnvio = manifestacaoRecente.status_envio;
  const tipoManifestacao = manifestacaoRecente.tipo;
  
  // Se está pending/failed, mostrar status de processamento
  if (statusEnvio === 'pending') {
    return { tipo: tipoManifestacao, label: '🟡 Processando Manifestação...', color: 'warning' as const };
  }
  if (statusEnvio === 'failed') {
    return { tipo: tipoManifestacao, label: '❌ Erro no Envio', color: 'error' as const };
  }
  
  // Se foi enviada com sucesso, mostrar o tipo específico
  switch (tipoManifestacao) {
    case 'confirmacao':
      return { tipo: 'confirmacao', label: '✅ Operação Confirmada', color: 'success' as const };
    case 'ciencia':
      return { tipo: 'ciencia', label: '👁️ Ciência Registrada', color: 'info' as const };
    case 'desconhecimento':
      return { tipo: 'desconhecimento', label: '⚠️ Operação Desconhecida', color: 'error' as const };
    case 'nao_realizada':
      return { tipo: 'nao_realizada', label: '❌ Não Realizada', color: 'error' as const };
    default:
      return { tipo: null, label: '🔵 Sem Manifestação', color: 'info' as const };
  }
};

// Helper para determinar status de estoque (processo interno)
const getEstoqueStatus = (nfe: any) => {
  // Verificar se há manifestação confirmada (enviada com sucesso)
  const manifestacaoConfirmada = nfe.manifestacoes?.find((m: any) => 
    m.status_envio === 'sent' && m.tipo === 'confirmacao'
  );
  
  // Só mostrar status de estoque se houver confirmação da operação
  if (!manifestacaoConfirmada) {
    return null; // Não mostrar status de estoque
  }
  
  if (nfe.estoque_confirmado) {
    return { label: '✓ Estoque Confirmado', color: 'success' as const };
  }
  return { label: '⏳ Aguardando Estoque', color: 'warning' as const };
};

const NfeDetail: React.FC<{ id: number; onClose: () => void; onUpdate?: () => void }> = ({ id, onClose, onUpdate }) => {
  const [nfe, setNfe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.error === 'unmapped_items') {
        const items = data.unmapped_items || [];
        showError(`Existem ${items.length} item(ns) sem mapeamento: ${items.slice(0, 3).join(', ')}${items.length > 3 ? '...' : ''}`);
      } else {
        showError(data?.detail || 'Erro ao confirmar estoque');
      }
    } finally {
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

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (loading) return <CircularProgress />;
  if (!nfe) return <Typography color="error">Nota não encontrada.</Typography>;

  const manifestacaoStatus = getManifestacaoStatus(nfe);
  const estoqueStatus = getEstoqueStatus(nfe);
  const podeConfirmarEstoque = manifestacaoStatus.tipo === 'confirmacao' && !nfe.estoque_confirmado;
  const user = getStoredUser ? getStoredUser() : null;
  const devForceEnabled = (import.meta as any)?.env?.VITE_FISCAL_SIMULATE_SEFAZ_SUCCESS === 'true';
  const podeForcarConfirmacao = (!!user?.is_staff || devForceEnabled) && !nfe.estoque_confirmado;
  const totalItems = Array.isArray(nfe.itens) ? nfe.itens.length : 0;
  const totalWeight = Array.isArray(nfe.itens)
    ? nfe.itens.reduce((sum: number, it: any) => sum + (parseFloat(it.quantidade_comercial) || 0), 0)
    : 0;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Status */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">NFe {nfe.numero}/{nfe.serie}</Typography>
            <Chip label={manifestacaoStatus.label} color={manifestacaoStatus.color} size="small" variant="outlined" />
            {estoqueStatus && <Chip label={estoqueStatus.label} color={estoqueStatus.color} size="small" variant="filled" />}
          </Box>
        }
        action={
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        }
      />

      {/* Main Content */}
      <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Chave e Emitente */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Chave de Acesso
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
          >
            {nfe.chave_acesso}
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Emitente
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {nfe.emitente_nome}
          </Typography>
          {nfe.fornecedor_nome && (
            <Typography variant="caption" color="text.secondary">
              {nfe.fornecedor_nome}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Dados Operacionais */}
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Dados Operacionais
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Série
            </Typography>
            <Typography variant="body2">{nfe.serie}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Número
            </Typography>
            <Typography variant="body2">{nfe.numero}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Data de Emissão
            </Typography>
            <Typography variant="body2">{formatDate(nfe.data_emissao)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              CFOP
            </Typography>
            <Typography variant="body2">{nfe.cfop || '—'}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Valores */}
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Totalizadores
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
          <Box sx={{ bgcolor: 'primary.lighter', p: 1.5, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Valor Total
            </Typography>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
              R$ {formatCurrency(nfe.valor_nota || nfe.valor).replace('.', ',')}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'info.lighter', p: 1.5, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Peso Total
            </Typography>
            <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 700 }}>
              {totalWeight.toFixed(3)} t
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Itens */}
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Itens ({totalItems})
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Qtd</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Un</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(nfe.itens) && nfe.itens.map((it: any) => (
                <TableRow key={it.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{it.numero_item}</TableCell>
                  <TableCell>{it.descricao}</TableCell>
                  <TableCell align="right">{parseFloat(it.quantidade_comercial).toFixed(3)}</TableCell>
                  <TableCell align="center">{it.unidade_comercial}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      {/* Actions Footer */}
      <Divider />
      <CardActions sx={{ flexDirection: 'column', gap: 0, p: 0 }}>
        {/* PASSO 1: Manifestação à SEFAZ (Obrigação Fiscal) */}
        <Box sx={{ width: '100%', p: 2, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
          <ManifestacaoNota nfeId={nfe.id} nfeData={nfe} onManifestado={async () => {
            // Aguardar um momento para a task ser processada
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Polling para aguardar processamento (máximo 8 tentativas - 16 segundos)
            let attempts = 0;
            const maxAttempts = 8;
            
            while (attempts < maxAttempts) {
              const refreshed = await getNfe(id);
              const recentManifest = refreshed.data.manifestacoes?.slice().sort((a: any, b: any) => 
                new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())[0];
              
              // Se a manifestação mais recente foi processada (não pending), parar
              if (recentManifest && recentManifest.status_envio !== 'pending') {
                setNfe(refreshed.data);
                break;
              }
              
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s entre tentativas
              } else {
                // Após tentativas, atualizar mesmo assim
                setNfe(refreshed.data);
              }
            }
            
            // Notify parent to update list
            if (onUpdate) {
              onUpdate();
            }
          }} />
        </Box>

        {/* PASSO 2: Entrada em Estoque (Processo Interno) */}
        <Box sx={{ width: '100%', p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary' }}>
            📦 Entrada em Estoque (Processo Interno)
          </Typography>

          {/* Avisos e Validações */}
          {!nfe.estoque_confirmado && manifestacaoStatus.tipo !== 'confirmacao' && (
            <Alert severity="warning" sx={{ fontSize: '0.875rem', mb: 1.5 }}>
              <strong>Atenção:</strong> Antes de confirmar a entrada em estoque, é necessário manifestar
              a <strong>"Confirmação da Operação"</strong> junto à SEFAZ.
              {manifestacaoStatus.tipo === 'ciencia' && (
                <><br />Você registrou apenas Ciência. Confirme a operação para prosseguir.</>
              )}
              {manifestacaoStatus.tipo === null && (
                <><br />Registre sua manifestação fiscal acima.</>
              )}
            </Alert>
          )}
        
          {manifestacaoStatus.tipo === 'nao_realizada' && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              <strong>Operação Não Realizada:</strong> Esta nota foi marcada como "Operação não Realizada".
              Não é possível confirmar entrada em estoque.
            </Alert>
          )}
          
          {manifestacaoStatus.tipo === 'desconhecimento' && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              <strong>Operação Desconhecida:</strong> Esta nota foi reportada como desconhecida (possível fraude).
              Não é possível confirmar entrada em estoque.
            </Alert>
          )}

          {/* Botão de Confirmar Estoque */}
          {!nfe.estoque_confirmado && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              disabled={confirming || !podeConfirmarEstoque}
              onClick={handleConfirmClick}
              sx={{ mb: 1.5, py: 1.5 }}
            >
              {confirming ? <CircularProgress size={20} sx={{ mr: 1 }} /> : '✓'}
              {confirming ? ' Processando...' : ' Confirmar Entrada em Estoque'}
            </Button>
          )}

          {/* Forçar Confirmação (visível para usuários staff) */}
          {!nfe.estoque_confirmado && podeForcarConfirmacao && (
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              size="large"
              onClick={handleForceConfirmClick}
              disabled={confirming}
              sx={{ mb: 1 }}
            >
              ⚠️ Forçar Confirmação (staff)
            </Button>
          )}

          {nfe.estoque_confirmado && (
            <Chip label="✓ Estoque Confirmado" color="success" sx={{ width: '100%', py: 2, fontSize: '1rem' }} />
          )}

          {/* More Actions Menu */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <IconButton
              size="small"
              onClick={handleMenuOpen}
              title="Mais opções"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => {
            handleMenuClose();
            handleForceConfirmClick();
          }} disabled={confirming || nfe.estoque_confirmado || !podeForcarConfirmacao}>
            ⚠️ Forçar Processamento
          </MenuItem>
          <MenuItem disabled>📤 Enviar para Sefaz (em breve)</MenuItem>
          <MenuItem disabled>🔄 Reprocessar (em breve)</MenuItem>
          <MenuItem disabled>↓ Download XML (em breve)</MenuItem>
        </Menu>
      </CardActions>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {forceConfirm ? '⚠️ Forçar Confirmação de Estoque?' : 'Confirmar Entrada em Estoque?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {forceConfirm ? (
              <>
                <strong>Atenção:</strong> Você está prestes a <strong>forçar</strong> a confirmação de estoque.
                Isso pode causar inconsistências se houver itens sem mapeamento correto.
                <br /><br />
                Deseja realmente continuar?
              </>
            ) : (
              <>
                Ao confirmar a entrada em estoque, os produtos desta nota fiscal serão adicionados às quantidades disponíveis.
                <br /><br />
                <strong>NFe:</strong> {nfe?.numero}/{nfe?.serie}<br />
                <strong>Emitente:</strong> {nfe?.emitente_nome}<br />
                <strong>Valor:</strong> R$ {formatCurrency(nfe?.valor_nota || nfe?.valor).replace('.', ',')}
                <br /><br />
                Esta ação não pode ser desfeita. Deseja continuar?
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            onClick={() => handleConfirm(forceConfirm)}
            color={forceConfirm ? 'warning' : 'success'}
            variant="contained"
            autoFocus
          >
            {forceConfirm ? 'Forçar Confirmação' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default NfeDetail;
