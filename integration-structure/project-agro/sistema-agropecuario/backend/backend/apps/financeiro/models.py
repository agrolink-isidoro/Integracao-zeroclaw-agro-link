# shim models to delegate to real `apps.financeiro.models` so Django's app loading finds models
try:
    from apps.financeiro.models import *  # noqa: F401,F403
except Exception:
    # Best-effort: keep module importable even if the real package isn't available
    pass
