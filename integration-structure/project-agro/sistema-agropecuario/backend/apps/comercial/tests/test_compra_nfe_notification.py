from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.comercial.models import Compra, Fornecedor
from apps.administrativo.models import Notificacao
from django.core import mail
from pathlib import Path

class CompraNFeNotificationTest(TestCase):
    def setUp(self):
        from apps.core.models import Tenant
        User = get_user_model()
        
        # Create tenant
        self.tenant = Tenant.objects.create(nome='test_tenant_compra', slug='test-tenant-compra')
        
        self.user = User.objects.create_user(username='compra_user', password='p', is_staff=False, tenant=self.tenant)
        from apps.core.models import Tenant
        tenant, _ = Tenant.objects.get_or_create(nome='Test Tenant ' + str(hash(self.user.username) % 10000), defaults={'subdominio': 'test' + str(hash(self.user.username) % 10000)})
        self.user.tenant = tenant
        self.user.save()

        xml_path = Path(__file__).parent.parent.parent / 'fiscal' / 'tests' / 'fixtures' / '52251004621697000179550010000100511374580195.xml'
        if not xml_path.exists():
            self.skipTest(f"NFe fixture XML not found: {xml_path}")
        self.xml_content = xml_path.read_text(encoding='utf-8')

    def test_notification_created_for_incomplete_fornecedor(self):
        fornecedor = Fornecedor.objects.create(nome='Fornecedor Incompleto', cpf_cnpj='52251004621697', criado_por=self.user, email='', endereco='', cidade='', cep='', tenant=self.tenant)
        compra = Compra.objects.create(fornecedor=fornecedor, data='2025-12-01', valor_total='100.00', criado_por=self.user, xml_content=self.xml_content, tenant=self.tenant)
        compra.refresh_from_db()

        # Notificação in-app deve ter sido criada para o usuário que criou o fornecedor
        self.assertTrue(Notificacao.objects.filter(usuario=self.user, titulo__icontains='Fornecedor Incompleto').exists())

    def test_email_sent_to_fornecedor_when_email_present(self):
        mail.outbox = []
        fornecedor = Fornecedor.objects.create(nome='Fornecedor Email', cpf_cnpj='52251004621698', criado_por=self.user, email='supplier@example.com', endereco='', cidade='', cep='', tenant=self.tenant)
        compra = Compra.objects.create(fornecedor=fornecedor, data='2025-12-01', valor_total='100.00', criado_por=self.user, xml_content=self.xml_content, tenant=self.tenant)
        compra.refresh_from_db()

        # Deve ter sido enviado e-mail ao fornecedor
        self.assertTrue(any('supplier@example.com' in r for m in mail.outbox for r in m.recipients()))
