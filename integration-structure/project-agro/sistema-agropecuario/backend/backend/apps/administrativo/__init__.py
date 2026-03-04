# Package shim to resolve imports for `backend.apps.administrativo` and delegate to `apps.administrativo` when present.
# This allows tests and imports that reference `backend.apps.*` to work in dev/test
# environments where the real package lives under `apps/`.
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.administrativo')
    sys.modules[__name__] = _real
except Exception:
    # Fallback: attempt to load from repository path `apps/administrativo/__init__.py`
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'administrativo', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.administrativo', candidate)
        module = importlib.util.module_from_spec(spec)
        module.__file__ = candidate
        module.__package__ = 'apps.administrativo'
        module.__path__ = [os.path.dirname(candidate)]
        # Register under both module names to keep compatibility
        sys.modules['apps.administrativo'] = module
        sys.modules['apps.administrativo'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            sys.modules.pop('apps.administrativo', None)
            sys.modules.pop('apps.administrativo', None)
            raise
        sys.modules[__name__] = module
    else:
        # Last-resort: provide minimal AppConfig so Django can still detect the app label
        from django.apps import AppConfig

        class AdministrativoConfig(AppConfig):
            default_auto_field = 'django.db.models.BigAutoField'
            name = 'apps.administrativo'
            verbose_name = 'Administrativo (shim)'
