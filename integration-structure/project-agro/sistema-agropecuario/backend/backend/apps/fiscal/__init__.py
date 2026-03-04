# Package shim to expose the real fiscal app (located at ../apps/fiscal)
# Attempt to import `apps.fiscal` if available; otherwise load from the
# repository path so that imports like `apps.fiscal` resolve
# reliably in constrained test environments.
import importlib
import importlib.util
import os
import sys

try:
    _real = importlib.import_module('apps.fiscal')
    sys.modules[__name__] = _real
except Exception:
    # Fallback: load the package from the repository `apps/fiscal/__init__.py`
    # Try to find the package by walking up the filesystem hierarchy.
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = None
    for _ in range(6):
        p = os.path.join(cur, 'apps', 'fiscal', '__init__.py')
        if os.path.exists(p):
            candidate = p
            break
        cur = os.path.dirname(cur)

    if candidate:
        spec = importlib.util.spec_from_file_location('apps.fiscal', candidate)
        module = importlib.util.module_from_spec(spec)
        # Prepare module metadata so imports of submodules (e.g. .models) work
        module.__file__ = candidate
        module.__package__ = 'apps.fiscal'
        module.__path__ = [os.path.dirname(candidate)]
        # Insert module in sys.modules before executing to prevent recursion
        sys.modules['apps.fiscal'] = module
        sys.modules['apps.fiscal'] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            # cleanup on failure
            sys.modules.pop('apps.fiscal', None)
            sys.modules.pop('apps.fiscal', None)
            raise
        # expose the loaded module under this shim's name as well
        sys.modules[__name__] = module
    else:
        raise ImportError('Could not locate apps.fiscal package')
