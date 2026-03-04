import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Alert,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { listNfes } from '../../services/fiscal';

// Safe currency formatting
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return '0,00';
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '0,00';
  }
  return numValue.toFixed(2).replace('.', ',');
};

interface ObligationItem {
  name: string;
  type: string;
  dueDate: string;
  status: 'pago' | 'pendente' | 'vencido';
  value: number;
}

interface DashboardStats {
  totalNfes: number;
  totalValue: number;
  avgNfeValue?: number;
  totalICMS: number;
  totalPIS: number;
  totalCOFINS: number;
  processedNfes: number;
  pendingNfes: number;
  complianceRate: number;
  certsExpiringSoon?: number;
  obligations?: ObligationItem[];
  loading: boolean;
  error: string | null;
}

const FiscalDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalNfes: 0,
    totalValue: 0,
    totalICMS: 0,
    totalPIS: 0,
    totalCOFINS: 0,
    processedNfes: 0,
    pendingNfes: 0,
    complianceRate: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true, error: null }));
      const response = await listNfes();
      const nfes = response.data.results || response.data || [];

      // Also fetch certificates to compute expiry warnings
      const certResp = await (await import('../../services/fiscal')).listCertificados();
      const certs = certResp.data.results || certResp.data || [];

      // Calculate consolidated values
      let totalValue = 0;
      let totalICMS = 0;
      let totalPIS = 0;
      let totalCOFINS = 0;
      let processedCount = 0;
      let pendingCount = 0;

      const obligations: ObligationItem[] = [];

      nfes.forEach((nfe: any) => {
        const value = parseFloat(nfe.valor_nota || nfe.valor || 0) || 0;
        totalValue += value;

        // Accumulate taxes from items
        if (Array.isArray(nfe.itens)) {
          nfe.itens.forEach((item: any) => {
            if (item.imposto) {
              totalICMS += parseFloat(item.imposto.icms_valor || 0) || 0;
              totalPIS += parseFloat(item.imposto.pis_valor || 0) || 0;
              totalCOFINS += parseFloat(item.imposto.cofins_valor || 0) || 0;
            }
          });
        }

        // Duplicatas (obrigacoes) — if available, extract upcoming vencimentos
        if (Array.isArray(nfe.duplicatas)) {
          nfe.duplicatas.forEach((d: any) => {
            const due = d.data_vencimento || d.data || null;
            const val = parseFloat(d.valor || 0) || 0;
            if (due) {
              const dueDate = new Date(due);
              const now = new Date();
              const status: ObligationItem['status'] = dueDate < now ? 'vencido' : 'pendente';
              obligations.push({
                name: `Duplicata NF ${nfe.numero}/${nfe.serie}`,
                type: 'Duplicata',
                dueDate: due,
                status,
                value: val,
              });
            }
          });
        }

        // Count status
        if (nfe.estoque_confirmado) {
          processedCount++;
        } else {
          pendingCount++;
        }
      });

      // Certificates expiring within 30 days
      const now = new Date();
      const thirty = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const certsExpiringSoon = (certs || []).filter((c: any) => c.validade && new Date(c.validade) <= thirty).length;

      // Sort obligations by due date ascending and keep next 10
      obligations.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const nextObligations = obligations.slice(0, 10);

      // Calculate compliance rate: processed / total * 100
      const complianceRate = nfes.length > 0 ? (processedCount / nfes.length) * 100 : 0;

      setStats({
        totalNfes: nfes.length,
        totalValue,
        avgNfeValue: nfes.length > 0 ? totalValue / nfes.length : 0,
        totalICMS,
        totalPIS,
        totalCOFINS,
        processedNfes: processedCount,
        pendingNfes: pendingCount,
        complianceRate: Math.round(complianceRate),
        certsExpiringSoon,
        obligations: nextObligations,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      let message = 'Erro ao carregar dados do dashboard';
      if (err?.response?.status === 401) {
        message = 'Não autorizado. Por favor, faça login.';
      } else if (err?.response?.status === 500) {
        message = 'Erro no servidor ao carregar dados fiscais. Contate o suporte.';
      }
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  };

  if (stats.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalTaxes = stats.totalICMS + stats.totalPIS + stats.totalCOFINS;
  const effectiveTaxRate = stats.totalValue > 0 ? ((totalTaxes / stats.totalValue) * 100).toFixed(2) : '0';

  // Upcoming obligations (mock structure - could be fetched from API in future)
  const obligations = [
    {
      name: 'ICMS - Janeiro 2025',
      type: 'Imposto Estadual',
      dueDate: '20/01/2025',
      status: 'pendente',
      value: stats.totalICMS || 0,
    },
    {
      name: 'PIS/COFINS - Janeiro 2025',
      type: 'Imposto Federal',
      dueDate: '25/01/2025',
      status: 'pago',
      value: stats.totalPIS + stats.totalCOFINS || 0,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'success';
      case 'pendente':
        return 'warning';
      case 'processando':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {stats.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {stats.error}
        </Alert>
      )}

      {/* Key Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Taxes Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'error.lighter',
                    p: 1.5,
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <WarningIcon sx={{ color: 'error.main', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Impostos Totais
                  </Typography>
                  <Typography variant="h6">
                    R$ {formatCurrency(totalTaxes)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Alíquota efetiva: {effectiveTaxRate}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Issued NFes Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'primary.lighter',
                    p: 1.5,
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <TrendingUpIcon sx={{ color: 'primary.main', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Notas Emitidas
                  </Typography>
                  <Typography variant="h6">{stats.totalNfes}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Total: R$ {formatCurrency(stats.totalValue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance Status Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'success.lighter',
                    p: 1.5,
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Conformidade
                  </Typography>
                  <Typography variant="h6">{stats.complianceRate}%</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {stats.processedNfes} de {stats.totalNfes} processadas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Count Card */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    bgcolor: 'warning.lighter',
                    p: 1.5,
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <InfoIcon sx={{ color: 'warning.main', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Pendências
                  </Typography>
                  <Typography variant="h6">{stats.pendingNfes}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Aguardando processamento
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Certificates expiring soon */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ bgcolor: 'warning.lighter', p: 1.5, borderRadius: 1, display: 'flex', justifyContent: 'center' }}>
                  <WarningIcon sx={{ color: 'warning.main', fontSize: '2rem' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Certificados (30d)
                  </Typography>
                  <Typography variant="h6">{stats.certsExpiringSoon ?? 0}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    expirando em 30 dias
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Obligations — derived from NFes. Falls back to informative message when empty */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardHeader
              title="Próximas Obrigações Fiscais"
              subheaderTypographyProps={{ variant: 'caption' }}
            />
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Obrigação</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Vencimento</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Valor
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(stats.obligations && stats.obligations.length > 0) ? (
                      stats.obligations.map((obligation, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{obligation.name}</TableCell>
                          <TableCell>{obligation.type}</TableCell>
                          <TableCell>{new Date(obligation.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip
                              label={obligation.status === 'pago' ? 'Pago' : (obligation.status === 'vencido' ? 'Vencido' : 'Pendente')}
                              color={getStatusColor(obligation.status) as any}
                              variant="filled"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">R$ {formatCurrency(obligation.value)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted">Nenhuma obrigação encontrada (verifique duplicatas nas NFes).</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts & Compliance */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardHeader title="Alertas Fiscais" />
            <CardContent sx={{ pt: 0 }}>
              {stats.pendingNfes > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <strong>{stats.pendingNfes} nota(s)</strong> aguardando processamento
                </Alert>
              )}
              {stats.complianceRate < 100 && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  Taxas de conformidade em {stats.complianceRate}%
                </Alert>
              )}
              {stats.totalNfes === 0 && (
                <Alert severity="info">
                  Nenhuma nota fiscal registrada. Importe uma nota para começar.
                </Alert>
              )}
              {stats.complianceRate === 100 && stats.totalNfes > 0 && (
                <Alert severity="success">
                  <CheckCircleIcon sx={{ mr: 1, fontSize: '1rem' }} />
                  Todas as notas processadas
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Status de Conformidade" />
            <CardContent sx={{ pt: 1 }}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Notas Processadas</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {stats.complianceRate}%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={stats.complianceRate} />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Impostos Calculados</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {stats.totalNfes > 0 ? '100%' : '0%'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={stats.totalNfes > 0 ? 100 : 0}
                  color="success"
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Índice Geral
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {Math.round((stats.complianceRate + (stats.totalNfes > 0 ? 100 : 0)) / 2)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tax Breakdown Summary */}
      {stats.totalNfes > 0 && (
        <Card>
          <CardHeader title="Resumo de Impostos" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}> 
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ICMS
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'error.main', mt: 0.5 }}>
                    R$ {formatCurrency(stats.totalICMS)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    PIS
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'warning.main', mt: 0.5 }}>
                    R$ {formatCurrency(stats.totalPIS)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    COFINS
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'info.main', mt: 0.5 }}>
                    R$ {formatCurrency(stats.totalCOFINS)}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Total
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'primary.main', mt: 0.5 }}>
                    R$ {formatCurrency(totalTaxes)}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FiscalDashboard;
