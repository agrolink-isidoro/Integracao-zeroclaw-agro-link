import os
import threading
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import socket
from django.test import TestCase, override_settings
from apps.fiscal.services.sefaz_client import SefazClient
from apps.fiscal.models import NFe
from apps.fiscal.models_manifestacao import Manifestacao

RUN_HOMOLOG = os.environ.get('RUN_HOMOLOG_INTEGRATION', 'false').lower() == 'true'


class SimpleSEFAZHandler(BaseHTTPRequestHandler):
    # Very small mock that accepts POST with JSON {xml, chave_acesso, tpEvento}
    # and returns cStat 135 and nProt when xml contains infEvento, else 136.
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body.decode('utf-8'))
        except Exception:
            data = {}
        xml = data.get('xml', '')
        response = {'cStat': '136', 'nProt': None, 'message': 'registered but not linked'}
        if '<infEvento' in xml:
            response = {'cStat': '135', 'nProt': 'PROT123456', 'message': 'Evento registrado e vinculado (mock)'}
        resp_bytes = json.dumps(response).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resp_bytes)))
        self.end_headers()
        self.wfile.write(resp_bytes)

    def log_message(self, format, *args):
        # silence
        return


class HomologIntegrationTest(TestCase):
    def setUp(self):
        if not RUN_HOMOLOG:
            self.skipTest('RUN_HOMOLOG_INTEGRATION not set; skipping homolog integration test')

        # start server on ephemeral port
        self.server = None
        self.thread = None
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(('127.0.0.1', 0))
        addr, port = sock.getsockname()
        sock.close()

        self.port = port
        self.server = HTTPServer(('127.0.0.1', port), SimpleSEFAZHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.endpoint = f'http://127.0.0.1:{self.port}/'

    def tearDown(self):
        if getattr(self, 'server', None):
            try:
                self.server.shutdown()
                self.thread.join(timeout=2)
            except Exception:
                pass

    def test_send_manifestacao_against_mock_sefaz(self):
        # Prepare a real PKCS12 cert for signing (self-signed) using cryptography
        try:
            from cryptography.hazmat.primitives.asymmetric import rsa
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.x509 import Name, NameAttribute
            from cryptography.x509.oid import NameOID
            from cryptography import x509
            from cryptography.hazmat.primitives.serialization import pkcs12
            import datetime
        except Exception:
            self.skipTest('cryptography not available')

        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test CA')])
        cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())
        p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.NoEncryption())

        class PFXObj:
            def __init__(self, data):
                self._data = data
            def get_arquivo_bytes(self):
                return self._data

        pfx = PFXObj(p12)

        client = SefazClient(simulate=False, endpoint=self.endpoint)
        res = client.send_manifestacao('0'*44, 'ciencia', certificado=pfx)
        self.assertTrue(res.get('success'), msg=f"response={res}")
        self.assertIn(res.get('cStat'), ('135', '136'))



    # Removed test_manifestacao_task_updates_model: assert was too vague (accepting any state),
    # monkeypatch was fragile, and coverage is duplicated by stronger tests in test_manifestacao_task.py

