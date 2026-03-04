import React, { useState, useEffect } from 'react';
import cargasService from '../../services/cargas';
import type { DiferencaCarga } from '../../types/estoque_maquinas';

const DiferencasReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [diferencas, setDiferencas] = useState<DiferencaCarga[]>([]);
  const [limitePercentual, setLimitePercentual] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDiferencas();
  }, [limitePercentual]);

  const carregarDiferencas = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await cargasService.diferencasSignificativas(limitePercentual);
      setDiferencas(response.results);
    } catch (err) {
      console.error('Erro ao carregar diferenças:', err);
      setError('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="card-title">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Diferenças Significativas - Peso Estimado vs Balança
                </h3>
                <div className="d-flex align-items-center gap-2">
                  <label className="mb-0">Limite:</label>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: '120px' }}
                    value={limitePercentual}
                    onChange={(e) => setLimitePercentual(Number(e.target.value))}
                  >
                    <option value={2}>≥ 2%</option>
                    <option value={5}>≥ 5%</option>
                    <option value={10}>≥ 10%</option>
                    <option value={15}>≥ 15%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                  <p className="mt-3">Analisando movimentações...</p>
                </div>
              ) : diferencas.length === 0 ? (
                <div className="alert alert-success text-center">
                  <i className="bi bi-check-circle me-2"></i>
                  Nenhuma diferença significativa encontrada (≥ {limitePercentual}%)
                </div>
              ) : (
                <>
                  <div className="alert alert-warning">
                    <strong>{diferencas.length}</strong> movimentações com diferença ≥ {limitePercentual}%
                  </div>

                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>Placa</th>
                          <th className="text-end">Peso Estimado (kg)</th>
                          <th className="text-end">Peso Balança (kg)</th>
                          <th className="text-end">Diferença (kg)</th>
                          <th className="text-end">Diferença (%)</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diferencas.map((diff, index) => {
                          const isPositivo = diff.diferenca > 0;
                          const percentualAbs = Math.abs(diff.percentual);
                          
                          return (
                            <tr key={index}>
                              <td>
                                <strong>{diff.placa}</strong>
                              </td>
                              <td className="text-end">
                                {diff.peso_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="text-end">
                                {diff.peso_balanca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="text-end">
                                <span className={isPositivo ? 'text-success' : 'text-danger'}>
                                  {isPositivo ? '+' : ''}
                                  {diff.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="text-end">
                                <span className={`badge ${percentualAbs >= 10 ? 'bg-danger' : 'bg-warning'}`}>
                                  {isPositivo ? '+' : ''}
                                  {diff.percentual.toFixed(2)}%
                                </span>
                              </td>
                              <td>
                                {new Date(diff.data).toLocaleString('pt-BR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="table-secondary">
                          <th>Total</th>
                          <th className="text-end">
                            {diferencas.reduce((sum, d) => sum + d.peso_estimado, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </th>
                          <th className="text-end">
                            {diferencas.reduce((sum, d) => sum + d.peso_balanca, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </th>
                          <th className="text-end">
                            {diferencas.reduce((sum, d) => sum + d.diferenca, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </th>
                          <th colSpan={2}></th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Gráfico de distribuição de diferenças */}
                  <div className="mt-4">
                    <h5>Distribuição de Diferenças</h5>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="card bg-success text-white">
                          <div className="card-body text-center">
                            <h6>Sobra (Peso Real &gt; Estimado)</h6>
                            <h3>{diferencas.filter(d => d.diferenca > 0).length}</h3>
                            <small>movimentações</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card bg-danger text-white">
                          <div className="card-body text-center">
                            <h6>Falta (Peso Real &lt; Estimado)</h6>
                            <h3>{diferencas.filter(d => d.diferenca < 0).length}</h3>
                            <small>movimentações</small>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card bg-primary text-white">
                          <div className="card-body text-center">
                            <h6>Diferença Média</h6>
                            <h3>
                              {(diferencas.reduce((sum, d) => sum + Math.abs(d.percentual), 0) / diferencas.length).toFixed(2)}%
                            </h3>
                            <small>percentual</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiferencasReport;
