from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    ModulePermission, PermissionGroup, GroupPermission,
    UserGroupAssignment, DelegatedPermission, PermissionAuditLog, Tenant,
)

User = get_user_model()


# ============================================================
# User Serializers
# ============================================================

class TenantMiniSerializer(serializers.ModelSerializer):
    """Representação mínima do tenant para embutir no login/profile."""
    class Meta:
        model = Tenant
        fields = ['id', 'nome', 'slug', 'plano', 'ativo', 'modulos_habilitados']
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    groups_display = serializers.SerializerMethodField()
    effective_permissions = serializers.SerializerMethodField()
    tenant_info = TenantMiniSerializer(source='tenant', read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_staff", "is_superuser", "cargo", "telefone",
            "fazenda", "funcionario", "date_joined", "password",
            "tenant", "tenant_info",
            "groups_display", "effective_permissions",
        ]
        read_only_fields = ["id", "date_joined", "groups_display", "effective_permissions", "is_superuser", "tenant_info"]

    def get_groups_display(self, obj):
        assignments = UserGroupAssignment.objects.filter(user=obj).select_related('group')
        return [{'id': a.group.id, 'nome': a.group.nome} for a in assignments]

    def get_effective_permissions(self, obj):
        """Retorna permissões efetivas para incluir no JWT e nas respostas."""
        # Só inclui se solicitado via query param ou se é o próprio usuário
        request = self.context.get('request')
        if request and request.query_params.get('include_permissions') != '1':
            return None
        return obj.get_effective_permissions()

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = self.Meta.model(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagens (sem permissões)."""
    groups_display = serializers.SerializerMethodField()
    tenant_info = TenantMiniSerializer(source='tenant', read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_staff", "is_superuser", "cargo", "telefone",
            "fazenda", "funcionario", "date_joined", "groups_display",
            "tenant", "tenant_info",
        ]
        read_only_fields = fields

    def get_groups_display(self, obj):
        assignments = UserGroupAssignment.objects.filter(user=obj).select_related('group')
        return [{'id': a.group.id, 'nome': a.group.nome} for a in assignments]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer personalizado para obter tokens JWT.
    Permite login com username ou email.
    Inclui permissões efetivas do usuário + tenant_id no token e resposta.
    """

    @classmethod
    def get_token(cls, user):
        """Adiciona tenant_id como claim no JWT."""
        token = super().get_token(user)
        # Claim tenant_id — None para superusers globais
        token['tenant_id'] = str(user.tenant_id) if user.tenant_id else None
        return token

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            # Tentar autenticar com username primeiro
            user = authenticate(username=username, password=password)

            # Se não conseguiu com username, tentar com email
            if not user:
                try:
                    user_obj = User.objects.get(email=username)
                    user = authenticate(username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if user:
                if user.is_active:
                    data = super().validate(attrs)
                    # Adicionar dados do usuário + permissões na resposta
                    user_data = UserSerializer(user).data
                    # Proprietário / owner-level users get full permissions
                    # so the frontend RBAC guard never blocks them
                    if user.is_owner_level:
                        all_modules = [
                            'dashboard', 'fazendas', 'agricultura', 'pecuaria',
                            'estoque', 'maquinas', 'financeiro', 'administrativo',
                            'fiscal', 'comercial', 'user_management', 'actions',
                        ]
                        user_data['permissions'] = {
                            m: {'can_view': True, 'can_edit': True, 'can_respond': True}
                            for m in all_modules
                        }
                        # also expose is_superuser=true so frontend short-circuits faster
                        user_data['is_superuser'] = True
                    else:
                        user_data['permissions'] = user.get_effective_permissions()
                    # Grupos do usuário
                    assignments = UserGroupAssignment.objects.filter(
                        user=user
                    ).select_related('group')
                    user_data['groups'] = [
                        {'id': a.group.id, 'nome': a.group.nome}
                        for a in assignments
                    ]
                    # Dados do tenant
                    if user.tenant:
                        user_data['tenant'] = TenantMiniSerializer(user.tenant).data
                    else:
                        user_data['tenant'] = None
                    data.update({'user': user_data})
                    return data
                else:
                    raise serializers.ValidationError(
                        {'detail': 'Conta desativada.'}
                    )
            else:
                raise serializers.ValidationError(
                    {'detail': 'Credenciais inválidas.'}
                )
        else:
            raise serializers.ValidationError(
                {'detail': 'Username/email e senha são obrigatórios.'}
            )


class ModulePermissionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    module_display = serializers.CharField(source='get_module_display', read_only=True)

    class Meta:
        model = ModulePermission
        fields = [
            'id', 'user', 'user_username', 'module', 'module_display',
            'can_view', 'can_edit', 'can_respond'
        ]
        read_only_fields = ['id']

    def validate(self, data):
        # Validação para garantir que não há permissões duplicadas
        user = data.get('user')
        module = data.get('module')
        instance = self.instance

        if ModulePermission.objects.filter(user=user, module=module).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("Já existe uma permissão para este usuário e módulo.")

        return data


# ============================================================
# RBAC Serializers — Grupos, Atribuições, Delegações, Auditoria
# ============================================================


class TenantOwnerCreateSerializer(serializers.Serializer):
    """Dados do usuário proprietário criado junto com o Tenant.

    Utilizado exclusivamente em POST /api/tenants/ quando o campo
    ``initial_owner`` está presente. O usuário recebe cargo='proprietário'
    e fica vinculado ao tenant recém-criado.
    """
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')
    cargo = serializers.CharField(max_length=100, required=False, default='proprietário')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nome de usuário já está em uso.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return value


class TenantSerializer(serializers.ModelSerializer):
    """Serializer completo do Tenant para CRUD (superadmin)."""
    usuarios_count = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'nome', 'cnpj', 'cpf', 'slug', 'plano', 'ativo',
            'limite_usuarios', 'modulos_habilitados',
            'criado_em', 'atualizado_em', 'usuarios_count',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em', 'usuarios_count']

    def get_usuarios_count(self, obj):
        return obj.usuarios.filter(is_active=True).count()

    def validate_slug(self, value):
        from django.utils.text import slugify
        return slugify(value)

    def validate_cnpj(self, value):
        if not value:
            return None  # string vazia → NULL (evita violação de unique constraint)
        # Remove formatação
        digits = ''.join(filter(str.isdigit, value))
        if len(digits) != 14:
            raise serializers.ValidationError("CNPJ deve ter 14 dígitos.")
        # Verificar unicidade explicitamente para retornar 400 em vez de 500
        from apps.core.models import Tenant
        qs = Tenant.objects.filter(cnpj=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Já existe um tenant com este CNPJ.")
        return value

    def validate_cpf(self, value):
        if not value:
            return None  # string vazia → NULL (evita violação de unique constraint)
        # Remove formatação
        digits = ''.join(filter(str.isdigit, value))
        if len(digits) != 11:
            raise serializers.ValidationError("CPF deve ter 11 dígitos.")
        # Verificar unicidade explicitamente para retornar 400 em vez de 500
        from apps.core.models import Tenant
        qs = Tenant.objects.filter(cpf=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Já existe um tenant com este CPF.")
        return value

    def validate(self, attrs):
        cnpj = attrs.get('cnpj') or ''
        cpf = attrs.get('cpf') or ''
        # Para criação, exige que pelo menos um documento seja fornecido
        if self.instance is None and not cnpj and not cpf:
            raise serializers.ValidationError(
                "Informe o CNPJ ou o CPF do responsável pelo tenant."
            )
        return attrs


class GroupPermissionSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_display', read_only=True)

    class Meta:
        model = GroupPermission
        fields = ['id', 'group', 'module', 'module_display', 'can_view', 'can_edit', 'can_respond']
        read_only_fields = ['id']


class PermissionGroupSerializer(serializers.ModelSerializer):
    permissions = GroupPermissionSerializer(many=True, read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = PermissionGroup
        fields = ['id', 'nome', 'descricao', 'is_system', 'permissions', 'user_count', 'criado_em', 'atualizado_em']
        read_only_fields = ['id', 'criado_em', 'atualizado_em', 'user_count']

    def get_user_count(self, obj):
        return obj.user_assignments.count()


class PermissionGroupListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem rápida."""
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = PermissionGroup
        fields = ['id', 'nome', 'descricao', 'is_system', 'user_count']
        read_only_fields = fields

    def get_user_count(self, obj):
        return obj.user_assignments.count()


class UserGroupAssignmentSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    group_nome = serializers.CharField(source='group.nome', read_only=True)
    assigned_by_username = serializers.CharField(source='assigned_by.username', read_only=True, default=None)

    class Meta:
        model = UserGroupAssignment
        fields = ['id', 'user', 'user_username', 'group', 'group_nome', 'assigned_by', 'assigned_by_username', 'assigned_at']
        read_only_fields = ['id', 'assigned_at', 'assigned_by']

    def create(self, validated_data):
        # Preencher assigned_by com o usuário que faz a requisição
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['assigned_by'] = request.user
        return super().create(validated_data)


class DelegatedPermissionSerializer(serializers.ModelSerializer):
    from_username = serializers.CharField(source='from_user.username', read_only=True)
    to_username = serializers.CharField(source='to_user.username', read_only=True)
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = DelegatedPermission
        fields = [
            'id', 'from_user', 'from_username', 'to_user', 'to_username',
            'module', 'module_display', 'can_view', 'can_edit', 'can_respond',
            'valid_from', 'valid_until', 'is_active', 'is_expired',
            'motivo', 'criado_em',
        ]
        read_only_fields = ['id', 'criado_em', 'is_expired']

    def validate(self, data):
        if data.get('from_user') == data.get('to_user'):
            raise serializers.ValidationError("Não é possível delegar permissão para si mesmo.")
        if data.get('valid_until') and data.get('valid_from'):
            if data['valid_until'] <= data['valid_from']:
                raise serializers.ValidationError("A data de expiração deve ser posterior à data de início.")
        return data


class PermissionAuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default=None)
    target_user_username = serializers.CharField(source='target_user.username', read_only=True, default=None)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PermissionAuditLog
        fields = [
            'id', 'user', 'user_username', 'action', 'action_display',
            'target_user', 'target_user_username', 'module',
            'changes', 'ip_address', 'timestamp',
        ]
        read_only_fields = fields


class EffectivePermissionsSerializer(serializers.Serializer):
    """Serializer para resposta de permissões efetivas de um usuário."""
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    is_superuser = serializers.BooleanField()
    groups = serializers.ListField()
    permissions = serializers.DictField()
