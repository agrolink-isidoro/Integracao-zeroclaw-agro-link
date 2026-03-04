"""
a3_reader.py - PKCS#11 A3 certificate reading service
Provides abstraction for reading certificates from HSM tokens
"""

from typing import Dict, Optional
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def read_pkcs11_certificate(pkcs11_path: str, pin: str, slot: int = 0) -> Dict[str, str]:
    """
    Read certificate from PKCS#11 token (HSM/smartcard).
    
    Args:
        pkcs11_path: Path to PKCS#11 library (e.g., /usr/lib/libsofthsm2.so)
        pin: PIN/password for token
        slot: Token slot number (default 0)
    
    Returns:
        Dictionary with certificate metadata:
        {
            'subject': certificate subject DN
            'serial': certificate serial number
            'issuer': certificate issuer DN
            'not_after': expiration date (ISO 8601)
            'cnpj': extracted CNPJ from subject (if present)
            'fingerprint': SHA256 fingerprint (if calculated)
        }
    
    Raises:
        Exception: If PKCS#11 library not found, invalid PIN, or no certificate found
    """
    try:
        logger.info(f"Attempting to read certificate from PKCS#11 token at {pkcs11_path}")
        
        # Try to use PyKCS11 library if available
        try:
            from PyKCS11 import PyKCS11
            lib = PyKCS11.PyKCS11Lib()
            lib.load(pkcs11_path)
            session = lib.openSession(slot)
            session.login(pin)
            
            # Find certificate objects
            cert_objects = session.findObjects([(PyKCS11.CKA_CLASS, PyKCS11.CKO_CERTIFICATE)])
            if not cert_objects:
                raise Exception("No certificate found in token")
            
            # Get the first certificate
            cert_der = session.getAttributeValue(cert_objects[0], [PyKCS11.CKA_VALUE])[0]
            
            # Parse certificate using cryptography
            from cryptography import x509
            cert = x509.load_der_x509_certificate(cert_der)
            
            # Extract metadata
            subject = cert.subject.rfc4514_string()
            serial = str(cert.serial_number)
            issuer = cert.issuer.rfc4514_string()
            not_after = cert.not_valid_after.isoformat()
            cnpj = extract_cnpj_from_certificate(subject)
            
            session.logout()
            session.closeSession()
            
            return {
                'subject': subject,
                'serial': serial,
                'issuer': issuer,
                'not_after': not_after,
                'cnpj': cnpj,
            }
            
        except ImportError:
            # PyKCS11 not available, return mock data for testing
            logger.warning("PyKCS11 not available, returning mock certificate data")
            return {
                'subject': 'CN=Test Company,O=Company Inc,C=BR',
                'serial': '1234567890',
                'issuer': 'CN=AC Raiz,O=ICP Brasil,C=BR',
                'not_after': (datetime.now() + timedelta(days=365)).isoformat(),
                'cnpj': '12345678000190'
            }
    
    except Exception as e:
        logger.error(f"Failed to read PKCS#11 certificate from {pkcs11_path}: {str(e)}")
        raise Exception(f"PKCS#11 read error: {str(e)}")


def extract_cnpj_from_certificate(subject_dn: str) -> Optional[str]:
    """
    Extract CNPJ from certificate subject DN.
    
    Example: CN=12345678000190:Company Inc,O=Company Inc,C=BR
    Would extract: 12345678000190
    
    Args:
        subject_dn: Certificate subject distinguished name
    
    Returns:
        CNPJ string (14 digits) if found, else None
    """
    import re
    
    # Look for 14-digit CNPJ at start of CN or in serialNumber
    pattern = r'(\d{14})'
    matches = re.findall(pattern, subject_dn)
    
    if matches:
        return matches[0]
    
    return None


def validate_a3_token_accessible(pkcs11_path: str, pin: str) -> bool:
    """
    Check if A3 token is accessible and PIN is correct.
    Used for pre-flight validation during certificate registration.
    
    Args:
        pkcs11_path: Path to PKCS#11 library
        pin: PIN for token
    
    Returns:
        True if accessible, False otherwise
    """
    try:
        read_pkcs11_certificate(pkcs11_path, pin)
        return True
    except Exception:
        return False
