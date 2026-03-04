import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Alert,
  Grid,
  Typography,
  Autocomplete,
} from '@mui/material';
import { SwapHoriz as SwapIcon } from '@mui/icons-material';
import localizacoesService from '../../services/localizacoes';
import produtosService from '../../services/produtos';
import type { Localizacao, MovimentarEntreLocalizacoes } from '../../types/estoque_maquinas';
import type { Produto } from '../../types/estoque_maquinas';

interface MovimentacaoDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MovimentacaoDialog: React.FC<MovimentacaoDialogProps> = ({ open, onClose, onSuccess }) => {
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<MovimentarEntreLocalizacoes>({
    produto: 0,
    localizacao_origem: 0,
    localizacao_destino: 0,
    quantidade: 0,
    lote: '',
    observacao: '',
  });

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open]);

  const carregarDados = async () => {
    try {
      const [locResponse, prodResponse] = await Promise.all([
        localizacoesService.listar({ ativa: true, page_size: 100 }),
        produtosService.listar({ ativo: true, page_size: 100 }),
      ]);
      setLocalizacoes(locResponse.results);
      setProdutos(prodResponse.results);
    } catch (err: any) {
      setError('Erro ao carregar dados');
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validações
    if (!formData.produto) {
      setError('Selecione um produto');
      return;
    }
    if (!formData.localizacao_origem) {
      setError('Selecione a localização de origem');
      return;
    }
    if (!formData.localizacao_destino) {
      setError('Selecione a localização de destino');
      return;
    }
    if (formData.localizacao_origem === formData.localizacao_destino) {
      setError('Origem e destino devem ser diferentes');
      return;
    }
    if (!formData.quantidade || formData.quantidade <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    setLoading(true);
    try {
      await localizacoesService.movimentarEntreLocalizacoes(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao realizar movimentação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      produto: 0,
      localizacao_origem: 0,
      localizacao_destino: 0,
      quantidade: 0,
      lote: '',
      observacao: '',
    });
    setError(null);
    onClose();
  };

  const produtoSelecionado = produtos.find(p => p.id === formData.produto);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapIcon />
          Movimentar Entre Localizações
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={produtos}
              getOptionLabel={(option) => `${option.codigo} - ${option.nome}`}
              value={produtoSelecionado || null}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, produto: value?.id || 0 }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Produto"
                  required
                  placeholder="Selecione o produto..."
                />
              )}
              disabled={loading}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              select
              required
              label="Localização de Origem"
              value={formData.localizacao_origem || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                localizacao_origem: Number(e.target.value) 
              }))}
              disabled={loading}
            >
              <MenuItem value="">Selecione...</MenuItem>
              {localizacoes.map(loc => (
                <MenuItem 
                  key={loc.id} 
                  value={loc.id}
                  disabled={loc.id === formData.localizacao_destino}
                >
                  {loc.nome} ({loc.tipo})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              select
              required
              label="Localização de Destino"
              value={formData.localizacao_destino || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                localizacao_destino: Number(e.target.value) 
              }))}
              disabled={loading}
            >
              <MenuItem value="">Selecione...</MenuItem>
              {localizacoes.map(loc => (
                <MenuItem 
                  key={loc.id} 
                  value={loc.id}
                  disabled={loc.id === formData.localizacao_origem}
                >
                  {loc.nome} ({loc.tipo})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="number"
              label="Quantidade"
              value={formData.quantidade || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                quantidade: Number(e.target.value) 
              }))}
              inputProps={{ min: 0, step: 0.01 }}
              helperText={produtoSelecionado ? `Unidade: ${produtoSelecionado.unidade}` : ''}
              disabled={loading}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Lote"
              value={formData.lote || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                lote: e.target.value 
              }))}
              placeholder="Ex: LOTE001"
              disabled={loading}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Observação"
              value={formData.observacao || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                observacao: e.target.value 
              }))}
              multiline
              rows={3}
              placeholder="Informações adicionais sobre a movimentação..."
              disabled={loading}
            />
          </Grid>

          {produtoSelecionado && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Estoque Atual:</strong> {produtoSelecionado.quantidade_estoque} {produtoSelecionado.unidade}
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Movimentando...' : 'Movimentar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MovimentacaoDialog;
