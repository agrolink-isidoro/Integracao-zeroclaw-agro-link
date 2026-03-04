"""Compatibility shim for older import paths using `apps.*`.

Some modules and tests import `apps.<app>` while Django's INSTALLED_APPS is using
`backend.apps.<app>`. Creating this shim makes `import apps.comercial.models` resolve
to `backend.apps.comercial.models` and prevents model registration issues during tests.
"""
import sys

# Import backend.apps package and register it under the top-level name 'apps'
try:
    from backend import apps as _backend_apps
    # Expose backend.apps as the top-level apps package
    sys.modules.setdefault('apps', _backend_apps)
except Exception:
    # Fail silently; tests will report if import still fails
    pass
