from django.test import TestCase
from decimal import Decimal
from apps.maquinas.serializers import AbastecimentoSerializer, OrdemServicoSerializer
from apps.maquinas.models import Abastecimento, OrdemServico
from apps.estoque.models import Produto
from apps.fazendas.models import Proprietario, Fazenda
from apps.maquinas.models import CategoriaEquipamento, Equipamento


class MaquinasSerializersTests(TestCase):
    def setUp(self):
        self.prod = Produto.objects.create(codigo='COMB', nome='Diesel', unidade='L', quantidade_estoque=Decimal('1000'), custo_unitario=Decimal('4.50'))
        self.prop = Proprietario.objects.create(nome='Prop X', cpf_cnpj='11122233344')
        self.faz = Fazenda.objects.create(proprietario=self.prop, name='FazX', matricula='M-01')
        cat, _ = CategoriaEquipamento.objects.get_or_create(nome='Trator', defaults={'tipo_mobilidade': 'autopropelido'})
        self.equip, _ = Equipamento.objects.get_or_create(nome='Trator 1', defaults={'marca':'Marca', 'modelo':'M1', 'ano_fabricacao':2020, 'data_aquisicao':'2020-01-01', 'valor_aquisicao':Decimal('10000'), 'categoria':cat})

    def test_abastecimento_serializer_validates_and_creates(self):
        data = {
            'equipamento': self.equip.pk,
            'data_abastecimento': '2025-01-01T10:00:00Z',
            'quantidade_litros': '30',
            'valor_unitario': '5.0',
            'produto_estoque': self.prod.pk
        }
        s = AbastecimentoSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        obj = s.save()
        self.assertEqual(obj.produto_estoque.pk, self.prod.pk)
        self.assertEqual(obj.quantidade_litros, Decimal('30'))
        self.assertEqual(obj.valor_total, Decimal('150.0'))

    def test_ordemservico_serializer_validates_insumos(self):
        data = {
            'equipamento': self.equip.pk,
            'tarefa': 'Manutenção preventiva',
            'tipo': 'preventiva',
            'descricao_problema': 'Troca filtro',
            'data_previsao': '2025-01-01',
            'insumos': [{'produto_id': self.prod.pk, 'quantidade': '2'}]
        }
        s = OrdemServicoSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        os = s.save()
        self.assertEqual(len(os.insumos), 1)
        self.assertEqual(int(os.insumos[0]['produto_id']), self.prod.pk)
        # custo_pecas deve ser calculado a partir do custo_unitario do produto
        from decimal import Decimal
        self.assertEqual(os.custo_pecas, Decimal('9.00'))
        # deve criar movimentacao de reserva
        from apps.estoque.models import MovimentacaoEstoque
        reservas = MovimentacaoEstoque.objects.filter(origem='ordem_servico', tipo='reserva', documento_referencia=f'OS #{os.pk}')
        self.assertTrue(reservas.exists())
        os.refresh_from_db()
        self.assertTrue(os.insumos_reservados)

        # Agora cancelar a OS deve liberar reservas (criar mov 'liberacao')
        os.status = 'cancelada'
        os.save()
        liberacoes = MovimentacaoEstoque.objects.filter(origem='ordem_servico', tipo='liberacao', documento_referencia=f'OS #{os.pk}')
        self.assertTrue(liberacoes.exists())
        os.refresh_from_db()
        self.assertFalse(os.insumos_reservados)

    def test_ordemservico_serializer_accepts_nfes_and_returns_detail(self):
        from apps.fiscal.models import NFe, ItemNFe
        # Criar produto correspondente ao item da NFe
        prod2 = Produto.objects.create(codigo='P-100', nome='Peça X', unidade='un', quantidade_estoque=10, custo_unitario=Decimal('5.00'))
        # Criar NFe de entrada e marcar estoque_confirmado
        nfe = NFe.objects.create(chave_acesso='0'*44, numero='123', serie='1', data_emissao='2025-01-01T00:00:00Z', tipo_operacao='0', emitente_nome='Fornecedor A', valor_produtos=100, valor_nota=100, valor_icms=0, estoque_confirmado=True)
        ItemNFe.objects.create(nfe=nfe, numero_item=1, codigo_produto='P-100', descricao='Peça X', unidade_comercial='un', quantidade_comercial=1, valor_unitario_comercial=5.00, valor_produto=5.00, cfop='5102')

        data = {
            'equipamento': self.equip.pk,
            'tarefa': 'Reparo X',
            'tipo': 'corretiva',
            'descricao_problema': 'Troca peça',
            'insumos': [{'produto_id': prod2.pk, 'quantidade': '1'}],
            'nfes': [nfe.pk]
        }
        s = OrdemServicoSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        os = s.save()
        self.assertIn(nfe, os.nfes.all())
        # nfes_detail deve conter informação da nfe vinculada
        ser_out = OrdemServicoSerializer(os)
        self.assertTrue(len(ser_out.data.get('nfes_detail', [])) > 0)

    def test_ordemservico_create_fails_when_reserving_more_than_available(self):
        # Produto com estoque baixo
        low_prod = Produto.objects.create(codigo='LOW', nome='Peça Low', unidade='un', quantidade_estoque=1, custo_unitario=Decimal('10.00'))
        data = {
            'equipamento': self.equip.pk,
            'tarefa': 'Reparo Y',
            'tipo': 'corretiva',
            'descricao_problema': 'Tentativa consumir mais que estoque',
            'insumos': [{'produto_id': low_prod.pk, 'quantidade': '5'}]
        }
        s = OrdemServicoSerializer(data=data)
        # validação estrutural passa
        self.assertTrue(s.is_valid(), s.errors)
        # mas ao salvar deve falhar por estoque insuficiente e não deixar objeto criado
        from rest_framework import serializers
        with self.assertRaises(serializers.ValidationError):
            s.save()
        self.assertFalse(OrdemServico.objects.filter(descricao_problema__icontains='Tentativa consumir').exists())

    def test_ordemservico_serializer_handles_atomic_error_during_reservation(self):
        """Simula um erro de transação dentro do serviço de estoque e valida resposta segura."""
        from unittest.mock import patch
        from django.db import DatabaseError

        prod = Produto.objects.create(codigo='X-1', nome='Item X', unidade='un', quantidade_estoque=100, custo_unitario=Decimal('2.00'))
        data = {
            'equipamento': self.equip.pk,
            'tarefa': 'Erro Atomico',
            'tipo': 'corretiva',
            'descricao_problema': 'Simular erro atomic',
            'insumos': [{'produto_id': prod.pk, 'quantidade': '1'}]
        }

        # Forçar create_movimentacao a lançar DatabaseError similar ao observado em runtime
        with patch('apps.maquinas.signals.create_movimentacao') as mocked_create:
            mocked_create.side_effect = DatabaseError("An error occurred in the current transaction. You can't execute queries until the end of the 'atomic' block.")
            s = OrdemServicoSerializer(data=data)
            self.assertTrue(s.is_valid(), s.errors)
            from rest_framework import serializers
            with self.assertRaises(serializers.ValidationError) as cm:
                s.save()

            # Mensagem do serializer contém texto legível
            exc = cm.exception
            self.assertIn('Falha ao reservar insumos', str(exc))

            # Não deve haver OS criada
            self.assertFalse(OrdemServico.objects.filter(descricao_problema__icontains='Simular erro atomic').exists())

    def test_ordemservico_reservation_with_long_produto_categoria(self):
        """Garante que categorias longas não quebrem a criação de auditoria/reserva."""
        long_cat = 'combustiveis_lubrificantes'  # >20 chars
        prod = Produto.objects.create(codigo='LONG1', nome='Óleo Longo', unidade='L', quantidade_estoque=100, custo_unitario=Decimal('42.00'), categoria=long_cat)

        data = {
            'equipamento': self.equip.pk,
            'tarefa': 'Teste Categoria Longa',
            'tipo': 'corretiva',
            'descricao_problema': 'Teste categoria longa',
            'insumos': [{'produto_id': prod.pk, 'quantidade': '2'}]
        }

        s = OrdemServicoSerializer(data=data)
        self.assertTrue(s.is_valid(), s.errors)
        os = s.save()

        # Movimentacao de reserva deve existir sem DataError
        from apps.estoque.models import MovimentacaoEstoque
        reservas = MovimentacaoEstoque.objects.filter(origem='ordem_servico', tipo='reserva', documento_referencia=f'OS #{os.pk}')
        self.assertTrue(reservas.exists())
        os.refresh_from_db()
        self.assertTrue(os.insumos_reservados)

        # ProdutoAuditoria criado e produto_categoria truncado para caber no campo
        aud = prod.auditorias.order_by('-criado_em').first()
        self.assertIsNotNone(aud)
        self.assertTrue(len(aud.produto_categoria) <= 30)
        self.assertEqual(aud.produto_categoria, long_cat[:30])
