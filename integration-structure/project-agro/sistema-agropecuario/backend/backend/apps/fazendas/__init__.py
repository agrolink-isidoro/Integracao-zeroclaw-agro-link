# Package shim to resolve imports for `backend.apps.fazendas` and delegate to `apps.fazendas` when present.
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.fazendas')
    sys.modules[__name__] = _real
except Exception:
    # Fallback: attempt to load from repository path `apps/fazendas/__init__.py`
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'fazendas', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.fazendas', candidate)
        module = importlib.util.module_from_spec(spec)
        module.__file__ = candidate
        module.__package__ = 'apps.fazendas'
        module.__path__ = [os.path.dirname(candidate)]
        # Register under both module names to keep compatibility
        sys.modules['apps.fazendas'] = module
        sys.modules['apps.fazendas'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            sys.modules.pop('apps.fazendas', None)
            sys.modules.pop('apps.fazendas', None)
            raise
        sys.modules[__name__] = module
    else:
        # Last-resort: provide minimal AppConfig so Django can still detect the app label
        from django.apps import AppConfig

        class FazendasConfig(AppConfig):
            default_auto_field = 'django.db.models.BigAutoField'
            name = 'apps.fazendas'
            verbose_name = 'Fazendas (shim)'
