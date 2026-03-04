import threading
import json
import pytest
from http.server import BaseHTTPRequestHandler, HTTPServer
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.fiscal.models import NFe
from apps.fiscal.models_emissao import EmissaoJob
from apps.fiscal.models_certificados import CertificadoSefaz
from django.core.files.base import ContentFile
from apps.fiscal.tasks import process_emissao_job


class MockSefazHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        # Basic validation: ensure xml present
        payload = json.loads(body.decode('utf-8'))
        if 'xml' not in payload:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{}')
            return

        resp = {'protocolo': 'PROTO-123', 'status': '100', 'data_autorizacao': '2026-01-02T00:00:00'}
        b = json.dumps(resp).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, format, *args):
        # suppress logging to stdout
        pass


class E2ESefazTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.staff = User.objects.create_user(username='staff', password='pw', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.staff)

    def _start_mock_server(self):
        server = HTTPServer(('localhost', 0), MockSefazHandler)
        port = server.server_address[1]
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        return server, port

    @pytest.mark.slow
    @override_settings(SEFAZ_EMIT_ENDPOINT='http://localhost:0/api/emit')
    def test_e2e_emit_with_mock_server(self):
        # Start mock server
        server, port = self._start_mock_server()
        endpoint = f'http://localhost:{port}/api/emit'

        # Create a certificate record (content not validated by mock)
        CertificadoSefaz.objects.create(nome='test-cert', arquivo=ContentFile(b'fake', name='test.p12'))

        # Create NFe and enqueue emission job
        nfe = NFe.objects.create(chave_acesso='E2E123', numero='1', serie='1', data_emissao='2025-01-01T00:00:00Z', emitente_nome='E', destinatario_nome='D', valor_produtos=0, valor_nota=0)
        nfe.xml_content = '<xml></xml>'
        nfe.save()

        job = EmissaoJob.objects.create(nfe=nfe, status='pending')

        # Run task synchronously pointing SefazClient to mock endpoint
        with override_settings(SEFAZ_EMIT_ENDPOINT=endpoint):
            process_emissao_job.__wrapped__(job.id)

        job.refresh_from_db()
        nfe.refresh_from_db()

        self.assertEqual(job.status, 'success')
        self.assertEqual(nfe.status, '100')
        self.assertIsNotNone(nfe.protocolo_autorizacao)

        server.shutdown()
        server.server_close()
