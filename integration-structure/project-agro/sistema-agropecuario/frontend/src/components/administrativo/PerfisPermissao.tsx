import React, { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../../services/rbac';
import type {
  PermissionGroup,
  PermissionGroupList,
  GroupPermissionEntry,
  RBACModule,
} from '../../types/rbac';
import { ALL_MODULES, MODULE_LABELS } from '../../types/rbac';
import toast from 'react-hot-toast';

const PerfisPermissao: React.FC = () => {
  const [groups, setGroups] = useState<PermissionGroupList[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New group form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rbacService.getGroups();
      setGroups(data);
    } catch {
      toast.error('Erro ao carregar perfis');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const selectGroup = async (id: number) => {
    try {
      const detail = await rbacService.getGroup(id);
      setSelectedGroup(detail);
    } catch {
      toast.error('Erro ao carregar detalhes do perfil');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setSaving(true);
    try {
      const created = await rbacService.createGroup({ nome: newGroupName, descricao: newGroupDesc });
      toast.success('Perfil criado!');
      setShowCreateForm(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await loadGroups();
      selectGroup(created.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.nome?.[0] || 'Erro ao criar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group: PermissionGroupList) => {
    if (group.is_system) {
      toast.error('Perfis de sistema não podem ser excluídos.');
      return;
    }
    if (!confirm(`Excluir o perfil "${group.nome}"?`)) return;
    try {
      await rbacService.deleteGroup(group.id);
      toast.success('Perfil excluído');
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
      loadGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao excluir perfil');
    }
  };

  const togglePermission = async (
    module: RBACModule,
    field: 'can_view' | 'can_edit' | 'can_respond',
    currentValue: boolean
  ) => {
    if (!selectedGroup) return;
    setSaving(true);

    // Find existing permission entry for this module
    const existing = selectedGroup.permissions.find((p) => p.module === module);

    try {
      if (existing) {
        await rbacService.updateGroupPermission(existing.id, { [field]: !currentValue });
      } else {
        // Create new entry with the toggled field
        await rbacService.setGroupPermission({
          group: selectedGroup.id,
          module,
          can_view: field === 'can_view' ? !currentValue : false,
          can_edit: field === 'can_edit' ? !currentValue : false,
          can_respond: field === 'can_respond' ? !currentValue : false,
        });
      }
      // Refresh
      const updated = await rbacService.getGroup(selectedGroup.id);
      setSelectedGroup(updated);
    } catch (err: any) {
      toast.error('Erro ao atualizar permissão');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionForModule = (module: RBACModule): GroupPermissionEntry | undefined => {
    return selectedGroup?.permissions.find((p) => p.module === module);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      {/* Left panel: List of groups */}
      <div className="col-md-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <i className="bi bi-shield-lock me-2"></i>Perfis
          </h5>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <i className="bi bi-plus-circle me-1"></i> Novo
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateGroup} className="card card-body mb-3">
            <div className="mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Nome do perfil"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />
            </div>
            <div className="mb-2">
              <textarea
                className="form-control form-control-sm"
                placeholder="Descrição (opcional)"
                rows={2}
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-sm btn-success" disabled={saving}>
                Criar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Groups list */}
        <div className="list-group">
          {groups.map((g) => (
            <div
              key={g.id}
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                selectedGroup?.id === g.id ? 'active' : ''
              }`}
              style={{ cursor: 'pointer' }}
              onClick={() => selectGroup(g.id)}
            >
              <div>
                <strong>{g.nome}</strong>
                {g.is_system && (
                  <span className="badge bg-secondary ms-1" style={{ fontSize: '0.6rem' }}>
                    sistema
                  </span>
                )}
                <br />
                <small className={selectedGroup?.id === g.id ? 'text-white-50' : 'text-muted'}>
                  {g.user_count} usuário(s)
                </small>
              </div>
              {!g.is_system && (
                <button
                  className={`btn btn-sm ${
                    selectedGroup?.id === g.id ? 'btn-outline-light' : 'btn-outline-danger'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(g);
                  }}
                  title="Excluir perfil"
                >
                  <i className="bi bi-trash"></i>
                </button>
              )}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="text-center text-muted py-3">Nenhum perfil cadastrado.</div>
          )}
        </div>
      </div>

      {/* Right panel: Permission matrix */}
      <div className="col-md-8">
        {selectedGroup ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="mb-0">{selectedGroup.nome}</h5>
                <small className="text-muted">{selectedGroup.descricao || 'Sem descrição'}</small>
              </div>
              <span className="badge bg-primary">{selectedGroup.user_count} usuário(s)</span>
            </div>

            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">
                  <i className="bi bi-grid-3x3 me-2"></i>
                  Matriz de Permissões
                </h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Módulo</th>
                        <th className="text-center" title="Pode visualizar dados">
                          <i className="bi bi-eye me-1"></i>Visualizar
                        </th>
                        <th className="text-center" title="Pode criar e editar dados">
                          <i className="bi bi-pencil me-1"></i>Editar
                        </th>
                        <th className="text-center" title="Pode aprovar, rejeitar ou responder">
                          <i className="bi bi-check2-circle me-1"></i>Responder
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALL_MODULES.map((mod) => {
                        const perm = getPermissionForModule(mod);
                        return (
                          <tr key={mod}>
                            <td>
                              <strong>{MODULE_LABELS[mod]}</strong>
                            </td>
                            <td className="text-center">
                              <div className="form-check form-switch d-inline-block">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={perm?.can_view ?? false}
                                  onChange={() => togglePermission(mod, 'can_view', perm?.can_view ?? false)}
                                  disabled={saving}
                                />
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="form-check form-switch d-inline-block">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={perm?.can_edit ?? false}
                                  onChange={() => togglePermission(mod, 'can_edit', perm?.can_edit ?? false)}
                                  disabled={saving}
                                />
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="form-check form-switch d-inline-block">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={perm?.can_respond ?? false}
                                  onChange={() => togglePermission(mod, 'can_respond', perm?.can_respond ?? false)}
                                  disabled={saving}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Audit info */}
            <div className="mt-2 text-muted small">
              <i className="bi bi-clock me-1"></i>
              Criado em: {new Date(selectedGroup.criado_em).toLocaleDateString('pt-BR')} |
              Atualizado: {new Date(selectedGroup.atualizado_em).toLocaleDateString('pt-BR')}
            </div>
          </>
        ) : (
          <div className="text-center text-muted py-5">
            <i className="bi bi-shield-lock" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3">Selecione um perfil à esquerda para visualizar e editar suas permissões.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerfisPermissao;
