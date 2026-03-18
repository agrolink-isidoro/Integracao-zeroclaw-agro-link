from rest_framework import serializers
from .models import (
    Cultura, Plantio, PlantioTalhao, Colheita, ColheitaItem, HarvestTransfer, ColheitaTransporte, Manejo, ManejoProduto, OrdemServico, 
    Insumo, DismissAlert, Operacao, OperacaoProduto
)
from apps.fazendas.models import Talhao


class CulturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cultura
        fields = '__all__'
        read_only_fields = ['tenant']


class TalhaoVariedadeSerializer(serializers.Serializer):
    """Serializer de escrita: {talhao: <id>, variedade: '<str>'}"""
    talhao = serializers.PrimaryKeyRelatedField(queryset=Talhao.objects.all())
    variedade = serializers.CharField(allow_blank=True, required=False, default='')


class PlantioSerializer(serializers.ModelSerializer):
    cultura_nome = serializers.CharField(source='cultura.nome', read_only=True)
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    talhoes = serializers.SerializerMethodField()  # read-only: list of IDs
    talhoes_info = serializers.SerializerMethodField()
    talhoes_variedades = TalhaoVariedadeSerializer(many=True, write_only=True, required=False)
    area_total_ha = serializers.ReadOnlyField()
    nome_safra = serializers.ReadOnlyField()

    class Meta:
        model = Plantio
        fields = [
            'id', 'fazenda', 'fazenda_nome', 'talhoes', 'talhoes_variedades', 'talhoes_info',
            'cultura', 'cultura_nome', 'data_plantio', 'area_total_ha',
            'quantidade_sementes', 'produto_semente', 'observacoes',
            'status', 'nome_safra', 'criado_por', 'criado_por_nome', 'criado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em']

    def get_talhoes(self, obj):
        """Retorna lista de IDs dos talhões (leitura — compatibilidade com frontend)."""
        return list(obj.talhoes.values_list('id', flat=True))

    def get_talhoes_info(self, obj):
        """Retorna informações detalhadas dos talhões incluindo variedade."""
        return [
            {
                'id': pt.talhao.id,
                'nome': pt.talhao.name,
                'area_hectares': float(pt.talhao.area_hectares or pt.talhao.area_size or 0),
                'variedade': pt.variedade or '',
            }
            for pt in obj.plantio_talhoes.select_related('talhao').all()
        ]

    def _save_talhoes_variedades(self, plantio, talhoes_variedades):
        """Delete existing PlantioTalhao rows and recreate from talhoes_variedades."""
        plantio.plantio_talhoes.all().delete()
        PlantioTalhao.objects.bulk_create([
            PlantioTalhao(
                plantio=plantio,
                talhao=item['talhao'],
                variedade=item.get('variedade') or None,
            )
            for item in talhoes_variedades
        ])

    def validate(self, attrs):
        talhoes_variedades = attrs.get('talhoes_variedades', [])
        if not talhoes_variedades:
            raise serializers.ValidationError({'talhoes_variedades': 'Selecione pelo menos um talhão.'})
        return attrs

    def create(self, validated_data):
        talhoes_variedades = validated_data.pop('talhoes_variedades', [])
        plantio = super().create(validated_data)
        self._save_talhoes_variedades(plantio, talhoes_variedades)
        return plantio

    def update(self, instance, validated_data):
        talhoes_variedades = validated_data.pop('talhoes_variedades', None)
        plantio = super().update(instance, validated_data)
        if talhoes_variedades is not None:
            self._save_talhoes_variedades(plantio, talhoes_variedades)
        return plantio


class ColheitaItemSerializer(serializers.ModelSerializer):
    talhao_name = serializers.CharField(source='talhao.name', read_only=True)
    operador_nome = serializers.CharField(source='operador.get_full_name', read_only=True)

    class Meta:
        model = ColheitaItem
        fields = '__all__'
        read_only_fields = ['colheita']


class HarvestTransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = HarvestTransfer
        fields = '__all__'


class ColheitaTransporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColheitaTransporte
        fields = ['id', 'placa', 'tara', 'peso_bruto', 'peso_liquido', 'custo_transporte', 'criado_em']
        read_only_fields = ['peso_liquido', 'criado_em']


class ColheitaSerializer(serializers.ModelSerializer):
    """Serializer para Colheita com integração estoque/comercial e itens/transfers"""
    plantio_cultura = serializers.CharField(source='plantio.cultura.nome', read_only=True)
    plantio_fazenda = serializers.CharField(source='plantio.fazenda.name', read_only=True)
    plantio_talhoes = serializers.SerializerMethodField()
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    # Campos de integração
    movimentacao_estoque_info = serializers.SerializerMethodField()
    carga_comercial_info = serializers.SerializerMethodField()
    pode_enviar_comercial = serializers.BooleanField(read_only=True)
    valor_total_estimado = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    # Itens por talhão (nested write/read)
    itens = ColheitaItemSerializer(many=True, required=False)
    # Transportes (nested write/read)
    transportes = ColheitaTransporteSerializer(many=True, required=False)

    class Meta:
        model = Colheita
        fields = [
            'id', 'plantio', 'plantio_cultura', 'plantio_talhoes', 'plantio_fazenda',
            'data_colheita', 'quantidade_colhida', 'unidade', 'qualidade', 'observacoes',
            'status', 'movimentacao_estoque', 'movimentacao_estoque_info',
            'carga_comercial', 'carga_comercial_info', 'pode_enviar_comercial',
            'valor_total_estimado',
            # custos
            'custo_mao_obra', 'custo_maquina', 'custo_combustivel', 'custo_insumos', 'custo_outros', 'custo_total', 'contabilizado',
            'itens',
            'transportes',
            'is_estimada',
            'criado_por', 'criado_por_nome', 'criado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'movimentacao_estoque_info', 'carga_comercial_info']

    def create(self, validated_data):
        transportes_data = validated_data.pop('transportes', [])
        itens_data = validated_data.pop('itens', [])
        colheita = super().create(validated_data)
        # Criar transportes ligados à colheita
        from .models import ColheitaTransporte, ColheitaItem
        for t in transportes_data:
            ColheitaTransporte.objects.create(colheita=colheita, **t)
        # Criar itens por talhão
        for i in itens_data:
            ColheitaItem.objects.create(colheita=colheita, **i)
        return colheita

    def update(self, instance, validated_data):
        transportes_data = validated_data.pop('transportes', None)
        itens_data = validated_data.pop('itens', None)
        colheita = super().update(instance, validated_data)
        from .models import ColheitaTransporte, ColheitaItem
        if transportes_data is not None:
            # Recriar lista simples: remover existentes e criar novos (MVP)
            ColheitaTransporte.objects.filter(colheita=colheita).delete()
            for t in transportes_data:
                ColheitaTransporte.objects.create(colheita=colheita, **t)
        if itens_data is not None:
            ColheitaItem.objects.filter(colheita=colheita).delete()
            for i in itens_data:
                ColheitaItem.objects.create(colheita=colheita, **i)
        return colheita

    def get_plantio_talhoes(self, obj):
        """Retorna lista de nomes dos talhões (acesso seguro se plantio ausente)."""
        from apps.core.utils import safe_get
        talhoes = safe_get(obj, 'plantio.talhoes')
        if not talhoes:
            return ''
        return ', '.join([getattr(t, 'name', '') for t in talhoes.all()])

    def get_movimentacao_estoque_info(self, obj):
        """Retorna informações da movimentação de estoque (acesso seguro)."""
        from apps.core.utils import safe_get
        mov = safe_get(obj, 'movimentacao_estoque')
        if not mov:
            return None
        return {
            'id': getattr(mov, 'id', None),
            'local_armazenamento': (getattr(mov, 'local_armazenamento', None).nome if getattr(mov, 'local_armazenamento', None) else None),
            'quantidade': getattr(mov, 'quantidade', None),
            'data_movimentacao': getattr(mov, 'data_movimentacao', None),
            'lote': (getattr(mov, 'lote', None).numero_lote if getattr(mov, 'lote', None) else None)
        }

    def get_carga_comercial_info(self, obj):
        """Retorna informações da carga comercial (acesso seguro)."""
        from apps.core.utils import safe_get
        carga = safe_get(obj, 'carga_comercial')
        if not carga:
            return None
        cliente = getattr(carga, 'cliente', None)
        return {
            'id': getattr(carga, 'id', None),
            'tipo_colheita': getattr(carga, 'tipo_colheita', None),
            'peso_total': getattr(carga, 'peso_total', None),
            'data_colheita': getattr(carga, 'data_colheita', None),
            'cliente': getattr(cliente, 'nome', None) if cliente else None
        }


class ManejoProdutoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ManejoProduto
        fields = '__all__'

    def create(self, validated_data):
        produto = validated_data.get('produto')
        if 'dosagem' not in validated_data and produto.dosagem_padrao:
            validated_data['dosagem'] = produto.dosagem_padrao
        if 'unidade_dosagem' not in validated_data and produto.unidade_dosagem:
            validated_data['unidade_dosagem'] = produto.unidade_dosagem
        return super().create(validated_data)


class ManejoSerializer(serializers.ModelSerializer):
    produtos_utilizados = ManejoProdutoSerializer(source='manejoproduto_set', many=True, read_only=True)
    plantio_cultura = serializers.CharField(source='plantio.cultura.nome', read_only=True)

    class Meta:
        model = Manejo
        fields = '__all__'


class OrdemServicoSerializer(serializers.ModelSerializer):
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)
    talhoes_info = serializers.SerializerMethodField()
    area_total_ha = serializers.ReadOnlyField()
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'fazenda', 'fazenda_nome', 'talhoes', 'talhoes_info', 
            'area_total_ha', 'tipo_manual', 'tarefa', 'maquina', 'insumos',
            'data_inicio', 'data_fim', 'status', 'aprovacao_ia', 'custo_total',
            'criado_por', 'criado_por_nome', 'criado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em']

    def get_talhoes_info(self, obj):
        """Retorna informações detalhadas dos talhões"""
        return [
            {
                'id': t.id,
                'nome': t.name,
                'area_hectares': float(t.area_hectares or t.area_size or 0)
            }
            for t in obj.talhoes.all()
        ]


class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = '__all__'


# ----------------
# Harvest session / load serializers
# ----------------
from .models import HarvestSession, HarvestSessionItem, MovimentacaoCarga


class HarvestSessionItemSerializer(serializers.ModelSerializer):
    talhao_name = serializers.CharField(source='talhao.name', read_only=True)

    class Meta:
        model = HarvestSessionItem
        fields = ['id', 'talhao', 'talhao_name', 'quantidade_colhida', 'status', 'started_at', 'finished_at']


class HarvestSessionSerializer(serializers.ModelSerializer):
    itens = HarvestSessionItemSerializer(many=True, required=False)
    plantio_nome = serializers.CharField(source='plantio.nome_safra', read_only=True)

    class Meta:
        model = HarvestSession
        fields = ['id', 'plantio', 'plantio_nome', 'data_inicio', 'data_prevista', 'status', 'equipamentos', 'equipe', 'observacoes', 'itens', 'criado_por', 'criado_em']
        read_only_fields = ['criado_por', 'criado_em']

    def validate(self, data):
        # Server-side checks: require at least one talhão and prevent duplicate active sessions
        itens = (self.initial_data or {}).get('itens') or []
        if not itens:
            raise serializers.ValidationError({'itens': 'Ao menos um talhão deve ser selecionado para iniciar a sessão.'})
        plantio = data.get('plantio')
        if plantio:
            qs = HarvestSession.objects.filter(plantio=plantio, status__in=['planejada', 'em_andamento'])
            if qs.exists():
                raise serializers.ValidationError({'plantio': 'Já existe uma sessão ativa para esta safra.'})
        return data

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        session = super().create(validated_data)
        HarvestSessionItem = __import__('apps.agricultura.models', fromlist=['HarvestSessionItem']).HarvestSessionItem
        for i in itens_data:
            HarvestSessionItem.objects.create(session=session, **i)
        return session

    def update(self, instance, validated_data):
        # handle nested itens: replace existing items with provided list
        itens_data = validated_data.pop('itens', None)
        session = super().update(instance, validated_data)
        if itens_data is not None:
            # remove items not present and recreate list (MVP)
            session.itens.all().delete()
            HarvestSessionItem = __import__('apps.agricultura.models', fromlist=['HarvestSessionItem']).HarvestSessionItem
            for i in itens_data:
                HarvestSessionItem.objects.create(session=session, **i)
        return session


class TransporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = __import__('apps.agricultura.models', fromlist=['Transporte']).Transporte
        fields = ['id', 'placa', 'motorista', 'tara', 'peso_bruto', 'peso_liquido', 'descontos', 'custo_transporte', 'custo_transporte_unidade', 'criado_em']
        read_only_fields = ['peso_liquido', 'criado_em']


class MovimentacaoCargaSerializer(serializers.ModelSerializer):
    transporte = TransporteSerializer(required=False, allow_null=True)
    talhao_name = serializers.CharField(source='talhao.name', read_only=True, allow_null=True, default='')
    empresa_destino_nome = serializers.CharField(source='empresa_destino.nome', read_only=True, allow_null=True, default='')
    local_destino_nome = serializers.CharField(source='local_destino.nome', read_only=True, allow_null=True, default='')

    class Meta:
        model = MovimentacaoCarga
        fields = '__all__'
        read_only_fields = ['peso_liquido', 'criado_em']

    def create(self, validated_data):
        transporte_data = validated_data.pop('transporte', None)
        request_user = self.context.get('request').user if self.context.get('request') else None
        # If transporte nested provided, create Transporte record
        if transporte_data:
            Transporte = __import__('apps.agricultura.models', fromlist=['Transporte']).Transporte
            transporte = Transporte.objects.create(**{**transporte_data, 'criado_por': request_user})
            validated_data['transporte'] = transporte
        session_item = validated_data.get('session_item')
        moviment = super().create(validated_data)
        # Ensure peso_liquido is computed (in case transporte was created just now)
        if transporte_data and moviment.transporte:
            moviment.peso_liquido = moviment.transporte.peso_liquido
            moviment.save()
        # Update session_item/status
        if session_item:
            session_item.status = 'carregado'
            # Acumula quantidade colhida transportada
            peso = moviment.peso_liquido or moviment.peso_bruto
            if peso:
                from decimal import Decimal
                session_item.quantidade_colhida = (session_item.quantidade_colhida or Decimal('0')) + Decimal(str(peso))
            session_item.save()
            # Não finalizar a sessão automaticamente — o usuário decide quando finalizar
        return moviment

    def update(self, instance, validated_data):
        transporte_data = validated_data.pop('transporte', None)
        request_user = self.context.get('request').user if self.context.get('request') else None
        if transporte_data is not None:
            Transporte = __import__('apps.agricultura.models', fromlist=['Transporte']).Transporte
            # if instance already has transporte, update it; otherwise create
            if instance.transporte:
                for k, v in transporte_data.items():
                    setattr(instance.transporte, k, v)
                instance.transporte.save()
            else:
                transporte = Transporte.objects.create(**{**transporte_data, 'criado_por': request_user})
                instance.transporte = transporte
                instance.save()
        # Handle reconciliation flag
        reconciled = validated_data.get('reconciled')
        if reconciled is True and not instance.reconciled:
            instance.reconciled = True
            from django.utils import timezone
            instance.reconciled_at = timezone.now()
            instance.reconciled_by = request_user
            instance.save()
        return super().update(instance, validated_data)


class DismissAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = DismissAlert
        fields = '__all__'


# ====================================================================
# SERIALIZERS PARA NOVO SISTEMA DE OPERAÇÕES UNIFICADO
# ====================================================================

class OperacaoProdutoSerializer(serializers.ModelSerializer):
    """Serializer para produtos utilizados na operação com dosagem"""
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    unidade = serializers.SerializerMethodField()
    
    class Meta:
        model = OperacaoProduto
        fields = [
            'id', 'produto', 'produto_nome', 'produto_codigo',
            'dosagem', 'unidade_dosagem', 'quantidade_total', 'unidade'
        ]
        read_only_fields = ['quantidade_total']
    
    def get_unidade(self, obj):
        """Extrai unidade sem '/ha' (ex: 'L/ha' → 'L')"""
        return obj.unidade_dosagem.split('/')[0] if '/' in obj.unidade_dosagem else obj.unidade_dosagem


class OperacaoSerializer(serializers.ModelSerializer):
    """Serializer completo para Operacao com nested produtos"""
    
    # Campos de display
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Relacionamentos
    plantio_info = serializers.SerializerMethodField()
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)
    talhoes_info = serializers.SerializerMethodField()
    
    # Equipamentos
    trator_info = serializers.SerializerMethodField()
    implemento_info = serializers.SerializerMethodField()
    
    # Produtos (nested write)
    produtos_operacao = OperacaoProdutoSerializer(many=True, read_only=True)
    produtos_input = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    
    # Operador
    operador_nome = serializers.CharField(source='operador.get_full_name', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    
    # Propriedades calculadas
    area_total_ha = serializers.ReadOnlyField()
    duracao_horas = serializers.ReadOnlyField()
    
    class Meta:
        model = Operacao
        fields = [
            'id', 'categoria', 'categoria_display', 'tipo', 'tipo_display',
            'plantio', 'plantio_info', 'fazenda', 'fazenda_nome',
            'talhoes', 'talhoes_info', 'area_total_ha',
            'data_operacao', 'data_inicio', 'data_fim', 'duracao_horas',
            'trator', 'trator_info', 'implemento', 'implemento_info',
            'produtos_operacao', 'produtos_input',
            'dados_especificos',
            'custo_mao_obra', 'custo_maquina', 'custo_insumos', 'custo_total',
            'operador', 'operador_nome', 'status', 'status_display',
            'observacoes', 'criado_por', 'criado_por_nome',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']
    
    def get_plantio_info(self, obj):
        """Informações da safra relacionada"""
        if obj.plantio:
            return {
                'id': obj.plantio.id,
                'cultura': obj.plantio.cultura.nome,
                'nome_safra': obj.plantio.nome_safra,
                'status': obj.plantio.status
            }
        return None
    
    def get_talhoes_info(self, obj):
        """Informações detalhadas dos talhões"""
        return [
            {
                'id': t.id,
                'nome': t.name,
                'area_nome': t.area.name if t.area else None,
                'area_hectares': float(t.area_hectares or t.area_size or 0)
            }
            for t in obj.talhoes.all()
        ]
    
    def get_trator_info(self, obj):
        """Informações do trator"""
        if obj.trator:
            return {
                'id': obj.trator.id,
                'nome': obj.trator.nome,
                'modelo': f"{obj.trator.marca} {obj.trator.modelo}"
            }
        return None
    
    def get_implemento_info(self, obj):
        """Informações do implemento"""
        if obj.implemento:
            return {
                'id': obj.implemento.id,
                'nome': obj.implemento.nome,
                'modelo': f"{obj.implemento.marca} {obj.implemento.modelo}"
            }
        return None
    
    def create(self, validated_data):
        """Criação com produtos nested"""
        produtos_input = validated_data.pop('produtos_input', [])
        talhoes = validated_data.pop('talhoes', [])
        
        # Criar operação
        operacao = Operacao.objects.create(**validated_data)
        
        # Adicionar talhões
        operacao.talhoes.set(talhoes)
        
        # Criar produtos
        from apps.estoque.models import Produto as EstoqueProduto
        for produto_data in produtos_input:
            prod_id = produto_data.get('produto_id') or produto_data.get('id')
            try:
                produto_obj = EstoqueProduto.objects.get(pk=prod_id)
            except EstoqueProduto.DoesNotExist:
                raise serializers.ValidationError({
                    'produtos_input': f'Produto com id {prod_id} não encontrado.'
                })

            # Resolver dosagem e unidade com fallback para dados do produto
            dosagem_val = produto_data.get('dosagem')
            unidade_val = produto_data.get('unidade_dosagem')

            if dosagem_val is None:
                dosagem_val = getattr(produto_obj, 'dosagem_padrao', None)

            if not unidade_val:
                unidade_val = getattr(produto_obj, 'unidade_dosagem', None) or (f"{produto_obj.unidade}/ha" if getattr(produto_obj, 'unidade', None) else None)

            if dosagem_val is None or not unidade_val:
                raise serializers.ValidationError({
                    'produtos_input': f'For product id {prod_id} the dosagem and unidade_dosagem are required (no defaults available).'
                })

            OperacaoProduto.objects.create(
                operacao=operacao,
                produto=produto_obj,
                dosagem=dosagem_val,
                unidade_dosagem=unidade_val
            )

        # Stock reservation is now handled automatically by OperacaoProduto post_save signal
        # (creates per-product reservations when status == 'planejada')
        # Log for traceability
        import logging
        logger = logging.getLogger(__name__)
        logger.info("Operacao %s criada com %d produtos_input. Reservas delegadas ao signal OperacaoProduto post_save.",
                     operacao.pk, len(produtos_input))

        return operacao
    
    def update(self, instance, validated_data):
        """Atualização com produtos nested"""
        produtos_input = validated_data.pop('produtos_input', None)
        talhoes = validated_data.pop('talhoes', None)
        
# Track previous status before changes
        previous_status = instance.status

        # Atualizar campos da operação
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar talhões se fornecido
        if talhoes is not None:
            instance.talhoes.set(talhoes)
        
        # Atualizar produtos se fornecido
        if produtos_input is not None:
            # Remover produtos antigos
            instance.produtos_operacao.all().delete()
            # Criar novos
            from apps.estoque.models import Produto as EstoqueProduto
            for produto_data in produtos_input:
                prod_id = produto_data.get('produto_id') or produto_data.get('id')
                try:
                    produto_obj = EstoqueProduto.objects.get(pk=prod_id)
                except EstoqueProduto.DoesNotExist:
                    raise serializers.ValidationError({
                        'produtos_input': f'Produto com id {prod_id} não encontrado.'
                    })

                dosagem_val = produto_data.get('dosagem')
                unidade_val = produto_data.get('unidade_dosagem')

                if dosagem_val is None:
                    dosagem_val = getattr(produto_obj, 'dosagem_padrao', None)

                if not unidade_val:
                    unidade_val = getattr(produto_obj, 'unidade_dosagem', None) or (f"{produto_obj.unidade}/ha" if getattr(produto_obj, 'unidade', None) else None)

                if dosagem_val is None or not unidade_val:
                    raise serializers.ValidationError({
                        'produtos_input': f'For product id {prod_id} the dosagem and unidade_dosagem are required (no defaults available).'
                    })

                OperacaoProduto.objects.create(
                    operacao=instance,
                    produto=produto_obj,
                    dosagem=dosagem_val,
                    unidade_dosagem=unidade_val
                )
        
        # If status changed to concluida, commit reservations; if canceled, release reservations
        try:
            new_status = validated_data.get('status')
            if new_status and new_status != previous_status:
                from apps.estoque.services import commit_reservations_for_operacao, release_reservations_for_operacao
                if new_status == 'concluida':
                    commit_reservations_for_operacao(instance, criado_por=instance.criado_por or None)
                elif new_status == 'cancelada':
                    release_reservations_for_operacao(instance, criado_por=instance.criado_por or None)
        except Exception as e:
            raise serializers.ValidationError({'status': str(e)})

        return instance


class OperacaoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de operações"""
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cultura_nome = serializers.SerializerMethodField()
    area_total_ha = serializers.ReadOnlyField()
    
    class Meta:
        model = Operacao
        fields = [
            'id', 'categoria', 'categoria_display', 'tipo', 'tipo_display',
            'data_operacao', 'cultura_nome', 'area_total_ha',
            'custo_total',
            'status', 'status_display', 'criado_em'
        ]
    
    def get_cultura_nome(self, obj):
        return obj.plantio.cultura.nome if obj.plantio else None