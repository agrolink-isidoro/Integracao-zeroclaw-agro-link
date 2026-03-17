"""URLs para o módulo actions (fila de aprovação)."""

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import ActionViewSet, UploadedFileViewSet, GoogleSearchAPIView, ChatPDFExportView, ActionSchemaView

app_name = "actions"

# Use SimpleRouter to avoid DefaultRouter's API root view at "^$" which
# would intercept POST /api/actions/ before ActionViewSet can handle it.
uploads_router = SimpleRouter()
uploads_router.register(r"uploads", UploadedFileViewSet, basename="upload")

actions_router = SimpleRouter()
actions_router.register(r"", ActionViewSet, basename="action")

urlpatterns = [
    # Schema introspection endpoints (MUST come before actions_router catch-all)
    path("schema/", ActionSchemaView.as_view(), name="schema-list"),
    path("schema/<str:action_type>/", ActionSchemaView.as_view(), name="schema-detail"),
    
    # Explicit paths MUST come before the catch-all ActionViewSet router
    # (registered at r"") whose detail pattern ^<pk>/$ would otherwise
    # swallow slugs like "chat-pdf-export" and "isidoro-search".
    path("isidoro-search/", GoogleSearchAPIView.as_view(), name="isidoro-search"),
    path("chat-pdf-export/", ChatPDFExportView.as_view(), name="chat-pdf-export"),
    
    path("", include(uploads_router.urls)),
    path("", include(actions_router.urls)),
]
