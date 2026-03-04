from rest_framework import permissions, viewsets

from .models import Language
from .serializers import LanguageSerializer


class LanguageViewSet(viewsets.ModelViewSet):
    """Simple ViewSet for managing available languages."""

    queryset = Language.objects.all().order_by("code")
    serializer_class = LanguageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    # Return raw list for simple lookups
    pagination_class = None
