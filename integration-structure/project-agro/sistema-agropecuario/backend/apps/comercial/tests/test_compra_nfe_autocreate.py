from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.comercial.models import Compra
from apps.comercial.models import Fornecedor
from apps.fiscal.models import NFe
from pathlib import Path
import io

class CompraNFeAutoCreateTest(TestCase):
    def setUp(self):
        from apps.multi_tenancy.models import Tenant
        User = get_user_model()
        
        # Create tenant
        self.tenant = Tenant.objects.create(nome='test_tenant_autocreate', slug='test-tenant-autocreate')
        
        self.user = User.objects.create_user(username='compra_user', password='p', is_staff=False, tenant=self.tenant)

    def test_compra_with_xml_creates_nfe_and_links(self):
        # Use existing fixture XML if available, otherwise skip
        xml_path = Path(__file__).parent.parent.parent / 'fiscal' / 'tests' / 'fixtures' / '52251004621697000179550010000100511374580195.xml'
        if not xml_path.exists():
            self.skipTest(f"NFe fixture XML not found: {xml_path}")

        xml_content = xml_path.read_text(encoding='utf-8')

        # Create a Fornecedor minimal (signal requires it)
        fornecedor = Fornecedor.objects.create(nome='Fornecedor Teste', cpf_cnpj='52251004621697', tenant=self.tenant, criado_por=self.user)

        compra = Compra.objects.create(fornecedor=fornecedor, data='2025-12-01', valor_total='100.00', criado_por=self.user, xml_content=xml_content, tenant=self.tenant)

        # After save, signal should create NFe and link
        compra.refresh_from_db()
        self.assertIsNotNone(compra.nfe)
        nfe = NFe.objects.get(pk=compra.nfe.pk)
        self.assertTrue(nfe.chave_acesso is not None)
        self.assertEqual(nfe.fornecedor, fornecedor)

        # Valores de impostos devem ser mapeados para a compra
        compra.refresh_from_db()
        self.assertEqual(compra.valor_icms, nfe.valor_icms)
        self.assertEqual(compra.valor_pis, nfe.valor_pis)
        self.assertEqual(compra.valor_cofins, nfe.valor_cofins)
