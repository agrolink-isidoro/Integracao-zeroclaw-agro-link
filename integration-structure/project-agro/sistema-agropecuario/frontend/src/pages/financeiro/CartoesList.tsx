import React from 'react';
import { useApiQuery, useApiDelete } from '@/hooks/useApi';

const CartaoForm = React.lazy(() => import('@/components/financeiro/CartaoForm'));

const BANDEIRAS: Record<string, string> = {
  '01': 'Visa',
  '02': 'Mastercard',
  '03': 'Amex',
  '04': 'Sorocred',
  '05': 'Diners',
  '06': 'Elo',
  '07': 'Hipercard',
  '08': 'Aura',
  '09': 'Cabal',
  '99': 'Outros',
};

const CartoesList: React.FC = () => {
  const { data: cartoes = [], isLoading, isError, error } = useApiQuery<any[]>(['cartoes'], '/financeiro/cartoes/');

  const del = useApiDelete('/financeiro/cartoes/', [['cartoes']]);

  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);

  const formatCurrency = (val: number | string | null) => {
    if (val == null) return 'R$ 0,00';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Cartões de Crédito</h5>
        <div>
          <button className="btn btn-sm btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>Novo Cartão</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {isError ? (
            <div className="alert alert-danger">Erro ao carregar cartões: {(error as any)?.message || 'Erro desconhecido'}</div>
          ) : isLoading ? (
            <div>Carregando cartões...</div>
          ) : cartoes.length === 0 ? (
            <div className="text-muted">Nenhum cartão cadastrado.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm">
                <thead>
                  <tr>
                    <th>Bandeira</th>
                    <th>Últimos 4</th>
                    <th>Conta</th>
                    <th>Validade</th>
                    <th>Venc. Fatura</th>
                    <th>Saldo Devedor</th>
                    <th>Pend.</th>
                    <th>Ativo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cartoes.map((c: any) => (
                    <tr key={c.id}>
                      <td>
                        {c.bandeira || (c.bandeira_codigo ? BANDEIRAS[c.bandeira_codigo] || c.bandeira_codigo : '-')}
                      </td>
                      <td>{c.numero_last4 || '-'}</td>
                      <td>{c.conta_display || '-'}</td>
                      <td>{c.validade || '-'}</td>
                      <td>{c.dia_vencimento_fatura ? `Dia ${c.dia_vencimento_fatura}` : '-'}</td>
                      <td className={parseFloat(c.saldo_devedor || 0) > 0 ? 'text-danger fw-bold' : ''}>
                        {formatCurrency(c.saldo_devedor)}
                      </td>
                      <td>
                        {c.transacoes_pendentes > 0 && (
                          <span className="badge bg-warning text-dark">{c.transacoes_pendentes}</span>
                        )}
                      </td>
                      <td>{c.ativo ? 'Sim' : 'Não'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => { setEditing(c); setShowForm(true); }}>Editar</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={async () => { if (!confirm('Excluir cartão?')) return; try { await del.mutateAsync(c.id); } catch (e) { alert('Falha ao excluir'); } }}>Excluir</button>
                      </td>
                    </tr>
                  ))}
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
                <h5 className="modal-title">{editing ? 'Editar Cartão' : 'Novo Cartão'}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowForm(false)} />
              </div>
              <div className="modal-body">
                <React.Suspense fallback={<div>Carregando formulário...</div>}>
                  <CartaoForm initialData={editing} onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />
                </React.Suspense>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartoesList;
