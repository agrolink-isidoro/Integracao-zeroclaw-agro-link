from dataclasses import dataclass
from typing import Optional
from django.utils import timezone
import uuid
from django.conf import settings
import logging
import os
import requests
import requests.exceptions
import xml.etree.ElementTree as ET
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class EmitResult:
    success: bool
    protocolo: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None
    data_autorizacao: Optional[str] = None


class SefazClient:
    """SEFAZ client com integração real aos webservices SOAP da SEFAZ.

    Suporta ambiente de homologação (sandbox) e produção.
    Em desenvolvimento, usa homologação por padrão para testes reais sem consequências fiscais.
    """

    def __init__(self, simulate: bool = None, endpoint: Optional[str] = None, timeout: int = None, max_retries: int = 3, backoff_factor: float = 0.5):
        # Configuração baseada no settings se não especificado
        if simulate is None:
            simulate = not getattr(settings, 'SEFAZ_USE_REAL_SERVICE', True)

        # `SEFAZ_SIMULATE_ONLY` é uma flag global que FORÇA simulação independentemente
        # do valor passado ao construtor. Isso garante que, quando configurada via
        # variável de ambiente (ex: no docker-compose), o cliente sempre opere em modo
        # simulado para testes locais/homologação.
        if getattr(settings, 'SEFAZ_SIMULATE_ONLY', False):
            simulate = True

        self.simulate = simulate
        self.ambiente = getattr(settings, 'SEFAZ_AMBIENTE', 2)  # 1=Produção, 2=Homologação
        
        # URLs configuradas por ambiente (NF-e 4.0)
        sefaz_urls = getattr(settings, 'SEFAZ_URLS', {})
        self.endpoint = endpoint or sefaz_urls.get(self.ambiente, {}).get('manifestacao', 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx')
        
        self.timeout = timeout or getattr(settings, 'SEFAZ_TIMEOUT', 30)
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        # Lazy session; created when needed
        self._session = None

    def emit(self, nfe, certificado=None) -> EmitResult:
        """Emit an NFe. When simulate=True, return a successful authorization.
        When simulate=False, sends to real SEFAZ (homolog or production).

        Args:
            nfe: NFe instance (should have xml_content)
            certificado: CertificadoSefaz instance (required for real emission)
        Returns:
            EmitResult
        """
        if not nfe.xml_content:
            return EmitResult(success=False, message='NFe sem XML')

        if self.simulate:
            protocolo = str(uuid.uuid4()).replace('-', '')[:15]
            now = timezone.now().isoformat()
            return EmitResult(success=True, protocolo=protocolo, status='100', data_autorizacao=now)

        # Real emission mode: require certificado
        if certificado is None:
            return EmitResult(success=False, message='Certificado obrigatório para emissão real')
        
        # Emit to real SEFAZ (homolog or production based on self.ambiente)
        return self._emit_real_sefaz(nfe, certificado)

    def _emit_real_sefaz(self, nfe, certificado) -> EmitResult:
        """Send NFe to real SEFAZ (homologação or produção) via SOAP webservice.
        
        This implements the full authorization flow:
        1. Extract <NFe> from xml_content (remove <nfeProc> wrapper if present)
        2. Sign XML with digital certificate
        3. Build SOAP envelope for NfeAutorizacao4
        4. Send to SEFAZ endpoint with mTLS
        5. Parse response and extract protocol
        """
        logger.info(f"Emitindo NFe {nfe.chave_acesso} para SEFAZ ambiente {self.ambiente}")
        
        try:
            # Step 0: Extract <NFe> from stored XML (may be wrapped in <nfeProc>)
            xml_to_send = self._extract_nfe_element(nfe.xml_content)
            if not xml_to_send:
                return EmitResult(success=False, message='Falha ao extrair elemento <NFe> do XML')
            
            # Step 1: Sign the XML
            signed_xml = self._sign_nfe_xml(xml_to_send, certificado)
            if not signed_xml:
                return EmitResult(success=False, message='Falha ao assinar XML')
            
            # Step 2: Build SOAP envelope for NfeAutorizacao4
            soap_envelope = self._build_autorizacao_soap(signed_xml, self.ambiente)
            
            # Step 3: Get authorization endpoint
            sefaz_urls = getattr(settings, 'SEFAZ_URLS', {})
            autorizacao_url = sefaz_urls.get(self.ambiente, {}).get('autorizacao')
            
            # Fallback para endpoints padrão se não configurado
            # SVRS atende: AC, AL, AP, DF, ES, PB, PI, RJ, RN, RO, RR, SC, SE, TO
            # Outras UFs têm SEFAZ própria
            if not autorizacao_url:
                if self.ambiente == 2:  # Homologação
                    autorizacao_url = 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx'
                else:  # Produção
                    autorizacao_url = 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx'
            
            logger.info(f"Enviando para: {autorizacao_url}")
            
            # Step 4: Prepare certificate for mTLS
            cert_tuple = self._prepare_client_cert_tuple(certificado)
            if not cert_tuple:
                return EmitResult(success=False, message='Falha ao preparar certificado para mTLS')
            
            # Step 5: Send SOAP request
            try:
                headers = {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': '"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote"'
                }
                
                # Disable SSL warnings when verify=False
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                
                response = requests.post(
                    autorizacao_url,
                    data=soap_envelope,
                    headers=headers,
                    cert=cert_tuple,
                    timeout=120,  # Authorization can take longer
                    verify=False  # TODO: Install ICP-Brasil root certificates for production
                )
                
                logger.info(f"SEFAZ respondeu: HTTP {response.status_code}")
                
                if response.status_code != 200:
                    return EmitResult(
                        success=False,
                        message=f'SEFAZ HTTP {response.status_code}: {response.text[:500]}'
                    )
                
                # Step 6: Parse SOAP response
                result = self._parse_autorizacao_response(response.text)
                return result
                
            finally:
                # Cleanup temp certificate files
                if cert_tuple and isinstance(cert_tuple, tuple):
                    import os
                    for path in cert_tuple:
                        if path and os.path.exists(path):
                            try:
                                os.remove(path)
                            except:
                                pass
        
        except Exception as e:
            logger.error(f"Erro ao emitir NFe para SEFAZ: {e}")
            import traceback
            traceback.print_exc()
            return EmitResult(success=False, message=str(e))

    def _extract_nfe_element(self, xml_content: str) -> str | None:
        """Extract <NFe> element from XML, removing <nfeProc> wrapper if present."""
        try:
            from lxml import etree
            
            # Parse XML
            root = etree.fromstring(xml_content.encode('utf-8'))
            
            # If root is <nfeProc>, extract <NFe> child
            if root.tag.endswith('nfeProc'):
                nfe_elem = root.find('.//{http://www.portalfiscal.inf.br/nfe}NFe')
                if nfe_elem is not None:
                    return etree.tostring(nfe_elem, encoding='unicode', xml_declaration=False)
            
            # If root is <NFe>, return as-is
            if root.tag.endswith('NFe'):
                return xml_content
            
            logger.error(f"Unexpected root element: {root.tag}")
            return None
            
        except Exception as e:
            logger.error(f"Falha ao extrair <NFe>: {e}")
            return None

    def _sign_nfe_xml(self, xml_content: str, certificado) -> bytes | None:
        """Sign NFe XML with digital certificate using XMLDSig."""
        try:
            # Extract PEMs from certificate
            pems = self._extract_pems_from_pkcs12(certificado)
            if not pems:
                logger.error("Failed to extract PEMs from certificate")
                return None
            
            key_pem, cert_pem = pems
            
            # Try to use signxml if available
            try:
                from signxml import XMLSigner
                from lxml import etree
                import re
                
                # SEFAZ ainda usa SHA1 (legado, mas obrigatório)
                # Permitir SHA1 temporariamente para compatibilidade SEFAZ
                import warnings
                from cryptography.utils import CryptographyDeprecationWarning
                warnings.filterwarnings('ignore', category=CryptographyDeprecationWarning)
                
                # CRITICAL: SEFAZ rejects XML with formatting whitespace (cStat 588)
                # We MUST remove ALL whitespace BEFORE signing, because:
                # 1. The signature computes a hash of the EXACT bytes
                # 2. SEFAZ validates against the hash WITHOUT whitespace
                # 3. Any modification after signing breaks the signature
                
                # Step 1: Parse XML and compact it BEFORE signing
                root = etree.fromstring(xml_content.encode('utf-8'))
                
                # Serialize compactly (no pretty print)
                xml_compact_bytes = etree.tostring(root, encoding='utf-8')
                xml_compact_str = xml_compact_bytes.decode('utf-8')
                
                # Remove ALL whitespace between tags (preserving text content)
                xml_compact_str = re.sub(r'>\s+<', '><', xml_compact_str)
                
                # Step 2: Re-parse the compacted XML for signing
                root = etree.fromstring(xml_compact_str.encode('utf-8'))
                
                # Find infNFe element (the one to be signed)
                inf_nfe = root.find('.//{http://www.portalfiscal.inf.br/nfe}infNFe')
                if inf_nfe is None:
                    logger.error("infNFe element not found in XML")
                    return None
                
                # Create signer with NFe 4.0 specific algorithms
                # SEFAZ usa algoritmos legados (análise de XML real):
                # - CanonicalizationMethod: http://www.w3.org/TR/2001/REC-xml-c14n-20010315 (C14N inclusivo)
                # - SignatureMethod: http://www.w3.org/2000/09/xmldsig#rsa-sha1  
                # - DigestMethod: http://www.w3.org/2000/09/xmldsig#sha1
                
                # signxml bloqueou SHA1 por segurança, mas SEFAZ exige
                # Usar flag allow_deprecated_algorithms do signxml
                try:
                    from signxml.util import _ALLOW_DEPRECATED_ALGORITHMS
                    # Tentar habilitar algoritmos deprecated
                    import signxml.util
                    signxml.util._ALLOW_DEPRECATED_ALGORITHMS = True
                except:
                    pass
                
                try:
                    signer = XMLSigner(
                        signature_algorithm="rsa-sha1",
                        digest_algorithm="sha1",
                        c14n_algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
                    )
                except (TypeError, ValueError) as e:
                    logger.error(f"Erro ao criar XMLSigner com SHA1: {e}")
                    return None
                
                # Get the Id attribute
                id_attr = inf_nfe.get('Id')
                if not id_attr:
                    logger.error("infNFe element has no Id attribute")
                    return None
                
                # CRITICAL NFe 4.0 Structure:
                # <NFe><infNFe Id="...">...</infNFe><Signature>...</Signature></NFe>
                #
                # signxml.sign() adds Signature as a CHILD of the element passed to it.
                # If we sign infNFe, Signature goes inside infNFe (WRONG).
                # If we sign NFe, Signature goes inside NFe (CORRECT).
                #
                # Solution: Sign the NFe root element, but reference only infNFe
                
                nfe_root = inf_nfe.getparent()  # This should be <NFe>
                if nfe_root is None:
                    logger.error("infNFe has no parent NFe element")
                    return None
                
                # Sign NFe root (signature will be added as child of NFe, after infNFe)
                try:
                    signed_nfe = signer.sign(nfe_root, key=key_pem, cert=cert_pem, reference_uri=f"#{id_attr}")
                except TypeError:
                    try:
                        signed_nfe = signer.sign(nfe_root, key=key_pem, cert=cert_pem)
                    except Exception:
                        signed_nfe = signer.sign(nfe_root, key=key_pem)
                
                # Replace root in document
                doc_root = nfe_root.getparent()
                if doc_root is not None:
                    doc_root.replace(nfe_root, signed_nfe)
                    root = doc_root
                else:
                    # nfe_root is already the document root
                    root = signed_nfe
                
                # Step 3: Serialize final signed XML WITHOUT pretty printing
                # CRITICAL: Do NOT use method='c14n' here - it removes namespace prefixes
                # which breaks SEFAZ validation. Use regular serialization without formatting.
                signed_xml_bytes = etree.tostring(root, encoding='utf-8')
                
                # DEBUG: Save to inspect signature structure
                with open('/tmp/signed_nfe_debug.xml', 'wb') as f:
                    f.write(signed_xml_bytes)
                logger.info("DEBUG: Signed XML saved to /tmp/signed_nfe_debug.xml")
                
                return signed_xml_bytes
                
            except ImportError:
                logger.warning("signxml not available, returning unsigned XML")
                return xml_content.encode('utf-8')
                
            except ImportError:
                logger.warning("signxml not available, returning unsigned XML")
                return xml_content.encode('utf-8')
        
        except Exception as e:
            logger.error(f"Error signing XML: {e}")
            return None

    def _build_autorizacao_soap(self, xml_nfe: bytes, ambiente: int) -> bytes:
        """Build SOAP envelope for NfeAutorizacao4 webservice."""
        from lxml import etree
        
        # Decode XML
        xml_str = xml_nfe.decode('utf-8') if isinstance(xml_nfe, bytes) else xml_nfe
        
        # IMPORTANTE: Para SVRS (Sefaz Virtual RS), o cUF no header SEMPRE deve ser 43 (RS)
        # independentemente do cUF da nota fiscal.
        # O SVRS atende múltiplos estados (AC, AL, AP, DF, ES, PB, PI, RJ, RN, RO, RR, SC, SE, TO)
        # mas o header do SOAP sempre usa cUF=43
        cuf = '43'  # SVRS
        
        # Gerar número de lote aleatório (15 dígitos)
        import random
        lote = random.randint(100000000000000, 999999999999999)
        
        # Build SOAP - NFe XML is already canonicalized, just insert it as-is
        soap = f'''<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
<soap:Header>
<nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
<cUF>{cuf}</cUF>
<versaoDados>4.00</versaoDados>
</nfeCabecMsg>
</soap:Header>
<soap:Body>
<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>{lote}</idLote><indSinc>1</indSinc>{xml_str}</enviNFe>
</nfeDadosMsg>
</soap:Body>
</soap:Envelope>'''
        
        return soap.encode('utf-8')

    def _parse_autorizacao_response(self, response_xml: str) -> EmitResult:
        """Parse SEFAZ NfeAutorizacao4 SOAP response."""
        try:
            from lxml import etree
            
            # Log resposta para debug
            logger.debug(f"Resposta SEFAZ (primeiros 2000 chars): {response_xml[:2000]}")
            
            root = etree.fromstring(response_xml.encode('utf-8'))
            
            # Look for retEnviNFe element
            ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
            ret_env = root.find('.//nfe:retEnviNFe', ns)
            
            if ret_env is None:
                return EmitResult(success=False, message='retEnviNFe não encontrado na resposta')
            
            # Extract status
            c_stat = ret_env.findtext('nfe:cStat', namespaces=ns)
            x_motivo = ret_env.findtext('nfe:xMotivo', namespaces=ns)
            
            logger.info(f"SEFAZ cStat: {c_stat} - {x_motivo}")
            
            # Check if we need to query receipt (cStat = 103 or 104)
            if c_stat in ('103', '104'):
                # Extract receipt number
                n_rec = ret_env.findtext('nfe:infRec/nfe:nRec', namespaces=ns)
                if not n_rec:
                    n_rec = ret_env.findtext('nfe:nRec', namespaces=ns)
                
                if n_rec:
                    logger.info(f"SEFAZ retornou recibo: {n_rec}. Status 104 indica lote processado mas precisa consultar recibo.")
                return EmitResult(
                    success=True,
                    status=c_stat,
                    message=f"Lote processado (cStat {c_stat}). Recibo: {n_rec if n_rec else 'não encontrado'}. Implemente consulta NfeRetAutorizacao4 para obter resultado final.",
                    protocolo=n_rec  # Guardar recibo para consulta posterior
                )
            
            # Check if authorized (cStat = 100)
            if c_stat == '100':
                # Extract protocol from protNFe
                prot_nfe = ret_env.find('.//nfe:protNFe', ns)
                if prot_nfe is not None:
                    inf_prot = prot_nfe.find('nfe:infProt', ns)
                    if inf_prot is not None:
                        n_prot = inf_prot.findtext('nfe:nProt', namespaces=ns)
                        dh_rec_bto = inf_prot.findtext('nfe:dhRecbto', namespaces=ns)
                        
                        return EmitResult(
                            success=True,
                            protocolo=n_prot,
                            status=c_stat,
                            data_autorizacao=dh_rec_bto,
                            message=x_motivo
                        )
            
            # Not authorized or error
            return EmitResult(
                success=False,
                status=c_stat,
                message=f"cStat {c_stat}: {x_motivo}"
            )
        
        except Exception as e:
            logger.error(f"Error parsing authorization response: {e}")
            return EmitResult(success=False, message=f'Erro ao processar resposta: {e}')
    
    def _sign_with_xmlsec1(self, root, key_pem: bytes, cert_pem: bytes) -> bytes | None:
        """Fallback: assinar XML usando xmlsec1 command-line (suporta SHA1)."""
        import tempfile
        import subprocess
        from lxml import etree
        
        try:
            # Criar arquivos temporários para chave e certificado
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.key', delete=False) as key_file:
                key_file.write(key_pem)
                key_path = key_file.name
            
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.crt', delete=False) as cert_file:
                cert_file.write(cert_pem)
                cert_path = cert_file.name
            
            with tempfile.NamedTemporaryFile(mode='wb', suffix='.xml', delete=False) as xml_file:
                xml_file.write(etree.tostring(root))
                xml_path = xml_file.name
            
            # Criar template de assinatura
            # TODO: implementar template completo para xmlsec1
            # Por enquanto, retornar erro para forçar outra abordagem
            logger.warning("xmlsec1 signing not yet fully implemented")
            return None
            
        except Exception as e:
            logger.error(f"Error signing with xmlsec1: {e}")
            return None
        finally:
            # Cleanup
            import os
            try:
                os.unlink(key_path)
                os.unlink(cert_path)
                os.unlink(xml_path)
            except:
                pass

    def _build_manifest_xml(self, chave_acesso: str, tp_evento: str, nSeqEvento: int = 1, motivo: str | None = None) -> bytes:
        """Build a minimal event XML for manifestacao. This is intentionally
        minimal for testability; for production, adapt to the full SEFAZ schema."""
        from datetime import datetime
        dhEvento = datetime.utcnow().isoformat() + 'Z'
        # Minimal XML structure; real schema is more complex
        xml = f"<evento><infEvento Id=\"ID{tp_evento}{chave_acesso}{str(nSeqEvento).zfill(2)}\"><tpEvento>{tp_evento}</tpEvento><chNFe>{chave_acesso}</chNFe><nSeqEvento>{nSeqEvento}</nSeqEvento><dhEvento>{dhEvento}</dhEvento>"
        if motivo:
            xml += f"<detEvento><xJust>{motivo}</xJust></detEvento>"
        xml += "</infEvento></evento>"
        return xml.encode('utf-8')

    def _extract_pems_from_pkcs12(self, certificado) -> tuple[bytes, bytes] | None:
        """Extract key and cert PEM bytes from a PKCS12 container. Returns (key_pem, cert_pem) or None.

        This function attempts several strategies and logs diagnostics to help
        debugging extraction issues in CI/local runs:
         - Try cryptography.hazmat.pkcs12 with common password variants (None, empty, env)
         - If that fails, fallback to calling `openssl pkcs12` and parsing its output

        Important: this method purposefully returns None on failure but logs details
        that help track down why a particular PKCS12 can't be parsed.
        """
        try:
            pkcs12_bytes = None
            certificado_password = None
            
            # Suporte para certificado A3 (novo sistema)
            if hasattr(certificado, 'data') and hasattr(certificado, 'password'):
                # Certificado A3 wrapper
                pkcs12_bytes = certificado.data
                certificado_password = certificado.password
                logger.debug('Using A3 certificate data with custom password')
            elif hasattr(certificado, 'get_arquivo_bytes'):
                pkcs12_bytes = certificado.get_arquivo_bytes()
                # Verificar se tem método get_senha()
                if hasattr(certificado, 'get_senha'):
                    senha = certificado.get_senha()
                    if senha:
                        certificado_password = senha
                        logger.debug('Using password from get_senha() method')
            elif hasattr(certificado, 'arquivo') and hasattr(certificado.arquivo, 'read'):
                pkcs12_bytes = certificado.arquivo.read()
            elif isinstance(certificado, (bytes, bytearray)):
                pkcs12_bytes = certificado

            if not pkcs12_bytes:
                logger.debug('No pkcs12 bytes provided to _extract_pems_from_pkcs12')
                return None

            from cryptography.hazmat.primitives.serialization import pkcs12
            from cryptography.hazmat.primitives import serialization

            # Try loading PKCS12 with several common password options for robustness:
            load_attempts = [None, b'']
            
            # Adicionar senha do certificado A3 se disponível
            if certificado_password:
                if isinstance(certificado_password, str):
                    load_attempts.insert(0, certificado_password.encode('utf-8'))
                else:
                    load_attempts.insert(0, certificado_password)
            
            env_pass = os.environ.get('FISCAL_TEST_PFX_PASS') if 'FISCAL_TEST_PFX_PASS' in os.environ else None
            if env_pass is not None:
                try:
                    load_attempts.append(env_pass.encode('utf-8'))
                except Exception:
                    pass

            p12 = None
            for pw in load_attempts:
                try:
                    logger.debug('Attempting pkcs12.load_key_and_certificates with password type: %s', 'None' if pw is None else f'len={len(pw)}')
                    p12 = pkcs12.load_key_and_certificates(pkcs12_bytes, password=pw)
                    if p12 and p12[0] is not None and p12[1] is not None:
                        logger.debug('Loaded PKCS12 via cryptography with password type %s', 'None' if pw is None else 'provided')
                        break
                except Exception as e:
                    logger.debug('cryptography pkcs12 load failed for pw type %s: %s', 'None' if pw is None else 'provided', str(e))
                    p12 = None

            if not p12 or p12[0] is None or p12[1] is None:
                # Try an OpenSSL-based fallback by writing the PKCS12 to a temp file
                # and invoking `openssl pkcs12 -in ... -nodes -passin ...`
                import tempfile
                import subprocess
                import re
                tf = None
                try:
                    tf = tempfile.NamedTemporaryFile(delete=False)
                    tf.write(pkcs12_bytes)
                    tf.flush()
                    pfx_path = tf.name
                    tf.close()

                    pass_args = []
                    if env_pass:
                        pass_args.append(f"pass:{env_pass}")
                    # always try empty password as a fallback
                    pass_args.append('pass:')

                    for pass_arg in pass_args:
                        try:
                            logger.debug('Trying openssl fallback with passin=%s on %s', pass_arg, pfx_path)
                            out = subprocess.check_output(['openssl', 'pkcs12', '-in', pfx_path, '-nodes', '-passin', pass_arg], stderr=subprocess.STDOUT)
                            out_text = out.decode('utf-8', errors='ignore')
                            logger.debug('openssl output length: %d', len(out_text))

                            # Extract first private key and first certificate
                            key_re = re.search(r"(-----BEGIN .*PRIVATE KEY-----.*?-----END .*PRIVATE KEY-----)", out_text, re.S)
                            cert_re = re.search(r"(-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----)", out_text, re.S)
                            if key_re and cert_re:
                                key_pem = key_re.group(1).encode('utf-8')
                                cert_pem = cert_re.group(1).encode('utf-8')
                                logger.debug('Successfully extracted key and cert via openssl fallback (passin=%s)', pass_arg)
                                return key_pem, cert_pem
                            else:
                                logger.debug('openssl fallback did not find PEM blocks with passin=%s (key found: %s, cert found: %s)', pass_arg, bool(key_re), bool(cert_re))
                        except subprocess.CalledProcessError as cpe:
                            out = cpe.output.decode('utf-8', errors='ignore') if getattr(cpe, 'output', None) else str(cpe)
                            logger.debug('openssl call with passin=%s failed: %s', pass_arg, out)
                    # end for
                    logger.debug('All openssl fallback attempts failed')
                except subprocess.CalledProcessError as cpe:
                    logger.debug('openssl command failed: %s', cpe.output.decode('utf-8', errors='ignore') if getattr(cpe, 'output', None) else str(cpe))
                except Exception as e:
                    logger.exception('Unexpected error in openssl fallback: %s', e)
                finally:
                    try:
                        if tf is not None and os.path.exists(tf.name):
                            os.remove(tf.name)
                    except Exception:
                        pass

                logger.debug('PKCS12 extraction failed after both cryptography and openssl attempts')
                return None

            private_key = p12[0]
            cert = p12[1]

            key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            )
            cert_pem = cert.public_bytes(serialization.Encoding.PEM)
            logger.debug('Successfully extracted key and cert via cryptography')
            return key_pem, cert_pem
        except Exception as e:
            logger.exception('Unhandled error in _extract_pems_from_pkcs12: %s', e)
            return None

    def _sign_xml(self, xml_bytes: bytes, key_pem: bytes, cert_pem: bytes) -> bytes:
        """Signs the event XML using signxml when available.

        Implementation details:
        - Parse the XML with lxml and locate the `infEvento` element (by local-name).
        - Use `signxml.XMLSigner` to create an enveloped signature for that element.
        - Replace the original `infEvento` element with the signed element and
          return the full signed document bytes.
        - If signxml/lxml are not available or signing fails, log and return
          the original bytes (best-effort behavior for test/homolog).
        """
        try:
            from signxml import XMLSigner
            from lxml import etree

            root = etree.fromstring(xml_bytes)
            # find infEvento element ignoring namespace
            inf_nodes = root.xpath('.//*[local-name()="infEvento"]')
            if not inf_nodes:
                # Nothing to sign; return original
                return xml_bytes

            inf = inf_nodes[0]
            try:
                signer = XMLSigner(method="enveloped", signature_algorithm="rsa-sha256")
            except Exception as e:
                # Some signxml versions may reject the `method` argument or
                # raise other errors on construction (e.g. Unknown signature
                # construction method). In that case, retry without the
                # `method` parameter and surface debug logs to help triage.
                logger.debug('XMLSigner constructor with method failed: %s; retrying without method', e)
                try:
                    signer = XMLSigner(signature_algorithm="rsa-sha256")
                except Exception as e2:
                    logger.debug('XMLSigner constructor without method also failed: %s', e2)
                    raise

            # Ensure we have an Id attribute to sign (SEFAZ requires an ID for the infEvento)
            id_attr = inf.get('Id') or inf.get('ID')
            if not id_attr:
                # create deterministic ID if missing
                id_attr = f"ID{tp_evento}{inf.find('.//{*}chNFe').text if inf.find('.//{*}chNFe') is not None else ''}{str(nSeqEvento).zfill(2)}"
                inf.set('Id', id_attr)

            # Determine whether to include the certificate in the signature.
            # When the provided certificate is an end-entity (BasicConstraints.ca=False)
            # it is generally safe to embed it and allow SignXML to verify against it
            # (this satisfies unit tests that call XMLVerifier().verify(signed)).
            # However, some test PKCS#12 bundles contain self-signed certs that are
            # marked as CA=true (e.g., generated test fixtures). Embedding those
            # can cause strict X.509 chain validation to fail during verification.
            # To accommodate both cases, only embed the cert when it appears to be
            # an end-entity certificate (ca=False). If we cannot parse the cert,
            # fall back to a KeyValue-only signature.
            include_cert = False
            try:
                from cryptography import x509
                from cryptography.hazmat.primitives import serialization as _ser
                cert_obj = x509.load_pem_x509_certificate(cert_pem)
                try:
                    bc = cert_obj.extensions.get_extension_for_class(x509.BasicConstraints)
                    include_cert = (not bc.value.ca)
                except Exception:
                    # If BasicConstraints not present or any parsing issue, default
                    # to not embedding the cert to avoid verification surprises.
                    include_cert = False
            except Exception:
                # cryptography not available or parsing failed; avoid embedding cert
                include_cert = False

            try:
                if include_cert:
                    try:
                        signed_inf = signer.sign(inf, key=key_pem, cert=cert_pem, reference_uri=f"#{id_attr}")
                    except TypeError:
                        signed_inf = signer.sign(inf, key=key_pem, cert=cert_pem)
                else:
                    try:
                        signed_inf = signer.sign(inf, key=key_pem, reference_uri=f"#{id_attr}")
                    except TypeError:
                        signed_inf = signer.sign(inf, key=key_pem)
            except Exception as e:
                logger.debug('Signing with cert inclusion=%s failed: %s', include_cert, e)
                # As a last resort, attempt a key-only signature
                try:
                    signed_inf = signer.sign(inf, key=key_pem)
                except Exception:
                    # If even this fails, propagate the exception up to the outer
                    # handler which will cause the original XML to be returned.
                    raise

            # Replace the original inf with signed one
            parent = inf.getparent()
            if parent is not None and signed_inf is not inf:
                parent.replace(inf, signed_inf)

            return etree.tostring(root)
        except Exception as e:
            # signxml or lxml not available, or signing failed; return original
            logger.warning(f'XML signing not available or failed; proceeding without signature: {str(e)}')
            return xml_bytes


    def send_manifestacao(self, chave_acesso: str, tipo_manifestacao: str, certificado=None, nSeqEvento: int = 1, motivo: str = None) -> dict:
        """Envia manifestação do destinatário para SEFAZ.
        
        Args:
            chave_acesso: Chave de 44 dígitos da NFe
            tipo_manifestacao: 'ciencia', 'confirmacao', 'desconhecimento', 'nao_realizada'
            certificado: Certificado digital (A1/A3)
            nSeqEvento: Número sequencial do evento
            motivo: Motivo (obrigatório para 'nao_realizada')
            
        Returns:
            dict: {'success': bool, 'cStat': str, 'message': str, 'nProt': str}
        """
        # COMUNICAÇÃO REAL COM SEFAZ HOMOLOGAÇÃO - SEM SIMULAÇÃO
        # Em desenvolvimento: SEFAZ Homologação (ambiente=2)
        # Em produção: SEFAZ Produção (ambiente=1)
        
        # If the client is configured to simulate, return a simulated response
        if self.simulate:
            return self._simulate_manifestacao_response(tipo_manifestacao)

        try:
            return self._send_manifestacao_real(chave_acesso, tipo_manifestacao, certificado, nSeqEvento, motivo)
        except Exception as e:
            logger.error(f"Erro ao enviar manifestação real para SEFAZ: {e}")

            # Em ambientes de desenvolvimento com fallback habilitado, retornar resposta simulada
            if getattr(settings, 'DEBUG', False) and getattr(settings, 'SEFAZ_SIMULATE_ON_ERROR', False):
                logger.info('Falha na comunicação com SEFAZ - retornando resposta SIMULADA por SEFAZ_SIMULATE_ON_ERROR')
                return self._simulate_manifestacao_response(tipo_manifestacao)

            # Retornar erro real - comunicação direta com SEFAZ
            return {
                'success': False,
                'cStat': '999',
                'message': f'Erro de comunicação com SEFAZ: {str(e)}',
                'nProt': None
            }
    
    def _send_manifestacao_real(self, chave_acesso: str, tipo_manifestacao: str, certificado, nSeqEvento: int, motivo: str) -> dict:
        """Envia manifestação real via SOAP para webservice SEFAZ."""
        # Mapear tipo para código de evento
        eventos_map = {
            'ciencia': '210200',        # Ciência da Operação
            'confirmacao': '210201',    # Confirmação da Operação  
            'desconhecimento': '210202', # Desconhecimento da Operação
            'nao_realizada': '210204'   # Operação não Realizada
        }
        
        tp_evento = eventos_map.get(tipo_manifestacao)
        if not tp_evento:
            return {
                'success': False,
                'cStat': '999',
                'message': f'Tipo de manifestação inválido: {tipo_manifestacao}',
                'nProt': None
            }
        
        # Extrair CNPJ do certificado
        logger.warning(f"[MANIFESTACAO DEBUG] Certificado fornecido: {certificado is not None}, tipo: {type(certificado) if certificado else 'None'}")
        cnpj_cert = self._extract_cnpj_from_cert(certificado) if certificado else None
        if not cnpj_cert:
            logger.warning("CNPJ não encontrado no certificado, usando valor padrão")
            cnpj_cert = "00000000000000"
        else:
            logger.info(f"CNPJ extraído do certificado: {cnpj_cert}")
        
        # Construir XML do evento
        xml_evento = self._build_manifestacao_xml(chave_acesso, tp_evento, nSeqEvento, motivo, cnpj_cert)
        
        # Log do XML antes de assinar
        logger.info(f"XML evento ANTES de assinar:\n{xml_evento.decode('utf-8') if isinstance(xml_evento, bytes) else xml_evento}")
        
        # Assinar XML se certificado fornecido
        pem_pair = self._extract_pems_from_pkcs12(certificado) if certificado else None
        if pem_pair:
            key_pem, cert_pem = pem_pair
            xml_evento = self._sign_xml(xml_evento, key_pem, cert_pem)
            logger.info(f"XML evento DEPOIS de assinar:\n{xml_evento.decode('utf-8') if isinstance(xml_evento, bytes) else xml_evento}")
        
        # Preparar envelope SOAP
        soap_envelope = self._build_soap_envelope(xml_evento)
        logger.info(f"SOAP Envelope completo:\n{soap_envelope}")
        
        # Fazer requisição HTTP/SOAP
        try:
            logger.info(f"Enviando manifestação {tipo_manifestacao} para {self.endpoint}")
            
            # Configurar certificado se fornecido
            cert_param = self._prepare_client_cert_tuple(certificado) if certificado else None
            
            headers = {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
                'User-Agent': 'Sistema Agropecuario/1.0 Python-requests'
            }
            
            # Configurar verificação SSL baseada no ambiente
            ssl_verify = self._get_ssl_verify_config()
            
            # Log da requisição para debug
            logger.info(f"Enviando para SEFAZ: {self.endpoint}")
            logger.info(f"Headers: {headers}")
            logger.info(f"SSL Verify: {ssl_verify}")
            logger.info(f"Certificado: {'Sim' if cert_param else 'Não'}")
            if cert_param:
                logger.info(f"Tipo certificado: {type(cert_param)}")
            
            response = requests.post(
                self.endpoint,
                data=soap_envelope,
                headers=headers,
                timeout=self.timeout,
                cert=cert_param,
                verify=ssl_verify
            )
            
            logger.info(f"Resposta SEFAZ: HTTP {response.status_code}")
            logger.info(f"Response Headers: {dict(response.headers)}")
            
            # Log do corpo da resposta (limitado para não encher logs)
            response_body = response.text
            logger.info(f"Response Body (primeiros 500 chars): {response_body[:500]}")
            
            # Tenta extrair motivo legível da resposta (SOAP Fault, xMotivo, mensagens ou HTML)
            def _extract_sefaz_reason(text: str) -> str | None:
                try:
                    from xml.etree import ElementTree as ET
                    root = ET.fromstring(text)
                    # procurar por faultstring, fault, xMotivo, motivo, message
                    candidates = []
                    for tag in ['faultstring', 'fault', 'xMotivo', 'motivo', 'message', 'Descricao']:
                        for elem in root.iter():
                            # tag pode ter namespace
                            if elem.tag.lower().endswith(tag.lower()):
                                if elem.text and elem.text.strip():
                                    candidates.append(elem.text.strip())
                    if candidates:
                        return ' | '.join(candidates)
                except Exception:
                    # não XML ou parse falhou
                    pass

                # fallback - buscar strings conhecidas no corpo HTML/text
                lowered = text.lower()
                if 'access is denied' in lowered:
                    return 'Access is denied (403)'
                if 'forbidden' in lowered:
                    return 'Forbidden (403)'
                # última tentativa: extrair primeira linha de texto útil
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                if lines:
                    return lines[0][:500]
                return None

            reason = _extract_sefaz_reason(response_body)

            # PROCESSAR RESPOSTA REAL DO SEFAZ
            if response.status_code == 200:
                # Resposta de sucesso - parsear XML
                return self._parse_manifestacao_response(response.text)
            elif response.status_code == 403:
                # HTTP 403 = FALHA (SEFAZ rejeitou por falta de certificado ou permissões)
                logger.warning(f"SEFAZ rejeitou manifestação: HTTP 403 (certificado/permissão)")
                logger.warning(f"SEFAZ Response Body completo: {response_body}")
                msg = f'SEFAZ HTTP 403 Forbidden - Reason: {reason or response_body[:200]}'
                return {
                    'success': False,
                    'cStat': '403',
                    'message': msg,
                    'nProt': None,
                    'sefaz_response': 'real',  # Marca como resposta real do SEFAZ
                    'sent_to_sefaz': True,     # Confirma que foi enviado (mas rejeitado)
                    'http_status': 403,
                    'reason': reason,
                    'response_body': response_body,
                    'response_headers': dict(response.headers)
                }
            else:
                # Outros códigos HTTP - também respostas reais
                logger.info(f"SEFAZ retornou HTTP {response.status_code}")
                logger.info(f"SEFAZ Response Body completo: {response_body}")
                msg = f'SEFAZ HTTP {response.status_code} - Reason: {reason or response_body[:200]}'
                return {
                    'success': False,
                    'cStat': str(response.status_code),
                    'message': msg,
                    'nProt': None,
                    'sefaz_response': 'real',
                    'sent_to_sefaz': True,
                    'http_status': response.status_code,
                    'reason': reason,
                    'response_body': response_body,
                    'response_headers': dict(response.headers)
                }
            
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'cStat': '999',
                'message': 'Timeout na comunicação com SEFAZ',
                'nProt': None
            }
        except (requests.exceptions.ConnectionError, requests.exceptions.SSLError) as e:
            logger.error(f"Erro de conexão/SSL com SEFAZ: {e}")
            
            # Retornar erro real - NÃO simular resposta falsa
            return {
                'success': False, 
                'cStat': '999',
                'message': f'Erro de conexão com SEFAZ: {str(e)}',
                'nProt': None
            }
        finally:
            # Limpar arquivos temporários
            if cert_param and isinstance(cert_param, tuple):
                try:
                    import os
                    for p in cert_param:
                        if p and os.path.exists(p):
                            os.remove(p)
                except Exception:
                    pass
    
    def _get_ssl_verify_config(self):
        """
        Configura verificação SSL baseada no ambiente.
        
        Returns:
            bool ou str: True para produção, False para homologação/desenvolvimento
        """
        # Em desenvolvimento, permitir SSL flexível
        if getattr(settings, 'DEBUG', False):
            return getattr(settings, 'SEFAZ_SSL_VERIFY', False)
        
        # Em produção, usar configuração explícita ou True por padrão
        return getattr(settings, 'SEFAZ_SSL_VERIFY', True)
    
    def _simulate_manifestacao_response(self, tipo_manifestacao: str) -> dict:
        """Simula resposta da SEFAZ para ambiente de desenvolvimento."""
        from django.utils import timezone
        ambiente_str = "HOMOLOGAÇÃO" if self.ambiente == 2 else "PRODUÇÃO"
        
        return {
            'success': True,
            'cStat': '135',  # Evento registrado e vinculado a NF-e
            'message': f'Evento {tipo_manifestacao.upper()} registrado e vinculado a NF-e (SIMULADO - {ambiente_str})',
            'nProt': f'999{timezone.now().strftime("%Y%m%d%H%M%S")}',
            'simulated': True,
            'ambiente': self.ambiente
        }
    
    def _build_manifestacao_xml(self, chave_acesso: str, tp_evento: str, nSeqEvento: int, motivo: str, cnpj: str) -> bytes:
        """Constrói XML de evento de manifestação conforme schema da SEFAZ."""
        from django.utils import timezone
        
        dhEvento = timezone.now().strftime('%Y-%m-%dT%H:%M:%S-03:00')
        
        # ID do evento
        id_evento = f"ID{tp_evento}{chave_acesso}{str(nSeqEvento).zfill(2)}"
        
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<evento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe">
    <infEvento Id="{id_evento}">
        <cOrgao>91</cOrgao>
        <tpAmb>{self.ambiente}</tpAmb>
        <CNPJ>{cnpj}</CNPJ>
        <chNFe>{chave_acesso}</chNFe>
        <dhEvento>{dhEvento}</dhEvento>
        <tpEvento>{tp_evento}</tpEvento>
        <nSeqEvento>{nSeqEvento}</nSeqEvento>
        <verEvento>1.00</verEvento>
        <detEvento versao="1.00">
            <descEvento>Manifestacao do Destinatario</descEvento>"""
        
        if motivo and tp_evento == '210204':  # nao_realizada precisa de justificativa
            xml += f"<xJust>{motivo}</xJust>"
            
        xml += """
        </detEvento>
    </infEvento>
</evento>"""
        
        return xml.encode('utf-8')
    
    def _build_soap_envelope(self, xml_evento: bytes) -> str:
        """Constrói envelope SOAP para webservice recepcaoevento4 (versão 4.0)."""
        xml_content = xml_evento.decode('utf-8')
        
        return f"""<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
            {xml_content}
        </nfeDadosMsg>
    </soap12:Body>
</soap12:Envelope>"""
    
    def _parse_manifestacao_response(self, soap_response: str) -> dict:
        """Parseia resposta SOAP da SEFAZ."""
        import xml.etree.ElementTree as ET
        
        try:
            # Log da resposta para debug (primeiros 2000 chars)
            logger.debug(f"Resposta manifestação SEFAZ: {soap_response[:2000]}")
            
            root = ET.fromstring(soap_response.encode('utf-8') if isinstance(soap_response, str) else soap_response)
            
            # Namespaces da SEFAZ
            ns = {
                'soap': 'http://www.w3.org/2003/05/soap-envelope',
                'nfe': 'http://www.portalfiscal.inf.br/nfe'
            }
            
            # Tentar encontrar retEvento com namespace
            ret_evento = root.find('.//nfe:retEvento', ns)
            
            # Fallback: sem namespace
            if ret_evento is None:
                ret_evento = root.find('.//retEvento')
            
            # Fallback: retEventoInfEvento (resposta pode vir aninhada diferente)
            if ret_evento is None:
                ret_evento = root.find('.//retEnvEvento', ns)
                if ret_evento is None:
                    ret_evento = root.find('.//retEnvEvento')
            
            if ret_evento is None:
                # Log XML completo se não encontrar
                logger.error(f"retEvento não encontrado. XML completo: {soap_response}")
                return {
                    'success': False,
                    'cStat': '999',
                    'message': 'Resposta SEFAZ inválida - retEvento não encontrado',
                    'nProt': None,
                    'raw_response': soap_response[:5000]  # Salvar resposta para debug
                }
            
            # Extrair dados da resposta (tentar com e sem namespace)
            inf_evento = ret_evento.find('nfe:infEvento', ns) or ret_evento.find('infEvento')
            
            if inf_evento is not None:
                c_stat = inf_evento.findtext('nfe:cStat', namespaces=ns) or inf_evento.findtext('cStat') or '999'
                x_motivo = inf_evento.findtext('nfe:xMotivo', namespaces=ns) or inf_evento.findtext('xMotivo') or 'Erro desconhecido'
                n_prot = inf_evento.findtext('nfe:nProt', namespaces=ns) or inf_evento.findtext('nProt') or ''
            else:
                # Tentar no nível do retEvento mesmo
                c_stat = ret_evento.findtext('nfe:cStat', namespaces=ns) or ret_evento.findtext('cStat') or '999'
                x_motivo = ret_evento.findtext('nfe:xMotivo', namespaces=ns) or ret_evento.findtext('xMotivo') or 'Erro desconhecido'
                n_prot = ret_evento.findtext('nfe:nProt', namespaces=ns) or ret_evento.findtext('nProt') or ''
            
            logger.info(f"Manifestação cStat: {c_stat} - {x_motivo}")
            
            success = c_stat in ['135', '136']  # 135=vinculado, 136=registrado
            
            return {
                'success': success,
                'cStat': c_stat,
                'message': x_motivo,
                'nProt': n_prot if success else None
            }
            
        except ET.ParseError as e:
            logger.error(f"Erro ao parsear XML: {e}")
            return {
                'success': False,
                'cStat': '999', 
                'message': f'Erro ao parsear resposta XML: {str(e)}',
                'nProt': None
            }
        except Exception as e:
            logger.error(f"Erro ao processar resposta: {e}")
            return {
                'success': False,
                'cStat': '999',
                'message': f'Erro inesperado ao processar resposta: {str(e)}', 
                'nProt': None
            }

    def _extract_cnpj_from_cert(self, certificado) -> str | None:
        """Extrai CNPJ do certificado digital (Subject DN)."""
        logger.warning(f"[_extract_cnpj_from_cert] INICIO - Recebido certificado tipo: {type(certificado)}")
        try:
            pkcs12_bytes = None
            certificado_password = None
            
            logger.info(f"[DEBUG CNPJ] Certificado tipo: {type(certificado)}")
            logger.info(f"[DEBUG CNPJ] hasattr data: {hasattr(certificado, 'data')}")
            logger.info(f"[DEBUG CNPJ] hasattr password: {hasattr(certificado, 'password')}")
            logger.info(f"[DEBUG CNPJ] hasattr get_arquivo_bytes: {hasattr(certificado, 'get_arquivo_bytes')}")
            logger.info(f"[DEBUG CNPJ] hasattr get_senha: {hasattr(certificado, 'get_senha')}")
            
            # Suporte para certificado A3 (novo sistema)
            if hasattr(certificado, 'data') and hasattr(certificado, 'password'):
                pkcs12_bytes = certificado.data
                certificado_password = certificado.password
                logger.info(f"[DEBUG CNPJ] Usando atributos data/password")
            elif hasattr(certificado, 'get_arquivo_bytes'):
                logger.info(f"[DEBUG CNPJ] Tentando get_arquivo_bytes()")
                pkcs12_bytes = certificado.get_arquivo_bytes()
                logger.info(f"[DEBUG CNPJ] get_arquivo_bytes() retornou: {len(pkcs12_bytes) if pkcs12_bytes else 0} bytes")
                
                # Verificar se tem método get_senha()
                if hasattr(certificado, 'get_senha'):
                    logger.info(f"[DEBUG CNPJ] Tentando get_senha()")
                    senha = certificado.get_senha()
                    logger.info(f"[DEBUG CNPJ] get_senha() retornou: {len(senha) if senha else 0} chars")
                    if senha:
                        certificado_password = senha
                        logger.info('[DEBUG CNPJ] Using password from get_senha() method for CNPJ extraction')
            elif hasattr(certificado, 'arquivo') and hasattr(certificado.arquivo, 'read'):
                pkcs12_bytes = certificado.arquivo.read()
            elif isinstance(certificado, (bytes, bytearray)):
                pkcs12_bytes = certificado

            if not pkcs12_bytes:
                logger.warning("Nenhum dado PKCS12 encontrado no certificado")
                return None

            from cryptography.hazmat.primitives.serialization import pkcs12
            from cryptography import x509

            # Tentar carregar PKCS12 com senha
            load_attempts = [None, b'']
            
            if certificado_password:
                if isinstance(certificado_password, str):
                    load_attempts.insert(0, certificado_password.encode('utf-8'))
                else:
                    load_attempts.insert(0, certificado_password)
            
            env_pass = os.environ.get('FISCAL_TEST_PFX_PASS')
            if env_pass:
                try:
                    load_attempts.append(env_pass.encode('utf-8'))
                except Exception:
                    pass

            p12 = None
            for pw in load_attempts:
                try:
                    p12 = pkcs12.load_key_and_certificates(pkcs12_bytes, password=pw)
                    if p12 and p12[1] is not None:
                        break
                except Exception:
                    p12 = None

            if not p12 or p12[1] is None:
                logger.warning("Falha ao carregar PKCS12 para extração de CNPJ")
                return None

            cert = p12[1]
            subject = cert.subject
            
            # Log do Subject DN completo para debug
            subject_str = ", ".join([f"{attr.oid._name}={attr.value}" for attr in subject])
            logger.info(f"Subject DN do certificado: {subject_str}")
            
            # Extrair CNPJ do Subject DN
            # Certificados brasileiros geralmente armazenam CNPJ no campo OU (Organizational Unit)
            # Formato comum: "OU=CNPJ:12345678000195" ou "OU=12345678000195"
            for attr in subject:
                if attr.oid == x509.oid.NameOID.ORGANIZATIONAL_UNIT_NAME:
                    ou_value = attr.value
                    logger.info(f"OU encontrado: {ou_value}")
                    # Extrair apenas dígitos
                    import re
                    cnpj_match = re.search(r'(\d{14})', ou_value)
                    if cnpj_match:
                        cnpj = cnpj_match.group(1)
                        logger.info(f"CNPJ extraído do OU: {cnpj}")
                        return cnpj
            
            # Tentar também no CN (Common Name) como fallback
            for attr in subject:
                if attr.oid == x509.oid.NameOID.COMMON_NAME:
                    cn_value = attr.value
                    logger.info(f"CN encontrado: {cn_value}")
                    import re
                    cnpj_match = re.search(r'(\d{14})', cn_value)
                    if cnpj_match:
                        cnpj = cnpj_match.group(1)
                        logger.info(f"CNPJ extraído do CN: {cnpj}")
                        return cnpj
            
            logger.warning("CNPJ não encontrado no certificado (Subject DN)")
            return None

        except Exception as e:
            logger.exception(f'Erro ao extrair CNPJ do certificado: {e}')
            return None

    def _prepare_client_cert_tuple(self, certificado):
        """Extract PEM cert and key from PKCS12 bytes and write to temp files.

        Returns tuple(cert_path, key_path) suitable for requests `cert` param.
        Expects `certificado` to expose `.get_arquivo_bytes()` returning PKCS12 bytes.
        If extraction fails, returns None.
        """
        try:
            pkcs12_bytes = None
            password = None
            
            logger.info("=== _prepare_client_cert_tuple: INÍCIO ===")
            
            # Get certificate bytes - suporte para wrapper e modelo
            if hasattr(certificado, 'data'):
                # CertificadoA3Wrapper tem .data
                pkcs12_bytes = certificado.data
                logger.info(f"Certificado carregado via .data (wrapper): {len(pkcs12_bytes) if pkcs12_bytes else 0} bytes")
            elif hasattr(certificado, 'get_arquivo_bytes'):
                pkcs12_bytes = certificado.get_arquivo_bytes()
                logger.info(f"Certificado carregado via get_arquivo_bytes(): {len(pkcs12_bytes) if pkcs12_bytes else 0} bytes")
            elif hasattr(certificado, 'arquivo') and hasattr(certificado.arquivo, 'read'):
                pkcs12_bytes = certificado.arquivo.read()
                logger.info(f"Certificado carregado via arquivo.read(): {len(pkcs12_bytes) if pkcs12_bytes else 0} bytes")
            elif isinstance(certificado, (bytes, bytearray)):
                pkcs12_bytes = certificado
                logger.info(f"Certificado já é bytes: {len(pkcs12_bytes)} bytes")

            if not pkcs12_bytes:
                logger.error("FALHA: pkcs12_bytes é None ou vazio")
                return None

            # Get password if available - suporte para wrapper e modelo
            if hasattr(certificado, 'password'):
                # CertificadoA3Wrapper tem .password
                password_val = certificado.password
                if password_val:
                    if isinstance(password_val, str):
                        password = password_val.encode('utf-8')
                    elif isinstance(password_val, bytes):
                        password = password_val
                    logger.info(f"Senha recuperada via .password (wrapper): comprimento={len(password_val)}")
                else:
                    logger.warning(".password retornou None ou vazio")
            elif hasattr(certificado, 'get_senha'):
                senha_str = certificado.get_senha()
                if senha_str:
                    password = senha_str.encode('utf-8')
                    logger.info(f"Senha recuperada via get_senha(): comprimento={len(senha_str)}")
                else:
                    logger.warning("get_senha() retornou None ou string vazia")
            else:
                logger.warning("Certificado não tem método get_senha() nem atributo password")

            # Use cryptography to load PKCS12
            try:
                from cryptography.hazmat.primitives.serialization import pkcs12
                from cryptography.hazmat.primitives import serialization
            except Exception as e:
                logger.error(f"FALHA ao importar cryptography: {e}")
                return None

            # Try to load with password, then with empty password, then without password
            p12 = None
            load_success = False
            for idx, pwd in enumerate([password, b'', None]):
                try:
                    pwd_label = f"senha fornecida ({len(pwd)} bytes)" if pwd and idx == 0 else ("senha vazia" if pwd == b'' else "sem senha")
                    logger.info(f"Tentativa {idx+1}/3: Carregar PKCS12 com {pwd_label}")
                    
                    p12 = pkcs12.load_key_and_certificates(pkcs12_bytes, password=pwd)
                    if p12 and p12[0] is not None and p12[1] is not None:
                        logger.info(f"✓ SUCESSO na tentativa {idx+1}: PKCS12 carregado com {pwd_label}")
                        load_success = True
                        break
                    else:
                        logger.warning(f"✗ Tentativa {idx+1} retornou None ou incompleto")
                except Exception as e:
                    logger.warning(f"✗ Tentativa {idx+1} falhou: {type(e).__name__}: {str(e)[:100]}")
                    continue
            
            if not p12 or p12[0] is None or p12[1] is None:
                logger.error("FALHA FINAL: Não foi possível carregar PKCS12 com nenhuma senha")
                return None

            logger.info("PKCS12 carregado com sucesso, extraindo chave e certificado...")
            
            private_key = p12[0]
            cert = p12[1]

            # Serialize to PEM
            key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            )
            cert_pem = cert.public_bytes(serialization.Encoding.PEM)
            
            logger.info(f"Chave privada serializada: {len(key_pem)} bytes")
            logger.info(f"Certificado serializado: {len(cert_pem)} bytes")

            # Write to temp files
            import tempfile
            key_f = tempfile.NamedTemporaryFile(delete=False)
            cert_f = tempfile.NamedTemporaryFile(delete=False)
            key_f.write(key_pem)
            key_f.flush()
            cert_f.write(cert_pem)
            cert_f.flush()
            key_f.close()
            cert_f.close()
            
            logger.info(f"Arquivos temporários criados:")
            logger.info(f"  - Certificado: {cert_f.name}")
            logger.info(f"  - Chave privada: {key_f.name}")
            logger.info("=== _prepare_client_cert_tuple: SUCESSO ===")
            
            return (cert_f.name, key_f.name)
        except Exception as e:
            logger.error(f"=== _prepare_client_cert_tuple: EXCEÇÃO ===")
            logger.error(f"Erro: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None

    def consultar_nsu(self, certificado, ultimo_nsu: int = 0) -> dict:
        """Consulta NF-es disponíveis via DistDFeInt (Distribuição DFe).
        
        Baixa documentos fiscais destinados ao CNPJ do certificado.
        
        Args:
            certificado: CertificadoSefaz instance
            ultimo_nsu: NSU inicial (0 para começar do início)
            
        Returns:
            dict com:
                - success: bool
                - documentos: list de dicts com chave_acesso e xml
                - proximo_nsu: int do próximo NSU
                - max_nsu: int do NSU máximo disponível
                - message: str de erro se houver
        """
        try:
            # Extrair CNPJ do certificado
            cnpj = self._extract_cnpj_from_cert(certificado)
            if not cnpj:
                return {
                    'success': False,
                    'message': 'CNPJ não encontrado no certificado',
                    'documentos': [],
                    'proximo_nsu': ultimo_nsu,
                    'max_nsu': ultimo_nsu
                }
            
            logger.info(f"Consultando NSU para CNPJ {cnpj}, último NSU: {ultimo_nsu}")
            
            # Construir XML de consulta
            xml_consulta = self._build_distdfe_xml(cnpj, ultimo_nsu)
            
            # Assinar XML
            pem_pair = self._extract_pems_from_pkcs12(certificado)
            if not pem_pair:
                return {
                    'success': False,
                    'message': 'Falha ao extrair certificado para assinatura',
                    'documentos': [],
                    'proximo_nsu': ultimo_nsu,
                    'max_nsu': ultimo_nsu
                }
            
            key_pem, cert_pem = pem_pair
            xml_assinado = self._sign_xml(xml_consulta, key_pem, cert_pem)
            
            # Preparar envelope SOAP
            soap_envelope = self._build_distdfe_soap_envelope(xml_assinado)
            
            # Enviar requisição
            sefaz_urls = getattr(settings, 'SEFAZ_URLS', {})
            endpoint = sefaz_urls.get(self.ambiente, {}).get('distribuicao', 
                'https://nfe-homologacao.svrs.rs.gov.br/ws/NFeDistribuicaoDFe/nfedistdfe.asmx')
            
            cert_param = self._prepare_client_cert_tuple(certificado)
            
            headers = {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe',
                'User-Agent': 'Sistema Agropecuario/1.0 Python-requests'
            }
            
            ssl_verify = self._get_ssl_verify_config()
            
            logger.info(f"Enviando consulta NSU para: {endpoint}")
            
            response = requests.post(
                endpoint,
                data=soap_envelope.encode('utf-8'),
                headers=headers,
                cert=cert_param,
                verify=ssl_verify,
                timeout=self.timeout
            )
            
            # Cleanup temp files
            if cert_param and isinstance(cert_param, tuple):
                try:
                    for p in cert_param:
                        if p and os.path.exists(p):
                            os.remove(p)
                except Exception:
                    pass
            
            logger.info(f"Resposta NSU: HTTP {response.status_code}")
            
            if response.status_code != 200:
                return {
                    'success': False,
                    'message': f'SEFAZ HTTP {response.status_code}: {response.text[:500]}',
                    'documentos': [],
                    'proximo_nsu': ultimo_nsu,
                    'max_nsu': ultimo_nsu
                }
            
            # Parsear resposta
            return self._parse_distdfe_response(response.text)
            
        except Exception as e:
            logger.exception(f"Erro ao consultar NSU: {e}")
            return {
                'success': False,
                'message': f'Erro ao consultar NSU: {str(e)}',
                'documentos': [],
                'proximo_nsu': ultimo_nsu,
                'max_nsu': ultimo_nsu
            }

    def _build_distdfe_xml(self, cnpj: str, ultimo_nsu: int) -> bytes:
        """Constrói XML de consulta DistDFeInt."""
        from django.utils import timezone
        
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<distDFeInt versao="1.01" xmlns="http://www.portalfiscal.inf.br/nfe">
    <tpAmb>{self.ambiente}</tpAmb>
    <cUFAutor>91</cUFAutor>
    <CNPJ>{cnpj}</CNPJ>
    <distNSU>
        <ultNSU>{ultimo_nsu}</ultNSU>
    </distNSU>
</distDFeInt>"""
        
        return xml.encode('utf-8')

    def _build_distdfe_soap_envelope(self, xml_assinado: bytes) -> str:
        """Constrói envelope SOAP para DistDFeInt."""
        xml_content = xml_assinado.decode('utf-8')
        
        return f"""<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
            <nfeDadosMsg>{xml_content}</nfeDadosMsg>
        </nfeDistDFeInteresse>
    </soap12:Body>
</soap12:Envelope>"""

    def _parse_distdfe_response(self, response_text: str) -> dict:
        """Parseia resposta XML do DistDFeInt."""
        try:
            import base64
            from lxml import etree
            
            root = etree.fromstring(response_text.encode('utf-8'))
            
            # Namespaces
            ns = {
                'soap': 'http://www.w3.org/2003/05/soap-envelope',
                'nfe': 'http://www.portalfiscal.inf.br/nfe'
            }
            
            # Buscar retDistDFeInt
            ret_dist = root.xpath('.//nfe:retDistDFeInt', namespaces=ns)
            if not ret_dist:
                return {
                    'success': False,
                    'message': 'Resposta sem retDistDFeInt',
                    'documentos': [],
                    'proximo_nsu': 0,
                    'max_nsu': 0
                }
            
            ret = ret_dist[0]
            
            # Extrair cStat
            cstat_elem = ret.xpath('.//nfe:cStat', namespaces=ns)
            cstat = cstat_elem[0].text if cstat_elem else '999'
            
            # Extrair mensagem
            xmotivo_elem = ret.xpath('.//nfe:xMotivo', namespaces=ns)
            xmotivo = xmotivo_elem[0].text if xmotivo_elem else 'Sem mensagem'
            
            logger.info(f"DistDFe cStat: {cstat} - {xmotivo}")
            
            # Extrair NSUs
            ultimo_nsu_elem = ret.xpath('.//nfe:ultNSU', namespaces=ns)
            max_nsu_elem = ret.xpath('.//nfe:maxNSU', namespaces=ns)
            
            ultimo_nsu = int(ultimo_nsu_elem[0].text) if ultimo_nsu_elem else 0
            max_nsu = int(max_nsu_elem[0].text) if max_nsu_elem else 0
            
            # cStat 138 = Nenhum documento encontrado
            if cstat == '138':
                return {
                    'success': True,
                    'message': xmotivo,
                    'documentos': [],
                    'proximo_nsu': max_nsu,
                    'max_nsu': max_nsu
                }
            
            # cStat 137 = Documentos encontrados
            if cstat != '137':
                return {
                    'success': False,
                    'message': f'{cstat}: {xmotivo}',
                    'documentos': [],
                    'proximo_nsu': ultimo_nsu,
                    'max_nsu': max_nsu
                }
            
            # Extrair documentos
            documentos = []
            doc_zip_elems = ret.xpath('.//nfe:docZip', namespaces=ns)
            
            for doc_zip in doc_zip_elems:
                # NSU do documento
                nsu_attr = doc_zip.get('NSU')
                schema_attr = doc_zip.get('schema')
                
                # Conteúdo comprimido em base64
                doc_content_b64 = doc_zip.text
                
                if not doc_content_b64:
                    continue
                
                try:
                    # Decodificar base64
                    doc_compressed = base64.b64decode(doc_content_b64)
                    
                    # Descomprimir gzip
                    import gzip
                    doc_xml = gzip.decompress(doc_compressed).decode('utf-8')
                    
                    # Extrair chave de acesso se for resumo de NFe (resNFe) ou procNFe
                    chave_acesso = None
                    if schema_attr in ('resNFe_v1.01', 'procNFe_v4.00', 'resEvento_v1.01'):
                        doc_root = etree.fromstring(doc_xml.encode('utf-8'))
                        chave_elems = doc_root.xpath('.//*[local-name()="chNFe"]')
                        if chave_elems:
                            chave_acesso = chave_elems[0].text
                    
                    documentos.append({
                        'nsu': nsu_attr,
                        'schema': schema_attr,
                        'xml': doc_xml,
                        'chave_acesso': chave_acesso
                    })
                    
                    logger.info(f"Documento NSU {nsu_attr}: {schema_attr} - Chave: {chave_acesso}")
                    
                except Exception as e:
                    logger.error(f"Erro ao processar docZip NSU {nsu_attr}: {e}")
                    continue
            
            return {
                'success': True,
                'message': xmotivo,
                'documentos': documentos,
                'proximo_nsu': max_nsu,
                'max_nsu': max_nsu
            }
            
        except Exception as e:
            logger.exception(f"Erro ao parsear resposta DistDFe: {e}")
            return {
                'success': False,
                'message': f'Erro ao parsear resposta: {str(e)}',
                'documentos': [],
                'proximo_nsu': 0,
                'max_nsu': 0
            }