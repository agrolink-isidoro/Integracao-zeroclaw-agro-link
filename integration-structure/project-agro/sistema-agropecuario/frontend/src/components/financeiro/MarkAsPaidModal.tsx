import React, { useState } from 'react';
import financeiroService from '@/services/financeiro';
import Tooltip from '@/components/common/Tooltip';

const MarkAsPaidModal: React.FC<{ show: boolean; id: number | null; valorDefault?: number; onClose: () => void; onSuccess?: () => void }> = ({ show, id, valorDefault = 0, onClose, onSuccess }) => {
  const [dataPagamento, setDataPagamento] = useState<string>(new Date().toISOString().slice(0, 10));
  const [valorPago, setValorPago] = useState<string>(valorDefault != null ? String(valorDefault) : '0.00');
  const normalizeAndSetValorPago = (v: string) => { setValorPago(v.replace(/,/g, '.')); };
  const [reconciliar, setReconciliar] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!show || !id) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const payload: any = { data_pagamento: dataPagamento, valor_pago: Number(String(valorPago).replace(',', '.')) };
      if (reconciliar) payload.reconciliar = true;
      await financeiroService.quitarVencimento(id!, payload);
      onSuccess && onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Erro ao marcar como pago', e);
      alert('Falha ao marcar como pago: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Marcar como pago</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body p-3 p-md-4">
            <div className="mb-3">
              <label className="form-label">Data de pagamento</label>
              <input type="date" className="form-control" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Valor pago</label>
              <input className="form-control" value={valorPago} onChange={(e) => setValorPago(e.target.value)} onBlur={(e) => normalizeAndSetValorPago(e.target.value)} />
              <div className="form-text">Use ponto (.) como separador decimal (ex: 123.45)</div>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" checked={reconciliar} onChange={(e) => setReconciliar(e.target.checked)} id="mark-reconciliar" />
              <label className="form-check-label" htmlFor="mark-reconciliar">Reconciliar agora</label>
              <Tooltip ariaLabel="reconciliar-tooltip" text={"Marca o lançamento como reconciliado imediatamente (define reconciled = true e registra reconciled_at). Use quando o pagamento já consta no extrato bancário."} className="ms-2" />
              <div className="form-text">Marcar o lançamento como reconciliado imediatamente (vinculado a extrato bancário)</div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>{loading ? 'Processando...' : 'Confirmar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkAsPaidModal;
