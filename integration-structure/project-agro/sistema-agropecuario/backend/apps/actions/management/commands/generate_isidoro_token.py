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
                # is_staff=True → _is_owner_level() returns True → bypasses RBAC checks
                "is_staff": True,
                "is_superuser": False,
                "is_active": True,
                "cargo": "Agente IA (ZeroClaw/Isidoro)",
            },
        )

        # Usa a senha definida em ISIDORO_AGENT_PASSWORD (padrão: admin123).
        # Isso permite logar via UI/API com as mesmas credenciais.
        import os  # noqa: PLC0415
        agent_password = os.environ.get("ISIDORO_AGENT_PASSWORD", "admin123")

        if created:
            user.set_password(agent_password)
            user.save(update_fields=["password"])
            self.stdout.write(
                self.style.SUCCESS(f"Usuário de serviço '{service_username}' criado.")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"Usuário de serviço '{service_username}' já existe — atualizando."
                )
            )

        # Garante is_staff=True e a senha correta a cada execução,
        # independente de quando o usuário foi criado ou se a senha foi mudada.
        update_fields = []
        if not user.is_staff:
            user.is_staff = True
            update_fields.append("is_staff")
        # Sincroniza sempre a senha com ISIDORO_AGENT_PASSWORD
        user.set_password(agent_password)
        update_fields.append("password")
        if update_fields:
            user.save(update_fields=update_fields)
            self.stdout.write(self.style.SUCCESS(f"Campos atualizados: {update_fields}"))

        # Gera access token de longa duração diretamente.
        # Não usamos refresh.access_token porque esse ignora set_exp no refresh
        # e usa o ACCESS_TOKEN_LIFETIME padrão (5 min). Em vez disso, criamos
        # um AccessToken independente e sobrescrevemos o exp manualmente.
        from rest_framework_simplejwt.tokens import AccessToken  # noqa: PLC0415
        days = options["days"]
        token = AccessToken.for_user(user)
        token.set_exp(lifetime=timedelta(days=days))
        access_token = str(token)

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
