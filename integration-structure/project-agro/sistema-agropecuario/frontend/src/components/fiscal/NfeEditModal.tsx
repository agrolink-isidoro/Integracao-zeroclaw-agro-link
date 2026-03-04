import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import { getNfe, createItemOverride, getNfeDivergencias, applyItemOverride, saveAndReflect, updateNfe } from '../../services/fiscal';
import produtosService from '../../services/produtos';
import { useToast } from '../../hooks/useToast';

type Props = {
  open: boolean;
  nfeId: number | null;
  onClose: () => void;
  onSaved?: () => void;
  onRefresh?: () => void;
};

const NfeEditModal: React.FC<Props> = ({ open, nfeId, onClose, onSaved, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nfe, setNfe] = useState<any | null>(null);
  const [itemsState, setItemsState] = useState<Record<number, { quantidade: string; valor_unitario: string }>>({});
  const [fornecedorNome, setFornecedorNome] = useState<string>('');
  const [fornecedorCnpj, setFornecedorCnpj] = useState<string>('');
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || !nfeId) return;
    setLoading(true);
    getNfe(nfeId)
      .then((r) => {
        setNfe(r.data);
        // Input fields always show the NFe's own emitente values (not the commercial fornecedor)
        setFornecedorNome(r.data.emitente_nome ?? '');
        setFornecedorCnpj(r.data.emitente_cnpj ?? '');
        const s: Record<number, { quantidade: string; valor_unitario: string }> = {};
        (r.data.itens || []).forEach((it: any) => {
          s[it.id] = {
            quantidade: String(it.effective_quantidade ?? it.quantidade_comercial ?? ''),
            valor_unitario: (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : ''
          };
        });
        setItemsState(s);
        // fetch divergences for this NFe (show 'Refletir' actions)
        getNfeDivergencias(nfeId)
          .then((dr) => {
            const map: Record<number, any> = {};
            (dr.data || []).forEach((d: any) => {
              if (d.item_id) map[d.item_id] = d;
            });
            setNfeDivergenciasMap(map);
          })
          .catch(() => {
            // Non-fatal; UI can proceed without divergences
            setNfeDivergenciasMap(null);
          });

        // Also fetch product stock for each item so the modal can detect divergences locally
        (r.data.itens || []).length > 0 && (async () => {
          try {
            const codes = Array.from(new Set((r.data.itens || []).map((it: any) => it.codigo_produto).filter(Boolean))) as string[];
            const mapObj: Record<string, { quantidade: number | null; valor_unitario: number | null }> = {};
            await Promise.all(codes.map(async (code: string) => {
              try {
                const found = await produtosService.buscarSimples(code, 1);
                if (found && found.length > 0) {
                  const p: any = found[0];
                  mapObj[code] = {
                    quantidade: p.quantidade_estoque != null ? Number(p.quantidade_estoque) : null,
                    valor_unitario: (p.custo_medio ?? p.custo_unitario ?? p.preco_medio) != null ? Number(p.custo_medio ?? p.custo_unitario ?? p.preco_medio) : null,
                  };
                } else {
                  mapObj[code] = { quantidade: null, valor_unitario: null };
                }
              } catch (e) {
                mapObj[code] = { quantidade: null, valor_unitario: null };
              }
            }));
            setProdutoEstoqueMapObj(mapObj);
          } catch (e) {
            // ignore
          }
        })();
        setItemsState(s);
      })
      .catch(() => {
        showError('Erro ao carregar NFe');
      })
      .finally(() => setLoading(false));
  }, [open, nfeId]);

  const handleChange = (itemId: number, field: 'quantidade' | 'valor_unitario', value: string) => {
    setItemsState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [nfeDivergenciasMap, setNfeDivergenciasMap] = useState<Record<number, any> | null>(null);
  const [reflectingOverrides, setReflectingOverrides] = useState<Record<string | number, boolean>>({});
  // produtoEstoqueMapObj stores estoque info per produto code
  const [produtoEstoqueMapObj, setProdutoEstoqueMapObj] = useState<Record<string, { quantidade: number | null; valor_unitario: number | null }>>({});
  const [reflectFornecedorConfirmOpen, setReflectFornecedorConfirmOpen] = useState(false);
  const [reflectFornecedorConflict, setReflectFornecedorConflict] = useState<any | null>(null);

  const [pendingSaveOptions, setPendingSaveOptions] = useState<{ keepOpen: boolean; reflect: boolean } | null>(null);

  const doSave = async (keepOpen = false, reflect = false) => {
    if (!nfe) return;
    setSaving(true);
    try {
      // Persist fornecedor/emitente changes on the NFe itself if they differ (trim-only comparison)
      let fornecedorSaved = false;
      try {
        const nomeTrim = fornecedorNome == null ? '' : fornecedorNome.trim();
        const cnpjClean = fornecedorCnpj == null ? '' : fornecedorCnpj.replace(/\D/g, '').trim();
        const nfeNomeSaved = (nfe.emitente_nome ?? '').trim();
        const nfeCnpjSaved = (nfe.emitente_cnpj ?? '').replace(/\D/g, '').trim();
        const upd: any = {};
        if (nomeTrim !== nfeNomeSaved) upd.emitente_nome = nomeTrim;
        if (cnpjClean !== nfeCnpjSaved) upd.emitente_cnpj = cnpjClean;
        if (Object.keys(upd).length > 0) {
          await updateNfe(nfe.id, upd);
          fornecedorSaved = true;
        }
      } catch (e) {
        // Non-fatal: continue with saving item overrides even if NFe update failed
        console.warn('Failed to update NFe emitente fields', e);
      }
      const payloads: any[] = [];
      (nfe.itens || []).forEach((it: any) => {
        const s = itemsState[it.id];
        if (!s) return;
        // Normalize values for comparison: quantities we treat as strings, valor_unitario as 2-decimal string
        const origVal = (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : '';
        const changed = (
          String(it.effective_quantidade ?? it.quantidade_comercial) !== String(s.quantidade)
        ) || (
          // compare numeric values rounded to 2 decimals to avoid formatting differences ("99.5" vs "99.50")
          (s.valor_unitario !== ''
            ? Number(s.valor_unitario).toFixed(2) !== (origVal || '').toString()
            : (origVal !== ''))
        );
        if (changed) {
          // Prepare normalized payload values (applyToStock controls aplicado)
          const payload: any = { item: it.id, aplicado: false, motivo: 'Edit via UI' };
          if (s.quantidade !== '') payload.quantidade = s.quantidade;
          if (s.valor_unitario !== '') payload.valor_unitario = Number(s.valor_unitario).toFixed(2);
          payloads.push(payload);
        }
      });

      if (payloads.length === 0 && !fornecedorSaved) {
        showSuccess('Nenhuma alteração detectada');
        if (onSaved) onSaved();
        if (!keepOpen) onClose();
        return;
      }

      if (payloads.length > 0) {
        if (reflect) {
          // Call atomic save+reflect endpoint
          await saveAndReflect(nfe.id, payloads.map((p) => ({ item_id: p.item, quantidade: p.quantidade, valor_unitario: p.valor_unitario })));
        } else {
          // Submit sequentially; saving will create overrides but will NOT apply them to stock.
          const results: any[] = [];
          for (const p of payloads) {
            try {
              // Explicitly ensure we do not apply to stock here
              const body = { ...p, aplicado: false };
              const r = await createItemOverride(body);
              results.push(r);
            } catch (err: any) {
              throw err;
            }
          }
        }
      }

      // Refresh NFe so UI reflects saved values immediately (helps when parent does not reload)
      try {
        if (nfeId) {
          const refreshed = await getNfe(nfeId);
          setNfe(refreshed.data);
          const s: Record<number, { quantidade: string; valor_unitario: string }> = {};
          (refreshed.data.itens || []).forEach((it: any) => {
            s[it.id] = {
              quantidade: String(it.effective_quantidade ?? it.quantidade_comercial ?? ''),
              valor_unitario: (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : ''
            };
          });
          setItemsState(s);
          // Sync input fields with refreshed NFe emitente values
          setFornecedorNome(refreshed.data.emitente_nome ?? '');
          setFornecedorCnpj(refreshed.data.emitente_cnpj ?? '');
        }
      } catch (e) {
        // Non-fatal; continue
      }

      if (onRefresh) onRefresh();

      showSuccess('Alterações gravadas');
      if (onSaved) onSaved();
      if (!keepOpen) onClose();
    } catch (err: any) {
      console.error('Erro ao salvar overrides', err);
      // Handle 403 (forbidden) explicitly with friendlier message
      if (err?.response?.status === 403) {
        showError(err?.response?.data?.detail || 'Você não tem permissão para aplicar overrides em NF-e confirmadas.');
      } else {
        showError(err?.response?.data?.detail || 'Erro ao salvar alterações');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!nfe) return;
    // If NFe already confirmed, show confirmation dialog before saving changes
    if (nfe.estoque_confirmado) {
      setPendingSaveOptions({ keepOpen: false, reflect: false });
      setConfirmOpen(true);
      return;
    }
    void doSave(false, false);
  };

  const handleSaveKeepOpen = () => {
    if (!nfe) return;
    if (nfe.estoque_confirmado) {
      setPendingSaveOptions({ keepOpen: true, reflect: false });
      setConfirmOpen(true);
      return;
    }
    void doSave(true, false);
  };

  const handleSaveAndReflect = () => {
    if (!nfe) return;
    if (nfe.estoque_confirmado) {
      setPendingSaveOptions({ keepOpen: true, reflect: true });
      setConfirmOpen(true);
      return;
    }
    void doSave(true, true);
  };

  const handleConfirmApply = () => {
    setConfirmOpen(false);
    const opts = pendingSaveOptions ?? { keepOpen: false, reflect: false };
    setPendingSaveOptions(null);
    void doSave(opts.keepOpen, opts.reflect);
  };

  const handleCancelApply = () => {
    setConfirmOpen(false);
  };

  const handleReflect = async (overrideId: number) => {
    console.log('Reflecting override', overrideId);
    try {
      setReflectingOverrides((prev) => ({ ...prev, [overrideId]: true }));
      const response = await applyItemOverride(overrideId);
      console.log('Apply response:', response);
      console.log('Apply response data:', response?.data);
      showSuccess('Override aplicado no estoque');
      
      // Invalidate produto queries to refresh cost data
      queryClient.invalidateQueries({ queryKey: ['produtos'], exact: false });
      
      // Refresh NFe and divergences
      if (nfeId) {
        const r = await getNfe(nfeId);
        setNfe(r.data);
        // Refresh divergences
        const dr = await getNfeDivergencias(nfeId);
        const map: Record<number, any> = {};
        (dr.data || []).forEach((d: any) => {
          if (d.item_id) map[d.item_id] = d;
        });
        setNfeDivergenciasMap(map);

        // Re-fetch product stock info for all items in this NFe so estoque columns update immediately
        try {
          const codes = Array.from(new Set((r.data.itens || []).map((it: any) => it.codigo_produto).filter(Boolean))) as string[];
          const mapObj: Record<string, { quantidade: number | null; valor_unitario: number | null }> = {};
          await Promise.all(codes.map(async (code: string) => {
            try {
              const found = await produtosService.buscarSimples(code, 1);
              if (found && found.length > 0) {
                const p: any = found[0];
                mapObj[code] = {
                  quantidade: p.quantidade_estoque != null ? Number(p.quantidade_estoque) : null,
                  valor_unitario: (p.custo_medio ?? p.custo_unitario ?? p.preco_medio) != null ? Number(p.custo_medio ?? p.custo_unitario ?? p.preco_medio) : null,
                };
              } else {
                mapObj[code] = { quantidade: null, valor_unitario: null };
              }
            } catch (e) {
              mapObj[code] = { quantidade: null, valor_unitario: null };
            }
          }));
          setProdutoEstoqueMapObj((prev) => ({ ...prev, ...mapObj }));
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('Failed to apply override', err);
      console.error('Error response:', err?.response);
      console.error('Error response data:', err?.response?.data);
      console.error('Error response status:', err?.response?.status);
      showError(err?.response?.data?.detail || 'Falha ao aplicar override');
    } finally {
      setReflectingOverrides((prev) => ({ ...prev, [overrideId]: false }));
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Editar valores da NFe</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && !nfe && (
          <Typography color="error">Nota não encontrada</Typography>
        )}

        {!loading && nfe && (
          <div>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{`NFe ${nfe.numero}/${nfe.serie} - ${nfe.emitente_nome}`}</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <TextField size="small" label="Fornecedor (nome)" value={fornecedorNome} onChange={(e) => setFornecedorNome(e.target.value)} />
              <TextField size="small" label="CNPJ" value={fornecedorCnpj} onChange={(e) => setFornecedorCnpj(e.target.value)} />
              {/* Display linked Fornecedor (Comercial) as plain read-only text */}
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 1 }}>
                <Typography variant="body2" color="text.secondary">Fornecedor (Comercial)</Typography>
                <Typography variant="body1">{nfe.fornecedor_nome ?? '-'}</Typography>
              </Box>
              {(() => {
                // Compute whether reflect should be enabled: no unsaved local edits and actual difference vs commercial fornecedor
                const norm = (s: any) => (s == null ? '' : String(s).trim());
                const normCnpj = (s: any) => (s == null ? '' : String(s).replace(/\D/g, '').trim());
                // Unsaved edit: input fields differ from the saved NFe emitente values
                const unsavedFornecedorEdit = (norm(fornecedorNome) !== norm(nfe.emitente_nome ?? '')) || (normCnpj(fornecedorCnpj) !== normCnpj(nfe.emitente_cnpj ?? ''));
                // Commercial fornecedor values (from the linked Fornecedor in comercial module)
                const commercialName = norm(nfe.fornecedor_nome ?? '');
                const commercialCnpj = normCnpj(nfe.fornecedor_cpf_cnpj ?? '');
                // Use the saved values from the NFe (not the current input) to determine real difference
                const nfeNameSaved = norm(nfe.emitente_nome ?? '');
                const nfeCnpjSaved = normCnpj(nfe.emitente_cnpj ?? '');
                const differsName = (commercialName === '' ? nfeNameSaved !== '' : commercialName !== nfeNameSaved);
                const differsCnpj = (commercialCnpj === '' ? nfeCnpjSaved !== '' : commercialCnpj !== nfeCnpjSaved);
                const canReflectFornecedor = !unsavedFornecedorEdit && (differsName || differsCnpj);

                return (
                  <Tooltip title={canReflectFornecedor ? 'Refletir fornecedor no Comercial' : 'Sem diferenças para refletir ou existem edições não salvas'} arrow>
                    <span>
                      <Button variant="outlined" disabled={!canReflectFornecedor} onClick={async () => {
                        if (!canReflectFornecedor || !nfeId) return;
                        try {
                          const fiscalSvc = await import('../../services/fiscal');
                          const resp = await fiscalSvc.reflectFornecedor(nfeId, false, { nome: fornecedorNome, cpf_cnpj: fornecedorCnpj });
                          if (resp.data && resp.data.conflict) {
                            setReflectFornecedorConflict({ diff: resp.data.diff, fornecedor: resp.data.fornecedor });
                            setReflectFornecedorConfirmOpen(true);
                          } else {
                            showSuccess('Fornecedor refletido com sucesso');
                            const r = await getNfe(nfeId);
                            setNfe(r.data);
                            // Sync inputs from refreshed NFe emitente values
                            setFornecedorNome(r.data.emitente_nome ?? '');
                            setFornecedorCnpj(r.data.emitente_cnpj ?? '');
                          }
                        } catch (err: any) {
                          console.error('reflect fornecedor error', err);
                          showError(err?.response?.data?.detail || 'Erro ao refletir fornecedor');
                        }
                      }}>Refletir no Comercial</Button>
                    </span>
                  </Tooltip>
                );
              })()}
            </Box>
            {!nfe.estoque_confirmado && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta NFe ainda não foi confirmada no estoque. Para refletir alterações no estoque, primeiro confirme a entrada em estoque na página de detalhes da NFe.
              </Alert>
            )}
            {/* Note: changes saved here will NOT be applied to stock automatically. Use 'Refletir no Estoque' per item to reflect changes in inventory. */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Qtd (efetiva)</TableCell>
                  <TableCell align="right">Valor Unit. (efetivo)</TableCell>
                  <TableCell sx={{ width: 12 }} />
                  <TableCell align="right">Estoque - Qtd</TableCell>
                  <TableCell align="right">Estoque - Valor</TableCell>
                  <TableCell align="right">Alterar qtd</TableCell>
                  <TableCell align="right">Alterar valor</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(nfe.itens || []).map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{it.numero_item}</TableCell>
                    <TableCell>{it.descricao}</TableCell>
                    <TableCell align="right">{it.effective_quantidade ?? it.quantidade_comercial}</TableCell>
                    <TableCell align="right">{(it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : ''}</TableCell>
                    <TableCell>
                      <Box sx={{ height: '100%', borderLeft: '2px solid #e0e0e0' }} />
                    </TableCell>
                    <TableCell align="right">{produtoEstoqueMapObj[it.codigo_produto] && produtoEstoqueMapObj[it.codigo_produto].quantidade != null ? String(produtoEstoqueMapObj[it.codigo_produto].quantidade) : '-'}</TableCell>
                    <TableCell align="right">{produtoEstoqueMapObj[it.codigo_produto] && produtoEstoqueMapObj[it.codigo_produto].valor_unitario != null ? Number(produtoEstoqueMapObj[it.codigo_produto].valor_unitario).toFixed(2) : '-'}</TableCell>
                    <TableCell align="right">
                      <TextField size="small" value={itemsState[it.id]?.quantidade ?? ''} onChange={(e) => handleChange(it.id, 'quantidade', e.target.value)} />
                    </TableCell>
                    <TableCell align="right">
                      <TextField size="small" value={itemsState[it.id]?.valor_unitario ?? ''} onChange={(e) => handleChange(it.id, 'valor_unitario', e.target.value)} />
                    </TableCell>
                    <TableCell align="center">
                      {/** Reflect button - disabled until edits are saved for this item */}
                      {(() => {
                        const divergence = nfeDivergenciasMap && nfeDivergenciasMap[it.id];
                        const key = divergence && divergence.override_id ? divergence.override_id : `item-${it.id}`;

                        // NFe values (may be strings like '2.0000' or '99.50')
                        const nfeQty = it.effective_quantidade ?? it.quantidade_comercial;
                        const nfeValRaw = it.effective_valor_unitario ?? it.valor_unitario_comercial;

                        // Stock info from product lookup
                        const estoqueInfo = produtoEstoqueMapObj[it.codigo_produto] ?? { quantidade: null, valor_unitario: null };
                        const estoqueQty = estoqueInfo.quantidade;
                        const estoqueValRaw = estoqueInfo.valor_unitario;

                        // Normalize to numbers with 2dp for robust comparison
                        const toNum = (v: any): number | null => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
                        const to2dp = (v: any): string | null => { const n = toNum(v); return n == null ? null : n.toFixed(2); };

                        const normNfeQty = toNum(nfeQty);
                        const normEstoqueQty = toNum(estoqueQty);
                        const normNfeVal2dp = to2dp(nfeValRaw);
                        const normEstoqueVal2dp = to2dp(estoqueValRaw);

                        // differsQty: true if estoque has no qty and nfe has qty, or if both exist and differ
                        const differsQty = (normEstoqueQty == null && normNfeQty != null) || (normEstoqueQty != null && normNfeQty != null && normNfeQty !== normEstoqueQty);
                        // differsVal: true if estoque has no val and nfe has val, or if both exist and 2dp strings differ
                        const differsVal = (normEstoqueVal2dp == null && normNfeVal2dp != null) || (normEstoqueVal2dp != null && normNfeVal2dp != null && normNfeVal2dp !== normEstoqueVal2dp);

                        // If the user has edited the local inputs and not saved them yet, disable reflect
                        const localEdit = itemsState[it.id];
                        const localQtyStr = localEdit?.quantidade ?? '';
                        const localVal2dp = to2dp(localEdit?.valor_unitario);
                        const nfeQtyStr = String(nfeQty ?? '');
                        const nfeVal2dpStr = normNfeVal2dp ?? '';
                        const unsavedEdit = (localQtyStr !== nfeQtyStr) || (localVal2dp !== nfeVal2dpStr && !(localVal2dp == null && nfeVal2dpStr === ''));

                        const canReflect = !unsavedEdit && (differsQty || differsVal);
                        return (
                          <Tooltip title={canReflect ? 'Refletir no estoque' : 'Sem diferenças para refletir'} arrow>
                            <span>
                              <Button size="small" onClick={async () => {
                                if (!canReflect) return;
                                if (divergence && divergence.override_id) {
                                  await handleReflect(divergence.override_id);
                                  return;
                                }
                                // No existing override: create one with aplicado=true and attempt to apply synchronously
                                try {
                                  setReflectingOverrides((prev) => ({ ...prev, [key]: true }));
                                  const payload: any = { item: it.id, quantidade: String(it.effective_quantidade ?? it.quantidade_comercial), valor_unitario: (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : undefined, aplicado: true, motivo: 'Refletir no Estoque (usuário)'};
                                  try {
                                    await createItemOverride(payload);
                                    showSuccess('Override criado e aplicado no estoque');
                                  } catch (err: any) {
                                    if (err?.response?.status === 403) {
                                      const fallback = { ...payload, aplicado: false };
                                      await createItemOverride(fallback);
                                      showError(err?.response?.data?.detail || 'Você não tem permissão para aplicar overrides em NF-e confirmadas. Override criado sem aplicar.');
                                    } else {
                                      throw err;
                                    }
                                  }
                                  // refresh NFe and stock
                                  if (nfeId) {
                                    const r = await getNfe(nfeId);
                                    setNfe(r.data);
                                    // refetch product stock for this product
                                    try {
                                      const found = await produtosService.buscarSimples(it.codigo_produto, 1);
                                      if (found && found.length > 0) {
                                        const p: any = found[0];
                                        setProdutoEstoqueMapObj((prev) => ({ ...prev, [it.codigo_produto]: { quantidade: p.quantidade_estoque != null ? Number(p.quantidade_estoque) : null, valor_unitario: (p.custo_medio ?? p.custo_unitario ?? p.preco_medio) != null ? Number(p.custo_medio ?? p.custo_unitario ?? p.preco_medio) : null } }));
                                      }
                                    } catch (e) {
                                      // ignore
                                    }
                                    const dr = await getNfeDivergencias(nfeId);
                                    const map: Record<number, any> = {};
                                    (dr.data || []).forEach((d: any) => {
                                      if (d.item_id) map[d.item_id] = d;
                                    });
                                    setNfeDivergenciasMap(map);
                                  }
                                } catch (err: any) {
                                  console.error('Failed to create/apply override', err);
                                  showError(err?.response?.data?.detail || 'Falha ao aplicar/criar override');
                                } finally {
                                  setReflectingOverrides((prev) => ({ ...prev, [key]: false }));
                                }
                              }} disabled={reflectingOverrides[key] || !canReflect}>
                                {reflectingOverrides[key] ? 'Refletindo...' : 'Refletir no Estoque'}
                              </Button>
                            </span>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="outlined" onClick={handleSaveKeepOpen} disabled={saving}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Salvar e Manter Aberto'}
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Salvar e Fechar'}
        </Button>
        <Button variant="contained" color="primary" onClick={handleSaveAndReflect} disabled={saving} sx={{ ml: 1, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'Salvar e Refletir'}
        </Button>
      </DialogActions>
    </Dialog>

      {/* Confirmation dialog when NFe already confirmed */}
      <Dialog open={confirmOpen} onClose={handleCancelApply} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar alterações</DialogTitle>
        <DialogContent dividers>
          <Typography>
            As alterações serão salvas. Elas <strong>não</strong> serão aplicadas ao estoque automaticamente. Deseja salvar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelApply}>Cancelar</Button>
          <Button variant="contained" color="primary" onClick={handleConfirmApply}>Confirmar</Button>
        </DialogActions>
      </Dialog>
      {/* Reflect Fornecedor conflict dialog */}
      <Dialog open={reflectFornecedorConfirmOpen} onClose={() => setReflectFornecedorConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Conflito ao refletir fornecedor</DialogTitle>
        <DialogContent dividers>
          <Typography>Fornecedor existente encontrado com diferenças. Revise o diff abaixo e confirme se deseja forçar a atualização.</Typography>
          <Box sx={{ mt: 2 }}>
            {reflectFornecedorConflict && reflectFornecedorConflict.diff ? Object.entries(reflectFornecedorConflict.diff).map(([k, v]: any) => (
              <Box key={k} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{k}</Typography>
                <Typography>Atual: {v.current}</Typography>
                <Typography>Desejado: {v.desired}</Typography>
              </Box>
            )) : <Typography>Nenhum diff disponível</Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReflectFornecedorConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={async () => {
            if (!nfeId) return;
            try {
              const fiscalSvc = await import('../../services/fiscal');
              const resp = await fiscalSvc.reflectFornecedor(nfeId, true, { nome: fornecedorNome, cpf_cnpj: fornecedorCnpj });
              showSuccess('Fornecedor atualizado (forçado)');
              const r = await getNfe(nfeId);
              setNfe(r.data);
            } catch (err: any) {
              showError(err?.response?.data?.detail || 'Erro ao forçar atualização');
            } finally {
              setReflectFornecedorConfirmOpen(false);
            }
          }}>Forçar atualização</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NfeEditModal;
