import logging
import tempfile
import os
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.gdal import DataSource
import tempfile
import os
import logging
from .models import (
    Proprietario, Fazenda, Area, Talhao, Arrendamento, CotacaoSaca,
    DocumentoArrendamento, ParcelaArrendamento, MatriculaFazenda
)

logger = logging.getLogger(__name__)


class ProprietarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proprietario
        fields = ["id", "nome", "cpf_cnpj", "telefone", "email", "endereco"]
        read_only_fields = ["id", "tenant"]

    def validate_cpf_cnpj(self, value):
        """Valida CPF ou CNPJ."""
        if not value:
            raise serializers.ValidationError("CPF/CNPJ é obrigatório")
        
        # Remove caracteres não numéricos
        clean_value = ''.join(filter(str.isdigit, value))
        
        # Valida tamanho
        if len(clean_value) not in [11, 14]:
            raise serializers.ValidationError(
                "CPF deve ter 11 dígitos ou CNPJ 14 dígitos"
            )
        
        # Valida CPF (11 dígitos)
        if len(clean_value) == 11:
            if not self._is_valid_cpf(clean_value):
                raise serializers.ValidationError("CPF inválido")
        
        # Valida CNPJ (14 dígitos)
        elif len(clean_value) == 14:
            if not self._is_valid_cnpj(clean_value):
                raise serializers.ValidationError("CNPJ inválido")
        
        return value
    
    def _is_valid_cpf(self, cpf):
        """Valida dígitos verificadores do CPF."""
        # Verifica se todos os dígitos são iguais
        if cpf == cpf[0] * 11:
            return False
        
        # Calcula primeiro dígito verificador
        sum_val = sum(int(cpf[i]) * (10 - i) for i in range(9))
        digit1 = 0 if (sum_val * 10 % 11) in [10, 11] else (sum_val * 10 % 11)
        
        if digit1 != int(cpf[9]):
            return False
        
        # Calcula segundo dígito verificador
        sum_val = sum(int(cpf[i]) * (11 - i) for i in range(10))
        digit2 = 0 if (sum_val * 10 % 11) in [10, 11] else (sum_val * 10 % 11)
        
        return digit2 == int(cpf[10])
    
    def _is_valid_cnpj(self, cnpj):
        """Valida dígitos verificadores do CNPJ."""
        # Verifica se todos os dígitos são iguais
        if cnpj == cnpj[0] * 14:
            return False
        
        # Calcula primeiro dígito verificador
        weights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        sum_val = sum(int(cnpj[i]) * weights[i] for i in range(12))
        digit1 = 0 if (sum_val % 11) < 2 else (11 - sum_val % 11)
        
        if digit1 != int(cnpj[12]):
            return False
        
        # Calcula segundo dígito verificador
        weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        sum_val = sum(int(cnpj[i]) * weights[i] for i in range(13))
        digit2 = 0 if (sum_val % 11) < 2 else (11 - sum_val % 11)
        
        return digit2 == int(cnpj[13])


class CotacaoSacaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotacaoSaca
        fields = ["id", "cultura", "data", "preco_por_saca", "fonte"]
        read_only_fields = ["id"]


class TalhaoSerializer(serializers.ModelSerializer):
    area_hectares = serializers.ReadOnlyField()
    kml_file = serializers.FileField(write_only=True, required=False)
    area_size_manual = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False, allow_null=True)
    
    # Campos adicionais para agrupamento no frontend
    area_nome = serializers.CharField(source='area.name', read_only=True)
    fazenda_id = serializers.IntegerField(source='area.fazenda.id', read_only=True)
    fazenda_nome = serializers.CharField(source='area.fazenda.name', read_only=True)

    class Meta:
        model = Talhao
        fields = [
            "id", "area", "area_nome", "fazenda_id", "fazenda_nome",
            "name", "geom", "area_size", "custo_arrendamento", 
            "area_hectares", "kml_file", "area_size_manual"
        ]
        read_only_fields = ["id", "area_hectares", "area_nome", "fazenda_id", "fazenda_nome"]
    
    def _create_approximate_geometry_from_hectares(self, hectares):
        """Cria uma geometria aproximada (quadrado) a partir de hectares."""
        import math
        
        area_m2 = float(hectares) * 10000
        lado_m = math.sqrt(area_m2)
        lado_graus = lado_m / 111320
        
        x_min, y_min = -lado_graus / 2, -lado_graus / 2
        x_max, y_max = lado_graus / 2, lado_graus / 2
        
        wkt = f"POLYGON(({x_min} {y_min}, {x_max} {y_min}, {x_max} {y_max}, {x_min} {y_max}, {x_min} {y_min}))"
        return wkt
    
    def create(self, validated_data):
        kml_file = validated_data.pop('kml_file', None)
        area_size_manual = validated_data.pop('area_size_manual', None)
        
        # Se forneceu KML, processar
        if kml_file:
            try:
                from django.contrib.gis.gdal import DataSource
                import tempfile
                import os
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.kml', mode='wb') as tmp_file:
                    for chunk in kml_file.chunks():
                        tmp_file.write(chunk)
                    tmp_file_path = tmp_file.name
                
                try:
                    ds = DataSource(tmp_file_path)
                    geom_wkt = None
                    for layer in ds:
                        for feature in layer:
                            if feature.geom:
                                geom_wkt = feature.geom.wkt
                                break
                        if geom_wkt:
                            break
                    
                    if geom_wkt:
                        validated_data['geom'] = geom_wkt
                    else:
                        raise serializers.ValidationError("Nenhuma geometria encontrada no arquivo KML")
                finally:
                    if os.path.exists(tmp_file_path):
                        os.unlink(tmp_file_path)
            except serializers.ValidationError:
                raise
            except Exception as e:
                raise serializers.ValidationError(f"Erro ao processar KML: {str(e)}")
        # Se forneceu hectares manual (e não forneceu KML), criar geometria aproximada
        elif area_size_manual:
            try:
                validated_data['geom'] = self._create_approximate_geometry_from_hectares(area_size_manual)
                validated_data['area_size'] = area_size_manual
            except Exception as e:
                raise serializers.ValidationError(f"Erro ao criar geometria: {str(e)}")
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        kml_file = validated_data.pop('kml_file', None)
        area_size_manual = validated_data.pop('area_size_manual', None)
        
        if kml_file:
            try:
                from django.contrib.gis.gdal import DataSource
                import tempfile
                import os
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.kml', mode='wb') as tmp_file:
                    for chunk in kml_file.chunks():
                        tmp_file.write(chunk)
                    tmp_file_path = tmp_file.name
                
                try:
                    ds = DataSource(tmp_file_path)
                    geom_wkt = None
                    for layer in ds:
                        for feature in layer:
                            if feature.geom:
                                geom_wkt = feature.geom.wkt
                                break
                        if geom_wkt:
                            break
                    
                    if geom_wkt:
                        validated_data['geom'] = geom_wkt
                    else:
                        raise serializers.ValidationError("Nenhuma geometria encontrada no arquivo KML")
                finally:
                    if os.path.exists(tmp_file_path):
                        os.unlink(tmp_file_path)
            except serializers.ValidationError:
                raise
            except Exception as e:
                raise serializers.ValidationError(f"Erro ao processar KML: {str(e)}")
        elif area_size_manual:
            try:
                validated_data['geom'] = self._create_approximate_geometry_from_hectares(area_size_manual)
                validated_data['area_size'] = area_size_manual
            except Exception as e:
                raise serializers.ValidationError(f"Erro ao criar geometria: {str(e)}")
        
        return super().update(instance, validated_data)


class AreaSerializer(GeoFeatureModelSerializer):
    talhoes = TalhaoSerializer(many=True, read_only=True)
    kml_file = serializers.FileField(write_only=True, required=False)
    area_hectares_manual = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False, allow_null=True)
    area_hectares = serializers.ReadOnlyField()
    proprietario_nome = serializers.CharField(source='proprietario.nome', read_only=True)
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)

    class Meta:
        model = Area
        geo_field = "geom"
        fields = [
            "id", "proprietario", "proprietario_nome", "fazenda", "fazenda_nome",
            "name", "tipo", "geom", "custo_arrendamento", "area_hectares",
            "talhoes", "kml_file", "area_hectares_manual"
        ]
        read_only_fields = ["id", "area_hectares", "proprietario_nome", "fazenda_nome", "talhoes"]

    def _create_approximate_geometry_from_hectares(self, hectares):
        """Cria uma geometria aproximada (quadrado) a partir de hectares."""
        import math
        
        # Calcular lado do quadrado em graus (aproximado)
        # 1 hectare = 10000 m²
        # Para criar um quadrado, lado = sqrt(hectares * 10000)
        area_m2 = float(hectares) * 10000
        lado_m = math.sqrt(area_m2)
        
        # Converter metros para graus (aproximadamente)
        # 1 grau de latitude ≈ 111320 metros
        # 1 grau de longitude varia com latitude, usamos aproximação no equador
        lado_graus = lado_m / 111320
        
        # Criar um quadrado centralizado em (0, 0) - usuário pode ajustar depois
        # Formato: POLYGON((x1 y1, x2 y2, x3 y3, x4 y4, x1 y1))
        x_min, y_min = -lado_graus / 2, -lado_graus / 2
        x_max, y_max = lado_graus / 2, lado_graus / 2
        
        wkt = f"POLYGON(({x_min} {y_min}, {x_max} {y_min}, {x_max} {y_max}, {x_min} {y_max}, {x_min} {y_min}))"
        return wkt
    
    def _process_kml_file(self, kml_file):
        """Processa arquivo KML e extrai geometria WKT."""
        # Reset file pointer to beginning in case it was read before
        if hasattr(kml_file, 'seek'):
            kml_file.seek(0)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.kml', mode='wb') as tmp_file:
            for chunk in kml_file.chunks():
                tmp_file.write(chunk)
            tmp_file_path = tmp_file.name
        
        try:
            logger.info(f"Processando KML de Área: {tmp_file_path}")
            ds = DataSource(tmp_file_path)
            
            # Itera sobre layers e features para encontrar geometria
            for layer in ds:
                for feature in layer:
                    if feature.geom:
                        geom_wkt = feature.geom.wkt
                        logger.info(f"Geometria extraída: {feature.geom.geom_type}")
                        return geom_wkt
            
            raise serializers.ValidationError("Nenhuma geometria encontrada no arquivo KML")
        finally:
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)

    def create(self, validated_data):
        kml_file = validated_data.pop('kml_file', None)
        area_hectares_manual = validated_data.pop('area_hectares_manual', None)
        
        # Se forneceu KML, processar
        if kml_file:
            try:
                validated_data['geom'] = self._process_kml_file(kml_file)
            except serializers.ValidationError:
                raise
            except Exception as e:
                logger.error(f"Erro ao processar KML: {e}", exc_info=True)
                raise serializers.ValidationError(f"Erro ao processar KML: {str(e)}")
        # Se forneceu hectares manual (e não forneceu KML), criar geometria aproximada
        elif area_hectares_manual:
            try:
                validated_data['geom'] = self._create_approximate_geometry_from_hectares(area_hectares_manual)
            except Exception as e:
                raise serializers.ValidationError(f"Erro ao criar geometria: {str(e)}")
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        kml_file = validated_data.pop('kml_file', None)
        area_hectares_manual = validated_data.pop('area_hectares_manual', None)
        
        if kml_file:
            try:
                validated_data['geom'] = self._process_kml_file(kml_file)
            except serializers.ValidationError:
                raise
            except Exception as e:
                logger.error(f"Erro ao processar KML: {e}", exc_info=True)
                raise serializers.ValidationError(f"Erro ao processar KML: {str(e)}")
        elif area_hectares_manual:
            try:
                validated_data['geom'] = self._create_approximate_geometry_from_hectares(area_hectares_manual)
            except Exception as e:
                raise serializers.ValidationError(f"Erro ao criar geometria: {str(e)}")
        
        return super().update(instance, validated_data)


class ArrendamentoSerializer(serializers.ModelSerializer):
    # Accept both ISO (YYYY-MM-DD) and locale (DD/MM/YYYY) input formats for dates
    start_date = serializers.DateField(input_formats=['%Y-%m-%d', '%d/%m/%Y'])
    end_date = serializers.DateField(input_formats=['%Y-%m-%d', '%d/%m/%Y'], required=False, allow_null=True)

    custo_total_atual = serializers.ReadOnlyField()
    arrendador_detail = ProprietarioSerializer(source='arrendador', read_only=True)
    arrendatario_detail = ProprietarioSerializer(source='arrendatario', read_only=True)
    fazenda_detail = serializers.SerializerMethodField()

    class Meta:
        model = Arrendamento
        fields = [
            "id", "arrendador", "arrendatario", "fazenda", "areas",
            "start_date", "end_date", "custo_sacas_hectare", "custo_total_atual",
            "arrendador_detail", "arrendatario_detail", "fazenda_detail"
        ]
        read_only_fields = ["id", "custo_total_atual", "arrendador_detail", "arrendatario_detail", "fazenda_detail"]

    def get_fazenda_detail(self, obj):
        return {
            'id': obj.fazenda.id,
            'name': obj.fazenda.name,
            'matricula': obj.fazenda.matricula
        }

    def validate(self, data):
        """Validações customizadas para garantir consistência do arrendamento."""
        # 1. Arrendador e arrendatário não podem ser a mesma pessoa
        if data.get('arrendador') == data.get('arrendatario'):
            raise serializers.ValidationError(
                "Arrendador e arrendatário não podem ser a mesma pessoa."
            )

        # 2. Fazenda deve pertencer ao arrendador
        fazenda = data.get('fazenda')
        arrendador = data.get('arrendador')
        if fazenda and arrendador and fazenda.proprietario != arrendador:
            raise serializers.ValidationError(
                f"A fazenda '{fazenda.name}' não pertence ao arrendador '{arrendador.nome}'. "
                f"Somente o proprietário pode arrendar áreas de sua fazenda."
            )

        # 3. Todas as áreas devem pertencer à fazenda selecionada
        areas = data.get('areas', [])
        if areas and fazenda:
            areas_invalidas = [area for area in areas if area.fazenda != fazenda]
            if areas_invalidas:
                nomes = ', '.join([area.name for area in areas_invalidas])
                raise serializers.ValidationError(
                    f"As seguintes áreas não pertencem à fazenda selecionada: {nomes}"
                )

        # 4. Validar datas
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError(
                "A data de fim deve ser posterior à data de início."
            )

        return data


class FazendaSerializer(serializers.ModelSerializer):
    areas = AreaSerializer(many=True, read_only=True)
    proprietario_nome = serializers.CharField(source='proprietario.nome', read_only=True)
    areas_count = serializers.SerializerMethodField()
    total_hectares = serializers.SerializerMethodField()
    todas_matriculas = serializers.SerializerMethodField()

    class Meta:
        model = Fazenda
        fields = ["id", "proprietario", "proprietario_nome", "name", "matricula", "areas", "areas_count", "total_hectares", "todas_matriculas"]
        read_only_fields = ["id"]

    def get_areas_count(self, obj):
        """Retorna o número de áreas da fazenda"""
        return obj.areas.count()

    def get_total_hectares(self, obj):
        """Retorna o total de hectares de todas as áreas da fazenda"""
        total = 0
        for area in obj.areas.all():
            total += area.area_hectares or 0
        return round(total, 2)

    def get_todas_matriculas(self, obj):
        """Retorna todas as matrículas (principal + adicionais)"""
        return obj.get_matriculas_display()


class MatriculaFazendaSerializer(serializers.ModelSerializer):
    """Serializer para armazenar múltiplas matrículas por fazenda"""
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)
    
    class Meta:
        model = MatriculaFazenda
        fields = ["id", "fazenda", "fazenda_nome", "matricula", "ativa", "data_registro"]
        read_only_fields = ["id", "data_registro"]


class ParcelaArrendamentoSerializer(serializers.ModelSerializer):
    """Serializer para ParcelaArrendamento."""
    
    vencimento_status = serializers.CharField(
        source='vencimento.status',
        read_only=True,
        allow_null=True
    )
    vencimento_id = serializers.IntegerField(
        source='vencimento.id',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = ParcelaArrendamento
        fields = [
            'id', 'documento', 'numero_parcela', 'valor', 'data_vencimento',
            'vencimento', 'vencimento_id', 'vencimento_status', 'criado_em'
        ]
        read_only_fields = ['id', 'vencimento', 'vencimento_id', 'vencimento_status', 'criado_em']


class DocumentoArrendamentoSerializer(serializers.ModelSerializer):
    """Serializer para DocumentoArrendamento."""
    
    parcelas = ParcelaArrendamentoSerializer(many=True, read_only=True)
    fazenda_nome = serializers.CharField(source='fazenda.name', read_only=True)
    arrendador_nome = serializers.CharField(source='arrendador.nome', read_only=True)
    arrendatario_nome = serializers.CharField(source='arrendatario.nome', read_only=True)
    talhoes_list = serializers.SerializerMethodField()
    valor_pago = serializers.SerializerMethodField()
    valor_pendente = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentoArrendamento
        fields = [
            'id', 'numero_documento', 'fazenda', 'fazenda_nome',
            'arrendador', 'arrendador_nome', 'arrendatario', 'arrendatario_nome',
            'talhoes', 'talhoes_list', 'data_inicio', 'data_fim', 'valor_total',
            'numero_parcelas', 'periodicidade', 'status', 'observacoes',
            'criado_por', 'criado_em', 'atualizado_em', 'parcelas',
            'valor_pago', 'valor_pendente'
        ]
        read_only_fields = ['id', 'criado_por', 'criado_em', 'atualizado_em', 'parcelas']
    
    def get_talhoes_list(self, obj):
        """Retorna lista simplificada de talhões."""
        return [
            {
                'id': talhao.id,
                'name': talhao.name,
                'area_hectares': talhao.area_hectares
            }
            for talhao in obj.talhoes.all()
        ]
    
    def get_valor_pago(self, obj):
        """Calcula valor já pago."""
        from decimal import Decimal
        total = Decimal('0.00')
        for parcela in obj.parcelas.all():
            if parcela.vencimento and parcela.vencimento.status == 'pago':
                total += parcela.valor
        return float(total)
    
    def get_valor_pendente(self, obj):
        """Calcula valor ainda pendente."""
        from decimal import Decimal
        total = Decimal('0.00')
        for parcela in obj.parcelas.all():
            if parcela.vencimento and parcela.vencimento.status == 'pendente':
                total += parcela.valor
        return float(total)
    
    def validate_numero_documento(self, value):
        """Valida unicidade do número de documento."""
        if self.instance:  # Update
            if DocumentoArrendamento.objects.exclude(id=self.instance.id).filter(numero_documento=value).exists():
                raise serializers.ValidationError("Já existe um documento com este número.")
        else:  # Create
            if DocumentoArrendamento.objects.filter(numero_documento=value).exists():
                raise serializers.ValidationError("Já existe um documento com este número.")
        return value
    
    def validate(self, data):
        """Validações customizadas."""
        # 1. Arrendador e arrendatário não podem ser iguais
        if data.get('arrendador') == data.get('arrendatario'):
            raise serializers.ValidationError(
                "Arrendador e arrendatário não podem ser a mesma pessoa."
            )
        
        # 2. Fazenda deve pertencer ao arrendador
        fazenda = data.get('fazenda')
        arrendador = data.get('arrendador')
        if fazenda and arrendador and fazenda.proprietario != arrendador:
            raise serializers.ValidationError(
                f"A fazenda '{fazenda.name}' não pertence ao arrendador '{arrendador.nome}'."
            )
        
        # 3. Validar datas
        data_inicio = data.get('data_inicio')
        data_fim = data.get('data_fim')
        if data_inicio and data_fim and data_fim <= data_inicio:
            raise serializers.ValidationError(
                "A data de término deve ser posterior à data de início."
            )
        
        # 4. Validar valores
        if data.get('valor_total') and data['valor_total'] <= 0:
            raise serializers.ValidationError("Valor total deve ser maior que zero.")
        
        if data.get('numero_parcelas') and data['numero_parcelas'] <= 0:
            raise serializers.ValidationError("Número de parcelas deve ser maior que zero.")
        
        return data

