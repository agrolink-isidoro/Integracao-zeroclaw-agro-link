from rest_framework import routers

from .views import LanguageViewSet

router = routers.SimpleRouter()
router.register(r"languages", LanguageViewSet, basename="language")

urlpatterns = router.urls
