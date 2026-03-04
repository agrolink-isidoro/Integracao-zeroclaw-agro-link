import React, { useState, useEffect } from 'react';
import type { RBACUser, UserPayload, PermissionGroupList } from '../../types/rbac';
import type { TenantDetail } from '../../services/tenants';

interface UserFormModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: UserPayload) => Promise<void>;
  user?: RBACUser | null;
  groups: PermissionGroupList[];
  assignedGroupIds: number[];
  onGroupToggle: (groupId: number, assign: boolean) => void;
  saving?: boolean;
  /** Lista de tenants disponíveis (apenas para superusers) */
  tenants?: TenantDetail[];
  /** Se o usuário logado é superuser — mostra seletor de tenant */
  isSuperuser?: boolean;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  show,
  onClose,
  onSave,
  user,
  groups,
  assignedGroupIds,
  onGroupToggle,
  saving = false,
  tenants = [],
  isSuperuser = false,
}) => {
  const isEdit = !!user;

  const [form, setForm] = useState<UserPayload>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    is_active: true,
    is_staff: false,
    cargo: '',
    telefone: '',
    tenant: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '',
        is_active: user.is_active,
        is_staff: user.is_staff,
        cargo: user.cargo || '',
        telefone: user.telefone || '',
        tenant: user.tenant || '',
      });
    } else {
      setForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        is_active: true,
        is_staff: false,
        cargo: '',
        telefone: '',
        tenant: '',
      });
    }
    setError('');
  }, [user, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim()) {
      setError('Username é obrigatório.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('Senha é obrigatória para novo usuário.');
      return;
    }

    try {
      const payload = { ...form };
      // Don't send empty password on edit
      if (isEdit && !payload.password) {
        delete payload.password;
      }
      // Não enviar tenant vazio — deixa o backend decidir
      if (!payload.tenant) {
        delete payload.tenant;
      }
      await onSave(payload);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Erro ao salvar usuário.');
    }
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className={`bi ${isEdit ? 'bi-pencil' : 'bi-person-plus'} me-2`}></i>
              {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={saving}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger py-2">{error}</div>
              )}

              <div className="row g-3">
                {/* Username & Email */}
                <div className="col-md-6">
                  <label className="form-label">Username *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={isEdit}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">E-mail</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                {/* Name */}
                <div className="col-md-6">
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    className="form-control"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Sobrenome</label>
                  <input
                    type="text"
                    className="form-control"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                  />
                </div>

                {/* Cargo & Telefone */}
                <div className="col-md-6">
                  <label className="form-label">Cargo</label>
                  <input
                    type="text"
                    className="form-control"
                    name="cargo"
                    value={form.cargo}
                    onChange={handleChange}
                    placeholder="Ex: Gerente, Técnico, Operador"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Telefone</label>
                  <input
                    type="text"
                    className="form-control"
                    name="telefone"
                    value={form.telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Tenant — apenas visível para superusers */}
                {isSuperuser && tenants.length > 0 && (
                  <div className="col-12">
                    <label className="form-label">
                      <i className="bi bi-building me-1"></i>
                      Tenant (Fazenda / Empresa)
                      {!isEdit && <span className="text-danger ms-1">*</span>}
                    </label>
                    <select
                      className="form-select"
                      name="tenant"
                      value={form.tenant || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, tenant: e.target.value || null }))}
                    >
                      <option value="">— Selecione o tenant do usuário —</option>
                      {tenants.filter(t => t.ativo).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.slug})
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      Usuários no mesmo tenant <strong>compartilham os mesmos dados</strong>.
                      Para dados isolados, crie um tenant separado.
                    </div>
                  </div>
                )}

                {/* Password */}
                <div className="col-md-6">
                  <label className="form-label">
                    {isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required={!isEdit}
                  />
                </div>

                {/* Flags */}
                <div className="col-md-6 d-flex align-items-end gap-4">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      name="is_active"
                      id="isActive"
                      checked={form.is_active}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="isActive">Ativo</label>
                  </div>
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      name="is_staff"
                      id="isStaff"
                      checked={form.is_staff}
                      onChange={handleChange}
                    />
                    <label className="form-check-label" htmlFor="isStaff">Staff</label>
                  </div>
                </div>
              </div>

              {/* Group Assignments */}
              <hr className="my-3" />
              <h6><i className="bi bi-shield-check me-2"></i>Perfis de Permissão</h6>
              <p className="text-muted small mb-2">
                Selecione os perfis/grupos que este usuário deve pertencer:
              </p>
              <div className="row g-2">
                {groups.map((g) => (
                  <div key={g.id} className="col-md-6 col-lg-4">
                    <div
                      className={`border rounded p-2 d-flex align-items-center ${
                        assignedGroupIds.includes(g.id) ? 'border-primary bg-primary bg-opacity-10' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onGroupToggle(g.id, !assignedGroupIds.includes(g.id))}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={assignedGroupIds.includes(g.id)}
                        onChange={() => onGroupToggle(g.id, !assignedGroupIds.includes(g.id))}
                      />
                      <div>
                        <strong className="small">{g.nome}</strong>
                        {g.is_system && (
                          <span className="badge bg-secondary ms-1" style={{ fontSize: '0.65rem' }}>
                            sistema
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span>Salvando...</>
                ) : (
                  <><i className="bi bi-check-lg me-1"></i>{isEdit ? 'Salvar' : 'Criar Usuário'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
