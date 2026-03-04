from django.apps import AppConfig


class MaquinasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.maquinas'
    verbose_name = 'Máquinas e Equipamentos'

    def ready(self):
        # Import signals to wire up automatic stock movements
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass
