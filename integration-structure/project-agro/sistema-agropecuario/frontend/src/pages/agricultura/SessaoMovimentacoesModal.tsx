import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

interface Transporte {
  id?: number;
  placa?: string;
  motorista?: string;
  tara?: number | null;
  peso_bruto?: number | null;
  peso_liquido?: number | null;
  descontos?: number | null;
  custo_transporte?: number | null;
}

interface MovimentacaoCarga {
  id: number;
  session_item?: number | null;
  talhao?: number | null;
  talhao_name?: string;
  placa?: string;
  motorista?: string;
  tara?: number | null;
  peso_bruto?: number | null;
  peso_liquido?: number | null;
  descontos?: number | null;
  custo_transporte?: number | null;
  custo_transporte_unidade?: string;
  transporte?: Transporte | null;
  destino_tipo?: string;
  empresa_destino?: number | null;
  empresa_destino_nome?: string;
  local_destino?: number | null;
  local_destino_nome?: string;
  nf_provisoria?: string;
  condicoes_graos?: string;
  criado_em?: string;
  reconciled?: boolean;
}

interface HarvestSession {
  id: number;
  plantio_nome?: string;
  data_inicio?: string;
  status?: string;
}

interface Props {
  session: HarvestSession;
  onClose: () => void;
}

const DESTINO_LABELS: Record<string, string> = {
  armazenagem_interna: 'Armazenagem Interna',
  armazenagem_geral: 'Armazém Geral',
  contrato_industria: 'Contrato c/ Indústria',
  venda_direta: 'Venda Direta',
};

function fmt(n: number | null | undefined, decimals = 3) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(n));
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const SessaoMovimentacoesModal: React.FC<Props> = ({ session, onClose }) => {
  const { data: movimentacoes = [], isLoading, error } = useQuery<MovimentacaoCarga[]>({
    queryKey: ['movimentacoes-sessao', session.id],
    queryFn: async () => {
      const r = await api.get(`/agricultura/movimentacoes-carga/?session_item__session=${session.id}&page_size=200`);
      const d = r.data;
      return Array.isArray(d) ? d : (d.results ?? []);
    },
  });

  const totalBruto = movimentacoes.reduce((a, m) => a + Number(m.peso_bruto ?? m.transporte?.peso_bruto ?? 0), 0);
  const totalLiquido = movimentacoes.reduce((a, m) => a + Number(m.peso_liquido ?? m.transporte?.peso_liquido ?? 0), 0);
  const totalDesconto = movimentacoes.reduce((a, m) => a + Number(m.descontos ?? m.transporte?.descontos ?? 0), 0);

  const placa = (m: MovimentacaoCarga) => m.placa || m.transporte?.placa || '—';
  const motorista = (m: MovimentacaoCarga) => m.motorista || m.transporte?.motorista || '—';
  const tara = (m: MovimentacaoCarga) => m.tara ?? m.transporte?.tara;
  const pesoBruto = (m: MovimentacaoCarga) => m.peso_bruto ?? m.transporte?.peso_bruto;
  const pesoLiquido = (m: MovimentacaoCarga) => m.peso_liquido ?? m.transporte?.peso_liquido;
  const descontos = (m: MovimentacaoCarga) => m.descontos ?? m.transporte?.descontos;
  const custoFrete = (m: MovimentacaoCarga) => m.custo_transporte ?? m.transporte?.custo_transporte;

  const destino = (m: MovimentacaoCarga) => {
    const label = DESTINO_LABELS[m.destino_tipo || ''] ?? m.destino_tipo ?? '—';
    const nome = m.empresa_destino_nome || m.local_destino_nome || '';
    return nome ? `${label}: ${nome}` : label;
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-truck me-2"></i>
              Movimentações da Sessão
              <small className="text-muted ms-2 fw-normal">
                {session.plantio_nome || `Sessão ${session.id}`}
                {session.data_inicio ? ` — ${fmtDate(session.data_inicio)}` : ''}
              </small>
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body p-0">
            {isLoading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" />
                <p className="mt-3 text-muted">Carregando movimentações…</p>
              </div>
            )}

            {!isLoading && error && (
              <div className="alert alert-danger m-3">
                Erro ao carregar movimentações. Tente novamente.
              </div>
            )}

            {!isLoading && !error && movimentacoes.length === 0 && (
              <div className="alert alert-info m-3">
                <i className="bi bi-info-circle me-2"></i>
                Nenhuma movimentação registrada para esta sessão.
              </div>
            )}

            {!isLoading && movimentacoes.length > 0 && (
              <>
                {/* Totais */}
                <div className="row g-0 border-bottom bg-light">
                  <div className="col-4 border-end text-center py-3">
                    <div className="small text-muted">Total Peso Bruto</div>
                    <strong className="fs-6">{fmt(totalBruto)} kg</strong>
                  </div>
                  <div className="col-4 border-end text-center py-3">
                    <div className="small text-muted">Total Descontos</div>
                    <strong className="fs-6 text-danger">{fmt(totalDesconto)} kg</strong>
                  </div>
                  <div className="col-4 text-center py-3">
                    <div className="small text-muted">Total Peso Líquido</div>
                    <strong className="fs-6 text-success">{fmt(totalLiquido)} kg</strong>
                    <div className="small text-muted">({(totalLiquido / 1000).toFixed(3)} ton)</div>
                  </div>
                </div>

                {/* Tabela */}
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0 align-middle">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th style={{ minWidth: 90 }}>#</th>
                        <th style={{ minWidth: 110 }}>Talhão</th>
                        <th style={{ minWidth: 110 }}>Placa</th>
                        <th style={{ minWidth: 130 }}>Motorista</th>
                        <th className="text-end" style={{ minWidth: 100 }}>Tara (kg)</th>
                        <th className="text-end" style={{ minWidth: 110 }}>Peso Bruto (kg)</th>
                        <th className="text-end" style={{ minWidth: 110 }}>Descontos (kg)</th>
                        <th className="text-end" style={{ minWidth: 110 }}>Peso Líq. (kg)</th>
                        <th className="text-end" style={{ minWidth: 120 }}>Custo Frete</th>
                        <th style={{ minWidth: 200 }}>Destino</th>
                        <th style={{ minWidth: 130 }}>Data</th>
                        <th style={{ minWidth: 80 }} className="text-center">Concil.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentacoes.map((m, idx) => (
                        <tr key={m.id}>
                          <td>
                            <span className="badge bg-secondary">{idx + 1}</span>
                            <span className="text-muted ms-1 small">#{m.id}</span>
                          </td>
                          <td>{m.talhao_name || (m.talhao ? `Talhão ${m.talhao}` : '—')}</td>
                          <td>
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">
                              <i className="bi bi-truck me-1"></i>{placa(m)}
                            </span>
                          </td>
                          <td>{motorista(m)}</td>
                          <td className="text-end font-monospace">{fmt(tara(m))}</td>
                          <td className="text-end font-monospace">{fmt(pesoBruto(m))}</td>
                          <td className="text-end font-monospace text-danger">{fmt(descontos(m))}</td>
                          <td className="text-end font-monospace fw-semibold text-success">{fmt(pesoLiquido(m))}</td>
                          <td className="text-end">
                            {custoFrete(m) != null ? (
                              <span>
                                {fmt(custoFrete(m), 2)}
                                {m.custo_transporte_unidade ? (
                                  <span className="text-muted ms-1 small">/{m.custo_transporte_unidade}</span>
                                ) : null}
                              </span>
                            ) : '—'}
                          </td>
                          <td>
                            <span className={`badge me-1 ${
                              m.destino_tipo === 'armazenagem_interna' ? 'bg-info' :
                              m.destino_tipo === 'contrato_industria' ? 'bg-warning text-dark' :
                              'bg-secondary'
                            }`}>
                              {DESTINO_LABELS[m.destino_tipo || ''] ?? m.destino_tipo ?? '—'}
                            </span>
                            <div className="small text-muted">{m.empresa_destino_nome || m.local_destino_nome || ''}</div>
                            {m.nf_provisoria && (
                              <div className="small text-muted">NF: {m.nf_provisoria}</div>
                            )}
                          </td>
                          <td className="small text-muted">{fmtDate(m.criado_em)}</td>
                          <td className="text-center">
                            {m.reconciled ? (
                              <i className="bi bi-check-circle-fill text-success" title="Reconciliado" />
                            ) : (
                              <i className="bi bi-circle text-muted" title="Pendente" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-semibold">
                      <tr>
                        <td colSpan={4}>Total ({movimentacoes.length} carga{movimentacoes.length !== 1 ? 's' : ''})</td>
                        <td className="text-end font-monospace">—</td>
                        <td className="text-end font-monospace">{fmt(totalBruto)}</td>
                        <td className="text-end font-monospace text-danger">{fmt(totalDesconto)}</td>
                        <td className="text-end font-monospace text-success">{fmt(totalLiquido)}</td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <small className="text-muted me-auto">
              {movimentacoes.length} movimentação{movimentacoes.length !== 1 ? 'ões' : ''} registrada{movimentacoes.length !== 1 ? 's' : ''}
            </small>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessaoMovimentacoesModal;
