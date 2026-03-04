import React from 'react';
import type { Action } from '../../services/actions';
import { MODULE_LABELS } from '../../services/actions';
import ActionStatusBadge from './ActionStatusBadge';

export const ACTION_TYPE_LABELS: Record<string, string> = {
  operacao_agricola: 'Operação Agrícola',
  colheita: 'Colheita',
  manutencao_maquina: 'Manutenção de Máquina',
  abastecimento: 'Abastecimento',
  parada_maquina: 'Parada de Máquina',
  entrada_estoque: 'Entrada de Estoque',
  saida_estoque: 'Saída de Estoque',
  ajuste_estoque: 'Ajuste de Estoque',
  criar_item_estoque: 'Criar Item de Estoque',
  criar_talhao: 'Criar Talhão',
  atualizar_talhao: 'Atualizar Talhão',
  criar_area: 'Criar Área',
};

interface ActionCardProps {
  action: Action;
  onView: (action: Action) => void;
  onApprove: (action: Action) => void;
  onReject: (action: Action) => void;
  loading?: boolean;
}

/** Returns a short human-readable summary of draft_data for card preview */
function draftSummary(draft: Record<string, unknown>): string {
  const exclude = ['tenant', 'id'];
  const entries = Object.entries(draft)
    .filter(([k, v]) => !exclude.includes(k) && v !== null && v !== '' && v !== undefined)
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${String(v)}`);
  return entries.join(' · ');
}

const ActionCard: React.FC<ActionCardProps> = ({ action, onView, onApprove, onReject, loading }) => {
  const isPending = action.status === 'pending_approval';

  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom">
        <div className="d-flex align-items-center gap-2">
          <ActionStatusBadge status={action.status} />
          <span className="text-muted small">
            <i className="bi bi-grid me-1"></i>
            {MODULE_LABELS[action.module] ?? action.module}
          </span>
        </div>
        <span className="text-muted small">
          {new Date(action.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="card-body">
        <h6 className="card-title mb-1">
          {(ACTION_TYPE_LABELS as Record<string, string>)[action.action_type] ?? action.action_type}
        </h6>
        {action.criado_por_nome && (
          <p className="text-muted small mb-2">
            <i className="bi bi-person me-1"></i>{action.criado_por_nome}
          </p>
        )}
        {action.draft_data && Object.keys(action.draft_data).length > 0 && (
          <p className="card-text small text-truncate text-muted" title={draftSummary(action.draft_data)}>
            {draftSummary(action.draft_data)}
          </p>
        )}
        {action.validation?.erros && action.validation.erros.length > 0 && (
          <div className="alert alert-warning py-1 px-2 small mb-0 mt-2">
            <i className="bi bi-exclamation-triangle me-1"></i>
            {action.validation.erros[0]}
            {action.validation.erros.length > 1 && ` +${action.validation.erros.length - 1} mais`}
          </div>
        )}
      </div>

      <div className="card-footer bg-white border-top d-flex gap-2 justify-content-end">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onView(action)}
          disabled={loading}
        >
          <i className="bi bi-eye me-1"></i>Ver
        </button>
        {isPending && (
          <>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onReject(action)}
              disabled={loading}
            >
              <i className="bi bi-x-circle me-1"></i>Rejeitar
            </button>
            <button
              className="btn btn-sm btn-success"
              onClick={() => onApprove(action)}
              disabled={loading}
            >
              <i className="bi bi-check-circle me-1"></i>Aprovar
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ActionCard;
