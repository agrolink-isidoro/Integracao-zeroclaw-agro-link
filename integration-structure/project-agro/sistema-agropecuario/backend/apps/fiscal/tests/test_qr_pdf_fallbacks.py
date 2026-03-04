from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
import io
from PIL import Image
import types


class QRPdfFallbacksTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='u2', password='p')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _make_png_bytes(self, text='test'):
        # create a small RGB image
        img = Image.new('RGB', (100, 100), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf

    def test_read_qr_prefers_cv2_qr_detection(self):
        # Simulate cv2 present with QRCodeDetector returning a QR payload
        import apps.fiscal.views as views
        orig_cv2 = getattr(views, 'cv2', None)

        class FakeDetector:
            def detectAndDecode(self, _):
                # Return (data, bbox, straight) similar to OpenCV
                return ("https://example.org/?chNFe=43191012345678901234567890123456789012345678", None, None)

        class FakeCV2:
            def __init__(self):
                self.COLOR_RGB2BGR = None
                self.QRCodeDetector = lambda self=None: FakeDetector()

            def cvtColor(self, arr, flag):
                return arr

        views.cv2 = FakeCV2()
        views.pyzbar = None

        try:
            data = {'image_file': self._make_png_bytes()}
            resp = self.client.post('/api/fiscal/nfes/read_qr_code/', data, format='multipart')
            self.assertEqual(resp.status_code, 200)
            self.assertTrue(resp.data.get('success'))
            results = resp.data.get('results')
            self.assertTrue(any(r['type'] == 'qr_code' and r['data'].get('chave_acesso') for r in results))
        finally:
            views.cv2 = orig_cv2

    def test_read_qr_fallback_to_pyzbar_when_cv2_raises(self):
        import apps.fiscal.views as views
        orig_cv2 = getattr(views, 'cv2', None)
        orig_pyzbar = getattr(views, 'pyzbar', None)

        class FakeCV2:
            def __init__(self):
                self.COLOR_RGB2BGR = None
                self.QRCodeDetector = lambda self=None: (_ for _ in ()).throw(RuntimeError('detector error'))

            def cvtColor(self, arr, flag):
                return arr

        class FakeBarcode:
            def __init__(self, data, typ):
                self.data = data
                self.type = typ

        class FakePyzbar:
            @staticmethod
            def decode(image):
                return [FakeBarcode(b"43191012345678901234567890123456789012345678", 'CODE128')]

        views.cv2 = FakeCV2()
        views.pyzbar = FakePyzbar()

        try:
            data = {'image_file': self._make_png_bytes()}
            resp = self.client.post('/api/fiscal/nfes/read_qr_code/', data, format='multipart')
            self.assertEqual(resp.status_code, 200, f"response: {resp.data}")
            self.assertTrue(resp.data.get('success'), f"response: {resp.data}")
            results = resp.data.get('results')
            self.assertIn('results', resp.data, f"response: {resp.data}")
            # barcode result may not contain a valid 'chave_acesso' if checksum fails; assert we at least decoded a barcode
            self.assertTrue(any(r.get('type') == 'barcode' and r.get('data') for r in results), f"response: {resp.data}")
        finally:
            views.cv2 = orig_cv2
            views.pyzbar = orig_pyzbar

    def test_process_pdf_uses_pdfplumber_and_fallbacks(self):
        # Monkeypatch pdfplumber.open to return a fake page with an image that triggers pyzbar
        import apps.fiscal.views as views
        orig_cv2 = getattr(views, 'cv2', None)
        orig_pyzbar = getattr(views, 'pyzbar', None)
        import pdfplumber
        orig_pdfplumber_open = pdfplumber.open

        class FakeImage:
            def __init__(self):
                # original should be a PIL image-like object
                self.original = Image.new('RGB', (10, 10), color=(255, 255, 255))

        class FakePage:
            def __init__(self):
                # emulate one image on the page
                self.images = [{'x0': 0, 'top': 0, 'x1': 10, 'bottom': 10}]

            def crop(self, bbox):
                class Crop:
                    def to_image(self, resolution=300):
                        class Img:
                            def __init__(self):
                                self.original = Image.new('RGB', (10, 10), color=(255, 255, 255))
                        return Img()
                return Crop()

        class FakePDF:
            def __init__(self):
                self.pages = [FakePage()]

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        def fake_open(f):
            return FakePDF()

        # Simulate environment where cv2 missing but pyzbar available
        views.cv2 = None

        class FakeBarcode:
            def __init__(self, data, typ):
                self.data = data
                self.type = typ

        class FakePyzbar:
            @staticmethod
            def decode(img):
                return [FakeBarcode(b"43191012345678901234567890123456789012345678", 'CODE128')]

        views.pyzbar = FakePyzbar()
        pdfplumber.open = fake_open

        try:
            data = {'pdf_file': io.BytesIO(b'%PDF-1.4 dummy')}
            resp = self.client.post('/api/fiscal/nfes/process_pdf/', data, format='multipart')
            self.assertEqual(resp.status_code, 200)
            self.assertTrue(resp.data.get('success'))
            self.assertGreaterEqual(resp.data.get('count'), 1)
            results = resp.data.get('results')
            self.assertTrue(any(r.get('type') == 'barcode' or r.get('type') == 'qr_code' for r in results))
        finally:
            views.cv2 = orig_cv2
            views.pyzbar = orig_pyzbar
            pdfplumber.open = orig_pdfplumber_open
