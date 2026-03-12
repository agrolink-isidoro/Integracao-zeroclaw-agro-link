from rest_framework import serializers
from .models import (
    Fornecedor, PrestadorServico, InstituicaoFinanceira, Fabricante, Cliente, 
    CargaViagem, SiloBolsa, VendaColheita, Empresa, DocumentoFornecedor, 
    HistoricoAlteracao, VendaContrato, ParcelaContrato
)


class FornecedorSerializer(serializers.ModelSerializer):
    """Serializer para Fornecedor

    Notes:
      - Exposes nested-friendly fields expected by the frontend (contato, endereco,
        documentos) while keeping the model's flat storage. This keeps backwards
        compatibility while allowing the UI to consume a stable shape.
    """
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    # Backwards-compatible counters
    documentos_vencendo_count = serializers.SerializerMethodField()
    documentos_vencidos_count = serializers.SerializerMethodField()

    # Nested-friendly output expected by frontend
    contato = serializers.SerializerMethodField()
    # Nested-friendly address output expected by the frontend
    endereco = serializers.SerializerMethodField()
    # Write-only alias to allow setting the underlying model field `endereco`
    endereco_text = serializers.CharField(source='endereco', write_only=True, required=False)
    documentos = serializers.SerializerMethodField()
    # Nested-friendly bank data output expected by the frontend
    dados_bancarios = serializers.SerializerMethodField()

    # Aliases and derived fields to match frontend types
    categoria_fornecedor = serializers.CharField(source='categoria')
    nome_completo = serializers.SerializerMethodField()
    razao_social = serializers.SerializerMethodField()
    nome_fantasia = serializers.SerializerMethodField()

    class Meta:
        model = Fornecedor
        fields = [
            'id', 'nome', 'tipo_pessoa', 'cpf_cnpj', 'rg_ie',

            # Nested-friendly aliases
            'nome_completo', 'razao_social', 'nome_fantasia',
            'contato', 'endereco', 'documentos', 'endereco_text',
            'dados_bancarios',

            # Backwards-compatible flat fields
            'telefone', 'celular', 'email',
            'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',

            # Bank account flat fields
            'banco', 'agencia_bancaria', 'conta_bancaria', 'tipo_conta',
            'titular_conta', 'chave_pix', 'tipo_chave_pix',

            # Business fields
            'categoria', 'categoria_fornecedor', 'status', 'observacoes',

            # Metrics
            'total_compras', 'ultima_compra', 'documentos_pendentes',
            'documentos_vencendo_count', 'documentos_vencidos_count',

            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'total_compras', 'ultima_compra', 'documentos_pendentes', 'documentos_vencendo_count', 'documentos_vencidos_count', 'tenant']

    def get_documentos_vencendo_count(self, obj):
        return obj.documentos_vencendo().count()

    def get_documentos_vencidos_count(self, obj):
        return obj.documentos_vencidos().count()

    def get_contato(self, obj):
        return {
            'telefone_principal': obj.telefone or '',
            'telefone_secundario': obj.celular or '',
            'email_principal': obj.email or '',
            'email_secundario': None,
            'site': None,
            'observacoes': None,
        }

    def get_endereco(self, obj):
        return {
            'logradouro': obj.endereco or '',
            'numero': obj.numero or '',
            'complemento': obj.complemento or '',
            'bairro': obj.bairro or '',
            'cidade': obj.cidade or '',
            'estado': obj.estado or '',
            'cep': obj.cep or '',
            'pais': None,
        }

    def get_dados_bancarios(self, obj):
        return {
            'banco': obj.banco or '',
            'agencia': obj.agencia_bancaria or '',
            'conta': obj.conta_bancaria or '',
            'tipo_conta': obj.tipo_conta or '',
            'titular': obj.titular_conta or '',
            'chave_pix': obj.chave_pix or '',
            'tipo_chave_pix': obj.tipo_chave_pix or '',
        }

    def get_documentos(self, obj):
        # Keep serializer decoupled to avoid import-order problems; use the
        # local DocumentoFornecedor serializer by looking it up lazily.
        try:
            from .serializers import DocumentoFornecedorSerializer  # type: ignore
        except Exception:
            # Should not happen, but fail gracefully
            return []
        return DocumentoFornecedorSerializer(obj.documentos.all(), many=True).data

    def get_nome_completo(self, obj):
        return obj.nome if obj.tipo_pessoa == 'pf' else None

    def get_razao_social(self, obj):
        return obj.nome if obj.tipo_pessoa == 'pj' else None

    def get_nome_fantasia(self, obj):
        # Model does not yet have nome_fantasia; expose None for now
        return None

    def _apply_dados_bancarios(self, instance, dados):
        """Map the nested dados_bancarios dict to flat model fields."""
        if not dados:
            return
        mapping = {
            'banco': 'banco',
            'agencia': 'agencia_bancaria',
            'conta': 'conta_bancaria',
            'tipo_conta': 'tipo_conta',
            'titular': 'titular_conta',
            'chave_pix': 'chave_pix',
            'tipo_chave_pix': 'tipo_chave_pix',
        }
        for src, dst in mapping.items():
            if src in dados:
                setattr(instance, dst, dados[src])

    def create(self, validated_data):
        dados_bancarios = self.initial_data.get('dados_bancarios')
        instance = super().create(validated_data)
        if dados_bancarios and isinstance(dados_bancarios, dict):
            self._apply_dados_bancarios(instance, dados_bancarios)
            instance.save()
        return instance

    def update(self, instance, validated_data):
        dados_bancarios = self.initial_data.get('dados_bancarios')
        instance = super().update(instance, validated_data)
        if dados_bancarios and isinstance(dados_bancarios, dict):
            self._apply_dados_bancarios(instance, dados_bancarios)
            instance.save()
        return instance


class PrestadorServicoSerializer(serializers.ModelSerializer):
    """Serializer para PrestadorServico"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = PrestadorServico
        fields = [
            'id', 'nome', 'tipo_pessoa', 'cpf_cnpj', 'rg_ie',
            'telefone', 'celular', 'email',
            'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
            'categoria', 'especialidades', 'status', 'observacoes',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']


class InstituicaoFinanceiraSerializer(serializers.ModelSerializer):
    """Serializer para InstituicaoFinanceira"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = InstituicaoFinanceira
        fields = [
            'id', 'codigo_bacen', 'nome', 'nome_reduzido', 'segmento',
            'telefone', 'site',
            'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
            'status', 'data_inicio_operacao', 'observacoes',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']


class FabricanteSerializer(serializers.ModelSerializer):
    """Serializer para Fabricante"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = Fabricante
        fields = [
            'id', 'nome', 'tipo_pessoa', 'cpf_cnpj', 'rg_ie',
            'telefone', 'celular', 'email',
            'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
            'linha_produtos', 'certificacoes', 'status', 'observacoes',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']


class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para Cliente"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    # Accept both lowercase and uppercase inputs (e.g. 'PJ'/'pf') and normalize
    tipo_pessoa = serializers.CharField()

    def validate_tipo_pessoa(self, value):
        if isinstance(value, str):
            v = value.strip().lower()
        else:
            v = value
        if v not in ('pf', 'pj'):
            raise serializers.ValidationError('tipo_pessoa must be "pf" or "pj"')
        return v

    class Meta:
        model = Cliente
        fields = [
            'id', 'nome', 'tipo_pessoa', 'cpf_cnpj', 'rg_ie', 'inscricao_estadual',
            'telefone', 'celular', 'email',
            'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
            'status', 'observacoes', 'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']


class CargaViagemSerializer(serializers.ModelSerializer):
    """Serializer para CargaViagem com validações"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)
    cultura_nome = serializers.CharField(source='cultura.nome', read_only=True)
    colheita_agricola_data = serializers.DateField(source='colheita_agricola.data_colheita', read_only=True)

    # Campos calculados para frete
    frete_responsabilidade_fazenda = serializers.BooleanField(read_only=True)
    valor_frete_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    custo_total_com_frete = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CargaViagem
        fields = [
            'id', 'tipo_colheita', 'tipo_entrega', 'data_colheita', 'peso_total', 'classificacao',
            'fazenda', 'fazenda_nome', 'cultura', 'cultura_nome', 'colheita_agricola',
            'colheita_agricola_data', 'umidade', 'impurezas', 'observacoes',
            'custo_armazenagem', 'custo_recepcao', 'custo_limpeza', 'custo_total_armazem',
            # Novos campos de frete
            'comprador_responsavel_frete', 'valor_frete_unitario', 'unidade_frete',
            'frete_responsabilidade_fazenda', 'valor_frete_total', 'custo_total_com_frete',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = [
            'criado_por', 'criado_em', 'atualizado_em', 'custo_total_armazem',
            'frete_responsabilidade_fazenda', 'valor_frete_total', 'custo_total_com_frete'
        ]

    def validate(self, data):
        """Validações customizadas"""
        tipo_colheita = data.get('tipo_colheita')
        tipo_entrega = data.get('tipo_entrega')
        comprador_responsavel_frete = data.get('comprador_responsavel_frete', False)
        valor_frete_unitario = data.get('valor_frete_unitario')

        # Se tipo_colheita é 'colheita_completa', tipo_entrega é obrigatório
        if tipo_colheita == 'colheita_completa' and not tipo_entrega:
            raise serializers.ValidationError({
                'tipo_entrega': 'Tipo de entrega é obrigatório para colheita completa.'
            })

        # Se tipo_entrega é 'contrato_pre_fixado', não pode ter custos de armazenagem
        if tipo_entrega == 'contrato_pre_fixado':
            if data.get('custo_armazenagem', 0) > 0 or data.get('custo_recepcao', 0) > 0 or data.get('custo_limpeza', 0) > 0:
                raise serializers.ValidationError({
                    'custo_armazenagem': 'Não pode haver custos para entrega sob contrato pré-fixado.'
                })

        # Se fazenda é responsável pelo frete, valor_frete_unitario é obrigatório
        if not comprador_responsavel_frete and valor_frete_unitario is None:
            raise serializers.ValidationError({
                'valor_frete_unitario': 'Valor do frete unitário é obrigatório quando a fazenda é responsável pelo frete.'
            })

        return data


class SiloBolsaSerializer(serializers.ModelSerializer):
    """Serializer para SiloBolsa"""
    carga_viagem_info = serializers.SerializerMethodField()
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = SiloBolsa
        fields = [
            'id', 'carga_viagem', 'carga_viagem_info', 'capacidade_total', 'estoque_atual',
            'data_armazenamento', 'estoque_disponivel',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'estoque_disponivel']

    def get_carga_viagem_info(self, obj):
        return {
            'id': obj.carga_viagem.id,
            'tipo_colheita': obj.carga_viagem.tipo_colheita,
            'peso_total': obj.carga_viagem.peso_total,
            'data_colheita': obj.carga_viagem.data_colheita,
            'cultura': obj.carga_viagem.cultura.nome,
            'fazenda': obj.carga_viagem.fazenda.name
        }


class VendaColheitaSerializer(serializers.ModelSerializer):
    """Serializer para VendaColheita com integração IBS"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    origem_info = serializers.SerializerMethodField()

    class Meta:
        model = VendaColheita
        fields = [
            'id', 'origem_tipo', 'origem_id', 'origem_info', 'data_venda', 'quantidade',
            'preco_unitario', 'valor_total', 'cliente', 'cliente_nome',
            'local_armazenamento', 'produto',
            'regime_tributario', 'numero_nota_fiscal', 'data_emissao_nota', 'valor_tributos',
            'status_emissao', 'observacoes',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'valor_total']

    def get_origem_info(self, obj):
        """Retorna informações da origem da venda"""
        origem = obj.origem
        if origem:
            if obj.origem_tipo == 'carga_viagem':
                return {
                    'tipo': 'Carga de Viagem',
                    'info': f"{origem.tipo_colheita} - {origem.peso_total}kg - {origem.cultura.nome}"
                }
            elif obj.origem_tipo == 'silo_bolsa':
                return {
                    'tipo': 'Silo Bolsa',
                    'info': f"Estoque: {origem.estoque_atual}kg - {origem.carga_viagem.cultura.nome}"
                }
        return None

    def validate(self, data):
        """Validações para venda"""
        origem_tipo = data.get('origem_tipo')
        origem_id = data.get('origem_id')
        quantidade = data.get('quantidade')

        # Validar se a origem existe e tem quantidade suficiente
        if origem_tipo == 'carga_viagem':
            try:
                carga = CargaViagem.objects.get(id=origem_id)
                if quantidade > carga.peso_total:
                    raise serializers.ValidationError({
                        'quantidade': f'Quantidade excede o peso total da carga ({carga.peso_total}kg).'
                    })
            except CargaViagem.DoesNotExist:
                raise serializers.ValidationError({
                    'origem_id': 'Carga de viagem não encontrada.'
                })

        elif origem_tipo == 'silo_bolsa':
            try:
                silo = SiloBolsa.objects.get(id=origem_id)
                if quantidade > silo.estoque_atual:
                    raise serializers.ValidationError({
                        'quantidade': f'Quantidade excede o estoque atual do silo ({silo.estoque_atual}kg).'
                    })
            except SiloBolsa.DoesNotExist:
                raise serializers.ValidationError({
                    'origem_id': 'Silo bolsa não encontrado.'
                })

        # If product/local provided, validate their relation
        local = data.get('local_armazenamento')
        produto = data.get('produto')
        if produto and not local:
            raise serializers.ValidationError({'local_armazenamento': 'Local é obrigatório quando produto é informado.'})
        if local and produto:
            # Ensure product belongs to local
            if getattr(produto, 'local_armazenamento_id', None) != local.id:
                raise serializers.ValidationError({'produto': 'Produto não está vinculado ao local selecionado.'})
            # Ensure enough product stock
            if getattr(produto, 'quantidade_estoque', None) is not None and quantidade > produto.quantidade_estoque:
                raise serializers.ValidationError({'quantidade': f'Quantidade excede o estoque disponível do produto ({produto.quantidade_estoque}kg).'})

        return data


class DespesaPrestadoraSerializer(serializers.ModelSerializer):
    """Serializer para DespesaPrestadora"""
    empresa_nome = serializers.CharField(source='empresa.nome', read_only=True)
    prestador_nome = serializers.CharField(source='prestador.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = None  # set dynamically to avoid import-order issues
        fields = [
            'id', 'empresa', 'empresa_nome', 'prestador', 'prestador_nome', 'data', 'categoria', 'valor',
            'centro_custo', 'descricao', 'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and not validated_data.get('criado_por'):
            validated_data['criado_por'] = request.user
        return super().create(validated_data)


class CompraSerializer(serializers.ModelSerializer):
    """Serializer para Compra"""
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = None
        fields = [
            'id', 'fornecedor', 'fornecedor_nome', 'data', 'valor_total', 'descricao', 'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and not validated_data.get('criado_por'):
            validated_data['criado_por'] = request.user
        return super().create(validated_data)


class EmpresaSerializer(serializers.ModelSerializer):
    """Serializer para Empresa"""
    class Meta:
        model = Empresa
        fields = ['id', 'nome', 'cnpj', 'contato', 'endereco', 'criado_em']


from .models import Contrato as ContratoModel

class ContratoSerializer(serializers.ModelSerializer):
    documento_url = serializers.SerializerMethodField()

    class Meta:
        model = ContratoModel
        fields = [
            'id', 'numero_contrato', 'titulo', 'tipo_contrato', 'categoria', 
            'status', 'valor_total', 'data_inicio', 'data_fim', 
            'prazo_execucao_dias', 'observacoes',  # ✅ Novos campos
            'partes', 'itens', 'condicoes', 'documento', 'documento_url', 
            'criado_por', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_por', 'criado_em']

    def get_documento_url(self, obj):
        try:
            if obj.documento:
                return obj.documento.url
        except Exception:
            return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and not validated_data.get('criado_por'):
            validated_data['criado_por'] = request.user
        return super().create(validated_data)

# assign dynamic model to avoid import order issues
from .models import Contrato
ContratoSerializer.Meta.model = Contrato


# Assign dynamic models
from .models import DespesaPrestadora, Compra
DespesaPrestadoraSerializer.Meta.model = DespesaPrestadora
CompraSerializer.Meta.model = Compra


class DocumentoFornecedorSerializer(serializers.ModelSerializer):
    """Serializer para DocumentoFornecedor"""
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    dias_para_vencimento = serializers.ReadOnlyField()
    status_calculado = serializers.ReadOnlyField()
    arquivo_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentoFornecedor
        fields = [
            'id', 'fornecedor', 'fornecedor_nome', 'tipo', 'titulo', 'numero', 'descricao',
            'data_emissao', 'data_vencimento', 'data_renovacao',
            'status', 'dias_alerta', 'arquivo', 'arquivo_url',
            'dias_para_vencimento', 'status_calculado',
            'observacoes', 'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'dias_para_vencimento', 'status_calculado', 'arquivo_url']

    def get_arquivo_url(self, obj):
        try:
            if obj.arquivo:
                return obj.arquivo.url
        except Exception:
            return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and not validated_data.get('criado_por'):
            validated_data['criado_por'] = request.user
        return super().create(validated_data)


class HistoricoAlteracaoSerializer(serializers.ModelSerializer):
    """Serializer para HistoricoAlteracao"""
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    alterado_por_nome = serializers.CharField(source='alterado_por.get_full_name', read_only=True)

    class Meta:
        model = HistoricoAlteracao
        fields = [
            'id', 'fornecedor', 'fornecedor_nome', 'tipo_alteracao', 'descricao',
            'dados_anteriores', 'dados_novos',
            'alterado_por', 'alterado_por_nome', 'alterado_em'
        ]
        read_only_fields = ['alterado_por', 'alterado_em']


class ParcelaContratoSerializer(serializers.ModelSerializer):
    """Serializer para ParcelaContrato"""
    vencimento_titulo = serializers.CharField(source='vencimento.titulo', read_only=True)
    vencimento_status = serializers.CharField(source='vencimento.status', read_only=True)
    
    class Meta:
        model = ParcelaContrato
        fields = [
            'id', 'contrato', 'numero_parcela', 'valor', 'data_vencimento',
            'vencimento', 'vencimento_titulo', 'vencimento_status', 'criado_em'
        ]
        read_only_fields = ['criado_em']


class VendaContratoSerializer(serializers.ModelSerializer):
    """Serializer para VendaContrato"""
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    parcelas = ParcelaContratoSerializer(many=True, read_only=True)
    
    class Meta:
        model = VendaContrato
        fields = [
            'id', 'numero_contrato', 'cliente', 'cliente_nome', 'produto', 'produto_nome',
            'quantidade_total', 'preco_unitario', 'valor_total',
            'tipo', 'status', 'data_contrato', 'data_entrega_prevista',
            'numero_parcelas', 'periodicidade_parcelas', 'observacoes',
            'parcelas', 'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em']


class CriarContratoSerializer(serializers.Serializer):
    """Serializer para criação de contrato com parcelas"""
    from apps.estoque.models import Produto
    
    numero_contrato = serializers.CharField(max_length=50)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    produto = serializers.PrimaryKeyRelatedField(queryset=Produto.objects.all())
    quantidade_total = serializers.DecimalField(max_digits=15, decimal_places=2)
    preco_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)
    valor_total = serializers.DecimalField(max_digits=15, decimal_places=2)
    tipo = serializers.ChoiceField(choices=VendaContrato.TIPO_CHOICES)
    data_contrato = serializers.DateField()
    data_entrega_prevista = serializers.DateField(required=False, allow_null=True)
    numero_parcelas = serializers.IntegerField(min_value=1, default=1)
    periodicidade_parcelas = serializers.ChoiceField(
        choices=[('MENSAL','Mensal'), ('BIMESTRAL','Bimestral'), ('TRIMESTRAL','Trimestral')],
        default='MENSAL'
    )
    observacoes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def validate(self, attrs):
        """Validações customizadas"""
        # Validar que valor_total = quantidade_total * preco_unitario
        valor_calculado = attrs['quantidade_total'] * attrs['preco_unitario']
        if abs(valor_calculado - attrs['valor_total']) > 0.01:  # Tolerância de 1 centavo
            raise serializers.ValidationError({
                'valor_total': 'O valor total deve ser igual a quantidade_total * preco_unitario'
            })
        
        # Validar número de parcelas para tipo À VISTA
        if attrs['tipo'] == 'A_VISTA' and attrs.get('numero_parcelas', 1) > 1:
            raise serializers.ValidationError({
                'numero_parcelas': 'Contratos à vista devem ter apenas 1 parcela'
            })
        
        return attrs


