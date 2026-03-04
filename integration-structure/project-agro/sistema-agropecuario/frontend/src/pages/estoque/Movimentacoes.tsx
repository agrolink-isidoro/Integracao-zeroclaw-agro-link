import * as React from 'react';
import { movimentacoesService } from '../../services/produtos';
import type { MovimentacaoStatement } from '../../types/estoque_maquinas';

const MovimentacoesPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [statements, setStatements] = React.useState<MovimentacaoStatement[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [filters, setFilters] = React.useState({ tipo: '', produto: '', produto_nome: '', data_inicio: '', data_fim: '', origem: '' });
  const [fetchTrigger, setFetchTrigger] = React.useState(0);
  const [productQuery, setProductQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = React.useState(false);

  React.useEffect(() => {
    fetchStatements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, fetchTrigger]);

  // Debounced product suggestions
  React.useEffect(() => {
    if (!productQuery || productQuery.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    const t = setTimeout(async () => {
      try {
        const mod = await import('../../services/produtos');
        const prods = await mod.produtosService.buscarSimples(productQuery, 10);
        if (!cancelled) setSuggestions(prods);
      } catch (err) {
        console.error('Erro buscando produtos:', err);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [productQuery]);

  const fetchStatements = async () => {
    setLoading(true);
    try {
      const payload: any = { page, page_size: pageSize };
      if (filters.tipo) payload.tipo = filters.tipo;
      if (filters.produto) payload.produto = filters.produto ? parseInt(String(filters.produto)) : undefined;
      if (filters.data_inicio) payload.data_inicio = filters.data_inicio;
      if (filters.data_fim) payload.data_fim = filters.data_fim;
      if (filters.origem) payload.movimentacao__origem = filters.origem;

      const res = await movimentacoesService.listarStatements(payload);
      setCount(res.count || 0);
      setStatements(res.results || []);
    } catch (err) {
      console.error('Erro ao buscar statements:', err);
      alert('Erro ao carregar histórico de movimentações. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchStatements();
  };

  const exportCSV = () => {
    // include filters in filename
    const filterPart = [] as string[];
    if (filters.tipo) filterPart.push(filters.tipo);
    if (filters.produto_nome) filterPart.push(`prod-${filters.produto_nome.replace(/\s+/g,'_')}`);
    const suffix = filterPart.length ? `_${filterPart.join('_')}` : '';
    if (!statements || statements.length === 0) {
      alert('Nenhum registro para exportar');
      return;
    }
    const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Unidade', 'Saldo após', 'Documento', 'Motivo', 'Observações'];
    const rows = statements.map(s => ([
      s.data_movimentacao,
      s.produto_nome || '',
      s.tipo,
      s.quantidade,
      s.unidade || '',
      s.saldo_resultante ?? '',
      s.documento_referencia || '',
      s.motivo || '',
      s.observacoes || ''
    ]));

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes_statements${suffix}_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-list-ul me-2"></i>
            Histórico de Movimentações (Statements)
          </h2>
          <p className="text-muted mb-0">Registro auditável e imutável de movimentações de estoque.</p>
        </div>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => fetchStatements()} disabled={loading}>Atualizar</button>
          <button className="btn btn-outline-primary" onClick={exportCSV}>Exportar CSV</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={filters.tipo} onChange={(e) => handleFilterChange('tipo', e.target.value)}>
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="reserva">Reserva</option>
                <option value="liberacao">Liberação</option>
                <option value="reversao">Reversão</option>
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label">Origem</label>
              <select className="form-select" value={filters.origem} onChange={(e) => handleFilterChange('origem', e.target.value)}>
                <option value="">Todos</option>
                <option value="manual">Manual</option>
                <option value="nfe">NFe</option>
                <option value="ordem_servico">Ordem de Serviço</option>
                <option value="colheita">Colheita</option>
                <option value="abastecimento">Abastecimento</option>
                <option value="manutencao">Manutenção</option>
                <option value="agricultura">Operação Agrícola</option>
                <option value="venda">Venda</option>
                <option value="ajuste">Ajuste</option>
              </select>
            </div>

            <div className="col-md-3 position-relative">
              <label className="form-label">Produto</label>
              <input className="form-control" value={productQuery || filters.produto_nome || ''} onChange={(e) => { setProductQuery(e.target.value); handleFilterChange('produto', ''); handleFilterChange('produto_nome', e.target.value); }} placeholder="Digite nome ou ID (min 2 chars)" />
              {suggestionsLoading && <div className="position-absolute bg-white border p-2" style={{ zIndex: 50, width: '100%' }}>Buscando...</div>}
              {suggestions.length > 0 && (
                <div className="position-absolute bg-white border" style={{ zIndex: 50, width: '100%', maxHeight: '220px', overflow: 'auto' }}>
                  {suggestions.map(s => (
                    <div key={s.id} className="px-3 py-2 hover-shadow" style={{ cursor: 'pointer' }} onClick={() => {
                      handleFilterChange('produto', String(s.id));
                      handleFilterChange('produto_nome', s.nome);
                      setProductQuery('');
                      setSuggestions([]);
                    }}>
                      <div className="d-flex justify-content-between">
                        <div><strong>{s.nome}</strong> <small className="text-muted">({s.codigo})</small></div>
                        <div className="text-muted">ID: {s.id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-md-2">
              <label className="form-label">Data Início</label>
              <input type="date" className="form-control" value={filters.data_inicio} onChange={(e) => handleFilterChange('data_inicio', e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Data Fim</label>
              <input type="date" className="form-control" value={filters.data_fim} onChange={(e) => handleFilterChange('data_fim', e.target.value)} />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={applyFilters}>Aplicar</button>
              <button className="btn btn-light" onClick={() => { setFilters({ tipo: '', produto: '', produto_nome: '', data_inicio: '', data_fim: '', origem: '' }); setProductQuery(''); setPage(1); setFetchTrigger(t => t + 1); }}>Limpar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Data Mov.</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th>Origem</th>
                  <th className="text-end">Quantidade</th>
                  <th>Unidade</th>
                  <th className="text-end">Saldo após</th>
                  <th>Documento</th>
                  <th>Motivo</th>
                  <th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="text-center">Carregando...</td></tr>
                ) : statements.length === 0 ? (
                  <tr><td colSpan={11} className="text-center">Nenhum registro encontrado</td></tr>
                ) : statements.map(s => (
                  <tr key={s.id}>
                                    <td>{s.criado_em ? new Date(s.criado_em).toLocaleString() : '-'}</td>
                    <td>{s.data_movimentacao ? new Date(s.data_movimentacao).toLocaleDateString() : '-'}</td>
                    <td>{s.produto_nome || s.produto || '-'}</td>
                    <td>
                      <span className={`badge ${s.tipo === 'entrada' ? 'bg-success' : s.tipo === 'saida' ? 'bg-danger' : s.tipo === 'reserva' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {s.tipo === 'saida' ? 'Saída' : s.tipo === 'entrada' ? 'Entrada' : s.tipo === 'reserva' ? 'Reserva' : s.tipo === 'liberacao' ? 'Liberação' : s.tipo === 'reversao' ? 'Reversão' : s.tipo}
                      </span>
                    </td>
                    <td>{s.origem_display || s.origem || s.metadata?.origem_display || s.metadata?.origem || '-'}</td>
                    <td className="text-end">{Number(s.quantidade).toFixed(3)}</td>
                    <td>{s.unidade}</td>
                    <td className="text-end">{s.saldo_resultante ?? '-'}</td>
                    <td>{s.documento_referencia}</td>
                    <td>{s.motivo}</td>
                    <td>{s.observacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>Registros: {count}</div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Anterior</button>
              <span className="align-self-center">Página {page}</span>
              <button className="btn btn-outline-secondary" onClick={() => setPage(page + 1)} disabled={statements.length < pageSize}>Próximo</button>
              <select className="form-select ms-2" style={{ width: '120px' }} value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovimentacoesPage;
