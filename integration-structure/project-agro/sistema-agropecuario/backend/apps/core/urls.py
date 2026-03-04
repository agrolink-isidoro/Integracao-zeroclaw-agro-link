from django.urls import path
from rest_framework import routers

from .auth import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    LogoutView,
    user_profile,
    register,
)
from .views import (
    UserViewSet, ModulePermissionViewSet,
    PermissionGroupViewSet, GroupPermissionViewSet,
    UserGroupAssignmentViewSet, DelegatedPermissionViewSet,
    PermissionAuditLogViewSet, TenantViewSet,
    csrf,
)
from .health import health_check

router = routers.SimpleRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"permissions", ModulePermissionViewSet, basename="permission")
router.register(r"groups", PermissionGroupViewSet, basename="permission-group")
router.register(r"group-permissions", GroupPermissionViewSet, basename="group-permission")
router.register(r"user-groups", UserGroupAssignmentViewSet, basename="user-group")
router.register(r"delegations", DelegatedPermissionViewSet, basename="delegation")
router.register(r"audit-log", PermissionAuditLogViewSet, basename="audit-log")
router.register(r"tenants", TenantViewSet, basename="tenant")

urlpatterns = router.urls + [
    # Autenticação JWT
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/profile/", user_profile, name="user_profile"),
    path("auth/register/", register, name="register"),
    # Health check
    path("health/", health_check, name="health_check"),
    # CSRF helper: call once after login to ensure csrftoken cookie is present
    path("csrf/", csrf, name="csrf_token"),
]
