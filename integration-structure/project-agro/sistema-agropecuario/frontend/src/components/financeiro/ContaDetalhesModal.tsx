import React, { useEffect, useState } from 'react';
import useApi from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ContaDetalhesModal: React.FC<{ contaId: number | null; onClose: () => void }> = ({ contaId, onClose }) => {
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    if (!contaId) return;
    setLoading(true);
    (async () => {
      try {
        const resp = await api.client.get(`/financeiro/contas/${contaId}/extrato/`);
        setData(resp.data);
      } catch (e: any) {
        console.error('Erro carregar detalhes conta', e);
        alert('Falha ao carregar detalhes da conta');
      } finally {
        setLoading(false);
      }
    })();
  }, [contaId]);

  if (!contaId) return null;
  if (loading) return <div className="modal d-block" tabIndex={-1}><div className="modal-dialog"><div className="modal-content"><div className="modal-body"><LoadingSpinner /></div></div></div></div>;
  if (!data) return null;

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-xl" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Detalhes da Conta</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-md-4">
                <div className="card p-3">
                  <h6 className="mb-1">Saldo Atual</h6>
                  <h4>R$ {Number(data.saldo).toFixed(2)}</h4>
                </div>
              </div>
              <div className="col-md-8">
                <div className="card p-3">
                  <h6 className="mb-1">Resumo</h6>
                  <div>Transações importadas: {data.bank_transactions.length}</div>
                  <div>Lançamentos internos: {data.lancamentos.length}</div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">Extrato Interno</div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead>
                          <tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Descrição</th><th>Reconc.</th></tr>
                        </thead>
                        <tbody>
                          {data.lancamentos.map((l: any) => (
                            <tr key={l.id} className={l.reconciled ? 'table-success' : ''}>
                              <td>{l.data}</td>
                              <td>{l.tipo}</td>
                              <td>R$ {Number(l.valor).toFixed(2)}</td>
                              <td>{l.descricao || '-'}</td>
                              <td>{l.reconciled ? 'Sim' : 'Não'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header">Extrato Importado</div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead>
                          <tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Balance</th></tr>
                        </thead>
                        <tbody>
                          {data.bank_transactions.map((t: any) => (
                            <tr key={t.id}>
                              <td>{t.date}</td>
                              <td>{t.description || '-'}</td>
                              <td>R$ {Number(t.amount).toFixed(2)}</td>
                              <td>{t.balance !== null ? `R$ ${Number(t.balance).toFixed(2)}` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContaDetalhesModal;
