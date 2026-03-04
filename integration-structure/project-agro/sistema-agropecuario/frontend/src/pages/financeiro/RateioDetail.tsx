import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import { useAuthContext } from '@/contexts/AuthContext';
import { useApiQuery } from '@/hooks/useApi';
import { getStoredTokens } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { RateioCusto, RateioApproval } from '@/types/financeiro';

const RateioDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rateioId = Number(id || 0);

  const { data: rateio, isLoading, error } = useQuery<RateioCusto>({
    queryKey: ['financeiro', 'rateio', rateioId],
    queryFn: () => financeiroService.getRateioById(rateioId),
    enabled: !!rateioId,
  });

  const { data: approvals } = useQuery<RateioApproval[]>({
    queryKey: ['financeiro', 'rateio-approvals'],
    queryFn: () => financeiroService.getRateioApprovals(),
    enabled: !!rateioId,
  });

  // permissions for current user
  const { data: permissions } = useApiQuery<{ can_approve: boolean; can_reject: boolean }>(['rateios-approvals','permissions'], '/financeiro/rateios-approvals/permissions/');

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

  const handleApprove = async (approvalId: number) => {
    try {
      const ok = await ensureAuth();
      if (!ok) {
        alert('Sua sessão expirou. Faça login novamente.');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }

      await financeiroService.approveRateio(approvalId);
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio', rateioId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
      // Also refresh despesas list so any linked Despesa reflects updated pendente_rateio
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    } catch (e) {
      console.error('Erro ao aprovar rateio', e);
      alert('Erro ao aprovar rateio');
    }
  };

  const handleReject = async (approvalId: number) => {
    try {
      const ok = await ensureAuth();
      if (!ok) {
        alert('Sua sessão expirou. Faça login novamente.');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }

      await financeiroService.rejectRateio(approvalId);
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio', rateioId] });
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateio-approvals'] });
    } catch (e) {
      console.error('Erro ao rejeitar rateio', e);
      alert('Erro ao rejeitar rateio');
    }
  };

  const handleGerarVencimento = async () => {
    if (!rateio) return;
    try {
      const ok = await ensureAuth();
      if (!ok) {
        alert('Sua sessão expirou. Faça login novamente.');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return;
      }

      const vencimento = await financeiroService.gerarVencimentoFromRateio(rateio.id);
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
      alert(`Vencimento criado com sucesso! ID: ${vencimento.id}, Valor: R$ ${vencimento.valor}`);
      navigate('/financeiro/vencimentos');
    } catch (e: any) {
      console.error('Erro ao gerar vencimento', e);
      const msg = e?.response?.data?.error || 'Erro ao gerar vencimento';
      alert(msg);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Erro ao carregar rateio</div>;
  if (!rateio) return <div className="alert alert-warning">Rateio não encontrado</div>;

  const approval = approvals?.find(a => a.rateio === rateio.id);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3>{rateio.titulo}</h3>
          <p className="text-muted mb-0">{rateio.descricao}</p>
        </div>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/financeiro/rateios')}>Voltar</button>
          {approval && approval.status === 'pending' && (
            permissions === undefined ? (
              <button className="btn btn-outline-secondary" disabled>Carregando...</button>
            ) : permissions?.can_approve === false ? (
              <button className="btn btn-secondary" disabled title="Você não tem permissão para aprovar">Sem permissão</button>
            ) : (
              <>
                <button className="btn btn-success me-2" onClick={() => handleApprove(approval.id)}>Aprovar</button>
                <button className="btn btn-danger" onClick={() => handleReject(approval.id)}>Rejeitar</button>
              </>
            )
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-8">
          <div className="card mb-3">
            <div className="card-header">Detalhes</div>
            <div className="card-body">
              <p><strong>Data do rateio:</strong> {rateio.data_rateio}</p>
              <p><strong>Valor total:</strong> R$ {rateio.valor_total}</p>
              <p><strong>Área total (ha):</strong> {rateio.area_total_hectares}</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Rateios por Talhão</div>
            <div className="card-body">
              <div className="list-group">
                {rateio.talhoes_rateio?.map((t) => (
                  <div key={t.id} className="list-group-item d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{t.talhao_nome}</strong>
                      <div><small>{t.talhao_area} ha</small></div>
                    </div>
                    <div className="text-end">
                      <div>R$ {t.valor_rateado}</div>
                      <div><small>{(Number(t.proporcao_area || 0) * 100).toFixed(2)}%</small></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-3">
            <div className="card-header">Aprovação</div>
            <div className="card-body">
              {approval ? (
                <div>
                  <p><strong>Status: </strong> {approval.status}</p>
                  <p><small>Criado em: {approval.criado_em}</small></p>
                </div>
              ) : (
                <p>Nenhuma solicitação de aprovação vinculada.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">Ações</div>
            <div className="card-body">
              <button className="btn btn-outline-primary mb-2 w-100" onClick={handleGerarVencimento}>Gerar vencimento</button>
              <button className="btn btn-outline-secondary w-100" onClick={() => window.open(`/financeiro/rateios/${rateio.id}/print`, '_blank')}>Exportar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateioDetail;
