"""
Utilitários para validação e processamento de produtos relacionados a NFE.
"""

from typing import Dict, Optional, Tuple
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.fiscal.models import ItemNFe, NFe


class ProdutoNFeValidator:
    """
    Validador para produtos criados ou atualizados via NFE.
    """

    # Mapeamento NCM → Categoria (baseado em padrões comuns)
    NCM_TO_CATEGORIA = {
        # Sementes e mudas
        '1201': 'semente',      # Sementes de soja
        '1202': 'semente',      # Sementes de amendoim
        '1205': 'semente',      # Sementes de girassol
        '1206': 'semente',      # Sementes de linhaça
        '1207': 'semente',      # Sementes de cânhamo
        '1209': 'semente',      # Sementes de plantas forrageiras

        # Fertilizantes
        '3102': 'fertilizante', # Fertilizantes nitrogenados
        '3103': 'fertilizante', # Fertilizantes fosfatados
        '3104': 'fertilizante', # Fertilizantes potássicos
        '3105': 'fertilizante', # Fertilizantes contendo nitrogênio, fósforo e potássio

        # Corretivos
        '2517': 'corretivo',    # Calcário
        '2521': 'corretivo',    # Gesso
        '2530': 'corretivo',    # Minerais de enxofre

        # Defensivos agrícolas
        '3808': 'herbicida',    # Herbicidas
        '3808': 'fungicida',    # Fungicidas
        '3808': 'inseticida',   # Inseticidas
        '3808': 'acaricida',    # Acaricidas

        # Adjuvantes
        '3402': 'adjuvante',    # Tensioativos
        '3907': 'adjuvante',    # Polímeros
    }

    # Regras de validação por categoria
    VALIDATION_RULES = {
        'semente': {
            'requer_principio_ativo': False,
            'requer_vencimento': True,
            'unidades_permitidas': ['kg', 'g', 'sc', 'un'],
        },
        'fertilizante': {
            'requer_principio_ativo': True,
            'requer_vencimento': True,
            'unidades_permitidas': ['kg', 'g', 't', 'L'],
        },
        'corretivo': {
            'requer_principio_ativo': False,
            'requer_vencimento': False,
            'unidades_permitidas': ['kg', 't', 'm3'],
        },
        'herbicida': {
            'requer_principio_ativo': True,
            'requer_vencimento': True,
            'unidades_permitidas': ['L', 'kg', 'g'],
        },
        'fungicida': {
            'requer_principio_ativo': True,
            'requer_vencimento': True,
            'unidades_permitidas': ['L', 'kg', 'g'],
        },
        'inseticida': {
            'requer_principio_ativo': True,
            'requer_vencimento': True,
            'unidades_permitidas': ['L', 'kg', 'g'],
        },
        'acaricida': {
            'requer_principio_ativo': True,
            'requer_vencimento': True,
            'unidades_permitidas': ['L', 'kg', 'g'],
        },
        'adjuvante': {
            'requer_principio_ativo': False,
            'requer_vencimento': True,
            'unidades_permitidas': ['L', 'kg', 'g'],
        },
        # Novas categorias gerais
        'pecas_manutencao': {
            'requer_principio_ativo': False,
            'requer_vencimento': False,
            'unidades_permitidas': ['un']
        },
        'construcao': {
            'requer_principio_ativo': False,
            'requer_vencimento': False,
            'unidades_permitidas': ['kg', 'm3', 'un']
        },
        'correcao_solo': {
            'requer_principio_ativo': False,
            'requer_vencimento': False,
            'unidades_permitidas': ['kg', 't']
        },
    }

    @classmethod
    def mapear_categoria_por_ncm(cls, ncm: str) -> Optional[str]:
        """
        Mapeia NCM para categoria de produto.

        Args:
            ncm: Código NCM (8 dígitos)

        Returns:
            Categoria mapeada ou None se não encontrado
        """
        if not ncm:
            return None

        # Remove pontos e espaços
        ncm_clean = ncm.replace('.', '').replace(' ', '')[:4]  # Usa primeiros 4 dígitos

        return cls.NCM_TO_CATEGORIA.get(ncm_clean)

    @classmethod
    def validar_produto_nfe(cls, item_nfe: ItemNFe, produto_data: Dict) -> Dict:
        """
        Valida e enriquece dados do produto baseado no ItemNFe.

        Args:
            item_nfe: Instância do ItemNFe
            produto_data: Dados do produto a serem validados

        Returns:
            Dados do produto enriquecidos e validados

        Raises:
            ValidationError: Se validação falhar
        """
        enriched_data = produto_data.copy()

        # Mapeamento automático de categoria por NCM
        if not enriched_data.get('categoria') and item_nfe.ncm:
            categoria_mapeada = cls.mapear_categoria_por_ncm(item_nfe.ncm)
            if categoria_mapeada:
                enriched_data['categoria'] = categoria_mapeada

        # Validações específicas por categoria
        categoria = enriched_data.get('categoria')
        if categoria and categoria in cls.VALIDATION_RULES:
            rules = cls.VALIDATION_RULES[categoria]

            # NOTA: Validação de unidade desabilitada para aceitar conformidade com RF
            # As unidades são definidas pela Receita Federal no MOC (Manual de Orientação)
            # Quando a NFe for transmitida para SEFAZ (send_to_sefaz), a RF validará
            # Se estiver fora de conformidade, RF retornará erro e será captado em EmitResult
            # Validação local de unidade causava rejeição de XMLs válidos no frontend
            # - unidade = enriched_data.get('unidade')
            # - if unidade and unidade not in rules['unidades_permitidas']:
            # -     raise ValidationError(...)

            # Validação de princípio ativo
            if rules['requer_principio_ativo'] and not enriched_data.get('principio_ativo'):
                # Tenta extrair do nome/descrição
                principio_ativo = cls._extrair_principio_ativo(item_nfe.descricao)
                if principio_ativo:
                    enriched_data['principio_ativo'] = principio_ativo

        # Validação de EAN
        if item_nfe.ean and len(str(item_nfe.ean)) not in [8, 12, 13, 14]:
            raise ValidationError(f"EAN '{item_nfe.ean}' tem formato inválido")

        # Validação de valores
        if item_nfe.valor_unitario_comercial <= 0:
            raise ValidationError("Valor unitário deve ser maior que zero")

        return enriched_data

    @classmethod
    def validar_fornecedor(cls, item_nfe: ItemNFe) -> Tuple[bool, str]:
        """
        Valida se o fornecedor (emitente) está autorizado.

        Args:
            item_nfe: Item da NFE

        Returns:
            Tupla (autorizado, mensagem)
        """
        # Por enquanto, apenas validação básica
        # Futuramente pode ser expandido para lista de fornecedores autorizados

        emitente = item_nfe.nfe.emitente_nome
        cnpj = item_nfe.nfe.emitente_cnpj

        if not emitente:
            return False, "Emitente não informado na NFE"

        if not cnpj:
            return False, "CNPJ do emitente não informado na NFE"

        # Validação básica de CNPJ (formato)
        cnpj_str = str(cnpj).replace('.', '').replace('/', '').replace('-', '')
        if len(cnpj_str) != 14 or not cnpj_str.isdigit():
            return False, f"CNPJ do emitente inválido: {cnpj}"

        return True, f"Fornecedor autorizado: {emitente}"

    @classmethod
    def _extrair_principio_ativo(cls, descricao: str) -> Optional[str]:
        """
        Tenta extrair princípio ativo da descrição do produto.

        Args:
            descricao: Descrição do produto

        Returns:
            Princípio ativo extraído ou None
        """
        if not descricao:
            return None

        # Padrões comuns em descrições de defensivos
        padroes = [
            r'(\w+(?:\s+\w+)*)\s+\d+(?:\.\d+)?%',  # "Glifosato 480 g/L"
            r'(\w+(?:\s+\w+)*)\s+\d+(?:\.\d+)?\s*g/L',  # "Glifosato 480 g/L"
            r'(\w+(?:\s+\w+)*)\s+\d+(?:\.\d+)?\s*kg/ha',  # "Glifosato 2 kg/ha"
        ]

        import re
        for padrao in padroes:
            match = re.search(padrao, descricao, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    @classmethod
    def criar_auditoria_produto(cls, produto, item_nfe: ItemNFe, acao: str, criado_por=None) -> None:
        """
        Cria registro de auditoria para operações com produtos via NFE.

        Args:
            produto: Instância do produto
            item_nfe: Item da NFE relacionado
            acao: Tipo de ação ('criado', 'atualizado', 'validado')
            criado_por: Usuário que realizou a operação
        """
        from .models import ProdutoAuditoria

        ProdutoAuditoria.objects.create(
            produto=produto,
            acao=acao,
            origem='nfe',
            nfe_numero=item_nfe.nfe.numero,
            nfe_serie=item_nfe.nfe.serie,
            nfe_chave_acesso=item_nfe.nfe.chave_acesso,
            fornecedor_nome=item_nfe.nfe.emitente_nome,
            fornecedor_cnpj=item_nfe.nfe.emitente_cnpj,
            produto_codigo=produto.codigo,
            produto_nome=produto.nome,
            produto_categoria=produto.categoria,
            produto_unidade=produto.unidade,
            quantidade=item_nfe.quantidade_comercial,
            valor_unitario=item_nfe.valor_unitario_comercial,
            documento_referencia=item_nfe.nfe.chave_acesso,
            validacoes_realizadas={
                'categoria_mapeada': bool(cls.mapear_categoria_por_ncm(item_nfe.ncm)),
                'fornecedor_validado': True,
                'ean_validado': len(str(item_nfe.ean or '')) in [0, 8, 12, 13, 14],
            },
            criado_por=criado_por
        )

# Conversão de unidades (base em kg)
UNIT_CONVERSIONS = {
    'kg': 1,
    't': 1000,        # 1 tonelada = 1000 kg
    'saca_60kg': 60   # 1 saca_60kg = 60 kg
}


def convert_to_kg(quantity: float, unit: str) -> float:
    """Converte uma quantidade na unidade informada para kg.

    Args:
        quantity: valor numérico da quantidade
        unit: unidade de medida (ex: 'kg', 't', 'saca_60kg')

    Returns:
        Quantidade em kg
    """
    factor = UNIT_CONVERSIONS.get(unit)
    if factor is None:
        raise ValueError(f"Unidade desconhecida para conversão: {unit}")
    return float(quantity) * factor


def convert_between(quantity: float, from_unit: str, to_unit: str) -> float:
    """Converte uma quantidade de uma unidade para outra usando kg como base.

    Args:
        quantity: valor numérico
        from_unit: unidade de origem
        to_unit: unidade destino

    Returns:
        Quantidade convertida na unidade destino
    """
    kg = convert_to_kg(quantity, from_unit)
    target_factor = UNIT_CONVERSIONS.get(to_unit)
    if target_factor is None:
        raise ValueError(f"Unidade desconhecida para conversão: {to_unit}")
    return kg / target_factor


class FornecedorManager:
    """
    Gerenciador de fornecedores autorizados.
    """

    @staticmethod
    def validar_fornecedor_nfe(nfe: NFe) -> Tuple[bool, str]:
        """
        Valida se o fornecedor da NFE está autorizado.

        Args:
            nfe: Instância da NFE

        Returns:
            Tupla (autorizado, mensagem)
        """
        # Lista básica de fornecedores autorizados (pode ser movida para BD futuramente)
        fornecedores_autorizados = [
            # Adicionar CNPJs de fornecedores confiáveis
        ]

        cnpj = str(nfe.emitente_cnpj).replace('.', '').replace('/', '').replace('-', '')

        if cnpj in fornecedores_autorizados:
            return True, f"Fornecedor autorizado: {nfe.emitente_nome}"

        # Se não há lista específica, permite qualquer fornecedor válido
        return True, f"Fornecedor validado: {nfe.emitente_nome}"

    @staticmethod
    def registrar_fornecedor_nfe(nfe: NFe) -> None:
        """
        Registra fornecedor automaticamente quando NFE é processada.

        Args:
            nfe: Instância da NFE
        """
        # Futuramente pode criar registro em tabela de fornecedores
        pass