import React from 'react';
import { useApiQuery } from '../../hooks/useApi';
import type { Fazenda, Area, AreaFeature, Talhao, Arrendamento, CotacaoSaca } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { formatCurrency, formatDate } from '../../utils/formatters';

const FazendaDashboard: React.FC = () => {
  // Queries
  const { data: fazendas = [], isLoading: loadingFazendas, error: errorFazendas } = useApiQuery<Fazenda[]>(
    ['fazendas'],
    '/fazendas/'
  );

  // API de áreas retorna GeoJSON FeatureCollection
  const { data: areasData, isLoading: loadingAreas } = useApiQuery<{ type: string; features: AreaFeature[] }>(
    ['areas'],
    '/areas/'
  );

  // Extrair áreas do GeoJSON FeatureCollection
  const areas: Area[] = (areasData?.features || []).map(feature => ({
    ...feature.properties,
    id: feature.id
  }));

  const { data: talhoes = [], isLoading: loadingTalhoes } = useApiQuery<Talhao[]>(
    ['talhoes'],
    '/talhoes/'
  );

  const { data: arrendamentos = [], isLoading: loadingArrendamentos } = useApiQuery<Arrendamento[]>(
    ['arrendamentos'],
    '/arrendamentos/'
  );

  const { data: cotacoes = [], isLoading: loadingCotacoes } = useApiQuery<CotacaoSaca[]>(
    ['cotacoes'],
    '/cotacoes-saca/'
  );

  // Garantir que todos os dados sejam arrays
  const fazendasArray = Array.isArray(fazendas) ? fazendas : [];
  const areasArray = Array.isArray(areas) ? areas : [];
  const talhoesArray = Array.isArray(talhoes) ? talhoes : [];
  const arrendamentosArray = Array.isArray(arrendamentos) ? arrendamentos : [];
  const cotacoesArray = Array.isArray(cotacoes) ? cotacoes : [];

  // Cálculos
  const totalFazendas = fazendasArray.length;
  const totalAreas = areasArray.length;
  const areasPropriaas = areasArray.filter(a => a.tipo === 'propria').length;
  const areasArrendadas = areasArray.filter(a => a.tipo === 'arrendada').length;
  const totalTalhoes = talhoesArray.length;
  const totalHectaresTalhoes = talhoesArray.reduce((sum, t) => {
    const areaSize = typeof t.area_size === 'string' ? parseFloat(t.area_size) : t.area_size;
    return sum + (areaSize || 0);
  }, 0);
  
  const arrendamentosAtivos = arrendamentosArray.filter(a => !a.end_date || new Date(a.end_date) >= new Date());
  const custoTotalArrendamentos = arrendamentosAtivos.reduce((sum, a) => sum + (a.custo_total_atual || 0), 0);

  // Organizar cotações por cultura (pegar a mais recente de cada)
  const cotacoesPorCultura = {
    soja: cotacoesArray.find(c => c.cultura === 'soja'),
    milho: cotacoesArray.find(c => c.cultura === 'milho'),
    sorgo: cotacoesArray.find(c => c.cultura === 'sorgo'),
    trigo: cotacoesArray.find(c => c.cultura === 'trigo'),
  };

  const isLoading = loadingFazendas || loadingAreas || loadingTalhoes || loadingArrendamentos || loadingCotacoes;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (errorFazendas) {
    return (
      <div className="p-6">
        <ErrorMessage message="Erro ao carregar dados do dashboard" />
      </div>
    );
  }

  return (
    <>
      {/* Linha 1 - Cards de Resumo */}
      <div className="row g-3 mb-4">
        {/* Card 1 - Total Fazendas */}
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">FAZENDAS</p>
                  <h2 className="mb-0 fw-bold">{totalFazendas}</h2>
                  <small className="text-white-50">cadastrada{totalFazendas !== 1 ? 's' : ''}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-building fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 - Total Áreas */}
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-success bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">ÁREAS</p>
                  <h2 className="mb-0 fw-bold">{totalAreas}</h2>
                  <div className="d-flex flex-wrap gap-1 mt-1">
                    <span className="badge bg-white text-success">{areasPropriaas}</span>
                    <span className="badge bg-white text-warning">{areasArrendadas}</span>
                  </div>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-geo-alt fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3 - Total Talhões */}
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-info bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">TALHÕES</p>
                  <h2 className="mb-0 fw-bold">{totalTalhoes}</h2>
                  <small className="text-white-50">{(totalHectaresTalhoes || 0).toFixed(2)} ha</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-grid-3x3 fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4 - Arrendamentos Ativos */}
        <div className="col-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100 bg-warning bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">ARRENDAMENTOS</p>
                  <h2 className="mb-0 fw-bold">{arrendamentosAtivos.length}</h2>
                  <small className="text-white-50">{formatCurrency(custoTotalArrendamentos)}</small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-file-text fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 2 - Gráficos */}
      <div className="row g-3 mb-4">
        {/* Gráfico 1 - Distribuição de Áreas */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0">
                <i className="bi bi-pie-chart me-2 text-primary"></i>
                Distribuição de Áreas
              </h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <div className="text-center">
                  <div className="mb-3">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="d-none d-md-block mx-auto">
                      {/* Gráfico de pizza simples com SVG */}
                      {areasPropriaas > 0 && (
                        <>
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="#198754"
                            stroke="white"
                            strokeWidth="2"
                            transform={`rotate(0 100 100)`}
                          />
                          {areasArrendadas > 0 && (
                            <path
                              d={`M 100 100 L 100 20 A 80 80 0 ${areasArrendadas / totalAreas > 0.5 ? 1 : 0} 1 ${
                                100 + 80 * Math.sin((areasArrendadas / totalAreas) * 2 * Math.PI)
                              } ${
                                100 - 80 * Math.cos((areasArrendadas / totalAreas) * 2 * Math.PI)
                              } Z`}
                              fill="#ffc107"
                              stroke="white"
                              strokeWidth="2"
                            />
                          )}
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                    <div>
                      <span className="badge bg-success me-2"></span>
                      Próprias: <strong>{areasPropriaas}</strong> ({totalAreas > 0 ? ((areasPropriaas / totalAreas) * 100).toFixed(0) : 0}%)
                    </div>
                    <div>
                      <span className="badge bg-warning me-2"></span>
                      Arrendadas: <strong>{areasArrendadas}</strong> ({totalAreas > 0 ? ((areasArrendadas / totalAreas) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico 2 - Top 5 Fazendas por Área */}
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0">
                <i className="bi bi-trophy me-2 text-primary"></i>
                Top 5 Fazendas por Total de Áreas
              </h5>
            </div>
            <div className="card-body">
              {fazendasArray.length === 0 ? (
                <p className="text-muted text-center py-5">Nenhuma fazenda cadastrada</p>
              ) : (
                <div className="list-group list-group-flush">
                  {fazendasArray
                    .sort((a, b) => (b.areas_count || 0) - (a.areas_count || 0))
                    .slice(0, 5)
                    .map((fazenda, index) => (
                      <div key={fazenda.id} className="list-group-item d-flex justify-content-between align-items-center px-0 border-0 border-bottom">
                        <div className="d-flex align-items-center gap-2">
                          <span className={`badge ${index === 0 ? 'bg-warning' : index === 1 ? 'bg-secondary' : index === 2 ? 'bg-danger' : 'bg-info'} rounded-pill`}>
                            #{index + 1}
                          </span>
                          <div>
                            <div className="fw-semibold">{fazenda.name}</div>
                            <small className="text-muted">
                              <i className="bi bi-person me-1"></i>
                              {fazenda.proprietario_nome || fazenda.proprietario_detail?.nome || 'Sem proprietário'}
                            </small>
                          </div>
                        </div>
                        <span className="badge bg-primary rounded-pill fs-6">
                          {fazenda.areas_count || 0} área{(fazenda.areas_count || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Linha 3 - Tabelas Resumo */}
      <div className="row g-3">
        {/* Últimos Arrendamentos */}
        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 py-3">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Últimos Arrendamentos
              </h5>
              <a href="/fazendas/arrendamentos" className="btn btn-sm btn-outline-primary">
                <i className="bi bi-arrow-right me-1"></i>
                Ver todos
              </a>
            </div>
            <div className="card-body p-0">
              {arrendamentosArray.length === 0 ? (
                <p className="text-muted text-center py-4">Nenhum arrendamento cadastrado</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Fazenda</th>
                        <th className="d-none d-md-table-cell">Arrendatário</th>
                        <th className="d-none d-lg-table-cell">Início</th>
                        <th>Custo</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrendamentosArray.slice(0, 5).map((arr) => {
                        const isAtivo = !arr.end_date || new Date(arr.end_date) >= new Date();
                        return (
                          <tr key={arr.id}>
                            <td className="fw-semibold">{arr.fazenda_detail?.name || '-'}</td>
                            <td className="d-none d-md-table-cell text-muted">{arr.arrendatario_detail?.nome || '-'}</td>
                            <td className="d-none d-lg-table-cell text-muted">{formatDate(arr.start_date)}</td>
                            <td>
                              <span className="badge bg-warning-subtle text-warning">
                                {arr.custo_sacas_hectare} sc/ha
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${isAtivo ? 'bg-success' : 'bg-secondary'}`}>
                                {isAtivo ? 'Ativo' : 'Encerrado'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cotação e Ações */}
        <div className="col-12 col-xl-5">
          {/* Cotações de Sacas */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-success text-white py-3">
              <h5 className="mb-0">
                <i className="bi bi-cash-stack me-2"></i>
                Cotação R$/Sacas
              </h5>
            </div>
            <div className="card-body">
              {cotacoesArray.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-3 mb-0">Nenhuma cotação disponível</p>
                  <p className="text-muted small">
                    <i className="bi bi-info-circle me-1"></i>
                    APIs gratuitas: <a href="https://www.noticiasagricolas.com.br/cotacoes" target="_blank" rel="noopener noreferrer">Notícias Agrícolas</a>, 
                    {' '}<a href="https://www.agrolink.com.br/cotacoes" target="_blank" rel="noopener noreferrer">Agrolink</a>
                  </p>
                </div>
              ) : (
                <div className="row g-2">
                  {/* Soja */}
                  <div className="col-6">
                    <div className={`card border-0 ${cotacoesPorCultura.soja ? 'bg-warning bg-opacity-10' : 'bg-light'} h-100`}>
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-circle-fill me-1"></i>
                            SOJA
                          </span>
                          {cotacoesPorCultura.soja && (
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(cotacoesPorCultura.soja.data).toLocaleDateString('pt-BR')}
                            </small>
                          )}
                        </div>
                        {cotacoesPorCultura.soja ? (
                          <>
                            <h4 className="mb-0 fw-bold text-success">
                              {formatCurrency(cotacoesPorCultura.soja.preco_por_saca)}
                            </h4>
                            <small className="text-muted">{cotacoesPorCultura.soja.fonte}</small>
                          </>
                        ) : (
                          <p className="text-muted small mb-0">Sem cotação</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Milho */}
                  <div className="col-6">
                    <div className={`card border-0 ${cotacoesPorCultura.milho ? 'bg-info bg-opacity-10' : 'bg-light'} h-100`}>
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-info text-dark">
                            <i className="bi bi-circle-fill me-1"></i>
                            MILHO
                          </span>
                          {cotacoesPorCultura.milho && (
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(cotacoesPorCultura.milho.data).toLocaleDateString('pt-BR')}
                            </small>
                          )}
                        </div>
                        {cotacoesPorCultura.milho ? (
                          <>
                            <h4 className="mb-0 fw-bold text-success">
                              {formatCurrency(cotacoesPorCultura.milho.preco_por_saca)}
                            </h4>
                            <small className="text-muted">{cotacoesPorCultura.milho.fonte}</small>
                          </>
                        ) : (
                          <p className="text-muted small mb-0">Sem cotação</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sorgo */}
                  <div className="col-6">
                    <div className={`card border-0 ${cotacoesPorCultura.sorgo ? 'bg-danger bg-opacity-10' : 'bg-light'} h-100`}>
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-danger">
                            <i className="bi bi-circle-fill me-1"></i>
                            SORGO
                          </span>
                          {cotacoesPorCultura.sorgo && (
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(cotacoesPorCultura.sorgo.data).toLocaleDateString('pt-BR')}
                            </small>
                          )}
                        </div>
                        {cotacoesPorCultura.sorgo ? (
                          <>
                            <h4 className="mb-0 fw-bold text-success">
                              {formatCurrency(cotacoesPorCultura.sorgo.preco_por_saca)}
                            </h4>
                            <small className="text-muted">{cotacoesPorCultura.sorgo.fonte}</small>
                          </>
                        ) : (
                          <p className="text-muted small mb-0">Sem cotação</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trigo */}
                  <div className="col-6">
                    <div className={`card border-0 ${cotacoesPorCultura.trigo ? 'bg-secondary bg-opacity-10' : 'bg-light'} h-100`}>
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="badge bg-secondary">
                            <i className="bi bi-circle-fill me-1"></i>
                            TRIGO
                          </span>
                          {cotacoesPorCultura.trigo && (
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(cotacoesPorCultura.trigo.data).toLocaleDateString('pt-BR')}
                            </small>
                          )}
                        </div>
                        {cotacoesPorCultura.trigo ? (
                          <>
                            <h4 className="mb-0 fw-bold text-success">
                              {formatCurrency(cotacoesPorCultura.trigo.preco_por_saca)}
                            </h4>
                            <small className="text-muted">{cotacoesPorCultura.trigo.fonte}</small>
                          </>
                        ) : (
                          <p className="text-muted small mb-0">Sem cotação</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {custoTotalArrendamentos > 0 && (
                <div className="alert alert-success mt-3 mb-0">
                  <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-2">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Custo Total Arrendamentos Ativos:
                    </small>
                    <strong className="text-success fs-5">{formatCurrency(custoTotalArrendamentos)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2 text-primary"></i>
                Ações Rápidas
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <a href="/fazendas/fazendas" className="btn btn-outline-primary">
                  <i className="bi bi-building me-2"></i>
                  Gerenciar Fazendas
                </a>
                <a href="/fazendas/areas" className="btn btn-outline-success">
                  <i className="bi bi-geo-alt me-2"></i>
                  Gerenciar Áreas
                </a>
                <a href="/fazendas/talhoes" className="btn btn-outline-info">
                  <i className="bi bi-grid-3x3 me-2"></i>
                  Gerenciar Talhões
                </a>
                <a href="/fazendas/arrendamentos" className="btn btn-outline-warning">
                  <i className="bi bi-file-text me-2"></i>
                  Gerenciar Arrendamentos
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FazendaDashboard;
