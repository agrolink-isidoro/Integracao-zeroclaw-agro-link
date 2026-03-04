# Package shim to resolve imports for `backend.apps.i18n` and delegate to `apps.i18n` when present.
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.i18n')
    sys.modules[__name__] = _real
except Exception:
    # Fallback: attempt to load from repository path `apps/i18n/__init__.py`
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'i18n', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.i18n', candidate)
        module = importlib.util.module_from_spec(spec)
        module.__file__ = candidate
        module.__package__ = 'apps.i18n'
        module.__path__ = [os.path.dirname(candidate)]
        # Register under both module names to keep compatibility
        sys.modules['apps.i18n'] = module
        sys.modules['apps.i18n'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            sys.modules.pop('apps.i18n', None)
            sys.modules.pop('apps.i18n', None)
            raise
        sys.modules[__name__] = module
    else:
        # Last-resort: provide minimal AppConfig so Django can still detect the app label
        from django.apps import AppConfig

        class I18nConfig(AppConfig):
            default_auto_field = 'django.db.models.BigAutoField'
            name = 'apps.i18n'
            verbose_name = 'Internationalization (shim)'
