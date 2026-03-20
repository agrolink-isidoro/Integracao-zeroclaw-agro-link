from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone

from apps.fazendas.models import Fazenda, Talhao, Proprietario
from apps.agricultura.models import Plantio, Manejo, Colheita
from apps.estoque.models import Produto, LocalArmazenamento, MovimentacaoEstoque, Lote
from apps.maquinas.models import Equipamento, Abastecimento
from apps.financeiro.models import RateioCusto, RateioApproval
from apps.financeiro import services as financeiro_services
from apps.administrativo.models import Notificacao
from apps.core.models import Tenant


User = get_user_model()


class FullAgricultureFinanceFlowTests(TestCase):
    def setUp(self):
        # Create tenant first
        self.tenant = Tenant.objects.create(
            nome='test_tenant_agricultura_flow',
            slug='test-tenant-agricultura-flow'
        )
        # Users and groups
        self.creator = User.objects.create_user(username='creator_flow', password='pass', is_staff=False, tenant=self.tenant)
        self.approver = User.objects.create_user(username='approver_flow', password='pass', is_staff=False, tenant=self.tenant)
        g, _ = Group.objects.get_or_create(name='financeiro.rateio_approver')
        g.user_set.add(self.approver)

        # Fazenda / Talhao / Cultura / Produto / Local
        self.proprietario = Proprietario.objects.create(nome='Produtor Flow', cpf_cnpj='11111111111', tenant=self.tenant)
        self.fazenda = Fazenda.objects.create(proprietario=self.proprietario, name='Fazenda Flow', matricula='MF-001', tenant=self.tenant)
        from apps.agricultura.models import Cultura
        self.cultura = Cultura.objects.create(nome='Cultura Flow', tenant=self.tenant)
        from apps.fazendas.models import Area
        self.area = Area.objects.create(proprietario=self.proprietario, fazenda=self.fazenda, name='A', geom='POINT(0 0)', tenant=self.tenant)
        self.talhao = Talhao.objects.create(area=self.area, name='Talhao Flow', area_size=10, tenant=self.tenant)

        # Produto for harvested crop (name must include culture name so armazenar_em_estoque finds it)
        self.produto = Produto.objects.create(nome=f"{self.cultura.nome} - Grãos", quantidade_estoque=0, unidade='kg')
        self.local = LocalArmazenamento.objects.create(nome='Silo Flow', fazenda=self.fazenda)

        # Equipamento
        self.equip = Equipamento.objects.create(
            nome='Trator X', marca='Marca', modelo='M-1', ano_fabricacao=2020,
            data_aquisicao=timezone.now().date(), valor_aquisicao=Decimal('100000.00'), status='ativo'
        )

    def test_full_flow_generates_rateios_vencimentos_and_admin_notifications(self):
        # 1) Preparo do solo (Manejo)
        prep = Manejo.objects.create(tipo='preparo_solo', data_manejo='2025-01-02', custo_mao_obra=Decimal('50.00'), custo_maquinas=Decimal('20.00'), custo_insumos=Decimal('10.00'), criado_por=self.creator)
        prep.talhoes.add(self.talhao)
        prep.refresh_from_db()
        self.assertTrue(prep.contabilizado)

        # 2) Plantio
        plantio = Plantio.objects.create(cultura=self.cultura, data_plantio='2025-01-05', criado_por=self.creator, custo_mao_obra=Decimal('100.00'), custo_maquinas=Decimal('50.00'), custo_insumos=Decimal('30.00'))
        plantio.talhoes.add(self.talhao)
        plantio.refresh_from_db()
        self.assertTrue(plantio.contabilizado)

        # 3) Five manejos (treatments)
        manejos = []
        for i, tipo in enumerate(['aplicacao_herbicida', 'aplicacao_fungicida', 'aplicacao_inseticida', 'capina', 'rocada']):
            m = Manejo.objects.create(tipo=tipo, data_manejo=f'2025-02-0{2+i}', custo_mao_obra=Decimal('20.00')*(i+1), custo_maquinas=Decimal('10.00')*(i+1), custo_insumos=Decimal('5.00')*(i+1), criado_por=self.creator)
            m.talhoes.add(self.talhao)
            m.refresh_from_db()
            self.assertTrue(m.contabilizado)
            manejos.append(m)

        # 4) Ordem de Servico (maintenance) and multiple Abastecimentos
        os = None
        from apps.agricultura.models import OrdemServico
        os = OrdemServico.objects.create(fazenda=self.fazenda, tarefa='Manutenção Preventiva', data_inicio=timezone.now(), custo_total=Decimal('300.00'), criado_por=self.creator)
        os.talhoes.add(self.talhao)

        # create a rateio for the OS explicitly (signals do not auto-create for OS)
        financeiro_services.create_rateio_from_operacao(os, created_by=self.creator)

        # create 3 abastecimentos
        for k in range(3):
            Abastecimento.objects.create(equipamento=self.equip, data_abastecimento=timezone.now(), quantidade_litros=Decimal('50.0') + k, valor_unitario=Decimal('5.00'), criado_por=self.creator)

        # 5) Colheita + at least 10 MovimentacaoEstoque entries
        colheita = Colheita.objects.create(plantio=plantio, data_colheita='2025-07-01', quantidade_colhida=Decimal('1000.00'), custo_mao_obra=Decimal('200.00'), custo_maquina=Decimal('100.00'), custo_insumos=Decimal('50.00'), criado_por=self.creator)
        colheita.refresh_from_db()
        self.assertTrue(colheita.contabilizado)

        # store the harvest in stock (creates one MovimentacaoEstoque)
        ok, msg = colheita.armazenar_em_estoque(self.local)
        self.assertTrue(ok)

        # create additional 9 movimentacoes to reach >= 10
        lote = Lote.objects.filter(produto=self.produto).first()
        for i in range(9):
            MovimentacaoEstoque.objects.create(produto=self.produto, lote=lote, tipo='entrada', origem='colheita', quantidade=Decimal('10.0'), valor_unitario=Decimal('2.00'), documento_referencia=f'Extra #{i}', talhao=self.talhao, criado_por=self.creator, plantio=plantio)

        # Assertions: Rateios created for each operation with cost
        rateios = RateioCusto.objects.all()
        # Expected: prep(1) + plantio(1) + 5 manejos(5) + os(1) + colheita(1) = 9
        self.assertGreaterEqual(rateios.count(), 9)

        # Each rateio should have an approval pending
        pending_approvals = RateioApproval.objects.filter(status='pending')
        self.assertGreaterEqual(pending_approvals.count(), 9)

        # Approver should have notifications about pending rateios
        notifs = Notificacao.objects.filter(usuario=self.approver, titulo__icontains='Rateio pendente')
        self.assertTrue(notifs.exists())

        # Abastecimentos count
        abastecimentos = Abastecimento.objects.filter(equipamento=self.equip)
        self.assertEqual(abastecimentos.count(), 3)

        # MovimentacaoEstoque entries for harvested product >= 10
        movs = MovimentacaoEstoque.objects.filter(produto=self.produto)
        self.assertGreaterEqual(movs.count(), 10)

        # Now approve one pending rateio and ensure Vencimento created
        approval = RateioApproval.objects.filter(status='pending').first()
        self.assertIsNotNone(approval)
        approval, vencimento = financeiro_services.aprovar_rateio(approval, self.approver)

        # check status and vencimento
        approval.refresh_from_db()
        self.assertEqual(approval.status, 'approved')
        self.assertIsNotNone(vencimento)

        # Creator should receive a notification about approval
        notif_approved = Notificacao.objects.filter(usuario=self.creator, titulo__icontains='Rateio aprovado')
        self.assertTrue(notif_approved.exists())

        # Summary assertions: financeira resumo contains vencimentos
        from apps.financeiro.services import resumo_financeiro
        resumo = resumo_financeiro()
        self.assertIn('vencimentos', resumo)
        self.assertGreaterEqual(resumo['vencimentos']['count_pendente'], 1)
