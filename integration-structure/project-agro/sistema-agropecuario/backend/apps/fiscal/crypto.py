from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken
from typing import Iterable, Optional


def _normalize_key(k) -> bytes:
    if k is None:
        return None
    if isinstance(k, str):
        return k.encode()
    return k


def _get_fernet_from_key(key: bytes) -> Fernet:
    return Fernet(key)


# Simple cache for KMS secret value to avoid repeated network calls
_kms_cache = {
    'value': None,
    'expires_at': 0.0
}


def _get_key_from_kms_if_configured() -> Optional[str]:
    """If KMS provider is configured, try to fetch the key value from it.

    Currently supports provider 'aws' which reads from AWS Secrets Manager via boto3.
    The value is cached in-process for `CERT_ENCRYPTION_KMS_CACHE_TTL` seconds (default 300s).
    Returns the base64 key string, or None if not configured or fetch fails.
    """
    import time

    provider = getattr(settings, 'CERT_ENCRYPTION_KMS_PROVIDER', None)
    if not provider:
        return getattr(settings, 'CERT_ENCRYPTION_KEY', None)

    provider = provider.lower()
    if provider == 'aws':
        secret_name = getattr(settings, 'CERT_ENCRYPTION_KMS_SECRET_NAME', None)
        if not secret_name:
            return None

        # Check cache
        ttl = getattr(settings, 'CERT_ENCRYPTION_KMS_CACHE_TTL', 300)
        now = time.time()
        if _kms_cache['value'] is not None and _kms_cache['expires_at'] > now:
            return _kms_cache['value']

        try:
            import boto3
            client = boto3.client('secretsmanager')
            resp = client.get_secret_value(SecretId=secret_name)
            secret = resp.get('SecretString')
            # Cache the secret
            _kms_cache['value'] = secret
            _kms_cache['expires_at'] = now + float(ttl)
            return secret
        except Exception:
            return None

    # Other providers can be added here
    return None


def _get_current_fernet() -> Fernet:
    key = _get_key_from_kms_if_configured()
    if key is None:
        key = Fernet.generate_key()
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_bytes(data: bytes, key: Optional[bytes] = None) -> bytes:
    """Encrypt bytes with provided key or the configured current key."""
    if key is not None:
        key = _normalize_key(key)
        return _get_fernet_from_key(key).encrypt(data)
    return _get_current_fernet().encrypt(data)


def decrypt_bytes(token: bytes) -> bytes:
    """Try to decrypt using the current key and any fallback keys configured in settings.

    Accepts `bytes`, `str` or `memoryview` (coerces to bytes when necessary).
    """
    # Ensure token is bytes for cryptography
    if not isinstance(token, (bytes, str)):
        token = bytes(token)

    # First try current key
    try:
        return _get_current_fernet().decrypt(token)
    except InvalidToken:
        # Try fallback keys
        fallback = getattr(settings, 'CERT_ENCRYPTION_FALLBACK_KEYS', []) or []
        for k in fallback:
            try:
                kbytes = _normalize_key(k)
                return _get_fernet_from_key(kbytes).decrypt(token)
            except InvalidToken:
                continue
        # Give up
        raise


def decrypt_with_keys(token: bytes, keys: Iterable[bytes]) -> bytes:
    """Try to decrypt using explicit list of keys (ordered). Raises InvalidToken if none work.

    Accepts `bytes` or `memoryview` for `token` and coerces to bytes when necessary.
    """
    if not isinstance(token, (bytes, str)):
        token = bytes(token)
    last_exc = None
    for k in keys:
        try:
            kbytes = _normalize_key(k)
            return _get_fernet_from_key(kbytes).decrypt(token)
        except InvalidToken as e:
            last_exc = e
            continue
    if last_exc is not None:
        raise last_exc
    # Nenhuma chave fornecida ou nenhuma gerou InvalidToken; alinhar com docstring
    raise InvalidToken()


def reencrypt_bytes(token: bytes, old_keys: Iterable[bytes], new_key: bytes) -> bytes:
    """Decrypt token using one of old_keys and re-encrypt with new_key."""
    plaintext = decrypt_with_keys(token, old_keys)
    return encrypt_bytes(plaintext, new_key)
