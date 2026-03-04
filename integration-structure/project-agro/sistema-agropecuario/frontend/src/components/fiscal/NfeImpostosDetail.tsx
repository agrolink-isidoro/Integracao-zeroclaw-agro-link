import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
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
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getNfe } from '../../services/fiscal';

// Função auxiliar para formatar moeda
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

interface NfeImpostosDetailProps {
  id: number;
  onClose: () => void;
}

/**
 * NfeImpostosDetail Component
 * Displays detailed tax information for a NFe
 * Shows ICMS, PIS, COFINS breakdown by item and totals
 */
const NfeImpostosDetail: React.FC<NfeImpostosDetailProps> = ({ id, onClose }) => {
  const [nfe, setNfe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getNfe(id)
      .then((r) => setNfe(r.data))
      .catch(() => setNfe(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <CircularProgress />;
  if (!nfe) return <Alert severity="error">Nota não encontrada.</Alert>;

  // Calcular totais de impostos
  const calculateTotalTaxes = () => {
    let totals = { icms: 0, pis: 0, cofins: 0 };
    
    if (Array.isArray(nfe.itens)) {
      nfe.itens.forEach((item: any) => {
        // Os valores de impostos estão no objeto aninhado 'imposto'
        if (item.imposto?.icms_valor) totals.icms += parseFloat(item.imposto.icms_valor);
        if (item.imposto?.pis_valor) totals.pis += parseFloat(item.imposto.pis_valor);
        if (item.imposto?.cofins_valor) totals.cofins += parseFloat(item.imposto.cofins_valor);
      });
    }
    return totals;
  };

  const taxes = calculateTotalTaxes();
  const totalValue = parseFloat(nfe.valor_nota || nfe.valor || 0);
  const totalTaxes = taxes.icms + taxes.pis + taxes.cofins;
  const effectiveRate = totalValue > 0 ? ((totalTaxes / totalValue) * 100).toFixed(2) : '0.00';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Impostos - NFe {nfe.numero}/{nfe.serie}</Typography>
            <Chip label="Detalhado" color="info" variant="outlined" size="small" />
          </Box>
        }
        action={
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        }
      />

      {/* Content */}
      <CardContent sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Referência da Nota */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Referência da Nota
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Chave de Acesso
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {nfe.chave_acesso}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Emitente
              </Typography>
              <Typography variant="body2">{nfe.emitente_nome}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Valor Total
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                R$ {formatCurrency(totalValue).replace('.', ',')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Quantidade de Itens
              </Typography>
              <Typography variant="body2">
                {Array.isArray(nfe.itens) ? nfe.itens.length : 0}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Resumo de Impostos */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Resumo de Impostos
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 3 }}>
          <Box sx={{ bgcolor: 'error.lighter', p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              ICMS
            </Typography>
            <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 700 }}>
              R$ {formatCurrency(taxes.icms).replace('.', ',')}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'warning.lighter', p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              PIS
            </Typography>
            <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 700 }}>
              R$ {formatCurrency(taxes.pis).replace('.', ',')}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: 'info.lighter', p: 2, borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              COFINS
            </Typography>
            <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 700 }}>
              R$ {formatCurrency(taxes.cofins).replace('.', ',')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ bgcolor: 'success.lighter', p: 2, borderRadius: 1, mb: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Total de Impostos
          </Typography>
          <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 700 }}>
            R$ {formatCurrency(totalTaxes).replace('.', ',')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {effectiveRate}% da nota
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Detalhamento por Item */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Detalhamento por Item
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Descrição</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Valor</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>ICMS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>PIS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>COFINS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(nfe.itens) && nfe.itens.length > 0 ? (
                nfe.itens.map((item: any, idx: number) => (
                  <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 500 }}>{item.numero_item}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.descricao}
                    </TableCell>
                    <TableCell align="right">R$ {formatCurrency(item.valor_produto || 0).replace('.', ',')}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      R$ {formatCurrency(item.imposto?.icms_valor || 0).replace('.', ',')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'warning.main' }}>
                      R$ {formatCurrency(item.imposto?.pis_valor || 0).replace('.', ',')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'info.main' }}>
                      R$ {formatCurrency(item.imposto?.cofins_valor || 0).replace('.', ',')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 2 }}>
                    <Typography color="text.secondary">Nenhum item com detalhes de imposto</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            💡 Os valores de impostos são extraídos do XML da nota fiscal. 
            Se aparecerem como R$ 0,00, os dados podem não estar mapeados no banco.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default NfeImpostosDetail;
