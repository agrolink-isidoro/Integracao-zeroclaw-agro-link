"""Tests E2E — RBAC (Role-Based Access Control)

Cobre:
1. CustomUser.is_owner_level (superuser, cargo, regular)
2. CustomUser.get_effective_permissions (individual, grupo, delegação)
3. CustomUser.has_module_permission
4. DelegatedPermission.is_expired / save() guarda via_user reference
5. PermissionGroup API CRUD
6. UserGroupAssignment API
7. ModulePermission API
8. Acesso negado para usuários sem permissão nos endpoints RBAC
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import (
    CustomUser,
    DelegatedPermission,
    GroupPermission,
    ModulePermission,
    PermissionGroup,
    Tenant,
    UserGroupAssignment,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tenant(db):
    return Tenant.objects.create(
        nome="Fazenda Teste RBAC",
        slug="fazenda-rbac",
        plano="premium",
    )


@pytest.fixture
def owner(db, tenant):
    return CustomUser.objects.create_user(
        username="dono",
        password="pass",
        email="dono@example.com",
        tenant=tenant,
        cargo="proprietário",
        is_staff=True,
    )


@pytest.fixture
def regular_user(db, tenant):
    return CustomUser.objects.create_user(
        username="regular",
        password="pass",
        email="regular@example.com",
        tenant=tenant,
        cargo="operador",
    )


@pytest.fixture
def superuser(db):
    return CustomUser.objects.create_superuser(
        username="super",
        password="pass",
        email="super@example.com",
    )


@pytest.fixture
def perm_group(db, tenant):
    import uuid
    return PermissionGroup.objects.create(
        nome=f"Gerente Operacional {uuid.uuid4().hex[:8]}",
        descricao="Acesso completo operacional",
        tenant=tenant,
    )


# ---------------------------------------------------------------------------
# 1. is_owner_level
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_is_owner_level_for_superuser(superuser):
    assert superuser.is_owner_level is True


@pytest.mark.django_db
def test_is_owner_level_for_staff(owner):
    assert owner.is_owner_level is True


@pytest.mark.django_db
def test_is_owner_level_for_proprietario_cargo(tenant):
    for cargo in ("proprietário", "proprietario", "owner", "admin"):
        u = CustomUser.objects.create_user(
            username=f"car_{cargo}", password="p", email=f"{cargo}@x.com",
            tenant=tenant, cargo=cargo,
        )
        assert u.is_owner_level is True, f"cargo={cargo} should be owner-level"


@pytest.mark.django_db
def test_is_owner_level_false_for_regular(regular_user):
    assert regular_user.is_owner_level is False


# ---------------------------------------------------------------------------
# 2. get_effective_permissions — permissões individuais
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_individual_module_permission(regular_user):
    ModulePermission.objects.create(
        user=regular_user,
        module="financeiro",
        can_view=True,
        can_edit=False,
        can_respond=False,
    )
    perms = regular_user.get_effective_permissions()
    assert perms["financeiro"]["can_view"] is True
    assert perms["financeiro"]["can_edit"] is False


@pytest.mark.django_db
def test_no_permissions_returns_empty(regular_user):
    perms = regular_user.get_effective_permissions()
    assert "financeiro" not in perms


# ---------------------------------------------------------------------------
# 3. get_effective_permissions — via grupo
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_group_permission_merged(regular_user, perm_group):
    GroupPermission.objects.create(
        group=perm_group,
        module="estoque",
        can_view=True,
        can_edit=True,
        can_respond=False,
    )
    UserGroupAssignment.objects.create(user=regular_user, group=perm_group)

    perms = regular_user.get_effective_permissions()
    assert perms["estoque"]["can_view"] is True
    assert perms["estoque"]["can_edit"] is True
    assert perms["estoque"]["can_respond"] is False


@pytest.mark.django_db
def test_individual_and_group_permissions_merged_by_or(regular_user, perm_group):
    """Uma fonte concede can_edit=True; outra False → resultado é True (OR)."""
    ModulePermission.objects.create(
        user=regular_user,
        module="agricultura",
        can_view=True,
        can_edit=False,
        can_respond=False,
    )
    GroupPermission.objects.create(
        group=perm_group,
        module="agricultura",
        can_view=False,
        can_edit=True,  # grupo concede edição
        can_respond=False,
    )
    UserGroupAssignment.objects.create(user=regular_user, group=perm_group)

    perms = regular_user.get_effective_permissions()
    assert perms["agricultura"]["can_view"] is True   # do individual
    assert perms["agricultura"]["can_edit"] is True   # do grupo
    assert perms["agricultura"]["can_respond"] is False


# ---------------------------------------------------------------------------
# 4. get_effective_permissions — delegação ativa
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_delegated_permission_active(regular_user, owner):
    now = timezone.now()
    DelegatedPermission.objects.create(
        from_user=owner,
        to_user=regular_user,
        module="fiscal",
        can_view=True,
        can_edit=False,
        can_respond=True,
        is_active=True,
        valid_from=now - timedelta(hours=1),
        valid_until=now + timedelta(hours=1),
    )

    perms = regular_user.get_effective_permissions()
    assert "fiscal" in perms
    assert perms["fiscal"]["can_view"] is True
    assert perms["fiscal"]["can_respond"] is True


@pytest.mark.django_db
def test_delegated_permission_expired_not_included(regular_user, owner):
    now = timezone.now()
    dp = DelegatedPermission.objects.create(
        from_user=owner,
        to_user=regular_user,
        module="comercial",
        can_view=True,
        can_edit=False,
        can_respond=False,
        is_active=True,
        valid_from=now - timedelta(hours=2),
        valid_until=now - timedelta(hours=1),  # já expirou
    )
    assert dp.is_expired is True

    perms = regular_user.get_effective_permissions()
    # Delegação expirada não deve aparecer
    assert "comercial" not in perms or not perms.get("comercial", {}).get("can_view")


@pytest.mark.django_db
def test_delegated_permission_inactive_not_included(regular_user, owner):
    now = timezone.now()
    DelegatedPermission.objects.create(
        from_user=owner,
        to_user=regular_user,
        module="maquinas",
        can_view=True,
        can_edit=True,
        can_respond=True,
        is_active=False,  # desativada manualmente
        valid_from=now - timedelta(hours=1),
        valid_until=now + timedelta(hours=1),
    )
    perms = regular_user.get_effective_permissions()
    assert "maquinas" not in perms


# ---------------------------------------------------------------------------
# 5. DelegatedPermission.is_expired
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_is_expired_true(regular_user, owner):
    now = timezone.now()
    dp = DelegatedPermission.objects.create(
        from_user=owner,
        to_user=regular_user,
        module="dashboard",
        can_view=True,
        can_edit=False,
        can_respond=False,
        is_active=True,
        valid_from=now - timedelta(days=2),
        valid_until=now - timedelta(days=1),
    )
    assert dp.is_expired is True


@pytest.mark.django_db
def test_is_expired_false(regular_user, owner):
    now = timezone.now()
    dp = DelegatedPermission.objects.create(
        from_user=owner,
        to_user=regular_user,
        module="dashboard",
        can_view=True,
        can_edit=False,
        can_respond=False,
        is_active=True,
        valid_from=now - timedelta(hours=1),
        valid_until=now + timedelta(hours=1),
    )
    assert dp.is_expired is False


# ---------------------------------------------------------------------------
# 6. has_module_permission
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_has_module_permission_owner_bypass(owner):
    """Proprietário sempre tem acesso sem precisar de permissão explícita."""
    assert owner.has_module_permission("financeiro", "can_view") is True
    assert owner.has_module_permission("fiscal", "can_edit") is True


@pytest.mark.django_db
def test_has_module_permission_superuser_bypass(superuser):
    assert superuser.has_module_permission("qualquer_modulo", "can_edit") is True


@pytest.mark.django_db
def test_has_module_permission_denied_without_perm(regular_user):
    assert regular_user.has_module_permission("financeiro", "can_view") is False


@pytest.mark.django_db
def test_has_module_permission_granted_via_individual(regular_user):
    ModulePermission.objects.create(
        user=regular_user,
        module="fazendas",
        can_view=True,
        can_edit=False,
        can_respond=False,
    )
    assert regular_user.has_module_permission("fazendas", "can_view") is True
    assert regular_user.has_module_permission("fazendas", "can_edit") is False


# ---------------------------------------------------------------------------
# 7. PermissionGroup API (CRUD)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_permission_group_list_as_owner(owner, tenant):
    import uuid
    uid = uuid.uuid4().hex[:8]
    PermissionGroup.objects.create(nome=f"Grupo Lista {uid}", tenant=tenant)
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.get("/api/groups/", HTTP_X_TENANT_ID=str(tenant.pk))
    assert resp.status_code == 200
    data = resp.json()
    names = [g["nome"] for g in (data["results"] if "results" in data else data)]
    assert f"Grupo Lista {uid}" in names


@pytest.mark.django_db
def test_permission_group_create_as_owner(owner, tenant):
    import uuid
    nome = f"Grupo Criado {uuid.uuid4().hex[:8]}"
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.post(
        "/api/groups/",
        {"nome": nome},
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 201
    assert PermissionGroup.objects.filter(nome=nome).exists()


@pytest.mark.django_db
def test_permission_group_create_denied_for_regular(regular_user, tenant):
    import uuid
    client = APIClient()
    client.force_authenticate(user=regular_user)
    resp = client.post(
        "/api/groups/",
        {"nome": f"Nao Autorizado {uuid.uuid4().hex[:8]}"},
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_permission_group_update_as_owner(owner, perm_group, tenant):
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.patch(
        f"/api/groups/{perm_group.pk}/",
        {"descricao": "Atualizado via teste"},
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 200
    perm_group.refresh_from_db()
    assert perm_group.descricao == "Atualizado via teste"


@pytest.mark.django_db
def test_permission_group_delete_non_system(owner, tenant):
    import uuid
    pg = PermissionGroup.objects.create(
        nome=f"Deletável {uuid.uuid4().hex[:8]}", tenant=tenant, is_system=False,
    )
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.delete(
        f"/api/groups/{pg.pk}/",
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 204
    assert not PermissionGroup.objects.filter(pk=pg.pk).exists()


@pytest.mark.django_db
def test_permission_group_delete_system_blocked(owner, tenant):
    """Grupos de sistema retornam 400 ao tentar deletar."""
    import uuid
    pg = PermissionGroup.objects.create(
        nome=f"Sistema Protegido {uuid.uuid4().hex[:8]}", tenant=tenant, is_system=True,
    )
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.delete(
        f"/api/groups/{pg.pk}/",
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 400  # view retorna 400 para grupos de sistema
    assert PermissionGroup.objects.filter(pk=pg.pk).exists()


# ---------------------------------------------------------------------------
# 8. UserGroupAssignment API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_assign_user_to_group(owner, regular_user, perm_group, tenant):
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.post(
        "/api/user-groups/",
        {"user": regular_user.pk, "group": perm_group.pk},
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 201
    assert UserGroupAssignment.objects.filter(
        user=regular_user, group=perm_group
    ).exists()


@pytest.mark.django_db
def test_assign_user_to_group_denied_for_regular(regular_user, perm_group, tenant):
    import uuid
    uid = uuid.uuid4().hex[:8]
    other = CustomUser.objects.create_user(
        username=f"outro_{uid}", password="p", email=f"outro_{uid}@x.com", tenant=tenant,
    )
    client = APIClient()
    client.force_authenticate(user=regular_user)
    resp = client.post(
        "/api/user-groups/",
        {"user": other.pk, "group": perm_group.pk},
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# 9. ModulePermission API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_module_permission_create(owner, regular_user, tenant):
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.post(
        "/api/permissions/",
        {
            "user": regular_user.pk,
            "module": "financeiro",
            "can_view": True,
            "can_edit": False,
            "can_respond": False,
        },
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 201
    assert ModulePermission.objects.filter(
        user=regular_user, module="financeiro"
    ).exists()


@pytest.mark.django_db
def test_module_permission_list_as_owner(owner, regular_user, tenant):
    ModulePermission.objects.create(
        user=regular_user, module="estoque",
        can_view=True, can_edit=False, can_respond=False,
    )
    client = APIClient()
    client.force_authenticate(user=owner)
    resp = client.get(
        "/api/permissions/",
        HTTP_X_TENANT_ID=str(tenant.pk),
    )
    assert resp.status_code == 200
