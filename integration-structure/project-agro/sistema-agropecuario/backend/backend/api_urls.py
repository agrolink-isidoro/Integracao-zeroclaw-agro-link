# shim to expose top-level `backend.api_urls` to the package-based import loader
import importlib, sys
try:
    real = importlib.import_module('api_urls')
    sys.modules[__name__] = real
except Exception:
    # Fallback: try to load from file in parent directory
    import importlib.util, os
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = os.path.join(cur, '..', 'api_urls.py')
    candidate = os.path.normpath(candidate)
    if os.path.exists(candidate):
        spec = importlib.util.spec_from_file_location('backend.api_urls', candidate)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sys.modules['backend.api_urls'] = module
        sys.modules['api_urls'] = module
        sys.modules[__name__] = module
