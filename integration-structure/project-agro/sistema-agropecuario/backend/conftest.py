import os
import django
from django.conf import settings

# Configure Django settings before any imports
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sistema_agropecuario.settings.test')

if not settings.configured:
    django.setup()

import pytest
from pathlib import Path


def pytest_ignore_collect(collection_path, config):
    """Ignore problematic tests that rely on environment fixtures not present here.

    Only skip `apps/fiscal/tests/test_extract_nfe.py` when its required XML
    fixture is not present, or when the `SKIP_EXTRACT_NFE` env var is set. This
    allows CI to run the test when fixtures are checked into the repository.
    """
    try:
        p = Path(collection_path)
        if p.name == 'test_extract_nfe.py':
            # Allow an explicit opt-out for environments that must skip this test
            if os.environ.get('SKIP_EXTRACT_NFE', '').lower() in ('1', 'true', 'yes'):
                return True

            fixture = p.parent / 'fixtures' / '52251004621697000179550010000100511374580195.xml'
            # Skip collection only when the fixture file is missing
            return not fixture.exists()
    except Exception:
        return False


# ======================================
# CERTIFICADO DE TESTE - FIXTURES
# ======================================
# As fixtures abaixo geram certificados PKCS#12 automaticamente para testes
# que precisam de certificados digitais. Ver docs/GUIA_ACT_E_CERTIFICADOS.md
# para entender a filosofia e contexto.

import tempfile
import subprocess
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


@pytest.fixture(scope="session")
def test_certificate():
    """
    Gera um certificado PKCS#12 para testes uma vez por sessão.
    
    Este certificado é auto-assinado e serve para simular um certificado real
    em ambientes de teste. É criado uma única vez no início da sessão de testes
    e compartilhado entre todos os testes.
    
    Características:
    - Chave privada RSA 2048-bit
    - Certificado X.509 v3
    - Válido por 365 dias
    - Protegido por senha (PKCS#12)
    
    Retorna:
        dict: {
            'path': str - caminho para arquivo .pfx temporário,
            'password': str - senha do certificado
        }
    
    O arquivo é automaticamente deletado ao final da sessão de testes.
    
    Implementação:
    Usa openssl para criar certificado .pem e convertê-lo para PKCS#12.
    Esta abordagem é compatível com qualquer versão de cryptography.
    """
    
    temp_dir = tempfile.mkdtemp()
    key_file = os.path.join(temp_dir, 'test_key.pem')
    crt_file = os.path.join(temp_dir, 'test_cert.pem')
    pfx_file = os.path.join(temp_dir, 'test_cert.pfx')
    cert_password = "test_password_123"
    
    try:
        # ======================================
        # 1. GERAR CHAVE PRIVADA COM OPENSSL
        # ======================================
        subprocess.run([
            'openssl', 'genrsa',
            '-out', key_file,
            '2048'
        ], check=True, capture_output=True)
        
        # ======================================
        # 2. GERAR CERTIFICADO AUTO-ASSINADO
        # ======================================
        subprocess.run([
            'openssl', 'req',
            '-new', '-x509',
            '-key', key_file,
            '-out', crt_file,
            '-days', '365',
            '-subj', '/C=BR/ST=SP/L=São Paulo/O=Test Organization/OU=Test Unit/CN=test.fiscal.local'
        ], check=True, capture_output=True)
        
        # ======================================
        # 3. CONVERTER PARA PKCS#12 (.pfx)
        # ======================================
        subprocess.run([
            'openssl', 'pkcs12',
            '-export',
            '-in', crt_file,
            '-inkey', key_file,
            '-out', pfx_file,
            '-name', 'Test Fiscal Certificate',
            '-passout', f'pass:{cert_password}'
        ], check=True, capture_output=True)
        
        cert_info = {
            'path': pfx_file,
            'password': cert_password
        }
        
        print(f"\n✓ Certificado de teste gerado: {pfx_file}")
        print(f"  Senha: {cert_password}")
        
        yield cert_info
        
    finally:
        # ======================================
        # 5. CLEANUP: DELETAR ARQUIVOS
        # ======================================
        try:
            if os.path.exists(key_file):
                os.unlink(key_file)
            if os.path.exists(crt_file):
                os.unlink(crt_file)
            if os.path.exists(pfx_file):
                os.unlink(pfx_file)
            os.rmdir(temp_dir)
            print(f"\n✓ Certificado e arquivos temporários deletados")
        except Exception as e:
            print(f"\n⚠ Aviso ao deletar certificado: {e}")


@pytest.fixture(autouse=True)
def setup_test_environment(test_certificate):
    """
    Configura variáveis de ambiente para testes automaticamente.
    
    Esta fixture é executada automaticamente (autouse=True) antes de cada teste
    e injeta o certificado gerado em variáveis de ambiente que seu código
    pode acessar via os.environ.
    
    Variáveis injetadas:
    - FISCAL_CERT_PATH: caminho para o arquivo .pfx
    - FISCAL_CERT_PASSWORD: senha do certificado
    
    Exemplo de uso no seu código de teste:
    
        def test_sign_document():
            cert_path = os.environ.get('FISCAL_CERT_PATH')
            cert_password = os.environ.get('FISCAL_CERT_PASSWORD')
            # ... use cert_path e cert_password aqui
    
    O padrão yield garante que:
    1. Variáveis são injetadas ANTES dos testes
    2. Testes rodam COM as variáveis disponíveis
    3. Variáveis originais são restauradas DEPOIS
    """
    
    # ======================================
    # SETUP: Salvar valores originais
    # ======================================
    original_cert_path = os.environ.get('FISCAL_CERT_PATH')
    original_cert_password = os.environ.get('FISCAL_CERT_PASSWORD')
    
    # ======================================
    # SETUP: Injetar certificado para testes
    # ======================================
    os.environ['FISCAL_CERT_PATH'] = test_certificate['path']
    os.environ['FISCAL_CERT_PASSWORD'] = test_certificate['password']
    
    yield  # ← TESTES RODAM AQUI
    
    # ======================================
    # TEARDOWN: Restaurar valores originais
    # ======================================
    if original_cert_path:
        os.environ['FISCAL_CERT_PATH'] = original_cert_path
    else:
        os.environ.pop('FISCAL_CERT_PATH', None)
    
    if original_cert_password:
        os.environ['FISCAL_CERT_PASSWORD'] = original_cert_password
    else:
        os.environ.pop('FISCAL_CERT_PASSWORD', None)