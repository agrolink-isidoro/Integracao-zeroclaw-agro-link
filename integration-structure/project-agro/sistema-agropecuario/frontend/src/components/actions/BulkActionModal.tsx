import React, { useState, useCallback } from 'react';
import type { Action } from '../../services/actions';
import { MODULE_LABELS } from '../../services/actions';
import ActionStatusBadge from './ActionStatusBadge';
import { ACTION_TYPE_LABELS } from './ActionCard';
import { useActions } from '../../contexts/ActionsContext';

interface BulkActionModalProps {
  /** Title shown at the top of the modal */
  title?: string;
  /** The list of action drafts to review (from a single upload or a manual selection) */
  actions: Action[];
  onClose: () => void;
  /** Called after bulk-approval is done */
  onDone?: () => void;
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({
  title = 'Revisão em lote',
  actions,
  onClose,
  onDone,
}) => {
  const { handleBulkApprove } = useActions();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(actions.filter((a) => a.status === 'pending_approval').map((a) => a.id))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ approved: number; errors: string[] } | null>(null);

  const pendingActions = actions.filter((a) => a.status === 'pending_approval');
  const allSelected = pendingActions.length > 0 && pendingActions.every((a) => selected.has(a.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingActions.map((a) => a.id)));
    }
  };

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApprove = async () => {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    try {
      await handleBulkApprove([...selected]);
      setResult({ approved: selected.size, errors: [] });
      onDone?.();
    } catch (err: any) {
      setResult({ approved: 0, errors: [err?.message ?? 'Erro ao aprovar'] });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-list-check me-2"></i>{title}
            </h5>
            <button className="btn-close" onClick={onClose} aria-label="Fechar" />
          </div>

          {/* Body */}
          <div className="modal-body p-0">
            {result ? (
              <div className="p-4">
                {result.approved > 0 && (
                  <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>{result.approved} ação(ões) aprovada(s) com sucesso!</strong>
                  </div>
                )}
                {result.errors.map((e, i) => (
                  <div key={i} className="alert alert-danger">
                    <i className="bi bi-x-circle me-2"></i>{e}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="px-3 py-2 border-bottom border-light bg-light d-flex align-items-center gap-3">
                  <div className="form-check mb-0">
                    <input
                      id="selectAll"
                      type="checkbox"
                      className="form-check-input"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={pendingActions.length === 0}
                    />
                    <label htmlFor="selectAll" className="form-check-label small fw-semibold">
                      Selecionar todos pendentes
                    </label>
                  </div>
                  <span className="text-muted small ms-auto">
                    {selected.size} de {pendingActions.length} selecionados
                  </span>
                </div>

                {/* Action rows */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 40 }}></th>
                        <th>Tipo</th>
                        <th>Módulo</th>
                        <th>Resumo</th>
                        <th>Status</th>
                        <th>Criado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted py-4">
                            Nenhuma ação gerada.
                          </td>
                        </tr>
                      )}
                      {actions.map((action) => {
                        const isPending = action.status === 'pending_approval';
                        const isChecked = selected.has(action.id);

                        return (
                          <tr key={action.id} className={isChecked ? 'table-primary' : ''}>
                            <td>
                              {isPending ? (
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isChecked}
                                  onChange={() => toggleOne(action.id)}
                                />
                              ) : (
                                <i className="bi bi-dash text-muted"></i>
                              )}
                            </td>
                            <td className="small">
                              {ACTION_TYPE_LABELS[action.action_type] ?? action.action_type}
                            </td>
                            <td className="small">
                              {MODULE_LABELS[action.module] ?? action.module}
                            </td>
                            <td className="small text-muted" style={{ maxWidth: 260 }}>
                              <span className="text-truncate d-block">
                                {action.draft_data
                                  ? Object.values(action.draft_data).filter(Boolean).slice(0, 3).join(' · ')
                                  : '—'}
                              </span>
                            </td>
                            <td>
                              <ActionStatusBadge status={action.status} />
                              {action.validation?.erros && action.validation.erros.length > 0 && (
                                <i
                                  className="bi bi-exclamation-triangle text-warning ms-1"
                                  title={(action.validation.erros as string[]).join('; ')}
                                ></i>
                              )}
                            </td>
                            <td className="small text-muted">{action.criado_por_nome ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              {result ? 'Fechar' : 'Cancelar'}
            </button>
            {!result && (
              <button
                className="btn btn-success btn-sm"
                onClick={handleApprove}
                disabled={selected.size === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Aprovando…</>
                ) : (
                  <><i className="bi bi-check-all me-1"></i>Aprovar {selected.size} selecionadas</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkActionModal;
