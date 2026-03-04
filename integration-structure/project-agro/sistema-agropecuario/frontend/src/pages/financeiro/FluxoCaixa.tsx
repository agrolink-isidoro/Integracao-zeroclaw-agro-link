import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import api from '@/services/api';

interface FluxoCaixaData {
  mes: string;
  mes_numero: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface CentroCusto {
  id: number;
  nome: string;
}

const FluxoCaixa: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const [centroCusto, setCentroCusto] = useState<number | ''>('');
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'mensal' | 'anual'>('mensal');

  const { data: fluxoData, isLoading, error } = useQuery<FluxoCaixaData[]>({
    queryKey: ['financeiro', 'fluxo-caixa', ano, centroCusto],
    queryFn: async () => {
      const params = new URLSearchParams({ ano: String(ano) });
      if (centroCusto) params.append('centro_custo', String(centroCusto));
      const response = await api.get(`/financeiro/lancamentos/fluxo_caixa/?${params.toString()}`);
      return response.data;
    },
  });

  const { data: centrosCusto = [] } = useQuery<CentroCusto[]>({
    queryKey: ['centros-custo'],
    queryFn: async () => {
      const response = await api.get('/administrativo/centros-custo/');
      return response.data;
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Erro ao carregar fluxo de caixa</div>;

  const totais = fluxoData?.reduce(
    (acc, item) => ({
      receitas: acc.receitas + item.receitas,
      despesas: acc.despesas + item.despesas,
      saldo: acc.saldo + item.saldo,
    }),
    { receitas: 0, despesas: 0, saldo: 0 }
  ) || { receitas: 0, despesas: 0, saldo: 0 };

  return (
    <div>
      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Ano</label>
              <select className="form-select" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Centro de Custo</label>
              <select className="form-select" value={String(centroCusto)} onChange={(e) => setCentroCusto(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Todos</option>
                {centrosCusto.map((cc) => (
                  <option key={cc.id} value={cc.id}>{cc.nome}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Visualização</label>
              <select className="form-select" value={tipoVisualizacao} onChange={(e) => setTipoVisualizacao(e.target.value as any)}>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual (Totais)</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setAno(currentYear); setCentroCusto(''); }}>
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-success bg-opacity-10 border-success">
            <div className="card-body">
              <h6 className="text-muted mb-2">Receitas Totais</h6>
              <h3 className="mb-0 text-success">R$ {totais.receitas.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-danger bg-opacity-10 border-danger">
            <div className="card-body">
              <h6 className="text-muted mb-2">Despesas Totais</h6>
              <h3 className="mb-0 text-danger">R$ {totais.despesas.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className={`card ${totais.saldo >= 0 ? 'bg-info bg-opacity-10 border-info' : 'bg-warning bg-opacity-10 border-warning'}`}>
            <div className="card-body">
              <h6 className="text-muted mb-2">Saldo</h6>
              <h3 className={`mb-0 ${totais.saldo >= 0 ? 'text-info' : 'text-warning'}`}>
                R$ {totais.saldo.toFixed(2)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela Mensal */}
      {tipoVisualizacao === 'mensal' && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Fluxo de Caixa Mensal - {ano}</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="text-end">Receitas</th>
                    <th className="text-end">Despesas</th>
                    <th className="text-end">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxoData?.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.mes}</strong></td>
                      <td className="text-end text-success">R$ {item.receitas.toFixed(2)}</td>
                      <td className="text-end text-danger">R$ {item.despesas.toFixed(2)}</td>
                      <td className={`text-end fw-bold ${item.saldo >= 0 ? 'text-info' : 'text-warning'}`}>
                        R$ {item.saldo.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-bold">
                    <td>Total</td>
                    <td className="text-end text-success">R$ {totais.receitas.toFixed(2)}</td>
                    <td className="text-end text-danger">R$ {totais.despesas.toFixed(2)}</td>
                    <td className={`text-end ${totais.saldo >= 0 ? 'text-info' : 'text-warning'}`}>
                      R$ {totais.saldo.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visualização Anual */}
      {tipoVisualizacao === 'anual' && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Totais Anuais - {ano}</h5>
          </div>
          <div className="card-body">
            <div className="row text-center">
              <div className="col-md-4">
                <div className="p-4 border rounded">
                  <i className="bi bi-arrow-up-circle text-success fs-1"></i>
                  <h6 className="mt-2 text-muted">Receita Bruta</h6>
                  <h4 className="text-success">R$ {totais.receitas.toFixed(2)}</h4>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-4 border rounded">
                  <i className="bi bi-arrow-down-circle text-danger fs-1"></i>
                  <h6 className="mt-2 text-muted">Despesa Bruta</h6>
                  <h4 className="text-danger">R$ {totais.despesas.toFixed(2)}</h4>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-4 border rounded">
                  <i className={`bi ${totais.saldo >= 0 ? 'bi-bar-chart text-info' : 'bi-exclamation-triangle text-warning'} fs-1`}></i>
                  <h6 className="mt-2 text-muted">Resultado Líquido</h6>
                  <h4 className={totais.saldo >= 0 ? 'text-info' : 'text-warning'}>R$ {totais.saldo.toFixed(2)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="alert alert-info mt-3">
        <i className="bi bi-info-circle me-2"></i>
        <strong>Nota:</strong> O fluxo de caixa exibe dados agregados dos lançamentos financeiros. 
        Os valores são calculados automaticamente com base nas entradas e saídas registradas no sistema.
      </div>
    </div>
  );
};

export default FluxoCaixa;
