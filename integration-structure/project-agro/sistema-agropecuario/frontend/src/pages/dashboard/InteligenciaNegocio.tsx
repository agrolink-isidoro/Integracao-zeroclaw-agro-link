import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DashboardService from '../../services/dashboard';
import type { FinanceiroKpis, AgriculturaKpis, MaquinasEquipamentosKpis, EstoqueKpis } from '../../services/dashboard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/** Formata valor monetário BR */
const fmt = (v: number | undefined) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ —';

const fmtNum = (v: number | undefined) =>
  v != null ? v.toLocaleString('pt-BR') : '—';

/* =========================================================
 * HUB / Landing — Central de Inteligência
 * ========================================================= */
function CentroInteligenciaHub() {
  // Hero KPIs — financeiro
  const { data: finData, isLoading: finL } = useQuery<FinanceiroKpis>({
    queryKey: ['ci-hub-fin'],
    queryFn: () => DashboardService.getFinanceiro(90),
    staleTime: 5 * 60 * 1000,
  });
  // Hero KPIs — agricultura
  const { data: agriData, isLoading: agriL } = useQuery<AgriculturaKpis>({
    queryKey: ['ci-hub-agri'],
    queryFn: () => DashboardService.getAgricultura(),
    staleTime: 5 * 60 * 1000,
  });
  // Hero KPIs — equipamentos
  const { data: equipData, isLoading: equipL } = useQuery<MaquinasEquipamentosKpis>({
    queryKey: ['ci-hub-equip'],
    queryFn: () => DashboardService.getMaquinasEquipamentos(),
    staleTime: 5 * 60 * 1000,
  });
  // Hero KPIs — estoque
  const { data: estoqueData, isLoading: estL } = useQuery<EstoqueKpis>({
    queryKey: ['ci-hub-estoque'],
    queryFn: () => DashboardService.getEstoque(),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = finL || agriL || equipL || estL;
  const fin = finData?.kpis;
  const agri = agriData?.kpis;
  const estoque = estoqueData?.kpis;

  // Alerts
  const alerts: Array<{ text: string; variant: string; link?: string }> = [];
  if (fin && (fin.vencimentos_atrasados?.count ?? 0) > 0) {
    alerts.push({
      text: `${fin.vencimentos_atrasados.count} vencimento(s) atrasado(s) — ${fmt(fin.vencimentos_atrasados.total)}`,
      variant: 'danger',
      link: '/financeiro/vencimentos',
    });
  }
  if (equipData && equipData.equipamentos_manutencao > 0) {
    alerts.push({
      text: `${equipData.equipamentos_manutencao} equipamento(s) em manutenção`,
      variant: 'warning',
      link: '/maquinas',
    });
  }
  if (estoque && estoque.abaixo_minimo_count > 0) {
    alerts.push({
      text: `${estoque.abaixo_minimo_count} produto(s) abaixo do estoque mínimo`,
      variant: 'danger',
      link: '/estoque',
    });
  }
  if (fin && (fin.vencimentos_proximos?.count ?? 0) > 3) {
    alerts.push({
      text: `${fin.vencimentos_proximos.count} vencimento(s) próximo(s) — ${fmt(fin.vencimentos_proximos.total)}`,
      variant: 'warning',
      link: '/financeiro/vencimentos',
    });
  }

  // Section definitions
  const sections = [
    {
      title: 'Dados Financeiros',
      subtitle: 'Fluxo de caixa, endividamento, vencimentos e indicadores financeiros consolidados.',
      icon: 'bi-bank',
      color: '#198754',
      bgGradient: 'linear-gradient(135deg, #198754 0%, #40916c 100%)',
      path: '/dashboard/inteligencia/propriedade',
      heroKpis: [
        { label: 'Saldo Contas', value: fmt(fin?.saldo_contas) },
        { label: 'Caixa (90d)', value: fmt(fin?.caixa_periodo) },
        { label: 'Venc. Atrasados', value: `${fin?.vencimentos_atrasados?.count ?? 0}`, danger: (fin?.vencimentos_atrasados?.count ?? 0) > 0 },
      ],
    },
    {
      title: 'Dados de Produção',
      subtitle: 'Custos e receita por safra, margem bruta, produtividade e comparativos.',
      icon: 'bi-flower2',
      color: '#2d6a4f',
      bgGradient: 'linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)',
      path: '/dashboard/inteligencia/producao',
      heroKpis: [
        { label: 'Plantios Ativos', value: fmtNum(agri?.plantios_ativos) },
        { label: 'Produção (sacas)', value: fmtNum(agri?.producao_real_sacas_60kg) },
        { label: 'Colheitas (Ano)', value: fmtNum(agri?.colheitas_ano) },
      ],
    },
    {
      title: 'Dados Técnico da Fazenda',
      subtitle: 'Máquinas, equipamentos, estoque de insumos, produção e operações de campo.',
      icon: 'bi-tractor',
      color: '#8B4513',
      bgGradient: 'linear-gradient(135deg, #8B4513 0%, #cd853f 100%)',
      path: '/dashboard/inteligencia/tecnica',
      heroKpis: [
        { label: 'Equipamentos', value: fmtNum(equipData?.total_equipamentos) },
        { label: 'Em Manutenção', value: fmtNum(equipData?.equipamentos_manutencao), danger: (equipData?.equipamentos_manutencao ?? 0) > 0 },
        { label: 'Estoque Baixo', value: fmtNum(estoque?.abaixo_minimo_count), danger: (estoque?.abaixo_minimo_count ?? 0) > 0 },
      ],
    },
  ];

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-1" style={{ color: '#198754' }}>
          <i className="bi bi-brain me-2" />
          Central de Inteligência
        </h2>
        <p className="text-muted mb-0">
          Visão consolidada da saúde financeira, produtiva e operacional da propriedade.
        </p>
      </div>

      {isLoading && <LoadingSpinner />}

      {/* Alerts Bar */}
      {alerts.length > 0 && (
        <div className="mb-4">
          {alerts.map((al, i) => (
            <div key={i} className={`alert alert-${al.variant} border-0 d-flex align-items-center py-2 mb-2`}>
              <i className="bi bi-exclamation-triangle-fill me-2" />
              <span className="flex-grow-1">{al.text}</span>
              {al.link && (
                <Link to={al.link} className="btn btn-sm btn-outline-dark ms-2">
                  Ver <i className="bi bi-arrow-right ms-1" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3 Section Cards */}
      <div className="row g-4 mb-4">
        {sections.map((sec) => (
          <div key={sec.title} className="col-12 col-lg-4">
            <Link to={sec.path} className="text-decoration-none d-block h-100">
              <div
                className="card border-0 shadow h-100 overflow-hidden"
                style={{ transition: 'transform .15s', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {/* Colored header band */}
                <div
                  className="card-header text-white border-0 py-3"
                  style={{ background: sec.bgGradient }}
                >
                  <h5 className="mb-1 d-flex align-items-center">
                    <i className={`bi ${sec.icon} me-2 fs-4`} />
                    {sec.title}
                  </h5>
                  <small className="opacity-75">{sec.subtitle}</small>
                </div>

                {/* Hero KPIs */}
                <div className="card-body">
                  <div className="row g-2">
                    {sec.heroKpis.map((kpi) => (
                      <div key={kpi.label} className="col-4 text-center">
                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{kpi.label}</small>
                        <h5
                          className={`mb-0 ${(kpi as any).danger ? 'text-danger' : ''}`}
                          style={{ color: (kpi as any).danger ? undefined : sec.color }}
                        >
                          {kpi.value}
                        </h5>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="card-footer bg-white border-0 text-end">
                  <span className="small fw-semibold" style={{ color: sec.color }}>
                    Acessar <i className="bi bi-arrow-right ms-1" />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Quick Numbers Summary */}
      {!isLoading && (fin || agri || equipData) && (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <h6 className="mb-0"><i className="bi bi-speedometer2 me-2" />Resumo Rápido</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {[
                { label: 'Saldo Contas', value: fmt(fin?.saldo_contas), icon: 'bi-wallet2', color: '#198754' },
                { label: 'EBITDA', value: fmt(fin?.ebitda), icon: 'bi-graph-up', color: '#198754' },
                { label: 'Gasto / Hectare', value: fmt(fin?.gasto_por_hectare), icon: 'bi-rulers', color: '#2d6a4f' },
                { label: 'Plantios Ativos', value: fmtNum(agri?.plantios_ativos), icon: 'bi-tree', color: '#2d6a4f' },
                { label: 'Equipamentos Ativos', value: fmtNum(equipData?.equipamentos_ativos), icon: 'bi-gear', color: '#8B4513' },
                { label: 'Valor Estoque', value: fmt(estoque?.valor_total_estoque), icon: 'bi-box-seam', color: '#8B4513' },
              ].map((item) => (
                <div key={item.label} className="col-6 col-sm-4 col-lg-2">
                  <div className="text-center">
                    <i className={`bi ${item.icon} d-block mb-1`} style={{ color: item.color, fontSize: '1.3rem' }} />
                    <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>{item.label}</small>
                    <strong style={{ fontSize: '0.95rem' }}>{item.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
 * Layout — renders Hub (index) or child pages via <Outlet>
 * ========================================================= */
export default function InteligenciaNegocio() {
  const location = useLocation();
  // If we're exactly at the hub path, render the hub; otherwise render child via Outlet
  const isHub = location.pathname === '/dashboard/inteligencia' || location.pathname === '/dashboard/inteligencia/';

  return isHub ? <CentroInteligenciaHub /> : <Outlet />;
}
