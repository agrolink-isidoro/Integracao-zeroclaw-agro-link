import React, { useState, useEffect } from 'react';
import type { Action } from '../../services/actions';
import { MODULE_LABELS, updateActionDraft } from '../../services/actions';
import ActionStatusBadge from './ActionStatusBadge';
import { ACTION_TYPE_LABELS } from './ActionCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DRAFT_FIELD_CONFIG, getFieldLabel } from './draftFieldConfig';
import { useDraftOptions } from './useDraftOptions';
import type { SelectOption } from './useDraftOptions';
import DynamicSearchSelect from './DynamicSearchSelect';

interface TaskModalProps {
  action: Action | null;
  onClose: () => void;
  onApprove: (action: Action) => void;
  onReject: (action: Action) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ action, onClose, onApprove, onReject }) => {
  const queryClient = useQueryClient();
  const [editedDraft, setEditedDraft] = useState<Record<string, unknown>>({});
  const [draftEdited, setDraftEdited] = useState(false);

  // Carrega opções de dropdown para o action_type atual
  const { optionsMap, isLoading: optionsLoading } = useDraftOptions(action?.action_type);

  useEffect(() => {
    if (action) {
      setEditedDraft({ ...(action.draft_data ?? {}) });
      setDraftEdited(false);
    }
  }, [action]);

  const saveMutation = useMutation({
    mutationFn: () => updateActionDraft(action!.id, editedDraft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      setDraftEdited(false);
    },
  });

  if (!action) return null;

  const isPending = action.status === 'pending_approval';

  const handleFieldChange = (key: string, value: string) => {
    setEditedDraft((prev) => ({ ...prev, [key]: value }));
    setDraftEdited(true);
  };

  /** Resolve as opções para um campo select */
  const getSelectOptions = (actionType: string, fieldKey: string): SelectOption[] | null => {
    const config = DRAFT_FIELD_CONFIG[actionType];
    const fieldDef = config?.[fieldKey];
    if (!fieldDef?.select) return null;

    const { source, options: staticOptions } = fieldDef.select;

    if (source === 'static' && staticOptions) {
      return staticOptions.map((o) => ({ value: o.value, label: o.label }));
    }

    return optionsMap[source] ?? [];
  };

  /** Resolve config dinâmica para um campo */
  const getDynamicConfig = (actionType: string, fieldKey: string) => {
    const config = DRAFT_FIELD_CONFIG[actionType];
    return config?.[fieldKey]?.dynamic ?? null;
  };

  const renderDraftFields = () => {
    const entries = Object.entries(editedDraft);
    if (entries.length === 0) return <p className="text-muted small">Sem dados de rascunho.</p>;

    return (
      <div className="row g-2">
        {entries.map(([key, value]) => {
          const label = getFieldLabel(action.action_type, key);
          const selectOptions = getSelectOptions(action.action_type, key);
          const dynamicConfig = getDynamicConfig(action.action_type, key);

          return (
            <div key={key} className="col-md-6">
              <label className="form-label small text-muted mb-1">
                {label}
              </label>
              {isPending ? (
                dynamicConfig !== null ? (
                  // ── Busca dinâmica (autocomplete) ───────────────────
                  <DynamicSearchSelect
                    config={dynamicConfig}
                    value={String(value ?? '')}
                    onChange={(v) => handleFieldChange(key, v)}
                    placeholder={`Buscar ${label.toLowerCase()}…`}
                  />
                ) : selectOptions !== null ? (
                  // ── Select dropdown estático ────────────────────────
                  <select
                    className="form-select form-select-sm"
                    value={String(value ?? '')}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    disabled={optionsLoading}
                  >
                    <option value="">
                      {optionsLoading ? 'Carregando...' : '— Selecione —'}
                    </option>
                    {selectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    {/* Se o valor atual não está nas opções, manter como opção extra */}
                    {value && !selectOptions.some((o) => o.value === String(value)) && (
                      <option value={String(value)}>
                        {String(value)} (valor atual)
                      </option>
                    )}
                  </select>
                ) : (
                  // ── Input text padrão ───────────────────────────────
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={String(value ?? '')}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                  />
                )
              ) : (
                <p className="form-control-plaintext form-control-sm py-0 small">
                  {String(value ?? '—')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div>
              <h5 className="modal-title mb-1">
                {ACTION_TYPE_LABELS[action.action_type] ?? action.action_type}
              </h5>
              <div className="d-flex align-items-center gap-2">
                <ActionStatusBadge status={action.status} />
                <span className="text-muted small">
                  {MODULE_LABELS[action.module] ?? action.module}
                </span>
              </div>
            </div>
            <button className="btn-close" onClick={onClose} aria-label="Fechar" />
          </div>

          {/* Body */}
          <div className="modal-body">
            {/* Meta info */}
            <div className="mb-3 d-flex flex-wrap gap-3 small text-muted">
              {action.criado_por_nome && (
                <span><i className="bi bi-person me-1"></i>Criado por: <strong>{action.criado_por_nome}</strong></span>
              )}
              <span>
                <i className="bi bi-calendar me-1"></i>
                {new Date(action.criado_em).toLocaleString('pt-BR')}
              </span>
              {action.aprovado_por_nome && (
                <span><i className="bi bi-check-circle me-1 text-success"></i>Aprovado por: <strong>{action.aprovado_por_nome}</strong></span>
              )}
              {action.upload_nome && (
                <span><i className="bi bi-file-earmark me-1"></i>Arquivo: <strong>{action.upload_nome}</strong></span>
              )}
            </div>

            {/* Validation warnings */}
            {action.validation?.avisos && action.validation.avisos.length > 0 && (
              <div className="alert alert-warning small mb-3">
                <strong><i className="bi bi-exclamation-triangle me-1"></i>Avisos de validação:</strong>
                <ul className="mb-0 mt-1 ps-3">
                  {action.validation.avisos.map((aviso: string, i: number) => (
                    <li key={i}>{aviso}</li>
                  ))}
                </ul>
              </div>
            )}
            {action.validation?.erros && action.validation.erros.length > 0 && (
              <div className="alert alert-danger small mb-3">
                <strong><i className="bi bi-x-circle me-1"></i>Erros de validação:</strong>
                <ul className="mb-0 mt-1 ps-3">
                  {action.validation.erros.map((erro: string, i: number) => (
                    <li key={i}>{erro}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Draft data fields */}
            <h6 className="text-muted mb-2">
              <i className="bi bi-pencil-square me-1"></i>Dados da ação
            </h6>
            {renderDraftFields()}

            {/* Rejection reason */}
            {action.status === 'rejected' && (action.meta as any)?.motivo_rejeicao && (
              <div className="alert alert-secondary mt-3 small">
                <i className="bi bi-chat-left-text me-1"></i>
                <strong>Motivo da rejeição:</strong> {(action.meta as any).motivo_rejeicao}
              </div>
            )}

            {/* Execution result */}
            {action.resultado_execucao && (
              <div className="mt-3">
                <h6 className="text-muted mb-2">
                  <i className="bi bi-terminal me-1"></i>Resultado da execução
                </h6>
                <pre className="bg-light p-2 rounded small" style={{ maxHeight: 120, overflow: 'auto' }}>
                  {JSON.stringify(action.resultado_execucao, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            {draftEdited && isPending && (
              <button
                className="btn btn-outline-primary btn-sm me-auto"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending
                  ? <><span className="spinner-border spinner-border-sm me-1" />Salvando…</>
                  : <><i className="bi bi-save me-1" />Salvar rascunho</>}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Fechar
            </button>
            {isPending && (
              <>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onReject(action)}
                  disabled={saveMutation.isPending}
                >
                  <i className="bi bi-x-circle me-1"></i>Rejeitar
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => {
                    if (draftEdited) saveMutation.mutate();
                    onApprove(action);
                  }}
                  disabled={saveMutation.isPending}
                >
                  <i className="bi bi-check-circle me-1"></i>Aprovar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
