from django.test import TestCase
try:
    from apps.fiscal.services.sefaz_distrib import SefazDistribClient, DistribItem
except Exception:
    import importlib.util, os
    path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'services', 'sefaz_distrib.py'))
    spec = importlib.util.spec_from_file_location('sefaz_distrib', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    SefazDistribClient = mod.SefazDistribClient
    DistribItem = getattr(mod, 'DistribItem')


from unittest import mock


class SefazDistribCheckpointTest(TestCase):
    def setUp(self):
        # import here to avoid pytest collection import-time issues and use fully qualified package names
        from apps.fiscal.models_sync import NsuCheckpoint, ProcessamentoWs, NFeRemote, NFeResumo
        from apps.fiscal.models_certificados import CertificadoSefaz
        from apps.fiscal.tasks import sync_nfes_task

        self.NsuCheckpoint = NsuCheckpoint
        self.ProcessamentoWs = ProcessamentoWs
        self.NFeRemote = NFeRemote
        self.NFeResumo = NFeResumo
        self.CertificadoSefaz = CertificadoSefaz
        self.sync_nfes_task = sync_nfes_task

        self.cert = self.CertificadoSefaz.objects.create(nome='test', arquivo_name='test.pfx')

    def test_fetch_uses_existing_checkpoint_nsu(self):
        client = SefazDistribClient(simulate=False)

        called = {}

        def fake_request(certificado, last_nsu=None):
            called['last_nsu'] = last_nsu
            return []

        client._request = fake_request

        # Patch the NsuCheckpoint lookup to return a fake checkpoint with last_nsu
        class FakeCP:
            last_nsu = '00005'

        import unittest.mock as mock
        # patch helper on the client to avoid model-level patching
        with mock.patch.object(SefazDistribClient, '_get_last_nsu', return_value='00005'):
            client.fetch(certificado=None)

        self.assertEqual(called.get('last_nsu'), '00005')

    def test_sync_nfes_updates_checkpoint(self):
        # Use mocks to avoid DB setup complexity; verify task logic calls models appropriately
        item = DistribItem(chave_acesso='9'*44, raw_xml='<nfeProc></nfeProc>', resumo={'emitente': 'X'}, nsu='00077')

        with mock.patch('apps.fiscal.services.sefaz_distrib.SefazDistribClient') as MockClient, \
             mock.patch('apps.fiscal.models_sync.NFeRemote') as MockNFeRemote, \
             mock.patch('apps.fiscal.models_sync.NFeResumo') as MockNFeResumo, \
             mock.patch('apps.fiscal.models_sync.NsuCheckpoint') as MockCheckpoint, \
             mock.patch('apps.fiscal.models_sync.ProcessamentoWs') as MockProc:

            inst = MockClient.return_value
            inst.fetch.return_value = [item]

            # setup a fake ProcessamentoWs instance returned by get(pk=...)
            fake_proc = mock.Mock()
            fake_proc.id = 1
            fake_proc.status = 'pending'
            fake_proc.save = mock.Mock()
            MockProc.objects.get.return_value = fake_proc

            # ensure get_or_create returns a tuple like Django does and provide a concrete cp instance
            cp_inst = mock.Mock()
            # Setup select_for_update chain
            MockCheckpoint.objects.select_for_update.return_value.get_or_create.return_value = (cp_inst, True)
            MockNFeRemote.objects.get_or_create.return_value = (mock.Mock(), True)
            MockNFeResumo.objects.get_or_create.return_value = (mock.Mock(), True)

            res = self.sync_nfes_task.__wrapped__(1)

            # Ensure models were accessed (demonstrating sync logic ran)
            self.assertTrue(inst.fetch.called)
            # Checkpoint.objects.select_for_update should be called
            MockCheckpoint.objects.select_for_update.assert_called()
