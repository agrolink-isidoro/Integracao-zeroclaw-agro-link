"""
Management command: generate_isidoro_token

Garante que o usuário de serviço "isidoro_agent" exista e emite um
JWT de longa duração (30 dias) para o Isidoro chamar a API Agrolink.

Uso:
    python manage.py generate_isidoro_token
    python manage.py generate_isidoro_token --days 90
    python manage.py generate_isidoro_token --export-env   # exibe para eval

Chamado automaticamente pelo docker-entrypoint.sh após as migrations.
O token é escrito em /tmp/isidoro_token.txt e também exibido no stdout.
"""
import secrets
from datetime import timedelta

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


class Command(BaseCommand):
    help = "Gera/renova o JWT do agente Isidoro (usuário de serviço)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Validade do token em dias (padrão: 30)",
        )
        parser.add_argument(
            "--export-env",
            action="store_true",
            default=False,
            help="Exibe o token como variável de ambiente para uso com eval",
        )

    def handle(self, *args, **options):
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
        except ImportError:
            raise CommandError(
                "djangorestframework-simplejwt não está instalado. "
                "Adicione 'djangorestframework-simplejwt' ao requirements.txt."
            )

        User = apps.get_model("core", "CustomUser")

        # Garante que o usuário de serviço existe
        service_username = "isidoro_agent"
        user, created = User.objects.get_or_create(
            username=service_username,
            defaults={
                "email": "isidoro@agrolink.internal",
                "is_staff": False,
                "is_superuser": False,
                "is_active": True,
                "cargo": "Agente IA (ZeroClaw/Isidoro)",
            },
        )

        if created:
            # Senha aleatória longa — este usuário nunca faz login com senha
            random_pw = secrets.token_urlsafe(48)
            user.set_password(random_pw)
            user.save(update_fields=["password"])
            self.stdout.write(
                self.style.SUCCESS(f"Usuário de serviço '{service_username}' criado.")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"Usuário de serviço '{service_username}' já existe — reutilizando."
                )
            )

        # Gera refresh token com vida longa
        days = options["days"]
        refresh = RefreshToken.for_user(user)

        # Sobrescreve o lifetime diretamente no payload
        refresh.set_exp(lifetime=timedelta(days=days))
        access_token = str(refresh.access_token)

        # Escreve token em arquivo temporário (lido pelo entrypoint)
        token_file = "/tmp/isidoro_token.txt"
        with open(token_file, "w") as f:
            f.write(access_token)

        if options["export_env"]:
            # Formato para uso com: eval $(python manage.py generate_isidoro_token --export-env)
            self.stdout.write(f"export ISIDORO_JWT_TOKEN={access_token}")
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Token Isidoro gerado com validade de {days} dias.\n"
                    f"Salvo em: {token_file}\n"
                    f"Token (access): {access_token}"
                )
            )
