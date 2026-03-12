"""URLs para o módulo actions (fila de aprovação)."""

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import ActionViewSet, UploadedFileViewSet, GoogleSearchAPIView

app_name = "actions"

# Use SimpleRouter to avoid DefaultRouter's API root view at "^$" which
# would intercept POST /api/actions/ before ActionViewSet can handle it.
uploads_router = SimpleRouter()
uploads_router.register(r"uploads", UploadedFileViewSet, basename="upload")

actions_router = SimpleRouter()
actions_router.register(r"", ActionViewSet, basename="action")

urlpatterns = [
    path("", include(uploads_router.urls)),
    path("", include(actions_router.urls)),
    path("isidoro-search/", GoogleSearchAPIView.as_view(), name="isidoro-search"),
]
