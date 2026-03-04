"""Management command para criar tenant padrão e associar usuários.

Uso:
    # Criar tenant padrão "Fazenda Demo" e atribuir todos os usuários sem tenant
    python manage.py seed_tenant

    # Criar tenant com dados específicos
    python manage.py seed_tenant --nome "Agropecuária XYZ" --cnpj "12.345.678/0001-90" --slug "xyz"

    # Atribuir usuários existentes sem tenant ao tenant default
    python manage.py seed_tenant --assign-users
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Cria um tenant padrão e opcionalmente atribui usuários sem tenant.'

    def add_arguments(self, parser):
        parser.add_argument('--nome', default='Fazenda Demo', help='Nome do tenant')
        parser.add_argument('--cnpj', default='00.000.000/0001-00', help='CNPJ do tenant')
        parser.add_argument('--slug', default='fazenda-demo', help='Slug único do tenant')
        parser.add_argument('--plano', default='basico', choices=['basico', 'profissional', 'enterprise'], help='Plano do tenant')
        parser.add_argument('--assign-users', action='store_true', default=True,
                            help='Atribuir usuários sem tenant a este tenant (padrão: True)')
        parser.add_argument('--no-assign-users', action='store_false', dest='assign_users',
                            help='Não atribuir usuários existentes ao novo tenant')
        parser.add_argument('--force', action='store_true',
                            help='Recriar tenant mesmo se já existir com esse slug')

    def handle(self, *args, **options):
        from apps.core.models import Tenant

        nome = options['nome']
        cnpj = options['cnpj']
        slug = options['slug']
        plano = options['plano']
        assign_users = options['assign_users']
        force = options['force']

        # Verificar se já existe
        existing = Tenant.objects.filter(slug=slug).first()
        if existing:
            if not force:
                self.stdout.write(
                    self.style.WARNING(
                        f'Tenant com slug "{slug}" já existe (id={existing.id}, nome="{existing.nome}").\n'
                        f'Use --force para recriar ou --slug para usar outro slug.'
                    )
                )
                tenant = existing
            else:
                existing.delete()
                self.stdout.write(self.style.WARNING(f'Tenant "{slug}" removido (--force).'))
                tenant = None
        else:
            tenant = None

        if tenant is None:
            # Criar tenant
            tenant = Tenant.objects.create(
                nome=nome,
                cnpj=cnpj,
                slug=slug,
                plano=plano,
                ativo=True,
                modulos_habilitados=[
                    'dashboard', 'fazendas', 'agricultura', 'comercial',
                    'financeiro', 'estoque', 'maquinas', 'administrativo', 'fiscal',
                ],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Tenant criado: "{tenant.nome}" (id={tenant.id}, slug="{tenant.slug}")'
                )
            )

        if assign_users:
            # Atribuir usuários sem tenant (exceto superusers globais)
            users_sem_tenant = User.objects.filter(tenant__isnull=True, is_superuser=False)
            count = users_sem_tenant.count()
            if count:
                users_sem_tenant.update(tenant=tenant)
                self.stdout.write(
                    self.style.SUCCESS(f'✓ {count} usuário(s) atribuído(s) ao tenant "{tenant.nome}".')
                )
            else:
                self.stdout.write(self.style.NOTICE('Nenhum usuário sem tenant encontrado para atribuir.'))

        # Resumo
        total_users = User.objects.filter(tenant=tenant).count()
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('═══ Tenant configurado com sucesso ═══'))
        self.stdout.write(f'  ID:      {tenant.id}')
        self.stdout.write(f'  Nome:    {tenant.nome}')
        self.stdout.write(f'  CNPJ:    {tenant.cnpj}')
        self.stdout.write(f'  Slug:    {tenant.slug}')
        self.stdout.write(f'  Plano:   {tenant.plano}')
        self.stdout.write(f'  Usuários: {total_users}')
        self.stdout.write('')
        self.stdout.write(
            self.style.WARNING(
                'IMPORTANTE: Superusers com tenant=None têm acesso global (sem isolamento).\n'
                'Para atribuir um superuser a um tenant específico, use o admin Django ou:\n'
                f'  python manage.py shell -c "from django.contrib.auth import get_user_model; '
                f'U=get_user_model(); u=U.objects.get(username=\'admin\'); '
                f'from apps.core.models import Tenant; u.tenant=Tenant.objects.get(slug=\'{slug}\'); u.save()"'
            )
        )
