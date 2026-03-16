# Minimal Django settings for very small unit test runs (no apps from project required)
from .base import *
import os

# Use in-memory sqlite to avoid external DB
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Minimal installed apps so django.setup() completes but no project apps are imported
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
]

# Allow opting-in to include light-weight project apps for focused tests.
# Set the environment flag `MINIMAL_TEST_INCLUDE_FISCAL=1` to add the fiscal app
# into INSTALLED_APPS during these minimal runs (useful for model-level tests)
if os.environ.get('MINIMAL_TEST_INCLUDE_FISCAL') == '1':
    # Include core (CustomUser) and fiscal for focused fiscal tests
    INSTALLED_APPS.append('apps.core')
    INSTALLED_APPS.append('apps.fiscal')
    # The fiscal app has a FK to comercial.Fornecedor; include a stub comercial app
    # Useful for API tests: include rest framework and admin-related contrib apps
    INSTALLED_APPS.extend([
        'rest_framework',
        'django.contrib.sessions',
        'django.contrib.messages',
        'django.contrib.admin',
    ])
    INSTALLED_APPS.append('apps.comercial')
    # Some fiscal models reference administrativo, fazendas and others; include core project apps for focused fiscal tests
    for a in ['apps.administrativo', 'apps.fazendas', 'apps.financeiro', 'apps.estoque', 'apps.maquinas', 'apps.agricultura']:
        INSTALLED_APPS.append(a)

    # Use a small urls module under 'backend' so imports resolve in minimal env
    ROOT_URLCONF = 'backend.test_urls_minimal'
    # Do not pre-import the module here; let Django import it when URL resolver is initialized
    # (pre-importing at settings load can cause import-time errors because apps/settings may
    # not be fully configured yet).

    # When core is included, use its CustomUser as the AUTH_USER_MODEL so models
    # that directly import `CustomUser` remain compatible with this minimal mode.
    AUTH_USER_MODEL = 'apps.core.CustomUser'

# Disable migrations for speed
class DisableMigrations:
    def __contains__(self, item):
        return True
    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Use the default Django User model for minimal test runs to avoid requiring
# the project's `core` app (which is not present in this constrained test mode).
AUTH_USER_MODEL = 'auth.User'

# When running minimal tests, some models include GIS fields (PointField, PolygonField)
# which require a spatial DB backend. For fast in-memory runs, replace those classes
# with lightweight stand-ins that accept GIS kwargs and behave like TextField.
try:
    import django.contrib.gis.db.models as gis_models
    from django.db import models

    class _DummyGeometryField(models.TextField):
        def __init__(self, *args, **kwargs):
            kwargs.pop('srid', None)
            kwargs.pop('geography', None)
            kwargs.pop('dim', None)
            super().__init__(*args, **kwargs)

    gis_models.PolygonField = _DummyGeometryField
    gis_models.PointField = _DummyGeometryField
    gis_models.GeometryField = _DummyGeometryField
except Exception:
    # Best-effort; if gis module isn't importable we just continue and tests
    # will raise an error only if they require the spatial backend.
    pass
