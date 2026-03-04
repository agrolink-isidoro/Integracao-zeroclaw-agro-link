import React from 'react';
import { useApiQuery } from '@/hooks/useApi';
import api from '@/services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { getStoredTokens } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface RateioInfo {
  id: number;
  titulo?: string;
  descricao?: string;
  valor_total?: number | string;
  destino?: string;
  data_rateio?: string;
}

interface Approval {
  id: number;
  rateio: RateioInfo | null;
  status: string;
  criado_em: string;
  criado_por_nome?: string;
}

const PendingRateios: React.FC = () => {
  // only fetch pending approvals to keep list in sync with actions
  const { data: approvals = [], isLoading, error, refetch } = useApiQuery<Approval[]>(['rateios-approvals'], '/financeiro/rateios-approvals/?status=pending');
  // permissions for current user
  const { data: permissions } = useApiQuery<{ can_approve: boolean; can_reject: boolean }>(['rateios-approvals','permissions'], '/financeiro/rateios-approvals/permissions/');
  const queryClient = useQueryClient();
  const { refreshToken } = useAuthContext();

  const ensureAuth = async () => {
    const tokens = getStoredTokens();
    if (tokens?.access) return true;
    try {
      const refreshed = await refreshToken();
      return !!refreshed;
    } catch (e) {
      return false;
    }
  };

  const { showError, showSuccess } = useToast();

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const ok = await ensureAuth();
      if (!ok) {
        showError('Sua sessão expirou. Faça login novamente.');
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('No auth token');
      }
      await api.post(`/financeiro/rateios-approvals/${id}/approve/`);
    },
    onSuccess: (_, variables) => {
      // Immediately remove the approved item from cached pending approvals
      queryClient.setQueryData<Approval[] | undefined>(['rateios-approvals'], (old = []) => old.filter(a => a.id !== variables));
      // Refresh related lists (vencimentos/despesas) so UI reflects changes
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
      showSuccess('Rateio aprovado com sucesso');
    },

    onError: (err: any) => {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Erro ao aprovar';
      if (status === 403) {
        showError('Você não tem permissão para aprovar este rateio. Contate o administrador.');
      } else {
        showError(`Erro ao aprovar: ${detail}`);
      }
      console.error('Erro ao aprovar rateio:', err);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const ok = await ensureAuth();
      if (!ok) {
        showError('Sua sessão expirou. Faça login novamente.');
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('No auth token');
      }
      await api.post(`/financeiro/rateios-approvals/${id}/reject/`);
    },
    onSuccess: (_, variables) => {
      // remove rejected item from pending approvals cache immediately
      queryClient.setQueryData<Approval[] | undefined>(['rateios-approvals'], (old = []) => old.filter(a => a.id !== variables));
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      showSuccess('Rateio rejeitado');
    },

    onError: (err: any) => {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Erro ao rejeitar';
      if (status === 403) {
        showError('Você não tem permissão para rejeitar este rateio. Contate o administrador.');
      } else {
        showError(`Erro ao rejeitar: ${detail}`);
      }
      console.error('Erro ao rejeitar rateio:', err);
    }
  });

  return (
    <div>
      {isLoading && <div>Carregando...</div>}
      {error && (
        <div className="text-danger">
          <div><strong>Erro ao carregar aprovações</strong></div>
          {(error as any)?.response?.status && (
            <div className="mt-1"><small>
              Status: {(error as any).response.status} — {(error as any).response.data?.detail ?? JSON.stringify((error as any).response.data)}
            </small></div>
          )}
        </div>
      )}
      {approvals.length === 0 && !isLoading && <div className="text-muted">Nenhuma aprovação pendente.</div>}

      {approvals.length > 0 && (
        <ul className="list-group">
          {approvals.map(a => {
            const valorFmt = a.rateio?.valor_total
              ? Number(a.rateio.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : null;
            const dataFmt = a.rateio?.data_rateio
              ? new Date(a.rateio.data_rateio + 'T00:00:00').toLocaleDateString('pt-BR')
              : null;
            const isBusy = approveMutation.isPending || rejectMutation.isPending;
            return (
              <li key={a.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="me-3 flex-grow-1">
                    <div className="fw-bold">
                      #{a.rateio?.id ?? a.id}{a.rateio?.titulo ? ` — ${a.rateio.titulo}` : ''}
                    </div>
                    <div className="mt-1">
                      {valorFmt && <span className="badge bg-primary me-2">{valorFmt}</span>}
                      {a.rateio?.destino && <span className="badge bg-secondary me-2">{a.rateio.destino}</span>}
                      {dataFmt && <small className="text-muted me-2">Data: {dataFmt}</small>}
                    </div>
                    <small className="text-muted">Solicitado por {a.criado_por_nome || 'usuário'} em {new Date(a.criado_em).toLocaleString('pt-BR')}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    {permissions === undefined ? (
                      <button className="btn btn-sm btn-outline-secondary" disabled>Carregando...</button>
                    ) : permissions?.can_approve === false ? (
                      <button className="btn btn-sm btn-secondary" title="Você não tem permissão para aprovar" disabled>
                        Sem permissão
                      </button>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => approveMutation.mutate(a.id)} disabled={isBusy}>Aprovar</button>
                        <button className="btn btn-sm btn-danger" onClick={() => rejectMutation.mutate(a.id)} disabled={isBusy}>Rejeitar</button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => refetch()}>Atualizar</button>
      </div>
    </div>
  );
};

export default PendingRateios;
