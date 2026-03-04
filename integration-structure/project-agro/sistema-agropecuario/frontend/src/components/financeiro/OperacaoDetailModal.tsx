import type { FC } from 'react';
import type { Emprestimo, Financiamento } from '@/types/financeiro';

interface Props {
  data: Emprestimo | Financiamento | null;
  show: boolean;
  onClose: () => void;
  tipo: 'emprestimo' | 'financiamento';
}

const OperacaoDetailModal: FC<Props> = ({ data, show, onClose, tipo }: Props) => {
  if (!show || !data) {
    console.log('[OperacaoDetailModal] Not showing - show:', show, 'data:', data);
    return null;
  }

  console.log('[OperacaoDetailModal] Data received:', data, 'Tipo:', tipo);

  // Type guards and fallbacks
  const isEmprestimo = tipo === 'emprestimo';
  const da = data as any; // Type any to allow property access
  
  const beneficiario = isEmprestimo 
    ? da.cliente_nome || da.cliente?.nome || 'N/A' 
    : da.instituicao_nome || da.instituicao_financeira?.nome || 'N/A';
  
  const parcelas = (da.parcelas || []) as any[];
  const itens_produtos = isEmprestimo ? (da.itens_produtos || []) : [];
  const titulo = da.titulo || 'Sem título';
  const descricao = da.descricao || '—';
  const status = da.status || 'N/A';
  const valor = isEmprestimo ? (da.valor_emprestimo ?? 0) : (da.valor_total ?? 0);
  const valor_entrada = da.valor_entrada ?? 0;
  const valor_pendente = da.valor_pendente ?? 0;
  const taxa_juros = da.taxa_juros ?? 0;
  const frequencia_taxa = da.frequencia_taxa || 'mensal';
  const metodo_calculo = da.metodo_calculo || 'price';
  const numero_parcelas = da.numero_parcelas ?? 0;
  const prazo_meses = da.prazo_meses ?? 0;
  const carencia_meses = da.carencia_meses ?? 0;
  const juros_embutidos = da.juros_embutidos || false;
  const data_contratacao = da.data_contratacao || '—';
  const data_primeiro_vencimento = da.data_primeiro_vencimento || '—';
  const numero_contrato = isEmprestimo ? '—' : (da.numero_contrato || '—');
  const criado_por_nome = da.criado_por_nome || '—';
  const criado_em = da.criado_em || '—';
  const atualizado_em = da.atualizado_em || '—';
  const talhao_nome = da.talhao_nome || '—';
  const garantias = isEmprestimo ? '—' : (da.garantias || '—');
  const taxa_multa = isEmprestimo ? '—' : (da.taxa_multa ?? '—');
  const taxa_mora = isEmprestimo ? '—' : (da.taxa_mora ?? '—');
  const observacoes = isEmprestimo ? '—' : (da.observacoes || '—');
  const contrato_arquivo = isEmprestimo ? null : (da.contrato_arquivo || null);

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-file-earmark-text me-2"></i>
              Detalhes da {isEmprestimo ? 'Empréstimo' : 'Financiamento'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Sessão 1: Informações Gerais */}
            <div className="card mb-3">
              <div 
                className="card-header bg-light" 
                style={{ cursor: 'pointer' }}
              >
                <h6 className="mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Informações Gerais
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Título</label>
                    <p className="fw-bold">{titulo}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Tipo</label>
                    <p>
                      <span className="badge bg-info">{isEmprestimo ? 'Empréstimo' : 'Financiamento'}</span>
                    </p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Status</label>
                    <p>
                      <span className={`badge bg-${status === 'ativo' ? 'success' : status === 'quitado' ? 'primary' : 'danger'}`}>
                        {status}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-8">
                    <label className="form-label fw-bold text-muted small">Descrição</label>
                    <p className="text-muted small">{descricao}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Data de Contratação</label>
                    <p>{data_contratacao}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Número do Contrato</label>
                    <p>{numero_contrato}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 2: Valores Financeiros */}
            <div className="card mb-3">
              <div 
                className="card-header bg-light" 
                style={{ cursor: 'pointer' }}
              >
                <h6 className="mb-0">
                  <i className="bi bi-cash-coin me-2"></i>
                  Valores Financeiros
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">
                      {isEmprestimo ? 'Valor do Empréstimo' : 'Valor Total'}
                    </label>
                    <p className="fs-5 fw-bold">
                      R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Valor Pendente</label>
                    <p className="fs-5 fw-bold text-danger">
                      R$ {Number(valor_pendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Valor de Entrada</label>
                    <p>R$ {Number(valor_entrada).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Taxa de Juros</label>
                    <p>{Number(taxa_juros).toFixed(2)}% ({frequencia_taxa})</p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Método de Cálculo</label>
                    <p className="text-capitalize">{metodo_calculo}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 3: Prazos e Carência */}
            <div className="card mb-3">
              <div 
                className="card-header bg-light" 
                style={{ cursor: 'pointer' }}
              >
                <h6 className="mb-0">
                  <i className="bi bi-calendar me-2"></i>
                  Prazos e Carência
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Número de Parcelas</label>
                    <p>{numero_parcelas}</p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Prazo Total (meses)</label>
                    <p>{prazo_meses}</p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Carência (meses)</label>
                    <p>{carencia_meses}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Primeiro Vencimento</label>
                    <p>{data_primeiro_vencimento}</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Juros Embutidos na Carência</label>
                    <p>
                      <span className={`badge bg-${juros_embutidos ? 'success' : 'secondary'}`}>
                        {juros_embutidos ? 'Sim' : 'Não'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessão 4: Beneficiário e Relacionamentos */}
            <div className="card mb-3">
              <div 
                className="card-header bg-light" 
                style={{ cursor: 'pointer' }}
              >
                <h6 className="mb-0">
                  <i className="bi bi-person me-2"></i>
                  Beneficiário e Relacionamentos
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-bold text-muted small">Beneficiário</label>
                    <p>{beneficiario}</p>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold text-muted small">Talhão</label>
                    <p>{talhao_nome}</p>
                  </div>
                  {itens_produtos && itens_produtos.length > 0 && (
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted small">Produtos Vinculados</label>
                      <div className="small">
                        <ul className="list-unstyled">
                          {itens_produtos.map((item: any) => (
                            <li key={item.id} className="py-1 border-bottom">
                              <strong>{item.produto_nome}</strong> - {item.quantidade} {item.unidade} × R$ {Number(item.valor_unitario).toFixed(2)} 
                              = <span className="fw-bold">R$ {Number(item.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sessão 5: Adicionais e Controle */}
            {!isEmprestimo && (
              <div className="card mb-3">
                <div 
                  className="card-header bg-light" 
                  style={{ cursor: 'pointer' }}
                >
                  <h6 className="mb-0">
                    <i className="bi bi-list-check me-2"></i>
                    Adicionais e Garantias
                  </h6>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted small">Garantias</label>
                      <p className="text-muted small">{garantias}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Taxa de Multa (%)</label>
                      <p>{taxa_multa}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold text-muted small">Taxa de Mora (%)</label>
                      <p>{taxa_mora}</p>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold text-muted small">Observações</label>
                      <p className="text-muted small">{observacoes}</p>
                    </div>
                    {contrato_arquivo && (
                      <div className="col-12">
                        <label className="form-label fw-bold text-muted small">Arquivo de Contrato</label>
                        <p>
                          <a href={contrato_arquivo} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                            <i className="bi bi-download me-1"></i>Download
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sessão 6: Parcelas */}
            <div className="card mb-3">
              <div 
                className="card-header bg-light" 
                style={{ cursor: 'pointer' }}
              >
                <h6 className="mb-0">
                  <i className="bi bi-receipt me-2"></i>
                  Parcelas ({parcelas?.length || 0})
                </h6>
              </div>
              <div className="card-body">
                {parcelas && parcelas.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Data Vencimento</th>
                          <th className="text-end">Valor Parcela</th>
                          <th className="text-end">Juros</th>
                          <th className="text-end">Amortização</th>
                          <th className="text-end">Saldo Devedor</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parcelas.map((p: any, idx: number) => (
                          <tr key={p.id}>
                            <td className="fw-bold">{p.numero_parcela || idx + 1}</td>
                            <td className="small">{p.data_vencimento}</td>
                            <td className="text-end">R$ {Number(p.valor_parcela).toFixed(2)}</td>
                            <td className="text-end">R$ {Number(p.juros || 0).toFixed(2)}</td>
                            <td className="text-end">R$ {Number(p.amortizacao || 0).toFixed(2)}</td>
                            <td className="text-end fw-bold">R$ {Number(p.saldo_devedor || 0).toFixed(2)}</td>
                            <td>
                              <span className={`badge bg-${p.status === 'pago' ? 'success' : p.status === 'atrasado' ? 'danger' : 'warning text-dark'}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">Nenhuma parcela cadastrada</p>
                )}
              </div>
            </div>

            {/* Auditoria */}
            <div className="card">
              <div 
                className="card-header bg-light" 
                style={{ cursor: 'pointer' }}
              >
                <h6 className="mb-0">
                  <i className="bi bi-clock-history me-2"></i>
                  Auditoria
                </h6>
              </div>
              <div className="card-body small text-muted">
                <p className="mb-1"><strong>Criado por:</strong> {criado_por_nome}</p>
                <p className="mb-1"><strong>Criado em:</strong> {criado_em}</p>
                <p className="mb-0"><strong>Atualizado em:</strong> {atualizado_em}</p>
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

export default OperacaoDetailModal;
