import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import { listCertificados, deleteCertificado, setCertificadoPassword, uploadCert, syncNFesFromSefaz, type CertificadoSefaz } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';
import TextField from '@mui/material/TextField';
import DialogContentText from '@mui/material/DialogContentText';
import LockIcon from '@mui/icons-material/Lock';

const CertificadosList: React.FC = () => {
  const [certificados, setCertificados] = useState<CertificadoSefaz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certificadoToDelete, setCertificadoToDelete] = useState<CertificadoSefaz | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState<Record<number, boolean>>({});

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [certToEdit, setCertToEdit] = useState<CertificadoSefaz | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const { showSuccess, showError } = useToast();

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadPassword, setUploadPassword] = useState('');
  const [uploadTipo, setUploadTipo] = useState<'p12' | 'a3'>('p12');

  const fetchCertificados = async () => {
    try {
      setLoading(true);
      const response = await listCertificados();
      const certs = response.data?.results || response.data || [];
      setCertificados(certs);
    } catch (error) {
      console.error('Erro ao buscar certificados:', error);
      showError('Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteClick = (certificado: CertificadoSefaz) => {
    setCertificadoToDelete(certificado);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!certificadoToDelete) return;

    try {
      setDeleting(true);
      await deleteCertificado(certificadoToDelete.id);
      showSuccess('Certificado excluído com sucesso');
      setDeleteDialogOpen(false);
      setCertificadoToDelete(null);
      await fetchCertificados();
    } catch (error: any) {
      console.error('Erro ao deletar certificado:', error);
      showError(error?.response?.data?.detail || 'Erro ao excluir certificado');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCertificadoToDelete(null);
  };

  const handleSyncClick = async (cert: CertificadoSefaz) => {
    // Verificar se tem senha cadastrada
    if (!cert.has_password) {
      showError('Configure a senha do certificado antes de sincronizar');
      return;
    }
    
    try {
      setSyncing((prev) => ({ ...prev, [cert.id]: true }));
      await syncNFesFromSefaz(cert.id);
      showSuccess('Sincronização iniciada! As NF-es serão baixadas em segundo plano.');
      // Opcional: polling ou websocket para atualizar status
      setTimeout(() => {
        fetchCertificados();
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao sincronizar NF-es:', error);
      showError(error?.response?.data?.message || 'Erro ao iniciar sincronização');
    } finally {
      setSyncing((prev) => ({ ...prev, [cert.id]: false }));
    }
  };

  const isExpired = (validade: string | null) => {
    if (!validade) return false;
    const validadeDate = new Date(validade);
    return validadeDate < new Date();
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (validade: string | null) => {
    if (!validade) return null;
    const validadeDate = new Date(validade);
    const hoje = new Date();
    const diffTime = validadeDate.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                Certificados Digitais A3/A1
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie os certificados digitais utilizados para manifestação de NF-e
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<i className="bi bi-plus-circle"></i>}
              onClick={() => setUploadOpen(true)}
            >
              Novo Certificado
            </Button>
          </Box>

          {certificados.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Nenhum certificado cadastrado</strong>
              <br />
              Adicione um certificado digital A3 (.pfx ou .p12) para poder manifestar NF-e junto à SEFAZ.
            </Alert>
          )}
        </CardContent>
      </Card>

      {certificados.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titular</TableCell>
                <TableCell>CNPJ</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Validade</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Emissão</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {certificados.map((cert) => {
                const expired = isExpired(cert.validade);
                const daysRemaining = getDaysRemaining(cert.validade);
                const expiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30;

                return (
                  <TableRow key={cert.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                          {cert.nome}
                          {cert.has_password ? (
                            <Tooltip title="Senha cadastrada">
                              <LockIcon fontSize="small" color="action" />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Sem senha cadastrada">
                              <LockIcon fontSize="small" color="disabled" />
                            </Tooltip>
                          )}
                        </Typography>
                      </Box>

                      {cert.arquivo_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {cert.arquivo_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {cert.a3_cnpj || cert.a3_cpf || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={cert.tipo === 'a3' ? 'A3' : 'A1 (P12)'} size="small" />
                        {cert.tipo_certificado && (
                          <Chip
                            label={cert.tipo_certificado}
                            size="small"
                            color={cert.tipo_certificado === 'e-CNPJ' ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        )}
                        {cert.apto_manifestacao === true && (
                          <Tooltip title="Apto para manifestação de NF-e na SEFAZ">
                            <Chip
                              label="Manifestação"
                              size="small"
                              color="success"
                              icon={<CheckCircleIcon />}
                            />
                          </Tooltip>
                        )}
                        {cert.apto_manifestacao === false && (
                          <Tooltip title="Certificado e-CPF não pode manifestar. Use e-CNPJ.">
                            <Chip
                              label="Sem Manifestação"
                              size="small"
                              color="warning"
                              icon={<WarningIcon />}
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(cert.validade)}
                      </Typography>
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          ({daysRemaining} dias restantes)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Chip
                          label="Expirado"
                          color="error"
                          size="small"
                          icon={<WarningIcon />}
                        />
                      ) : expiringSoon ? (
                        <Chip
                          label="Expira em breve"
                          color="warning"
                          size="small"
                          icon={<WarningIcon />}
                        />
                      ) : (
                        <Chip
                          label="Válido"
                          color="success"
                          size="small"
                          icon={<CheckCircleIcon />}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(cert.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Sincronizar NF-es da SEFAZ">
                        <span>
                          <IconButton
                            color="info"
                            size="small"
                            onClick={() => handleSyncClick(cert)}
                            disabled={syncing[cert.id]}
                          >
                            {syncing[cert.id] ? <CircularProgress size={20} /> : <CloudSyncIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Editar senha">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => { setCertToEdit(cert); setEditDialogOpen(true); setNewPassword(''); }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir certificado">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDeleteClick(cert)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o certificado <strong>{certificadoToDelete?.nome}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita. Manifestações já enviadas com este certificado não serão afetadas.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de edição de senha */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Editar Senha do Certificado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Informe a senha do certificado P12 para que o sistema possa usar o certificado para autenticação mTLS. A senha será armazenada com criptografia.
          </DialogContentText>
          <TextField
            label="Senha"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{ startAdornment: <LockIcon sx={{ mr: 1 }} /> }}
          />
          <TextField
            label="Confirmar senha"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mt: 2 }}
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <Alert severity="error" sx={{ mt: 2 }}>
              As senhas não conferem. Por favor, verifique.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={savingPassword}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!certToEdit) return;
              if (!newPassword) {
                showError('Informe uma senha válida');
                return;
              }
              if (newPassword !== confirmPassword) {
                showError('As senhas não conferem');
                return;
              }
              try {
                setSavingPassword(true);
                await setCertificadoPassword(certToEdit.id, newPassword);
                // auditoria será criada no backend
                showSuccess('Senha atualizada com sucesso');
                setEditDialogOpen(false);
                setNewPassword('');
                setConfirmPassword('');
                await fetchCertificados();
              } catch (err: any) {
                showError(err?.response?.data?.message || 'Erro ao salvar senha');
              } finally {
                setSavingPassword(false);
              }
            }}
            variant="contained"
            disabled={savingPassword || newPassword !== confirmPassword}
          >
            {savingPassword ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Upload */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)}>
        <DialogTitle>Upload de Certificado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Faça upload de um certificado P12 (.p12/.pfx). Se o certificado estiver protegido por senha, informe a senha abaixo.
          </DialogContentText>
          <TextField
            label="Nome do certificado"
            fullWidth
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            sx={{ mt: 2 }}
          />
          <input
            type="file"
            accept=".p12,.pfx"
            onChange={(e: any) => setUploadFile(e.target.files?.[0] ?? null)}
            style={{ marginTop: 12 }}
          />
          <TextField
            label="Senha (se aplicável)"
            type="password"
            fullWidth
            value={uploadPassword}
            onChange={(e) => setUploadPassword(e.target.value)}
            sx={{ mt: 2 }}
          />
          <TextField
            select
            label="Tipo"
            value={uploadTipo}
            onChange={(e) => setUploadTipo(e.target.value as 'p12' | 'a3')}
            SelectProps={{ native: true }}
            sx={{ mt: 2 }}
          >
            <option value="p12">A1 (P12)</option>
            <option value="a3">A3 (Token/HSM)</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!uploadFile) {
                showError('Selecione um arquivo');
                return;
              }
              try {
                setUploading(true);
                const fd = new FormData();
                fd.append('nome', uploadName || uploadFile.name);
                fd.append('arquivo', uploadFile);
                fd.append('password', uploadPassword);
                fd.append('tipo', uploadTipo);
                await uploadCert(fd);
                showSuccess('Certificado enviado com sucesso');
                setUploadOpen(false);
                setUploadFile(null);
                setUploadName('');
                setUploadPassword('');
                await fetchCertificados();
              } catch (err: any) {
                showError(err?.response?.data?.detail || err?.response?.data?.message || 'Erro ao enviar certificado');
              } finally {
                setUploading(false);
              }
            }}
            variant="contained"
            disabled={uploading}
          >
            {uploading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CertificadosList;
