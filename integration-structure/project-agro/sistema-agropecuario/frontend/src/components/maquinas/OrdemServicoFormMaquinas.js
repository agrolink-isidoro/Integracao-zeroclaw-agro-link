import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
const OrdemServicoForm = ({ ordemServico, onClose, onSuccess }) => {
    const isEdit = !!ordemServico;
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        equipamento: ordemServico?.equipamento || undefined,
        tipo: ordemServico?.tipo || 'corretiva',
        prioridade: ordemServico?.prioridade || 'media',
        status: ordemServico?.status || 'aberta',
        descricao_problema: ordemServico?.descricao_problema || '',
        data_previsao: ordemServico?.data_previsao || undefined,
        // insumos will hold array of {produto_id, quantidade, valor_unitario}
        insumos: ordemServico?.insumos || [],
        custo_mao_obra: ordemServico?.custo_mao_obra || 0,
        responsavel_execucao: ordemServico?.responsavel_execucao || undefined,
        prestador_servico: ordemServico?.prestador_servico || undefined,
        // nfes vinculadas (IDs)
        nfes: ordemServico?.nfes || [],
        observacoes: ordemServico?.observacoes || undefined,
    });
    const { data: equipamentos = [] } = useQuery({
        queryKey: ['maquinas', 'equipamentos'],
        queryFn: async () => {
            const resp = await api.get('/maquinas/equipamentos/');
            return resp.data.results || resp.data;
        }
    });
    const { data: usuarios = [] } = useQuery({
        queryKey: ['core', 'users'],
        queryFn: async () => {
            const resp = await api.get('/core/users/');
            return resp.data.results || resp.data;
        }
    });
    // Produtos (autocomplete search)
    const [produtoQuery, setProdutoQuery] = React.useState('');
    const { data: produtos = [] } = useQuery({
        queryKey: ['estoque', 'produtos', produtoQuery],
        queryFn: async () => {
            const resp = await api.get(`/estoque/produtos/?search=${encodeURIComponent(produtoQuery)}&page_size=20`);
            return resp.data.results || resp.data;
        }
    });
    // DEV-only: log produto search results so it's easy to debug "nenhum resultado" in the browser
    React.useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug('[OrdemServicoForm] produtoQuery=', produtoQuery, 'produtos.length=', produtos?.length, produtos?.slice?.(0, 3));
        }
    }, [produtoQuery, produtos]);
    // Prestadores e Fornecedores
    const { data: prestadores = [] } = useQuery({
        queryKey: ['comercial', 'prestadores'],
        queryFn: async () => {
            const resp = await api.get('/comercial/prestadores-servico/');
            return resp.data.results || resp.data;
        }
    });
    // NFes de entrada já confirmadas em estoque (para vincular à OS)
    const [nfesQuery, setNfesQuery] = React.useState('');
    const { data: nfesList = [] } = useQuery({
        queryKey: ['fiscal', 'nfes', 'entrada', nfesQuery],
        queryFn: async () => {
            const resp = await api.get(`/fiscal/nfes/entrada-confirmadas/?search=${encodeURIComponent(nfesQuery)}&page_size=20`);
            return resp.data.results || resp.data;
        }
    });
    const [loadedNfeItems, setLoadedNfeItems] = React.useState({});
    const [selectedProdutoId, setSelectedProdutoId] = React.useState(undefined);
    const [produtoQuantidade, setProdutoQuantidade] = React.useState('');
    const insumosList = formData.insumos || [];
    const addInsumo = () => {
        // Resolve produto: prefer explicit selection, otherwise use first search result
        const produtoObj = (selectedProdutoId ? produtos.find(p => p.id === Number(selectedProdutoId)) : produtos[0]) || null;
        // block if quantidade is invalid
        if (produtoQuantidade === '' || Number(produtoQuantidade) <= 0)
            return;
        // Block if we couldn't resolve a product (avoid sending produto_id: null to backend)
        if (!produtoObj) {
            // user-friendly feedback in dev mode; keep UX silent in prod to avoid modal spam
            if (process.env.NODE_ENV !== 'production')
                console.warn('[OrdemServicoForm] tentativa de adicionar insumo sem produto resolvido', { produtoQuery, produtoQuantidade });
            return;
        }
        const valor = produtoObj?.custo_unitario ?? null;
        const novo = { produto_id: Number(produtoObj.id), quantidade: Number(produtoQuantidade), valor_unitario: valor };
        const updated = [...insumosList, novo];
        setFormData(prev => ({ ...prev, insumos: updated }));
        // keep produtoQuantidade empty so placeholder shows again
        setProdutoQuantidade('');
        // clear selectedProdutoId only when we used it
        setSelectedProdutoId(undefined);
    };
    const addInsumoFromNfe = async (item) => {
        // item is ItemNFe; try to find matching Produto by codigo_produto in local search results
        let produtoMatch = produtos.find(p => p.codigo === item.codigo_produto) || produtos[0];
        // if not found locally, query the API by codigo to try to resolve produto_id
        if (!produtoMatch) {
            try {
                const resp = await api.get(`/estoque/produtos/?search=${encodeURIComponent(item.codigo_produto)}&page_size=1`);
                const results = resp.data.results || resp.data || [];
                produtoMatch = results[0] || null;
            }
            catch (err) {
                produtoMatch = null;
            }
        }
        const novo = { produto_id: produtoMatch ? produtoMatch.id : null, quantidade: Number(item.quantidade_comercial || 1), valor_unitario: Number(item.valor_unitario_comercial || produtoMatch?.custo_unitario || 0) };
        const updated = [...insumosList, novo];
        setFormData(prev => ({ ...prev, insumos: updated }));
    };
    const removeInsumo = (index) => {
        const updated = insumosList.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, insumos: updated }));
    };
    const computedCustoPecas = insumosList.reduce((acc, i) => acc + (Number(i.valor_unitario ?? 0) * Number(i.quantidade)), 0);
    const mutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                equipamento: data.equipamento,
                tipo: data.tipo,
                prioridade: data.prioridade,
                status: data.status,
                descricao_problema: data.descricao_problema,
                data_previsao: data.data_previsao || null,
                // insumos é um array de {produto_id, quantidade, valor_unitario}
                insumos: data.insumos || [],
                // NFes vinculadas (IDs) - enviada ao backend para persistência
                nfes: data.nfes || [],
                custo_mao_obra: Number(data.custo_mao_obra) || 0,
                responsavel_execucao: data.responsavel_execucao || undefined,
                prestador_servico: data.prestador_servico || undefined,
                observacoes: data.observacoes || undefined,
            };
            if (isEdit && ordemServico) {
                const resp = await api.put(`/maquinas/ordens-servico/${ordemServico.id}/`, payload);
                return resp.data;
            }
            const resp = await api.post('/maquinas/ordens-servico/', payload);
            return resp.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maquinas', 'ordens-servico'] });
            onSuccess();
            onClose();
        },
        onError: (error) => {
            // show server validation message(s) to the developer / user
            const serverData = error?.response?.data;
            let message = 'Falha ao salvar Ordem de Serviço.';
            if (serverData) {
                if (typeof serverData === 'string')
                    message = serverData;
                else if (serverData.detail)
                    message = serverData.detail;
                else {
                    // compose object values into a readable string
                    try {
                        const vals = Object.entries(serverData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('; ') : v}`).join(' — ');
                        if (vals)
                            message = vals;
                    }
                    catch {
                        message = JSON.stringify(serverData);
                    }
                }
            }
            else if (error?.message) {
                message = error.message;
            }
            // developer-friendly logging + light UI feedback
            // eslint-disable-next-line no-console
            console.error('[OrdemServicoForm] save error', error, serverData);
            // Quick user feedback — keeps UX simple until a proper form-error UI is added
            try {
                window.alert(message);
            }
            catch (e) { /* ignore */ }
        }
    });
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        // debug
        console.log('Submitting OrdemServicoForm, formData:', formData);
        mutation.mutate(formData);
    };
    return (_jsx("div", { className: "modal show d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-lg", role: "document", children: _jsx("div", { className: "modal-content", children: _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: isEdit ? 'Editar OS' : 'Nova Ordem de Serviço' }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsx("div", { className: "modal-body", children: _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "equipamento", children: "Equipamento *" }), _jsxs("select", { id: "equipamento", className: "form-select", value: formData.equipamento || '', onChange: (e) => handleChange('equipamento', Number(e.target.value)), required: true, children: [_jsx("option", { value: "", children: "Selecione um equipamento" }), equipamentos.map(eq => (_jsx("option", { value: eq.id, children: eq.nome }, eq.id)))] })] }), _jsxs("div", { className: "col-md-3 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "tipo", children: "Tipo" }), _jsxs("select", { id: "tipo", className: "form-select", value: formData.tipo, onChange: (e) => handleChange('tipo', e.target.value), children: [_jsx("option", { value: "preventiva", children: "Preventiva" }), _jsx("option", { value: "corretiva", children: "Corretiva" }), _jsx("option", { value: "melhoria", children: "Melhoria" }), _jsx("option", { value: "emergencial", children: "Emergencial" })] })] }), _jsxs("div", { className: "col-md-3 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "prioridade", children: "Prioridade" }), _jsxs("select", { id: "prioridade", className: "form-select", value: formData.prioridade, onChange: (e) => handleChange('prioridade', e.target.value), children: [_jsx("option", { value: "baixa", children: "Baixa" }), _jsx("option", { value: "media", children: "M\u00E9dia" }), _jsx("option", { value: "alta", children: "Alta" }), _jsx("option", { value: "critica", children: "Cr\u00EDtica" })] })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "descricao_problema", children: "Descri\u00E7\u00E3o do Problema *" }), _jsx("textarea", { id: "descricao_problema", className: "form-control", value: formData.descricao_problema, onChange: (e) => handleChange('descricao_problema', e.target.value), required: true })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "data_previsao", children: "Data Prevista" }), _jsx("input", { id: "data_previsao", type: "date", className: "form-control", value: formData.data_previsao || '', onChange: (e) => handleChange('data_previsao', e.target.value) })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsxs("div", { className: "d-flex align-items-center mb-2", style: { marginBottom: 32 }, children: [_jsx("label", { className: "form-label mb-0 me-3", style: { minWidth: 220 }, children: "Pe\u00E7as / Produtos do Estoque" }), _jsxs("div", { style: { flex: 1, maxWidth: 520 }, children: [produtoQuery && (_jsx("div", { className: "bg-white border rounded shadow-sm mb-2", style: { zIndex: 50, width: '100%', maxHeight: 220, overflowY: 'auto' }, "data-testid": "produto-suggestions-list", children: produtos.length > 0 ? (_jsx("ul", { className: "list-group list-group-flush", role: "listbox", children: produtos.slice(0, 8).map(p => (_jsxs("li", { "data-testid": `produto-suggestion-${p.id}`, role: "option", className: "list-group-item list-group-item-action d-flex justify-content-between align-items-center", style: { cursor: 'pointer' }, onClick: () => { setSelectedProdutoId(p.id); setProdutoQuery(p.nome); }, children: [_jsxs("div", { children: [_jsxs("strong", { children: [p.codigo ? `${p.codigo} - ` : '', p.nome] }), _jsxs("div", { className: "small text-muted", children: [p.unidade, " \u2022 R$ ", p.custo_unitario ?? '—'] })] }), _jsxs("div", { className: "text-muted", children: ["Qtd: ", p.quantidade_estoque] })] }, p.id))) })) : (_jsxs("div", { className: "p-2 small text-muted", children: ["Nenhum produto encontrado para \"", produtoQuery, "\""] })) })), _jsx("input", { type: "search", className: "form-control", placeholder: "Pesquisar produto (nome/c\u00F3digo)", value: produtoQuery, onChange: (e) => { setProdutoQuery(e.target.value); setSelectedProdutoId(undefined); }, "aria-label": "Pesquisar produto" })] })] }), _jsxs("div", { className: "row g-2 align-items-center mb-2", children: [_jsx("div", { className: "col-md-6", children: _jsx("div", { className: "p-2 border rounded", style: { minHeight: 56 }, "data-testid": "produto-preview", children: (() => {
                                                                const chosen = selectedProdutoId ? produtos.find(p => p.id === selectedProdutoId) : (produtoQuery.trim() ? produtos[0] : null);
                                                                if (chosen) {
                                                                    return (_jsxs("div", { children: [_jsxs("strong", { style: { display: 'block' }, children: [chosen.codigo ? `${chosen.codigo} - ` : '', chosen.nome] }), _jsx("small", { className: "text-muted", children: chosen.custo_unitario ? `R$ ${Number(chosen.custo_unitario).toFixed(2)}` : '—' })] }));
                                                                }
                                                                return (_jsx("div", { className: "text-muted", children: "\u00A0" }));
                                                            })() }) }), _jsx("div", { className: "col-md-3", children: _jsx("input", { name: "quantidade_insumo", placeholder: "Quantidade", "aria-label": "Quantidade", type: "number", min: 0.01, step: "0.01", className: "form-control", value: produtoQuantidade, onChange: (e) => setProdutoQuantidade(e.target.value === '' ? '' : Number(e.target.value)) }) }), _jsx("div", { className: "col-md-3 d-grid", children: _jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: addInsumo, disabled: !(produtoQuantidade !== '' && Number(produtoQuantidade) > 0), children: "Adicionar" }) })] }), _jsx("div", { children: _jsxs("ul", { className: "list-group", children: [insumosList.map((i, idx) => (_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: produtos.find(p => p.id === i.produto_id)?.nome || `Produto ${i.produto_id}` }), _jsxs("div", { className: "text-muted small", children: ["Qtd: ", i.quantidade, " ", produtos.find(p => p.id === i.produto_id)?.unidade || '', " \u2022 R$ ", i.valor_unitario ?? '—'] })] }), _jsxs("div", { children: [_jsxs("span", { className: "me-3", children: ["Subtotal: R$ ", (Number(i.valor_unitario ?? 0) * Number(i.quantidade)).toFixed(2)] }), _jsx("button", { type: "button", className: "btn btn-sm btn-danger", onClick: () => removeInsumo(idx), children: "Remover" })] })] }, idx))), insumosList.length === 0 && _jsx("li", { className: "list-group-item text-muted", children: "Nenhuma pe\u00E7a adicionada" })] }) }), _jsx("div", { className: "mt-2", children: _jsxs("strong", { children: ["Total Pe\u00E7as: R$ ", computedCustoPecas.toFixed(2)] }) })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "custo_mao_obra", children: "Custo M\u00E3o de Obra (R$)" }), _jsx("input", { id: "custo_mao_obra", type: "number", step: "0.01", className: "form-control", value: formData.custo_mao_obra ?? 0, onChange: (e) => handleChange('custo_mao_obra', e.target.value === '' ? 0 : Number(e.target.value)) })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "responsavel_execucao", children: "Respons\u00E1vel Execu\u00E7\u00E3o" }), _jsxs("select", { id: "responsavel_execucao", className: "form-select", value: formData.responsavel_execucao || '', onChange: (e) => handleChange('responsavel_execucao', e.target.value ? Number(e.target.value) : undefined), children: [_jsx("option", { value: "", children: "Selecione" }), usuarios.map((u) => (_jsx("option", { value: u.id, children: u.username || u.email || u.first_name }, u.id)))] })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "prestador_servico", children: "Prestador de Servi\u00E7o" }), _jsxs("select", { id: "prestador_servico", className: "form-select", value: formData.prestador_servico || '', onChange: (e) => handleChange('prestador_servico', e.target.value ? Number(e.target.value) : undefined), children: [_jsx("option", { value: "", children: "Selecionar Prestador (opcional)" }), prestadores.map(p => (_jsx("option", { value: p.id, children: p.nome }, p.id)))] })] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", children: "Vincular NFes (Entrada confirmada)" }), _jsx("div", { className: "input-group mb-2", children: _jsx("input", { type: "search", className: "form-control", placeholder: "Buscar NF-e (n\u00FAmero / chave / emitente)", value: nfesQuery, onChange: (e) => setNfesQuery(e.target.value) }) }), _jsxs("div", { style: { maxHeight: 160, overflowY: 'auto' }, className: "mb-2 border rounded p-2", children: [nfesList.length === 0 && _jsx("div", { className: "text-muted small", children: "Nenhuma NFe encontrada" }), nfesList.map((n) => (_jsxs("div", { className: "d-flex align-items-center justify-content-between mb-1", children: [_jsxs("div", { children: [_jsx("input", { type: "checkbox", checked: (formData.nfes || []).includes(n.id), onChange: (ev) => {
                                                                            const current = new Set((formData.nfes || []));
                                                                            if (ev.target.checked)
                                                                                current.add(n.id);
                                                                            else
                                                                                current.delete(n.id);
                                                                            handleChange('nfes', Array.from(current));
                                                                        } }), _jsxs("strong", { className: "ms-2", children: [n.numero, "/", n.serie] }), _jsxs("div", { className: "small text-muted", children: [n.emitente_nome, " \u2022 ", new Date(n.data_emissao).toLocaleDateString()] })] }), _jsx("div", { children: _jsx("button", { type: "button", className: "btn btn-sm btn-outline-primary me-2", onClick: async () => {
                                                                        // load items for this NFe if not loaded
                                                                        if (!loadedNfeItems[n.id]) {
                                                                            const resp = await api.get(`/fiscal/nfes/${n.id}/`);
                                                                            setLoadedNfeItems(prev => ({ ...prev, [n.id]: resp.data.itens || [] }));
                                                                        }
                                                                    }, children: "Ver itens" }) })] }, n.id)))] }), Array.from(Object.entries(loadedNfeItems)).map(([nfeId, itens]) => (_jsxs("div", { className: "mb-2", children: [_jsxs("div", { className: "small text-muted mb-1", children: ["Itens da NFe #", nfeId] }), _jsx("ul", { className: "list-group", children: itens.map((it, idx) => (_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: it.descricao }), _jsxs("div", { className: "small text-muted", children: ["C\u00F3digo: ", it.codigo_produto, " \u2022 Qtd: ", it.quantidade_comercial, " ", it.unidade_comercial] })] }), _jsx("div", { children: _jsx("button", { type: "button", className: "btn btn-sm btn-outline-success", onClick: () => addInsumoFromNfe(it), children: "Adicionar \u00E0 OS" }) })] }, idx))) })] }, nfeId)))] }), _jsxs("div", { className: "col-md-12 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "observacoes", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { id: "observacoes", className: "form-control", value: formData.observacoes || '', onChange: (e) => handleChange('observacoes', e.target.value) })] })] }) }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: isEdit ? 'Salvar' : 'Criar OS' })] })] }) }) }) }));
};
export default OrdemServicoForm;
