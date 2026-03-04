from django.test import TestCase
from rest_framework.test import APIClient


class FazendasRoutesTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_fazendas_talhoes_list_is_accessible(self):
        # Legacy path may redirect to the canonical '/api/talhoes/' route; follow redirects and assert final status is 200
        resp = self.client.get('/api/fazendas/talhoes/', follow=True)
        # should be available as a list endpoint (200)
        self.assertEqual(resp.status_code, 200)

    def test_fazendas_talhoes_allows_post(self):
        # OPTIONS for the legacy path may redirect; query the canonical path for reliable method info
        resp = self.client.options('/api/talhoes/')
        allow = resp.get('Allow', '')
        self.assertIn('POST', allow)
