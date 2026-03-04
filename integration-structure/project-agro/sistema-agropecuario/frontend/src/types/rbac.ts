// ============================================================
// RBAC Type Definitions
// ============================================================

/** Module codes matching backend MODULE_CHOICES */
export type RBACModule =
  | 'dashboard'
  | 'fazendas'
  | 'agricultura'
  | 'pecuaria'
  | 'estoque'
  | 'maquinas'
  | 'financeiro'
  | 'administrativo'
  | 'fiscal'
  | 'comercial'
  | 'user_management'
  | 'actions';

export const MODULE_LABELS: Record<RBACModule, string> = {
  dashboard: 'Dashboard',
  fazendas: 'Fazendas',
  agricultura: 'Agricultura',
  pecuaria: 'Pecuária',
  estoque: 'Estoque',
  maquinas: 'Máquinas',
  financeiro: 'Financeiro',
  administrativo: 'Administrativo',
  fiscal: 'Fiscal',
  comercial: 'Comercial',
  user_management: 'Gestão de Usuários',
  actions: 'Isidoro IA',
};

export const ALL_MODULES: RBACModule[] = Object.keys(MODULE_LABELS) as RBACModule[];

/** Permission flags for a module */
export interface ModulePermissionFlags {
  can_view: boolean;
  can_edit: boolean;
  can_respond: boolean;
}

/** Effective permissions map: module → flags */
export type EffectivePermissions = Record<string, ModulePermissionFlags>;

/** Permission group (perfil) from backend */
export interface PermissionGroup {
  id: number;
  nome: string;
  descricao: string;
  is_system: boolean;
  permissions: GroupPermissionEntry[];
  user_count: number;
  criado_em: string;
  atualizado_em: string;
}

/** Simplified permission group for listings */
export interface PermissionGroupList {
  id: number;
  nome: string;
  descricao: string;
  is_system: boolean;
  user_count: number;
}

/** Group permission entry (module-level) */
export interface GroupPermissionEntry {
  id: number;
  group: number;
  module: RBACModule;
  module_display: string;
  can_view: boolean;
  can_edit: boolean;
  can_respond: boolean;
}

/** User-to-group assignment */
export interface UserGroupAssignment {
  id: number;
  user: number;
  user_username: string;
  group: number;
  group_nome: string;
  assigned_by: number | null;
  assigned_by_username: string | null;
  assigned_at: string;
}

/** Individual module permission */
export interface ModulePermissionEntry {
  id: number;
  user: number;
  user_username: string;
  module: RBACModule;
  module_display: string;
  can_view: boolean;
  can_edit: boolean;
  can_respond: boolean;
}

/** Delegated permission */
export interface DelegatedPermission {
  id: number;
  from_user: number;
  from_username: string;
  to_user: number;
  to_username: string;
  module: RBACModule;
  module_display: string;
  can_view: boolean;
  can_edit: boolean;
  can_respond: boolean;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  is_expired: boolean;
  motivo: string;
  criado_em: string;
}

/** Audit log entry */
export interface PermissionAuditLogEntry {
  id: number;
  user: number | null;
  user_username: string | null;
  action: string;
  action_display: string;
  target_user: number | null;
  target_user_username: string | null;
  module: string;
  changes: Record<string, unknown>;
  ip_address: string | null;
  timestamp: string;
}

/** Tenant summary embedded in user responses */
export interface RBACUserTenantInfo {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  ativo: boolean;
  modulos_habilitados: string[];
}

/** User with RBAC details */
export interface RBACUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser?: boolean;
  cargo: string;
  telefone: string;
  fazenda: number | null;
  funcionario: number | null;
  date_joined: string;
  /** UUID do tenant ao qual o usuário está vinculado (null = superuser global) */
  tenant: string | null;
  tenant_info: RBACUserTenantInfo | null;
  groups_display: Array<{ id: number; nome: string }>;
  effective_permissions?: EffectivePermissions;
}

/** Payload for creating/updating a user */
export interface UserPayload {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  is_active?: boolean;
  is_staff?: boolean;
  cargo?: string;
  telefone?: string;
  fazenda?: number | null;
  funcionario?: number | null;
  /** UUID do tenant ao qual o usuário será vinculado (apenas superusers podem definir) */
  tenant?: string | null;
}

/** Effective permissions response */
export interface EffectivePermissionsResponse {
  user_id: number;
  username: string;
  is_superuser: boolean;
  groups: Array<{ id: number; nome: string }>;
  permissions: EffectivePermissions;
}
