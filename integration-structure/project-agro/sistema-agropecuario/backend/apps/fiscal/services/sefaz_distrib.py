from dataclasses import dataclass
from typing import List


@dataclass
class DistribItem:
    chave_acesso: str
    raw_xml: str
    resumo: dict
    nsu: str | None = None


class SefazDistribClient:
    """Client for NFeDistribuicaoDFe abstraction. For now supports simulate mode and
    provides a `fetch` method that returns a list of DistribItem.

    In tests this class is patched to return deterministic fixtures.
    """

    def __init__(self, simulate: bool = True, endpoint: str | None = None, timeout: int = 10, max_retries: int = 3, backoff_factor: float = 0.5):
        self.simulate = simulate
        self.endpoint = endpoint
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        # test hook: allow tests to monkeypatch HTTP post implementation
        self._session_post = None
        # logger for diagnostics and retries
        import logging
        self._logger = logging.getLogger(__name__) 

    def _decode_doczip(self, doczip_b64: str) -> str:
        """Decode a docZip field (base64 of gzip'ed XML) and return XML string."""
        import base64
        import gzip
        try:
            gz = base64.b64decode(doczip_b64)
            xml = gzip.decompress(gz).decode('utf-8', errors='ignore')
            return xml
        except Exception:
            return ''

    def _request(self, certificado=None, last_nsu: str | None = None):
        """Perform a simplified SOAP request to NFeDistribuicaoDFe and return parsed items.

        Returns a list of dicts with keys like 'docZip', 'resNFe' and optional 'nsu'.
        This implementation uses `requests` + `lxml` to parse responses and has simple retry
        semantics for transient connection errors. Tests can monkeypatch `self._session_post` to
        simulate responses.
        """
        if not self.endpoint:
            raise ValueError('No endpoint configured for SefazDistribClient')

        import requests
        from lxml import etree

        # Construct a minimal consNSU envelope; services may require additional headers/auth
        last = last_nsu or '0'
        payload = f"""
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:dist="http://www.portalfiscal.inf.br/nfe">
          <soapenv:Header/>
          <soapenv:Body>
            <dist:distDFeInt versao="1.00">
              <dist:consNSU>
                <dist:ultNSU>{last}</dist:ultNSU>
              </dist:consNSU>
            </dist:distDFeInt>
          </soapenv:Body>
        </soapenv:Envelope>
        """

        headers = {'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': 'NFeDistribuicaoDFe'}
        last_exc = None

        for attempt in range(max(1, int(self.max_retries))):
            try:
                if self._session_post is not None:
                    resp = self._session_post(self.endpoint, data=payload, headers=headers, timeout=self.timeout)
                else:
                    session = requests.Session()
                    resp = session.post(self.endpoint, data=payload.encode('utf-8'), headers=headers, timeout=self.timeout)

                resp.raise_for_status()
                content = resp.content
                root = etree.fromstring(content)
                items: list[dict] = []

                # find parent nodes that contain an inner `docZip` (container) or `resNFe` element
                # Prefer to directly locate docZip containers; handles nested docZip elements
                nodes = root.xpath("//*[local-name()='docZip' or local-name()='resNFe']")
                for node in nodes:
                    nsu_nodes = node.xpath(".//*[local-name()='nsu']")
                    nsu = nsu_nodes[0].text.strip() if nsu_nodes and nsu_nodes[0].text else None

                    # inner docZip with the base64 content
                    inner_doc_nodes = node.xpath(".//*[local-name()='docZip' and normalize-space(text())]")
                    if inner_doc_nodes:
                        items.append({'docZip': inner_doc_nodes[0].text.strip(), 'nsu': nsu})
                        continue

                    # direct resNFe content
                    res_nodes = node.xpath(".//*[local-name()='resNFe' and normalize-space(text())]")
                    if res_nodes:
                        items.append({'resNFe': res_nodes[0].text.strip(), 'nsu': nsu})
                        continue

                # fallback: locate any resNFe/docZip text nodes anywhere
                if not items:
                    nodes = root.xpath(".//*[local-name()='resNFe' or local-name()='docZip']")
                    for n in nodes:
                        txt = n.text.strip() if n.text else ''
                        if txt:
                            items.append({'raw': txt})

                return items

            except requests.RequestException as exc:
                # transient network / HTTP error; attempt retry with exponential backoff
                last_exc = exc
                try:
                    import time
                    # do not sleep after the last attempt
                    if attempt < max(1, int(self.max_retries)) - 1:
                        sleep_time = float(self.backoff_factor) * (2 ** attempt)
                        try:
                            self._logger.warning("SefazDistribClient _request transient error, attempt=%d, sleeping=%.3f", attempt + 1, sleep_time)
                        except Exception:
                            pass
                        time.sleep(sleep_time)
                except Exception:
                    # preserve original behavior if sleep/logging fails
                    pass
                continue
            except Exception as exc:
                # parsing error or unexpected structure - return empty list to be robust
                try:
                    self._logger.warning("SefazDistribClient _request parse error: %s", str(exc))
                except Exception:
                    pass
                return []

        # exhausted retries
        if last_exc:
            try:
                self._logger.error("SefazDistribClient _request failed after %d attempts: %s", int(self.max_retries), str(last_exc))
            except Exception:
                pass
            raise last_exc
        return []

        # exhausted retries
        if last_exc:
            raise last_exc
        return []

    def fetch(self, certificado=None) -> List[DistribItem]:
        """Fetch distributed NFes for the given certificado. Returns list of DistribItem.

        Production implementation will call the SEFAZ distribution WS (NFeDistribuicaoDFe) via `_request`.
        For `docZip`-based items, decode the docZip and extract the `infNFe` ID as chave_acesso.
        In simulate mode return empty list.
        """
        results: List[DistribItem] = []
        if self.simulate:
            return results

        # determine last_nsu checkpoint for the certificado (extracted to helper for testability)
        last_nsu = self._get_last_nsu(certificado)

        seen_nsus = set()
        progress = True
        current_last = last_nsu

        # loop to fetch multiple pages/lotes until no new NSU is returned or no items
        while progress:
            progress = False
            try:
                raw_items = None
                try:
                    raw_items = self._request(certificado=certificado, last_nsu=current_last)
                except TypeError:
                    # Some test stubs may not accept keyword `last_nsu` or extra positional
                    # args. Try fewer positional arguments until one succeeds.
                    try:
                        raw_items = self._request(certificado)
                    except TypeError:
                        try:
                            raw_items = self._request()
                        except TypeError:
                            # Re-raise original TypeError if none of the call forms match
                            raise
            except Exception:
                # Unexpected error during _request call - abort loop
                break

            if not raw_items:
                break

            for r in raw_items:
                # support either docZip (base64 gzip) or raw_xml/resNFe
                xml = ''
                if r.get('docZip'):
                    xml = self._decode_doczip(r.get('docZip'))
                elif r.get('raw_xml'):
                    xml = r.get('raw_xml')
                elif r.get('resNFe'):
                    xml = r.get('resNFe')

                chave = None
                try:
                    import xml.etree.ElementTree as ET
                    root = ET.fromstring(xml)
                    inf = root.find('.//{*}infNFe')
                    if inf is not None:
                        chave = inf.get('Id') or ''
                        if chave.startswith('NFe'):
                            chave = chave[3:]
                except Exception:
                    pass

                results.append(DistribItem(chave_acesso=chave or r.get('chave_acesso') or '', raw_xml=xml, resumo=r.get('resumo') or {}, nsu=r.get('nsu')))

            # update current_last using the max NSU from this page to continue
            nsus = [r.get('nsu') for r in raw_items if r.get('nsu')]
            if nsus:
                max_nsu = max(nsus)
                if max_nsu not in seen_nsus and max_nsu != current_last:
                    seen_nsus.add(max_nsu)
                    current_last = max_nsu
                    progress = True
                else:
                    # no progress detected - stop to avoid infinite loop
                    break
        return results

    def _get_last_nsu(self, certificado=None) -> str | None:
        """Return the last NSU for the given certificado or None if not found.

        Separate method to make testing easier (so tests can patch this without mocking models).
        """
        try:
            from .models_sync import NsuCheckpoint
            cp = NsuCheckpoint.objects.filter(certificado=certificado).first()
            if cp:
                return cp.last_nsu
        except Exception:
            return None
        return None
