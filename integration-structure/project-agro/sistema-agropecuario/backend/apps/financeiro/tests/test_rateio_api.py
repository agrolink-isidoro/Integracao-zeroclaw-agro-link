from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from apps.financeiro.models import RateioCusto, RateioApproval

User = get_user_model()


class TenantTestCase(TestCase):
    """
    Classe base que fornece User + Tenant + Fazenda para testes de API.
    
    Reduz 403 Forbidden errors causados pelo middleware de multi-tenancy
    que espera user.tenant estar setado.
    """
    def setUp(self):
        super().setUp()
        from apps.core.models import Tenant
        from apps.fazendas.models import Proprietario, Fazenda
        
        # 1. Criar tenant
        self.tenant, _ = Tenant.objects.get_or_create(
            nome="test_tenant_" + self.__class__.__name__,
            defaults={"slug": f"test-{self.__class__.__name__.lower()}"}
        )
        
        # 2. Criar proprietario
        self.proprietario, _ = Proprietario.objects.get_or_create(
            tenant=self.tenant,
            nome="Test Owner",
            cpf_cnpj="00000000000",
            defaults={"email": "owner@test.local", "telefone": "11999999999"}
        )
        
        # 3. Criar fazenda
        self.fazenda, _ = Fazenda.objects.get_or_create(
            tenant=self.tenant,
            name="Test Farm",
            proprietario=self.proprietario,
            defaults={
                "localizacao": "POINT(-48.123 -15.456)",
                "area_total": 100.0,
            }
        )


class RateioApprovalAPITests(TenantTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        # Create a user representing the default authenticated API user
        self.creator = User.objects.create_user(username='creator', tenant=self.tenant)
        self.rateio = RateioCusto.objects.create(
            tenant=self.tenant,
            titulo='API Rateio',
            descricao='',
            valor_total=300.00,
            criado_por=self.creator
        )
        self.approval, _ = RateioApproval.objects.get_or_create(
            rateio=self.rateio,
            defaults={'criado_por': self.creator}
        )

    def test_non_approver_cannot_approve(self):
        user = User.objects.create_user(username='user1', tenant=self.tenant)
        self.client.force_authenticate(user)
        res = self.client.post(f'/api/financeiro/rateios-approvals/{self.approval.id}/approve/')
        self.assertEqual(res.status_code, 403)

    def test_approver_can_approve(self):
        approver = User.objects.create_user(username='approver', tenant=self.tenant)
        group, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        approver.groups.add(group)
        self.client.force_authenticate(approver)
        res = self.client.post(f'/api/financeiro/rateios-approvals/{self.approval.id}/approve/')
        self.assertEqual(res.status_code, 200)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'approved')
        self.assertEqual(self.approval.aprovado_por.username, 'approver')

    def test_admin_staff_can_approve(self):
        admin = User.objects.create_user(username='admin', is_staff=True, tenant=self.tenant)
        self.client.force_authenticate(admin)
        res = self.client.post(f'/api/financeiro/rateios-approvals/{self.approval.id}/approve/')
        self.assertEqual(res.status_code, 200)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'approved')
        self.assertEqual(self.approval.aprovado_por.username, 'admin')

    def test_admin_superuser_can_approve(self):
        su = User.objects.create_superuser(username='root', email='root@example.com', password='pass', tenant=self.tenant)
        self.client.force_authenticate(su)
        res = self.client.post(f'/api/financeiro/rateios-approvals/{self.approval.id}/approve/')
        self.assertEqual(res.status_code, 200)
        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'approved')
        self.assertEqual(self.approval.aprovado_por.username, 'root')

    def test_permissions_endpoint_non_approver(self):
        user = User.objects.create_user(username='plain', tenant=self.tenant)
        self.client.force_authenticate(user)
        res = self.client.get('/api/financeiro/rateios-approvals/permissions/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'can_approve': False, 'can_reject': False})

    def test_permissions_endpoint_approver(self):
        approver = User.objects.create_user(username='group_approver', tenant=self.tenant)
        group, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        approver.groups.add(group)
        self.client.force_authenticate(approver)
        res = self.client.get('/api/financeiro/rateios-approvals/permissions/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'can_approve': True, 'can_reject': True})

    def test_permissions_endpoint_admin_staff(self):
        admin = User.objects.create_user(username='admin2', is_staff=True, tenant=self.tenant)
        self.client.force_authenticate(admin)
        res = self.client.get('/api/financeiro/rateios-approvals/permissions/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'can_approve': True, 'can_reject': True})

    def test_permissions_endpoint_admin_superuser(self):
        su = User.objects.create_superuser(username='root2', email='root2@example.com', password='pass', tenant=self.tenant)
        self.client.force_authenticate(su)
        res = self.client.get('/api/financeiro/rateios-approvals/permissions/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'can_approve': True, 'can_reject': True})

    def test_create_rateio_and_filter_by_centrocusto(self):
        # create centro and talhao
        from apps.fazendas.models import Proprietario, Fazenda, Area, Talhao
        from apps.administrativo.models import CentroCusto
        from django.utils import timezone
        prop = Proprietario.objects.create(nome='P2', cpf_cnpj='222')
        faz = Fazenda.objects.create(proprietario=prop, name='F2', matricula='M2')
        area = Area.objects.create(proprietario=prop, fazenda=faz, name='A2', geom='POINT(0 0)')
        talhao = Talhao.objects.create(area=area, name='T2', area_size=5)
        centro = CentroCusto.objects.create(codigo='API', nome='API Centro')

        user = User.objects.create_user(username='apiuser')
        self.client.force_authenticate(user)

        payload = {
            'titulo': 'API Rateio Create',
            'descricao': 'created via api',
            'valor_total': '150.00',
            'data_rateio': timezone.now().date().isoformat(),
            'destino': 'despesa_adm',
            'centro_custo': centro.id,
            'talhoes': [talhao.id]
        }
        res = self.client.post('/api/financeiro/rateios/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        # filter
        r2 = self.client.get(f"/api/financeiro/rateios/?centro_custo={centro.id}")
        self.assertEqual(r2.status_code, 200)
        body = r2.json()
        if isinstance(body, dict):
            items = body.get('results', body.get('data', []))
        else:
            items = body
        found = any(x.get('id') == data['id'] for x in items)
        self.assertTrue(found)

    def test_create_rateio_with_origin_and_filters(self):
        from apps.agricultura.models import Plantio, Manejo
        from django.contrib.contenttypes.models import ContentType
        from django.utils import timezone
        # create base objects
        from apps.fazendas.models import Proprietario, Fazenda, Area, Talhao
        prop = Proprietario.objects.create(nome='P3', cpf_cnpj='333')
        faz = Fazenda.objects.create(proprietario=prop, name='F3', matricula='M3')
        area = Area.objects.create(proprietario=prop, fazenda=faz, name='A3', geom='POINT(0 0)')
        talhao = Talhao.objects.create(area=area, name='T3', area_size=8)
        from apps.agricultura.models import Cultura
        cultura = Cultura.objects.create(nome='Cultura3')
        plantio = Plantio.objects.create(fazenda=faz, cultura=cultura, data_plantio=timezone.now().date(), observacoes='safra3')
        manejo = Manejo.objects.create(plantio=plantio, fazenda=faz, tipo='adubacao_base', data_manejo=timezone.now().date(), custo=25)

        ct = ContentType.objects.get_for_model(Manejo)

        user = User.objects.create_user(username='apiuser2')
        self.client.force_authenticate(user)

        payload = {
            'titulo': 'Origem Rateio',
            'descricao': 'with origin',
            'valor_total': '200.00',
            'data_rateio': timezone.now().date().isoformat(),
            'destino': 'operacional',
            'safra': plantio.id,
            'driver_de_rateio': 'area',
            'origem_content_type': ct.id,
            'origem_object_id': manejo.id,
            'talhoes': [talhao.id]
        }
        res = self.client.post('/api/financeiro/rateios/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.json()

        # check detail
        r = self.client.get(f"/api/financeiro/rateios/{data['id']}/")
        self.assertEqual(r.status_code, 200)
        self.assertIn('origem_display', r.json())

        # filters
        rs = self.client.get(f"/api/financeiro/rateios/?safra={plantio.id}")
        self.assertEqual(rs.status_code, 200)
        body = rs.json()
        items = body.get('results', body) if isinstance(body, dict) else body
        self.assertTrue(any(x.get('id') == data['id'] for x in items))

        rs2 = self.client.get(f"/api/financeiro/rateios/?destino=operacional")
        self.assertEqual(rs2.status_code, 200)
        items2 = rs2.json().get('results', rs2.json()) if isinstance(rs2.json(), dict) else rs2.json()
        self.assertTrue(any(x.get('id') == data['id'] for x in items2))

        rs3 = self.client.get(f"/api/financeiro/rateios/?driver_de_rateio=area")
        self.assertEqual(rs3.status_code, 200)
        items3 = rs3.json().get('results', rs3.json()) if isinstance(rs3.json(), dict) else rs3.json()
        self.assertTrue(any(x.get('id') == data['id'] for x in items3))


class RateioUpdateApprovalAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='updater')
        self.creator = User.objects.create_user(username='creator2')
        from apps.fazendas.models import Proprietario, Fazenda, Area, Talhao
        from apps.administrativo.models import CentroCusto, DespesaAdministrativa
        from apps.agricultura.models import Plantio, Cultura
        from django.utils import timezone
        prop = Proprietario.objects.create(nome='P4', cpf_cnpj='444')
        faz = Fazenda.objects.create(proprietario=prop, name='F4', matricula='M4')
        self.area = Area.objects.create(proprietario=prop, fazenda=faz, name='A4', geom='POINT(0 0)')
        self.talhao = Talhao.objects.create(area=self.area, name='T4', area_size=4)
        self.centro = CentroCusto.objects.create(codigo='API2', nome='API Centro 2')
        self.cultura = Cultura.objects.create(nome='Cultura4')
        self.plantio = Plantio.objects.create(fazenda=faz, cultura=self.cultura, data_plantio=timezone.now().date())

        # initial rateio
        self.rateio = RateioCusto.objects.create(titulo='To Update', descricao='', valor_total=100.00, criado_por=self.creator)
        self.approval, _ = RateioApproval.objects.get_or_create(rateio=self.rateio, defaults={'criado_por': self.creator})

    def test_patch_rateio_updates_fields_and_talhoes(self):
        self.client.force_authenticate(self.user)
        payload = {
            'destino': 'despesa_adm',
            'centro_custo': self.centro.id,
            'safra': self.plantio.id,
            'driver_de_rateio': 'area',
            'talhoes': [self.talhao.id]
        }
        res = self.client.patch(f'/api/financeiro/rateios/{self.rateio.id}/', payload, format='json')
        self.assertEqual(res.status_code, 200)
        self.rateio.refresh_from_db()
        self.assertEqual(self.rateio.destino, 'despesa_adm')
        self.assertEqual(self.rateio.centro_custo.id, self.centro.id)
        self.assertEqual(self.rateio.safra.id, self.plantio.id)
        self.assertEqual(self.rateio.driver_de_rateio, 'area')
        self.assertTrue(self.rateio.talhoes.filter(id=self.talhao.id).exists())
        self.assertIsNotNone(self.rateio.area_total_hectares)

    def test_patch_driver_area_requires_talhoes(self):
        self.client.force_authenticate(self.user)
        payload = {'driver_de_rateio': 'area'}
        res = self.client.patch(f'/api/financeiro/rateios/{self.rateio.id}/', payload, format='json')
        # Expect 400 because driver=area requires talhoes
        self.assertEqual(res.status_code, 400)
        self.assertIn('talhoes', res.json())

    def test_approve_generates_vencimento_and_updates_despesa(self):
        # set rateio to despesa_adm and link a DespesaAdministrativa
        from apps.administrativo.models import DespesaAdministrativa
        from django.utils import timezone
        self.rateio.destino = 'despesa_adm'
        self.rateio.valor_total = 500.00
        self.rateio.save()
        desp = DespesaAdministrativa.objects.create(titulo='D1', valor=500.00, data=timezone.now().date(), centro=self.centro, rateio=self.rateio)
        # approve as approver
        approver = User.objects.create_user(username='approver2')
        group, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        approver.groups.add(group)

        self.client.force_authenticate(approver)
        res = self.client.post(f'/api/financeiro/rateios-approvals/{self.approval.id}/approve/')
        self.assertEqual(res.status_code, 200)

        self.approval.refresh_from_db()
        self.assertEqual(self.approval.status, 'approved')

        # Vencimento should have been created
        from apps.financeiro.models import Vencimento
        vencs = Vencimento.objects.filter(titulo__icontains='Rateio')
        self.assertTrue(vencs.exists())
        v = vencs.first()
        self.assertEqual(v.valor, self.rateio.valor_total)
        # despesa pendente_rateio should now be False
        desp.refresh_from_db()
        self.assertFalse(desp.pendente_rateio)

    def test_approve_non_financial_does_not_create_vencimento(self):
        # rateio destino operacional should not create vencimento
        from django.utils import timezone
        self.rateio.destino = 'operacional'
        self.rateio.save()
        approver = User.objects.create_user(username='approver3')
        group, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        approver.groups.add(group)
        self.client.force_authenticate(approver)
        res = self.client.post(f'/api/financeiro/rateios-approvals/{self.approval.id}/approve/')
        self.assertEqual(res.status_code, 200)
        from apps.financeiro.models import Vencimento
        self.assertFalse(Vencimento.objects.filter(titulo__icontains='Rateio').exists())
