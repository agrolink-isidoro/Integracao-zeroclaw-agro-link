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


# ======================================
# MULTI-TENANCY FIXTURES
# ======================================
# As fixtures abaixo resolvem o problema de 403 Forbidden nos testes.
# O middleware de multi-tenancy espera que cada User tenha uma relação
# com Proprietario (que leva a Fazenda que seta o tenant_id).
#
# Padrão de uso:
#   def test_api(authenticated_user_with_tenant):
#       user, fazenda = authenticated_user_with_tenant
#       # Agora user tem fazenda + tenant configurados
#
# Ou com client:
#   def test_api(api_client_authenticated):
#       response = api_client_authenticated.get('/api/proprietarios/')
#       assert response.status_code == 200


@pytest.fixture
def authenticated_user_with_tenant():
    """
    Cria um usuário com Tenant + Fazenda para passar no middleware de multi-tenancy.
    
    Esta fixture resolve o erro 403 Forbidden que ocorre quando testes
    criam usuários sem tenant. O middleware de multi-tenancy verifica:
        user.tenant → deve estar setado e ativo
    
    Criador:
        1. Tenant (objeto que representa um cliente/organização)
        2. Proprietario (dono de fazendas dentro do tenant)
        3. Fazenda (propriedade agrícola)
        4. User (usuário autenticado com tenant_id setado)
    
    Retorna:
        tuple: (User, Fazenda) - ambos com tenant configurado
    
    Exemplo:
        def test_list_proprietarios(authenticated_user_with_tenant):
            user, fazenda = authenticated_user_with_tenant
            # user.tenant já éum objeto Tenant válido
            # middleware vai permitir access (não 403)
    """
    from django.contrib.auth import get_user_model
    from apps.core.models import Tenant
    from apps.fazendas.models import Proprietario, Fazenda
    
    User = get_user_model()
    
    # 1. Criar Tenant (organização/cliente do sistema)
    tenant, _ = Tenant.objects.get_or_create(
        nome="test_tenant",
        defaults={"slug": "test-tenant"}
    )
    
    # 2. Criar Proprietario (dono de fazendas)
    proprietario, _ = Proprietario.objects.get_or_create(
        tenant=tenant,
        nome="Test Proprietário",
        cpf_cnpj="12345678901",
        defaults={
            "email": "proprietario@test.local",
            "telefone": "11999999999",
        }
    )
    
    # 3. Criar User com tenant FK (CRÍTICO para middleware)
    user, _ = User.objects.get_or_create(
        username="test_user",
        defaults={
            "email": "testuser@test.local",
            "first_name": "Test",
            "last_name": "User",
            "tenant": tenant,  # FK direto, não tenant_id
        }
    )
    
    # Garantir que User tem tenant setado (caso get retornar existente)
    if user.tenant_id != tenant.id:
        user.tenant = tenant
        user.save()
    
    # 4. Criar Fazenda (propriedade agrícola)
    fazenda, _ = Fazenda.objects.get_or_create(
        tenant=tenant,
        nome="Test Farm",
        proprietario=proprietario,
        defaults={
            "localizacao": "POINT(-48.123 -15.456)",  # lon, lat (Brasília aprox)
            "area_total": 100.0,
        }
    )
    
    return user, fazenda


@pytest.fixture
def api_client_authenticated(authenticated_user_with_tenant):
    """
    Retorna um cliente REST test authenticado com usuário e fazenda.
    
    Esta fixture combina:
    - authenticated_user_with_tenant: garante que user tem tenant
    - REST test client: cliente HTTP autenticado
    
    O cliente já está logado e tem as headers necessárias para contornar
    o middleware de multi-tenancy que espera tenant_id no usuario.
    
    Retorna:
        APIClient: cliente REST autenticado
    
    Exemplo:
        def test_list_proprietarios(api_client_authenticated):
            response = api_client_authenticated.get('/api/proprietarios/')
            assert response.status_code == 200
            assert len(response.data) > 0
    """
    from rest_framework.test import APIClient
    
    user, fazenda = authenticated_user_with_tenant
    
    client = APIClient()
    client.force_authenticate(user=user)
    
    # Adicionar headers opcionais se necessário
    # client.default_format = 'json'
    
    return client


@pytest.fixture
def user_with_tenant():
    """
    Retorna (user, tenant) para testes que precisam de tenant.
    
    Alias para authenticated_user_with_tenant mas retorna (user, tenant)
    em vez de (user, fazenda).
    """
    from django.contrib.auth import get_user_model
    from apps.core.models import Tenant
    from apps.fazendas.models import Proprietario, Fazenda
    
    User = get_user_model()
    
    tenant, _ = Tenant.objects.get_or_create(
        nome="test_tenant",
        defaults={"slug": "test-tenant"}
    )
    
    proprietario, _ = Proprietario.objects.get_or_create(
        tenant=tenant,
        nome="Test Proprietário",
        cpf_cnpj="12345678901",
        defaults={
            "email": "proprietario@test.local",
            "telefone": "11999999999",
        }
    )
    
    user, _ = User.objects.get_or_create(
        username="test_user",
        defaults={
            "email": "testuser@test.local",
            "first_name": "Test",
            "last_name": "User",
            "tenant": tenant,
        }
    )
    
    if user.tenant_id != tenant.id:
        user.tenant = tenant
        user.save()
    
    return user, tenant


@pytest.fixture
def client_with_tenant_staff(user_with_tenant):
    """
    Retorna APIClient autenticado com user que tem tenant.
    
    Fixture que combina user_with_tenant com APIClient para testes
    de API que precisam de autenticação com tenant.
    """
    from rest_framework.test import APIClient
    
    user, tenant = user_with_tenant
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user