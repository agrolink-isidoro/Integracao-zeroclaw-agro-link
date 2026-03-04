import React, { useState, useEffect, useCallback } from 'react';
import { rbacService } from '../../services/rbac';
import { tenantsService } from '../../services/tenants';
import type { TenantDetail } from '../../services/tenants';
import type { RBACUser, UserPayload, PermissionGroupList, UserGroupAssignment } from '../../types/rbac';
import UserFormModal from './UserFormModal';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../contexts/AuthContext';

const GestaoUsuarios: React.FC = () => {
  const { user: currentUser } = useAuthContext();
  const isSuperuser = !!(currentUser as any)?.is_superuser;
  const [users, setUsers] = useState<RBACUser[]>([]);
  const [groups, setGroups] = useState<PermissionGroupList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<RBACUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Group assignments for the user being edited
  const [userAssignments, setUserAssignments] = useState<UserGroupAssignment[]>([]);
  const [pendingGroupChanges, setPendingGroupChanges] = useState<Map<number, boolean>>(new Map());

  // Tenants para modal de root
  const [tenants, setTenants] = useState<TenantDetail[]>([]);
  const [showRootModal, setShowRootModal] = useState(false);
  const [rootTargetUser, setRootTargetUser] = useState<RBACUser | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [settingRoot, setSettingRoot] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const reqs: Promise<any>[] = [rbacService.getUsers(), rbacService.getGroups()];
      if (isSuperuser) reqs.push(tenantsService.list());
      const results = await Promise.all(reqs);
      setUsers(results[0]);
      setGroups(results[1]);
      if (isSuperuser && results[2]) setTenants(results[2]);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [isSuperuser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingUser(null);
    setUserAssignments([]);
    setPendingGroupChanges(new Map());
    setShowModal(true);
  };

  const openEdit = async (user: RBACUser) => {
    setEditingUser(user);
    setPendingGroupChanges(new Map());
    try {
      const assignments = await rbacService.getUserGroupAssignments({ user: user.id });
      setUserAssignments(assignments);
    } catch {
      setUserAssignments([]);
    }
    setShowModal(true);
  };

  const handleSave = async (data: UserPayload) => {
    setSaving(true);
    try {
      let savedUser: RBACUser;
      if (editingUser) {
        savedUser = await rbacService.updateUser(editingUser.id, data);
      } else {
        savedUser = await rbacService.createUser(data);
      }

      // Apply group changes
      for (const [groupId, shouldAssign] of pendingGroupChanges.entries()) {
        if (shouldAssign) {
          try {
            await rbacService.assignUserToGroup(savedUser.id, groupId);
          } catch (err: any) {
            // Ignore duplicate assignment errors
            if (!err?.response?.data?.non_field_errors?.[0]?.includes('already exists')) {
              throw err;
            }
          }
        } else {
          // Find the assignment to remove
          const assignment = userAssignments.find((a) => a.group === groupId);
          if (assignment) {
            await rbacService.removeUserFromGroup(assignment.id);
          }
        }
      }

      toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data;
      const msg =
        typeof detail === 'string'
          ? detail
          : detail?.detail || detail?.username?.[0] || detail?.email?.[0] || 'Erro ao salvar';
      toast.error(msg);
      throw err; // Let modal display the error too
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: RBACUser) => {
    if (!confirm(`Excluir o usuário "${user.username}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await rbacService.deleteUser(user.id);
      toast.success('Usuário excluído');
      loadData();
    } catch {
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleToggleActive = async (user: RBACUser) => {
    try {
      await rbacService.updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Usuário desativado' : 'Usuário ativado');
      loadData();
    } catch {
      toast.error('Erro ao alterar status');
    }
  };

  const openRootModal = (user: RBACUser) => {
    setRootTargetUser(user);
    setSelectedTenantId(user.tenant || '');
    setShowRootModal(true);
  };

  const handleSetRoot = async () => {
    if (!rootTargetUser || !selectedTenantId) return;
    setSettingRoot(true);
    try {
      const result = await rbacService.setTenantOwner(selectedTenantId, rootTargetUser.id);
      toast.success(result.detail);
      setShowRootModal(false);
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao definir proprietário';
      toast.error(msg);
    } finally {
      setSettingRoot(false);
    }
  };

  const handleGroupToggle = (groupId: number, assign: boolean) => {
    setPendingGroupChanges((prev) => {
      const next = new Map(prev);
      // Check if this is reverting an existing state
      const currentlyAssigned = userAssignments.some((a) => a.group === groupId);
      if (assign === currentlyAssigned) {
        next.delete(groupId); // No change needed
      } else {
        next.set(groupId, assign);
      }
      return next;
    });
  };

  // Compute effective assigned group IDs considering pending changes
  const getAssignedGroupIds = (): number[] => {
    const baseIds = new Set(userAssignments.map((a) => a.group));
    for (const [groupId, assign] of pendingGroupChanges.entries()) {
      if (assign) baseIds.add(groupId);
      else baseIds.delete(groupId);
    }
    return Array.from(baseIds);
  };

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.cargo || '').toLowerCase().includes(search.toLowerCase())
  );

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
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0">
            <i className="bi bi-people me-2"></i>
            Gestão de Usuários
          </h5>
          <small className="text-muted">{users.length} usuário(s) cadastrado(s)</small>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-person-plus me-1"></i> Novo Usuário
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="input-group">
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nome, username, email ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Usuário</th>
              <th>Nome</th>
              <th>Cargo</th>
              <th>Tenant / Função</th>
              <th>Perfis</th>
              <th>Status</th>
              <th className="text-end">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  {search ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.'}
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>
                      <strong>{u.username}</strong>
                      <br />
                      <small className="text-muted">{u.email}</small>
                    </div>
                  </td>
                  <td>
                    {u.first_name || u.last_name
                      ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                      : <span className="text-muted">—</span>}
                  </td>
                  <td>{u.cargo || <span className="text-muted">—</span>}</td>
                  <td>
                    {u.tenant_info ? (
                      <div>
                        <span className="badge bg-primary bg-opacity-75 me-1"
                          title={`Slug: ${u.tenant_info.slug}`}>
                          <i className="bi bi-building me-1"></i>
                          {u.tenant_info.nome}
                        </span>
                        {(u.cargo || '').trim().toLowerCase() === 'proprietário' && (
                          <span className="badge bg-warning text-dark ms-1" title="Root / Proprietário">
                            <i className="bi bi-star-fill"></i>
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted small">Sem tenant</span>
                    )}
                  </td>
                  <td>
                    {u.groups_display && u.groups_display.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {u.groups_display.map((g) => (
                          <span key={g.id} className="badge bg-info text-dark" style={{ fontSize: '0.7rem' }}>
                            {g.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted small">Sem perfil</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${u.is_active ? 'bg-success' : 'bg-danger'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleActive(u)}
                      title={u.is_active ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    {u.is_staff && (
                      <span className="badge bg-warning text-dark ms-1">Staff</span>
                    )}
                  </td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => openEdit(u)}
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-outline-warning"
                        onClick={() => openRootModal(u)}
                        title="Definir como Proprietário de Tenant"
                      >
                        <i className="bi bi-star"></i>
                      </button>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleDelete(u)}
                        title="Excluir"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Definir Proprietário de Tenant ── */}
      {showRootModal && rootTargetUser && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-star me-2 text-warning"></i>
                  Definir Proprietário de Tenant
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRootModal(false)} disabled={settingRoot}></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Selecione o tenant para o qual <strong>@{rootTargetUser.username}</strong> será definido como <strong>proprietário (root)</strong>:
                </p>
                <p className="text-muted small mb-3">
                  O cargo do usuário será alterado para <code>proprietário</code> e ele receberá acesso total ao tenant selecionado.
                </p>
                <select
                  className="form-select"
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                >
                  <option value="">— Selecione um tenant —</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nome} ({t.slug}) {!t.ativo ? '— Inativo' : ''}
                    </option>
                  ))}
                </select>
                {rootTargetUser.tenant_info && (
                  <small className="text-muted d-block mt-2">
                    Tenant atual: <strong>{rootTargetUser.tenant_info.nome}</strong>
                  </small>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRootModal(false)} disabled={settingRoot}>
                  Cancelar
                </button>
                <button
                  className="btn btn-warning"
                  onClick={handleSetRoot}
                  disabled={!selectedTenantId || settingRoot}
                >
                  {settingRoot
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Salvando...</>
                    : <><i className="bi bi-star-fill me-1"></i>Confirmar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <UserFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        user={editingUser}
        groups={groups}
        assignedGroupIds={getAssignedGroupIds()}
        onGroupToggle={handleGroupToggle}
        saving={saving}
        tenants={tenants}
        isSuperuser={isSuperuser}
      />
    </div>
  );
};

export default GestaoUsuarios;
