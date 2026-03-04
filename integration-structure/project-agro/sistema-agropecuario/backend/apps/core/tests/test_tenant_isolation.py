"""Tests E2E — Multi-Tenant Isolation

Cobre:
1. Tenant model (str, is_module_enabled)
2. TenantMiddleware: resolução por header / user.tenant / tenant inativo
3. TenantQuerySetMixin: filtro, superuser, perform_create, perform_update
4. Cross-tenant FK validator
5. TenantViewSet API (list, create, deactivate, reactivate, acesso negado)
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from apps.core.models import (
    CustomUser,
    PermissionGroup,
    Tenant,
)
from apps.core.middleware.tenant import TenantMiddleware
from apps.core.validators import validate_cross_tenant_fk, TenantFKValidationMixin


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tenant_a(db):
    return Tenant.objects.create(
        nome="Fazenda Alpha",
        slug="fazenda-alpha",
        plano="basico",
    )


@pytest.fixture
def tenant_b(db):
    return Tenant.objects.create(
        nome="Fazenda Beta",
        slug="fazenda-beta",
        plano="standard",
    )


@pytest.fixture
def user_a(db, tenant_a):
    u = CustomUser.objects.create_user(
        username="user_alpha",
        password="pass",
        email="alpha@example.com",
        tenant=tenant_a,
    )
    return u


@pytest.fixture
def user_b(db, tenant_b):
    u = CustomUser.objects.create_user(
        username="user_beta",
        password="pass",
        email="beta@example.com",
        tenant=tenant_b,
    )
    return u


@pytest.fixture
def superuser(db):
    return CustomUser.objects.create_superuser(
        username="god",
        password="pass",
        email="god@example.com",
    )


@pytest.fixture
def rbac_admin(db, tenant_a):
    """Usuário com cargo proprietário + superuser do tenant_a."""
    return CustomUser.objects.create_user(
        username="admin_alpha",
        password="pass",
        email="adminA@example.com",
        tenant=tenant_a,
        cargo="proprietário",
        is_staff=True,
        is_superuser=True,
    )


# ---------------------------------------------------------------------------
# 1. Tenant model
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_tenant_str(tenant_a):
    assert str(tenant_a) == "Fazenda Alpha [fazenda-alpha]"


@pytest.mark.django_db
def test_tenant_is_module_enabled_empty_list(tenant_a):
    """Sem lista → todos os módulos habilitados."""
    tenant_a.modulos_habilitados = []
    tenant_a.save()
    assert tenant_a.is_module_enabled("financeiro") is True
    assert tenant_a.is_module_enabled("fiscal") is True


@pytest.mark.django_db
def test_tenant_is_module_enabled_restricted(tenant_a):
    tenant_a.modulos_habilitados = ["financeiro", "fazendas"]
    tenant_a.save()
    assert tenant_a.is_module_enabled("financeiro") is True
    assert tenant_a.is_module_enabled("fiscal") is False


# ---------------------------------------------------------------------------
# 2. TenantMiddleware
# ---------------------------------------------------------------------------

def _make_get_response(tenant_holder):
    """Recorded response callable que captura request.tenant."""
    def get_response(request):
        tenant_holder["tenant"] = getattr(request, "tenant", "__not_set__")
        from django.http import HttpResponse
        return HttpResponse()
    return get_response


@pytest.mark.django_db
def test_middleware_resolves_via_header(tenant_a):
    holder = {}
    mw = TenantMiddleware(_make_get_response(holder))

    from django.test import RequestFactory
    rf = RequestFactory()
    req = rf.get("/", HTTP_X_TENANT_ID=str(tenant_a.pk))
    # Middleware requires request.user to be available
    req.user = type("AnonymousUser", (), {"is_authenticated": False})()

    mw(req)
    assert holder["tenant"] is not None
    assert holder["tenant"].pk == tenant_a.pk


@pytest.mark.django_db
def test_middleware_resolves_via_user_tenant(user_a, tenant_a):
    holder = {}
    mw = TenantMiddleware(_make_get_response(holder))

    from django.test import RequestFactory
    rf = RequestFactory()
    req = rf.get("/")
    req.user = user_a

    mw(req)
    assert holder["tenant"] is not None
    assert holder["tenant"].pk == tenant_a.pk


@pytest.mark.django_db
def test_middleware_inactive_tenant(tenant_a):
    """Tenant inativo → middleware retorna None (não bloqueia, deixa para a view)."""
    tenant_a.ativo = False
    tenant_a.save()

    holder = {}
    mw = TenantMiddleware(_make_get_response(holder))

    from django.test import RequestFactory
    rf = RequestFactory()
    req = rf.get("/", HTTP_X_TENANT_ID=str(tenant_a.pk))
    req.user = type("AnonymousUser", (), {"is_authenticated": False})()

    mw(req)
    assert holder["tenant"] is None


@pytest.mark.django_db
def test_middleware_unknown_tenant_id():
    """UUID inexistente → retorna None."""
    holder = {}
    mw = TenantMiddleware(_make_get_response(holder))

    from django.test import RequestFactory
    rf = RequestFactory()
    req = rf.get("/", HTTP_X_TENANT_ID="00000000-0000-0000-0000-000000000000")
    req.user = type("AnonymousUser", (), {"is_authenticated": False})()

    mw(req)
    assert holder["tenant"] is None


# ---------------------------------------------------------------------------
# 3. TenantQuerySetMixin — via PermissionGroup ViewSet (é TenantModel)
# ---------------------------------------------------------------------------

@pytest.fixture
def rbac_staff_a(db, tenant_a):
    """Usuário staff (is_staff=True, NOT is_superuser) do tenant_a."""
    return CustomUser.objects.create_user(
        username="staff_alpha",
        password="pass",
        email="staff_alpha@example.com",
        tenant=tenant_a,
        cargo="gerente",
        is_staff=True,
        is_superuser=False,
    )

@pytest.mark.django_db
def test_mixin_user_sees_only_own_tenant_groups(rbac_staff_a, tenant_a, tenant_b):
    """Usuário do tenant A não enxerga grupos do tenant B."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    PermissionGroup.objects.create(nome=f"Grupo A {uid}", tenant=tenant_a)
    PermissionGroup.objects.create(nome=f"Grupo B {uid}", tenant=tenant_b)

    client = APIClient()
    client.force_authenticate(user=rbac_staff_a)
    # Define request.tenant via header
    resp = client.get(
        "/api/groups/",
        HTTP_X_TENANT_ID=str(tenant_a.pk),
    )
    assert resp.status_code == 200
    data = resp.json()
    names = [g["nome"] for g in (data["results"] if "results" in data else data)]
    assert f"Grupo A {uid}" in names
    assert f"Grupo B {uid}" not in names


@pytest.mark.django_db
def test_mixin_superuser_can_filter_by_tenant_id_param(superuser, tenant_a, tenant_b):
    """Superuser com ?tenant_id= vê apenas aquele tenant."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    PermissionGroup.objects.create(nome=f"SuperGrupo A {uid}", tenant=tenant_a)
    PermissionGroup.objects.create(nome=f"SuperGrupo B {uid}", tenant=tenant_b)

    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.get(f"/api/groups/?tenant_id={tenant_a.pk}")
    assert resp.status_code == 200
    data = resp.json()
    names = [g["nome"] for g in (data["results"] if "results" in data else data)]
    assert f"SuperGrupo A {uid}" in names
    assert f"SuperGrupo B {uid}" not in names


@pytest.mark.django_db
def test_mixin_superuser_sees_all_without_param(superuser, tenant_a, tenant_b):
    """Superuser sem ?tenant_id= vê todos os grupos de todos os tenants."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    PermissionGroup.objects.create(nome=f"GrupoAll A {uid}", tenant=tenant_a)
    PermissionGroup.objects.create(nome=f"GrupoAll B {uid}", tenant=tenant_b)

    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.get("/api/groups/")
    assert resp.status_code == 200
    data = resp.json()
    names = [g["nome"] for g in (data["results"] if "results" in data else data)]
    assert f"GrupoAll A {uid}" in names
    assert f"GrupoAll B {uid}" in names


@pytest.mark.django_db
def test_mixin_perform_create_injects_tenant(rbac_admin, tenant_a):
    """POST /api/groups/ injeta automaticamente o tenant do request."""
    import uuid
    nome = f"Novo Grupo {uuid.uuid4().hex[:8]}"
    client = APIClient()
    client.force_authenticate(user=rbac_admin)
    resp = client.post(
        "/api/groups/",
        {"nome": nome},
        HTTP_X_TENANT_ID=str(tenant_a.pk),
    )
    assert resp.status_code == 201
    pg = PermissionGroup.objects.get(nome=nome)
    assert pg.tenant_id == tenant_a.pk


@pytest.mark.django_db
def test_mixin_perform_update_preserves_tenant(rbac_admin, tenant_a, tenant_b):
    """PATCH não consegue trocar o tenant do objeto."""
    import uuid
    pg = PermissionGroup.objects.create(nome=f"Grupo Original {uuid.uuid4().hex[:8]}", tenant=tenant_a)

    client = APIClient()
    client.force_authenticate(user=rbac_admin)
    resp = client.patch(
        f"/api/groups/{pg.pk}/",
        {"nome": f"Grupo Renomeado {uuid.uuid4().hex[:8]}", "tenant": str(tenant_b.pk)},
        HTTP_X_TENANT_ID=str(tenant_a.pk),
    )
    # O update pode retornar 200 ou 403 — mas o tenant deve permanecer tenant_a
    pg.refresh_from_db()
    assert str(pg.tenant_id) == str(tenant_a.pk)


# ---------------------------------------------------------------------------
# 4. Cross-tenant FK validator
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_validate_cross_tenant_fk_same_tenant(tenant_a):
    """Mesmos tenants → nenhuma exceção."""
    pg = PermissionGroup.objects.create(nome="FK OK", tenant=tenant_a)
    # Não deve lançar exceção
    validate_cross_tenant_fk(pg, tenant_a, field_name="permission_group")


@pytest.mark.django_db
def test_validate_cross_tenant_fk_mismatch(tenant_a, tenant_b):
    """Tenants diferentes → ValidationError."""
    from rest_framework.exceptions import ValidationError
    pg = PermissionGroup.objects.create(nome="FK Mismatch", tenant=tenant_b)
    with pytest.raises(ValidationError) as exc_info:
        validate_cross_tenant_fk(pg, tenant_a, field_name="permission_group")
    assert "permission_group" in exc_info.value.detail


@pytest.mark.django_db
def test_validate_cross_tenant_fk_none_obj(tenant_a):
    """Objeto None → sem validação (campo opcional)."""
    validate_cross_tenant_fk(None, tenant_a, field_name="some_field")


@pytest.mark.django_db
def test_validate_cross_tenant_fk_superuser_no_tenant(tenant_b):
    """Quando tenant esperado é None (superuser global) → skip."""
    pg = PermissionGroup.objects.create(nome="SU Skip", tenant=tenant_b)
    validate_cross_tenant_fk(pg, None, field_name="any")


# ---------------------------------------------------------------------------
# 5. TenantViewSet API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_tenant_viewset_list_as_superuser(superuser, tenant_a, tenant_b):
    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.get("/api/tenants/")
    assert resp.status_code == 200
    data = resp.json()
    items = data["results"] if "results" in data else data
    slugs = [t["slug"] for t in items]
    assert "fazenda-alpha" in slugs
    assert "fazenda-beta" in slugs


@pytest.mark.django_db
def test_tenant_viewset_list_forbidden_for_regular_user(user_a):
    client = APIClient()
    client.force_authenticate(user=user_a)
    resp = client.get("/api/tenants/")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_tenant_viewset_create(superuser):
    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.post("/api/tenants/", {
        "nome": "Novo Tenant",
        "slug": "novo-tenant",
        "plano": "basico",
    }, format="json")
    assert resp.status_code == 201
    assert Tenant.objects.filter(slug="novo-tenant").exists()


@pytest.mark.django_db
def test_tenant_viewset_soft_delete(superuser, tenant_a):
    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.delete(f"/api/tenants/{tenant_a.pk}/")
    assert resp.status_code == 200
    tenant_a.refresh_from_db()
    assert tenant_a.ativo is False


@pytest.mark.django_db
def test_tenant_viewset_reativar(superuser, tenant_a):
    tenant_a.ativo = False
    tenant_a.save()

    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.post(f"/api/tenants/{tenant_a.pk}/reativar/")
    assert resp.status_code == 200
    tenant_a.refresh_from_db()
    assert tenant_a.ativo is True


@pytest.mark.django_db
def test_tenant_viewset_filter_ativo(superuser, tenant_a, tenant_b):
    """?ativo=false retorna apenas tenants inativos."""
    tenant_b.ativo = False
    tenant_b.save()

    client = APIClient()
    client.force_authenticate(user=superuser)
    resp = client.get("/api/tenants/?ativo=false")
    assert resp.status_code == 200
    data = resp.json()
    items = data["results"] if "results" in data else data
    slugs = [t["slug"] for t in items]
    assert "fazenda-beta" in slugs
    assert "fazenda-alpha" not in slugs


@pytest.mark.django_db
def test_tenant_viewset_unauthenticated():
    client = APIClient()
    resp = client.get("/api/tenants/")
    assert resp.status_code == 401
