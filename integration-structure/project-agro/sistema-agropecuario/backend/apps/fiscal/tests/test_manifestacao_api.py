from rest_framework.test import APIClient
from django.test import TestCase
from django.urls import reverse
from apps.fiscal.models import NFe
from apps.fiscal.models_manifestacao import Manifestacao
from apps.fiscal.models_certificados import CertificadoSefaz
from django.utils import timezone
from django.contrib.auth import get_user_model
from unittest import mock
from datetime import timedelta

User = get_user_model()


from django.test import override_settings


class TenantTestCase(TestCase):
    """
    Classe base que fornece User + Tenant + Fazenda para testes de API.
    
    Reduz 403 Forbidden errors causados pelo middleware de multi-tenancy
    que espera user.tenant estar setado.
    
    Atributos disponíveis no setUp:
        self.user: Usuario autenticado com tenant
        self.fazenda: Fazenda criada no tenant
        self.client: APIClient authenticado
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
        
        # 3. Criar user com tenant (isso resolve 403!)
        self.user = User.objects.create(
            username=f'user_{self.__class__.__name__}',
            email='user@test.local',
            tenant=self.tenant
        )
        
        # 4. Criar fazenda
        self.fazenda, _ = Fazenda.objects.get_or_create(
            tenant=self.tenant,
            name="Test Farm",
            proprietario=self.proprietario,
            defaults={
                
            }
        )
        
        # 5. Criar client autenticado
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)


@override_settings(FISCAL_MANIFESTACAO_ENABLED=True)
class ManifestacaoAPITest(TenantTestCase):
    def setUp(self):
        super().setUp()
        # Create a user representing the default authenticated API user and
        # make them the destinatário for the NFe to keep legacy tests passing
        self.nfe = NFe.objects.create(
            chave_acesso='9'*44,
            numero='1',
            serie='1',
            modelo='55',
            data_emissao=timezone.now(),
            data_saida=timezone.now(),
            natureza_operacao='Teste',
            tipo_operacao='0',
            destino_operacao='1',
            municipio_fato_gerador='1234567',
            tipo_impressao='1',
            tipo_emissao='1',
            finalidade='1',
            indicador_consumidor_final='0',
            indicador_presenca='0',
            versao_processo='1',
            emitente_nome='Emitente',
            destinatario_nome='Dest',
            destinatario_email=self.user.email,
            valor_produtos='0',
            valor_nota='0',
            tenant=self.tenant
        )

    def test_post_manifestacao_creates_and_enqueues(self):
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
            self.assertEqual(resp.status_code, 201)
            body = resp.json()
            self.assertIn('manifestacao', body)
            self.assertTrue(body.get('enqueued') is not None)
            self.assertEqual(Manifestacao.objects.count(), 1)
            # audit created
            from apps.fiscal.models_certificados import CertificadoActionAudit
            audits = CertificadoActionAudit.objects.filter(action='manifestacao')
            self.assertGreater(audits.count(), 0)

    def test_post_manifestacao_validation_missing_motivo(self):
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'nao_realizada'}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'motivo' for bf in body.get('bad_fields', [])))

    def test_post_manifestacao_validation_temporal_ciencia(self):
        # Set data_emissao older than 11 days to trigger ciencia deadline rejection
        self.nfe.data_emissao = timezone.now() - timezone.timedelta(days=11)
        self.nfe.save()
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'tipo' for bf in body.get('bad_fields', [])))

    def test_post_manifestacao_validation_temporal_conclusivo(self):
        # Set data_emissao older than 181 days to trigger conclusivo deadline rejection
        self.nfe.data_emissao = timezone.now() - timezone.timedelta(days=181)
        self.nfe.save()
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'confirmacao'}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'tipo' for bf in body.get('bad_fields', [])))

    def test_post_manifestacao_validation_motivo_length(self):
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        # motivo too short
        resp = self.client.post(url, {'tipo': 'nao_realizada', 'motivo': 'short'}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'motivo' for bf in body.get('bad_fields', [])))

        # motivo too long
        long_motivo = 'x' * 300
        resp = self.client.post(url, {'tipo': 'nao_realizada', 'motivo': long_motivo}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'motivo' for bf in body.get('bad_fields', [])))

        # motivo valid length
        valid = 'x' * 15
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'nao_realizada', 'motivo': valid}, format='json')
            self.assertEqual(resp.status_code, 201)

    def test_post_manifestacao_block_ciencia_after_conclusive(self):
        # create a conclusive manifestation first
        Manifestacao.objects.create(tenant=self.tenant, nfe=self.nfe, tipo='confirmacao', status_envio='sent', criado_por=self.user)
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'tipo' for bf in body.get('bad_fields', [])))

    def test_post_manifestacao_reject_more_than_two(self):
        # create two prior conclusive manifestations
        Manifestacao.objects.create(tenant=self.tenant, nfe=self.nfe, tipo='confirmacao', status_envio='sent', criado_por=self.user)
        Manifestacao.objects.create(tenant=self.tenant, nfe=self.nfe, tipo='confirmacao', status_envio='sent', criado_por=self.user)
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'confirmacao'}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'tipo' for bf in body.get('bad_fields', [])))

    def test_manifestacao_authorization_restricted(self):
        """Authenticated users who are not recipient, staff, or have module permission must be 403'd."""
        # create an authenticated user without special permissions
        other = User.objects.create(tenant=self.tenant, is_staff=False, is_superuser=False, username='otheruser', email='other@example.com')
        self.client.force_authenticate(user=other)
        print("OTHER USER IN TEST:", other.username, other.is_staff, other.is_superuser)
        url = f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/'
        resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_manifestacao_recipient_allowed(self):
        """User with email equal to destinatario_email may manifest."""
        recipient = User.objects.create(tenant=self.tenant, username='recipient', email=self.nfe.destinatario_email or 'dest@example.com')
        self.client.force_authenticate(user=recipient)
        url = f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/'
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
            self.assertEqual(resp.status_code, 201)

    def test_manifestacao_staff_allowed(self):
        staff = User.objects.create(tenant=self.tenant, username='staffuser', is_staff=True)
        self.client.force_authenticate(user=staff)
        url = f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/'
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
            self.assertEqual(resp.status_code, 201)

    def test_manifestacao_module_permission_allowed(self):
        # user with ModulePermission(can_respond=True, module='fiscal') is allowed
        # Prefer creating a CustomUser if available (ModulePermission.user expects CustomUser in minimal test runs)
        # Create a ModulePermission attached to CustomUser (if available) but authenticate
        # as corresponding auth.User to avoid FK type mismatch when Manifestacao is created.
        # For test stability across environments, create a plain auth.User
        # and attach a ModulePermission record referencing that user.

        from apps.core.models import ModulePermission
        # Create a single user instance (CustomUser if available) and attach ModulePermission to it.
        pm_user = User.objects.create(tenant=self.tenant, username='pmuser', email='pm@example.com')
        try:
            ModulePermission.objects.create(user=pm_user, module='fiscal', can_view=True, can_edit=False, can_respond=True)
        except Exception:
            # If ModulePermission model isn't available or FK issues occur, fall back to creating a CustomUser and attach permission to it.
            try:
                from apps.core.models import CustomUser
                pm_user_core = CustomUser.objects.create(tenant=self.tenant, username='pmuser', email='pm@example.com')
                ModulePermission.objects.create(user=pm_user_core, module='fiscal', can_view=True, can_edit=False, can_respond=True)
                # authenticate as the core user
                self.client.force_authenticate(user=pm_user_core)
            except Exception:
                # As a last resort, authenticate as the plain user and rely on username/email fallback in permission checks
                self.client.force_authenticate(user=pm_user)
        else:
            # If we created ModulePermission successfully for pm_user, authenticate it
            self.client.force_authenticate(user=pm_user)

        url = f'/api/fiscal/nfes/{self.nfe.id}/manifestacao/'
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
            self.assertEqual(resp.status_code, 201)

    def test_retry_manifestacao_enqueues_for_staff(self):
        m = Manifestacao.objects.create(tenant=self.tenant, nfe=self.nfe, tipo='ciencia', criado_por=self.user)
        staff = User.objects.create(tenant=self.tenant, username='staffretry', is_staff=True)
        self.client.force_authenticate(user=staff)
        url = f'/api/fiscal/manifestacoes/{m.id}/retry/'
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task:
            mocked_task.delay = mock.MagicMock()
            resp = self.client.post(url, {}, format='json')
            self.assertEqual(resp.status_code, 200)
            body = resp.json()
            self.assertIn('enqueued', body)
            self.assertTrue(body.get('enqueued'))
            mocked_task.delay.assert_called_once_with(m.id)

    def test_retry_manifestacao_forbidden_for_non_staff(self):
        m = Manifestacao.objects.create(tenant=self.tenant, nfe=self.nfe, tipo='ciencia', criado_por=self.user)
        other = User.objects.create(tenant=self.tenant, is_staff=False, is_superuser=False, username='otherretry', email='other@example.com')
        self.client.force_authenticate(user=other)
        url = f'/api/fiscal/manifestacoes/{m.id}/retry/'
        resp = self.client.post(url, {}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_retry_manifestacao_not_found(self):
        staff = User.objects.create(tenant=self.tenant, username='staffretry', is_staff=True)
        self.client.force_authenticate(user=staff)
        url = f'/api/fiscal/manifestacoes/99999/retry/'
        resp = self.client.post(url, {}, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_post_manifestacao_with_valid_certificado_id(self):
        """API deve aceitar certificado_id válido do próprio usuário"""
        cert = CertificadoSefaz.objects.create(
            nome='Certificado API Test',
            arquivo_encrypted=b'fake_encrypted_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=self.user
        )
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'ciencia', 'certificado_id': cert.id}, format='json')
            self.assertEqual(resp.status_code, 201)
            body = resp.json()
            self.assertIn('manifestacao', body)
            m = Manifestacao.objects.get(id=body['manifestacao']['id'])
            self.assertEqual(m.certificado.id, cert.id)

    def test_post_manifestacao_without_certificado_id(self):
        """API deve funcionar sem certificado_id (backward compatibility)"""
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        with mock.patch('apps.fiscal.tasks.send_manifestacao_task') as mocked_task_module:
            mocked_task_module.delay = mock.MagicMock()
            resp = self.client.post(url, {'tipo': 'ciencia'}, format='json')
            self.assertEqual(resp.status_code, 201)
            body = resp.json()
            m = Manifestacao.objects.get(id=body['manifestacao']['id'])
            self.assertIsNone(m.certificado)

    def test_post_manifestacao_reject_invalid_certificado_id(self):
        """API deve rejeitar certificado_id que não existe"""
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'ciencia', 'certificado_id': 99999}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'certificado_id' for bf in body.get('bad_fields', [])))

    def test_post_manifestacao_reject_other_user_certificado(self):
        """API deve rejeitar certificado de outro usuário"""
        other_user = User.objects.create(tenant=self.tenant, username='otheruser2')
        cert = CertificadoSefaz.objects.create(
            nome='Certificado Outro',
            arquivo_encrypted=b'fake_encrypted_content',
            validade=timezone.now().date() + timedelta(days=365),
            uploaded_by=other_user
        )
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'ciencia', 'certificado_id': cert.id}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'certificado_id' for bf in body.get('bad_fields', [])))

    def test_post_manifestacao_reject_expired_certificado(self):
        """API deve rejeitar certificado expirado"""
        cert = CertificadoSefaz.objects.create(
            nome='Certificado Expirado',
            arquivo_encrypted=b'fake_encrypted_content',
            validade=timezone.now().date() - timedelta(days=30),
            uploaded_by=self.user
        )
        url = reverse('nfe-manifestacao', args=[self.nfe.id])
        resp = self.client.post(url, {'tipo': 'ciencia', 'certificado_id': cert.id}, format='json')
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertEqual(body.get('error'), 'validation_error')
        self.assertTrue(any(bf.get('field') == 'certificado_id' for bf in body.get('bad_fields', [])))
