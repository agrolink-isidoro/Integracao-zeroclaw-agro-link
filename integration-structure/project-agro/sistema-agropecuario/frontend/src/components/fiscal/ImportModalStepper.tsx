import React, { useState } from 'react';
import type { SelectChangeEvent } from '@mui/material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Stack,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Paper,
  Typography,
  MenuItem,
  Select,
  InputLabel,
} from '@mui/material';
import { useToast } from '@/hooks/useToast';
import { importNFeRemote, listCentroCusto } from '@/services/fiscal';

interface NFeRemote {
  id: number;
  chave_acesso: string;
  raw_xml: string;
  emitente_nome?: string;
  valor?: number;
  received_at?: string;
}

interface ImportModalStepperProps {
  nfeRemote: NFeRemote;
  open: boolean;
  onSuccess: (imported: any) => void;
  onClose: () => void;
}

const STEPS = ['Preview', 'Centro de Custo', 'Forma de Pagamento', 'Confirmar'];

type FormaPagamento = 'boleto' | 'avista' | 'cartao' | 'outra';

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


interface ImportFormData {
  centro_custo_id: number | null;
  forma_pagamento: FormaPagamento;
  vencimento?: string;
  valor?: number;
  observacao?: string;
}

/**
 * ImportModalStepper Component
 * Multi-step wizard for importing remote NFes
 * Steps:
 * 1. Preview XML metadata
 * 2. Select centro_custo
 * 3. Choose forma_pagamento + conditional fields
 * 4. Confirm & submit
 */
export const ImportModalStepper: React.FC<ImportModalStepperProps> = ({
  nfeRemote,
  open,
  onSuccess,
  onClose,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centroCustoOptions, setCentroCustoOptions] = useState<any[]>([]);
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState<ImportFormData>({
    centro_custo_id: null,
    forma_pagamento: 'boleto',
    vencimento: '',
    valor: nfeRemote.valor || undefined,
    observacao: '',
  });

  // Load centro_custo options on mount
  React.useEffect(() => {
    if (open && centroCustoOptions.length === 0) {
      loadCentroCustos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadCentroCustos = async () => {
    try {
      const response = await listCentroCusto();
      setCentroCustoOptions(response.data.results || []);
    } catch (err) {
      console.error('Failed to load centro_custo:', err);
    }
  };

  const handleNext = () => {
    // Validate current step before moving
    if (activeStep === 1 && !formData.centro_custo_id) {
      setError('Por favor, selecione um centro de custo');
      return;
    }
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleFormChange = (field: keyof ImportFormData, value: any): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateAndSubmit = async (): Promise<void> => {
    // Validate forma_pagamento rules
    if (formData.forma_pagamento === 'boleto') {
      if (!formData.vencimento) {
        setError('Vencimento é obrigatório para boleto');
        return;
      }
      if (formData.valor === undefined || formData.valor <= 0) {
        setError('Valor é obrigatório e deve ser maior que zero');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        centro_custo_id: formData.centro_custo_id,
        import_metadata: {
          forma_pagamento: formData.forma_pagamento,
          ...(formData.forma_pagamento === 'boleto' && {
            vencimento: formData.vencimento,
            valor: formData.valor,
          }),
          ...(formData.forma_pagamento === 'outra' && {
            observacao: formData.observacao,
          }),
        },
      };

      const response = await importNFeRemote(nfeRemote.id, payload);
      showSuccess('NFe importada com sucesso');
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'Erro ao importar NFe';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (): React.ReactNode => {
    switch (activeStep) {
      case 0:
        // Preview
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Informações da NFe</Typography>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Chave de Acesso
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {nfeRemote.chave_acesso}
                  </Typography>
                </Box>
                {nfeRemote.emitente_nome && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Emitente
                    </Typography>
                    <Typography variant="body2">{nfeRemote.emitente_nome}</Typography>
                  </Box>
                )}
                {nfeRemote.valor && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Valor
                    </Typography>
                    <Typography variant="body2">
                      R$ {formatCurrency(nfeRemote.valor)}
                    </Typography>
                  </Box>
                )}
                {nfeRemote.received_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data de Recebimento
                    </Typography>
                    <Typography variant="body2">
                      {new Date(nfeRemote.received_at).toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
            <Alert severity="info">
              Você está importando uma NFe distribuída pela SEFAZ. Esta operação criará
              uma NFe local e a vinculará aos registros de compra.
            </Alert>
          </Stack>
        );

      case 1:
        // Centro de Custo
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Centro de Custo</Typography>
            <FormControl fullWidth>
              <InputLabel>Centro de Custo</InputLabel>
              <Select
                value={formData.centro_custo_id || ''}
                label="Centro de Custo"
                onChange={(e: SelectChangeEvent<any>) => handleFormChange('centro_custo_id', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>Selecione...</em>
                </MenuItem>
                {centroCustoOptions.map((cc) => (
                  <MenuItem key={cc.id} value={cc.id}>
                    {cc.nome || `Centro ${cc.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Alert severity="info">
              O centro de custo selecionado será usado para registrar a entrada da NFe.
            </Alert>
          </Stack>
        );

      case 2:
        // Forma de Pagamento
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Forma de Pagamento</Typography>
            <FormControl component="fieldset">
              <FormLabel component="legend">Selecione a forma de pagamento</FormLabel>
              <RadioGroup
                value={formData.forma_pagamento}
                onChange={(e) =>
                  handleFormChange('forma_pagamento', e.target.value as FormaPagamento)
                }
              >
                <FormControlLabel value="boleto" control={<Radio />} label="Boleto" />
                <FormControlLabel value="avista" control={<Radio />} label="À Vista" />
                <FormControlLabel value="cartao" control={<Radio />} label="Cartão" />
                <FormControlLabel value="outra" control={<Radio />} label="Outra" />
              </RadioGroup>
            </FormControl>

            {formData.forma_pagamento === 'boleto' && (
              <Stack spacing={1}>
                <TextField
                  label="Vencimento"
                  type="date"
                  value={formData.vencimento || ''}
                  onChange={(e) => handleFormChange('vencimento', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
                <TextField
                  label="Valor"
                  type="number"
                  value={formData.valor || ''}
                  onChange={(e) => handleFormChange('valor', parseFloat(e.target.value))}
                  inputProps={{ step: '0.01' }}
                  required
                />
              </Stack>
            )}

            {formData.forma_pagamento === 'outra' && (
              <TextField
                label="Observação"
                multiline
                rows={3}
                value={formData.observacao || ''}
                onChange={(e) => handleFormChange('observacao', e.target.value)}
                placeholder="Descreva a forma de pagamento customizada..."
              />
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        );

      case 3:
        // Confirm
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Confirmar Importação</Typography>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Chave:</strong> {nfeRemote.chave_acesso}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Centro de Custo:</strong>{' '}
                  {centroCustoOptions.find((cc) => cc.id === formData.centro_custo_id)
                    ?.nome || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Forma de Pagamento:</strong>{' '}
                  {formData.forma_pagamento === 'boleto' && 'Boleto'}
                  {formData.forma_pagamento === 'avista' && 'À Vista'}
                  {formData.forma_pagamento === 'cartao' && 'Cartão'}
                  {formData.forma_pagamento === 'outra' && 'Outra'}
                </Typography>
                {formData.forma_pagamento === 'boleto' && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Vencimento:</strong> {formData.vencimento}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Valor:</strong> R$ {formatCurrency(formData.valor)}
                    </Typography>
                  </>
                )}
              </Stack>
            </Paper>
            <Alert severity="info">
              Clique em "Importar" para concluir o processo. Uma NFe local será criada
              vinculada aos dados acima.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar NFe Remota</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box>{renderStepContent()}</Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Voltar
          </Button>
        )}
        {activeStep < STEPS.length - 1 && (
          <Button onClick={handleNext} variant="contained" disabled={loading}>
            Próximo
          </Button>
        )}
        {activeStep === STEPS.length - 1 && (
          <Button
            onClick={validateAndSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportModalStepper;
