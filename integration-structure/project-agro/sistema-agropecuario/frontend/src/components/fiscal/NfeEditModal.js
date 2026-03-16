import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead, TableRow, TableCell, TableBody, TextField, CircularProgress, Box, Typography, Alert, Tooltip, } from '@mui/material';
import { getNfe, createItemOverride, getNfeDivergencias, applyItemOverride, saveAndReflect, updateNfe } from '../../services/fiscal';
import produtosService from '../../services/produtos';
import { useToast } from '../../hooks/useToast';
const NfeEditModal = ({ open, nfeId, onClose, onSaved, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nfe, setNfe] = useState(null);
    const [itemsState, setItemsState] = useState({});
    const [fornecedorNome, setFornecedorNome] = useState('');
    const [fornecedorCnpj, setFornecedorCnpj] = useState('');
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!open || !nfeId)
            return;
        setLoading(true);
        getNfe(nfeId)
            .then((r) => {
            setNfe(r.data);
            // Input fields always show the NFe's own emitente values (not the commercial fornecedor)
            setFornecedorNome(r.data.emitente_nome ?? '');
            setFornecedorCnpj(r.data.emitente_cnpj ?? '');
            const s = {};
            (r.data.itens || []).forEach((it) => {
                s[it.id] = {
                    quantidade: String(it.effective_quantidade ?? it.quantidade_comercial ?? ''),
                    valor_unitario: (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : ''
                };
            });
            setItemsState(s);
            // fetch divergences for this NFe (show 'Refletir' actions)
            getNfeDivergencias(nfeId)
                .then((dr) => {
                const map = {};
                (dr.data || []).forEach((d) => {
                    if (d.item_id)
                        map[d.item_id] = d;
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
                    const codes = Array.from(new Set((r.data.itens || []).map((it) => it.codigo_produto).filter(Boolean)));
                    const mapObj = {};
                    await Promise.all(codes.map(async (code) => {
                        try {
                            const found = await produtosService.buscarSimples(code, 1);
                            if (found && found.length > 0) {
                                const p = found[0];
                                mapObj[code] = {
                                    quantidade: p.quantidade_estoque != null ? Number(p.quantidade_estoque) : null,
                                    valor_unitario: (p.custo_medio ?? p.custo_unitario ?? p.preco_medio) != null ? Number(p.custo_medio ?? p.custo_unitario ?? p.preco_medio) : null,
                                };
                            }
                            else {
                                mapObj[code] = { quantidade: null, valor_unitario: null };
                            }
                        }
                        catch (e) {
                            mapObj[code] = { quantidade: null, valor_unitario: null };
                        }
                    }));
                    setProdutoEstoqueMapObj(mapObj);
                }
                catch (e) {
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
    const handleChange = (itemId, field, value) => {
        setItemsState((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
    };
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [nfeDivergenciasMap, setNfeDivergenciasMap] = useState(null);
    const [reflectingOverrides, setReflectingOverrides] = useState({});
    // produtoEstoqueMapObj stores estoque info per produto code
    const [produtoEstoqueMapObj, setProdutoEstoqueMapObj] = useState({});
    const [reflectFornecedorConfirmOpen, setReflectFornecedorConfirmOpen] = useState(false);
    const [reflectFornecedorConflict, setReflectFornecedorConflict] = useState(null);
    const [pendingSaveOptions, setPendingSaveOptions] = useState(null);
    const doSave = async (keepOpen = false, reflect = false) => {
        if (!nfe)
            return;
        setSaving(true);
        try {
            // Persist fornecedor/emitente changes on the NFe itself if they differ (trim-only comparison)
            let fornecedorSaved = false;
            try {
                const nomeTrim = fornecedorNome == null ? '' : fornecedorNome.trim();
                const cnpjClean = fornecedorCnpj == null ? '' : fornecedorCnpj.replace(/\D/g, '').trim();
                const nfeNomeSaved = (nfe.emitente_nome ?? '').trim();
                const nfeCnpjSaved = (nfe.emitente_cnpj ?? '').replace(/\D/g, '').trim();
                const upd = {};
                if (nomeTrim !== nfeNomeSaved)
                    upd.emitente_nome = nomeTrim;
                if (cnpjClean !== nfeCnpjSaved)
                    upd.emitente_cnpj = cnpjClean;
                if (Object.keys(upd).length > 0) {
                    await updateNfe(nfe.id, upd);
                    fornecedorSaved = true;
                }
            }
            catch (e) {
                // Non-fatal: continue with saving item overrides even if NFe update failed
                console.warn('Failed to update NFe emitente fields', e);
            }
            const payloads = [];
            (nfe.itens || []).forEach((it) => {
                const s = itemsState[it.id];
                if (!s)
                    return;
                // Normalize values for comparison: quantities we treat as strings, valor_unitario as 2-decimal string
                const origVal = (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : '';
                const changed = (String(it.effective_quantidade ?? it.quantidade_comercial) !== String(s.quantidade)) || (
                // compare numeric values rounded to 2 decimals to avoid formatting differences ("99.5" vs "99.50")
                (s.valor_unitario !== ''
                    ? Number(s.valor_unitario).toFixed(2) !== (origVal || '').toString()
                    : (origVal !== '')));
                if (changed) {
                    // Prepare normalized payload values (applyToStock controls aplicado)
                    const payload = { item: it.id, aplicado: false, motivo: 'Edit via UI' };
                    if (s.quantidade !== '')
                        payload.quantidade = s.quantidade;
                    if (s.valor_unitario !== '')
                        payload.valor_unitario = Number(s.valor_unitario).toFixed(2);
                    payloads.push(payload);
                }
            });
            if (payloads.length === 0 && !fornecedorSaved) {
                showSuccess('Nenhuma alteração detectada');
                if (onSaved)
                    onSaved();
                if (!keepOpen)
                    onClose();
                return;
            }
            if (payloads.length > 0) {
                if (reflect) {
                    // Call atomic save+reflect endpoint
                    await saveAndReflect(nfe.id, payloads.map((p) => ({ item_id: p.item, quantidade: p.quantidade, valor_unitario: p.valor_unitario })));
                }
                else {
                    // Submit sequentially; saving will create overrides but will NOT apply them to stock.
                    const results = [];
                    for (const p of payloads) {
                        try {
                            // Explicitly ensure we do not apply to stock here
                            const body = { ...p, aplicado: false };
                            const r = await createItemOverride(body);
                            results.push(r);
                        }
                        catch (err) {
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
                    const s = {};
                    (refreshed.data.itens || []).forEach((it) => {
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
            }
            catch (e) {
                // Non-fatal; continue
            }
            if (onRefresh)
                onRefresh();
            showSuccess('Alterações gravadas');
            if (onSaved)
                onSaved();
            if (!keepOpen)
                onClose();
        }
        catch (err) {
            console.error('Erro ao salvar overrides', err);
            // Handle 403 (forbidden) explicitly with friendlier message
            if (err?.response?.status === 403) {
                showError(err?.response?.data?.detail || 'Você não tem permissão para aplicar overrides em NF-e confirmadas.');
            }
            else {
                showError(err?.response?.data?.detail || 'Erro ao salvar alterações');
            }
        }
        finally {
            setSaving(false);
        }
    };
    const handleSave = () => {
        if (!nfe)
            return;
        // If NFe already confirmed, show confirmation dialog before saving changes
        if (nfe.estoque_confirmado) {
            setPendingSaveOptions({ keepOpen: false, reflect: false });
            setConfirmOpen(true);
            return;
        }
        void doSave(false, false);
    };
    const handleSaveKeepOpen = () => {
        if (!nfe)
            return;
        if (nfe.estoque_confirmado) {
            setPendingSaveOptions({ keepOpen: true, reflect: false });
            setConfirmOpen(true);
            return;
        }
        void doSave(true, false);
    };
    const handleSaveAndReflect = () => {
        if (!nfe)
            return;
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
    const handleReflect = async (overrideId) => {
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
                const map = {};
                (dr.data || []).forEach((d) => {
                    if (d.item_id)
                        map[d.item_id] = d;
                });
                setNfeDivergenciasMap(map);
                // Re-fetch product stock info for all items in this NFe so estoque columns update immediately
                try {
                    const codes = Array.from(new Set((r.data.itens || []).map((it) => it.codigo_produto).filter(Boolean)));
                    const mapObj = {};
                    await Promise.all(codes.map(async (code) => {
                        try {
                            const found = await produtosService.buscarSimples(code, 1);
                            if (found && found.length > 0) {
                                const p = found[0];
                                mapObj[code] = {
                                    quantidade: p.quantidade_estoque != null ? Number(p.quantidade_estoque) : null,
                                    valor_unitario: (p.custo_medio ?? p.custo_unitario ?? p.preco_medio) != null ? Number(p.custo_medio ?? p.custo_unitario ?? p.preco_medio) : null,
                                };
                            }
                            else {
                                mapObj[code] = { quantidade: null, valor_unitario: null };
                            }
                        }
                        catch (e) {
                            mapObj[code] = { quantidade: null, valor_unitario: null };
                        }
                    }));
                    setProdutoEstoqueMapObj((prev) => ({ ...prev, ...mapObj }));
                }
                catch (e) {
                    // ignore
                }
            }
        }
        catch (err) {
            console.error('Failed to apply override', err);
            console.error('Error response:', err?.response);
            console.error('Error response data:', err?.response?.data);
            console.error('Error response status:', err?.response?.status);
            showError(err?.response?.data?.detail || 'Falha ao aplicar override');
        }
        finally {
            setReflectingOverrides((prev) => ({ ...prev, [overrideId]: false }));
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "lg", children: [_jsx(DialogTitle, { children: "Editar valores da NFe" }), _jsxs(DialogContent, { dividers: true, children: [loading && (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', p: 2 }, children: _jsx(CircularProgress, {}) })), !loading && !nfe && (_jsx(Typography, { color: "error", children: "Nota n\u00E3o encontrada" })), !loading && nfe && (_jsxs("div", { children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: `NFe ${nfe.numero}/${nfe.serie} - ${nfe.emitente_nome}` }), _jsxs(Box, { sx: { display: 'flex', gap: 1, alignItems: 'center', mb: 1 }, children: [_jsx(TextField, { size: "small", label: "Fornecedor (nome)", value: fornecedorNome, onChange: (e) => setFornecedorNome(e.target.value) }), _jsx(TextField, { size: "small", label: "CNPJ", value: fornecedorCnpj, onChange: (e) => setFornecedorCnpj(e.target.value) }), _jsxs(Box, { sx: { display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 1 }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", children: "Fornecedor (Comercial)" }), _jsx(Typography, { variant: "body1", children: nfe.fornecedor_nome ?? '-' })] }), (() => {
                                                // Compute whether reflect should be enabled: no unsaved local edits and actual difference vs commercial fornecedor
                                                const norm = (s) => (s == null ? '' : String(s).trim());
                                                const normCnpj = (s) => (s == null ? '' : String(s).replace(/\D/g, '').trim());
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
                                                return (_jsx(Tooltip, { title: canReflectFornecedor ? 'Refletir fornecedor no Comercial' : 'Sem diferenças para refletir ou existem edições não salvas', arrow: true, children: _jsx("span", { children: _jsx(Button, { variant: "outlined", disabled: !canReflectFornecedor, onClick: async () => {
                                                                if (!canReflectFornecedor || !nfeId)
                                                                    return;
                                                                try {
                                                                    const fiscalSvc = await import('../../services/fiscal');
                                                                    const resp = await fiscalSvc.reflectFornecedor(nfeId, false, { nome: fornecedorNome, cpf_cnpj: fornecedorCnpj });
                                                                    if (resp.data && resp.data.conflict) {
                                                                        setReflectFornecedorConflict({ diff: resp.data.diff, fornecedor: resp.data.fornecedor });
                                                                        setReflectFornecedorConfirmOpen(true);
                                                                    }
                                                                    else {
                                                                        showSuccess('Fornecedor refletido com sucesso');
                                                                        const r = await getNfe(nfeId);
                                                                        setNfe(r.data);
                                                                        // Sync inputs from refreshed NFe emitente values
                                                                        setFornecedorNome(r.data.emitente_nome ?? '');
                                                                        setFornecedorCnpj(r.data.emitente_cnpj ?? '');
                                                                    }
                                                                }
                                                                catch (err) {
                                                                    console.error('reflect fornecedor error', err);
                                                                    showError(err?.response?.data?.detail || 'Erro ao refletir fornecedor');
                                                                }
                                                            }, children: "Refletir no Comercial" }) }) }));
                                            })()] }), !nfe.estoque_confirmado && (_jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "Esta NFe ainda n\u00E3o foi confirmada no estoque. Para refletir altera\u00E7\u00F5es no estoque, primeiro confirme a entrada em estoque na p\u00E1gina de detalhes da NFe." })), _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Item" }), _jsx(TableCell, { children: "Descri\u00E7\u00E3o" }), _jsx(TableCell, { align: "right", children: "Qtd (efetiva)" }), _jsx(TableCell, { align: "right", children: "Valor Unit. (efetivo)" }), _jsx(TableCell, { sx: { width: 12 } }), _jsx(TableCell, { align: "right", children: "Estoque - Qtd" }), _jsx(TableCell, { align: "right", children: "Estoque - Valor" }), _jsx(TableCell, { align: "right", children: "Alterar qtd" }), _jsx(TableCell, { align: "right", children: "Alterar valor" }), _jsx(TableCell, { align: "center", children: "A\u00E7\u00F5es" })] }) }), _jsx(TableBody, { children: (nfe.itens || []).map((it) => (_jsxs(TableRow, { children: [_jsx(TableCell, { sx: { fontWeight: 600 }, children: it.numero_item }), _jsx(TableCell, { children: it.descricao }), _jsx(TableCell, { align: "right", children: it.effective_quantidade ?? it.quantidade_comercial }), _jsx(TableCell, { align: "right", children: (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : '' }), _jsx(TableCell, { children: _jsx(Box, { sx: { height: '100%', borderLeft: '2px solid #e0e0e0' } }) }), _jsx(TableCell, { align: "right", children: produtoEstoqueMapObj[it.codigo_produto] && produtoEstoqueMapObj[it.codigo_produto].quantidade != null ? String(produtoEstoqueMapObj[it.codigo_produto].quantidade) : '-' }), _jsx(TableCell, { align: "right", children: produtoEstoqueMapObj[it.codigo_produto] && produtoEstoqueMapObj[it.codigo_produto].valor_unitario != null ? Number(produtoEstoqueMapObj[it.codigo_produto].valor_unitario).toFixed(2) : '-' }), _jsx(TableCell, { align: "right", children: _jsx(TextField, { size: "small", value: itemsState[it.id]?.quantidade ?? '', onChange: (e) => handleChange(it.id, 'quantidade', e.target.value) }) }), _jsx(TableCell, { align: "right", children: _jsx(TextField, { size: "small", value: itemsState[it.id]?.valor_unitario ?? '', onChange: (e) => handleChange(it.id, 'valor_unitario', e.target.value) }) }), _jsx(TableCell, { align: "center", children: (() => {
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
                                                                const toNum = (v) => (v == null || v === '' || isNaN(Number(v))) ? null : Number(v);
                                                                const to2dp = (v) => { const n = toNum(v); return n == null ? null : n.toFixed(2); };
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
                                                                return (_jsx(Tooltip, { title: canReflect ? 'Refletir no estoque' : 'Sem diferenças para refletir', arrow: true, children: _jsx("span", { children: _jsx(Button, { size: "small", onClick: async () => {
                                                                                if (!canReflect)
                                                                                    return;
                                                                                if (divergence && divergence.override_id) {
                                                                                    await handleReflect(divergence.override_id);
                                                                                    return;
                                                                                }
                                                                                // No existing override: create one with aplicado=true and attempt to apply synchronously
                                                                                try {
                                                                                    setReflectingOverrides((prev) => ({ ...prev, [key]: true }));
                                                                                    const payload = { item: it.id, quantidade: String(it.effective_quantidade ?? it.quantidade_comercial), valor_unitario: (it.effective_valor_unitario ?? it.valor_unitario_comercial) ? Number(it.effective_valor_unitario ?? it.valor_unitario_comercial).toFixed(2) : undefined, aplicado: true, motivo: 'Refletir no Estoque (usuário)' };
                                                                                    try {
                                                                                        await createItemOverride(payload);
                                                                                        showSuccess('Override criado e aplicado no estoque');
                                                                                    }
                                                                                    catch (err) {
                                                                                        if (err?.response?.status === 403) {
                                                                                            const fallback = { ...payload, aplicado: false };
                                                                                            await createItemOverride(fallback);
                                                                                            showError(err?.response?.data?.detail || 'Você não tem permissão para aplicar overrides em NF-e confirmadas. Override criado sem aplicar.');
                                                                                        }
                                                                                        else {
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
                                                                                                const p = found[0];
                                                                                                setProdutoEstoqueMapObj((prev) => ({ ...prev, [it.codigo_produto]: { quantidade: p.quantidade_estoque != null ? Number(p.quantidade_estoque) : null, valor_unitario: (p.custo_medio ?? p.custo_unitario ?? p.preco_medio) != null ? Number(p.custo_medio ?? p.custo_unitario ?? p.preco_medio) : null } }));
                                                                                            }
                                                                                        }
                                                                                        catch (e) {
                                                                                            // ignore
                                                                                        }
                                                                                        const dr = await getNfeDivergencias(nfeId);
                                                                                        const map = {};
                                                                                        (dr.data || []).forEach((d) => {
                                                                                            if (d.item_id)
                                                                                                map[d.item_id] = d;
                                                                                        });
                                                                                        setNfeDivergenciasMap(map);
                                                                                    }
                                                                                }
                                                                                catch (err) {
                                                                                    console.error('Failed to create/apply override', err);
                                                                                    showError(err?.response?.data?.detail || 'Falha ao aplicar/criar override');
                                                                                }
                                                                                finally {
                                                                                    setReflectingOverrides((prev) => ({ ...prev, [key]: false }));
                                                                                }
                                                                            }, disabled: reflectingOverrides[key] || !canReflect, children: reflectingOverrides[key] ? 'Refletindo...' : 'Refletir no Estoque' }) }) }));
                                                            })() })] }, it.id))) })] })] }))] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { variant: "outlined", onClick: handleSaveKeepOpen, disabled: saving, children: saving ? _jsx(CircularProgress, { size: 18, color: "inherit" }) : 'Salvar e Manter Aberto' }), _jsx(Button, { variant: "contained", onClick: handleSave, disabled: saving, children: saving ? _jsx(CircularProgress, { size: 18, color: "inherit" }) : 'Salvar e Fechar' }), _jsx(Button, { variant: "contained", color: "primary", onClick: handleSaveAndReflect, disabled: saving, sx: { ml: 1, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }, children: saving ? _jsx(CircularProgress, { size: 18, color: "inherit" }) : 'Salvar e Refletir' })] })] }), _jsxs(Dialog, { open: confirmOpen, onClose: handleCancelApply, maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Confirmar altera\u00E7\u00F5es" }), _jsx(DialogContent, { dividers: true, children: _jsxs(Typography, { children: ["As altera\u00E7\u00F5es ser\u00E3o salvas. Elas ", _jsx("strong", { children: "n\u00E3o" }), " ser\u00E3o aplicadas ao estoque automaticamente. Deseja salvar?"] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: handleCancelApply, children: "Cancelar" }), _jsx(Button, { variant: "contained", color: "primary", onClick: handleConfirmApply, children: "Confirmar" })] })] }), _jsxs(Dialog, { open: reflectFornecedorConfirmOpen, onClose: () => setReflectFornecedorConfirmOpen(false), maxWidth: "sm", fullWidth: true, children: [_jsx(DialogTitle, { children: "Conflito ao refletir fornecedor" }), _jsxs(DialogContent, { dividers: true, children: [_jsx(Typography, { children: "Fornecedor existente encontrado com diferen\u00E7as. Revise o diff abaixo e confirme se deseja for\u00E7ar a atualiza\u00E7\u00E3o." }), _jsx(Box, { sx: { mt: 2 }, children: reflectFornecedorConflict && reflectFornecedorConflict.diff ? Object.entries(reflectFornecedorConflict.diff).map(([k, v]) => (_jsxs(Box, { sx: { mb: 1 }, children: [_jsx(Typography, { variant: "subtitle2", children: k }), _jsxs(Typography, { children: ["Atual: ", v.current] }), _jsxs(Typography, { children: ["Desejado: ", v.desired] })] }, k))) : _jsx(Typography, { children: "Nenhum diff dispon\u00EDvel" }) })] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setReflectFornecedorConfirmOpen(false), children: "Cancelar" }), _jsx(Button, { variant: "contained", onClick: async () => {
                                    if (!nfeId)
                                        return;
                                    try {
                                        const fiscalSvc = await import('../../services/fiscal');
                                        const resp = await fiscalSvc.reflectFornecedor(nfeId, true, { nome: fornecedorNome, cpf_cnpj: fornecedorCnpj });
                                        showSuccess('Fornecedor atualizado (forçado)');
                                        const r = await getNfe(nfeId);
                                        setNfe(r.data);
                                    }
                                    catch (err) {
                                        showError(err?.response?.data?.detail || 'Erro ao forçar atualização');
                                    }
                                    finally {
                                        setReflectFornecedorConfirmOpen(false);
                                    }
                                }, children: "For\u00E7ar atualiza\u00E7\u00E3o" })] })] })] }));
};
export default NfeEditModal;
