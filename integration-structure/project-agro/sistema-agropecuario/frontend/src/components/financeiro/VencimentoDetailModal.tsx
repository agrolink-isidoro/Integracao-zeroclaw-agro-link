import type { FC } from 'react';
import type { Vencimento } from '@/types/financeiro';

interface Props {
  data: Vencimento | null;
  show: boolean;
  onClose: () => void;
}

const VencimentoDetailModal: FC<Props> = ({ data, show, onClose }: Props) => {
  if (!show || !data) {
    console.log('[VencimentoDetailModal] Not showing - show:', show, 'data:', data);
    return null;
  }

  console.log('[VencimentoDetailModal] Data received:', data);

  // Calcula dias até o vencimento ou dias de atraso
  const hoje = new Date();
  const vencimento = new Date(data.data_vencimento);
  const diasDiferenca = Math.floor((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const estaAtrasado = data.status === 'atrasado' || (diasDiferenca < 0 && data.status !== 'pago');

  // Determina a cor do status
  const getStatusColor = () => {
    if (data.status === 'pago') return 'success';
    if (data.status === 'atrasado' || estaAtrasado) return 'danger';
    if (diasDiferenca <= 7 && diasDiferenca > 0) return 'warning';
    return 'info';
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-calendar-event me-2"></i>
              Detalhes do Vencimento
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Sessão 1: Dados Básicos */}
            <div className="card mb-3">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Dados Básicos
                </h6>
              </div>
              <div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-bold text-muted small">Título</label>
                      <p className="fs-5 fw-bold">{data.titulo}</p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold text-muted small">Tipo</label>
                      <p>
                        <span className={`badge bg-${data.tipo === 'receita' ? 'success' : 'danger'}`}>
                          {data.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </p>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted small">Descrição</label>
                      <p className="text-muted small">{data.descricao || '—'}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Status</label>
                      <p>
                        <span className={`badge bg-${getStatusColor()}`}>
                          {estaAtrasado && data.status !== 'pago' ? 'Atrasado' : data.status}
                        </span>
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Prioridade</label>
                      <p>
                        {diasDiferenca < 0 && data.status !== 'pago' ? (
                          <span className="badge bg-danger">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            {Math.abs(diasDiferenca)} dias atrasado
                          </span>
                        ) : diasDiferenca <= 7 && diasDiferenca > 0 ? (
                          <span className="badge bg-warning text-dark">
                            <i className="bi bi-clock me-1"></i>
                            Vence em {diasDiferenca} dias
                          </span>
                        ) : (
                          <span className="badge bg-info">
                            <i className="bi bi-calendar-check me-1"></i>
                            {diasDiferenca > 0 ? `Vence em ${diasDiferenca} dias` : 'Vencido'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 2: Financeiro */}
            <div className="card mb-3">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-cash-coin me-2"></i>
                  Informações Financeiras
                </h6>
              </div>
              <div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Valor</label>
                      <p className="fs-5 fw-bold">
                        R$ {Number(data.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Valor Pago</label>
                      <p className={`fs-5 fw-bold ${Number(data.valor_pago) > 0 ? 'text-success' : 'text-muted'}`}>
                        R$ {Number(data.valor_pago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Data de Vencimento</label>
                      <p className="fw-bold">{data.data_vencimento}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Data de Pagamento</label>
                      <p className={Number(data.valor_pago) > 0 ? 'fw-bold text-success' : 'text-muted'}>
                        {data.data_pagamento || 'Ainda não pago'}
                      </p>
                    </div>
                    {data.dias_atraso !== undefined && data.dias_atraso > 0 && (
                      <div className="col-12">
                        <div className="alert alert-danger mb-0 py-2">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          <strong>{data.dias_atraso} dias de atraso</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 3: Vinculação Bancária */}
            <div className="card mb-3">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-bank me-2"></i>
                  Vinculação Bancária
                </h6>
              </div>
              <div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-bold text-muted small">Conta Bancária</label>
                      <p>{data.conta_bancaria_nome || '—'}</p>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-bold text-muted small">Confirmado no Extrato</label>
                      <p>
                        <span className={`badge bg-${data.confirmado_extrato ? 'success' : 'secondary'}`}>
                          {data.confirmado_extrato ? 'Confirmado' : 'Pendente'}
                        </span>
                      </p>
                    </div>
                    {data.confirmado_extrato && (
                      <div className="col-12">
                        <small className="text-muted">
                          <i className="bi bi-check-circle text-success me-1"></i>
                          Conciliado com extrato bancário
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 4: Origem e Relacionamentos */}
            <div className="card mb-3">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-diagram-2 me-2"></i>
                  Origem e Relacionamentos
                </h6>
              </div>
              <div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Tipo de Origem</label>
                      <p className="text-capitalize">
                        {data.origem_tipo ? (
                          <span className="badge bg-info">{data.origem_tipo}</span>
                        ) : (
                          '—'
                        )}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Talhão</label>
                      <p>{data.talhao_nome || '—'}</p>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted small">Origem - Descrição</label>
                      <p className="text-muted small">
                        {data.origem_descricao || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 5: Auditoria */}
            <div className="card">
              <div className="card-header bg-light">
                <h6 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Auditoria
                </h6>
              </div>
              <div>
                <div className="card-body small text-muted">
                  <p className="mb-1"><strong>Criado por:</strong> {data.criado_por_nome || '—'}</p>
                  <p className="mb-1"><strong>Criado em:</strong> {data.criado_em}</p>
                  <p className="mb-0"><strong>Atualizado em:</strong> {data.atualizado_em}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VencimentoDetailModal;
