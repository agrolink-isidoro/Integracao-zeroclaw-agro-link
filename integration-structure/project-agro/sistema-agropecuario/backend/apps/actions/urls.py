"""URLs para o módulo actions (fila de aprovação)."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ActionViewSet, UploadedFileViewSet

app_name = "actions"

# Uploads router must be included FIRST so that "uploads/" is matched
# before ActionViewSet's generic "^(?P<pk>[^/.]+)/$" pattern.
uploads_router = DefaultRouter()
uploads_router.register(r"uploads", UploadedFileViewSet, basename="upload")

actions_router = DefaultRouter()
actions_router.register(r"", ActionViewSet, basename="action")

urlpatterns = [
    path("", include(uploads_router.urls)),
    path("", include(actions_router.urls)),
]
