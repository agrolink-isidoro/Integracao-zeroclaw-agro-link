# ========================================
# SERIALIZERS PARA CONTRATOS
# ========================================

from rest_framework import serializers
from .models import (
    ContratoCompra, ItemCompra, CondicaoCompra,
    ContratoVenda, ItemVenda, ParcelaVenda, CondicaoVenda,
    ContratoFinanceiro, DadosEmprestimo, DadosConsorcio, DadosSeguro,
    DadosAplicacaoFinanceira, DocumentoAdicionalFinanceiro, CondicaoFinanceira
)


# ========================================
# CONTRATO DE COMPRA SERIALIZERS
# ========================================

class ItemCompraSerializer(serializers.ModelSerializer):
    """Serializer para itens de compra"""
    
    class Meta:
        model = ItemCompra
        fields = [
            'id', 'contrato', 'descricao_item', 'quantidade', 'unidade_medida',
            'preco_unitario', 'subtotal', 'desconto_percentual', 'desconto_valor',
            'produto', 'criado_em'
        ]
        read_only_fields = ['id', 'subtotal', 'criado_em']


class CondicaoCompraSerializer(serializers.ModelSerializer):
    """Serializer para condições de compra"""
    
    tipo_condicao_display = serializers.CharField(source='get_tipo_condicao_display', read_only=True)
    
    class Meta:
        model = CondicaoCompra
        fields = [
            'id', 'contrato', 'tipo_condicao', 'tipo_condicao_display',
            'descricao', 'valor', 'data_vigencia', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class ContratoCompraSerializer(serializers.ModelSerializer):
    """Serializer para Contrato de Compra"""
    
    itens_compra = ItemCompraSerializer(many=True, read_only=True)
    condicoes_compra = CondicaoCompraSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)
    
    class Meta:
        model = ContratoCompra
        fields = [
            'id', 'status', 'status_display', 'valor_total', 'titulo',
            'numero_contrato', 'data_inicio', 'data_fim',
            'fornecedor', 'fornecedor_nome', 'empresa', 'empresa_nome',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
            'itens_compra', 'condicoes_compra'
        ]
        read_only_fields = ['id', 'valor_total', 'criado_em', 'atualizado_em']


# ========================================
# CONTRATO DE VENDA SERIALIZERS
# ========================================

class ItemVendaSerializer(serializers.ModelSerializer):
    """Serializer para itens de venda"""
    
    class Meta:
        model = ItemVenda
        fields = [
            'id', 'contrato', 'descricao_produto', 'quantidade', 'unidade_medida',
            'preco_unitario', 'desconto_item_percentual', 'desconto_item_valor',
            'produto', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class ParcelaVendaSerializer(serializers.ModelSerializer):
    """Serializer para parcelas de venda"""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ParcelaVenda
        fields = [
            'id', 'contrato', 'numero_parcela', 'valor_parcela',
            'data_vencimento', 'status', 'status_display',
            'data_pagamento', 'valor_pago', 'vencimento', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class CondicaoVendaSerializer(serializers.ModelSerializer):
    """Serializer para condições de venda"""
    
    tipo_condicao_display = serializers.CharField(source='get_tipo_condicao_display', read_only=True)
    
    class Meta:
        model = CondicaoVenda
        fields = [
            'id', 'contrato', 'tipo_condicao', 'tipo_condicao_display',
            'descricao', 'valor', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class ContratoVendaSerializer(serializers.ModelSerializer):
    """Serializer para Contrato de Venda"""
    
    itens_venda = ItemVendaSerializer(many=True, read_only=True)
    parcelas_venda = ParcelaVendaSerializer(many=True, read_only=True)
    condicoes_venda = CondicaoVendaSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_completo', read_only=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)
    
    class Meta:
        model = ContratoVenda
        fields = [
            'id', 'status', 'status_display', 'valor_total', 'titulo',
            'numero_contrato', 'numero_parcelas', 'data_inicio', 'data_fim',
            'cliente', 'cliente_nome', 'empresa', 'empresa_nome',
            'rastrear_comissao', 'percentual_comissao',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
            'itens_venda', 'parcelas_venda', 'condicoes_venda'
        ]
        read_only_fields = ['id', 'valor_total', 'criado_em', 'atualizado_em']


# ========================================
# CONTRATO FINANCEIRO SERIALIZERS
# ========================================

class DadosEmprestimoSerializer(serializers.ModelSerializer):
    """Serializer para dados de empréstimo"""
    
    tipo_taxa_display = serializers.CharField(source='get_tipo_taxa_display', read_only=True)
    
    class Meta:
        model = DadosEmprestimo
        fields = [
            'id', 'contrato', 'taxa_juros', 'tipo_taxa', 'tipo_taxa_display',
            'prazo_meses', 'numero_parcelas', 'valor_parcela',
            'data_primeira_parcela', 'data_ultima_parcela', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class DadosConsorcioSerializer(serializers.ModelSerializer):
    """Serializer para dados de consórcio"""
    
    class Meta:
        model = DadosConsorcio
        fields = [
            'id', 'contrato', 'numero_cotas', 'valor_cota',
            'numero_participantes', 'data_contemplacao',
            'taxa_administracao', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class DadosSeguroSerializer(serializers.ModelSerializer):
    """Serializer para dados de seguro"""
    
    class Meta:
        model = DadosSeguro
        fields = [
            'id', 'contrato', 'tipo_seguro', 'premio_anual',
            'franquia', 'cobertura_maxima', 'vigencia_inicio',
            'vigencia_fim', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class DadosAplicacaoFinanceiraSerializer(serializers.ModelSerializer):
    """Serializer para dados de aplicação financeira"""
    
    tipo_aplicacao_display = serializers.CharField(source='get_tipo_aplicacao_display', read_only=True)
    
    class Meta:
        model = DadosAplicacaoFinanceira
        fields = [
            'id', 'contrato', 'tipo_aplicacao', 'tipo_aplicacao_display',
            'valor_aplicado', 'taxa_retorno', 'data_aplicacao',
            'data_vencimento', 'data_resgate', 'valor_resgate', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class DocumentoAdicionalFinanceiroSerializer(serializers.ModelSerializer):
    """Serializer para documentos adicionais"""
    
    tipo_documento_display = serializers.CharField(source='get_tipo_documento_display', read_only=True)
    
    class Meta:
        model = DocumentoAdicionalFinanceiro
        fields = [
            'id', 'contrato', 'tipo_documento', 'tipo_documento_display',
            'descricao', 'url_documento', 'data_upload'
        ]
        read_only_fields = ['id', 'data_upload']


class CondicaoFinanceiraSerializer(serializers.ModelSerializer):
    """Serializer para condições financeiras"""
    
    tipo_condicao_display = serializers.CharField(source='get_tipo_condicao_display', read_only=True)
    
    class Meta:
        model = CondicaoFinanceira
        fields = [
            'id', 'contrato', 'tipo_condicao', 'tipo_condicao_display',
            'descricao', 'valor_percentual', 'valor_absoluto', 'criado_em'
        ]
        read_only_fields = ['id', 'criado_em']


class ContratoFinanceiroSerializer(serializers.ModelSerializer):
    """Serializer para Contrato Financeiro"""
    
    # Dados específicos (escolhemos um por tipo)
    dados_emprestimo = DadosEmprestimoSerializer(read_only=True)
    dados_consorcio = DadosConsorcioSerializer(read_only=True)
    dados_seguro = DadosSeguroSerializer(read_only=True)
    dados_aplicacao_financeira = DadosAplicacaoFinanceiraSerializer(read_only=True)
    documentos_adicionais = DocumentoAdicionalFinanceiroSerializer(many=True, read_only=True)
    condicoes_financeiras = CondicaoFinanceiraSerializer(many=True, read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    produto_financeiro_display = serializers.CharField(source='get_produto_financeiro_display', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    beneficiario_nome = serializers.CharField(source='beneficiario.nome_completo', read_only=True)
    instituicao_nome = serializers.CharField(source='instituicao_financeira.nome', read_only=True)
    empresa_nome = serializers.CharField(source='empresa.nome_fantasia', read_only=True)
    
    class Meta:
        model = ContratoFinanceiro
        fields = [
            'id', 'status', 'status_display', 'produto_financeiro', 'produto_financeiro_display',
            'valor_total', 'valor_entrada', 'titulo', 'numero_contrato',
            'data_vigencia_inicial', 'data_vigencia_final', 'data_assinatura', 'assinado_em',
            'url_documento', 'beneficiario', 'beneficiario_nome',
            'instituicao_financeira', 'instituicao_nome', 'empresa', 'empresa_nome',
            'criado_por', 'criado_por_nome', 'criado_em', 'atualizado_em',
            'dados_emprestimo', 'dados_consorcio', 'dados_seguro',
            'dados_aplicacao_financeira', 'documentos_adicionais', 'condicoes_financeiras'
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']
