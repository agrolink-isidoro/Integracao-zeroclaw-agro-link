import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/useApi';
import financeiroService from '@/services/financeiro';
import TransferForm from '@/components/financeiro/TransferForm';

const TransferenciasList: React.FC = () => {
  const qc = useQueryClient();
  const { data: transfers = [] as any[], isLoading } = useApiQuery<any[]>(['transferencias'], '/financeiro/transferencias/?status=pending');
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  
  // use financeiroService.marcarTransferenciaSettled to mark as settled

  const handleMarkSettled = async (id: number) => {
    const payload = { external_reference: '', taxa_bancaria: '0.00' };
    try {
      // call dedicated service (use financeiroService for clarity)
      await financeiroService.marcarTransferenciaSettled(id, payload);
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['financeiro','vencimentos'] });
      alert('Transferência marcada como liquidada');
    } catch (e) {
      alert('Erro marcando transferência: ' + (e as any)?.response?.data || e);
    }
  };

  if (isLoading) return <div>Carregando transferências...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Transferências Pendentes</h5>
        <div>
          <button className="btn btn-sm btn-primary me-2" onClick={() => setShowTransferModal(true)}>Nova Transferência</button>
        </div>
      </div>

      {transfers.length === 0 && <div className="alert alert-info">Nenhuma transferência pendente encontrada.</div>}
      {transfers.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Conta Origem</th>
                <th>Conta Destino</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.tipo_transferencia}</td>
                  <td>R$ {t.valor}</td>
                  <td>{t.conta_origem_display}</td>
                  <td>{t.conta_destino_display}</td>
                  <td>{t.descricao}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-success" onClick={() => handleMarkSettled(t.id)}>Marcar liquidado</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTransferModal && (
        <TransferForm onClose={() => setShowTransferModal(false)} onSaved={() => { setShowTransferModal(false); qc.invalidateQueries({ queryKey: ['transferencias'] }); qc.invalidateQueries({ queryKey: ['financeiro','vencimentos'] }); }} />
      )}
    </div>
  );
};

export default TransferenciasList;
