from django.core.management.base import BaseCommand
from django.apps import apps
import os


class Command(BaseCommand):
    help = "Cria um usuário de desenvolvimento (superuser) e dados de exemplo se solicitado."

    def handle(self, *args, **options):
        username = os.getenv("DEV_SUPERUSER_USERNAME", "admin")
        email = os.getenv("DEV_SUPERUSER_EMAIL", "admin@example.com")
        password = os.getenv("DEV_SUPERUSER_PASSWORD", "admin123")
        create_demo = os.getenv("DEV_CREATE_DEMO_DATA", "").lower() in ("1", "true", "yes")
        # Enable demo data automatically when running in CI runners
        if os.getenv("CI", "").lower() == "true":
            create_demo = True

        self.stdout.write(f"DEBUG: DEV_SUPERUSER_PASSWORD env: {os.environ.get('DEV_SUPERUSER_PASSWORD')}")
        self.stdout.write(f"DEBUG: password: {password}")
        self.stdout.write(f"DEBUG: Creating user {username} with email {email}")
        self.stdout.write(f"DEBUG: Password from env: {password}")

        # Use apps.get_model para evitar import direto
        User = apps.get_model("core", "CustomUser")
        self.stdout.write(f"DEBUG: User model: {User}")

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"Usuário '{username}' já existe."))
        else:
            user = User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Usuário superuser '{username}' criado com sucesso. ID: {user.id}"))
            # Verify the user was created
            created_user = User.objects.get(username=username)
            self.stdout.write(f"DEBUG: User created with ID {created_user.id}, is_active: {created_user.is_active}")
            self.stdout.write(f"DEBUG: Password check: {created_user.check_password(password)}")

        if create_demo:
            # Criar dados mínimos: Proprietario -> Fazenda -> Area
            try:
                Proprietario = apps.get_model("fazendas", "Proprietario")
                Fazenda = apps.get_model("fazendas", "Fazenda")
                Area = apps.get_model("fazendas", "Area")

                owner, _ = Proprietario.objects.get_or_create(
                    nome="Proprietario Demo",
                    defaults={
                        "cpf_cnpj": "00000000000",
                        "telefone": "",
                        "email": "",
                        "endereco": ""
                    }
                )

                farm, created = Fazenda.objects.get_or_create(
                    proprietario=owner,
                    name="Fazenda Demo",
                    defaults={"matricula": "DEMO-001"},
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"Fazenda '{farm}' criada."))
                else:
                    self.stdout.write(self.style.WARNING(f"Fazenda '{farm}' já existe."))

                area, a_created = Area.objects.get_or_create(
                    proprietario=owner,
                    fazenda=farm,
                    name="Area Demo",
                    defaults={"tipo": "propria", "geom": None},
                )
                if a_created:
                    self.stdout.write(self.style.SUCCESS(f"Área '{area}' criada."))
                else:
                    self.stdout.write(self.style.WARNING(f"Área '{area}' já existe."))

                # Create Centro de Custo demo row (used by E2E tests)
                try:
                    CentroCusto = apps.get_model('administrativo', 'CentroCusto')
                    cc, created = CentroCusto.objects.get_or_create(
                        codigo='C001',
                        defaults={
                            'nome': 'Centro Demo',
                            'descricao': 'Centro de custo criado para testes E2E',
                            'categoria': 'administrativo',
                            'ativo': True,
                            'criado_por': user if 'user' in locals() else None
                        }
                    )
                    if created:
                        self.stdout.write(self.style.SUCCESS(f"CentroCusto '{cc}' criado."))
                    else:
                        self.stdout.write(self.style.WARNING(f"CentroCusto '{cc}' já existe."))
                except LookupError:
                    self.stdout.write(self.style.WARNING("Modelo 'CentroCusto' não encontrado; pulando criação de demo para centros de custo."))

                self.stdout.write(self.style.SUCCESS("Dados de demonstração criados com sucesso."))

                # Create minimal commercial demo data (Empresa + Despesa) to satisfy E2E expectations
                try:
                    Empresa = apps.get_model('comercial', 'Empresa')
                    DespesaPrestadora = apps.get_model('comercial', 'DespesaPrestadora')
                    from datetime import date

                    empresa, e_created = Empresa.objects.get_or_create(
                        cnpj='00.000.000/0001-91',
                        defaults={'nome': 'Empresa Demo', 'contato': 'Demo', 'endereco': 'Demo Address'}
                    )
                    if e_created:
                        self.stdout.write(self.style.SUCCESS(f"Empresa '{empresa}' criada."))
                    else:
                        self.stdout.write(self.style.WARNING(f"Empresa '{empresa}' já existe."))

                    # Create a sample despesa linked to empresa
                    try:
                        cc_instance = locals().get('cc', None)
                        # Create despesa with deterministic date to match E2E filters (e.g., periodo=2026-01)
                        desp_date = date(2026, 1, 1)
                        desp, d_created = DespesaPrestadora.objects.get_or_create(
                            empresa=empresa,
                            data=desp_date,
                            valor=0,
                            defaults={'categoria': 'outros', 'descricao': 'Despesa demo', 'centro_custo': cc_instance, 'criado_por': user if 'user' in locals() else None}
                        )
                        if d_created:
                            self.stdout.write(self.style.SUCCESS("Despesa demo criada."))
                        else:
                            self.stdout.write(self.style.WARNING("Despesa demo já existe."))
                    except Exception as dex:
                        self.stdout.write(self.style.WARNING(f"Não foi possível criar despesa demo: {dex}"))

                except LookupError:
                    self.stdout.write(self.style.WARNING("Modelo 'Empresa' ou 'DespesaPrestadora' não encontrado; pulando criação de dados comerciais de demo."))
                except Exception as exc:
                    self.stdout.write(self.style.WARNING(f"Erro ao criar dados comerciais demo: {exc}"))

            except LookupError:
                self.stdout.write(self.style.ERROR("Models 'Proprietario', 'Fazenda', or 'Area' from app 'fazendas' not found. Verify the app is installed and migrations are applied."))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"Erro ao criar dados de demo: {exc}"))
