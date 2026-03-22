from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.comercial.models import Compra, Fornecedor
from apps.fiscal.models import NFe
from apps.fiscal.models_emissao import EmissaoJob
from apps.fiscal.services.sefaz_client import SefazClient
from types import SimpleNamespace
from unittest import mock
from apps.fiscal.tasks import process_emissao_job
from apps.estoque.models import Produto
from rest_framework.test import APIClient
from pathlib import Path


class CompraNFeE2ETest(TestCase):
    def setUp(self):
        from apps.core.models import Tenant
        User = get_user_model()
        
        # Create tenant
        self.tenant = Tenant.objects.create(nome='test_tenant_e2e', slug='test-tenant-e2e')
        
        self.user = User.objects.create_user(username='e2e_user', password='p', is_staff=False, tenant=self.tenant)
        self.staff = User.objects.create_user(username='staff', password='p', is_staff=True, tenant=self.tenant)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def test_full_flow_compra_to_emit_and_confirm_estoque(self):
        # Fixture XML
        xml_path = Path(__file__).parent.parent.parent / 'fiscal' / 'tests' / 'fixtures' / '52251004621697000179550010000100511374580195.xml'
        if not xml_path.exists():
            self.skipTest(f"NFe fixture XML not found: {xml_path}")

        xml_content = xml_path.read_text(encoding='utf-8')

        fornecedor = Fornecedor.objects.create(nome='Fornecedor E2E', cpf_cnpj='52251004621697', tenant=self.tenant, criado_por=self.user)

        compra = Compra.objects.create(fornecedor=fornecedor, data='2025-12-01', valor_total='100.00', criado_por=self.user, xml_content=xml_content, tenant=self.tenant)
        compra.refresh_from_db()
        self.assertIsNotNone(compra.nfe)
        nfe = NFe.objects.get(pk=compra.nfe.pk)

        # Create a product to map when confirming estoque (use get_or_create to avoid unique conflicts)
        first_item = nfe.itens.first()
        Produto.objects.get_or_create(codigo=first_item.codigo_produto, defaults={'nome': 'Prod E2E'})

        # Emission: create a job and mock SefazClient.emit to return success
        job = EmissaoJob.objects.create(nfe=nfe, status='pending')
        fake_result = SimpleNamespace(success=True, protocolo='PROTO123', status='100', data_autorizacao='2025-12-02T12:00:00Z')
        with mock.patch.object(SefazClient, 'emit', return_value=fake_result):
            res = process_emissao_job.__wrapped__(job.id)
            nfe.refresh_from_db()
            self.assertEqual(nfe.status, '100')
            self.assertEqual(nfe.protocolo_autorizacao, 'PROTO123')

        # Confirm estoque via API (staff user)
        resp = self.client.post(f'/api/fiscal/nfes/{nfe.id}/confirmar_estoque/', {'force': True}, format='json')
        self.assertEqual(resp.status_code, 200)
        nfe.refresh_from_db()
        self.assertTrue(nfe.estoque_confirmado)
        self.assertIn('movimentacoes', resp.data)
        self.assertGreaterEqual(len(resp.data.get('movimentacoes', [])), 1)
