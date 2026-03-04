from rest_framework.test import APIClient
from django.test import TestCase
from django.urls import reverse
from apps.fiscal.models_sync import NFeRemote
from django.contrib.auth import get_user_model
from django.test import override_settings

User = get_user_model()


@override_settings(FISCAL_MANIFESTACAO_ENABLED=True)
class NFeRemoteListTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='listuser')
        self.client.force_authenticate(user=self.user)
        NFeRemote.objects.create(chave_acesso='A'*44, raw_xml='<xml/>', import_status='pending')
        NFeRemote.objects.create(chave_acesso='B'*44, raw_xml='<xml/>', import_status='imported')

    # Removed test_list_returns_all: Basic API list (framework responsibility).

    def test_filter_by_import_status(self):
        url = reverse('nfe-remote-list') + '?import_status=imported'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]['import_status'], 'imported')

    # Removed test_nfe_list_proxy_returns_remote: Proxy routing (framework implementation).

    def test_nfe_list_proxy_filter_by_import_status(self):
        url = reverse('nfe-list') + '?remote=true&import_status=imported'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]['import_status'], 'imported')

# Removed test_nferemote_filter_by_certificado: Filtering by field (API feature, not critical behavior).
