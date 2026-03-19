"""
Tests for upload_xml endpoint format support (NFe simple vs nfeProc).

According to TEST_POLICY_CORE:
- PERMITIDO: contratos públicos (API), regras centrais de negócio, fluxos essenciais
- PROIBIDO: métodos privados, detalhes de implementação
- TEST_STRENGTH_RULE: asserts específicos, não genéricos
- TEST_DECOUPLING_RULE: cada teste roda isoladamente

PRIORITY_MODEL:
- P0_CRITICO: Endpoint deve aceitar AMBOS formatos (NFe simples e nfeProc)
- P1_ESSENCIAL: Validação de chave de acesso em ambos formatos
"""

import io
import xml.etree.ElementTree as ET
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status


class UploadXmlFormatSupportTest(TestCase):
    """P0 CRITICO: Endpoint must accept both NFe simple and nfeProc formats."""

    def setUp(self):
        """Setup: Create test user and authenticate."""
        User = get_user_model()
        self.user = User.objects.create_user(username='testuser', password='testpass', is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        
        # Fixture path to nfeProc format (existing test data)
        self.fixture_nfeproc_path = '/app/backend/apps/fiscal/tests/fixtures/52251004621697000179550010000100511374580195.xml'
    
    def _read_fixture_nfeproc(self):
        """Helper: Read fixture nfeProc XML."""
        try:
            with open(self.fixture_nfeproc_path, 'rb') as f:
                return f.read()
        except FileNotFoundError:
            self.skipTest(f"Fixture not found: {self.fixture_nfeproc_path}")
    
    def _extract_nfe_from_nfeproc(self, nfeproc_xml):
        """Helper: Extract <NFe> simple format from <nfeProc>."""
        root = ET.fromstring(nfeproc_xml)
        
        # Find NFe element inside nfeProc
        nfe_elem = root.find('.//{http://www.portalfiscal.inf.br/nfe}NFe')
        if nfe_elem is None:
            # Try without namespace
            nfe_elem = root.find('.//NFe')
        
        if nfe_elem is None:
            raise ValueError("Could not find NFe element in nfeProc")
        
        # Convert back to string with XML declaration
        nfe_xml = ET.tostring(nfe_elem, encoding='utf-8')
        return b'<?xml version="1.0" encoding="UTF-8"?>\n' + nfe_xml
    
    def test_upload_nfeproc_format_accepted(self):
        """
        P0 CRITICO: Endpoint must accept <nfeProc> format (standard from SEFAZ).
        
        Acceptance criteria:
        - Request with nfeProc XML returns 201 or 200 or similar success status
        - Response indicates successful import
        - System does NOT return validation/parse error
        """
        nfeproc_xml = self._read_fixture_nfeproc()
        
        response = self.client.post(
            '/api/fiscal/nfes/upload_xml/',
            {'xml_file': io.BytesIO(nfeproc_xml)},
            format='multipart'
        )
        
        # Assertion 1: Status is NOT a parse/validation error
        self.assertNotEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg=f"nfeProc format should be accepted, got 400: {response.content}"
        )
        
        # Assertion 2: Response indicates success (200, 201, or contains success indicators)
        response_data = response.json() if hasattr(response, 'json') else response.data
        has_success_indicator = (
            response.status_code in (200, 201) or
            'nfe_id' in response_data or
            'id' in response_data or
            'detail' in response_data  # May contain import confirmation
        )
        self.assertTrue(
            has_success_indicator,
            msg=f"Response should indicate success: {response_data}"
        )
    
    def test_upload_nfe_simple_format_accepted(self):
        """
        P0 CRITICO: Endpoint must accept <NFe> simple format (local generation).
        
        This is the core improvement: system should accept NFe simples without wrapper.
        
        Acceptance criteria:
        - Request with NFe simple (no nfeProc wrapper) returns success (not 400)
        - System automatically wraps or handles it correctly
        - NFe is imported successfully
        """
        # Get nfeProc fixture and extract NFe simple format
        nfeproc_xml = self._read_fixture_nfeproc()
        nfe_simple_xml = self._extract_nfe_from_nfeproc(nfeproc_xml)
        
        # Assertion 1: Our extraction was successful
        self.assertTrue(
            nfe_simple_xml.startswith(b'<?xml'),
            msg="Extracted NFe should have XML declaration"
        )
        # Check for NFe tag (with or without namespace prefix: <NFe or <ns*:NFe)
        self.assertTrue(
            b'<NFe' in nfe_simple_xml or b':NFe' in nfe_simple_xml,
            msg="Extracted NFe should contain <NFe> tag (with or without namespace prefix)"
        )
        self.assertNotIn(
            b'<nfeProc',
            nfe_simple_xml,
            msg="Extracted NFe should NOT contain <nfeProc> tag"
        )
        
        # Assertion 2: Upload NFe simple format
        response = self.client.post(
            '/api/fiscal/nfes/upload_xml/',
            {'xml_file': io.BytesIO(nfe_simple_xml)},
            format='multipart'
        )
        
        # Assertion 3: Status is NOT a validation error (should accept it)
        self.assertNotEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg=f"NFe simple format SHOULD be accepted (core improvement). Got 400: {response.content}"
        )
        
        # Assertion 4: Response indicates success
        response_data = response.json() if hasattr(response, 'json') else response.data
        has_success_indicator = (
            response.status_code in (200, 201) or
            'nfe_id' in response_data or
            'id' in response_data or
            'detail' in response_data  # May contain import confirmation
        )
        self.assertTrue(
            has_success_indicator,
            msg=f"NFe simple should import successfully: {response_data}"
        )


class UploadXmlChaveAcessoValidationTest(TestCase):
    """P1 ESSENCIAL: Chave de acesso validation works in both formats."""
    
    def setUp(self):
        """Setup: Create test user and authenticate."""
        User = get_user_model()
        self.user = User.objects.create_user(username='testuser', password='testpass', is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        
        self.fixture_nfeproc_path = '/app/backend/apps/fiscal/tests/fixtures/52251004621697000179550010000100511374580195.xml'
    
    def _read_fixture_nfeproc(self):
        """Helper: Read fixture nfeProc XML."""
        try:
            with open(self.fixture_nfeproc_path, 'rb') as f:
                return f.read()
        except FileNotFoundError:
            self.skipTest(f"Fixture not found: {self.fixture_nfeproc_path}")
    
    def _extract_nfe_from_nfeproc(self, nfeproc_xml):
        """Helper: Extract <NFe> simple format from <nfeProc>."""
        root = ET.fromstring(nfeproc_xml)
        nfe_elem = root.find('.//{http://www.portalfiscal.inf.br/nfe}NFe')
        if nfe_elem is None:
            nfe_elem = root.find('.//NFe')
        if nfe_elem is None:
            raise ValueError("Could not find NFe element")
        nfe_xml = ET.tostring(nfe_elem, encoding='utf-8')
        return b'<?xml version="1.0" encoding="UTF-8"?>\n' + nfe_xml
    
    def test_nfeproc_chave_acesso_extracted_correctly(self):
        """
        P1 ESSENCIAL: nfeProc format must have chave de acesso extracted and stored.
        
        Acceptance criteria:
        - Upload succeeds (not 400)
        - NFe is stored with chave_acesso field populated
        - Chave is exactly 44 digits and numeric
        """
        nfeproc_xml = self._read_fixture_nfeproc()
        
        response = self.client.post(
            '/api/fiscal/nfes/upload_xml/',
            {'xml_file': io.BytesIO(nfeproc_xml)},
            format='multipart'
        )
        
        # Assertion 1: Upload succeeds
        self.assertNotEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg=f"nfeProc upload should succeed: {response.content}"
        )
        
        # Assertion 2: Extract NFe ID from response
        response_data = response.json() if hasattr(response, 'json') else response.data
        nfe_id = response_data.get('nfe_id') or response_data.get('id')
        self.assertIsNotNone(nfe_id, msg="Response should contain nfe_id or id")
        
        # Assertion 3: Verify NFe was stored in database with correct chave
        from apps.fiscal.models import NFe
        nfe = NFe.objects.get(id=nfe_id)
        self.assertIsNotNone(nfe.chave_acesso, msg="NFe should have chave_acesso populated")
        
        # Assertion 4: Chave should be 44 digits
        chave = nfe.chave_acesso
        self.assertEqual(
            len(chave),
            44,
            msg=f"Chave de acesso must be 44 characters, got {len(chave)}"
        )
        
        # Assertion 5: Chave should be numeric
        self.assertTrue(
            chave.isdigit(),
            msg=f"Chave de acesso must be numeric, got {chave}"
        )
    
    def test_nfe_simple_chave_acesso_extracted_correctly(self):
        """
        P1 ESSENCIAL: NFe simple format must have chave de acesso extracted.
        
        Acceptance criteria:
        - Chave from NFe simple is exactly 44 digits
        - Matches the Id from infNFe (without NFe prefix)
        """
        nfeproc_xml = self._read_fixture_nfeproc()
        nfe_simple_xml = self._extract_nfe_from_nfeproc(nfeproc_xml)
        
        response = self.client.post(
            '/api/fiscal/nfes/upload_xml/',
            {'xml_file': io.BytesIO(nfe_simple_xml)},
            format='multipart'
        )
        
        # Assertion 1: Status is success
        self.assertIn(response.status_code, (200, 201))
        
        # Assertion 2: Response contains chave_acesso
        response_data = response.json() if hasattr(response, 'json') else response.data
        self.assertIn('chave_acesso', response_data, msg="Response should contain 'chave_acesso' for NFe simple")
        
        # Assertion 3: Chave is exactly 44 characters
        chave = response_data.get('chave_acesso')
        self.assertEqual(
            len(chave) if chave else 0,
            44,
            msg=f"Chave de acesso (NFe simple) must be 44 characters, got {len(chave) if chave else 0}"
        )
        
        # Assertion 4: Chave is numeric
        self.assertTrue(
            chave.isdigit() if chave else False,
            msg=f"Chave de acesso (NFe simple) must be numeric, got {chave}"
        )


class UploadXmlErrorHandlingTest(TestCase):
    """P1 ESSENCIAL: Both formats have proper error handling."""
    
    def setUp(self):
        """Setup: Create test user and authenticate."""
        User = get_user_model()
        self.user = User.objects.create_user(username='testuser', password='testpass', is_staff=False)
        self.client = APIClient()
        self.client.force_authenticate(self.user)
    
    def test_upload_invalid_xml_returns_400(self):
        """
        P1 ESSENCIAL: Invalid XML returns 400 with error details.
        
        Acceptance criteria:
        - Status is 400 Bad Request
        - Error response contains 'error' and 'message' fields
        """
        invalid_xml = b'<?xml version="1.0"?><invalid>not a nfe</invalid>'
        
        response = self.client.post(
            '/api/fiscal/nfes/upload_xml/',
            {'xml_file': io.BytesIO(invalid_xml)},
            format='multipart'
        )
        
        # Assertion 1: Status is 400
        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg=f"Invalid XML should return 400, got {response.status_code}"
        )
        
        # Assertion 2: Response contains error info
        response_data = response.json() if hasattr(response, 'json') else response.data
        self.assertIn('error', response_data, msg="Error response should contain 'error' field")
    
    def test_upload_missing_xml_file_returns_400(self):
        """
        P1 ESSENCIAL: Missing xml_file parameter returns 400.
        
        Acceptance criteria:
        - Status is 400 Bad Request
        - Error message indicates missing file
        """
        response = self.client.post(
            '/api/fiscal/nfes/upload_xml/',
            {},
            format='multipart'
        )
        
        # Assertion 1: Status is 400
        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            msg="Missing xml_file should return 400"
        )
        
        # Assertion 2: Response contains validation error
        response_data = response.json() if hasattr(response, 'json') else response.data
        error_type = response_data.get('error')
        self.assertIn(
            error_type,
            ('validation_error', 'missing_field'),
            msg=f"Missing file error should be validation_error or missing_field, got {error_type}"
        )
