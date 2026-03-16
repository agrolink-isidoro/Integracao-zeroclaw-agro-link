from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import (
    Vencimento, RateioCusto, RateioTalhao, RateioApproval, 
    Financiamento, ParcelaFinanciamento, Emprestimo, ParcelaEmprestimo,
    ItemEmprestimo, ItemExtratoBancario, BankStatementImport, BankTransaction
)


class VencimentoSerializer(serializers.ModelSerializer):
    """Serializer para Vencimento"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    talhao_nome = serializers.CharField(source='talhao.nome', read_only=True)
    conta_bancaria_nome = serializers.SerializerMethodField(read_only=True)
    dias_atraso = serializers.ReadOnlyField()
    valor_pago = serializers.ReadOnlyField()
    origem_tipo = serializers.SerializerMethodField(read_only=True)
    origem_descricao = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Vencimento
        fields = [
            'id', 'titulo', 'descricao', 'valor', 'data_vencimento',
            'data_pagamento', 'status', 'tipo', 'talhao', 'talhao_nome',
            'conta_bancaria', 'conta_bancaria_nome', 'confirmado_extrato',
            'content_type', 'object_id', 'origem_tipo', 'origem_descricao',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
            'dias_atraso', 'valor_pago'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'dias_atraso', 'valor_pago', 'origem_tipo', 'origem_descricao']

    def get_conta_bancaria_nome(self, obj):
        """Retorna o nome da conta bancária ou empty string se None"""
        if obj.conta_bancaria:
            return str(obj.conta_bancaria)
        return None

    def get_origem_tipo(self, obj):
        """Retorna o tipo de origem (ex: ParcelaContrato, ParcelaFinanciamento, etc)"""
        if obj.content_type:
            return obj.content_type.model
        return None

    def get_origem_descricao(self, obj):
        """Retorna descrição da origem"""
        if obj.objeto_relacionado:
            return str(obj.objeto_relacionado)
        return None


class RateioTalhaoSerializer(serializers.ModelSerializer):
    """Serializer para RateioTalhao"""
    talhao_nome = serializers.CharField(source='talhao.nome', read_only=True)
    talhao_area = serializers.DecimalField(source='talhao.area_size', max_digits=10, decimal_places=4, read_only=True)

    class Meta:
        model = RateioTalhao
        fields = [
            'id', 'rateio', 'talhao', 'talhao_nome', 'talhao_area',
            'proporcao_area', 'valor_rateado'
        ]
        read_only_fields = ['proporcao_area', 'valor_rateado']


class RateioCustoSerializer(serializers.ModelSerializer):
    """Serializer para RateioCusto"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    talhoes_rateio = RateioTalhaoSerializer(source='rateiotalhao_set', many=True, read_only=True)

    # Expose origin fields (GFK parts) so API can link by type and id
    origem_content_type = serializers.PrimaryKeyRelatedField(queryset=ContentType.objects.all(), required=False, allow_null=True)
    origem_object_id = serializers.IntegerField(required=False, allow_null=True)
    origem_display = serializers.SerializerMethodField(read_only=True)

    # Inline approval info so the frontend can act on it without a separate request
    approval_id = serializers.SerializerMethodField(read_only=True)
    approval_status = serializers.SerializerMethodField(read_only=True)
    approval_aprovado_por_nome = serializers.SerializerMethodField(read_only=True)
    approval_aprovado_em = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RateioCusto
        fields = [
            'id', 'titulo', 'descricao', 'valor_total', 'data_rateio',
            'area_total_hectares', 'talhoes', 'criado_por', 'criado_por_nome',
            'criado_em', 'talhoes_rateio',
            # new fields
            'origem_content_type', 'origem_object_id', 'origem_display',
            'safra', 'centro_custo', 'data_hora_rateio', 'destino', 'driver_de_rateio',
            # approval inline
            'approval_id', 'approval_status', 'approval_aprovado_por_nome', 'approval_aprovado_em',
        ]
        read_only_fields = ['criado_por', 'criado_em', 'area_total_hectares', 'origem_display']

    def get_origem_display(self, obj):
        if obj.origem:
            return str(obj.origem)
        return None

    def get_approval_id(self, obj):
        approval = getattr(obj, 'approval', None)
        return approval.id if approval else None

    def get_approval_status(self, obj):
        approval = getattr(obj, 'approval', None)
        return approval.status if approval else None

    def get_approval_aprovado_por_nome(self, obj):
        approval = getattr(obj, 'approval', None)
        if approval and approval.aprovado_por:
            return approval.aprovado_por.get_full_name() or approval.aprovado_por.username
        return None

    def get_approval_aprovado_em(self, obj):
        approval = getattr(obj, 'approval', None)
        return str(approval.aprovado_em) if approval and approval.aprovado_em else None

    def validate(self, attrs):
        # Cross-field validations and also account for partial updates using self.initial_data
        driver = attrs.get('driver_de_rateio', getattr(self.instance, 'driver_de_rateio', None))
        destino = attrs.get('destino', getattr(self.instance, 'destino', None))

        # If driver is area, ensure there are talhões (either in payload or existing)
        if driver == 'area':
            talhoes_input = None
            if self.initial_data and 'talhoes' in self.initial_data:
                talhoes_input = self.initial_data.get('talhoes', []) or []

            has_existing = False
            if self.instance and getattr(self.instance, 'talhoes', None) is not None:
                has_existing = self.instance.talhoes.exists()

            if not talhoes_input and not has_existing:
                raise serializers.ValidationError({'talhoes': 'Driver "area" requer pelo menos um talhão associado.'})

        # Centro de custo obrigatório para destinos administrativos/financeiros
        if destino in ['despesa_adm', 'financeiro']:
            centro = attrs.get('centro_custo', getattr(self.instance, 'centro_custo', None))
            if not centro:
                raise serializers.ValidationError({'centro_custo': 'Centro de custo obrigatório para despesas administrativas e financeiras.'})

        return attrs

    def create(self, validated_data):
        # For talhões prefer the raw initial_data (ids) when provided to avoid issues with through M2M
        talhoes = self.initial_data.get('talhoes', []) if self.initial_data else []
        origem_ct = validated_data.pop('origem_content_type', None)
        origem_obj_id = validated_data.pop('origem_object_id', None)

        rateio = super().create(validated_data)

        # set generic origin if provided
        if origem_ct and origem_obj_id:
            rateio.origem_content_type = origem_ct
            rateio.origem_object_id = origem_obj_id
            rateio.save()

        if talhoes:
            rateio.talhoes.set(talhoes)
            rateio.calcular_area_total()
            rateio.salvar_rateios_talhao()
            rateio.save()

        return rateio

    def update(self, instance, validated_data):
        origem_ct = validated_data.pop('origem_content_type', None)
        origem_obj_id = validated_data.pop('origem_object_id', None)

        rateio = super().update(instance, validated_data)

        if origem_ct and origem_obj_id:
            rateio.origem_content_type = origem_ct
            rateio.origem_object_id = origem_obj_id
            rateio.save()

        # Handle talhoes explicitly from initial_data to support partial updates
        talhoes_input = None
        if self.initial_data and 'talhoes' in self.initial_data:
            talhoes_input = self.initial_data.get('talhoes', [])

        if talhoes_input is not None:
            rateio.talhoes.set(talhoes_input)
            rateio.calcular_area_total()
            rateio.salvar_rateios_talhao()
            rateio.save()

        return rateio


class RateioInfoSerializer(serializers.ModelSerializer):
    """Nested snapshot of the rateio for approval listings."""
    class Meta:
        model = RateioCusto
        fields = ['id', 'titulo', 'descricao', 'valor_total', 'destino', 'data_rateio']


class RateioApprovalSerializer(serializers.ModelSerializer):
    rateio = RateioInfoSerializer(read_only=True)
    criado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = RateioApproval
        fields = ['id', 'rateio', 'status', 'criado_por', 'criado_por_nome', 'criado_em', 'aprovado_por', 'aprovado_em', 'comentario']
        read_only_fields = ['status', 'criado_por', 'criado_em', 'aprovado_por', 'aprovado_em']

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            name = obj.criado_por.get_full_name()
            return name if name.strip() else obj.criado_por.username
        return None


class ParcelaFinanciamentoSerializer(serializers.ModelSerializer):
    """Serializer para ParcelaFinanciamento"""
    financiamento_titulo = serializers.CharField(source='financiamento.titulo', read_only=True)
    dias_atraso = serializers.ReadOnlyField()

    class Meta:
        model = ParcelaFinanciamento
        fields = [
            'id', 'financiamento', 'financiamento_titulo', 'numero_parcela',
            'valor_parcela', 'valor_pago', 'data_vencimento', 'data_pagamento',
            'status', 'dias_atraso'
        ]
        read_only_fields = ['dias_atraso']


class TransferenciaSerializer(serializers.ModelSerializer):
    conta_origem_display = serializers.CharField(source='conta_origem.__str__', read_only=True)
    conta_destino_display = serializers.SerializerMethodField()
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    # Convenience field: accept a fornecedor_id on write to auto-set destino GenericFK
    fornecedor_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    # Read-only: show linked fornecedor info
    fornecedor_nome = serializers.SerializerMethodField()

    class Meta:
        model = __import__('apps.financeiro.models', fromlist=['Transferencia']).Transferencia
        fields = [
            'id', 'conta_origem', 'conta_origem_display', 'conta_destino', 'conta_destino_display',
            'tipo_transferencia', 'valor', 'data', 'descricao',
            'pix_key_origem', 'pix_key_destino',
            'origem_content_type', 'origem_object_id', 'destino_content_type', 'destino_object_id',
            'fornecedor_id', 'fornecedor_nome',
            'criado_por', 'criado_por_nome', 'criado_em', 'status', 'settlement_date', 'external_reference', 'taxa_bancaria', 'payment_metadata'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'conta_origem_display', 'conta_destino_display', 'criado_por_nome']
        extra_kwargs = {
            'conta_destino': {'required': False, 'allow_null': True},
        }

    def get_conta_destino_display(self, obj):
        return str(obj.conta_destino) if obj.conta_destino else None

    def get_fornecedor_nome(self, obj):
        """Return the fornecedor name if destino points to a Fornecedor."""
        try:
            from django.contrib.contenttypes.models import ContentType
            from apps.comercial.models import Fornecedor
            ct = ContentType.objects.get_for_model(Fornecedor)
            if obj.destino_content_type_id == ct.id and obj.destino_object_id:
                forn = Fornecedor.objects.filter(pk=obj.destino_object_id).first()
                return forn.nome if forn else None
        except Exception:
            pass
        return None

    def validate(self, attrs):
        tipo = attrs.get('tipo_transferencia') if 'tipo_transferencia' in attrs else getattr(self.instance, 'tipo_transferencia', None)
        if tipo == 'pix':
            has_src = bool(attrs.get('pix_key_origem'))
            has_dst = bool(attrs.get('pix_key_destino'))
            if not (has_src and has_dst):
                raise serializers.ValidationError({'pix_key_origem': 'Chave PIX (origem e destino) é obrigatória para transferências do tipo PIX', 'pix_key_destino': 'Chave PIX (origem e destino) é obrigatória para transferências do tipo PIX'})
        else:
            # For non-PIX transfers, conta_destino is mandatory
            conta_destino = attrs.get('conta_destino') if 'conta_destino' in attrs else getattr(self.instance, 'conta_destino', None)
            if not conta_destino:
                raise serializers.ValidationError({'conta_destino': 'Conta de destino é obrigatória para transferências do tipo ' + (tipo or 'interno')})
        return attrs

class QuitarPorTransferenciaSerializer(serializers.Serializer):
    conta_origem = serializers.PrimaryKeyRelatedField(queryset=__import__('apps.financeiro.models', fromlist=['ContaBancaria']).ContaBancaria.objects.all())
    tipo_transferencia = serializers.ChoiceField(choices=[('doc','DOC'),('ted','TED'),('pix','PIX'),('interno','Interno')])
    dados_bancarios = serializers.JSONField(required=False, allow_null=True)
    itens = serializers.ListField(child=serializers.DictField(), allow_empty=False)
    client_tx_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    descricao = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        itens = attrs.get('itens', [])
        total = 0
        for it in itens:
            if 'vencimento' not in it or 'valor' not in it:
                raise serializers.ValidationError('Cada item deve conter "vencimento" e "valor"')
            try:
                from decimal import Decimal
                Decimal(str(it['valor']))
            except Exception:
                raise serializers.ValidationError('Valor inválido em um dos itens')
            total += float(it['valor'])

        # PIX validation: dados_bancarios must contain both pix_key_origem and pix_key_destino (or pix_key)
        tipo = attrs.get('tipo_transferencia')
        dados = attrs.get('dados_bancarios') or {}
        if tipo == 'pix':
            has_pix_key = bool(dados.get('pix_key'))
            has_src = bool(dados.get('pix_key_origem'))
            has_dst = bool(dados.get('pix_key_destino'))
            if not (has_pix_key or (has_src and has_dst)):
                raise serializers.ValidationError({'dados_bancarios': 'Chave PIX (origem e destino) é obrigatória para transferências do tipo pix'})

        return attrs


class FinanciamentoSerializer(serializers.ModelSerializer):
    """Serializer para Financiamento"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    talhao_nome = serializers.CharField(source='talhao.nome', read_only=True)
    instituicao_nome = serializers.CharField(source='instituicao_financeira.nome', read_only=True)
    parcelas = ParcelaFinanciamentoSerializer(many=True, read_only=True)
    valor_pendente = serializers.ReadOnlyField()
    parcelas_pendentes = serializers.ReadOnlyField()

    class Meta:
        model = Financiamento
        fields = [
            'id', 'titulo', 'descricao', 'valor_total', 'valor_entrada', 'valor_financiado',
            'taxa_juros', 'frequencia_taxa', 'metodo_calculo', 'numero_parcelas', 'prazo_meses', 'data_contratacao', 'data_primeiro_vencimento',
            'status', 'tipo_financiamento', 'talhao', 'talhao_nome',
            'instituicao_financeira', 'instituicao_nome', 'numero_contrato',
            'garantias', 'contrato_arquivo', 'taxa_multa', 'taxa_mora', 'conta_destino', 'aprovado_por', 'aprovado_em', 'observacoes', 'origem_content_type', 'origem_object_id',
            'carencia_meses', 'juros_embutidos',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em', 'parcelas', 'valor_pendente', 'parcelas_pendentes'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'valor_pendente', 'parcelas_pendentes']

    def validate(self, attrs):
        # conta_destino é obrigatória por regra de negócio para certos tipos
        tipo = attrs.get('tipo_financiamento') if 'tipo_financiamento' in attrs else getattr(self.instance, 'tipo_financiamento', None)
        conta = attrs.get('conta_destino') if 'conta_destino' in attrs else getattr(self.instance, 'conta_destino', None)
        exempt_types = ['cpr', 'credito_rotativo']
        if tipo not in exempt_types and not conta:
            raise serializers.ValidationError({'conta_destino': 'É necessário informar uma Conta de destino para o financiamento.'})
        return attrs
        return super().validate(attrs)


class ParcelaEmprestimoSerializer(serializers.ModelSerializer):
    """Serializer para ParcelaEmprestimo"""
    emprestimo_titulo = serializers.CharField(source='emprestimo.titulo', read_only=True)
    dias_atraso = serializers.ReadOnlyField()

    class Meta:
        model = ParcelaEmprestimo
        fields = [
            'id', 'emprestimo', 'emprestimo_titulo', 'numero_parcela',
            'valor_parcela', 'valor_pago', 'data_vencimento', 'data_pagamento',
            'status', 'dias_atraso'
        ]
        read_only_fields = ['dias_atraso']


class ItemEmprestimoSerializer(serializers.ModelSerializer):
    """Serializer para ItemEmprestimo - Produtos vinculados a empréstimos"""
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_unidade = serializers.CharField(source='produto.unidade', read_only=True)
    valor_total = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ItemEmprestimo
        fields = [
            'id', 'emprestimo', 'produto', 'produto_nome', 'produto_unidade',
            'quantidade', 'unidade', 'valor_unitario', 'valor_total', 'observacoes',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['valor_total', 'criado_em', 'atualizado_em']

    def get_valor_total(self, obj):
        """Calcula valor_total automaticamente"""
        return (obj.quantidade or 0) * (obj.valor_unitario or 0)

    def validate(self, attrs):
        """Validações de negócio"""
        produto = attrs.get('produto')
        quantidade = attrs.get('quantidade', 0)

        if produto and quantidade > produto.quantidade_estoque:
            raise serializers.ValidationError({
                'quantidade': f'Quantidade insuficiente no estoque. Disponível: {produto.quantidade_estoque}'
            })
        if quantidade is not None and quantidade <= 0:
            raise serializers.ValidationError({'quantidade': 'Quantidade deve ser maior que zero'})

        return super().validate(attrs)


class EmprestimoSerializer(serializers.ModelSerializer):
    """Serializer para Emprestimo"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    talhao_nome = serializers.CharField(source='talhao.nome', read_only=True)
    instituicao_nome = serializers.CharField(source='instituicao_financeira.nome', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome', read_only=True)
    parcelas = ParcelaEmprestimoSerializer(many=True, read_only=True)
    itens_produtos = ItemEmprestimoSerializer(many=True, read_only=True)
    valor_pendente = serializers.ReadOnlyField()
    parcelas_pendentes = serializers.ReadOnlyField()

    class Meta:
        model = Emprestimo
        fields = [
            'id', 'titulo', 'descricao', 'valor_emprestimo', 'valor_entrada', 'taxa_juros',
            'frequencia_taxa', 'metodo_calculo', 'numero_parcelas', 'prazo_meses', 'data_contratacao', 'data_primeiro_vencimento',
            'status', 'tipo_emprestimo', 'talhao', 'talhao_nome',
            'instituicao_financeira', 'instituicao_nome', 'cliente', 'cliente_nome', 'criado_por', 'criado_por_nome',
            'carencia_meses', 'juros_embutidos',
            'criado_em', 'atualizado_em', 'parcelas', 'itens_produtos', 'valor_pendente', 'parcelas_pendentes'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'valor_pendente', 'parcelas_pendentes']

    def validate(self, attrs):
        # Ensure either cliente or instituicao_financeira is present
        cliente = attrs.get('cliente') if 'cliente' in attrs else getattr(self.instance, 'cliente', None)
        inst = attrs.get('instituicao_financeira') if 'instituicao_financeira' in attrs else getattr(self.instance, 'instituicao_financeira', None)
        if not cliente and not inst:
            raise serializers.ValidationError('É necessário informar uma Instituição financeira ou um Cliente para o empréstimo.')
        return super().validate(attrs)


class LancamentoFinanceiroSerializer(serializers.ModelSerializer):
    """Serializer para LancamentoFinanceiro"""
    conta_display = serializers.CharField(source='conta.__str__', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)

    class Meta:
        model = None  # set dynamically to avoid import-time issues
        fields = ['id', 'conta', 'conta_display', 'tipo', 'valor', 'data', 'descricao', 'origem_content_type', 'origem_object_id', 'criado_por', 'criado_por_nome', 'criado_em', 'reconciled', 'reconciled_at']
        read_only_fields = ['criado_por', 'criado_em', 'conta_display']

    def __init__(self, *args, **kwargs):
        # late import to avoid circular imports
        from .models import LancamentoFinanceiro
        super().__init__(*args, **kwargs)
        self.Meta.model = LancamentoFinanceiro


# Bank statement import serializers
from .models import BankStatementImport, BankTransaction


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = ['id', 'external_id', 'date', 'amount', 'description', 'balance', 'raw_payload', 'criado_em']


import logging

logger = logging.getLogger(__name__)

class ContaBancariaSerializer(serializers.ModelSerializer):
    current_balance = serializers.SerializerMethodField(read_only=True)
    reconciled_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = __import__('apps.financeiro.models', fromlist=['ContaBancaria']).ContaBancaria
        fields = ['id', 'banco', 'agencia', 'conta', 'tipo', 'moeda', 'saldo_inicial', 'current_balance', 'reconciled_count', 'ativo', 'criado_em']
        read_only_fields = ['id', 'criado_em', 'raw_payload', 'tenant']

    def get_current_balance(self, obj):
        try:
            from .models import LancamentoFinanceiro
            from django.db.models import Sum
            entradas = LancamentoFinanceiro.objects.filter(conta=obj, tipo='entrada').aggregate(total=Sum('valor'))['total'] or 0
            saidas = LancamentoFinanceiro.objects.filter(conta=obj, tipo='saida').aggregate(total=Sum('valor'))['total'] or 0
            saldo = (obj.saldo_inicial or 0) + entradas - saidas
            # Ensure JSON serializable (string) to avoid Decimal serialization issues
            return str(saldo) if saldo is not None else None
        except Exception as e:
            logger.exception('Erro calculando saldo para conta %s: %s', getattr(obj, 'id', '?'), e)
            return None

    def get_reconciled_count(self, obj):
        try:
            from .models import LancamentoFinanceiro
            return LancamentoFinanceiro.objects.filter(conta=obj, reconciled=True).count()
        except Exception as e:
            logger.exception('Erro contando reconciliados para conta %s: %s', getattr(obj, 'id', '?'), e)
            return 0


class BankStatementImportSerializer(serializers.ModelSerializer):
    transactions = BankTransactionSerializer(many=True, read_only=True)
    arquivo = serializers.FileField(required=False, allow_null=True)
    dry_run = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = BankStatementImport
        fields = ['id', 'conta', 'original_filename', 'formato', 'status', 'arquivo', 'arquivo_hash', 'rows_count', 'errors_count', 'criado_por', 'criado_em', 'transactions', 'dry_run']
        read_only_fields = ['id', 'status', 'arquivo_hash', 'rows_count', 'errors_count', 'criado_por', 'criado_em', 'transactions']


# Serializer para Cartões de Crédito
class CreditCardSerializer(serializers.ModelSerializer):
    conta_display = serializers.CharField(source='conta.__str__', read_only=True)
    transacoes_pendentes = serializers.SerializerMethodField()

    class Meta:
        model = __import__('apps.financeiro.models', fromlist=['CreditCard']).CreditCard
        fields = ['id', 'bandeira', 'bandeira_codigo', 'numero_masked', 'numero_last4', 'conta', 'conta_display', 'agencia', 'validade', 'dia_vencimento_fatura', 'saldo_devedor', 'ativo', 'criado_em', 'transacoes_pendentes']
        read_only_fields = ['id', 'criado_em', 'saldo_devedor']

    def get_transacoes_pendentes(self, obj):
        return obj.transacoes.filter(faturado=False).count()


class TransacaoCartaoSerializer(serializers.ModelSerializer):
    cartao_display = serializers.CharField(source='cartao.__str__', read_only=True)
    nfe_chave = serializers.CharField(source='nfe.chave_acesso', read_only=True)

    class Meta:
        from .models import TransacaoCartao
        model = TransacaoCartao
        fields = ['id', 'cartao', 'cartao_display', 'nfe', 'nfe_chave', 'valor', 'data', 'descricao', 'nsu', 'bandeira_nfe', 'faturado', 'vencimento_fatura', 'criado_em']
        read_only_fields = ['id', 'criado_em']


# FASE 5: Serializer para ItemExtratoBancario
class ItemExtratoBancarioSerializer(serializers.ModelSerializer):
    conta_bancaria_nome = serializers.CharField(source='conta_bancaria.__str__', read_only=True)
    vencimento_titulo = serializers.CharField(source='vencimento.titulo', read_only=True)
    transferencia_descricao = serializers.SerializerMethodField()
    conciliado_por_nome = serializers.CharField(source='conciliado_por.get_full_name', read_only=True)

    class Meta:
        model = ItemExtratoBancario
        fields = [
            'id', 'conta_bancaria', 'conta_bancaria_nome', 'data', 'descricao', 
            'valor', 'tipo', 'conciliado', 'conciliado_em', 'conciliado_por', 
            'conciliado_por_nome', 'vencimento', 'vencimento_titulo', 
            'transferencia', 'transferencia_descricao', 'arquivo_origem', 
            'linha_original', 'importado_em', 'importado_por'
        ]
        read_only_fields = [
            'id', 'conciliado', 'conciliado_em', 'conciliado_por', 
            'importado_em', 'importado_por'
        ]
    
    def get_transferencia_descricao(self, obj):
        if obj.transferencia:
            return f"{obj.transferencia.tipo.upper()} - {obj.transferencia.valor}"
        return None
