from django.apps import AppConfig


class AgriculturaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.agricultura'

    def ready(self):
        import apps.agricultura.signals