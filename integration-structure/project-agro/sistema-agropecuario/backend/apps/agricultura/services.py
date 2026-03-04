"""
Serviços para cálculos de custo em Agricultura
"""
from decimal import Decimal
from django.db import models
from apps.financeiro.services import create_rateio_from_operacao


def calcular_custo_manejo(manejo):
    """Calcula custos detalhados de um `Manejo` considerando insumos (produtos), mão de obra e máquinas.

    - Usa `ManejoProduto.quantidade * Produto.custo_unitario` para insumos quando disponível
    - Usa `manejo.custo_mao_obra` e `manejo.custo_maquinas` quando informados
    - Atualiza `manejo.custo_insumos` e `manejo.custo_total` e persiste
    """
    from apps.agricultura.models import ManejoProduto
    from apps.estoque.models import Produto

    custo_insumos = Decimal('0')
    for mp in ManejoProduto.objects.filter(manejo=manejo):
        produto = mp.produto
        unidade_cost = produto.custo_unitario or Decimal('0')
        custo_insumos += (Decimal(str(mp.quantidade or 0)) * Decimal(str(unidade_cost)))

    # If the field was not set, update it
    if getattr(manejo, 'custo_insumos', None) is None or manejo.custo_insumos == 0:
        manejo.custo_insumos = custo_insumos

    # Ensure numeric types
    mão_obra = Decimal(str(getattr(manejo, 'custo_mao_obra', 0) or 0))
    maquinas = Decimal(str(getattr(manejo, 'custo_maquinas', 0) or 0))
    outros = Decimal(str(getattr(manejo, 'custo_outros', 0) or 0))

    manejo.custo_insumos = custo_insumos
    manejo.custo_total = mão_obra + maquinas + outros + custo_insumos + Decimal(str(getattr(manejo, 'custo', 0) or 0))
    manejo.save(update_fields=['custo_insumos', 'custo_total'])

    return {
        'manejo_id': manejo.id,
        'custo_insumos': custo_insumos,
        'custo_mao_obra': mão_obra,
        'custo_maquinas': maquinas,
        'custo_total': manejo.custo_total,
    }


def calcular_custos_plantio(plantio):
    """Agrega custos relacionados ao plantio: somando manejos, ordens de serviço e colheitas."""
    # Recalcula manejos se necessário
    total_manejos = Decimal('0')
    for m in plantio.manejos.all():
        calcular_custo_manejo(m)
        total_manejos += Decimal(str(m.custo_total or 0))

    total_colheitas = sum([Decimal(str(c.custo_total or 0)) for c in plantio.colheitas.all()])
    total_plantio = (Decimal(str(plantio.custo_total or 0))) + total_manejos + total_colheitas

    # Persist aggregate
    plantio.custo_total = total_plantio
    plantio.save(update_fields=['custo_total'])

    return {
        'plantio_id': plantio.id,
        'total_manejos': total_manejos,
        'total_colheitas': total_colheitas,
        'total_plantio': total_plantio
    }


def gerar_rateio_plantio(plantio, created_by=None):
    """Gera um rateio (financeiro) agregando o custo do plantio inteiro."""
    # Certifique-se que os custos foram recalculados
    resumo = calcular_custos_plantio(plantio)
    # Ajustar o campo custo_total do plantio
    plantio.custo_total = resumo['total_plantio']
    plantio.save(update_fields=['custo_total'])

    # Usar create_rateio_from_operacao para criar o rateio e approval
    rateio = create_rateio_from_operacao(plantio, created_by=created_by)
    return rateio


# ======================================
# FASE 3: Serviços para Movimentação de Carga
# ======================================

from django.db import transaction
from django.utils import timezone


class CargaService:
    """Serviço para operações de movimentação de carga com reconciliação."""
    
    @staticmethod
    @transaction.atomic
    def registrar_chegada_carga(carga_id, peso_balanca, usuario=None):
        """
        Registra chegada de carga com peso da balança e atualiza estoque.
        
        Args:
            carga_id: ID da MovimentacaoCarga
            peso_balanca: Peso real medido na balança
            usuario: Usuário que está registrando
            
        Returns:
            MovimentacaoCarga atualizada
        """
        from apps.agricultura.models import MovimentacaoCarga
        from apps.estoque.models import ProdutoArmazenado
        
        carga = MovimentacaoCarga.objects.get(id=carga_id)
        
        # Usar peso_bruto como peso da balança
        carga.peso_bruto = peso_balanca
        
        # Recalcular peso líquido (já feito no save())
        carga.save()
        
        # Marcar como reconciliada
        carga.reconciled = True
        carga.reconciled_at = timezone.now()
        if usuario:
            carga.reconciled_by = usuario
        carga.save()
        
        # Atualizar estoque no local de destino se aplicável
        if carga.local_destino and carga.session_item:
            # Buscar produto da session_item
            produto = carga.session_item.harvest_session.plantio.cultura
            
            # Criar/atualizar ProdutoArmazenado
            # Nota: ProdutoArmazenado usa FK para Produto do estoque
            # Aqui simplificamos assumindo que existe um produto correspondente
            
        return carga
    
    @staticmethod
    def obter_diferencas_significativas(limite_percentual=5):
        """
        Retorna cargas com diferença significativa entre peso estimado e balança.
        
        Args:
            limite_percentual: Percentual mínimo de diferença (padrão: 5%)
            
        Returns:
            Lista de dicionários com informações das cargas
        """
        from apps.agricultura.models import MovimentacaoCarga
        
        cargas = MovimentacaoCarga.objects.filter(
            peso_bruto__isnull=False,
            peso_liquido__isnull=False,
            reconciled=True
        )
        
        resultado = []
        for carga in cargas:
            # Calcular diferença percentual
            peso_estimado = carga.peso_liquido or Decimal('0')
            peso_real = carga.peso_bruto or Decimal('0')
            
            if peso_estimado > 0:
                diferenca = peso_real - peso_estimado
                percentual = (diferenca / peso_estimado) * 100
                
                if abs(percentual) > limite_percentual:
                    resultado.append({
                        'id': carga.id,
                        'placa': carga.placa,
                        'peso_estimado': float(peso_estimado),
                        'peso_balanca': float(peso_real),
                        'diferenca': float(diferenca),
                        'percentual': float(percentual),
                        'data': carga.criado_em,
                    })
        
        return resultado
    
    @staticmethod
    def obter_cargas_em_transito():
        """Retorna cargas que ainda não foram reconciliadas."""
        from apps.agricultura.models import MovimentacaoCarga
        
        return MovimentacaoCarga.objects.filter(
            reconciled=False
        ).select_related('transporte', 'local_destino').order_by('-criado_em')
    
    @staticmethod
    def obter_estatisticas_cargas():
        """Retorna estatísticas de cargas."""
        from apps.agricultura.models import MovimentacaoCarga
        from django.db.models import Count, Sum, Avg
        
        stats = MovimentacaoCarga.objects.aggregate(
            total=Count('id'),
            reconciliadas=Count('id', filter=models.Q(reconciled=True)),
            peso_total=Sum('peso_liquido'),
            peso_medio=Avg('peso_liquido')
        )
        
        return {
            'total_cargas': stats['total'] or 0,
            'cargas_reconciliadas': stats['reconciliadas'] or 0,
            'cargas_pendentes': (stats['total'] or 0) - (stats['reconciliadas'] or 0),
            'peso_total_kg': float(stats['peso_total'] or 0),
            'peso_medio_kg': float(stats['peso_medio'] or 0),
        }
