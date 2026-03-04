import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { t } from '../../i18n';
import { useToast } from '../../hooks/useToast';

import type { Plantio } from '@/types/agricultura';

interface Props {
  plantioId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

type SessionItem = {
  talhao: number | string;
  nome: string;
  selected: boolean;
};

type FormState = {
  plantio?: number;
  data_inicio: string;
  data_prevista?: string;
  observacoes?: string;
  itens: SessionItem[];
};

const StartHarvestSessionModal: React.FC<Props> = ({ plantioId, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formState, setFormState] = useState<FormState>({
    plantio: plantioId || undefined,
    data_inicio: new Date().toISOString().split('T')[0],
    data_prevista: undefined,
    observacoes: undefined,
    itens: [],
  });

  const { data: plantios = [] } = useQuery<Plantio[]>({
    queryKey: ['plantios'],
    queryFn: async () => {
      const r = await api.get('/agricultura/plantios/');
      return r.data as Plantio[];
    }
  });



  type StartSessionPayload = {
    plantio?: number;
    data_inicio: string;
    data_prevista?: string;
    observacoes?: string;
    itens: Array<{ talhao: number | string }>;
  };

  const mutation = useMutation<void, unknown, StartSessionPayload>({
    mutationFn: async (payload: StartSessionPayload) => api.post('agricultura/harvest-sessions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
      toast.showSuccess('Sessão de colheita iniciada');
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: unknown } } | null;
      const data = e?.response?.data;
      let msg = 'Erro ao iniciar sessão';
      if (data) {
        if (typeof data === 'string') msg = data;
        else {
          const dataRecord = data as Record<string, unknown>;
          if ('detail' in dataRecord && typeof dataRecord.detail === 'string') {
            msg = dataRecord.detail as string;
          } else {
            // extract first field error
            const keys = Object.keys(dataRecord);
            if (keys.length > 0) {
              const firstKey = keys[0];
              const val = dataRecord[firstKey];
              if (Array.isArray(val)) msg = val.join('; ');
              else msg = String(val ?? firstKey);
            }
          }
        }
      }
      toast.showError(msg);
    }
  });

  const [formError, setFormError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only include selected talhões as itens; quantities are not required at session start
    const itensPayload = (formState.itens || []).filter((it: SessionItem) => it.selected).map((it: SessionItem) => ({ talhao: it.talhao }));

    if (itensPayload.length === 0) {
      const errMsg = 'Selecione ao menos um talhão para iniciar a sessão';
      setFormError(errMsg);
      toast.showError(errMsg);
      return;
    }

    setFormError(null);
    const payload = {
      plantio: formState.plantio,
      data_inicio: formState.data_inicio,
      data_prevista: formState.data_prevista,
      observacoes: formState.observacoes,
      itens: itensPayload
    };
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header">
        <h5 className="modal-title">Iniciar Sessão de Colheita</h5>
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>
      <div className="modal-body p-3 p-md-4">
        <div className="mb-3">
          <label htmlFor="plantio" className="form-label">Safra (Plantio)</label>
          <select id="plantio" className="form-select" value={formState.plantio || ''} onChange={(e) => {
              const plantioVal = Number(e.target.value) || undefined;
              if (!plantioVal) {
                setFormState((s: FormState) => ({ ...s, plantio: undefined, itens: [] }));
                return;
              }

              const selected = plantios.find((p: Plantio) => p.id === plantioVal);
              if (!selected) {
                setFormState((s: FormState) => ({ ...s, plantio: plantioVal, itens: [] }));
                return;
              }

              type TalhaoSource = { id?: number; nome?: string; name?: string } | number;
              const talhoesList: TalhaoSource[] = (selected.talhoes_info && selected.talhoes_info.length > 0)
                ? selected.talhoes_info as TalhaoSource[]
                : (Array.isArray(selected.talhoes) ? selected.talhoes.map((id: number) => id as TalhaoSource) : []);

              const itens: SessionItem[] = talhoesList.map((t: TalhaoSource) => {
                if (typeof t === 'object') {
                  const src = t as { id?: number; nome?: string; name?: string };
                  return {
                    talhao: src.id ?? 'unknown',
                    nome: src.nome ?? src.name ?? `Talhão ${src.id ?? '?'}`,
                    selected: false
                  } as SessionItem;
                }
                return {
                  talhao: t,
                  nome: `Talhão ${t}`,
                  selected: false
                } as SessionItem;
              });

              setFormState((s: FormState) => ({ ...s, plantio: plantioVal, itens }));
            }}>
            <option value="">Selecione a safra</option>
            {plantios.map((p: Plantio) => (
              <option key={p.id} value={p.id}>{p.nome_safra || p.cultura_nome || `Safra ${p.cultura}`}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label htmlFor="data_inicio" className="form-label">Data de Início</label>
          <input id="data_inicio" type="date" className="form-control" value={formState.data_inicio} onChange={(e) => setFormState((s: FormState) => ({ ...s, data_inicio: e.target.value }))} />
        </div>

        {formState.itens && formState.itens.length > 0 && (
          <div className="mb-3">
            <label htmlFor="talhoes" className="form-label">
              {t('startSession.selectTalhoesLabel')} — <small className="text-muted">{t('startSession.selectTalhoesNote')}</small>
              <span aria-label="startsession-tooltip" title={t('startSession.tooltip')} className="ms-2 text-info" style={{ cursor: 'help' }}>ℹ️</span>
            </label>
            <div className="form-text small text-muted mb-2">{t('startSession.helperText')}</div>
            <div className="border rounded p-2">
              {formState.itens.map((it: SessionItem) => (
                <div key={it.talhao} className="d-flex align-items-center gap-3 mb-2">
                  <div className="form-check">
                    <input aria-label={`selecionar-session-talhao-${it.talhao}`} className="form-check-input" type="checkbox" id={`session-talhao-${it.talhao}`} checked={!!it.selected} onChange={(e) => {
                      setFormState((s: FormState) => ({ ...s, itens: s.itens.map((x: SessionItem) => x.talhao === it.talhao ? { ...x, selected: e.target.checked } : x) }));
                    }} />
                    <label className="form-check-label" htmlFor={`session-talhao-${it.talhao}`}>
                      <strong>{it.nome}</strong>
                      <div className="text-muted small">ID: {it.talhao}</div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Observações</label>
          <textarea className="form-control" rows={3} value={formState.observacoes || ''} onChange={(e) => setFormState((s: FormState) => ({ ...s, observacoes: e.target.value }))} />
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={Boolean((mutation as any).isLoading)}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={Boolean((mutation as any).isLoading)} aria-disabled={Boolean((mutation as any).isLoading)}>{(mutation as any).isLoading ? 'Enviando...' : 'Iniciar Sessão'}</button>
      </div>
      {formError && <div className="p-3"><div className="alert alert-danger" role="alert">{formError}</div></div>}
    </form>
  );
};

export default StartHarvestSessionModal;
