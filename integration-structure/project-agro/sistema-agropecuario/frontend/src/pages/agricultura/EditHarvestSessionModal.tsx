import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface HarvestSession {
  id: number;
  plantio?: number;
  data_inicio?: string;
  observacoes?: string;
  itens?: Array<{ talhao: number }>;
}

interface Props {
  session: HarvestSession;
  onClose: () => void;
  onSuccess: () => void;
}

type EditItem = { talhao: number | string; selected: boolean };

interface EditSessionFormState {
  _session_id?: number;
  plantio?: number;
  data_inicio?: string;
  observacoes?: string;
  itens: EditItem[];
}

const makeInitialState = (s: HarvestSession): EditSessionFormState => ({
  _session_id: s.id,
  plantio: s.plantio,
  data_inicio: s.data_inicio,
  observacoes: s.observacoes,
  itens: (s.itens || []).map(i => ({ talhao: i.talhao, selected: true }))
});

const EditHarvestSessionModal: React.FC<Props> = ({ session, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formState, setFormState] = useState<EditSessionFormState>(() => makeInitialState(session));



  const mutation = useMutation<void, unknown, { plantio?: number; data_inicio?: string; observacoes?: string; itens: Array<{ talhao: number | string }> }>({
    mutationFn: async (payload) => api.patch(`agricultura/harvest-sessions/${session.id}/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
      toast.showSuccess('Sessão atualizada');
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } } | null;
      const msg = e?.response?.data?.detail || 'Erro ao atualizar';
      toast.showError(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itensPayload = (formState.itens || []).filter((it: EditItem) => it.selected).map((it: EditItem) => ({ talhao: it.talhao }));
    if (itensPayload.length === 0) {
      toast.showError('Selecione ao menos um talhão');
      return;
    }
    mutation.mutate({ plantio: formState.plantio, data_inicio: formState.data_inicio, observacoes: formState.observacoes, itens: itensPayload });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header">
        <h5 className="modal-title">Editar Sessão de Colheita</h5>
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>
      <div className="modal-body p-3 p-md-4">
        <div className="mb-3">
          <label className="form-label">Data de Início</label>
          <input type="date" className="form-control" value={formState.data_inicio} onChange={(e) => setFormState((s: EditSessionFormState) => ({ ...s, data_inicio: e.target.value }))} />
        </div>
        <div className="mb-3">
          <label className="form-label">Observações</label>
          <textarea className="form-control" rows={3} value={formState.observacoes || ''} onChange={(e) => setFormState((s: EditSessionFormState) => ({ ...s, observacoes: e.target.value }))} />
        </div>
        <div className="mb-3">
          <label className="form-label">Talhões</label>
          <div className="border rounded p-2">
            {formState.itens && formState.itens.map((it: EditItem) => (
              <div key={it.talhao} className="form-check mb-2">
                <input type="checkbox" className="form-check-input" id={`edit-talhao-${it.talhao}`} checked={!!it.selected} onChange={(e) => setFormState((s: EditSessionFormState) => ({ ...s, itens: s.itens.map((x: EditItem) => x.talhao === it.talhao ? { ...x, selected: e.target.checked } : x) }))} />
                <label className="form-check-label" htmlFor={`edit-talhao-${it.talhao}`}>Talhão {it.talhao}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar</button>
      </div>
    </form>
  );
};

export default EditHarvestSessionModal;
