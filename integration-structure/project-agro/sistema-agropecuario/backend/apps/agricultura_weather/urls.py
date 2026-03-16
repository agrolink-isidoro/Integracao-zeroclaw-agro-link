from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WeatherForecastViewSet, WeatherAlertViewSet, CitiesSearchViewSet, FavoriteCidadeViewSet

app_name = 'agricultura_weather'

router = DefaultRouter()
router.register(r'forecasts', WeatherForecastViewSet, basename='weather-forecast')
router.register(r'alerts', WeatherAlertViewSet, basename='weather-alert')
router.register(r'cities', CitiesSearchViewSet, basename='cities-search')
router.register(r'favorite-cities', FavoriteCidadeViewSet, basename='favorite-city')

urlpatterns = [
    path('', include(router.urls)),
]
