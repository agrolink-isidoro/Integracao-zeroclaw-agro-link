"""
Management command para migrar dados de Manejo e OrdemServico para o novo modelo Operacao.

Uso:
    python manage.py migrar_dados_operacoes [--dry-run] [--verbose]
    
Opções:
    --dry-run: Simula a migração sem salvar no banco
    --verbose: Mostra detalhes de cada registro migrado
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.agricultura.models import Manejo, ManejoProduto, OrdemServico, Operacao, OperacaoProduto
from apps.estoque.models import Produto
from apps.maquinas.models import Equipamento


class Command(BaseCommand):
    help = 'Migra dados de Manejo e OrdemServico para o novo modelo Operacao'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula a migração sem salvar',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra detalhes de cada migração',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        self.stdout.write(self.style.WARNING('=' * 70))
        self.stdout.write(self.style.WARNING('MIGRAÇÃO DE DADOS: Manejo + OrdemServico → Operacao'))
        self.stdout.write(self.style.WARNING('=' * 70))
        
        if dry_run:
            self.stdout.write(self.style.NOTICE('🔍 MODO DRY-RUN: Nenhum dado será salvo'))
        
        # Contadores
        stats = {
            'manejo_total': 0,
            'manejo_sucesso': 0,
            'manejo_erro': 0,
            'os_total': 0,
            'os_sucesso': 0,
            'os_erro': 0,
        }
        
        try:
            with transaction.atomic():
                # MIGRAÇÃO 1: Manejo → Operacao
                self.stdout.write('\n' + self.style.HTTP_INFO('📋 FASE 1: Migrando registros de Manejo'))
                stats = self.migrar_manejos(verbose, stats)
                
                # MIGRAÇÃO 2: OrdemServico → Operacao
                self.stdout.write('\n' + self.style.HTTP_INFO('📋 FASE 2: Migrando registros de OrdemServico'))
                stats = self.migrar_ordens_servico(verbose, stats)
                
                if dry_run:
                    raise Exception("DRY-RUN: Rollback proposital")
                    
        except Exception as e:
            if not dry_run:
                self.stdout.write(self.style.ERROR(f'\n❌ ERRO: {str(e)}'))
                return
        
        # Relatório final
        self.imprimir_relatorio(stats, dry_run)

    def migrar_manejos(self, verbose, stats):
        """Migra registros de Manejo para Operacao"""
        manejos = Manejo.objects.all().select_related(
            'plantio__cultura', 'fazenda', 'criado_por'
        ).prefetch_related('talhoes', 'produtos_utilizados')
        
        stats['manejo_total'] = manejos.count()
        
        for manejo in manejos:
            try:
                # Mapear tipo de manejo para categoria/tipo da operação
                categoria, tipo = self.mapear_tipo_manejo(manejo.tipo)
                
                # Criar operação
                operacao = Operacao(
                    categoria=categoria,
                    tipo=tipo,
                    plantio=manejo.plantio,
                    fazenda=manejo.fazenda,
                    data_inicio=timezone.make_aware(
                        timezone.datetime.combine(manejo.data_manejo, timezone.datetime.min.time())
                    ) if timezone.is_naive(timezone.datetime.combine(manejo.data_manejo, timezone.datetime.min.time())) else timezone.datetime.combine(manejo.data_manejo, timezone.datetime.min.time()),
                    data_fim=None,
                    status='finalizada',  # Manejo já executado
                    observacoes=manejo.descricao or '',
                    custo_total=manejo.custo,
                    criado_por=manejo.criado_por,
                    criado_em=manejo.criado_em,
                )
                
                # Tentar encontrar equipamento pelo nome
                if manejo.equipamento:
                    try:
                        equip = Equipamento.objects.filter(nome__icontains=manejo.equipamento).first()
                        if equip:
                            operacao.trator = equip
                    except:
                        pass
                
                operacao.save()
                
                # Adicionar talhões
                operacao.talhoes.set(manejo.talhoes.all())
                
                # Migrar produtos
                manejo_produtos = ManejoProduto.objects.filter(manejo=manejo)
                for mp in manejo_produtos:
                    OperacaoProduto.objects.create(
                        operacao=operacao,
                        produto=mp.produto,
                        dosagem=mp.dosagem,
                        unidade_dosagem=mp.unidade_dosagem,
                        quantidade_total=mp.quantidade
                    )
                
                stats['manejo_sucesso'] += 1
                
                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Manejo #{manejo.id} → Operacao #{operacao.id} ({categoria}/{tipo})')
                    )
                    
            except Exception as e:
                stats['manejo_erro'] += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Manejo #{manejo.id}: {str(e)}')
                )
        
        return stats

    def migrar_ordens_servico(self, verbose, stats):
        """Migra registros de OrdemServico para Operacao"""
        ordens = OrdemServico.objects.all().select_related(
            'fazenda', 'criado_por'
        ).prefetch_related('talhoes')
        
        stats['os_total'] = ordens.count()
        
        for os in ordens:
            try:
                # Mapear tarefa para categoria/tipo
                categoria, tipo = self.mapear_tarefa_os(os.tarefa, os.tipo_manual)
                
                # Criar operação
                operacao = Operacao(
                    categoria=categoria,
                    tipo=tipo,
                    plantio=None,  # OS não tem plantio vinculado
                    fazenda=os.fazenda,
                    data_inicio=os.data_inicio,
                    data_fim=os.data_fim,
                    status=self.mapear_status_os(os.status),
                    observacoes=f"Tarefa: {os.tarefa}",
                    custo_total=os.custo_total,
                    criado_por=os.criado_por,
                    criado_em=os.criado_em,
                )
                
                # Tentar encontrar máquina
                if os.maquina:
                    try:
                        equip = Equipamento.objects.filter(nome__icontains=os.maquina).first()
                        if equip:
                            operacao.trator = equip
                    except:
                        pass
                
                # Dados específicos (insumos)
                if os.insumos:
                    operacao.dados_especificos = {'insumos_originais': os.insumos}
                
                operacao.save()
                
                # Adicionar talhões
                operacao.talhoes.set(os.talhoes.all())
                
                stats['os_sucesso'] += 1
                
                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ OS #{os.id} → Operacao #{operacao.id} ({categoria}/{tipo})')
                    )
                    
            except Exception as e:
                stats['os_erro'] += 1
                self.stdout.write(
                    self.style.ERROR(f'  ✗ OS #{os.id}: {str(e)}')
                )
        
        return stats

    def mapear_tipo_manejo(self, tipo_manejo):
        """Mapeia tipo de Manejo para categoria/tipo de Operacao"""
        mapa = {
            # Preparação do Solo
            'preparo_solo': ('preparacao', 'prep_limpeza'),
            'aracao': ('preparacao', 'prep_aracao'),
            'gradagem': ('preparacao', 'prep_gradagem'),
            'subsolagem': ('preparacao', 'prep_subsolagem'),
            'correcao_solo': ('preparacao', 'prep_correcao'),
            'calagem': ('preparacao', 'prep_correcao'),
            
            # Adubação
            'adubacao_base': ('adubacao', 'adub_base'),
            'adubacao_cobertura': ('adubacao', 'adub_cobertura'),
            'adubacao_foliar': ('adubacao', 'adub_foliar'),
            
            # Plantio
            'dessecacao': ('plantio', 'plant_dessecacao'),
            'plantio_direto': ('plantio', 'plant_direto'),
            'plantio_convencional': ('plantio', 'plant_convencional'),
            
            # Tratos Culturais
            'irrigacao': ('tratos', 'trat_irrigacao'),
            'poda': ('tratos', 'trat_poda'),
            'desbaste': ('tratos', 'trat_desbaste'),
            'amontoa': ('tratos', 'trat_amontoa'),
            
            # Pulverização
            'controle_pragas': ('pulverizacao', 'pulv_inseticida'),
            'controle_doencas': ('pulverizacao', 'pulv_fungicida'),
            'controle_plantas_daninhas': ('pulverizacao', 'pulv_herbicida'),
            'pulverizacao': ('pulverizacao', 'pulv_herbicida'),
            'aplicacao_herbicida': ('pulverizacao', 'pulv_herbicida'),
            'aplicacao_fungicida': ('pulverizacao', 'pulv_fungicida'),
            'aplicacao_inseticida': ('pulverizacao', 'pulv_inseticida'),
            
            # Operações Mecânicas
            'capina': ('mecanicas', 'mec_capina'),
            'rocada': ('mecanicas', 'mec_rocada'),
            'cultivo_mecanico': ('mecanicas', 'mec_rocada'),
            
            # Padrão
            'outro': ('tratos', 'trat_outros'),
        }
        
        return mapa.get(tipo_manejo, ('tratos', 'trat_outros'))

    def mapear_tarefa_os(self, tarefa, tipo_manual):
        """Mapeia tarefa de OrdemServico para categoria/tipo"""
        tarefa_lower = tarefa.lower()
        
        # Mapeamento por palavras-chave
        if any(x in tarefa_lower for x in ['arar', 'aração', 'preparo']):
            return ('preparacao', 'prep_aracao')
        elif any(x in tarefa_lower for x in ['gradar', 'gradagem']):
            return ('preparacao', 'prep_gradagem')
        elif any(x in tarefa_lower for x in ['adubar', 'adubação', 'fertilizar']):
            return ('adubacao', 'adub_base')
        elif any(x in tarefa_lower for x in ['plantar', 'plantio', 'semear']):
            return ('plantio', 'plant_direto')
        elif any(x in tarefa_lower for x in ['pulverizar', 'aplicar', 'herbicida', 'fungicida']):
            return ('pulverizacao', 'pulv_herbicida')
        elif any(x in tarefa_lower for x in ['irrigar', 'irrigação']):
            return ('tratos', 'trat_irrigacao')
        elif any(x in tarefa_lower for x in ['roçar', 'roçada', 'capina']):
            return ('mecanicas', 'mec_rocada')
        else:
            # Se for manual, assume tratos culturais
            if tipo_manual:
                return ('tratos', 'trat_outros')
            else:
                return ('mecanicas', 'mec_rocada')

    def mapear_status_os(self, status_os):
        """Mapeia status de OrdemServico para Operacao"""
        mapa = {
            'pendente': 'planejada',
            'aprovada': 'planejada',
            'ativa': 'em_andamento',
            'finalizada': 'finalizada',
        }
        return mapa.get(status_os, 'planejada')

    def imprimir_relatorio(self, stats, dry_run):
        """Imprime relatório final da migração"""
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('📊 RELATÓRIO DE MIGRAÇÃO'))
        self.stdout.write('=' * 70)
        
        # Manejo
        self.stdout.write(f'\n📋 MANEJO:')
        self.stdout.write(f'  Total: {stats["manejo_total"]}')
        self.stdout.write(self.style.SUCCESS(f'  ✓ Sucesso: {stats["manejo_sucesso"]}'))
        if stats['manejo_erro'] > 0:
            self.stdout.write(self.style.ERROR(f'  ✗ Erros: {stats["manejo_erro"]}'))
        
        # OrdemServico
        self.stdout.write(f'\n📋 ORDEM DE SERVIÇO:')
        self.stdout.write(f'  Total: {stats["os_total"]}')
        self.stdout.write(self.style.SUCCESS(f'  ✓ Sucesso: {stats["os_sucesso"]}'))
        if stats['os_erro'] > 0:
            self.stdout.write(self.style.ERROR(f'  ✗ Erros: {stats["os_erro"]}'))
        
        # Total
        total_migrado = stats['manejo_sucesso'] + stats['os_sucesso']
        total_erros = stats['manejo_erro'] + stats['os_erro']
        
        self.stdout.write(f'\n📊 TOTAL GERAL:')
        self.stdout.write(self.style.SUCCESS(f'  ✓ Migrados: {total_migrado}'))
        if total_erros > 0:
            self.stdout.write(self.style.ERROR(f'  ✗ Erros: {total_erros}'))
        
        if dry_run:
            self.stdout.write('\n' + self.style.WARNING('⚠️  DRY-RUN: Nenhum dado foi salvo (rollback executado)'))
        else:
            self.stdout.write('\n' + self.style.SUCCESS('✅ Migração concluída com sucesso!'))
        
        self.stdout.write('=' * 70 + '\n')
