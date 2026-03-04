import React from 'react';
import { useApiQuery, useApiDelete } from '@/hooks/useApi';

const ContaFormLazy = React.lazy(() => import('@/components/financeiro/ContaForm'));
const ContaDetalhesModalLazy = React.lazy(() => import('@/components/financeiro/ContaDetalhesModal'));

const ContasBancariasList: React.FC = () => {
  const { data: contas = [], isLoading, isError, error, refetch } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
  const del = useApiDelete('/financeiro/contas/', [['contas-bancarias']]);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [detalhesContaId, setDetalhesContaId] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<any | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    function handler(e: any) {
      setDetalhesContaId(e.detail?.contaId || null);
    }
    window.addEventListener('open-conta-detalhes', handler as any);
    return () => window.removeEventListener('open-conta-detalhes', handler as any);
  }, []);

  const openDeleteConfirm = (conta: any) => {
    console.log('[ContasBancariasList] openDeleteConfirm chamado para conta:', conta.id);
    setConfirmDelete(conta);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    console.log('[ContasBancariasList] Iniciando exclusão da conta:', confirmDelete.id);
    setIsDeleting(true);
    try {
      console.log('[ContasBancariasList] Chamando mutateAsync para ID:', confirmDelete.id);
      await del.mutateAsync(confirmDelete.id);
      console.log('[ContasBancariasList] Delete finalizado, refetching lista...');
      // Aguarda o refetch completar antes de fechar a modal
      await refetch();
      console.log('[ContasBancariasList] Refetch completo, fechando modal');
      setConfirmDelete(null);
    } catch (e) {
      console.error('[ContasBancariasList] Erro ao excluir conta:', e);
      alert('Falha ao excluir conta. Verifique se existem transferências associadas.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Contas Bancárias</h5>
        <div>
          <button className="btn btn-sm btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>Nova Conta</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isError ? (
            <div className="alert alert-danger">Erro ao carregar contas: {(error as any)?.message || 'Erro desconhecido'}</div>
          ) : isLoading ? (
            <div>Carregando contas...</div>
          ) : contas.length === 0 ? (
            <div className="text-muted">Nenhuma conta encontrada.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm">
                <thead>
                  <tr>
                    <th>Banco</th>
                    <th>Agência</th>
                    <th>Conta</th>
                    <th>Saldo</th>
                    <th>Descrição</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.banco}</td>
                      <td>{c.agencia}</td>
                      <td>{c.conta}</td>
                      <td>{c.current_balance !== undefined ? (Number(c.current_balance || 0)).toFixed(2) : '-'}</td>
                      <td>{c.descricao || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => { setEditing(c); setShowForm(true); }}>Editar</button>
                        <button className="btn btn-sm btn-outline-info me-2" onClick={() => { setShowForm(false); window.dispatchEvent(new CustomEvent('open-conta-detalhes', { detail: { contaId: c.id } })); }}>Detalhes</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => openDeleteConfirm(c)}>Excluir</button>
                      </td>
                    </tr>
                  ))}

                  {/* Total row */}
                  <tr>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td className="text-end"><strong>{(contas.reduce((s: number, c: any) => s + (Number(c.current_balance || 0)), 0)).toFixed(2)}</strong></td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Editar Conta' : 'Nova Conta'}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowForm(false)} />
              </div>
              <div className="modal-body">
                <React.Suspense fallback={<div>Carregando formulário...</div>}>
                  <ContaFormLazy initialData={editing} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />
                </React.Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content border-danger">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Confirmar Exclusão de Conta
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    aria-label="Close" 
                    onClick={() => setConfirmDelete(null)}
                    disabled={isDeleting}
                  />
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning mb-3">
                    <i className="bi bi-exclamation-circle me-2"></i>
                    <strong>Atenção: Esta ação não pode ser desfeita!</strong>
                  </div>
                  
                  <h6 className="mb-3">Dados da Conta</h6>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <small className="text-muted">Banco</small>
                      <p className="fw-bold">{confirmDelete.banco}</p>
                    </div>
                    <div className="col-md-6">
                      <small className="text-muted">Conta</small>
                      <p className="fw-bold">{confirmDelete.conta}</p>
                    </div>
                  </div>
                  
                  {confirmDelete.agencia && (
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <small className="text-muted">Agência</small>
                        <p className="fw-bold">{confirmDelete.agencia}</p>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted">Saldo Atual</small>
                        <p className="fw-bold text-success">
                          R$ {(Number(confirmDelete.current_balance || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="alert alert-danger mt-4 mb-0">
                    <h6 className="mb-2">
                      <i className="bi bi-trash-fill me-2"></i>
                      Consequências da Exclusão:
                    </h6>
                    <ul className="mb-0 ps-3">
                      <li>A conta <strong>{confirmDelete.banco} - {confirmDelete.conta}</strong> será <strong>permanentemente deletada</strong></li>
                      <li>Todas as <strong>transferências</strong> vinculadas a esta conta serão <strong>removidas</strong></li>
                      <li>Os <strong>lançamentos financeiros</strong> (débitos/créditos) da conta serão <strong>preservados</strong></li>
                      <li>Esta ação <strong>não pode ser desfeita</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setConfirmDelete(null)}
                    disabled={isDeleting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Deletando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash-fill me-2"></i>
                        Sim, Deletar Conta
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Conta detalhes modal */}
      {detalhesContaId && (
        <React.Suspense fallback={<div>Carregando...</div>}>
          <ContaDetalhesModalLazy contaId={detalhesContaId} onClose={() => setDetalhesContaId(null)} />
        </React.Suspense>
      )}
    </div>
  );
};

export default ContasBancariasList;
