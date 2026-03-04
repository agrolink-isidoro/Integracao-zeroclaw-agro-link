/**
 * GestaoTenants — componente para administração de tenants.
 * Visível apenas para superusers/admins.
 */
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { tenantsService } from '../../services/tenants';
import type { TenantDetail, TenantCreateData, TenantUpdateData, TenantOwnerData } from '../../services/tenants';

const PLANO_LABELS: Record<string, string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  enterprise: 'Enterprise',
};

const PLANO_BADGE: Record<string, string> = {
  basico: 'bg-secondary',
  profissional: 'bg-primary',
  enterprise: 'bg-warning text-dark',
};

const ALL_MODULES = [
  'dashboard', 'fazendas', 'agricultura', 'comercial',
  'financeiro', 'estoque', 'maquinas', 'administrativo', 'fiscal',
];

// ───────────────────────────────────────────────────────────
// Formulário de criação/edição
// ───────────────────────────────────────────────────────────

interface TenantFormProps {
  initial?: TenantDetail | null;
  onSave: () => void;
  onCancel: () => void;
}

const TenantForm: React.FC<TenantFormProps> = ({ initial, onSave, onCancel }) => {
  // Detecta tipo de documento ao editar
  const initialDocType = initial?.cpf ? 'cpf' : 'cnpj';
  const [docType, setDocType] = useState<'cnpj' | 'cpf'>(initialDocType);
  const [form, setForm] = useState<TenantCreateData>({
    nome: initial?.nome || '',
    cnpj: initial?.cnpj || '',
    cpf: initial?.cpf || '',
    slug: initial?.slug || '',
    plano: (initial?.plano as any) || 'basico',
    limite_usuarios: initial?.limite_usuarios || 50,
    modulos_habilitados: initial?.modulos_habilitados || [...ALL_MODULES],
  });
  const [saving, setSaving] = useState(false);

  // ── Proprietário inicial ─────────────────────────────────
  const [createOwner, setCreateOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState<TenantOwnerData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    cargo: 'proprietário',
  });

  const handleModuleToggle = (mod: string) => {
    setForm(prev => ({
      ...prev,
      modulos_habilitados: prev.modulos_habilitados?.includes(mod)
        ? prev.modulos_habilitados.filter(m => m !== mod)
        : [...(prev.modulos_habilitados || []), mod],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial) {
        const updateData: TenantUpdateData = { ...form };
        await tenantsService.update(initial.id, updateData);
        toast.success('Tenant atualizado com sucesso.');
      } else {
        const payload: TenantCreateData = {
          ...form,
          ...(createOwner ? { initial_owner: ownerForm } : {}),
        };
        const result = await tenantsService.create(payload);
        if (result.initial_owner_created) {
          toast.success(
            `Tenant criado! Proprietário: @${result.initial_owner_created.username} (${result.initial_owner_created.email})`,
            { duration: 6000 }
          );
        } else {
          toast.success('Tenant criado com sucesso.');
        }
      }
      onSave();
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : 'Erro ao salvar tenant';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Nome *</label>
          <input
            className="form-control"
            required
            value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
          />
        </div>
        <div className="col-md-6">
          <div className="d-flex align-items-center gap-2 mb-1">
            <label className="form-label fw-semibold mb-0">Documento *</label>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${docType === 'cnpj' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setDocType('cnpj'); setForm(p => ({ ...p, cpf: '' })); }}
              >CNPJ</button>
              <button
                type="button"
                className={`btn ${docType === 'cpf' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setDocType('cpf'); setForm(p => ({ ...p, cnpj: '' })); }}
              >CPF</button>
            </div>
          </div>
          {docType === 'cnpj' ? (
            <input
              key="cnpj"
              className="form-control"
              required
              placeholder="00.000.000/0001-00"
              value={form.cnpj || ''}
              onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))}
            />
          ) : (
            <input
              key="cpf"
              className="form-control"
              required
              placeholder="000.000.000-00"
              value={form.cpf || ''}
              onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))}
            />
          )}
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Slug *</label>
          <input
            className="form-control"
            required
            placeholder="minha-fazenda"
            value={form.slug}
            disabled={!!initial}
            onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
          />
          {initial && <small className="text-muted">Slug não pode ser alterado.</small>}
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Plano *</label>
          <select
            className="form-select"
            value={form.plano}
            onChange={e => setForm(p => ({ ...p, plano: e.target.value as any }))}
          >
            <option value="basico">Básico</option>
            <option value="profissional">Profissional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Limite de usuários</label>
          <input
            type="number"
            className="form-control"
            min={1}
            max={9999}
            value={form.limite_usuarios}
            onChange={e => setForm(p => ({ ...p, limite_usuarios: parseInt(e.target.value) || 50 }))}
          />
        </div>
        <div className="col-12">
          <label className="form-label fw-semibold">Módulos habilitados</label>
          <div className="d-flex flex-wrap gap-2">
            {ALL_MODULES.map(mod => (
              <div key={mod} className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`mod-${mod}`}
                  checked={form.modulos_habilitados?.includes(mod) ?? false}
                  onChange={() => handleModuleToggle(mod)}
                />
                <label className="form-check-label text-capitalize" htmlFor={`mod-${mod}`}>
                  {mod}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Usuário Proprietário (somente na criação) ────────── */}
      {!initial && (
        <div className="card border-0 bg-light mt-4 p-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="createOwnerCheck"
                checked={createOwner}
                onChange={e => setCreateOwner(e.target.checked)}
              />
              <label className="form-check-label fw-semibold" htmlFor="createOwnerCheck">
                <i className="bi bi-person-badge me-1"></i>
                Cadastrar usuário proprietário agora
              </label>
            </div>
            <small className="text-muted">(opcional — pode ser feito depois em Usuários)</small>
          </div>

          {createOwner && (
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label form-label-sm fw-semibold">Nome</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="Primeiro nome"
                  value={ownerForm.first_name || ''}
                  onChange={e => setOwnerForm(p => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label form-label-sm fw-semibold">Sobrenome</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="Sobrenome"
                  value={ownerForm.last_name || ''}
                  onChange={e => setOwnerForm(p => ({ ...p, last_name: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label form-label-sm fw-semibold">Login (username) *</label>
                <input
                  className="form-control form-control-sm"
                  required={createOwner}
                  placeholder="joao.silva"
                  value={ownerForm.username}
                  onChange={e => setOwnerForm(p => ({ ...p, username: e.target.value.trim() }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label form-label-sm fw-semibold">E-mail *</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  required={createOwner}
                  placeholder="joao@fazenda.com"
                  value={ownerForm.email}
                  onChange={e => setOwnerForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label form-label-sm fw-semibold">Senha *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  required={createOwner}
                  placeholder="Mín. 8 caracteres"
                  value={ownerForm.password}
                  onChange={e => setOwnerForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label form-label-sm fw-semibold">Cargo</label>
                <select
                  className="form-select form-select-sm"
                  value={ownerForm.cargo || 'proprietário'}
                  onChange={e => setOwnerForm(p => ({ ...p, cargo: e.target.value }))}
                >
                  <option value="proprietário">Proprietário</option>
                  <option value="admin">Admin</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-4">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? (
            <><span className="spinner-border spinner-border-sm me-2"></span>Salvando...</>
          ) : initial ? 'Salvar alterações' : 'Criar tenant'}
        </button>
      </div>
    </form>
  );
};

// ───────────────────────────────────────────────────────────
// Componente principal
// ───────────────────────────────────────────────────────────

const GestaoTenants: React.FC = () => {
  const [tenants, setTenants] = useState<TenantDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantDetail | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantsService.list(showInactive ? {} : { ativo: true });
      setTenants(data);
    } catch (err) {
      toast.error('Erro ao carregar tenants');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const handleDeactivate = async (tenant: TenantDetail) => {
    if (!window.confirm(`Desativar o tenant "${tenant.nome}"? Todos os usuários perderão acesso.`)) return;
    setActionLoading(tenant.id);
    try {
      await tenantsService.deactivate(tenant.id);
      toast.success('Tenant desativado.');
      loadTenants();
    } catch {
      toast.error('Erro ao desativar tenant');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (tenant: TenantDetail) => {
    setActionLoading(tenant.id);
    try {
      await tenantsService.reactivate(tenant.id);
      toast.success('Tenant reativado.');
      loadTenants();
    } catch {
      toast.error('Erro ao reativar tenant');
    } finally {
      setActionLoading(null);
    }
  };

  const openCreate = () => {
    setEditingTenant(null);
    setShowForm(true);
  };

  const openEdit = (tenant: TenantDetail) => {
    setEditingTenant(tenant);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingTenant(null);
    loadTenants();
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">
            <i className="bi bi-building me-2 text-primary"></i>
            Gestão de Tenants
          </h4>
          <p className="text-muted small mb-0">Administração de tenants (empresas/fazendas) do sistema</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="form-check form-switch mb-0 me-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="showInactive">
              Mostrar inativos
            </label>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="bi bi-plus-circle me-1"></i>
            Novo Tenant
          </button>
        </div>
      </div>

      {/* Formulário de criação/edição */}
      {showForm && (
        <div className="card mb-4 border-primary">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">
              <i className="bi bi-pencil-square me-2"></i>
              {editingTenant ? `Editar: ${editingTenant.nome}` : 'Novo Tenant'}
            </h6>
          </div>
          <div className="card-body">
            <TenantForm
              initial={editingTenant}
              onSave={handleFormSave}
              onCancel={() => { setShowForm(false); setEditingTenant(null); }}
            />
          </div>
        </div>
      )}

      {/* Lista de tenants */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-building fs-1 d-block mb-2 opacity-25"></i>
          <p>Nenhum tenant encontrado.</p>
        </div>
      ) : (
        <div className="row g-3">
          {tenants.map(tenant => (
            <div key={tenant.id} className="col-md-6 col-xl-4">
              <div className={`card h-100 ${!tenant.ativo ? 'opacity-60 border-secondary' : 'border-0 shadow-sm'}`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="card-title mb-0 fw-bold">{tenant.nome}</h6>
                      <small className="text-muted font-monospace">{tenant.slug}</small>
                    </div>
                    <span className={`badge ${PLANO_BADGE[tenant.plano] || 'bg-secondary'}`}>
                      {PLANO_LABELS[tenant.plano] || tenant.plano}
                    </span>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <i className="bi bi-card-text me-1"></i>
                      {tenant.cnpj ? `CNPJ: ${tenant.cnpj}` : tenant.cpf ? `CPF: ${tenant.cpf}` : '—'}
                    </small>
                    <small className="text-muted d-block">
                      <i className="bi bi-people me-1"></i>
                      {tenant.usuarios_count} / {tenant.limite_usuarios} usuários
                    </small>
                    <small className="text-muted d-block">
                      <i className="bi bi-calendar me-1"></i>
                      Criado em {new Date(tenant.criado_em).toLocaleDateString('pt-BR')}
                    </small>
                  </div>

                  {/* Módulos */}
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    {tenant.modulos_habilitados?.map(mod => (
                      <span key={mod} className="badge bg-light text-dark border text-capitalize" style={{ fontSize: '0.7rem' }}>
                        {mod}
                      </span>
                    ))}
                  </div>

                  {/* Status badge */}
                  <div className="d-flex justify-content-between align-items-center">
                    <span className={`badge ${tenant.ativo ? 'bg-success' : 'bg-danger'}`}>
                      {tenant.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        title="Editar"
                        onClick={() => openEdit(tenant)}
                        disabled={actionLoading === tenant.id}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      {tenant.ativo ? (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          title="Desativar"
                          onClick={() => handleDeactivate(tenant)}
                          disabled={actionLoading === tenant.id}
                        >
                          {actionLoading === tenant.id
                            ? <span className="spinner-border spinner-border-sm"></span>
                            : <i className="bi bi-pause-circle"></i>}
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline-success btn-sm"
                          title="Reativar"
                          onClick={() => handleReactivate(tenant)}
                          disabled={actionLoading === tenant.id}
                        >
                          {actionLoading === tenant.id
                            ? <span className="spinner-border spinner-border-sm"></span>
                            : <i className="bi bi-play-circle"></i>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GestaoTenants;
