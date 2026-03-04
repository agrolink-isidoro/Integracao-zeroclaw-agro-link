from django.apps import AppConfig


class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.fiscal'
    label = 'fiscal'

    def ready(self):
        try:
            import apps.fiscal.signals
        except Exception:
            import logging
            logging.getLogger(__name__).debug('Optional fiscal signals import failed; continuing: %s', 'apps.fiscal.signals')
        # ensure certificado model is imported for migrations
        try:
            from .models_certificados import CertificadoSefaz  # noqa: F401
        except Exception:
            pass