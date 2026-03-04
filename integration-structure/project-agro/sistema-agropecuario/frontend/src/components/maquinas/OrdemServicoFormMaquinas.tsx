import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { OrdemServicoMaquina as OrdemServico } from '@/types/estoque_maquinas';
import type { Equipamento } from '../../types/estoque_maquinas';
import type { CustomUser } from '../../types';

interface Props {
  ordemServico?: OrdemServico;
  onClose: () => void;
  onSuccess: () => void;
}

const OrdemServicoForm: React.FC<Props> = ({ ordemServico, onClose, onSuccess }) => {
  const isEdit = !!ordemServico;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<OrdemServico>>({
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

  const { data: equipamentos = [] } = useQuery<Equipamento[]>({
    queryKey: ['maquinas', 'equipamentos'],
    queryFn: async () => {
      const resp = await api.get('/maquinas/equipamentos/');
      return resp.data.results || resp.data;
    }
  });

  const { data: usuarios = [] } = useQuery<CustomUser[]>({
    queryKey: ['core', 'users'],
    queryFn: async () => {
      const resp = await api.get('/core/users/');
      return resp.data.results || resp.data;
    }
  });

  // Produtos (autocomplete search)
  const [produtoQuery, setProdutoQuery] = React.useState('');
  const { data: produtos = [] } = useQuery<any[]>({
    queryKey: ['estoque', 'produtos', produtoQuery],
    queryFn: async () => {
      const resp = await api.get(`/estoque/produtos/?search=${encodeURIComponent(produtoQuery)}&page_size=20`);
      return resp.data.results || resp.data;
    }
  });

  // DEV-only: log produto search results so it's easy to debug "nenhum resultado" in the browser
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[OrdemServicoForm] produtoQuery=', produtoQuery, 'produtos.length=', produtos?.length, produtos?.slice?.(0,3));
    }
  }, [produtoQuery, produtos]);

  // Prestadores e Fornecedores
  const { data: prestadores = [] } = useQuery<any[]>({
    queryKey: ['comercial', 'prestadores'],
    queryFn: async () => {
      const resp = await api.get('/comercial/prestadores-servico/');
      return resp.data.results || resp.data;
    }
  });

  // NFes de entrada já confirmadas em estoque (para vincular à OS)
  const [nfesQuery, setNfesQuery] = React.useState('');
  const { data: nfesList = [] } = useQuery<any[]>({
    queryKey: ['fiscal', 'nfes', 'entrada', nfesQuery],
    queryFn: async () => {
      const resp = await api.get(`/fiscal/nfes/entrada-confirmadas/?search=${encodeURIComponent(nfesQuery)}&page_size=20`);
      return resp.data.results || resp.data;
    }
  });

  const [loadedNfeItems, setLoadedNfeItems] = React.useState<Record<number, any[]>>({});



  const [selectedProdutoId, setSelectedProdutoId] = React.useState<number | undefined>(undefined);
  const [produtoQuantidade, setProdutoQuantidade] = React.useState<number | ''>('');

  const insumosList: Array<{produto_id:number, quantidade:number, valor_unitario:number | null}> = (formData.insumos as any[]) || [];

  const addInsumo = () => {
    // Resolve produto: prefer explicit selection, otherwise use first search result
    const produtoObj = (selectedProdutoId ? produtos.find(p => p.id === Number(selectedProdutoId)) : produtos[0]) || null;

    // block if quantidade is invalid
    if (produtoQuantidade === '' || Number(produtoQuantidade) <= 0) return;

    // Block if we couldn't resolve a product (avoid sending produto_id: null to backend)
    if (!produtoObj) {
      // user-friendly feedback in dev mode; keep UX silent in prod to avoid modal spam
      if (process.env.NODE_ENV !== 'production') console.warn('[OrdemServicoForm] tentativa de adicionar insumo sem produto resolvido', { produtoQuery, produtoQuantidade });
      return;
    }

    const valor = produtoObj?.custo_unitario ?? null;
    const novo = { produto_id: Number(produtoObj.id), quantidade: Number(produtoQuantidade), valor_unitario: valor };
    const updated = [...insumosList, novo];
    setFormData(prev => ({ ...prev, insumos: updated } as Partial<OrdemServico>));
    // keep produtoQuantidade empty so placeholder shows again
    setProdutoQuantidade('');
    // clear selectedProdutoId only when we used it
    setSelectedProdutoId(undefined);
  };

  const addInsumoFromNfe = async (item: any) => {
    // item is ItemNFe; try to find matching Produto by codigo_produto in local search results
    let produtoMatch = produtos.find(p => p.codigo === item.codigo_produto) || produtos[0];

    // if not found locally, query the API by codigo to try to resolve produto_id
    if (!produtoMatch) {
      try {
        const resp = await api.get(`/estoque/produtos/?search=${encodeURIComponent(item.codigo_produto)}&page_size=1`);
        const results = resp.data.results || resp.data || [];
        produtoMatch = results[0] || null;
      } catch (err) {
        produtoMatch = null;
      }
    }

    const novo = { produto_id: produtoMatch ? produtoMatch.id : null, quantidade: Number(item.quantidade_comercial || 1), valor_unitario: Number(item.valor_unitario_comercial || produtoMatch?.custo_unitario || 0) };
    const updated = [...insumosList, novo];
    setFormData(prev => ({ ...prev, insumos: updated } as Partial<OrdemServico>));
  };

  const removeInsumo = (index:number) => {
    const updated = insumosList.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, insumos: updated } as Partial<OrdemServico>));
  };

  const computedCustoPecas = insumosList.reduce((acc, i) => acc + (Number(i.valor_unitario ?? 0) * Number(i.quantidade)), 0);

  const mutation = useMutation({
    mutationFn: async (data: Partial<OrdemServico>) => {
      const payload: any = {
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
    onError: (error: any) => {
      // show server validation message(s) to the developer / user
      const serverData = error?.response?.data;
      let message = 'Falha ao salvar Ordem de Serviço.';
      if (serverData) {
        if (typeof serverData === 'string') message = serverData;
        else if (serverData.detail) message = serverData.detail;
        else {
          // compose object values into a readable string
          try {
            const vals = Object.entries(serverData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('; ') : v}`).join(' — ');
            if (vals) message = vals;
          } catch {
            message = JSON.stringify(serverData);
          }
        }
      } else if (error?.message) {
        message = error.message;
      }

      // developer-friendly logging + light UI feedback
      // eslint-disable-next-line no-console
      console.error('[OrdemServicoForm] save error', error, serverData);
      // Quick user feedback — keeps UX simple until a proper form-error UI is added
      try { window.alert(message); } catch (e) { /* ignore */ }
    }
  });

  const handleChange = (name: keyof OrdemServico, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value } as Partial<OrdemServico>));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // debug
     
    console.log('Submitting OrdemServicoForm, formData:', formData);
    mutation.mutate(formData);
  };

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{isEdit ? 'Editar OS' : 'Nova Ordem de Serviço'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="equipamento">Equipamento *</label>
                  <select id="equipamento" className="form-select" value={formData.equipamento || ''} onChange={(e) => handleChange('equipamento', Number(e.target.value))} required>
                    <option value="">Selecione um equipamento</option>
                    {equipamentos.map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label" htmlFor="tipo">Tipo</label>
                  <select id="tipo" className="form-select" value={formData.tipo} onChange={(e) => handleChange('tipo', e.target.value)}>
                    <option value="preventiva">Preventiva</option>
                    <option value="corretiva">Corretiva</option>
                    <option value="melhoria">Melhoria</option>
                    <option value="emergencial">Emergencial</option>
                  </select>
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label" htmlFor="prioridade">Prioridade</label>
                  <select id="prioridade" className="form-select" value={formData.prioridade} onChange={(e) => handleChange('prioridade', e.target.value)}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="descricao_problema">Descrição do Problema *</label>
                  <textarea id="descricao_problema" className="form-control" value={formData.descricao_problema} onChange={(e) => handleChange('descricao_problema', e.target.value)} required />
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="data_previsao">Data Prevista</label>
                  <input id="data_previsao" type="date" className="form-control" value={formData.data_previsao || ''} onChange={(e) => handleChange('data_previsao', e.target.value)} />
                </div>

                {/* Insumos (Peças) - label + busca na mesma linha; controles distribuídos abaixo */}
                <div className="col-md-12 mb-3">
                  <div className="d-flex align-items-center mb-2" style={{ marginBottom: 32 }}>
                    <label className="form-label mb-0 me-3" style={{ minWidth: 220 }}>Peças / Produtos do Estoque</label>
                    <div style={{ flex: 1, maxWidth: 520 }}>
                      {/* Suggestions list rendered above the input (pushes content down instead of overlapping) */}
                      {produtoQuery && (
                        <div className="bg-white border rounded shadow-sm mb-2" style={{ zIndex: 50, width: '100%', maxHeight: 220, overflowY: 'auto' }} data-testid="produto-suggestions-list">
                          {produtos.length > 0 ? (
                            <ul className="list-group list-group-flush" role="listbox">
                              {produtos.slice(0, 8).map(p => (
                                <li data-testid={`produto-suggestion-${p.id}`} key={p.id} role="option" className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }} onClick={() => { setSelectedProdutoId(p.id); setProdutoQuery(p.nome); }}>
                                  <div>
                                    <strong>{p.codigo ? `${p.codigo} - ` : ''}{p.nome}</strong>
                                    <div className="small text-muted">{p.unidade} • R$ {p.custo_unitario ?? '—'}</div>
                                  </div>
                                  <div className="text-muted">Qtd: {p.quantidade_estoque}</div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="p-2 small text-muted">Nenhum produto encontrado para "{produtoQuery}"</div>
                          )}
                        </div>
                      )}

                      <input
                        type="search"
                        className="form-control"
                        placeholder="Pesquisar produto (nome/código)"
                        value={produtoQuery}
                        onChange={(e) => { setProdutoQuery(e.target.value); setSelectedProdutoId(undefined); }}
                        aria-label="Pesquisar produto"
                      />
                    </div>
                  </div>

                  <div className="row g-2 align-items-center mb-2">
                    <div className="col-md-6">
                      <div className="p-2 border rounded" style={{ minHeight: 56 }} data-testid="produto-preview">
                        {(() => {
                          const chosen = selectedProdutoId ? produtos.find(p => p.id === selectedProdutoId) : (produtoQuery.trim() ? produtos[0] : null);
                          if (chosen) {
                            return (
                              <div>
                                <strong style={{ display: 'block' }}>{chosen.codigo ? `${chosen.codigo} - ` : ''}{chosen.nome}</strong>
                                <small className="text-muted">{chosen.custo_unitario ? `R$ ${Number(chosen.custo_unitario).toFixed(2)}` : '—'}</small>
                              </div>
                            );
                          }
                          return (<div className="text-muted">&nbsp;</div>);
                        })()}
                      </div>
                    </div>

                    <div className="col-md-3">
                      <input name="quantidade_insumo" placeholder="Quantidade" aria-label="Quantidade" type="number" min={0.01} step="0.01" className="form-control" value={produtoQuantidade} onChange={(e) => setProdutoQuantidade(e.target.value === '' ? '' : Number(e.target.value))} />
                    </div>

                    <div className="col-md-3 d-grid">
                      <button type="button" className="btn btn-outline-secondary" onClick={addInsumo} disabled={!(produtoQuantidade !== '' && Number(produtoQuantidade) > 0)}>Adicionar</button>
                    </div>
                  </div>

                  {/* Lista de insumos adicionados */}
                  <div>
                    <ul className="list-group">
                      {insumosList.map((i, idx) => (
                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{produtos.find(p => p.id === i.produto_id)?.nome || `Produto ${i.produto_id}`}</strong>
                            <div className="text-muted small">Qtd: {i.quantidade} {produtos.find(p => p.id === i.produto_id)?.unidade || ''} • R$ {i.valor_unitario ?? '—'}</div>
                          </div>
                          <div>
                            <span className="me-3">Subtotal: R$ {(Number(i.valor_unitario ?? 0) * Number(i.quantidade)).toFixed(2)}</span>
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeInsumo(idx)}>Remover</button>
                          </div>
                        </li>
                      ))}
                      {insumosList.length === 0 && <li className="list-group-item text-muted">Nenhuma peça adicionada</li>}
                    </ul>
                  </div>

                  <div className="mt-2">
                    <strong>Total Peças: R$ {computedCustoPecas.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="col-md-4 mb-3">
                  <label className="form-label" htmlFor="custo_mao_obra">Custo Mão de Obra (R$)</label>
                  <input id="custo_mao_obra" type="number" step="0.01" className="form-control" value={formData.custo_mao_obra ?? 0} onChange={(e) => handleChange('custo_mao_obra', e.target.value === '' ? 0 : Number(e.target.value))} />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="responsavel_execucao">Responsável Execução</label>
                  <select id="responsavel_execucao" className="form-select" value={formData.responsavel_execucao || ''} onChange={(e) => handleChange('responsavel_execucao', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Selecione</option>
                    {usuarios.map((u: CustomUser) => (
                      <option key={u.id} value={u.id}>{u.username || u.email || u.first_name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label" htmlFor="prestador_servico">Prestador de Serviço</label>
                  <select id="prestador_servico" className="form-select" value={formData.prestador_servico || ''} onChange={(e) => handleChange('prestador_servico', e.target.value ? Number(e.target.value) : undefined)}>
                    <option value="">Selecionar Prestador (opcional)</option>
                    {prestadores.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Vincular NFes (entrada confirmada) */}
                <div className="col-md-12 mb-3">
                  <label className="form-label">Vincular NFes (Entrada confirmada)</label>
                  <div className="input-group mb-2">
                    <input type="search" className="form-control" placeholder="Buscar NF-e (número / chave / emitente)" value={nfesQuery} onChange={(e) => setNfesQuery(e.target.value)} />
                  </div>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }} className="mb-2 border rounded p-2">
                    {nfesList.length === 0 && <div className="text-muted small">Nenhuma NFe encontrada</div>}
                    {nfesList.map((n: any) => (
                      <div key={n.id} className="d-flex align-items-center justify-content-between mb-1">
                        <div>
                          <input type="checkbox" checked={(formData.nfes || []).includes(n.id)} onChange={(ev) => {
                            const current = new Set((formData.nfes || []) as number[]);
                            if (ev.target.checked) current.add(n.id); else current.delete(n.id);
                            handleChange('nfes', Array.from(current));
                          }} />
                          <strong className="ms-2">{n.numero}/{n.serie}</strong>
                          <div className="small text-muted">{n.emitente_nome} • {new Date(n.data_emissao).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={async () => {
                            // load items for this NFe if not loaded
                            if (!loadedNfeItems[n.id]) {
                              const resp = await api.get(`/fiscal/nfes/${n.id}/`);
                              setLoadedNfeItems(prev => ({ ...prev, [n.id]: resp.data.itens || [] }));
                            }
                          }}>Ver itens</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mostrar itens carregados de NFes selecionadas */}
                  {Array.from(Object.entries(loadedNfeItems)).map(([nfeId, itens]: any) => (
                    <div key={nfeId} className="mb-2">
                      <div className="small text-muted mb-1">Itens da NFe #{nfeId}</div>
                      <ul className="list-group">
                        {itens.map((it: any, idx: number) => (
                          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{it.descricao}</strong>
                              <div className="small text-muted">Código: {it.codigo_produto} • Qtd: {it.quantidade_comercial} {it.unidade_comercial}</div>
                            </div>
                            <div>
                              <button type="button" className="btn btn-sm btn-outline-success" onClick={() => addInsumoFromNfe(it)}>Adicionar à OS</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="col-md-12 mb-3">
                  <label className="form-label" htmlFor="observacoes">Observações</label>
                  <textarea id="observacoes" className="form-control" value={formData.observacoes || ''} onChange={(e) => handleChange('observacoes', e.target.value)} />
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{isEdit ? 'Salvar' : 'Criar OS'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrdemServicoForm;
