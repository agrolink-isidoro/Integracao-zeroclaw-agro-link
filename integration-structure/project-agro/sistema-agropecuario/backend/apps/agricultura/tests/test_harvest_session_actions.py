from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fazendas.models import Fazenda, Area, Talhao
from apps.agricultura.models import Plantio, Cultura, HarvestSession, HarvestSessionItem

User = get_user_model()


class HarvestSessionActionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='action_tester')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        from apps.fazendas.models import Proprietario
        self.proprietario = Proprietario.objects.create(nome='Produtor Action', cpf_cnpj='111111111')
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='F2', matricula='M2')
        self.cultura = Cultura.objects.create(nome='Milho')
        self.plantio = Plantio.objects.create(fazenda=self.fazenda, cultura=self.cultura, data_plantio='2025-02-01')
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='Area2')
        self.talhao1 = Talhao.objects.create(area=self.area, name='T1', area_size=10)
        self.talhao2 = Talhao.objects.create(area=self.area, name='T2', area_size=5)
        self.plantio.talhoes.add(self.talhao1)
        self.plantio.talhoes.add(self.talhao2)

    def test_cancel_session_and_prevent_duplicate_active(self):
        url = '/api/agricultura/harvest-sessions/'
        payload = {
            'plantio': self.plantio.id,
            'data_inicio': '2025-12-01',
            'itens': [
                {'talhao': self.talhao1.id},
            ]
        }
        resp = self.client.post(url, payload, format='json')
        assert resp.status_code == 201, resp.content
        data = resp.json()
        session_id = data['id']

        # cancel
        cancel_url = f'/api/agricultura/harvest-sessions/{session_id}/cancel/'
        cancel_resp = self.client.post(cancel_url, {}, format='json')
        assert cancel_resp.status_code == 200
        s = HarvestSession.objects.get(id=session_id)
        assert s.status == 'cancelada'

        # ensure cannot create another active session for same plantio while one active exists
        # First, create another active session
        payload2 = {
            'plantio': self.plantio.id,
            'data_inicio': '2025-12-02',
            'itens': [ {'talhao': self.talhao2.id} ]
        }
        resp2 = self.client.post(url, payload2, format='json')
        assert resp2.status_code == 201
        # Attempt to create duplicate active session -> should fail (we validate active sessions exist)
        resp3 = self.client.post(url, payload2, format='json')
        assert resp3.status_code == 400

    def test_finalize_requires_force_if_pending(self):
        url = '/api/agricultura/harvest-sessions/'
        payload = {
            'plantio': self.plantio.id,
            'data_inicio': '2025-12-03',
            'itens': [ {'talhao': self.talhao1.id}, {'talhao': self.talhao2.id} ]
        }
        resp = self.client.post(url, payload, format='json')
        assert resp.status_code == 201
        session_id = resp.json()['id']

        # Try finalize without force -> should fail
        finalize_url = f'/api/agricultura/harvest-sessions/{session_id}/finalize/'
        fin_resp = self.client.post(finalize_url, {}, format='json')
        assert fin_resp.status_code == 400

        # Force finalize should succeed
        fin_resp2 = self.client.post(finalize_url, {'force': True}, format='json')
        assert fin_resp2.status_code == 200
        s = HarvestSession.objects.get(id=session_id)
        assert s.status == 'finalizada'

    def test_update_session_items(self):
        url = '/api/agricultura/harvest-sessions/'
        payload = {
            'plantio': self.plantio.id,
            'data_inicio': '2025-12-04',
            'itens': [ {'talhao': self.talhao1.id} ]
        }
        resp = self.client.post(url, payload, format='json')
        assert resp.status_code == 201
        session_id = resp.json()['id']

        # Update session to replace items
        patch_url = f'/api/agricultura/harvest-sessions/{session_id}/'
        patch_payload = { 'itens': [ {'talhao': self.talhao2.id} ] }
        patch_resp = self.client.patch(patch_url, patch_payload, format='json')
        assert patch_resp.status_code == 200
        s = HarvestSession.objects.get(id=session_id)
        assert s.itens.count() == 1
        assert s.itens.first().talhao.id == self.talhao2.id
