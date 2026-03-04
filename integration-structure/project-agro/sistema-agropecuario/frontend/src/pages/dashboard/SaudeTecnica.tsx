import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import DashboardService from '../../services/dashboard';
import type {
  AgriculturaKpis,
  MaquinasEquipamentosKpis,
  MaquinasAbastecimentoKpis,
  MaquinasOrdensKpis,
  EstoqueKpis,
} from '../../services/dashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const fmt = (v: number | undefined) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';

const fmtNum = (v: number | undefined) =>
  v != null ? v.toLocaleString('pt-BR') : '—';

export default function SaudeTecnica() {
  const { data: agriData, isLoading: agriLoading } = useQuery<AgriculturaKpis>({
    queryKey: ['dashboard-agricultura-ci'],
    queryFn: () => DashboardService.getAgricultura(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: equipData, isLoading: equipLoading } = useQuery<MaquinasEquipamentosKpis>({
    queryKey: ['dashboard-maquinas-equip-ci'],
    queryFn: () => DashboardService.getMaquinasEquipamentos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: abastData, isLoading: abastLoading } = useQuery<MaquinasAbastecimentoKpis>({
    queryKey: ['dashboard-maquinas-abast-ci'],
    queryFn: () => DashboardService.getMaquinasAbastecimentos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ordensData, isLoading: ordensLoading } = useQuery<MaquinasOrdensKpis>({
    queryKey: ['dashboard-maquinas-ordens-ci'],
    queryFn: () => DashboardService.getMaquinasOrdens(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: estoqueData, isLoading: estoqueLoading } = useQuery<EstoqueKpis>({
    queryKey: ['dashboard-estoque-ci'],
    queryFn: () => DashboardService.getEstoque(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = agriLoading || equipLoading || abastLoading || ordensLoading || estoqueLoading;
  const agri = agriData?.kpis;
  const estoque = estoqueData?.kpis;

  // Produção por talhão chart
  const talhaoChartData = useMemo(() => {
    const talhoes = agriData?.peso_por_talhao ?? [];
    if (!talhoes.length) return null;
    const sorted = [...talhoes].sort((a, b) => b.total_sacas_60kg - a.total_sacas_60kg).slice(0, 15);
    return {
      labels: sorted.map(t => t.talhao_nome),
      datasets: [{
        label: 'Sacas 60kg',
        data: sorted.map(t => t.total_sacas_60kg),
        backgroundColor: '#198754',
        borderRadius: 4,
      }],
    };
  }, [agriData]);

  // Equipment status doughnut
  const equipDoughnutData = useMemo(() => {
    if (!equipData) return null;
    return {
      labels: ['Ativos', 'Manutenção', 'Inativos'],
      datasets: [{
        data: [
          equipData.equipamentos_ativos,
          equipData.equipamentos_manutencao,
          Math.max(0, equipData.total_equipamentos - equipData.equipamentos_ativos - equipData.equipamentos_manutencao),
        ],
        backgroundColor: ['#198754', '#ffc107', '#dc3545'],
        borderWidth: 1,
      }],
    };
  }, [equipData]);

  // Ordens de Serviço breakdown
  const ordensBarData = useMemo(() => {
    if (!ordensData) return null;
    return {
      labels: ['Abertas', 'Em Andamento', 'Concluídas'],
      datasets: [{
        label: 'Ordens de Serviço',
        data: [ordensData.abertas, ordensData.em_andamento, ordensData.concluidas],
        backgroundColor: ['#dc3545', '#ffc107', '#198754'],
        borderRadius: 4,
      }],
    };
  }, [ordensData]);

  // alerts
  const alertItems: Array<{ text: string; variant: string }> = [];
  if (equipData && equipData.equipamentos_manutencao > 0) {
    alertItems.push({
      text: `${equipData.equipamentos_manutencao} equipamento(s) em manutenção`,
      variant: 'warning',
    });
  }
  if (ordensData && ordensData.abertas > 0) {
    alertItems.push({
      text: `${ordensData.abertas} ordem(ns) de serviço aberta(s)`,
      variant: 'danger',
    });
  }
  if (estoque && estoque.abaixo_minimo_count > 0) {
    alertItems.push({
      text: `${estoque.abaixo_minimo_count} produto(s) abaixo do estoque mínimo`,
      variant: 'danger',
    });
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <Link to="/dashboard/inteligencia" className="text-decoration-none text-muted small">
            <i className="bi bi-arrow-left me-1" />Central de Inteligência
          </Link>
          <h2 className="mb-0 mt-1" style={{ color: '#8B4513' }}>
            <i className="bi bi-tractor me-2" />
            Dados Técnico da Fazenda
          </h2>
        </div>
        <div className="d-flex gap-2">
          <Link to="/agricultura/safras" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-flower2 me-1" />Safras
          </Link>
          <Link to="/maquinas" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-gear me-1" />Máquinas
          </Link>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {/* Alerts */}
      {alertItems.length > 0 && (
        <div className="mb-4">
          {alertItems.map((al, i) => (
            <div key={i} className={`alert alert-${al.variant} border-0 d-flex align-items-center py-2 mb-2`}>
              <i className="bi bi-exclamation-triangle-fill me-2" />{al.text}
            </div>
          ))}
        </div>
      )}

      {/* Agricultura KPIs */}
      {agri && (
        <>
          <h5 className="mb-3" style={{ color: '#2d6a4f' }}>
            <i className="bi bi-flower2 me-2" />Agricultura
          </h5>
          <div className="row g-3 mb-4">
            {[
              { label: 'Plantios Ativos', value: fmtNum(agri.plantios_ativos), icon: 'bi-tree' },
              { label: 'Plantios (Ano)', value: fmtNum(agri.plantios_ano), icon: 'bi-calendar-range' },
              { label: 'Produção Real (kg)', value: fmtNum(agri.producao_real_kg), icon: 'bi-box-seam' },
              { label: 'Produção Real (sacas)', value: fmtNum(agri.producao_real_sacas_60kg), icon: 'bi-basket3' },
              { label: 'Prod. Estimada (kg)', value: fmtNum(agri.producao_estimada_kg), icon: 'bi-clipboard-data' },
              { label: 'Colheitas (Ano)', value: fmtNum(agri.colheitas_ano), icon: 'bi-truck' },
            ].map((card) => (
              <div key={card.label} className="col-6 col-lg-2">
                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '3px solid #198754' }}>
                  <div className="card-body py-2 px-3">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <small className="text-muted">{card.label}</small>
                    </div>
                    <h5 className="mb-0">{card.value}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Produção por talhão chart */}
          {talhaoChartData && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0"><i className="bi bi-bar-chart me-2" />Produção por Talhão (sacas 60kg)</h6>
              </div>
              <div className="card-body">
                <Bar data={talhaoChartData} options={{
                  responsive: true,
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { callback: (v) => `${Number(v).toLocaleString('pt-BR')} sc` } } },
                }} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Máquinas KPIs */}
      {equipData && (
        <>
          <h5 className="mb-3" style={{ color: '#8B4513' }}>
            <i className="bi bi-gear me-2" />Máquinas & Equipamentos
          </h5>
          <div className="row g-3 mb-4">
            {[
              { label: 'Total Equipamentos', value: fmtNum(equipData.total_equipamentos), icon: 'bi-tools', color: '' },
              { label: 'Ativos', value: fmtNum(equipData.equipamentos_ativos), icon: 'bi-check-circle', color: 'text-success' },
              { label: 'Em Manutenção', value: fmtNum(equipData.equipamentos_manutencao), icon: 'bi-wrench', color: equipData.equipamentos_manutencao > 0 ? 'text-warning' : '' },
              { label: 'Custo Total Equip.', value: fmt(equipData.custo_total_equipamentos), icon: 'bi-cash', color: '' },
              { label: 'Depreciação Total', value: fmt(equipData.depreciacao_total), icon: 'bi-arrow-down-circle', color: 'text-danger' },
            ].map((card) => (
              <div key={card.label} className="col-6 col-lg">
                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '3px solid #8B4513' }}>
                  <div className="card-body py-2 px-3">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <small className="text-muted">{card.label}</small>
                    </div>
                    <h5 className={`mb-0 ${card.color}`}>{card.value}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="row g-3 mb-4">
            {equipDoughnutData && (
              <div className="col-12 col-md-5">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0">
                    <h6 className="mb-0"><i className="bi bi-pie-chart me-2" />Status dos Equipamentos</h6>
                  </div>
                  <div className="card-body d-flex justify-content-center align-items-center">
                    <div style={{ maxWidth: 260 }}>
                      <Doughnut data={equipDoughnutData} options={{
                        responsive: true,
                        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {ordensBarData && (
              <div className="col-12 col-md-7">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-0">
                    <h6 className="mb-0"><i className="bi bi-clipboard-check me-2" />Ordens de Serviço</h6>
                  </div>
                  <div className="card-body">
                    <Bar data={ordensBarData} options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                    }} />
                    {ordensData && (
                      <p className="text-muted small mt-2 mb-0">
                        Total: {fmtNum(ordensData.total)} | Custo total: {fmt(ordensData.custo_total)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Abastecimentos */}
      {abastData && (
        <div className="row g-3 mb-4">
          <div className="col-sm-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted"><i className="bi bi-fuel-pump me-1" />Abastecimentos (Mês)</small>
                <h5 className="mb-0 mt-1">{fmtNum(abastData.total_abastecimentos_mes)}</h5>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted"><i className="bi bi-cash me-1" />Custo Combustível (Mês)</small>
                <h5 className="mb-0 mt-1">{fmt(abastData.custo_total_abastecimentos_mes)}</h5>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <small className="text-muted"><i className="bi bi-speedometer me-1" />Consumo Médio (L/dia)</small>
                <h5 className="mb-0 mt-1">{abastData.consumo_medio_litros_dia != null ? Number(abastData.consumo_medio_litros_dia).toFixed(1) : '—'}</h5>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estoque Section */}
      {estoque && (
        <>
          <h5 className="mb-3" style={{ color: '#2d6a4f' }}>
            <i className="bi bi-box me-2" />Estoque e Insumos
          </h5>
          <div className="row g-3 mb-4">
            {[
              { label: 'Valor Total Estoque', value: fmt(estoque.valor_total_estoque), icon: 'bi-cash-stack' },
              { label: 'Total Produtos', value: fmtNum(estoque.total_produtos), icon: 'bi-box-seam' },
              { label: 'Abaixo do Mínimo', value: fmtNum(estoque.abaixo_minimo_count), icon: 'bi-exclamation-triangle', color: estoque.abaixo_minimo_count > 0 ? 'text-danger' : 'text-success' },
              { label: 'Movimentações (7d)', value: fmtNum(estoque.movimentacoes_7d?.total), icon: 'bi-arrow-left-right' },
            ].map((card) => (
              <div key={card.label} className="col-6 col-lg-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`bi ${card.icon} me-2 text-muted`} />
                      <small className="text-muted">{card.label}</small>
                    </div>
                    <h5 className={`mb-0 ${(card as any).color ?? ''}`}>{card.value}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Produtos abaixo do mínimo */}
          {estoque.abaixo_minimo_itens && estoque.abaixo_minimo_itens.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0 text-danger"><i className="bi bi-exclamation-triangle me-2" />Produtos Abaixo do Estoque Mínimo</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Produto</th>
                        <th>Código</th>
                        <th className="text-end">Em Estoque</th>
                        <th className="text-end">Mínimo</th>
                        <th className="text-end">Unidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoque.abaixo_minimo_itens.map((item) => (
                        <tr key={item.id}>
                          <td>{item.nome}</td>
                          <td><code>{item.codigo}</code></td>
                          <td className="text-end text-danger fw-bold">{fmtNum(item.quantidade_estoque)}</td>
                          <td className="text-end">{fmtNum(item.estoque_minimo)}</td>
                          <td className="text-end">{item.unidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Drill-down links */}
      <div className="row g-3 mt-2">
        <div className="col-sm-6 col-md-3">
          <Link to="/agricultura/safras" className="card border-0 shadow-sm text-decoration-none h-100">
            <div className="card-body text-center py-3">
              <i className="bi bi-flower2 fs-3 d-block mb-1" style={{ color: '#198754' }} />
              <h6 className="mb-0 small">Safras</h6>
            </div>
          </Link>
        </div>
        <div className="col-sm-6 col-md-3">
          <Link to="/maquinas" className="card border-0 shadow-sm text-decoration-none h-100">
            <div className="card-body text-center py-3">
              <i className="bi bi-gear fs-3 d-block mb-1" style={{ color: '#8B4513' }} />
              <h6 className="mb-0 small">Equipamentos</h6>
            </div>
          </Link>
        </div>
        <div className="col-sm-6 col-md-3">
          <Link to="/estoque" className="card border-0 shadow-sm text-decoration-none h-100">
            <div className="card-body text-center py-3">
              <i className="bi bi-box fs-3 d-block mb-1 text-primary" />
              <h6 className="mb-0 small">Estoque</h6>
            </div>
          </Link>
        </div>
        <div className="col-sm-6 col-md-3">
          <Link to="/agricultura/talhoes" className="card border-0 shadow-sm text-decoration-none h-100">
            <div className="card-body text-center py-3">
              <i className="bi bi-map fs-3 d-block mb-1 text-warning" />
              <h6 className="mb-0 small">Talhões</h6>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
