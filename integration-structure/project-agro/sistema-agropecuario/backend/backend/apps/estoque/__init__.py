# Package shim to resolve imports for `backend.apps.estoque` and delegate to `apps.estoque` when present.
# This allows tests and imports that reference `backend.apps.*` to work in dev/test
# environments where the real package lives under `apps/`.
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.estoque')
    sys.modules[__name__] = _real
except Exception:
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'estoque', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.estoque', candidate)
        module = importlib.util.module_from_spec(spec)
        module.__file__ = candidate
        module.__package__ = 'apps.estoque'
        module.__path__ = [os.path.dirname(candidate)]
        sys.modules['apps.estoque'] = module
        sys.modules['apps.estoque'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            sys.modules.pop('apps.estoque', None)
            sys.modules.pop('apps.estoque', None)
            raise
        sys.modules[__name__] = module
    else:
        from django.apps import AppConfig

        class EstoqueConfig(AppConfig):
            default_auto_field = 'django.db.models.BigAutoField'
            name = 'apps.estoque'
            verbose_name = 'Estoque (shim)'
