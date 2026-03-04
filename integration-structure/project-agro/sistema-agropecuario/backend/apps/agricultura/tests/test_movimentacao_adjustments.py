from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.agricultura.models import MovimentacaoCarga
from apps.estoque.models import Produto, MovimentacaoEstoque, Lote
from django.urls import reverse

User = get_user_model()


class MovimentacaoAdjustmentTests(TestCase):
    def setUp(self):
        # create user
        self.user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
        # create product and local
        self.produto = Produto.objects.create(nome='Soja Test', codigo='SJT', local_armazenamento=None)

        # create a movement (simulate reconciled state by creating MovimentacaoEstoque)
        self.mov = MovimentacaoCarga.objects.create(peso_bruto=1000, tara=0, descontos=0, peso_liquido=1000, destino_tipo='armazenagem_interna')
        # create lote and movimentacao estoque representing reconcile
        self.lote = Lote.objects.create(produto=self.produto, numero_lote='COL-1', quantidade_inicial=1000, quantidade_atual=1000, local_armazenamento='Silo A')
        self.mest = MovimentacaoEstoque.objects.create(produto=self.produto, lote=self.lote, tipo='entrada', origem='colheita', quantidade=1000, documento_referencia=f"MovimentacaoCarga #{self.mov.id}", motivo='Entry', criado_por=self.user)

    def test_adjust_increase_creates_entrada_and_updates_lote(self):
        self.client.force_login(self.user)
        url = reverse('agricultura:movimentacaocarga-adjust', args=[self.mov.id])
        resp = self.client.post(url, {'new_quantity': 1200, 'reason': 'umidade menor'})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'adjusted')
        ajuste_id = data['adjustment_id']
        ajuste = MovimentacaoEstoque.objects.get(id=ajuste_id)
        self.assertEqual(ajuste.tipo, 'entrada')
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.quantidade_atual), 1200)
        # mov updated
        self.mov.refresh_from_db()
        self.assertEqual(float(self.mov.peso_liquido), 1200)

    def test_adjust_decrease_creates_saida_and_updates_lote(self):
        self.client.force_login(self.user)
        url = reverse('agricultura:movimentacaocarga-adjust', args=[self.mov.id])
        resp = self.client.post(url, {'new_quantity': 900, 'reason': 'danos'})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'adjusted')
        ajuste_id = data['adjustment_id']
        ajuste = MovimentacaoEstoque.objects.get(id=ajuste_id)
        self.assertEqual(ajuste.tipo, 'saida')
        self.lote.refresh_from_db()
        self.assertEqual(float(self.lote.quantidade_atual), 900)
        self.mov.refresh_from_db()
        self.assertEqual(float(self.mov.peso_liquido), 900)
