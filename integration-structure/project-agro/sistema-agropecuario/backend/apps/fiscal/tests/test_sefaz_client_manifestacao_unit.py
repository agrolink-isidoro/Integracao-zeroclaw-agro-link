import os
import logging

import pytest

# Import SefazClient directly from file to avoid package import complications in
# minimal test environments (we load the module by path).
import importlib.util
import pathlib

_spec_path = pathlib.Path(__file__).resolve().parents[3] / 'apps' / 'fiscal' / 'services' / 'sefaz_client.py'
_spec = importlib.util.spec_from_file_location('sefaz_client_mod', str(_spec_path))
_sefaz_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sefaz_mod)
SefazClient = _sefaz_mod.SefazClient


def _have_cryptography():
    try:
        import cryptography  # noqa: F401
        return True
    except Exception:
        return False


def _have_signxml():
    try:
        import signxml  # noqa: F401
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _have_cryptography(), reason='cryptography not available')
def test_extract_pems_from_pkcs12_no_password():
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import hashes, serialization
    import datetime
    from cryptography import x509
    from cryptography.x509 import Name, NameAttribute
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives.serialization import pkcs12

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test NoPass')])
    cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())
    p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.NoEncryption())

    class FakeCert:
        def get_arquivo_bytes(self):
            return p12

    fake = FakeCert()
    client = SefazClient(simulate=False)
    res = client._extract_pems_from_pkcs12(fake)
    assert res is not None
    key_pem, cert_pem = res
    assert b'PRIVATE KEY' in key_pem
    assert b'CERTIFICATE' in cert_pem


@pytest.mark.skipif(not _have_cryptography(), reason='cryptography not available')
def test_extract_pems_from_pkcs12_with_password_env():
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import hashes, serialization
    import datetime
    from cryptography import x509
    from cryptography.x509 import Name, NameAttribute
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives.serialization import pkcs12

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'Test Pass')])
    cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())
    password = b'testpass'
    p12 = pkcs12.serialize_key_and_certificates(name=b'test', key=key, cert=cert, cas=None, encryption_algorithm=serialization.BestAvailableEncryption(password))

    class FakeCert2:
        def get_arquivo_bytes(self):
            return p12

    fake2 = FakeCert2()
    prev = os.environ.get('FISCAL_TEST_PFX_PASS')
    os.environ['FISCAL_TEST_PFX_PASS'] = password.decode('utf-8')
    try:
        client = SefazClient(simulate=False)
        res = client._extract_pems_from_pkcs12(fake2)
        assert res is not None
        key_pem, cert_pem = res
        assert b'PRIVATE KEY' in key_pem
        assert b'CERTIFICATE' in cert_pem
    finally:
        if prev is None:
            del os.environ['FISCAL_TEST_PFX_PASS']
        else:
            os.environ['FISCAL_TEST_PFX_PASS'] = prev


def test_extract_pems_from_pkcs12_corrupted_returns_none_and_logs(caplog):
    client = SefazClient(simulate=False)

    class FakeCorrupt:
        def get_arquivo_bytes(self):
            return b'random-not-a-pkcs12'

    fake = FakeCorrupt()
    # capture all debug logs (module uses a module-local logger name when loaded by path)
    caplog.set_level(logging.DEBUG)
    res = client._extract_pems_from_pkcs12(fake)
    assert res is None
    # ensure we logged failure message
    assert any('PKCS12 extraction failed' in m or 'openssl' in m or 'pkcs12' in m.lower() for m in caplog.messages)


@pytest.mark.skipif(not _have_signxml() or not _have_cryptography(), reason='signxml or cryptography not available')
def test__sign_xml_embeds_x509_when_end_entity_cert():
    # generate key/cert pair via cryptography
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import hashes, serialization
    import datetime
    from cryptography import x509
    from cryptography.x509 import Name, NameAttribute
    from cryptography.x509.oid import NameOID
    from signxml import XMLVerifier
    from lxml import etree

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'EndEntity')])
    cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).sign(key, hashes.SHA256())

    key_pem = key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption())
    cert_pem = cert.public_bytes(serialization.Encoding.PEM)

    client = SefazClient(simulate=False)
    xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=5, motivo='embed-cert')
    signed = client._sign_xml(xml, key_pem, cert_pem)

    assert b'X509Certificate' in signed


@pytest.mark.skipif(not _have_signxml() or not _have_cryptography(), reason='signxml or cryptography not available')
def test__sign_xml_omits_x509_when_ca_cert():
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives import hashes, serialization
    import datetime
    from cryptography import x509
    from cryptography.x509 import Name, NameAttribute
    from cryptography.x509.oid import NameOID

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = Name([NameAttribute(NameOID.COMMON_NAME, u'CA')])
    cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1)).not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=365)).add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True).sign(key, hashes.SHA256())

    key_pem = key.private_bytes(encoding=serialization.Encoding.PEM, format=serialization.PrivateFormat.TraditionalOpenSSL, encryption_algorithm=serialization.NoEncryption())
    cert_pem = cert.public_bytes(serialization.Encoding.PEM)

    client = SefazClient(simulate=False)
    xml = client._build_manifest_xml('0'*44, 'ciencia', nSeqEvento=6, motivo='ca-cert')
    signed = client._sign_xml(xml, key_pem, cert_pem)
    assert b'X509Certificate' not in signed
