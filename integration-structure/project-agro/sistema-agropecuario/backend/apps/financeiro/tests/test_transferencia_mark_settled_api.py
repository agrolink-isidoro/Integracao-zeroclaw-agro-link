from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.financeiro.models import ContaBancaria, Vencimento, Transferencia
from rest_framework.test import APIClient
from decimal import Decimal
from apps.financeiro.services import pagar_vencimentos_por_transferencia

User = get_user_model()

class TransferenciaMarkSettledAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('apiuser2', 'a2@example.com', 'pw')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.c1 = ContaBancaria.objects.create(banco='Banco A', agencia='0001', conta='1111', saldo_inicial=Decimal('1000'))
        self.c2 = ContaBancaria.objects.create(banco='Banco B', agencia='0002', conta='2222', saldo_inicial=Decimal('500'))
        self.v = Vencimento.objects.create(titulo='Venc API', valor=Decimal('120.00'), data_vencimento='2026-03-01')

    def test_mark_settled_api(self):
        transfer = pagar_vencimentos_por_transferencia(self.c1, [{'vencimento': self.v.id, 'valor': '120.00'}], tipo='ted', dados_bancarios={'conta_destino': self.c2.id}, criado_por=self.user)
        self.assertEqual(transfer.status, 'pending')
        res = self.client.post(f'/api/financeiro/transferencias/{transfer.id}/mark_settled/', data={'external_reference': 'ext-222', 'taxa_bancaria': '5.00'}, format='json')
        self.assertEqual(res.status_code, 200)
        t = Transferencia.objects.get(pk=transfer.id)
        self.assertEqual(t.status, 'settled')
        self.v.refresh_from_db()
        self.assertEqual(self.v.status, 'pago')
