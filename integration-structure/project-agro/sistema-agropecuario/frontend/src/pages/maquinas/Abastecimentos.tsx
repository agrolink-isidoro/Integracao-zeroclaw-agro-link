import React, { useState, useEffect } from 'react';
import { useApiQuery, useApiCreate } from '../../hooks/useApi';
import type { Abastecimento, Equipamento } from '../../types';

interface MovimentacaoEstoque {
  id: number;
  produto: number;
  produto_nome?: string;
  tipo: string;
  quantidade: number;
  valor_unitario?: number;
  data_movimentacao: string;
}

const Abastecimentos: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ equipamento: 0, quantidade_litros: 0, valor_unitario: 0, data_abastecimento: '', horimetro_km: '', produto_estoque: null as number | null });

  const { data: abastecimentos = [], isLoading } = useApiQuery<Abastecimento[]>(['abastecimentos'], '/maquinas/abastecimentos/');
  const { data: equipamentos = [] } = useApiQuery<Equipamento[]>(['equipamentos'], '/maquinas/equipamentos/');

  // Dashboard & per-equipamento stats
  const { data: dashboard } = useApiQuery<any>(['abastecimentos-dashboard'], '/maquinas/abastecimentos/dashboard/');
  const { data: consumoPorEquipamento = [] } = useApiQuery<any>(['abastecimentos-por-equipamento'], '/maquinas/abastecimentos/por_equipamento/?dias=30');

  // Buscar último preço do diesel no estoque (primeira página)
  const { data: movimentacoesDieselRaw = null } = useApiQuery<any>(
    ['movimentacoes-diesel'],
    '/estoque/movimentacoes/?tipo=entrada&search=diesel&ordering=-data_movimentacao&page_size=1&page=1',
    { enabled: showForm }
  );

  // Normalize para sempre termos um array simples em movimentacoesDiesel
  const movimentacoesDiesel: MovimentacaoEstoque[] = Array.isArray(movimentacoesDieselRaw)
    ? movimentacoesDieselRaw
    : (movimentacoesDieselRaw && movimentacoesDieselRaw.results) ? movimentacoesDieselRaw.results : [];

  const createMutation = useApiCreate('/maquinas/abastecimentos/', [['abastecimentos']]);

  // Preencher automaticamente o preço do diesel quando abrir o formulário
  useEffect(() => {
    if (!showForm) return;

    async function fillPrice() {
      // 1) Prefer usar movimentacoesDiesel (busca por 'diesel')
      if (movimentacoesDiesel.length > 0 && movimentacoesDiesel[0].valor_unitario) {
        setForm((prev: any) => ({ ...prev, valor_unitario: Number(movimentacoesDiesel[0].valor_unitario), produto_estoque: movimentacoesDiesel[0].produto || prev.produto_estoque }));
        return;
      }

      // 2) Fallback: buscar produto Diesel e pedir ultimo_preco endpoint
      try {
        const resp = await fetch('/api/estoque/produtos/?search=diesel&page_size=1');
        const data = await resp.json();
        const first = Array.isArray(data) ? data[0] : data.results?.[0];
        if (first && first.id) {
          const p = await fetch(`/api/estoque/produto-ultimo-preco/?produto_id=${first.id}`);
          const pr = await p.json();
          if (pr && pr.valor_unitario) {
            setForm((prev: any) => ({ ...prev, valor_unitario: Number(pr.valor_unitario), produto_estoque: first.id }));
          } else {
            // Even if there's no price, we set produto_estoque so the Abastecimento explicitly links the product
            setForm((prev: any) => ({ ...prev, produto_estoque: first.id }));
          }
        }
      } catch (e) {
        // não bloquear o formulário em caso de erro
        // console.debug('Erro ao buscar preço automático do diesel', e)
      }
    }

    fillPrice();
  }, [showForm, movimentacoesDiesel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'quantidade_litros' || name === 'valor_unitario' || name === 'horimetro_km') {
      setForm((prev: any) => ({ ...prev, [name]: Number(value) }));
    } else if (name === 'produto_estoque') {
      // produto_estoque is numeric id
      setForm((prev: any) => ({ ...prev, produto_estoque: value ? Number(value) : null }));
    } else {
      setForm((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const computedTotal = Number((form.quantidade_litros * form.valor_unitario).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure data_abastecimento is sent as full ISO string with timezone (server expects timezone-aware datetime)
      const payload: any = { ...form };
      if (form.data_abastecimento) {
        try {
          payload.data_abastecimento = new Date(form.data_abastecimento).toISOString();
        } catch (e) {
          // fallback: send raw value
          payload.data_abastecimento = form.data_abastecimento;
        }
      }

      await createMutation.mutateAsync(payload as any);
      setShowForm(false);
      setForm({ equipamento: 0, quantidade_litros: 0, valor_unitario: 0, data_abastecimento: '', horimetro_km: '', produto_estoque: null });
    } catch (err) {
      console.error(err);
      alert('Erro ao criar abastecimento');
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h2">Abastecimentos</h1>
        <button className="btn btn-success" onClick={() => setShowForm(true)}>Novo Abastecimento</button>
      </div>

      {showForm && (
        <div className="card mb-4 p-3">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-4 col-12">
              <label className="form-label" htmlFor="equipamento">Equipamento</label>
              <select id="equipamento" name="equipamento" value={form.equipamento} onChange={handleChange} className="form-select">
                <option value={0}>Selecione</option>
                {equipamentos.map(eq => (<option key={eq.id} value={eq.id}>{eq.nome}</option>))}
              </select>
            </div>
            <div className="col-md-2 col-6">
              <label className="form-label" htmlFor="quantidade_litros">Quantidade (L)</label>
              <input id="quantidade_litros" name="quantidade_litros" type="number" step="0.01" value={form.quantidade_litros} onChange={handleChange} className="form-control" />
            </div>
            <div className="col-md-2 col-6">
              <label className="form-label" htmlFor="valor_unitario">
                Valor Unit.
                {movimentacoesDiesel.length > 0 && movimentacoesDiesel[0].valor_unitario && (
                  <span className="badge bg-success ms-2" title="Preenchido automaticamente com o último preço de entrada do diesel no estoque">
                    <i className="bi bi-check-circle me-1"></i>Auto
                  </span>
                )}
              </label>
              <input 
                id="valor_unitario" 
                name="valor_unitario" 
                type="number" 
                step="0.01" 
                value={form.valor_unitario} 
                onChange={handleChange} 
                className="form-control" 
                placeholder="R$/L"
              />
              {movimentacoesDiesel.length > 0 && movimentacoesDiesel[0].valor_unitario && (
                <small className="text-muted">Último preço: R$ {Number(movimentacoesDiesel[0].valor_unitario).toFixed(2)}/L</small>
              )}

              {/* Hidden select to allow explicit produto_estoque association (auto-filled) */}
              <select name="produto_estoque" value={form.produto_estoque ?? ''} onChange={handleChange} style={{ display: 'none' }}>
                <option value="">—</option>
                {movimentacoesDiesel.map(m => (
                  <option key={m.id} value={m.produto}>{m.produto_nome}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 col-6">
              <label className="form-label" htmlFor="horimetro_km">Horímetro/Km</label>
              <input id="horimetro_km" name="horimetro_km" type="number" step="0.1" value={form.horimetro_km} onChange={handleChange} className="form-control" placeholder="Opcional" />
            </div>
            <div className="col-md-3 col-12">
              <label className="form-label" htmlFor="data_abastecimento">Data</label>
              <input id="data_abastecimento" name="data_abastecimento" type="datetime-local" value={form.data_abastecimento} onChange={handleChange} className="form-control" />
            </div>

            <div className="col-md-3 col-12">
              <label className="form-label">Total (R$)</label>
              <input readOnly value={computedTotal.toFixed(2)} className="form-control" />
            </div>

            <div className="col-12 d-flex justify-content-end">
              <button type="button" className="btn btn-secondary me-2" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      )}
      <div className="card">
        <div className="card-header">Resumo</div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-sm-6 col-md-3 mb-2">
              <div className="card p-2 h-100">
                <div className="small text-muted">Abastecimentos no mês</div>
                <div className="h4">{dashboard?.total_abastecimentos_mes ?? 0}</div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3 mb-2">
              <div className="card p-2 h-100">
                <div className="small text-muted">Custo total (mês)</div>
                <div className="h4">R$ {Number(dashboard?.custo_total_abastecimentos_mes ?? 0).toFixed(2)}</div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3 mb-2">
              <div className="card p-2 h-100">
                <div className="small text-muted">Consumo médio (L/dia)</div>
                <div className="h4">{Number(dashboard?.consumo_medio_litros_dia ?? 0).toFixed(2)}</div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3 mb-2">
              <div className="card p-2 h-100">
                <div className="small text-muted">Top máquina (L)</div>
                <div className="h5">{consumoPorEquipamento?.[0]?.equipamento__nome ?? '—'}</div>
                <div className="small text-muted">{consumoPorEquipamento?.[0]?.total_litros ?? 0} L</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">Lista de Abastecimentos</div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-4 text-center">Carregando...</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Equipamento</th>
                    <th>Quantidade (L)</th>
                    <th>Valor Unit.</th>
                    <th>Total (R$)</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {abastecimentos.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4">Nenhum abastecimento encontrado</td></tr>
                  ) : (
                    abastecimentos.map(a => (
                      <tr key={a.id}>
                        <td>{a.equipamento_detail?.nome || a.equipamento}</td>
                        <td>{a.quantidade_litros}</td>
                        <td>R$ {Number(a.valor_unitario).toFixed(2)}</td>
                        <td>R$ {Number(a.valor_total ?? (a.quantidade_litros * a.valor_unitario)).toFixed(2)}</td>
                        <td>{new Date(a.data_abastecimento).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Abastecimentos;
