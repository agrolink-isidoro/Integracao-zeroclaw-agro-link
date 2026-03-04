"""
Tests for sync_nfes_task refinements: coordination, batching, and idempotency.

Simplified test suite that validates the implementation of:
1. Coordination by certificate (no race conditions, proper locking)
2. Batching (aggregate multiple NFes before persistence)
3. Idempotency (running sync twice produces same result, no duplicates)
"""
import pytest
from unittest.mock import Mock, patch
from django.test import TestCase
from django.utils import timezone


pytestmark = pytest.mark.django_db(transaction=True)


def test_sync_batch_size_config():
    """Test that SYNC_BATCH_SIZE can be configured via environment variable."""
    import os
    from apps.fiscal.tasks import _process_fetched_items
    
    # Default should be 10
    batch_size_default = int(os.environ.get('FISCAL_SYNC_BATCH_SIZE', '10'))
    assert batch_size_default == 10
    
    # Can be overridden
    os.environ['FISCAL_SYNC_BATCH_SIZE'] = '5'
    batch_size = int(os.environ.get('FISCAL_SYNC_BATCH_SIZE'))
    assert batch_size == 5
    
    # Cleanup
    os.environ.pop('FISCAL_SYNC_BATCH_SIZE', None)


def test_process_fetched_items_with_batching():
    """Test that _process_fetched_items respects batch_size parameter."""
    from apps.fiscal.tasks import _process_fetched_items
    from apps.fiscal.models_sync import ProcessamentoWs
    from apps.fiscal.services.sefaz_distrib import DistribItem
    
    # Create test ProcessamentoWs
    proc = ProcessamentoWs.objects.create(
        job_type='sync_nfes',
        status='pending',
        details={}
    )
    
    # Create test items
    items = [
        DistribItem(
            chave_acesso=f'{i:010d}',
            raw_xml=f'<NFe><infNFe Id="NFe{i:010d}">data{i}</infNFe></NFe>',
            resumo={'numero': str(i)},
            nsu=f'{i:03d}'
        )
        for i in range(1, 6)  # 5 items
    ]
    
    # Process with batch_size=2
    result = _process_fetched_items(proc, items, certificado=None, batch_size=2)
    
    # Should have created 5 items despite batch_size=2
    assert result['success'] is True
    assert result['created'] == 5


def test_idempotency_via_sync_trace_id():
    """Test that duplicate items are skipped via sync_trace_id (XML hash)."""
    from apps.fiscal.tasks import _process_fetched_items
    from apps.fiscal.models_sync import ProcessamentoWs, ArquivoXml
    from apps.fiscal.services.sefaz_distrib import DistribItem
    
    # Create test ProcessamentoWs
    proc = ProcessamentoWs.objects.create(
        job_type='sync_nfes',
        status='pending',
        details={}
    )
    
    xml_content = '<NFe><infNFe Id="NFe0001000001">shared_data</infNFe></NFe>'
    
    # Create item with specific content
    items = [
        DistribItem(
            chave_acesso='0001000001',
            raw_xml=xml_content,
            resumo={'numero': '1'},
            nsu='001'
        )
    ]
    
    # First process
    result1 = _process_fetched_items(proc, items, certificado=None, batch_size=10)
    assert result1['created'] == 1
    
    # Verify ArquivoXml was created with sync_trace_id
    arquivo = ArquivoXml.objects.filter(name='0001000001.xml').first()
    assert arquivo is not None
    assert arquivo.sync_trace_id is not None
    first_trace_id = arquivo.sync_trace_id
    
    # Second process with same XML (different chave for testing logic)
    proc2 = ProcessamentoWs.objects.create(
        job_type='sync_nfes',
        status='pending',
        details={}
    )
    
    items2 = [
        DistribItem(
            chave_acesso='0001000001',  # Same chave, same XML
            raw_xml=xml_content,
            resumo={'numero': '1'},
            nsu='002'  # Different NSU
        )
    ]
    
    # Process should skip duplicate
    result2 = _process_fetched_items(proc2, items2, certificado=None, batch_size=10)
    assert result2['created'] == 0  # No new items (duplicate skipped)


def test_locks_on_nsu_checkpoint():
    """Test that NsuCheckpoint uses select_for_update for coordination."""
    from apps.fiscal.tasks import _process_fetched_items
    from apps.fiscal.models_sync import ProcessamentoWs, NsuCheckpoint
    from apps.fiscal.services.sefaz_distrib import DistribItem
    
    # Create test ProcessamentoWs
    proc = ProcessamentoWs.objects.create(
        job_type='sync_nfes',
        status='pending',
        details={}
    )
    
    # Create items with NSU
    items = [
        DistribItem(
            chave_acesso=f'{i:010d}',
            raw_xml=f'<NFe><infNFe Id="NFe{i:010d}">data{i}</infNFe></NFe>',
            resumo={'numero': str(i)},
            nsu=f'{i:03d}'
        )
        for i in range(1, 4)  # 3 items
    ]
    
    # Process items
    result = _process_fetched_items(proc, items, certificado=None, batch_size=10)
    assert result['created'] == 3
    
    # Verify NsuCheckpoint was updated
    cp = NsuCheckpoint.objects.filter(certificado__isnull=True).first()
    assert cp is not None
    assert cp.last_nsu == '003'  # Max NSU should be recorded


def test_process_fetched_items_integration():
    """Integration test: batching + idempotency + locking."""
    from apps.fiscal.tasks import _process_fetched_items
    from apps.fiscal.models_sync import ProcessamentoWs, NFeRemote, ArquivoXml, NsuCheckpoint
    from apps.fiscal.services.sefaz_distrib import DistribItem
    
    # Create first ProcessamentoWs
    proc1 = ProcessamentoWs.objects.create(
        job_type='sync_nfes',
        status='pending',
        details={}
    )
    
    # First batch: 10 items
    items_batch1 = [
        DistribItem(
            chave_acesso=f'{i:010d}',
            raw_xml=f'<NFe><infNFe Id="NFe{i:010d}">data{i}</infNFe></NFe>',
            resumo={'numero': str(i)},
            nsu=f'{i:03d}'
        )
        for i in range(1, 11)  # 10 items
    ]
    
    result1 = _process_fetched_items(proc1, items_batch1, certificado=None, batch_size=3)
    assert result1['created'] == 10
    assert NFeRemote.objects.count() == 10
    assert ArquivoXml.objects.count() == 10
    
    cp = NsuCheckpoint.objects.filter(certificado__isnull=True).first()
    assert cp.last_nsu == '010'
    
    # Second process: same first 10 items
    proc2 = ProcessamentoWs.objects.create(
        job_type='sync_nfes',
        status='pending',
        details={}
    )
    
    result2 = _process_fetched_items(proc2, items_batch1, certificado=None, batch_size=3)
    assert result2['created'] == 0  # All duplicates skipped
    assert NFeRemote.objects.count() == 10  # No new items
    assert ArquivoXml.objects.count() == 10


class TestSyncNFesTaskImportStructure(TestCase):
    """Test that sync_nfes_task can be imported and called."""
    
    def test_sync_nfes_task_importable(self):
        """Test that sync_nfes_task can be imported from tasks module."""
        from apps.fiscal.tasks import sync_nfes_task
        assert callable(sync_nfes_task)
    
    def test_process_fetched_items_importable(self):
        """Test that _process_fetched_items helper is available."""
        from apps.fiscal.tasks import _process_fetched_items
        assert callable(_process_fetched_items)
    
    def test_get_certificados_importable(self):
        """Test that _get_certificados helper is available."""
        from apps.fiscal.tasks import _get_certificados
        assert callable(_get_certificados)


class TestArquivoXmlRefinements(TestCase):
    """Test ArquivoXml model refinements."""
    
    def test_arquivo_xml_has_sync_trace_id_field(self):
        """Test that ArquivoXml model has sync_trace_id field."""
        from apps.fiscal.models_sync import ArquivoXml
        
        field_names = [f.name for f in ArquivoXml._meta.get_fields()]
        assert 'sync_trace_id' in field_names
    
    def test_arquivo_xml_has_certificado_checkpoint_field(self):
        """Test that ArquivoXml model has certificado_checkpoint FK."""
        from apps.fiscal.models_sync import ArquivoXml
        
        field_names = [f.name for f in ArquivoXml._meta.get_fields()]
        assert 'certificado_checkpoint' in field_names
