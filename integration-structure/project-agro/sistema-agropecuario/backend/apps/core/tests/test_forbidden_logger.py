from django.test import TestCase, override_settings, Client
import logging

@override_settings(ROOT_URLCONF='apps.core.tests.urls_for_middleware')
class ForbiddenLoggerMiddlewareTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_middleware_adds_header_and_logs(self):
        # Capture logs
        logger = logging.getLogger('django.request')
        from io import StringIO
        stream = StringIO()
        handler = logging.StreamHandler(stream)
        logger.addHandler(handler)
        logger.setLevel(logging.WARNING)

        try:
            resp = self.client.get('/test/forbidden-payload/')
            # The middleware should not change the status code
            self.assertEqual(resp.status_code, 200)
            # But should add a diagnostic header to help locate occurrences
            self.assertEqual(resp.get('X-Forbidden-Payload'), '1')

            # And an entry should be in the logs
            handler.flush()
            contents = stream.getvalue()
            self.assertIn('Detected 200-with-403 payload', contents)
        finally:
            logger.removeHandler(handler)
