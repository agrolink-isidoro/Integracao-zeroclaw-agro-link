# shim to expose top-level `backend.test_urls_minimal` under the package path
import importlib, sys
try:
    real = importlib.import_module('test_urls_minimal')
    sys.modules[__name__] = real
except Exception:
    import importlib.util, os
    cur = os.path.abspath(os.path.dirname(__file__))
    candidate = os.path.join(cur, '..', 'test_urls_minimal.py')
    candidate = os.path.normpath(candidate)
    if os.path.exists(candidate):
        spec = importlib.util.spec_from_file_location('backend.test_urls_minimal', candidate)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sys.modules['backend.test_urls_minimal'] = module
        sys.modules['test_urls_minimal'] = module
        sys.modules[__name__] = module
