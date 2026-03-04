# Package shim to resolve imports for `backend.apps.financeiro` and delegate to `apps.financeiro` when present.
# This mirrors the approach used for other app shims (administrativo/estoque).
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.financeiro')
    sys.modules[__name__] = _real
except Exception:
    # Fallback: attempt to load from repository path `apps/financeiro/__init__.py`
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'financeiro', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.financeiro', candidate)
        module = importlib.util.module_from_spec(spec)
        module.__file__ = candidate
        module.__package__ = 'apps.financeiro'
        module.__path__ = [os.path.dirname(candidate)]
        # Register under both module names to keep compatibility
        sys.modules['apps.financeiro'] = module
        sys.modules['apps.financeiro'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            sys.modules.pop('apps.financeiro', None)
            sys.modules.pop('apps.financeiro', None)
            raise
        sys.modules[__name__] = module
    else:
        # Last-resort: provide minimal AppConfig so Django can still detect the app label
        from django.apps import AppConfig

        class FinanceiroConfig(AppConfig):
            default_auto_field = 'django.db.models.BigAutoField'
            name = 'apps.financeiro'
            verbose_name = 'Financeiro (shim)'
