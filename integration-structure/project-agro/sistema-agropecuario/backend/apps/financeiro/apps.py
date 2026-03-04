from django.apps import AppConfig


class FinanceiroConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.financeiro'

    def ready(self):
        # Import signals to ensure they are registered
        try:
            import apps.financeiro.signals  # noqa: F401
        except Exception:
            pass
