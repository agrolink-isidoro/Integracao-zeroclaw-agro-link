import React, { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../../services/rbac';
import type { PermissionAuditLogEntry } from '../../types/rbac';
import toast from 'react-hot-toast';

const LogAuditoria: React.FC = () => {
  const [logs, setLogs] = useState<PermissionAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      const data = await rbacService.getAuditLog(params);
      setLogs(data);
    } catch {
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const actionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create_user: 'bg-success',
      update_user: 'bg-info',
      delete_user: 'bg-danger',
      assign_group: 'bg-primary',
      remove_group: 'bg-warning',
      create_group: 'bg-success',
      update_group: 'bg-info',
      delete_group: 'bg-danger',
      grant_permission: 'bg-success',
      revoke_permission: 'bg-danger',
      update_permission: 'bg-info',
      delegate_permission: 'bg-primary',
      revoke_delegation: 'bg-warning',
      access_denied: 'bg-danger',
    };
    return colors[action] || 'bg-secondary';
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <i className="bi bi-journal-text me-2"></i>
          Log de Auditoria
        </h5>
        <div className="d-flex gap-2 align-items-center">
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Todas as ações</option>
            <option value="create_user">Usuário criado</option>
            <option value="update_user">Usuário atualizado</option>
            <option value="delete_user">Usuário removido</option>
            <option value="assign_group">Atribuído a grupo</option>
            <option value="remove_group">Removido de grupo</option>
            <option value="grant_permission">Permissão concedida</option>
            <option value="revoke_permission">Permissão revogada</option>
            <option value="access_denied">Acesso negado</option>
          </select>
          <button className="btn btn-sm btn-outline-secondary" onClick={loadLogs} title="Atualizar">
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted py-4">
          <i className="bi bi-journal" style={{ fontSize: '2rem' }}></i>
          <p className="mt-2">Nenhum registro de auditoria encontrado.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Data/Hora</th>
                <th>Ação</th>
                <th>Executado por</th>
                <th>Usuário alvo</th>
                <th>Módulo</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="small text-nowrap">
                    {new Date(log.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <span className={`badge ${actionBadge(log.action)}`} style={{ fontSize: '0.7rem' }}>
                      {log.action_display}
                    </span>
                  </td>
                  <td className="small">{log.user_username || 'sistema'}</td>
                  <td className="small">{log.target_user_username || '—'}</td>
                  <td className="small">{log.module || '—'}</td>
                  <td className="small">
                    {Object.keys(log.changes).length > 0 && (
                      <code className="small" style={{ fontSize: '0.7rem' }}>
                        {JSON.stringify(log.changes).substring(0, 80)}
                        {JSON.stringify(log.changes).length > 80 ? '...' : ''}
                      </code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LogAuditoria;
