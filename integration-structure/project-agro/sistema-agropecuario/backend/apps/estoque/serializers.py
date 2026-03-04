from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import Produto, Lote, MovimentacaoEstoque, LocalArmazenamento, ProdutoAuditoria, MovimentacaoStatement
from .utils import ProdutoNFeValidator


class LocalArmazenamentoSerializer(serializers.ModelSerializer):
    """Serializer para LocalArmazenamento"""
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True, default=None)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True, default=None)
    capacidade_atual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    capacidade_disponivel = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = LocalArmazenamento
        fields = [
            'id', 'nome', 'tipo', 'tipo_local',
            'capacidade_maxima', 'unidade_capacidade',
            'fazenda', 'fazenda_nome',
            'fornecedor', 'fornecedor_nome',
            'ativo', 'capacidade_atual', 'capacidade_disponivel',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'capacidade_atual', 'capacidade_disponivel']

    def validate(self, data):
        tipo_local = data.get('tipo_local', getattr(self.instance, 'tipo_local', 'interno'))
        fazenda = data.get('fazenda', getattr(self.instance, 'fazenda', None))
        fornecedor = data.get('fornecedor', getattr(self.instance, 'fornecedor', None))

        if tipo_local == 'interno' and not fazenda:
            raise serializers.ValidationError({'fazenda': 'Fazenda é obrigatória para locais internos.'})
        if tipo_local == 'externo' and not fornecedor:
            raise serializers.ValidationError({'fornecedor': 'Fornecedor é obrigatório para locais externos.'})

        # Clear opposite FK
        if tipo_local == 'interno':
            data['fornecedor'] = None
        elif tipo_local == 'externo':
            data['fazenda'] = None

        return data


class LoteSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    # Accept an optional ID for local storage; write-only input.
    local_armazenamento_id = serializers.IntegerField(write_only=True, required=False)
    # Provide a read-only id if the stored local name matches an existing LocalArmazenamento
    local_armazenamento_id_read = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Lote
        fields = [
            'id', 'produto', 'produto_nome', 'numero_lote', 'data_fabricacao', 'data_validade',
            'quantidade_inicial', 'quantidade_atual', 'local_armazenamento', 'local_armazenamento_id', 'local_armazenamento_id_read', 'observacoes',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']

    def get_local_armazenamento_id_read(self, obj):
        # Try to find a LocalArmazenamento matching the stored name
        try:
            local = LocalArmazenamento.objects.get(nome=obj.local_armazenamento)
            return local.id
        except LocalArmazenamento.DoesNotExist:
            return None

    def create(self, validated_data):
        # Handle optional local_armazenamento_id mapping to name for backward compatibility
        local_id = validated_data.pop('local_armazenamento_id', None)
        if local_id is not None:
            try:
                local = LocalArmazenamento.objects.get(pk=local_id)
                validated_data['local_armazenamento'] = local.nome
            except LocalArmazenamento.DoesNotExist:
                raise serializers.ValidationError({
                    'local_armazenamento_id': f'LocalArmazenamento with id {local_id} does not exist.'
                })
        return super().create(validated_data)

    def update(self, instance, validated_data):
        local_id = validated_data.pop('local_armazenamento_id', None)
        if local_id is not None:
            try:
                local = LocalArmazenamento.objects.get(pk=local_id)
                validated_data['local_armazenamento'] = local.nome
            except LocalArmazenamento.DoesNotExist:
                raise serializers.ValidationError({
                    'local_armazenamento_id': f'LocalArmazenamento with id {local_id} does not exist.'
                })
        return super().update(instance, validated_data)


class ProdutoSerializer(serializers.ModelSerializer):
    lotes = LoteSerializer(many=True, read_only=True)
    saldo_atual = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    alerta_baixo = serializers.BooleanField(read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True, allow_null=True)
    local_armazenamento_nome = serializers.CharField(source='local_armazenamento.nome', read_only=True, allow_null=True)

    class Meta:
        model = Produto
        fields = [
            'id', 'codigo', 'nome', 'descricao', 'quantidade_estoque', 'unidade',
            'vencimento', 'custo_unitario', 'preco_venda', 'estoque_minimo',
            'categoria', 'fornecedor', 'fornecedor_nome', 'local_armazenamento', 'local_armazenamento_nome',
            # Campos agronômicos importantes para validações e edições
            'principio_ativo', 'composicao_quimica',
            'dosagem_padrao', 'unidade_dosagem', 'ativo',
            'saldo_atual', 'alerta_baixo', 'lotes',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'saldo_atual', 'alerta_baixo']

    def validate(self, data):
        """Validações gerais do produto"""
        # Validação de código único (exceto para atualização)
        if self.instance is None:  # Criação
            codigo = data.get('codigo')
            if codigo and Produto.objects.filter(codigo=codigo).exists():
                raise serializers.ValidationError({
                    'codigo': f'Já existe um produto com o código "{codigo}".'
                })

        # Validação de valores positivos
        if 'custo_unitario' in data and data['custo_unitario'] is not None and data['custo_unitario'] <= 0:
            raise serializers.ValidationError({
                'custo_unitario': 'Custo unitário deve ser maior que zero.'
            })

        if 'preco_venda' in data and data['preco_venda'] is not None and data['preco_venda'] <= 0:
            raise serializers.ValidationError({
                'preco_venda': 'Preço de venda deve ser maior que zero.'
            })

        if 'estoque_minimo' in data and data['estoque_minimo'] is not None and data['estoque_minimo'] < 0:
            raise serializers.ValidationError({
                'estoque_minimo': 'Estoque mínimo não pode ser negativo.'
            })

        # Validação de categoria
        categoria = data.get('categoria')
        if categoria and categoria not in dict(Produto.CATEGORIA_CHOICES):
            raise serializers.ValidationError({
                'categoria': f'Categoria "{categoria}" não é válida.'
            })

        # Validações específicas por categoria
        self._validar_regras_categoria(data)

        # Validação de dosagem (considerando updates parciais / valores existentes)
        dosagem_val = data.get('dosagem_padrao', getattr(self.instance, 'dosagem_padrao', None))
        if dosagem_val is not None:
            if dosagem_val <= 0:
                raise serializers.ValidationError({
                    'dosagem_padrao': 'Dosagem padrão deve ser maior que zero.'
                })
            unidade_dos = data.get('unidade_dosagem', getattr(self.instance, 'unidade_dosagem', None))
            if not unidade_dos:
                raise serializers.ValidationError({
                    'unidade_dosagem': 'Unidade de dosagem é obrigatória quando dosagem padrão é informada.'
                })

        return data

    def _validar_regras_categoria(self, data):
        """Valida regras específicas por categoria, respeitando valores já existentes em updates parciais"""
        # Em atualizações parciais (PATCH), os campos podem não estar em `data` —
        # então consultamos `self.instance` quando necessário.
        categoria = data.get('categoria', getattr(self.instance, 'categoria', None))
        if not categoria:
            return

        rules = ProdutoNFeValidator.VALIDATION_RULES.get(categoria, {})

        # Validação de unidade permitida (considera valor enviado ou existente)
        unidade = data.get('unidade', getattr(self.instance, 'unidade', None))
        if unidade and 'unidades_permitidas' in rules:
            if unidade not in rules['unidades_permitidas']:
                raise serializers.ValidationError({
                    'unidade': f'Unidade "{unidade}" não é permitida para categoria "{categoria}". '
                              f'Unidades permitidas: {", ".join(rules["unidades_permitidas"])}'
                })

        # Validação de princípio ativo obrigatório (considera valor enviado ou existente)
        if rules.get('requer_principio_ativo', False):
            principio_ativo = data.get('principio_ativo', getattr(self.instance, 'principio_ativo', None))
            if not principio_ativo:
                raise serializers.ValidationError({
                    'principio_ativo': f'Princípio ativo é obrigatório para produtos da categoria "{categoria}".'
                })

        # Validação de vencimento obrigatório
        # Em criação (instance is None) exige vencimento; em PATCH só valida se campo foi enviado explicitamente
        if rules.get('requer_vencimento', False):
            if self.instance is None:
                vencimento = data.get('vencimento')
                if not vencimento:
                    raise serializers.ValidationError({
                        'vencimento': f'Data de vencimento é obrigatória para produtos da categoria "{categoria}".'
                    })
            else:
                # Em atualização parcial, só validar se o campo foi enviado
                if 'vencimento' in data:
                    if not data.get('vencimento'):
                        raise serializers.ValidationError({
                            'vencimento': f'Data de vencimento é obrigatória para produtos da categoria "{categoria}".'
                        })

    def create(self, validated_data):
        """Criação com validações adicionais"""
        # Tentar mapear categoria por NCM se disponível (simulando dados de NFE)
        if not validated_data.get('categoria'):
            # Se não há categoria, tentar extrair de campos adicionais ou padrões
            nome = validated_data.get('nome', '').lower()
            if any(term in nome for term in ['semente', 'sementes']):
                validated_data['categoria'] = 'semente'
            elif any(term in nome for term in ['fertilizante', 'adubo']):
                validated_data['categoria'] = 'fertilizante'
            elif any(term in nome for term in ['herbicida', 'mata-erva']):
                validated_data['categoria'] = 'herbicida'
            elif any(term in nome for term in ['fungicida']):
                validated_data['categoria'] = 'fungicida'
            elif any(term in nome for term in ['inseticida']):
                validated_data['categoria'] = 'inseticida'

        return super().create(validated_data)


class ProdutoAuditoriaSerializer(serializers.ModelSerializer):
    """Serializer para auditoria de produtos"""
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = ProdutoAuditoria
        fields = [
            'id', 'produto', 'produto_nome', 'acao', 'origem',
            'nfe_numero', 'nfe_serie', 'nfe_chave_acesso',
            'fornecedor_nome', 'fornecedor_cnpj',
            'produto_codigo', 'produto_nome', 'produto_categoria', 'produto_unidade',
            'quantidade', 'valor_unitario', 'documento_referencia',
            'validacoes_realizadas', 'alertas', 'observacoes',
            'criado_por', 'criado_por_nome', 'criado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em']


class MovimentacaoStatementSerializer(serializers.ModelSerializer):
    """Serializer para declarações de movimentação (audit statements)"""
    produto_nome = serializers.SerializerMethodField(read_only=True)
    lote_numero = serializers.SerializerMethodField(read_only=True)
    fazenda_nome = serializers.SerializerMethodField(read_only=True)
    talhao_nome = serializers.SerializerMethodField(read_only=True)
    local_armazenamento_nome = serializers.SerializerMethodField(read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)
    origem = serializers.SerializerMethodField(read_only=True)
    origem_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MovimentacaoStatement
        fields = [
            'id', 'movimentacao', 'produto', 'produto_nome', 'tipo', 'quantidade', 'unidade',
            'valor_unitario', 'valor_total', 'data_movimentacao', 'documento_referencia',
            'motivo', 'observacoes', 'lote', 'lote_numero', 'fazenda', 'fazenda_nome', 'talhao', 'talhao_nome',
            'local_armazenamento', 'local_armazenamento_nome', 'saldo_resultante', 'metadata',
            'origem', 'origem_display',
            'criado_em', 'criado_por', 'criado_por_nome'
        ]
        read_only_fields = ['movimentacao', 'produto', 'valor_total', 'saldo_resultante', 'criado_em', 'criado_por']

    def get_produto_nome(self, obj):
        return obj.produto.nome if getattr(obj, 'produto', None) else None

    def get_lote_numero(self, obj):
        return obj.lote.numero_lote if getattr(obj, 'lote', None) else None

    def get_fazenda_nome(self, obj):
        return obj.fazenda.name if getattr(obj, 'fazenda', None) else None

    def get_talhao_nome(self, obj):
        return obj.talhao.name if getattr(obj, 'talhao', None) else None

    def get_local_armazenamento_nome(self, obj):
        return obj.local_armazenamento.nome if getattr(obj, 'local_armazenamento', None) else None

    def get_criado_por_nome(self, obj):
        if hasattr(obj, 'criado_por') and obj.criado_por:
            try:
                full_name = obj.criado_por.get_full_name()
                return full_name or obj.criado_por.username
            except AttributeError:
                return obj.criado_por.username
        return None

    def get_origem(self, obj):
        """Resolve a origem a partir da movimentação vinculada ou do metadata."""
        # 1) Tenta ler da movimentação vinculada
        if getattr(obj, 'movimentacao', None) and getattr(obj.movimentacao, 'origem', None):
            return obj.movimentacao.origem
        # 2) Fallback: metadata.origem
        if obj.metadata and isinstance(obj.metadata, dict):
            return obj.metadata.get('origem')
        return None

    def get_origem_display(self, obj):
        """Resolve o label legível da origem."""
        origem = self.get_origem(obj)
        if not origem:
            return None
        origem_map = dict(MovimentacaoEstoque.ORIGEM_CHOICES)
        return origem_map.get(origem, origem)


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    """Serializer para MovimentacaoEstoque com validações"""
    produto_nome = serializers.SerializerMethodField(read_only=True)
    lote_numero = serializers.SerializerMethodField(read_only=True)
    fazenda_nome = serializers.SerializerMethodField(read_only=True)
    talhao_nome = serializers.SerializerMethodField(read_only=True)
    local_armazenamento_nome = serializers.SerializerMethodField(read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MovimentacaoEstoque
        fields = [
            'id', 'produto', 'produto_nome', 'lote', 'lote_numero', 'tipo', 'origem',
            'quantidade', 'valor_unitario', 'valor_total', 'data_movimentacao',
            'documento_referencia', 'motivo', 'observacoes',
            'fazenda', 'fazenda_nome', 'talhao', 'talhao_nome',
            'local_armazenamento', 'local_armazenamento_nome',
            'criado_por', 'criado_por_nome'
        ]
        read_only_fields = ['criado_por', 'valor_total', 'data_movimentacao']

    def get_produto_nome(self, obj):
        return obj.produto.nome if getattr(obj, 'produto', None) else None

    def get_lote_numero(self, obj):
        return obj.lote.numero_lote if getattr(obj, 'lote', None) else None

    def get_fazenda_nome(self, obj):
        return obj.fazenda.name if getattr(obj, 'fazenda', None) else None

    def get_talhao_nome(self, obj):
        return obj.talhao.name if getattr(obj, 'talhao', None) else None

    def get_local_armazenamento_nome(self, obj):
        return obj.local_armazenamento.nome if getattr(obj, 'local_armazenamento', None) else None

    def get_criado_por_nome(self, obj):
        if hasattr(obj, 'criado_por') and obj.criado_por:
            try:
                full_name = obj.criado_por.get_full_name()
                return full_name or obj.criado_por.username
            except AttributeError:
                return obj.criado_por.username
        return None

    def validate(self, data):
        """Validações para movimentação"""
        tipo = data.get('tipo')
        quantidade = data.get('quantidade')
        produto = data.get('produto')

        if tipo == 'saida' and produto:
            # Verificar se há estoque suficiente — usa o campo `quantidade_estoque` como fonte de verdade
            saldo_atual = produto.quantidade_estoque if hasattr(produto, 'quantidade_estoque') else produto.saldo_atual
            if quantidade > saldo_atual:
                raise serializers.ValidationError({
                    'quantidade': f'Quantidade insuficiente em estoque. Saldo atual: {saldo_atual} {getattr(produto, "unidade", "")}'
                })

        return data


# ============================================
# FASE 1 - COMERCIAL REVAMP: Serializers de Localização
# ============================================

from .models import Localizacao, ProdutoArmazenado


class LocalizacaoSerializer(serializers.ModelSerializer):
    """Serializer para Localizacao - FASE 1"""
    capacidade_disponivel = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    percentual_ocupacao = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    total_produtos = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Localizacao
        fields = [
            'id', 'nome', 'tipo', 'endereco', 'latitude', 'longitude',
            'capacidade_total', 'capacidade_ocupada', 'capacidade_disponivel',
            'percentual_ocupacao', 'ativa', 'observacoes', 'total_produtos',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em', 'capacidade_ocupada']

    def get_total_produtos(self, obj):
        """Retorna total de lotes armazenados"""
        return obj.produtos_armazenados.count()

    def validate(self, data):
        """Validações para localização"""
        capacidade_total = data.get('capacidade_total', 0)
        
        if capacidade_total < 0:
            raise serializers.ValidationError({'capacidade_total': 'Capacidade não pode ser negativa'})
        
        return data


class ProdutoArmazenadoSerializer(serializers.ModelSerializer):
    """Serializer para ProdutoArmazenado - FASE 1"""
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    produto_unidade = serializers.CharField(source='produto.unidade', read_only=True)
    localizacao_nome = serializers.CharField(source='localizacao.nome', read_only=True)
    localizacao_tipo = serializers.CharField(source='localizacao.get_tipo_display', read_only=True)
    quantidade_disponivel = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = ProdutoArmazenado
        fields = [
            'id', 'produto', 'produto_nome', 'produto_codigo', 'produto_unidade',
            'localizacao', 'localizacao_nome', 'localizacao_tipo',
            'lote', 'quantidade', 'quantidade_disponivel', 'data_entrada', 'status',
            'observacoes', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_em', 'atualizado_em']

    def validate(self, data):
        """Validações para produto armazenado"""
        quantidade = data.get('quantidade', 0)
        
        if quantidade < 0:
            raise serializers.ValidationError({'quantidade': 'Quantidade não pode ser negativa'})
        
        # Validar capacidade da localização (se criando novo registro)
        if not self.instance:
            localizacao = data.get('localizacao')
            if localizacao and localizacao.capacidade_disponivel < quantidade:
                raise serializers.ValidationError({
                    'quantidade': f'Capacidade insuficiente na localização. Disponível: {localizacao.capacidade_disponivel} kg'
                })
        
        return data


class MovimentarEntreLocalizacoesSerializer(serializers.Serializer):
    """Serializer para movimentação entre localizações - FASE 1"""
    produto_id = serializers.IntegerField()
    localizacao_origem_id = serializers.IntegerField()
    localizacao_destino_id = serializers.IntegerField()
    quantidade = serializers.DecimalField(max_digits=15, decimal_places=2)
    lote = serializers.CharField(max_length=100)
    observacoes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validações para transferência"""
        if data['localizacao_origem_id'] == data['localizacao_destino_id']:
            raise serializers.ValidationError('Origem e destino não podem ser iguais')
        
        if data['quantidade'] <= 0:
            raise serializers.ValidationError({'quantidade': 'Quantidade deve ser maior que zero'})
        
        return data

