from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.maquinas.models import OrdemServico, Equipamento
from datetime import timedelta
from decimal import Decimal

User = get_user_model()

class OrdemServicoAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='apiuser', password='pass')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        # Create a category fallback for Equipamento FK (categoria=1 often exists from migrations)
        self.equip = Equipamento.objects.create(
            nome='Equip API', categoria_id=1, ano_fabricacao=2020, data_aquisicao='2020-01-01', valor_aquisicao=1000
        )

    def test_concluir_action_success(self):
        ordem = OrdemServico.objects.create(
            numero_os='OSAPI01',
            equipamento=self.equip,
            tipo='corretiva',
            prioridade='media',
            status='aberta',
            descricao_problema='Teste API'
        )

        url = f"/api/maquinas/ordens-servico/{ordem.id}/concluir/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'concluida')
        self.assertIsNotNone(data.get('data_conclusao'))

    def test_concluir_action_fails_when_data_abertura_in_future(self):
        ordem = OrdemServico.objects.create(
            numero_os='OSAPI02',
            equipamento=self.equip,
            tipo='corretiva',
            prioridade='media',
            status='aberta',
            descricao_problema='Teste API futuro'
        )
        # Set data_abertura to tomorrow (future) so concluir (now) is before abertura
        ordem.data_abertura = timezone.now() + timedelta(days=1)
        ordem.save()

        url = f"/api/maquinas/ordens-servico/{ordem.id}/concluir/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, 400)
        body = resp.json()
        self.assertIn('data_conclusao', body.get('detail', {}))

    def test_create_ordem_with_nfes_and_insumos_api(self):
        from apps.fiscal.models import NFe, ItemNFe
        from apps.estoque.models import Produto
        # Preparar produto e NFe
        prod = Produto.objects.create(codigo='P-200', nome='Peça Y', unidade='un', quantidade_estoque=5, custo_unitario=Decimal('10.00'))
        nfe = NFe.objects.create(chave_acesso='1'*44, numero='555', serie='1', data_emissao='2025-01-02T00:00:00Z', tipo_operacao='0', emitente_nome='Fornecedor B', valor_produtos=100, valor_nota=100, valor_icms=0, estoque_confirmado=True)
        ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='P-200', descricao='Peça Y', unidade_comercial='un', quantidade_comercial=2, valor_unitario_comercial=10.00, valor_produto=20.00, cfop='5102')

        payload = {
            'equipamento': self.equip.pk,
            'tarefa': 'Reparo API',
            'tipo': 'corretiva',
            'descricao_problema': 'Troca peça Y',
            'insumos': [{'produto_id': prod.pk, 'quantidade': '1'}],
            'nfes': [nfe.pk]
        }
        resp = self.client.post('/api/maquinas/ordens-servico/', payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertIn('nfes', data)
        self.assertEqual(data['nfes'][0], nfe.pk)
        # confirmar relacionamento no DB
        os = OrdemServico.objects.get(pk=data['id'])
        self.assertIn(nfe, os.nfes.all())
