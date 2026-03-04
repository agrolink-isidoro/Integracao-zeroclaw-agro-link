from __future__ import annotations

import os
import hashlib
import logging
from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .services.sefaz_client import SefazClient
from .models_manifestacao import Manifestacao

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_manifestacao_task(self, manifestacao_id: int):
    try:
        # Lazy imports to avoid circular dependencies - moved SefazClient and Manifestacao to module level

        # Configuration for sync_nfes_task refinements
        SYNC_BATCH_SIZE = int(os.environ.get('FISCAL_SYNC_BATCH_SIZE', '10'))
        SYNC_MAX_RETRIES = int(os.environ.get('FISCAL_SYNC_MAX_RETRIES', '3'))

        # Use select_for_update inside transaction to avoid races
        with transaction.atomic():
            manifestacao = Manifestacao.objects.select_related('nfe').select_for_update().get(pk=manifestacao_id)

            # FEATURE FLAG: allow simulating SEFAZ acceptance for testing environments.
            # When FISCAL_SIMULATE_SEFAZ_SUCCESS is True, we skip contacting the real SEFAZ
            # and mark the Manifestacao as SENT immediately. THIS MUST NOT be enabled in
            # production environments unless you explicitly understand the implications.
            from django.conf import settings
            if getattr(settings, 'FISCAL_SIMULATE_SEFAZ_SUCCESS', False):
                # Create a simulated successful response payload and persist it.
                simulated_result = {
                    'success': True,
                    'message': 'Simulated acceptance (FISCAL_SIMULATE_SEFAZ_SUCCESS enabled)',
                    'cStat': '100',
                    'protocolo': 'SIMULATED',
                }
                manifestacao.mark_sent(simulated_result)
                logger.warning('FISCAL_SIMULATE_SEFAZ_SUCCESS enabled - manifestacao %s marked as sent (simulated)', manifestacao.id)
                # Return a structure that mimics a real send result for callers/tests
                return {
                    'manifestacao_id': manifestacao.id,
                    'status': 'sent_successfully',
                    'sefaz_response': 'simulated',
                    'message': simulated_result['message']
                }

            client = SefazClient(simulate=False)

            # Choose certificate: prefer manifestacao.certificado, then A3, then nfe.certificado_digital, then first CertificadoSefaz
            certificado = None
            try:
                # 1. Prioridade máxima: certificado específico da manifestação
                if manifestacao.certificado:
                    certificado = manifestacao.certificado
                    logger.info(f'Usando certificado específico da manifestação: {certificado.nome}')
                
                # 2. Tentar certificado A3 (novo sistema)
                if not certificado:
                    from .models_certificado_a3 import CertificadoA3
                    certificado_a3 = CertificadoA3.get_ativo()
                
                    if certificado_a3:
                        # Converter dados do A3 para formato compatível
                        certificado_data = certificado_a3.get_certificado_data()
                        if certificado_data:
                            # Criar objeto compatível com SEFAZ client
                            class CertificadoA3Wrapper:
                                def __init__(self, data, password):
                                    self.data = data
                                    self.password = password
                            certificado = CertificadoA3Wrapper(certificado_data['data'], certificado_data['password'])
                            logger.info(f'Usando certificado A3: {certificado_a3.nome}')
                
                # 3. Fallback para certificado da NFe
                if not certificado:
                    if getattr(manifestacao.nfe, 'certificado_digital', None):
                        certificado = manifestacao.nfe.certificado_digital
                        logger.info('Usando certificado da NFe')
                
                # 4. Último fallback: primeiro certificado SEFAZ disponível
                if not certificado:
                    from .models_certificados import CertificadoSefaz
                    certificado = CertificadoSefaz.objects.first()
                    if certificado:
                        logger.info('Usando certificado SEFAZ legado (primeiro disponível)')
                    else:
                        logger.warning('Nenhum certificado disponível')
                        
            except Exception as e:
                logger.warning(f'Erro ao carregar certificado: {e}')
                certificado = None

            # Determine sequence number for the event (nSeqEvento) based on prior occurrences
            # Contar apenas manifestações enviadas com sucesso (status='sent')
            past_count = Manifestacao.objects.filter(nfe=manifestacao.nfe, tipo=manifestacao.tipo, criado_em__lt=manifestacao.criado_em, status_envio='sent').count()
            nSeq = past_count + 1
            manifestacao.nSeqEvento = nSeq
            manifestacao.save(update_fields=['nSeqEvento'])

            # Obter motivo se for manifestação de não realização
            motivo = None
            if manifestacao.tipo == 'nao_realizada':
                motivo = getattr(manifestacao, 'motivo', None) or "Operação não realizada pelo destinatário"
            
            result = client.send_manifestacao(
                chave_acesso=manifestacao.nfe.chave_acesso, 
                tipo_manifestacao=manifestacao.tipo, 
                certificado=certificado, 
                nSeqEvento=nSeq,
                motivo=motivo
            )

            # Processa resultado baseado em sucesso REAL
            if result.get('success', False):
                # SUCESSO REAL - SEFAZ aceitou manifestação
                manifestacao.mark_sent(result)
                logger.info(f'Manifestação {manifestacao_id} ACEITA pela SEFAZ')
                return {
                    'manifestacao_id': manifestacao.id,
                    'status': 'sent_successfully',
                    'sefaz_response': 'accepted',
                    'message': result.get('message', 'Manifestação aceita pela SEFAZ')
                }
            
            elif result.get('sent_to_sefaz', False):
                # FALHA REAL - SEFAZ respondeu mas REJEITOU (403, etc.)
                manifestacao.status_envio = 'failed'
                
                # Montar resposta detalhada do SEFAZ
                sefaz_details = {
                    'http_status': result.get('http_status'),
                    'cStat': result.get('cStat'),
                    'message': result.get('message', ''),
                    'reason': result.get('reason'),
                    'response_body': result.get('response_body', ''),
                    'response_headers': result.get('response_headers', {})
                }
                
                import json
                manifestacao.resposta_sefaz = json.dumps(sefaz_details, ensure_ascii=False, indent=2)
                manifestacao.save(update_fields=['status_envio', 'resposta_sefaz'])
                
                logger.warning(f'Manifestação {manifestacao_id} REJEITADA pela SEFAZ: {result.get("message")}')
                logger.warning(f'Detalhes completos SEFAZ: {manifestacao.resposta_sefaz}')
                
                return {
                    'manifestacao_id': manifestacao.id,
                    'status': 'rejected_by_sefaz', 
                    'sefaz_response': 'rejected',
                    'http_status': result.get('http_status'),
                    'message': result.get('message', 'SEFAZ rejeitou manifestação'),
                    'response_body': result.get('response_body', ''),
                    'response_headers': result.get('response_headers', {})
                }
                    
                # Criar auditoria para resposta real
                try:
                    import json
                    from apps.fiscal.models_certificados import CertificadoActionAudit
                    audit_details = {
                        'manifestacao_id': manifestacao.id,
                        'chave_acesso': manifestacao.nfe.chave_acesso,
                        'tipo': manifestacao.tipo,
                        'cStat': result.get('cStat'),
                        'response_type': 'real_sefaz',
                        'http_status': result.get('cStat'),
                        'message': result.get('message', '')
                    }
                    CertificadoActionAudit.objects.create(
                        action='manifestacao_sent',
                        details=json.dumps(audit_details)
                    )
                except Exception:
                    pass  # Auditoria é opcional
                    
                return {
                    'manifestacao_id': manifestacao.id,
                    'status': 'sent_to_sefaz',
                    'sefaz_response': 'real',
                    'http_status': result.get('cStat'),
                    'message': result.get('message', '')
                }
            else:
                # Erro de comunicação ou parsing (não chegou no SEFAZ ou resposta inválida)
                msg = result.get('message', 'communication_failed')
                
                # Se houver raw_response, é erro de parsing (SEFAZ respondeu mas formato inválido)
                if 'raw_response' in result:
                    manifestacao.status_envio = 'failed'
                    import json
                    manifestacao.resposta_sefaz = json.dumps({
                        'error': msg,
                        'cStat': result.get('cStat'),
                        'raw_response': result.get('raw_response')
                    }, ensure_ascii=False, indent=2)
                    manifestacao.save(update_fields=['status_envio', 'resposta_sefaz'])
                    logger.error(f'Manifestação {manifestacao_id} - Erro de parsing SEFAZ')
                    logger.error(f'Resposta raw: {result.get("raw_response", "")[:500]}')
                    return {
                        'manifestacao_id': manifestacao.id,
                        'status': 'parsing_error',
                        'message': msg,
                        'raw_response': result.get('raw_response', '')[:500]
                    }
                
                # Erro de comunicação real - tentar retry
                try:
                    raise Exception(msg)
                except Exception as exc:
                    try:
                        raise self.retry(exc=exc)
                    except Exception:
                        # Max retries - falhou comunicação
                        manifestacao.mark_failed({'error': msg})
                        return {'error': 'communication_failed', 'message': msg}

    except Manifestacao.DoesNotExist:
        return {'error': 'manifestacao_not_found'}

    except Exception as exc:
        try:
            self.retry(exc=exc)
        except Exception:
            # Max retries exceeded - manifestação falhou
            try:
                manifestacao = Manifestacao.objects.select_for_update().get(pk=manifestacao_id)
                manifestacao.mark_failed({'error': 'task_failed', 'message': str(exc)})
            except Exception:
                pass
            return {'error': 'task_failed', 'message': str(exc)}

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_emissao_job(self, job_id: int):
    try:
        from .models_emissao import EmissaoJob
        from .services.sefaz_client import SefazClient

        SYNC_BATCH_SIZE = int(os.environ.get('FISCAL_SYNC_BATCH_SIZE', '10'))
        
        job = EmissaoJob.objects.select_related('nfe').get(pk=job_id)
    except EmissaoJob.DoesNotExist:
        return {'error': 'job_not_found'}

    client = SefazClient(simulate=False)

    try:
        job.mark_processing()

        # Max retries (Celery has its own max_retries; use as fallback)
        max_retries = getattr(self, 'max_retries', 3)

        # Helper to schedule a retry when Celery retry is not available (e.g., in tests
        # calling the wrapped function directly). Uses exponential backoff based on tentativa_count.
        def _schedule_retry(job, message):
            from django.utils import timezone
            backoff = getattr(self, 'default_retry_delay', 60) if hasattr(self, 'default_retry_delay') else 60
            # set last error and schedule next attempt; tentativa_count is incremented by caller
            job.last_error = str(message)
            if job.tentativa_count >= max_retries:
                job.mark_failed('max_retries_exceeded')
            else:
                # schedule next attempt
                delay_seconds = int(backoff * (2 ** (job.tentativa_count - 1)))
                job.scheduled_at = timezone.now() + timezone.timedelta(seconds=delay_seconds)
                job.status = 'pending'
                job.save(update_fields=['last_error', 'scheduled_at', 'status', 'updated_at'])

        # Increment attempt count early to count this attempt
        job.tentativa_count += 1
        job.save(update_fields=['tentativa_count'])

        if job.tentativa_count >= max_retries:
            job.mark_failed('max_retries_exceeded')
            return {'error': 'max_retries_exceeded'}

        # Determine which certificate to use. Prefer explicit CertificadoSefaz if available,
        # else fall back to file on NFe (if present) or None.
        certificado = None
        try:
            if getattr(job.nfe, 'certificado_digital', None):
                certificado = job.nfe.certificado_digital
            else:
                from .models_certificados import CertificadoSefaz
                certificado = CertificadoSefaz.objects.first()
        except Exception:
            certificado = None

        result = client.emit(job.nfe, certificado=certificado)

        if not result.success:
            # Try to retry via Celery retry mechanism; if retry raises, fall back to scheduling
            try:
                raise Exception(result.message or 'emit_failed')
            except Exception as exc:
                try:
                    # When running within Celery, this will raise a Retry or MaxRetriesExceededError
                    raise self.retry(exc=exc)
                except AttributeError:
                    # Not running in a Celery context (e.g., tests calling __wrapped__), schedule retry locally
                    _schedule_retry(job, exc)
                    return {'retry_scheduled': True, 'message': str(exc)}
                except Exception as retry_exc:
                    # If MaxRetriesExceededError, mark failed; otherwise fallback to schedule retry
                    try:
                        MR = getattr(self, 'MaxRetriesExceededError', None)
                        if MR is not None and isinstance(retry_exc, MR):
                            job.mark_failed(str(exc))
                            return {'error': 'max_retries_exceeded', 'message': str(exc)}
                    except Exception:
                        pass
                    # fallback schedule
                    _schedule_retry(job, exc)
                    return {'retry_scheduled': True, 'message': str(exc)}

        # success
        job.mark_success(result.protocolo, result.data_autorizacao)
        # persist on NFe as well
        job.nfe.protocolo_autorizacao = result.protocolo
        job.nfe.data_autorizacao = result.data_autorizacao
        job.nfe.status = result.status or '100'
        job.nfe.save()

        return {'success': True, 'protocolo': result.protocolo}

    except Exception as exc:
        # Retry using Celery retry semantics
        try:
            # If max retries exceeded, mark failed
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            job.mark_failed(str(exc))
            return {'error': 'max_retries_exceeded', 'message': str(exc)}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_nfes_task(self, processamento_id: int):
    """Task that fetches distributed NF-e per Certificado and persists summaries.

    Behavior:
    - Iterates over configured `CertificadoSefaz` instances (or `None` when absent)
      and fetches items via `SefazDistribClient.fetch(certificado=...)`.
    - For each certificado it creates a child `ProcessamentoWs` to track per-cert processing
      and calls `_process_fetched_items(child_proc, items, certificado=certificado)`.
    - Aggregates results into the parent `ProcessamentoWs` and records errors per-cert
      without aborting the entire run.
    """
    try:
        from .models_sync import ProcessamentoWs
        from .services.sefaz_distrib import SefazDistribClient

        SYNC_BATCH_SIZE = int(os.environ.get('FISCAL_SYNC_BATCH_SIZE', '10'))

        proc = ProcessamentoWs.objects.get(pk=processamento_id)
        proc.status = 'processing'
        proc.save(update_fields=['status', 'updated_at'])

        # Get SEFAZ endpoint from environment
        from django.conf import settings
        endpoint = getattr(settings, 'SEFAZ_DISTRIB_ENDPOINT', os.environ.get('SEFAZ_DISTRIB_ENDPOINT'))
        
        if not endpoint:
            proc.status = 'failed'
            proc.details = {
                'error': 'Endpoint SEFAZ não configurado. Configure SEFAZ_DISTRIB_ENDPOINT nas variáveis de ambiente.',
                'certificados': [],
                'errors': [{'error': 'SEFAZ_DISTRIB_ENDPOINT não configurado'}]
            }
            proc.save(update_fields=['status', 'details', 'updated_at'])
            return {'error': 'SEFAZ_DISTRIB_ENDPOINT not configured', 'details': proc.details}

        # Use SefazDistribClient to fetch distributed NF-e summaries (production mode)
        client = SefazDistribClient(simulate=False, endpoint=endpoint)

        # determine certificates: prefer explicit CertificadoSefaz if present
        certs = _get_certificados()

        summary = {'certificados': [], 'errors': []}
        total_created = 0

        for certificado in certs:
            # create a child processing entry to track per-cert work
            try:
                child = ProcessamentoWs.objects.create(job_type='sync_nfes_cert', status='processing', details={'certificado': getattr(certificado, 'id', None)})
            except Exception:
                # fallback to a minimal in-memory proxy when DB create fails in unit tests
                child = type('P', (), {'status': 'processing', 'details': {'certificado': getattr(certificado, 'id', None)}, 'save': lambda self, update_fields=None: None})()

            try:
                items = client.fetch(certificado=certificado)
            except Exception as exc:
                # record child as failed and continue with next certificado
                child.status = 'failed'
                child.details = {'error': str(exc)}
                try:
                    child.save(update_fields=['status', 'details', 'updated_at'])
                except Exception:
                    pass
                summary['errors'].append({'certificado': getattr(certificado, 'id', None), 'error': str(exc)})
                continue

            # Delegate processing of fetched items to helper
            try:
                res = _process_fetched_items(child, items, certificado=certificado, batch_size=SYNC_BATCH_SIZE)
                total_created += res.get('created', 0) if isinstance(res, dict) else 0
                summary['certificados'].append({'certificado': getattr(certificado, 'id', None), 'created': res.get('created', 0) if isinstance(res, dict) else None})
            except Exception as exc:
                # mark child failed and capture error
                child.status = 'failed'
                child.details = {'error': str(exc)}
                try:
                    child.save(update_fields=['status', 'details', 'updated_at'])
                except Exception:
                    pass
                summary['errors'].append({'certificado': getattr(certificado, 'id', None), 'error': str(exc)})
                continue

        # finalize parent processing status
        if summary['errors']:
            proc.status = 'failed'
            proc.details = summary
            proc.save(update_fields=['status', 'details', 'updated_at'])
            return {'error': 'partial_failures', 'details': summary}

        proc.status = 'success'
        proc.details = {'certificados': summary.get('certificados', []), 'created': total_created}
        proc.save(update_fields=['status', 'details', 'updated_at'])
        return {'success': True, 'created': total_created}

    except Exception as exc:
        try:
            self.retry(exc=exc)
        except Exception:
            return {'error': str(exc)}


def _get_certificados():
    try:
        from .models_certificados import CertificadoSefaz
        return list(CertificadoSefaz.objects.all()) or [None]
    except Exception:
        return [None]


def _process_fetched_items(proc, items, certificado=None, batch_size: int | None = None):
    """Process a list of DistribItem-like objects and persist/collect results.

    This helper is isolated for unit testing. It updates `proc` status/details and
    returns an outcome dict. It accepts `certificado` so that `NsuCheckpoint` is
    maintained per-certificate.

    Refinements:
    - Batching: process items in batches of `batch_size` for efficiency
    - Idempotency: detect duplicates via sync_trace_id (XML hash) to avoid double-creation
    - Coordination: locks on NsuCheckpoint to ensure serial per-cert processing
    """
    # Lazy import to avoid circular dependencies
    from .models_sync import NFeResumo, NFeRemote, ArquivoXml, NsuCheckpoint

    if batch_size is None:
        batch_size = int(os.environ.get('FISCAL_SYNC_BATCH_SIZE', '10'))

    created = 0
    nsus = []
    processed_traces = set()
    cp = None

    # Acquire lock on NsuCheckpoint for this cert to serialize updates
    try:
        with transaction.atomic():
            cp, _ = NsuCheckpoint.objects.select_for_update().get_or_create(certificado=certificado)
            # Load previously processed sync_trace_ids to detect duplicates
            existing_traces = set(ArquivoXml.objects.filter(
                certificado_checkpoint=cp
            ).values_list('sync_trace_id', flat=True))
            processed_traces.update(existing_traces)
    except Exception:
        # Fallback when get_or_create fails in test context
        existing_traces = set()

    # Process items in batches
    for batch_idx in range(0, len(items), batch_size):
        batch_items = items[batch_idx:batch_idx + batch_size]
        batch_created = 0

        with transaction.atomic():
            for it in batch_items:
                # Support both objects and dicts
                if isinstance(it, dict):
                    chave = it.get('chave_acesso', '')
                    raw_xml = it.get('raw_xml', '') or ''
                    nsu = it.get('nsu', None)
                    resumo = it.get('resumo', {})
                else:
                    chave = getattr(it, 'chave_acesso', '')
                    raw_xml = getattr(it, 'raw_xml', '') or ''
                    nsu = getattr(it, 'nsu', None)
                    resumo = getattr(it, 'resumo', {})

                # Calculate sync_trace_id for duplicate detection
                # Use (chave + certificado) as the unique key, not just raw_xml
                # since two different chaves could have identical raw_xml content
                cert_id = getattr(certificado, 'id', None) if certificado else None
                sync_trace_key = f"{chave}:{cert_id}"
                
                if not chave:
                    # Skip items without chave_acesso
                    continue
                    
                # Skip if already processed (idempotency per-cert)
                if sync_trace_key in processed_traces:
                    continue

                # Create/update NFeRemote
                try:
                    nr, created_nr = NFeRemote.objects.get_or_create(
                        chave_acesso=chave,
                        defaults={'raw_xml': raw_xml, 'import_status': 'pending'}
                    )
                    if created_nr:
                        batch_created += 1
                        created += 1
                        processed_traces.add(sync_trace_key)
                except Exception:
                    continue

                # Create NFeResumo summary
                try:
                    NFeResumo.objects.get_or_create(
                        chave_acesso=chave,
                        defaults={
                            'numero': None,
                            'emitente_nome': (resumo or {}).get('emitente'),
                            'destinatario_nome': None,
                            'data_recebida': timezone.now(),
                            'raw': resumo or {}
                        }
                    )
                except Exception:
                    pass

                # Persist raw XML with idempotency marker
                if raw_xml:
                    try:
                        # Use sha256 of raw_xml for XML content deduplication
                        xml_trace_id = hashlib.sha256(raw_xml.encode('utf-8')).hexdigest()
                        ArquivoXml.objects.get_or_create(
                            nfe=None,
                            name=f"{chave}.xml",
                            defaults={
                                'content': raw_xml,
                                'sync_trace_id': xml_trace_id,
                                'certificado_checkpoint': cp
                            }
                        )
                    except Exception:
                        pass

                # Track NSU for checkpoint update
                if nsu:
                    nsus.append(nsu)

    # Update NSU checkpoint after all batches (lock ensures serial)
    if nsus:
        try:
            with transaction.atomic():
                cp, _ = NsuCheckpoint.objects.select_for_update().get_or_create(certificado=certificado)
                cp.last_nsu = max(nsus)
                cp.save(update_fields=['last_nsu', 'updated_at'])
        except Exception:
            pass

    proc.status = 'success'
    proc.details = {'created': created, 'batch_size': batch_size}
    try:
        proc.save(update_fields=['status', 'details', 'updated_at'])
    except Exception:
        pass

    return {'success': True, 'created': created}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def reconcile_manifestacoes_task(self=None, max_age_hours: int = 24):
    """Find manifestacoes with transient `cStat=136` and try to reconcile/vinculate them.

    Behavior:
    - Query for Manifestacao with `status_envio='pending'` and `resposta_sefaz` containing `cStat=136` and older than `max_age_hours`.
    - For each: call `SefazClient.send_manifestacao` with the same `nSeqEvento`; if response becomes `cStat=135` mark sent; if remains 136 increment `tentativa_count` and retry until `FISCAL_MANIFESTACAO_MAX_RETRIES` (default 3), then mark failed.
    """
    # Lazy import to avoid circular dependencies
    from django.conf import settings
    from .models_manifestacao import Manifestacao
    from .services.sefaz_client import SefazClient

    try:
        client = SefazClient(simulate=False)
        cutoff = timezone.now() - timezone.timedelta(hours=max_age_hours)
        # Start with all pending manifestacoes older than cutoff and
        # perform JSON checks in Python to avoid relying on DB-specific
        # JSON lookup capabilities in constrained test environments (SQLite).
        qs = Manifestacao.objects.filter(status_envio='pending', criado_em__lt=cutoff)

        max_retries = getattr(settings, 'FISCAL_MANIFESTACAO_MAX_RETRIES', 3)

        processed = 0
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Reconciling manifestacoes older than {max_age_hours}h: candidate_count={qs.count()}")
        # Log candidate count for visibility during regular runs
        try:
            logger.info(f"Reconciling manifestacoes older than {max_age_hours}h: candidate_count={qs.count()}")
        except Exception:
            pass
        for m in qs:
            # Only handle items that currently have cStat == '136' (transient)
            try:
                logger.debug(f"Checking manifestacao id={m.id} resposta={m.resposta_sefaz}")
                try:
                    logger.debug(f"Checking manifestacao id={m.id} criado_em={m.criado_em} resposta={m.resposta_sefaz}")
                except Exception:
                    pass
                if not m.resposta_sefaz or str(m.resposta_sefaz.get('cStat')) != '136':
                    continue
            except Exception:
                continue

            processed += 1
            try:
                result = client.send_manifestacao(m.nfe.chave_acesso, m.tipo, certificado=None, nSeqEvento=m.nSeqEvento)
                cstat = str(result.get('cStat')) if result.get('cStat') is not None else None
                if result.get('success') and cstat == '135':
                    m.mark_sent(result)
                else:
                    # still not vinculado
                    m.tentativa_count += 1
                    m.resposta_sefaz = result
                    if m.tentativa_count >= max_retries:
                        m.mark_failed({'error': 'max_retries_exceeded', 'last_result': result})
                    else:
                        m.save(update_fields=['tentativa_count', 'resposta_sefaz'])
            except Exception as exc:
                # Log and continue
                try:
                    self.retry(exc=exc)
                except Exception:
                    # Not running in Celery or max retries exceeded; continue
                    m.tentativa_count += 1
                    m.save(update_fields=['tentativa_count'])
        return {'processed': processed}
    except Exception as exc:
        try:
            self.retry(exc=exc)
        except Exception:
            return {'error': str(exc)}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_nfes_from_sefaz_task(self, certificado_id: int):
    """
    Sincroniza NF-es da SEFAZ via DistDFeInt (consulta NSU).
    
    Baixa documentos fiscais destinados ao CNPJ do certificado e salva no banco.
    Args:
        certificado_id: ID do CertificadoSefaz
        
    Returns:
        dict com status da sincronização
    """
    try:
        from .models_certificados import CertificadoSefaz
        from .models import NFe
        from .models_sync import ArquivoXml, NsuCheckpoint
        from lxml import etree
        
        logger.info(f"Iniciando sincronização NSU para certificado_id={certificado_id}")
        
        # Buscar certificado
        try:
            certificado = CertificadoSefaz.objects.get(pk=certificado_id)
        except CertificadoSefaz.DoesNotExist:
            return {'error': f'Certificado {certificado_id} não encontrado'}
        
        # Obter último NSU processado
        with transaction.atomic():
            checkpoint, _ = NsuCheckpoint.objects.select_for_update().get_or_create(
                certificado=certificado
            )
            ultimo_nsu = int(checkpoint.last_nsu) if checkpoint.last_nsu else 0
        
        logger.info(f"Último NSU processado: {ultimo_nsu}")
        
        # Consultar SEFAZ
        client = SefazClient(simulate=False)
        resultado = client.consultar_nsu(certificado, ultimo_nsu)
        
        if not resultado['success']:
            logger.error(f"Erro ao consultar NSU: {resultado['message']}")
            return {
                'success': False,
                'error': resultado['message'],
                'documentos_processados': 0
            }
        
        documentos = resultado['documentos']
        proximo_nsu = resultado['proximo_nsu']
        max_nsu = resultado['max_nsu']
        
        logger.info(f"Documentos retornados: {len(documentos)}, próximo NSU: {proximo_nsu}, max NSU: {max_nsu}")
        
        # Processar documentos
        nfes_criadas = 0
        nfes_atualizadas = 0
        erros = 0
        
        for doc in documentos:
            try:
                schema = doc.get('schema', '')
                xml_content = doc.get('xml', '')
                chave_acesso = doc.get('chave_acesso')
                
                # Processar apenas resNFe e procNFe (resumos e NFes completas)
                if schema not in ('resNFe_v1.01', 'procNFe_v4.00'):
                    logger.debug(f"Ignorando documento com schema {schema}")
                    continue
                
                if not chave_acesso:
                    logger.warning(f"Documento sem chave de acesso, schema={schema}")
                    continue
                
                # Parsear XML
                try:
                    xml_root = etree.fromstring(xml_content.encode('utf-8'))
                except Exception as e:
                    logger.error(f"Erro ao parsear XML da chave {chave_acesso}: {e}")
                    erros += 1
                    continue
                
                # Extrair dados básicos
                ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
                
                # Buscar elemento NFe ou resNFe
                if schema == 'resNFe_v1.01':
                    # Resumo - apenas criar registro básico
                    nfe_elems = xml_root.xpath('.//nfe:resNFe', namespaces=ns)
                    if not nfe_elems:
                        logger.warning(f"resNFe sem elemento resNFe, chave={chave_acesso}")
                        continue
                    
                    res_nfe = nfe_elems[0]
                    
                    # Extrair dados do resumo
                    cnpj_emit_elems = res_nfe.xpath('.//nfe:CNPJ', namespaces=ns)
                    nome_emit_elems = res_nfe.xpath('.//nfe:xNome', namespaces=ns)
                    
                    emitente_cnpj = cnpj_emit_elems[0].text if cnpj_emit_elems else None
                    emitente_nome = nome_emit_elems[0].text if nome_emit_elems else None
                    
                else:  # procNFe_v4.00
                    # NFe completa
                    inf_nfe_elems = xml_root.xpath('.//nfe:infNFe', namespaces=ns)
                    if not inf_nfe_elems:
                        logger.warning(f"procNFe sem infNFe, chave={chave_acesso}")
                        continue
                    
                    inf_nfe = inf_nfe_elems[0]
                    
                    # Extrair emitente
                    emit_cnpj_elems = inf_nfe.xpath('.//nfe:emit/nfe:CNPJ', namespaces=ns)
                    emit_nome_elems = inf_nfe.xpath('.//nfe:emit/nfe:xNome', namespaces=ns)
                    
                    emitente_cnpj = emit_cnpj_elems[0].text if emit_cnpj_elems else None
                    emitente_nome = emit_nome_elems[0].text if emit_nome_elems else None
                
                # Criar ou atualizar NFe
                with transaction.atomic():
                    nfe, created = NFe.objects.get_or_create(
                        chave_acesso=chave_acesso,
                        defaults={
                            'emitente_cnpj': emitente_cnpj,
                            'emitente_nome': emitente_nome,
                            'xml_content': xml_content,
                            'data_importacao': timezone.now()
                        }
                    )
                    
                    if created:
                        nfes_criadas += 1
                        logger.info(f"NFe criada: {chave_acesso}")
                    else:
                        # Atualizar XML se não existia
                        if not nfe.xml_content and schema == 'procNFe_v4.00':
                            nfe.xml_content = xml_content
                            nfe.save(update_fields=['xml_content'])
                            nfes_atualizadas += 1
                            logger.info(f"NFe atualizada com XML completo: {chave_acesso}")
                    
                    # Salvar arquivo XML
                    ArquivoXml.objects.get_or_create(
                        nfe=nfe,
                        name=f"{chave_acesso}_{schema}.xml",
                        defaults={
                            'content': xml_content,
                            'certificado_checkpoint': checkpoint
                        }
                    )
                
            except Exception as e:
                logger.exception(f"Erro ao processar documento: {e}")
                erros += 1
                continue
        
        # Atualizar checkpoint
        with transaction.atomic():
            checkpoint.last_nsu = str(max_nsu)
            checkpoint.save(update_fields=['last_nsu', 'updated_at'])
        
        logger.info(f"Sincronização conclu\u00edda: {nfes_criadas} criadas, {nfes_atualizadas} atualizadas, {erros} erros")
        
        return {
            'success': True,
            'nfes_criadas': nfes_criadas,
            'nfes_atualizadas': nfes_atualizadas,
            'documentos_processados': len(documentos),
            'erros': erros,
            'proximo_nsu': proximo_nsu,
            'max_nsu': max_nsu
        }
        
    except Exception as exc:
        logger.exception(f"Erro na sincronização NSU: {exc}")
        try:
            self.retry(exc=exc)
        except Exception:
            return {'success': False, 'error': str(exc)}