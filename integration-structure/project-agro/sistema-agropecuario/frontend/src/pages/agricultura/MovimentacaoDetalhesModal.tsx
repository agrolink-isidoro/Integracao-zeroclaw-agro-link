import React from 'react';

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
  condicoes_graos?: string;
  destino_tipo?: string;
  empresa_destino?: number | null;
  empresa_destino_nome?: string;
  local_destino?: number | null;
  local_destino_nome?: string;
  contrato_ref?: string;
  nf_provisoria?: string;
  reconciled?: boolean;
  reconciled_at?: string;
  criado_em?: string;
  transporte?: {
    placa?: string;
    motorista?: string;
    tara?: number | null;
    peso_bruto?: number | null;
    peso_liquido?: number | null;
    descontos?: number | null;
    custo_transporte?: number | null;
  } | null;
}

interface Props {
  movimentacao: MovimentacaoCarga;
  onClose: () => void;
}

const DESTINO_LABELS: Record<string, string> = {
  armazenagem_interna: 'Armazenagem Interna',
  armazenagem_geral: 'Armazém Geral',
  armazenagem_externa: 'Armazém Geral',
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

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(n));
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const UNIDADE_LABELS: Record<string, string> = {
  unidade: 'Total (valor fixo)',
  saca: 'Por saca',
  tonelada: 'Por tonelada',
};

const MovimentacaoDetalhesModal: React.FC<Props> = ({ movimentacao: m, onClose }) => {
  const placa = m.placa || m.transporte?.placa || '—';
  const motorista = m.motorista || m.transporte?.motorista || '—';
  const tara = m.tara ?? m.transporte?.tara;
  const pesoBruto = m.peso_bruto ?? m.transporte?.peso_bruto;
  const pesoLiquido = m.peso_liquido ?? m.transporte?.peso_liquido;
  const descontos = m.descontos ?? m.transporte?.descontos;
  const custoFrete = m.custo_transporte ?? m.transporte?.custo_transporte;

  const destinoLabel = DESTINO_LABELS[m.destino_tipo || ''] ?? m.destino_tipo ?? '—';
  const destinoNome = m.empresa_destino_nome || m.local_destino_nome || '';

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header bg-primary bg-opacity-10">
            <h5 className="modal-title">
              <i className="bi bi-eye me-2"></i>
              Detalhes da Movimentação #{m.id}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {/* Talhão e Data */}
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="card border-0 bg-light">
                  <div className="card-body py-2">
                    <small className="text-muted d-block">Talhão</small>
                    <strong>{m.talhao_name || (m.talhao ? `Talhão ${m.talhao}` : '—')}</strong>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 bg-light">
                  <div className="card-body py-2">
                    <small className="text-muted d-block">Data de Registro</small>
                    <strong>{fmtDate(m.criado_em)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Transporte */}
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-truck me-2"></i>Transporte
            </h6>
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="mb-2">
                  <small className="text-muted d-block">Placa</small>
                  <span className="badge bg-primary bg-opacity-10 text-primary border border-primary fs-6">
                    <i className="bi bi-truck me-1"></i>{placa}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-2">
                  <small className="text-muted d-block">Motorista</small>
                  <strong>{motorista}</strong>
                </div>
              </div>
            </div>

            {/* Pesos */}
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-speedometer2 me-2"></i>Pesagem
            </h6>
            <div className="row mb-3 g-2">
              <div className="col-md-3">
                <div className="card border-0 bg-light text-center">
                  <div className="card-body py-2">
                    <small className="text-muted d-block">Tara</small>
                    <strong>{fmt(tara)} kg</strong>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light text-center">
                  <div className="card-body py-2">
                    <small className="text-muted d-block">Peso Bruto</small>
                    <strong>{fmt(pesoBruto)} kg</strong>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-light text-center">
                  <div className="card-body py-2">
                    <small className="text-muted d-block">Descontos</small>
                    <strong className="text-danger">{fmt(descontos)} kg</strong>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 bg-success bg-opacity-10 text-center">
                  <div className="card-body py-2">
                    <small className="text-muted d-block">Peso Líquido</small>
                    <strong className="text-success fs-5">{fmt(pesoLiquido)} kg</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Custo Frete */}
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-currency-dollar me-2"></i>Custo de Transporte
            </h6>
            <div className="row mb-3">
              <div className="col-md-6">
                <small className="text-muted d-block">Valor</small>
                <strong>{fmtCurrency(custoFrete)}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Unidade</small>
                <strong>{UNIDADE_LABELS[m.custo_transporte_unidade || 'unidade'] || m.custo_transporte_unidade || '—'}</strong>
              </div>
            </div>

            {/* Destino */}
            <h6 className="border-bottom pb-2 mb-3">
              <i className="bi bi-geo-alt me-2"></i>Destino
            </h6>
            <div className="row mb-3">
              <div className="col-md-6">
                <small className="text-muted d-block">Tipo</small>
                <strong>{destinoLabel}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Local/Empresa</small>
                <strong>{destinoNome || '—'}</strong>
              </div>
            </div>

            {/* NF e Contrato */}
            {(m.nf_provisoria || m.contrato_ref) && (
              <div className="row mb-3">
                {m.nf_provisoria && (
                  <div className="col-md-6">
                    <small className="text-muted d-block">NF Provisória</small>
                    <strong>{m.nf_provisoria}</strong>
                  </div>
                )}
                {m.contrato_ref && (
                  <div className="col-md-6">
                    <small className="text-muted d-block">Referência do Contrato</small>
                    <strong>{m.contrato_ref}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Condições dos Grãos */}
            {m.condicoes_graos && (
              <div className="mb-3">
                <small className="text-muted d-block">Condições dos Grãos</small>
                <p className="mb-0">{m.condicoes_graos}</p>
              </div>
            )}

            {/* Conciliação */}
            <div className="row">
              <div className="col-md-6">
                <small className="text-muted d-block">Conciliação</small>
                {m.reconciled ? (
                  <span className="badge bg-success">
                    <i className="bi bi-check-circle me-1"></i>Conciliada
                    {m.reconciled_at ? ` em ${fmtDate(m.reconciled_at)}` : ''}
                  </span>
                ) : (
                  <span className="badge bg-warning text-dark">
                    <i className="bi bi-clock me-1"></i>Pendente
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovimentacaoDetalhesModal;
