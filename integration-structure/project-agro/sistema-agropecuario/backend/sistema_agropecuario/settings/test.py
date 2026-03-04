from .base import *

import os

# Allow using an in-memory SQLite DB for local test runs by setting
# environment variable USE_SQLITE_FOR_TESTS=1. This avoids requiring a local
# Postgres/PostGIS instance for simple unit tests.
if os.getenv('USE_SQLITE_FOR_TESTS') == '1':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }

    # Avoid running migrations (and PostGIS requirements) for quick local tests
    class DisableMigrations:
        def __contains__(self, item):
            return True
        def __getitem__(self, item):
            return None

    MIGRATION_MODULES = DisableMigrations()

    # Use SQLite for quick local tests and avoid spatial backend
    # Also remove GIS-related apps from INSTALLED_APPS to avoid PostGIS requirements in this mode
    INSTALLED_APPS = [app for app in INSTALLED_APPS if app not in ['django.contrib.gis', 'rest_framework_gis']]

    import django.contrib.gis.db.models as gis_models
    from django.db import models

    # Replace GIS field classes with simple TextField-based stand-ins to avoid
    # requiring a spatial backend during quick sqlite-based tests. Using
    # class-based stand-ins preserves `isinstance` semantics used by Django.
    class _DummyGeometryField(models.TextField):
        def __init__(self, *args, **kwargs):
            # Accept and ignore GIS-specific kwargs like `srid`, `geography` and `dim`
            kwargs.pop('srid', None)
            kwargs.pop('geography', None)
            kwargs.pop('dim', None)
            super().__init__(*args, **kwargs)

    gis_models.PolygonField = _DummyGeometryField
    gis_models.PointField = _DummyGeometryField
    gis_models.GeometryField = _DummyGeometryField

# Allow a minimal app set to run unit tests quickly in constrained/local container
if os.getenv('MINIMAL_DJANGO_APPS') == '1':
    INSTALLED_APPS = [
        "django.contrib.admin",
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
        "django.contrib.staticfiles",
        "apps.i18n",
        "apps.core",
        "apps.fiscal",
        # include comercial stub to satisfy FK dependencies in fiscal models
        "apps.comercial",
    ]
else:
    # Prefer an explicit DATABASE_URL for tests if provided (eg. postgres://user:pass@host:port/db)
    DATABASE_URL = os.getenv('DATABASE_URL')
    if DATABASE_URL:
        try:
            import re

            m = re.match(r"(?P<scheme>[^:]+)://(?P<user>[^:]+):(?P<pass>[^@]+)@(?P<host>[^:/]+)(:(?P<port>\d+))?/(?P<db>.+)", DATABASE_URL)
            if m:
                groups = m.groupdict()
                DATABASES = {
                    'default': {
                        'ENGINE': 'django.contrib.gis.db.backends.postgis',
                        'NAME': groups.get('db'),
                        'USER': groups.get('user'),
                        'PASSWORD': groups.get('pass'),
                        'HOST': groups.get('host'),
                        'PORT': groups.get('port') or '5432',
                    }
                }
            else:
                # Fallback to environment variables if parsing fails
                DATABASES = {
                    'default': {
                        'ENGINE': 'django.contrib.gis.db.backends.postgis',
                        'NAME': os.getenv('TEST_DB_NAME', 'test_agro_db'),
                        'USER': os.getenv('TEST_DB_USER', 'agro_user'),
                        'PASSWORD': os.getenv('TEST_DB_PASSWORD', 'secret_password'),
                        'HOST': os.getenv('DB_HOST', 'localhost'),
                        'PORT': os.getenv('DB_PORT', '5435'),
                    }
                }
        except Exception:
            DATABASES = {
                'default': {
                    'ENGINE': 'django.contrib.gis.db.backends.postgis',
                    'NAME': os.getenv('TEST_DB_NAME', 'test_agro_db'),
                    'USER': os.getenv('TEST_DB_USER', 'agro_user'),
                    'PASSWORD': os.getenv('TEST_DB_PASSWORD', 'secret_password'),
                    'HOST': os.getenv('DB_HOST', 'localhost'),
                    'PORT': os.getenv('DB_PORT', '5433'),
                }
            }
    else:
        DATABASES = {
            'default': {
                'ENGINE': 'django.contrib.gis.db.backends.postgis',
                'NAME': os.getenv('TEST_DB_NAME', 'test_agro_db'),
                'USER': os.getenv('TEST_DB_USER', 'agro_user'),
                'PASSWORD': os.getenv('TEST_DB_PASSWORD', 'secret_password'),
                'HOST': os.getenv('DB_HOST', 'localhost'),
                'PORT': os.getenv('DB_PORT', '5435'),
            }
        }

