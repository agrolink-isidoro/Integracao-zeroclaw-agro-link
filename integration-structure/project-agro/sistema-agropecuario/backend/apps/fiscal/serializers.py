from rest_framework import serializers
from .models import NFe, ItemNFe, Imposto
from .models_certificados import CertificadoSefaz
from .models_impostos import ImpostoFederal, ImpostoTrabalhista
from .models_manifestacao import Manifestacao


class ImpostoFederalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpostoFederal
        fields = '__all__'


class ImpostoTrabalhistaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpostoTrabalhista
        fields = '__all__'


class ImpostoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Imposto
        fields = '__all__'


class ItemNFESerializer(serializers.ModelSerializer):
    imposto = ImpostoSerializer(read_only=True)
    effective_quantidade = serializers.SerializerMethodField(read_only=True)
    effective_valor_unitario = serializers.SerializerMethodField(read_only=True)
    # Represent commercial unit value as string to avoid Decimal.quantize issues
    valor_unitario_comercial = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ItemNFe
        fields = '__all__'

    def get_effective_quantidade(self, obj):
        return str(obj.effective_quantidade())

    def get_effective_valor_unitario(self, obj):
        # Return string with exactly two decimal places (currency) to keep UI consistent
        try:
            val = obj.effective_valor_unitario()
            if val is None:
                return None
            from decimal import Decimal, ROUND_HALF_UP
            q = Decimal('0.01')
            return str(Decimal(val).quantize(q, rounding=ROUND_HALF_UP))
        except Exception:
            return None

    def get_valor_unitario_comercial(self, obj):
        # Represent raw stored commercial unit value as string with 2 decimals
        try:
            if obj.valor_unitario_comercial is None:
                return None
            from decimal import Decimal, ROUND_HALF_UP
            q = Decimal('0.01')
            return str(Decimal(obj.valor_unitario_comercial).quantize(q, rounding=ROUND_HALF_UP))
        except Exception:
            return None

    def to_representation(self, obj):
        # Build a safe representation that avoids DRF DecimalField.quantize which
        # can raise decimal.InvalidOperation on certain Decimal contexts or unusual
        # stored values. We convert Decimal fields to strings explicitly.
        rep = {
            'id': obj.id,
            'numero_item': obj.numero_item,
            'codigo_produto': obj.codigo_produto,
            'ean': obj.ean,
            'descricao': obj.descricao,
            'ncm': obj.ncm,
            'cest': obj.cest,
            'cfop': obj.cfop,
            'unidade_comercial': obj.unidade_comercial,
            'quantidade_comercial': str(obj.quantidade_comercial) if obj.quantidade_comercial is not None else None,
            'valor_unitario_comercial': self.get_valor_unitario_comercial(obj),
            'valor_produto': str(obj.valor_produto) if obj.valor_produto is not None else None,
            'unidade_tributaria': obj.unidade_tributaria,
            'quantidade_tributaria': str(obj.quantidade_tributaria) if obj.quantidade_tributaria is not None else None,
            'valor_unitario_tributario': str(obj.valor_unitario_tributario) if obj.valor_unitario_tributario is not None else None,
            'codigo_anp': obj.codigo_anp,
            'descricao_anp': obj.descricao_anp,
            'percentual_biodiesel': str(obj.percentual_biodiesel) if obj.percentual_biodiesel is not None else None,
            'uf_consumo': obj.uf_consumo,
            'effective_quantidade': self.get_effective_quantidade(obj),
            'effective_valor_unitario': self.get_effective_valor_unitario(obj),
        }
        # Add imposto if present
        try:
            if hasattr(obj, 'imposto') and obj.imposto is not None:
                rep['imposto'] = ImpostoSerializer(obj.imposto).data
        except Exception:
            rep['imposto'] = None
        return rep


class ItemNFeOverrideSerializer(serializers.ModelSerializer):
    criado_por = serializers.PrimaryKeyRelatedField(read_only=True)
    # Accept broader decimal precision on input and normalize in validate to 2 decimals
    valor_unitario = serializers.DecimalField(max_digits=13, decimal_places=6, required=False, allow_null=True)

    class Meta:
        model = __import__('apps.fiscal.models_overrides', fromlist=['ItemNFeOverride']).ItemNFeOverride
        fields = '__all__'
        read_only_fields = ('id', 'criado_por', 'criado_em')

    def validate(self, attrs):
        # Require at least one editable field OR allow creating/applying only (aplicado=True)
        if not any(k in attrs for k in ('quantidade', 'valor_unitario', 'valor_produto')):
            # Allow operation if the client intends only to mark as applied
            if not (attrs.get('aplicado') is True):
                raise serializers.ValidationError('Pelo menos um dos campos quantidade, valor_unitario ou valor_produto deve ser informado, ou defina "aplicado" quando aplicando diretamente.')

        # If valor_unitario provided, normalize to 2 decimal places
        if 'valor_unitario' in attrs and attrs.get('valor_unitario') is not None:
            from decimal import Decimal, ROUND_HALF_UP
            q = Decimal('0.01')
            try:
                attrs['valor_unitario'] = Decimal(str(attrs['valor_unitario'])).quantize(q, rounding=ROUND_HALF_UP)
            except Exception:
                raise serializers.ValidationError({'valor_unitario': 'Formato inválido para valor_unitario. Use número com até 2 casas decimais.'})

        return attrs


class NFESerializer(serializers.ModelSerializer):
    itens = ItemNFESerializer(many=True, read_only=True)
    manifestacoes = serializers.SerializerMethodField(read_only=True)
    processado_por = serializers.PrimaryKeyRelatedField(read_only=True)
    fornecedor = serializers.PrimaryKeyRelatedField(read_only=True)
    fornecedor_nome = serializers.SerializerMethodField(read_only=True)
    fornecedor_cpf_cnpj = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = NFe
        fields = '__all__'

    def get_fornecedor_nome(self, obj):
        return obj.fornecedor.nome if obj.fornecedor else None

    def get_fornecedor_cpf_cnpj(self, obj):
        return obj.fornecedor.cpf_cnpj if obj.fornecedor else None

    def get_manifestacoes(self, obj):
        # Include manifestações in NFe list view for status determination
        from .models_manifestacao import Manifestacao
        manifestacoes = obj.manifestacoes.all().order_by('-criado_em')
        return ManifestacaoSerializer(manifestacoes, many=True).data


class CertificadoSefazSerializer(serializers.ModelSerializer):
    # Model-backed serializer with optional password for P12 validation
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Accept file on create only; we do not serve raw file bytes through the API
    arquivo = serializers.FileField(write_only=True, required=True)
    arquivo_name = serializers.CharField(read_only=True)

    # Expose read-only fields useful for UI
    tipo = serializers.CharField(read_only=True)
    has_password = serializers.SerializerMethodField(read_only=True)
    
    # Campos detectados automaticamente
    tipo_certificado = serializers.CharField(read_only=True)
    tipo_armazenamento = serializers.CharField(read_only=True)
    cnpj_titular = serializers.CharField(read_only=True)
    cpf_titular = serializers.CharField(read_only=True)
    nome_titular = serializers.CharField(read_only=True)
    apto_manifestacao = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CertificadoSefaz
        fields = ('id', 'nome', 'arquivo', 'arquivo_name', 'uploaded_by', 'created_at', 
                 'validade', 'fingerprint', 'password', 'tipo', 'has_password',
                 'tipo_certificado', 'tipo_armazenamento', 'cnpj_titular', 'cpf_titular', 
                 'nome_titular', 'apto_manifestacao')
        read_only_fields = ('id', 'uploaded_by', 'created_at', 'validade', 'fingerprint', 
                           'arquivo_name', 'tipo', 'has_password', 'tipo_certificado', 
                           'tipo_armazenamento', 'cnpj_titular', 'cpf_titular', 'nome_titular',
                           'apto_manifestacao')

    def get_has_password(self, obj):
        return bool(obj.senha_encrypted)
    
    def get_apto_manifestacao(self, obj):
        """Indica se o certificado é adequado para manifestação de NF-e"""
        return obj.tipo_certificado == 'e-CNPJ'



class ManifestacaoSerializer(serializers.ModelSerializer):
    criado_por = serializers.PrimaryKeyRelatedField(read_only=True)
    certificado_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = Manifestacao
        fields = ('id', 'nfe', 'tipo', 'motivo', 'criado_por', 'criado_em', 'enviado', 'enviado_em', 'status_envio', 'resposta_sefaz', 'audit_metadata', 'certificado_id')
        read_only_fields = ('id', 'criado_por', 'criado_em', 'enviado', 'enviado_em', 'status_envio', 'resposta_sefaz')

    def validate(self, attrs):
        tipo = attrs.get('tipo')
        motivo = attrs.get('motivo')
        # Business rule: motivo required for nao_realizada
        if tipo == 'nao_realizada' and (not motivo or not motivo.strip()):
            raise serializers.ValidationError({'motivo': 'Motivo obrigatório para Operação não Realizada (nao_realizada).'})

        # Enforce justificativa length for 'nao_realizada' (SEFAZ requer 15–255 chars in xJust)
        if tipo == 'nao_realizada' and motivo and motivo.strip():
            l = len(motivo.strip())
            if l < 15 or l > 255:
                raise serializers.ValidationError({'motivo': 'Justificativa deve ter entre 15 e 255 caracteres.'})

        # Business rule: 'ciencia' cannot be recorded after a conclusive manifestation exists
        nfe = self.context.get('nfe') or attrs.get('nfe')
        if tipo == 'ciencia' and nfe:
            from .models_manifestacao import Manifestacao as _Manifestacao
            # Verificar apenas manifestações enviadas com sucesso (status='sent')
            if _Manifestacao.objects.filter(nfe=nfe, tipo__in=('confirmacao', 'desconhecimento', 'nao_realizada'), status_envio='sent').exists():
                raise serializers.ValidationError({'tipo': 'Não é permitido registrar "ciência" após manifestação conclusiva já registrada.'})

        # Limit retificações (ocorrências) to 2 per tipo (NT 2020.001)
        if tipo in ('confirmacao', 'desconhecimento', 'nao_realizada') and nfe:
            from .models_manifestacao import Manifestacao as _Manifestacao
            # Contar apenas manifestações enviadas com sucesso (status='sent')
            existing = _Manifestacao.objects.filter(nfe=nfe, tipo=tipo, status_envio='sent').count()
            if existing >= 2:
                raise serializers.ValidationError({'tipo': 'Máximo de 2 ocorrências permitidas para este tipo de manifestação (retificações).'})

        # Temporal validation: compare to NFe data_emissao
        if nfe and nfe.data_emissao:
            from django.utils import timezone
            delta = timezone.now() - nfe.data_emissao
            days = delta.days if delta else 0
            if tipo == 'ciencia' and days > 10:
                raise serializers.ValidationError({'tipo': 'Ciência da Emissão deve ser registrada em até 10 dias após autorização.'})
            if tipo in ('confirmacao', 'desconhecimento', 'nao_realizada') and days > 180:
                raise serializers.ValidationError({'tipo': 'Eventos conclusivos devem ser registrados em até 180 dias após autorização.'})

        return attrs

    def validate_certificado_id(self, value):
        """Validar ownership e validade do certificado"""
        if value is None:
            return value
        
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request and hasattr(request, 'user') else None
        
        # Buscar certificado
        try:
            cert = CertificadoSefaz.objects.get(id=value)
        except CertificadoSefaz.DoesNotExist:
            raise serializers.ValidationError('Certificado não encontrado.')
        
        # Validar ownership
        if cert.uploaded_by != user:
            raise serializers.ValidationError('Você não tem permissão para usar este certificado.')
        
        # Validar expiração
        from django.utils import timezone
        if cert.validade and cert.validade < timezone.now().date():
            raise serializers.ValidationError('Certificado expirado. Por favor, faça upload de um certificado válido.')
        
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request and getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False) else None
        nfe = validated_data.get('nfe')
        # Ensure nfe passed via view is used
        if not nfe and 'nfe' in self.context:
            nfe = self.context['nfe']

        # Extract certificado_id and get certificado instance
        certificado_id = validated_data.pop('certificado_id', None)
        certificado = None
        if certificado_id:
            try:
                certificado = CertificadoSefaz.objects.get(id=certificado_id)
            except CertificadoSefaz.DoesNotExist:
                pass

        # Determine the target model for `criado_por` to avoid FK type mismatches
        criado_por = None
        try:
            target_model = Manifestacao._meta.get_field('criado_por').remote_field.model
            if user is not None:
                # If request.user is already an instance of the target model, use it
                if isinstance(user, target_model):
                    criado_por = user
                else:
                    # Try to find a matching user in the target model by username or email
                    lookup = {}
                    uname = getattr(user, 'username', None)
                    email = getattr(user, 'email', None)
                    if uname:
                        lookup['username'] = uname
                    if email and 'username' not in lookup:
                        lookup['email'] = email
                    if lookup:
                        try:
                            criado_por = target_model.objects.filter(**lookup).first()
                        except Exception:
                            criado_por = None
        except Exception:
            criado_por = user

        manifestacao = Manifestacao.objects.create(
            criado_por=criado_por,
            certificado=certificado,
            **validated_data
        )
        return manifestacao
