import logging
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from apps.fiscal.models import NFe
from .models import (
    CategoriaEquipamento, 
    Equipamento, 
    Abastecimento, 
    OrdemServico, 
    ManutencaoPreventiva, 
    ConfiguracaoAlerta
)

logger = logging.getLogger(__name__)


# ====================================================================
# SERIALIZERS PARA CATEGORIZAÇÃO FLEXÍVEL
# ====================================================================

class CategoriaEquipamentoSerializer(serializers.ModelSerializer):
    """
    Serializer para categorias de equipamentos.
    Usado em listagens e criação de novas categorias.
    """
    
    tipo_mobilidade_display = serializers.CharField(
        source='get_tipo_mobilidade_display', 
        read_only=True
    )
    categoria_pai_nome = serializers.CharField(
        source='categoria_pai.nome', 
        read_only=True
    )
    total_equipamentos = serializers.IntegerField(
        source='equipamentos.count', 
        read_only=True
    )
    
    class Meta:
        model = CategoriaEquipamento
        fields = [
            'id', 'nome', 'descricao', 'tipo_mobilidade', 'tipo_mobilidade_display',
            'categoria_pai', 'categoria_pai_nome',
            'requer_horimetro', 'requer_potencia', 'requer_localizacao', 'requer_acoplamento',
            'ativo', 'ordem_exibicao', 'total_equipamentos',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']


class EquipamentoSerializer(serializers.ModelSerializer):
    """
    Serializer para Equipamento com CATEGORIZAÇÃO FLEXÍVEL.
    Agora usa categoria FK em vez de choices hardcoded.
    """

    # Campos relacionados
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    categoria_tipo_mobilidade = serializers.CharField(source='categoria.tipo_mobilidade', read_only=True)
    maquina_principal_nome = serializers.CharField(source='maquina_principal.nome', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Campos calculados
    idade_equipamento = serializers.ReadOnlyField()
    depreciacao_estimada = serializers.ReadOnlyField()
    tipo_mobilidade = serializers.ReadOnlyField()
    e_autopropelido = serializers.ReadOnlyField()
    e_estacionario = serializers.ReadOnlyField()
    e_implemento = serializers.ReadOnlyField()

    class Meta:
        model = Equipamento
        fields = [
            'id', 'categoria', 'categoria_nome', 'categoria_tipo_mobilidade',
            'nome', 'marca', 'modelo', 'numero_serie',
            'ano_fabricacao', 'data_aquisicao', 'valor_aquisicao',
            'status', 'status_display', 'observacoes',
            
            # Autopropelidos
            'horimetro_atual', 'capacidade_tanque', 'consumo_medio', 'gps_tracking',
            
            # Potência
            'potencia_cv', 'potencia_kw',
            
            # Estacionários
            'local_instalacao', 'coordenadas',
            'tensao_volts', 'frequencia_hz', 'fases',
            
            # Implementos
            'maquina_principal', 'maquina_principal_nome',
            'largura_trabalho', 'profundidade_trabalho', 'capacidade',
            
            # Veículos
            'placa', 'quilometragem_atual', 'capacidade_carga',
            
            # Características flexíveis
            'caracteristicas_especificas',
            
            # Campos calculados
            'idade_equipamento', 'depreciacao_estimada',
            'tipo_mobilidade', 'e_autopropelido', 'e_estacionario', 'e_implemento',
            
            # Metadata
            'criado_em', 'atualizado_em', 'criado_por'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 
            'idade_equipamento', 'depreciacao_estimada',
            'tipo_mobilidade', 'e_autopropelido', 'e_estacionario', 'e_implemento', 'tenant'
        ]

    def validate(self, data):
        """
        Validações dinâmicas baseadas na categoria do equipamento.
        As regras vêm da CategoriaEquipamento, não são mais hardcoded.
        """
        categoria = data.get('categoria')
        
        # Se não tem categoria, pula validações (permite criar equipamento simples)
        if not categoria:
            return data
        
        # ====================================================================
        # VALIDAÇÕES DINÂMICAS BASEADAS NAS FLAGS DA CATEGORIA
        # ====================================================================
        
        # Validação: horímetro obrigatório
        if categoria.requer_horimetro and not data.get('horimetro_atual'):
            raise serializers.ValidationError({
                'horimetro_atual': f'Horímetro é obrigatório para categoria "{categoria.nome}"'
            })
        
        # Validação: potência obrigatória
        if categoria.requer_potencia:
            if not data.get('potencia_cv') and not data.get('potencia_kw'):
                raise serializers.ValidationError({
                    'potencia_cv': f'Potência (CV ou kW) é obrigatória para categoria "{categoria.nome}"'
                })
        
        # Validação: localização obrigatória (equipamentos estacionários)
        if categoria.requer_localizacao and not data.get('local_instalacao'):
            raise serializers.ValidationError({
                'local_instalacao': f'Local de instalação é obrigatório para categoria "{categoria.nome}"'
            })
        
        # NOTA: maquina_principal NÃO é validado aqui!
        # Implementos são acoplados durante OPERAÇÕES, não no cadastro do equipamento.
        # A flag requer_acoplamento apenas indica que é um implemento rebocado.
        
        return data


class EquipamentoListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagens.
    Menos campos para melhor performance.
    """
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    categoria_detail = CategoriaEquipamentoSerializer(source='categoria', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tipo_mobilidade = serializers.ReadOnlyField()
    
    class Meta:
        model = Equipamento
        fields = [
            'id', 'categoria', 'categoria_nome', 'categoria_detail', 'tipo_mobilidade',
            'nome', 'marca', 'modelo', 'numero_serie', 'ano_fabricacao',
            'status', 'status_display',
            'horimetro_atual', 'local_instalacao', 'potencia_cv',
            'largura_trabalho',
            'valor_aquisicao', 'data_aquisicao', 'observacoes'
        ]


class EquipamentoGeoSerializer(GeoFeatureModelSerializer):
    """
    Serializer GeoJSON para equipamentos estacionários com localização.
    Usado em mapas para mostrar pivot, bombas, geradores, etc.
    """
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    tipo_mobilidade = serializers.ReadOnlyField()
    
    class Meta:
        model = Equipamento
        geo_field = 'coordenadas'
        fields = [
            'id', 'categoria', 'categoria_nome', 'tipo_mobilidade',
            'nome', 'marca', 'modelo', 'status',
            'local_instalacao', 'caracteristicas_especificas'
        ]


# ====================================================================
# SERIALIZERS EXISTENTES (mantidos)
# ====================================================================


class AbastecimentoSerializer(serializers.ModelSerializer):
    """
    Serializer para abastecimentos.
    """

    equipamento_detail = serializers.SerializerMethodField(read_only=True)
    produto_estoque_detail = serializers.SerializerMethodField(read_only=True)

    def get_equipamento_detail(self, obj):
        return {'id': obj.equipamento.id, 'nome': obj.equipamento.nome} if obj.equipamento else None

    def get_produto_estoque_detail(self, obj):
        if obj.produto_estoque:
            return {'id': obj.produto_estoque.id, 'codigo': obj.produto_estoque.codigo, 'nome': obj.produto_estoque.nome}
        return None

    class Meta:
        model = Abastecimento
        fields = '__all__'
        read_only_fields = ['criado_em', 'atualizado_em', 'valor_total']

    def validate(self, data):
        # validações básicas
        if data.get('quantidade_litros') is not None and data.get('quantidade_litros') <= 0:
            raise serializers.ValidationError({'quantidade_litros': 'Quantidade deve ser maior que zero.'})
        if data.get('valor_unitario') is not None and data.get('valor_unitario') < 0:
            raise serializers.ValidationError({'valor_unitario': 'Valor unitário inválido.'})
        return data

    def create(self, validated_data):
        from django.db import transaction
        # Calcula valor total automaticamente
        quantidade = validated_data.get('quantidade_litros', 0)
        valor_unitario = validated_data.get('valor_unitario', 0)
        validated_data['valor_total'] = quantidade * valor_unitario
        # Wrap in atomic so if the post_save signal for stock movement fails,
        # the abastecimento record is rolled back
        with transaction.atomic():
            return super().create(validated_data)


class OrdemServicoSerializer(serializers.ModelSerializer):
    """
    Serializer para ordens de serviço.
    Suporta validação básica do campo `insumos` (lista de objetos com produto_id/codigo/nome e quantidade).
    """

    equipamento_nome = serializers.CharField(source='equipamento.nome', read_only=True)
    responsavel_abertura_nome = serializers.CharField(source='responsavel_abertura.get_full_name', read_only=True)
    responsavel_execucao_nome = serializers.CharField(source='responsavel_execucao.get_full_name', read_only=True)

    # expose insumos as-is but validate format
    insumos = serializers.ListField(child=serializers.DictField(), required=False)

    # Vincular NFes (lista de ids). O frontend listará apenas NFes baixadas/entrada e permitirá
    # selecionar itens para auto-preencher `insumos` antes de submeter.
    nfes = serializers.PrimaryKeyRelatedField(queryset=NFe.objects.all(), many=True, required=False)
    nfes_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrdemServico
        fields = '__all__'
        read_only_fields = ['criado_em', 'atualizado_em', 'numero_os', 'custo_total', 'data_abertura']  # data_abertura é gerada automaticamente

    def validate_insumos(self, value):
        """Valida o formato dos insumos e garante que produtos referenciados existam."""
        from apps.estoque.models import Produto
        errors = []
        clean_list = []

        for idx, item in enumerate(value):
            if not isinstance(item, dict):
                errors.append({idx: 'item deve ser um objeto com pelo menos `produto_id`/`codigo` e `quantidade`'})
                continue

            quantidade = item.get('quantidade')
            if quantidade is None:
                errors.append({idx: 'campo `quantidade` é obrigatório'})
                continue

            try:
                from decimal import Decimal
                quantidade = Decimal(str(quantidade))
            except Exception:
                errors.append({idx: 'quantidade deve ser numérico'})
                continue

            if quantidade <= 0:
                errors.append({idx: 'quantidade deve ser maior que zero'})
                continue

            produto = None
            if item.get('produto_id'):
                produto = Produto.objects.filter(pk=item.get('produto_id')).first()
            elif item.get('codigo'):
                produto = Produto.objects.filter(codigo=item.get('codigo')).first()
            else:
                nome = item.get('nome') or item.get('produto_nome')
                if nome:
                    produto = Produto.objects.filter(nome__icontains=nome).first()

            if not produto:
                errors.append({idx: 'produto não encontrado (forneça produto_id ou codigo válido)'});
                continue

            # Store quantities as strings to ensure JSON serializable (avoid Decimal in JSONField)
            # Ensure valor_unitario reflects produto.custo_unitario at time of creation
            # Store valor_unitario as a numeric type (float) so services can convert to Decimal reliably
            if item.get('valor_unitario') is not None:
                try:
                    valor_unitario_val = float(item.get('valor_unitario'))
                except Exception:
                    valor_unitario_val = None
            else:
                valor_unitario_val = float(produto.custo_unitario) if getattr(produto, 'custo_unitario', None) is not None else None

            clean_list.append({'produto_id': produto.pk, 'quantidade': str(quantidade), 'valor_unitario': valor_unitario_val})

        if errors:
            raise serializers.ValidationError({'insumos': errors})

        return clean_list

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # evitar import circular — atribuir queryset dinamicamente
        try:
            from apps.fiscal.models import NFe
            self.fields['nfes'].queryset = NFe.objects.all()
        except Exception:
            self.fields['nfes'].queryset = []

    def validate(self, data):
        # Valida NFes vinculadas: apenas NFes de entrada confirmadas em estoque são permitidas
        nfes = data.get('nfes')
        if nfes:
            invalid = [n.id for n in nfes if not getattr(n, 'estoque_confirmado', False) or getattr(n, 'tipo_operacao', None) != '0']
            if invalid:
                raise serializers.ValidationError({'nfes': f'As NFes indicadas devem ser de entrada e já confirmadas em estoque (ids inválidos: {invalid})'})
        return data

    def get_nfes_detail(self, obj):
        if not getattr(obj, 'nfes', None):
            return []
        return [
            {
                'id': n.id,
                'numero': n.numero,
                'serie': n.serie,
                'chave_acesso': n.chave_acesso,
                'data_emissao': n.data_emissao,
                'estoque_confirmado': n.estoque_confirmado,
                'emitente_nome': n.emitente_nome
            }
            for n in obj.nfes.all()
        ]

    def create(self, validated_data):
        # extrair nfes antes de criar (m2m deve ser ajustado após save)
        nfes = validated_data.pop('nfes', None)
        insumos = validated_data.get('insumos')

        # Cria a OS primeiro para que tenhamos um PK (mas ainda não reservamos insumos aqui).
        obj = super().create(validated_data)

        # Vincula NFes M2M
        if nfes:
            obj.nfes.set(nfes)

        # Tentar reservar insumos imediatamente — o signal ordem_post_save pode já ter reservado,
        # então verificamos o flag insumos_reservados para evitar duplicidade.
        # Refresh from DB to pick up any flag changes made by the post_save signal
        obj.refresh_from_db(fields=['insumos_reservados'])
        if insumos and not obj.insumos_reservados:
            from django.core.exceptions import ValidationError as DjangoValidationError
            from apps.estoque.services import create_movimentacao

            try:
                for ins in insumos:
                    quantidade = ins.get('quantidade') or ins.get('qtd') or ins.get('quantidade_total')
                    if quantidade is None:
                        raise serializers.ValidationError({'insumos': 'Cada insumo deve informar `quantidade`.'})

                    produto = None
                    if ins.get('produto_id'):
                        from apps.estoque.models import Produto
                        produto = Produto.objects.filter(pk=ins.get('produto_id')).first()
                    elif ins.get('codigo'):
                        from apps.estoque.models import Produto
                        produto = Produto.objects.filter(codigo=ins.get('codigo')).first()

                    if not produto:
                        raise serializers.ValidationError({'insumos': 'Produto referenciado não encontrado.'})

                    # create_movimentacao é atômico por si só; se falhar, a exceção será lançada
                    create_movimentacao(
                        produto=produto,
                        tipo='reserva',
                        quantidade=ins.get('quantidade'),
                        valor_unitario=ins.get('valor_unitario') or produto.custo_unitario,
                        criado_por=getattr(obj, 'criado_por', None) or getattr(obj, 'responsavel_abertura', None),
                        origem='ordem_servico',
                        documento_referencia=f'OS #{obj.pk}',
                        motivo=f'Reserva para OrdemServico #{obj.pk}',
                        ordem_servico=obj,
                    )

                # Se tudo OK, marca insumos como reservados
                obj.insumos_reservados = True
                obj.save(update_fields=['insumos_reservados'])

            except DjangoValidationError as e:
                # Reverter criação da OS e propagar erro de validação para o cliente (HTTP 400)
                logger.warning("Validação ao reservar insumos para OS %s: %s", getattr(obj, 'pk', None), e)
                try:
                    obj.delete()
                except Exception:
                    logger.exception("Falha ao remover OS parcialmente criada %s", getattr(obj, 'pk', None))
                raise serializers.ValidationError({'insumos': str(e)})

            except Exception as e:
                # Log completo para investigação e garantir remoção segura do objeto criado
                logger.exception("Falha inesperada ao reservar insumos para OS %s", getattr(obj, 'pk', None))
                try:
                    obj.delete()
                except Exception:
                    logger.exception("Falha ao remover OS parcialmente criada %s", getattr(obj, 'pk', None))
                raise serializers.ValidationError({'detail': 'Falha ao reservar insumos: %s' % str(e)})

        # custo_pecas/custo_total são calculados por signals/serviços — manter comportamento atual
        return obj

    def update(self, instance, validated_data):
        nfes = validated_data.pop('nfes', None)
        insumos = validated_data.pop('insumos', None)
        instance = super().update(instance, validated_data)
        if nfes is not None:
            instance.nfes.set(nfes)
        if insumos is not None:
            instance.insumos = insumos
            instance.save(update_fields=['insumos'])
        return instance


class ManutencaoPreventivaSerializer(serializers.ModelSerializer):
    """
    Serializer para manutenções preventivas.
    """

    equipamento_nome = serializers.CharField(source='equipamento.nome', read_only=True)
    necessita_manutencao = serializers.ReadOnlyField()
    alerta_manutencao = serializers.ReadOnlyField()

    class Meta:
        model = ManutencaoPreventiva
        fields = '__all__'


class ConfiguracaoAlertaSerializer(serializers.ModelSerializer):
    """
    Serializer para configurações de alertas.
    """

    equipamento_nome = serializers.CharField(source='equipamento.nome', read_only=True)

    class Meta:
        model = ConfiguracaoAlerta
        fields = '__all__'


# Serializers para estatísticas e dashboards
class EquipamentoDashboardSerializer(serializers.Serializer):
    """
    Serializer para dados do dashboard de equipamentos.
    """
    total_equipamentos = serializers.IntegerField()
    equipamentos_ativos = serializers.IntegerField()
    equipamentos_manutencao = serializers.IntegerField()
    custo_total_equipamentos = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciacao_total = serializers.DecimalField(max_digits=15, decimal_places=2)


class AbastecimentoDashboardSerializer(serializers.Serializer):
    """
    Serializer para dados do dashboard de abastecimentos.
    """
    total_abastecimentos_mes = serializers.IntegerField()
    custo_total_abastecimentos_mes = serializers.DecimalField(max_digits=12, decimal_places=2)
    consumo_medio_litros_dia = serializers.DecimalField(max_digits=8, decimal_places=2)