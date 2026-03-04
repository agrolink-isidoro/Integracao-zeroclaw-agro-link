import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
} from '@mui/material';
import UploadZone from './UploadZone';
import { uploadXml, previewXml } from '../../services/fiscal';
import type { NfePreview } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';
import { getStoredTokens } from '../../hooks/useAuth';

interface NfeUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (data?: any) => void;
  initialFiles?: File[];
}

const STEPS = ['Selecionar XML', 'Revisar Dados', 'Confirmar'];

const formatCurrency = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const NfeUploadModal: React.FC<NfeUploadModalProps> = ({
  open,
  onClose,
  onSuccess,
  initialFiles = [],
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [nfeFile, setNfeFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<NfePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const { showSuccess, showError } = useToast();

  // Process initial files from drag-and-drop
  React.useEffect(() => {
    if (initialFiles.length > 0 && open) {
      const file = initialFiles[0];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (ext === '.xml') {
        setNfeFile(file);
        setErrors({});
        setValidationErrors([]);
      }
    }
  }, [initialFiles, open]);

  const handleNfeFilesSelect = (files: File[]) => {
    if (files.length > 0) {
      setNfeFile(files[0]);
      setErrors((prev) => ({ ...prev, nfe: '' }));
      // Reset preview when new file selected
      setPreview(null);
      setActiveStep(0);
    }
  };

  /* Step 1 → Step 2: preview XML */
  const handlePreview = useCallback(async () => {
    if (!nfeFile) {
      setErrors((prev) => ({ ...prev, nfe: 'Selecione um arquivo XML' }));
      return;
    }
    const form = new FormData();
    form.append('xml_file', nfeFile);
    try {
      setLoading(true);
      setErrors({});
      const resp = await previewXml(form);
      const data = resp.data;
      if (data.error) {
        setErrors({ nfe: data.error });
        showError(data.error);
        return;
      }
      if (data.already_imported) {
        setErrors({ nfe: 'Esta NF-e já foi importada anteriormente.' });
        showError('NF-e já importada.');
        return;
      }
      setPreview(data);
      setActiveStep(1);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Erro ao analisar XML';
      setErrors({ nfe: msg });
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [nfeFile, showError]);

  /* Step 2 → Step 3: confirm */
  const handleGoConfirm = () => setActiveStep(2);

  /* Step 3: upload definitivo */
  const handleConfirm = useCallback(async () => {
    if (!nfeFile) return;
    const form = new FormData();
    form.append('xml_file', nfeFile);

    try {
      console.debug('[NfeUpload] Preparing upload', { fileName: nfeFile?.name, fileSize: nfeFile?.size });
      try {
        const tokens = getStoredTokens();
        console.debug('[NfeUpload] hasToken:', !!tokens?.access);
      } catch (e) { /* ignore */ }

      setLoading(true);
      const resp = await uploadXml(form);
      showSuccess('NF-e processada com sucesso');
      setNfeFile(null);
      setPreview(null);
      setValidationErrors([]);
      setErrors({});
      setActiveStep(0);
      const created = resp?.data;
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      const statusCode = err?.response?.status;
      console.error('[NfeUpload] uploadXml error', { status: statusCode, data });

      if (statusCode === 401) {
        setErrors({ nfe: 'Sessão expirada ou não autenticado. Faça login.' });
        showError('Sessão expirada. Por favor entre novamente.');
        if (typeof window !== 'undefined') window.location.href = '/login';
      } else if (data?.error === 'validation_error' && Array.isArray(data.bad_fields)) {
        setValidationErrors(data.bad_fields);
        showError('Erro de validação: verifique os campos indicados');
      } else if (data?.error) {
        const errMsg = data.error === 'NFe already imported'
          ? `NF-e já importada (id=${data.nfe_id || '?'})`
          : (data.detail || data.error || JSON.stringify(data));
        setErrors({ nfe: errMsg });
        showError(errMsg);
      } else if (data?.detail) {
        setErrors({ nfe: data.detail });
        showError(data.detail);
      } else {
        const raw = JSON.stringify(data || err?.message).slice(0, 300);
        setErrors({ nfe: `Erro ao processar NF-e: ${raw}` });
        showError(`Erro ao processar NF-e`);
      }
    } finally {
      setLoading(false);
    }
  }, [nfeFile, showSuccess, showError, onSuccess, onClose]);

  const handleBack = () => {
    if (activeStep > 0) setActiveStep((s) => s - 1);
  };

  const handleClose = () => {
    if (!loading) {
      setNfeFile(null);
      setPreview(null);
      setErrors({});
      setValidationErrors([]);
      setActiveStep(0);
      onClose();
    }
  };

  /* Renders */
  const renderStep0 = () => (
    <>
      {errors.nfe && (
        <Alert severity="error" sx={{ mb: 2 }}>{errors.nfe}</Alert>
      )}
      <UploadZone
        onFilesSelect={handleNfeFilesSelect}
        acceptedTypes={['.xml']}
        maxSize={50 * 1024 * 1024}
      />
      {nfeFile && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: '4px' }}>
          <Typography variant="body2" color="textSecondary">
            <strong>Arquivo selecionado:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            📄 {nfeFile.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {(nfeFile.size / 1024).toFixed(2)} KB
          </Typography>
        </Box>
      )}
      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Erros de validação:</Typography>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}><Typography variant="body2"><strong>{err.field}</strong>: {err.message}</Typography></li>
            ))}
          </ul>
        </Alert>
      )}
    </>
  );

  const renderStep1 = () => {
    if (!preview) return null;
    return (
      <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {/* Header info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="primary">Chave de acesso</Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {preview.chave_acesso}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Typography variant="body2"><strong>Nº:</strong> {preview.numero}</Typography>
            <Typography variant="body2"><strong>Série:</strong> {preview.serie}</Typography>
            <Typography variant="body2"><strong>Emissão:</strong> {preview.data_emissao}</Typography>
          </Box>
          <Typography variant="body2"><strong>Nat. Operação:</strong> {preview.natureza_operacao}</Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Emitente */}
        <Typography variant="subtitle2" color="primary" gutterBottom>Emitente</Typography>
        <Box sx={{ mb: 2, pl: 1 }}>
          <Typography variant="body2"><strong>CNPJ:</strong> {preview.emitente.cnpj}</Typography>
          <Typography variant="body2"><strong>Razão Social:</strong> {preview.emitente.nome}</Typography>
          {preview.emitente.fantasia && (
            <Typography variant="body2"><strong>Fantasia:</strong> {preview.emitente.fantasia}</Typography>
          )}
          <Typography variant="body2"><strong>IE:</strong> {preview.emitente.inscricao_estadual}</Typography>
        </Box>

        {/* Destinatário */}
        <Typography variant="subtitle2" color="primary" gutterBottom>Destinatário</Typography>
        <Box sx={{ mb: 2, pl: 1 }}>
          <Typography variant="body2">
            <strong>{preview.destinatario.cnpj ? 'CNPJ' : 'CPF'}:</strong>{' '}
            {preview.destinatario.cnpj || preview.destinatario.cpf}
          </Typography>
          <Typography variant="body2"><strong>Nome:</strong> {preview.destinatario.nome}</Typography>
          {preview.destinatario.email && (
            <Typography variant="body2"><strong>Email:</strong> {preview.destinatario.email}</Typography>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Totais */}
        <Typography variant="subtitle2" color="primary" gutterBottom>Totais</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {[
            { label: 'Produtos', val: preview.totais.valor_produtos },
            { label: 'Nota', val: preview.totais.valor_nota },
            { label: 'ICMS', val: preview.totais.valor_icms },
            { label: 'PIS', val: preview.totais.valor_pis },
            { label: 'COFINS', val: preview.totais.valor_cofins },
            { label: 'IPI', val: preview.totais.valor_ipi },
            { label: 'Frete', val: preview.totais.valor_frete },
            { label: 'Desconto', val: preview.totais.valor_desconto },
          ].map(({ label, val }) => (
            <Chip
              key={label}
              label={`${label}: ${formatCurrency(val)}`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 500 }}
            />
          ))}
        </Box>

        {/* Itens */}
        <Typography variant="subtitle2" color="primary" gutterBottom>
          Itens ({preview.itens.length})
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 250 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>NCM</TableCell>
                <TableCell>CFOP</TableCell>
                <TableCell align="right">Qtde</TableCell>
                <TableCell align="right">Vlr Unit.</TableCell>
                <TableCell align="right">Vlr Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {preview.itens.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.numero_item}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.descricao}
                  </TableCell>
                  <TableCell>{item.ncm}</TableCell>
                  <TableCell>{item.cfop}</TableCell>
                  <TableCell align="right">{item.quantidade} {item.unidade}</TableCell>
                  <TableCell align="right">{formatCurrency(item.valor_unitario)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.valor_total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Duplicatas */}
        {preview.duplicatas.length > 0 && (
          <>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Duplicatas / Parcelas ({preview.duplicatas.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nº</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell align="right">Valor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.duplicatas.map((dup, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{dup.numero}</TableCell>
                      <TableCell>{dup.data_vencimento}</TableCell>
                      <TableCell align="right">{formatCurrency(dup.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {/* Pagamentos */}
        {preview.pagamentos.length > 0 && (
          <>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Formas de Pagamento ({preview.pagamentos.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {preview.pagamentos.map((pag, idx) => (
                <Chip
                  key={idx}
                  label={`${pag.label}: ${formatCurrency(pag.vPag)}`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
              ))}
            </Box>
          </>
        )}
      </Box>
    );
  };

  const renderStep2 = () => (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Typography variant="h6" gutterBottom>Confirmar importação?</Typography>
      <Typography variant="body2" color="textSecondary">
        A NF-e <strong>{preview?.numero}</strong> de{' '}
        <strong>{preview?.emitente?.nome}</strong> será importada no sistema.
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
        Valor total: <strong>{formatCurrency(preview?.totais?.valor_nota || '0')}</strong>
      </Typography>
      {errors.nfe && (
        <Alert severity="error" sx={{ mt: 2 }}>{errors.nfe}</Alert>
      )}
      {validationErrors.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Erros de validação:</Typography>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}><Typography variant="body2"><strong>{err.field}</strong>: {err.message}</Typography></li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: '8px' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="span">Importar XML</Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {activeStep === 0 && renderStep0()}
        {activeStep === 1 && renderStep1()}
        {activeStep === 2 && renderStep2()}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>Cancelar</Button>

        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>Voltar</Button>
        )}

        {activeStep === 0 && (
          <Button
            onClick={handlePreview}
            variant="contained"
            disabled={loading || !nfeFile}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Analisando...' : 'Visualizar'}
          </Button>
        )}

        {activeStep === 1 && (
          <Button onClick={handleGoConfirm} variant="contained" color="primary">
            Prosseguir
          </Button>
        )}

        {activeStep === 2 && (
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Importando...' : 'Confirmar Importação'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NfeUploadModal;
