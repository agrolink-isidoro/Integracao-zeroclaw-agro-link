import React, { useState, useEffect } from 'react';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import Tooltip from '@/components/common/Tooltip';

const QuitarModal: React.FC<{ show: boolean; onClose: () => void; vencimentoId: number | null; onSuccess?: () => void }> = ({ show, onClose, vencimentoId, onSuccess }) => {
  const [valor, setValor] = useState<string>('');
  // normalize commas to dots on blur for convenience
  const normalizeAndSetValor = (v: string) => { setValor(v.replace(/,/g, '.')); };
  const [conta, setConta] = useState<number | ''>('');
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().slice(0,10));
  const [reconciliar, setReconciliar] = useState(false);
  const { data: contas = [], refetch } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) {
      setValor(''); setConta(''); setReconciliar(false);
      setDataPagamento(new Date().toISOString().slice(0,10));
    } else {
      // When modal opens, ensure we have the freshest list of contas (useful for tests that create conta via API)
      try { refetch(); } catch (err) { /* ignore */ }
    }
  }, [show, refetch]);

  if (!show || !vencimentoId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('[QuitarModal] submit', { vencimentoId, valor, conta, reconciliar });
    setSubmitting(true);
    try {
      const payload: any = {};
      if (valor) payload.valor_pago = Number(valor);
      if (conta) payload.conta_id = Number(conta);
      if (dataPagamento) payload.data_pagamento = dataPagamento;
      if (reconciliar) payload.reconciliar = true;
      await financeiroService.quitarVencimento(vencimentoId!, payload);
      onSuccess && onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao quitar vencimento: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Quitar Vencimento</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-3 p-md-4">
              <div className="mb-3">
                <label className="form-label" htmlFor="valor_pago">Valor pago (opcional)</label>
                <input id="valor_pago" className="form-control" type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} onBlur={(e) => normalizeAndSetValor(e.target.value)} />
                <div className="form-text">Deixe vazio para quitar o valor total.</div>
              </div>

              <div className="mb-3">
                <label className="form-label">Conta Bancária</label>
                <select className="form-select" value={String(conta)} onChange={(e) => setConta(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- selecione --</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.banco} - {c.conta}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Data de pagamento</label>
                <input className="form-control" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </div>

              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" checked={reconciliar} onChange={(e) => setReconciliar(e.target.checked)} id="reconciliar" />
                <label className="form-check-label" htmlFor="reconciliar">Reconciliar agora</label>
                <Tooltip ariaLabel="reconciliar-tooltip" text={"Marca o lançamento como reconciliado imediatamente (define reconciled = true e registra reconciled_at). Use quando o pagamento já consta no extrato bancário."} className="ms-2" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={onClose} disabled={submitting}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={!contas.length || submitting}>{submitting ? 'Processando...' : 'Quitar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuitarModal;
