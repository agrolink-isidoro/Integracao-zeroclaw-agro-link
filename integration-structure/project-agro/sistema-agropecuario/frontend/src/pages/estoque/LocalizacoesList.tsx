import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Dialog, DialogTitle, DialogContent,
  Box, Button, TextField, Typography,
  Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert,
  Tooltip, IconButton, Card, CardContent, Paper, Chip,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon, Inventory as InventoryIcon, History as HistoryIcon } from '@mui/icons-material';
import localizacoesService from '../../services/localizacoes';
import LocalizacaoForm from './LocalizacaoForm';
import type { Localizacao, TipoLocalizacao } from '../../types/estoque_maquinas';

const LocalizacoesList: React.FC = () => {
  const [localizacoes, setLocalizacoes] = useState<Localizacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoLocalizacao | ''>('');
  const [ativaFilter, setAtivaFilter] = useState<boolean | ''>('');
  
  // Dialogs
  const [formDialog, setFormDialog] = useState(false);
  const [selectedLocalizacao, setSelectedLocalizacao] = useState<Localizacao | undefined>();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [localizacaoToDelete, setLocalizacaoToDelete] = useState<Localizacao | null>(null);

  useEffect(() => {
    carregarLocalizacoes();
  }, [page, rowsPerPage, searchTerm, tipoFilter, ativaFilter]);

  const carregarLocalizacoes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await localizacoesService.listar({
        page: page + 1,
        page_size: rowsPerPage,
        search: searchTerm || undefined,
        tipo: tipoFilter || undefined,
        ativa: ativaFilter === '' ? undefined : ativaFilter,
        ordering: '-criado_em',
      });
      setLocalizacoes(response.results);
      setTotalCount(response.count);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar localizações');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (localizacao?: Localizacao) => {
    setSelectedLocalizacao(localizacao);
    setFormDialog(true);
  };

  const handleCloseForm = () => {
    setSelectedLocalizacao(undefined);
    setFormDialog(false);
  };

  const handleSave = async (data: Partial<Localizacao>) => {
    try {
      if (selectedLocalizacao?.id) {
        await localizacoesService.atualizarParcial(selectedLocalizacao.id, data);
        setSuccess('Localização atualizada com sucesso!');
      } else {
        await localizacoesService.criar(data);
        setSuccess('Localização criada com sucesso!');
      }
      handleCloseForm();
      carregarLocalizacoes();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Erro ao salvar localização');
    }
  };

  const handleOpenDelete = (localizacao: Localizacao) => {
    setLocalizacaoToDelete(localizacao);
    setDeleteDialog(true);
  };

  const handleCloseDelete = () => {
    setLocalizacaoToDelete(null);
    setDeleteDialog(false);
  };

  const handleDelete = async () => {
    if (!localizacaoToDelete) return;

    try {
      await localizacoesService.deletar(localizacaoToDelete.id);
      setSuccess('Localização excluída com sucesso!');
      handleCloseDelete();
      carregarLocalizacoes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir localização');
      handleCloseDelete();
    }
  };

  const getOcupacaoColor = (percentual: number): 'success' | 'warning' | 'error' => {
    if (percentual < 70) return 'success';
    if (percentual < 90) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Localizações de Estoque
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Nova Localização
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Buscar"
              placeholder="Nome ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 300 }}
              size="small"
            />
            <TextField
              select
              label="Tipo"
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as TipoLocalizacao | '')}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="interna">Interna</MenuItem>
              <MenuItem value="externa">Externa</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={ativaFilter}
              onChange={(e) => setAtivaFilter(e.target.value === '' ? '' : e.target.value === 'true')}
              sx={{ minWidth: 150 }}
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="true">Ativa</MenuItem>
              <MenuItem value="false">Inativa</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={carregarLocalizacoes}
              size="small"
            >
              Atualizar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        {loading && <LinearProgress />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Endereço</TableCell>
              <TableCell align="right">Capacidade Total</TableCell>
              <TableCell align="right">Ocupação</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localizacoes.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    Nenhuma localização encontrada
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              localizacoes.map((loc) => (
                <TableRow key={loc.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {loc.nome}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={loc.tipo === 'interna' ? 'Interna' : 'Externa'}
                      size="small"
                      color={loc.tipo === 'interna' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {loc.endereco || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {loc.capacidade_total.toLocaleString('pt-BR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flexGrow: 1, minWidth: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={loc.percentual_ocupacao}
                          color={getOcupacaoColor(loc.percentual_ocupacao)}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ minWidth: 45 }}>
                        {loc.percentual_ocupacao.toFixed(1)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={loc.ativa ? 'Ativa' : 'Inativa'}
                      size="small"
                      color={loc.ativa ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenForm(loc)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver Saldos">
                      <IconButton
                        size="small"
                        color="info"
                      >
                        <InventoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Histórico">
                      <IconButton
                        size="small"
                        color="default"
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDelete(loc)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_: any, newPage: number) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e: any) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} de ${count}`}
        />
      </TableContainer>

      {/* Dialog Formulário */}
      <Dialog
        open={formDialog}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedLocalizacao ? 'Editar Localização' : 'Nova Localização'}
        </DialogTitle>
        <DialogContent>
          <LocalizacaoForm
            localizacao={selectedLocalizacao}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação Delete */}
      <Dialog open={deleteDialog} onClose={handleCloseDelete}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a localização <strong>{localizacaoToDelete?.nome}</strong>?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Button onClick={handleCloseDelete}>Cancelar</Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              Excluir
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LocalizacoesList;
