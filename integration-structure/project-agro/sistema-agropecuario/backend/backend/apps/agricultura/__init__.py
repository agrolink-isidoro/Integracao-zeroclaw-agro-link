# Package shim to resolve imports for `backend.apps.agricultura` and delegate to `apps.agricultura` when present.
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.agricultura')
    sys.modules[__name__] = _real
except Exception:
    # Fallback: attempt to load from repository path `apps/agricultura/__init__.py`
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'agricultura', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.agricultura', candidate)
        module = importlib.util.module_from_spec(spec)
        module.__file__ = candidate
        module.__package__ = 'apps.agricultura'
        module.__path__ = [os.path.dirname(candidate)]
        # Register under both module names to keep compatibility
        sys.modules['apps.agricultura'] = module
        sys.modules['apps.agricultura'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            sys.modules.pop('apps.agricultura', None)
            sys.modules.pop('apps.agricultura', None)
            raise
        sys.modules[__name__] = module
    else:
        # Last-resort: provide minimal AppConfig so Django can still detect the app label
        from django.apps import AppConfig

        class AgriculturaConfig(AppConfig):
            default_auto_field = 'django.db.models.BigAutoField'
            name = 'apps.agricultura'
            verbose_name = 'Agricultura (shim)'
