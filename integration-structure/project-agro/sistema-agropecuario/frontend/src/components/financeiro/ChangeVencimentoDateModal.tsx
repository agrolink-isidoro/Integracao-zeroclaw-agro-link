import React, { useState } from 'react';
import financeiroService from '@/services/financeiro';

const ChangeVencimentoDateModal: React.FC<{ show: boolean; id: number | null; onClose: () => void; onSaved?: () => void }> = ({ show, id, onClose, onSaved }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

  if (!show || !id) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await financeiroService.updateVencimento(id, { data_vencimento: date });
      onSaved && onSaved();
      onClose();
    } catch (e: any) {
      console.error('Erro ao alterar data de vencimento', e);
      alert('Falha ao alterar data: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Alterar Data de Vencimento</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body p-3 p-md-4">
            <div className="mb-3">
              <label className="form-label">Nova data</label>
              <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeVencimentoDateModal;
