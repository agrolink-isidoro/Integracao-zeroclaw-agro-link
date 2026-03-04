import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  listActions,
  approveAction,
  rejectAction,
  MODULE_LABELS,
  ACTION_STATUS_LABELS,
} from '../../services/actions';
import type { Action, ActionFilters, ActionStatus, ActionModule } from '../../services/actions';
import ActionCard from './ActionCard';
import ActionStatusBadge from './ActionStatusBadge';
import TaskModal from './TaskModal';

const PAGE_SIZE = 20;

const ALL_STATUSES: ActionStatus[] = [
  'pending_approval',
  'approved',
  'rejected',
  'executed',
  'failed',
  'archived',
];

const ALL_MODULES: ActionModule[] = [
  'agricultura',
  'maquinas',
  'estoque',
  'fazendas',
  'comercial',
  'financeiro',
  'fiscal',
  'administrativo',
];

const ActionsPanel: React.FC = () => {
  const queryClient = useQueryClient();

  // Filters
  const [filters, setFilters] = useState<ActionFilters>({ status: 'pending_approval' });
  const [page, setPage] = useState(1);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Action | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Fetch actions
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['actions', filters, page],
    queryFn: () => listActions({ ...filters, page, page_size: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const actions: Action[] = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (action: Action) => approveAction(action.id),
    onSuccess: (_, action) => {
      toast.success(`Ação "${action.action_type}" aprovada!`);
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setSelectedAction(null);
    },
    onError: () => toast.error('Erro ao aprovar ação.'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ action, motivo }: { action: Action; motivo: string }) =>
      rejectAction(action.id, motivo || undefined),
    onSuccess: (_, { action }) => {
      toast.success(`Ação "${action.action_type}" rejeitada.`);
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setRejectTarget(null);
      setRejectMotivo('');
      setSelectedAction(null);
    },
    onError: () => toast.error('Erro ao rejeitar ação.'),
  });

  const handleApprove = useCallback((action: Action) => {
    approveMutation.mutate(action);
  }, [approveMutation]);

  const handleReject = useCallback((action: Action) => {
    setRejectTarget(action);
    setRejectMotivo('');
  }, []);

  const handleFilterChange = (key: keyof ActionFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined && v !== '' && v !== 'pending_approval'
  ).length;

  return (
    <div className="h-100">
      {/* Toolbar */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2 px-3">
          <div className="row g-2 align-items-center">
            {/* Status filter */}
            <div className="col-sm-auto">
              <select
                className="form-select form-select-sm"
                value={filters.status ?? ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Todos os status</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ACTION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Module filter */}
            <div className="col-sm-auto">
              <select
                className="form-select form-select-sm"
                value={filters.module ?? ''}
                onChange={(e) => handleFilterChange('module', e.target.value)}
              >
                <option value="">Todos os módulos</option>
                {ALL_MODULES.map((m) => (
                  <option key={m} value={m}>
                    {MODULE_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <div className="col-auto">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => { setFilters({ status: 'pending_approval' }); setPage(1); }}
                >
                  <i className="bi bi-x me-1"></i>Limpar filtros
                </button>
              </div>
            )}

            <div className="col ms-auto d-flex justify-content-end align-items-center gap-2">
              {/* Total count */}
              <span className="text-muted small">
                {totalCount} {totalCount === 1 ? 'ação' : 'ações'}
                {isFetching && <span className="spinner-border spinner-border-sm ms-2" />}
              </span>
              {/* View mode toggle */}
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn btn-outline-secondary ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title="Cartões"
                >
                  <i className="bi bi-grid-3x3-gap"></i>
                </button>
                <button
                  className={`btn btn-outline-secondary ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Tabela"
                >
                  <i className="bi bi-list-ul"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-2">Carregando ações…</p>
        </div>
      ) : actions.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-inbox fs-1 d-block mb-2"></i>
          Nenhuma ação encontrada.
        </div>
      ) : viewMode === 'cards' ? (
        <div className="row g-3">
          {actions.map((action) => (
            <div key={action.id} className="col-xl-4 col-lg-6">
              <ActionCard
                action={action}
                onView={setSelectedAction}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={approveMutation.isPending || rejectMutation.isPending}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Tipo</th>
                  <th>Módulo</th>
                  <th>Status</th>
                  <th>Criado por</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.id}>
                    <td className="small fw-medium">
                      {action.action_type.replace(/_/g, ' ')}
                    </td>
                    <td className="small text-muted">
                      {MODULE_LABELS[action.module] ?? action.module}
                    </td>
                    <td>
                      <ActionStatusBadge status={action.status} />
                    </td>
                    <td className="small text-muted">{action.criado_por_nome ?? '—'}</td>
                    <td className="small text-muted">
                      {new Date(action.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSelectedAction(action)}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {action.status === 'pending_approval' && (
                          <>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleReject(action)}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(action)}
                            >
                              <i className="bi bi-check"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-3 d-flex justify-content-center">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <i className="bi bi-chevron-left"></i>
              </button>
            </li>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                </li>
              );
            })}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Task Detail Modal */}
      {selectedAction && (
        <TaskModal
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {/* Reject Confirmation Modal */}
      {rejectTarget && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setRejectTarget(null)}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-x-circle text-danger me-2"></i>Rejeitar ação
                </h5>
                <button className="btn-close" onClick={() => setRejectTarget(null)} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">
                  Tem certeza que deseja rejeitar a ação <strong>{rejectTarget.action_type}</strong>?
                </p>
                <div className="mb-0">
                  <label className="form-label small">Motivo (opcional)</label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={3}
                    placeholder="Descreva o motivo da rejeição…"
                    value={rejectMotivo}
                    onChange={(e) => setRejectMotivo(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRejectTarget(null)}
                  disabled={rejectMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => rejectMutation.mutate({ action: rejectTarget, motivo: rejectMotivo })}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending
                    ? <><span className="spinner-border spinner-border-sm me-1" />Rejeitando…</>
                    : 'Confirmar rejeição'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionsPanel;
