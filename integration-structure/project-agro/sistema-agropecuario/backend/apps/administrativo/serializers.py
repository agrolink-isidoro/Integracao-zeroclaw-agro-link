from rest_framework import serializers
from .models import CentroCusto, DespesaAdministrativa, Funcionario, FolhaPagamento, FolhaPagamentoItem


class CentroCustoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CentroCusto
        fields = ['id', 'codigo', 'nome', 'descricao', 'categoria', 'ativo', 'pai', 'criado_por']


class DespesaAdministrativaSerializer(serializers.ModelSerializer):
    centro_nome = serializers.SerializerMethodField()
    fornecedor_nome = serializers.SerializerMethodField()
    safra_nome = serializers.SerializerMethodField()
    auto_rateio = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = DespesaAdministrativa
        fields = ['id', 'titulo', 'descricao', 'valor', 'data', 'documento_referencia', 'anexos', 'pendente_rateio', 'centro', 'centro_nome', 'fornecedor', 'fornecedor_nome', 'rateio', 'safra', 'safra_nome', 'auto_rateio']

    def get_centro_nome(self, obj):
        return str(obj.centro) if obj.centro else None

    def get_fornecedor_nome(self, obj):
        return str(obj.fornecedor) if obj.fornecedor else None

    def get_safra_nome(self, obj):
        return str(obj.safra) if obj.safra else None


class FuncionarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = ['id', 'nome', 'cpf', 'cargo', 'conta_bancaria', 'banco', 'agencia', 'conta', 'tipo_conta', 'pix_key', 'recebe_por', 'nome_titular', 'cpf_cnpj', 'salario_bruto', 'dependentes', 'ativo', 'tipo', 'diaria_valor']

    def validate(self, attrs):
        # ensure diaria_valor is provided for temporarios
        tipo = attrs.get('tipo', getattr(self.instance, 'tipo', None))
        diaria = attrs.get('diaria_valor', getattr(self.instance, 'diaria_valor', None))
        if tipo == 'temporario':
            if diaria is None:
                raise serializers.ValidationError({'diaria_valor': 'Campo obrigatório para trabalhadores temporários.'})
            try:
                if float(diaria) <= 0:
                    raise serializers.ValidationError({'diaria_valor': 'Valor diário deve ser maior que zero.'})
            except (TypeError, ValueError):
                raise serializers.ValidationError({'diaria_valor': 'Valor diário inválido.'})

        # if receives by PIX, pix_key should be present
        recebe_por = attrs.get('recebe_por', getattr(self.instance, 'recebe_por', None))
        pix_key = attrs.get('pix_key', getattr(self.instance, 'pix_key', None))
        if recebe_por == 'pix' and not pix_key:
            raise serializers.ValidationError({'pix_key': 'Chave PIX obrigatória quando o funcionário recebe por PIX.'})

        return attrs


class FolhaPagamentoItemSerializer(serializers.ModelSerializer):
    funcionario = FuncionarioSerializer(read_only=True)
    funcionario_id = serializers.PrimaryKeyRelatedField(source='funcionario', write_only=True, queryset=Funcionario.objects.all())
    hora_extra_entries = serializers.SerializerMethodField()

    def get_hora_extra_entries(self, obj):
        # when returning persisted model instance, this isn't stored; default to None
        return getattr(obj, 'hora_extra_entries', None)

    class Meta:
        model = FolhaPagamentoItem
        fields = ['id', 'funcionario', 'funcionario_id', 'salario_bruto', 'hora_extra', 'hora_extra_hours', 'hora_extra_type', 'hora_extra_entries', 'dsr', 'inss', 'ir', 'descontos', 'descontos_outro', 'liquido']



class FolhaPagamentoSerializer(serializers.ModelSerializer):
    itens = FolhaPagamentoItemSerializer(many=True, read_only=True)

    class Meta:
        model = FolhaPagamento
        fields = ['id', 'descricao', 'periodo_ano', 'periodo_mes', 'valor_total', 'executado', 'criado_por', 'criado_em', 'itens']


class PagarFolhaPagamentoItemSerializer(serializers.Serializer):
    funcionario_id = serializers.IntegerField(required=True)
    vencimento_id = serializers.IntegerField(required=False, allow_null=True)
    valor = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    forma = serializers.ChoiceField(choices=['pix', 'ted', 'doc', 'interno'], default='pix')
    dados_bancarios_override = serializers.JSONField(required=False)
    client_tx_id = serializers.CharField(required=False, allow_null=True)


class PagarFolhaPorTransferenciaSerializer(serializers.Serializer):
    conta_origem = serializers.IntegerField(required=True)
    pagamentos = PagarFolhaPagamentoItemSerializer(many=True, required=True)
    descricao = serializers.CharField(required=False, allow_blank=True)


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = None  # set dynamically to avoid import-order issues
        fields = ['id', 'titulo', 'mensagem', 'tipo', 'prioridade', 'lida', 'lida_em', 'criado_em', 'expira_em']
        read_only_fields = ['id', 'criado_em', 'lida_em']

# assign model dynamically to avoid import-time cycles
from .models import Notificacao
NotificacaoSerializer.Meta.model = Notificacao
