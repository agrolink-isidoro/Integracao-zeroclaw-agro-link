import uuid

from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models
from django.utils import timezone


# ============================================================
# MODULE_CHOICES — Usado em ModulePermission, GroupPermission e
# DelegatedPermission. Centralizado aqui para consistência.
# ============================================================
MODULE_CHOICES = [
    ('dashboard', 'Dashboard'),
    ('fazendas', 'Fazendas'),
    ('agricultura', 'Agricultura'),
    ('pecuaria', 'Pecuária'),
    ('estoque', 'Estoque'),
    ('maquinas', 'Máquinas'),
    ('financeiro', 'Financeiro'),
    ('administrativo', 'Administrativo'),
    ('fiscal', 'Fiscal'),
    ('comercial', 'Comercial'),
    ('user_management', 'Gestão de Usuários'),
]


# ============================================================
# TENANT — modelo central de multi-tenancy
# ============================================================

class Tenant(models.Model):
    """Representa um cliente/empresa no sistema (tenant).

    Cada tenant agrupa usuários, fazendas e dados de negócio de forma
    completamente isolada. Superusers globais (tenant=None) têm acesso
    cross-tenant para suporte/operações de plataforma.
    """

    PLANO_CHOICES = [
        ('basico', 'Básico'),
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=200, help_text='Nome fantasia ou razão social do cliente')
    cnpj = models.CharField(max_length=18, unique=True, null=True, blank=True,
                            help_text='CNPJ no formato 00.000.000/0000-00')
    cpf = models.CharField(max_length=14, unique=True, null=True, blank=True,
                           help_text='CPF no formato 000.000.000-00')
    slug = models.SlugField(max_length=80, unique=True,
                            help_text='Identificador URL-friendly (ex: fazenda-sao-jose)')
    plano = models.CharField(max_length=20, choices=PLANO_CHOICES, default='basico')
    ativo = models.BooleanField(default=True, db_index=True,
                                help_text='Tenants inativos não conseguem fazer login')
    # Limites do plano (0 = ilimitado)
    limite_usuarios = models.PositiveIntegerField(default=0,
                                                   help_text='Máximo de usuários (0 = ilimitado)')
    modulos_habilitados = models.JSONField(
        default=list,
        blank=True,
        help_text='Lista de módulos habilitados. Vazio = todos habilitados.'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tenant (Cliente)'
        verbose_name_plural = 'Tenants (Clientes)'
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} [{self.slug}]"

    def is_module_enabled(self, module: str) -> bool:
        """Retorna True se o módulo está habilitado para este tenant."""
        if not self.modulos_habilitados:
            return True  # Sem restrição → tudo habilitado
        return module in self.modulos_habilitados


# ============================================================
# TenantModel — base abstrata para todos os modelos multi-tenant
# ============================================================

class TenantModel(models.Model):
    """Base abstrata que adiciona FK de tenant a qualquer model.

    Todos os models que precisam de isolamento devem herdar desta classe.
    O campo `tenant` usa `related_name='%(app_label)s_%(class)s_set'` para
    evitar conflitos de nomes reversos entre apps.

    Exemplo:
        class ContaBancaria(TenantModel):
            ...  # automaticamente tem tenant_id
    """

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name='%(app_label)s_%(class)s_set',
        db_index=True,
        null=True,
        blank=True,
        help_text='Tenant proprietário deste registro',
    )

    class Meta:
        abstract = True


class CustomUser(AbstractUser):
    """Modelo de usuário customizado do sistema agropecuário."""
    # ── Multi-tenancy ──────────────────────────────────────────
    tenant = models.ForeignKey(
        Tenant,
        null=True, blank=True,  # null → superuser global sem tenant
        on_delete=models.SET_NULL,
        related_name='usuarios',
        db_index=True,
        help_text='Tenant ao qual este usuário pertence. Null = superuser global.'
    )
    # ── Campos de perfil ───────────────────────────────────────
    cargo = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Cargo/função do usuário na organização'
    )
    telefone = models.CharField(
        max_length=20, blank=True, default='',
        help_text='Telefone com DDD (para notificações WhatsApp)'
    )
    fazenda = models.ForeignKey(
        'fazendas.Fazenda', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='usuarios',
        help_text='Fazenda principal do usuário'
    )
    funcionario = models.OneToOneField(
        'administrativo.Funcionario', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='usuario_sistema',
        help_text='Vínculo com registro de funcionário (opcional)'
    )

    class Meta(AbstractUser.Meta):
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def get_effective_permissions(self):
        """Retorna permissões efetivas do usuário (individual + grupo + delegação).

        Regra: UNION (OR) — se qualquer fonte concede, a permissão é válida.
        Retorna dict: {module: {can_view, can_edit, can_respond}}
        """
        permissions = {}

        # 1) Permissões individuais
        for mp in ModulePermission.objects.filter(user=self):
            permissions[mp.module] = {
                'can_view': mp.can_view,
                'can_edit': mp.can_edit,
                'can_respond': mp.can_respond,
            }

        # 2) Permissões de grupo (OR merge)
        group_assignments = UserGroupAssignment.objects.filter(
            user=self
        ).select_related('group')
        group_ids = [a.group_id for a in group_assignments]

        for gp in GroupPermission.objects.filter(group_id__in=group_ids):
            if gp.module not in permissions:
                permissions[gp.module] = {
                    'can_view': False,
                    'can_edit': False,
                    'can_respond': False,
                }
            p = permissions[gp.module]
            p['can_view'] = p['can_view'] or gp.can_view
            p['can_edit'] = p['can_edit'] or gp.can_edit
            p['can_respond'] = p['can_respond'] or gp.can_respond

        # 3) Delegações ativas (OR merge)
        now = timezone.now()
        for dp in DelegatedPermission.objects.filter(
            to_user=self, is_active=True,
            valid_from__lte=now, valid_until__gte=now
        ):
            if dp.module not in permissions:
                permissions[dp.module] = {
                    'can_view': False,
                    'can_edit': False,
                    'can_respond': False,
                }
            p = permissions[dp.module]
            p['can_view'] = p['can_view'] or dp.can_view
            p['can_edit'] = p['can_edit'] or dp.can_edit
            p['can_respond'] = p['can_respond'] or dp.can_respond

        return permissions

    _OWNER_CARGOS = {'proprietário', 'proprietario', 'owner', 'admin'}

    @property
    def is_owner_level(self) -> bool:
        """True for superusers and for users whose cargo indicates ownership."""
        if self.is_superuser or self.is_staff:
            return True
        return (self.cargo or '').strip().lower() in self._OWNER_CARGOS

    def has_module_permission(self, module, level='can_view'):
        """Verifica se o usuário tem permissão específica em um módulo.

        Args:
            module: código do módulo (ex: 'financeiro')
            level: 'can_view', 'can_edit' ou 'can_respond'
        """
        if self.is_owner_level:
            return True
        perms = self.get_effective_permissions()
        return perms.get(module, {}).get(level, False)


# ============================================================
# RBAC — Grupos / Perfis de Permissão
# ============================================================

class PermissionGroup(TenantModel):
    """Grupo/perfil de permissão (ex: Gerente Operacional, Proprietário).

    Cada grupo tem um conjunto de permissões por módulo.
    Usuários podem pertencer a múltiplos grupos.
    """
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True, default='')
    is_system = models.BooleanField(
        default=False,
        help_text='Grupos de sistema não podem ser excluídos'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tenant', 'nome')
        verbose_name = 'Grupo de Permissão'
        verbose_name_plural = 'Grupos de Permissão'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class GroupPermission(models.Model):
    """Permissão de um grupo para um módulo específico."""
    group = models.ForeignKey(
        PermissionGroup, on_delete=models.CASCADE,
        related_name='permissions'
    )
    module = models.CharField(max_length=30, choices=MODULE_CHOICES)
    can_view = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_respond = models.BooleanField(default=False)

    class Meta:
        unique_together = ('group', 'module')
        verbose_name = 'Permissão de Grupo'
        verbose_name_plural = 'Permissões de Grupo'
        ordering = ['group', 'module']

    def __str__(self):
        return f"{self.group.nome} → {self.module}"


class UserGroupAssignment(models.Model):
    """Atribuição de usuário a um grupo de permissão (through table)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='group_assignments'
    )
    group = models.ForeignKey(
        PermissionGroup, on_delete=models.CASCADE,
        related_name='user_assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='+'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'group')
        verbose_name = 'Atribuição Usuário-Grupo'
        verbose_name_plural = 'Atribuições Usuário-Grupo'
        ordering = ['user__username', 'group__nome']

    def __str__(self):
        return f"{self.user.username} ∈ {self.group.nome}"


# ============================================================
# Permissão Individual por Módulo (já existia — preservada)
# ============================================================

class ModulePermission(models.Model):
    """Permissão individual de um usuário para um módulo."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='module_permissions'
    )
    module = models.CharField(max_length=30, choices=MODULE_CHOICES)
    can_view = models.BooleanField(default=True)
    can_edit = models.BooleanField(default=False)
    can_respond = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'module')
        verbose_name = "Permissão de Módulo"
        verbose_name_plural = "Permissões de Módulos"

    def __str__(self):
        return f"{self.user.username} - {self.module}"


# ============================================================
# Delegação Temporária de Permissões
# ============================================================

class DelegatedPermission(models.Model):
    """Delegação temporária de permissão de um usuário para outro."""
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='delegated_permissions_given',
        help_text='Usuário que delega a permissão'
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='delegated_permissions_received',
        help_text='Usuário que recebe a permissão'
    )
    module = models.CharField(max_length=30, choices=MODULE_CHOICES)
    can_view = models.BooleanField(default=True)
    can_edit = models.BooleanField(default=False)
    can_respond = models.BooleanField(default=False)
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(
        help_text='Data/hora de expiração da delegação (obrigatório)'
    )
    is_active = models.BooleanField(default=True)
    motivo = models.TextField(blank=True, default='', help_text='Motivo da delegação')
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Delegação de Permissão'
        verbose_name_plural = 'Delegações de Permissão'
        ordering = ['-criado_em']

    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} ({self.module})"

    @property
    def is_expired(self):
        return timezone.now() > self.valid_until

    def save(self, *args, **kwargs):
        # Desativar automaticamente se expirada
        if self.is_expired:
            self.is_active = False
        super().save(*args, **kwargs)


# ============================================================
# Auditoria de Permissões
# ============================================================

class PermissionAuditLog(TenantModel):
    """Log de auditoria para todas as operações de permissão."""
    ACTION_CHOICES = [
        ('create_user', 'Usuário criado'),
        ('update_user', 'Usuário atualizado'),
        ('delete_user', 'Usuário removido'),
        ('assign_group', 'Atribuído a grupo'),
        ('remove_group', 'Removido de grupo'),
        ('create_group', 'Grupo criado'),
        ('update_group', 'Grupo atualizado'),
        ('delete_group', 'Grupo removido'),
        ('grant_permission', 'Permissão concedida'),
        ('revoke_permission', 'Permissão revogada'),
        ('update_permission', 'Permissão atualizada'),
        ('delegate_permission', 'Permissão delegada'),
        ('revoke_delegation', 'Delegação revogada'),
        ('access_denied', 'Acesso negado'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='+',
        help_text='Usuário que realizou a ação'
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='+',
        help_text='Usuário afetado pela ação'
    )
    module = models.CharField(
        max_length=30, choices=MODULE_CHOICES,
        blank=True, default=''
    )
    changes = models.JSONField(
        default=dict, blank=True,
        help_text='Detalhes da alteração (antes/depois)'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Log de Auditoria de Permissão'
        verbose_name_plural = 'Logs de Auditoria de Permissões'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        actor = self.user.username if self.user else 'sistema'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor}: {self.get_action_display()}"
