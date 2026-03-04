"""
nfe_integrations.py — Services for NFe integration with other modules.

Handles:
1. Parsing <cobr><dup> (duplicatas) from NFe XML
2. Creating Vencimentos from NFe payment data (duplicatas or import_metadata)
3. Auto-creating Cliente from NFe destinatário data
4. Creating stock exit (saída) when NFe is emitted
"""

import logging
import re
from decimal import Decimal
from typing import Optional, Tuple, List, Dict, Any

from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime

logger = logging.getLogger(__name__)


def parse_duplicatas_from_xml(xml_content: str) -> List[Dict[str, Any]]:
    """
    Extrai dados de cobrança (<cobr>) e duplicatas (<dup>) do XML da NFe.
    
    Estrutura NFe XML:
    <cobr>
        <fat>
            <nFat>001</nFat>
            <vOrig>1000.00</vOrig>
            <vDesc>0.00</vDesc>
            <vLiq>1000.00</vLiq>
        </fat>
        <dup>
            <nDup>001</nDup>
            <dVenc>2026-03-15</dVenc>
            <vDup>500.00</vDup>
        </dup>
        <dup>
            <nDup>002</nDup>
            <dVenc>2026-04-15</dVenc>
            <vDup>500.00</vDup>
        </dup>
    </cobr>
    
    Returns list of dicts with keys: numero, data_vencimento, valor
    """
    import xml.etree.ElementTree as ET
    
    duplicatas = []
    
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError:
        logger.warning('parse_duplicatas_from_xml: Failed to parse XML')
        return duplicatas
    
    # Find cobr element (with or without namespace)
    cobr = None
    for elem in root.iter():
        local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
        if local_name == 'cobr':
            cobr = elem
            break
    
    if cobr is None:
        logger.debug('parse_duplicatas_from_xml: No <cobr> element found in XML')
        return duplicatas
    
    # Extract duplicatas
    for dup_elem in cobr.iter():
        local_name = dup_elem.tag.split('}')[-1] if '}' in dup_elem.tag else dup_elem.tag
        if local_name != 'dup':
            continue
        
        dup_data = {}
        for child in dup_elem:
            child_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if child_name == 'nDup':
                dup_data['numero'] = child.text or ''
            elif child_name == 'dVenc':
                try:
                    dup_data['data_vencimento'] = parse_date(child.text) if child.text else None
                except Exception:
                    dup_data['data_vencimento'] = None
            elif child_name == 'vDup':
                try:
                    dup_data['valor'] = Decimal(child.text) if child.text else Decimal('0')
                except Exception:
                    dup_data['valor'] = Decimal('0')
        
        if dup_data.get('valor') and dup_data.get('data_vencimento'):
            duplicatas.append(dup_data)
    
    logger.info('parse_duplicatas_from_xml: Found %d duplicatas', len(duplicatas))
    return duplicatas


def parse_pagamentos_from_xml(xml_content: str) -> List[Dict[str, Any]]:
    """
    Parse <pag><detPag> payment information from NFe XML.
    
    Returns list of dicts with keys: tPag, vPag, tpIntegra, cAut, tBand
    """
    import xml.etree.ElementTree as ET
    
    pagamentos = []
    
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError:
        return pagamentos
    
    pag = None
    for elem in root.iter():
        local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
        if local_name == 'pag':
            pag = elem
            break
    
    if pag is None:
        return pagamentos
    
    for det_elem in pag.iter():
        local_name = det_elem.tag.split('}')[-1] if '}' in det_elem.tag else det_elem.tag
        if local_name != 'detPag':
            continue
        
        pag_data = {}
        for child in det_elem:
            child_name = child.tag.split('}')[-1] if '}' in child.tag else child.tag
            if child_name == 'tPag':
                pag_data['tPag'] = child.text or ''
            elif child_name == 'vPag':
                try:
                    pag_data['vPag'] = Decimal(child.text) if child.text else Decimal('0')
                except Exception:
                    pag_data['vPag'] = Decimal('0')
            elif child_name == 'tBand':
                pag_data['tBand'] = child.text or ''
            elif child_name == 'cAut':
                pag_data['cAut'] = child.text or ''
        
        if pag_data.get('tPag'):
            pagamentos.append(pag_data)
    
    return pagamentos


# Map NFe tPag codes to human-readable descriptions
TPAG_LABELS = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '14': 'Duplicata Mercantil',
    '15': 'Boleto Bancário',
    '16': 'Depósito Bancário',
    '17': 'PIX',
    '18': 'Transferência Bancária',
    '19': 'Cashback',
    '90': 'Sem Pagamento',
    '99': 'Outros',
}


@transaction.atomic
def create_vencimentos_from_nfe(nfe, user=None):
    """
    Create Vencimento records from NFe data.
    
    Priority:
    1. Parse <cobr><dup> from XML — creates one Vencimento per duplicata
    2. If no duplicatas, create single Vencimento from NFe total
    
    Also creates Vencimento for ICMS tax if valor_icms > 0.
    
    Returns list of created Vencimento objects.
    """
    from apps.financeiro.models import Vencimento
    
    created_vencimentos = []
    xml_content = nfe.xml_content or ''
    
    # 1. Parse duplicatas from XML
    duplicatas = parse_duplicatas_from_xml(xml_content) if xml_content else []
    
    if duplicatas:
        for dup in duplicatas:
            venc, was_created = Vencimento.objects.get_or_create(
                titulo=f"Duplicata {dup.get('numero', '')} - NFe {nfe.numero}/{nfe.serie}",
                data_vencimento=dup['data_vencimento'],
                valor=dup['valor'],
                nfe=nfe,
                defaults={
                    'descricao': f"Duplicata {dup.get('numero', '')} da NFe {nfe.chave_acesso}. "
                                 f"Emitente: {nfe.emitente_nome}",
                    'tipo': 'despesa' if nfe.tipo_operacao == '0' else 'receita',
                    'status': 'pendente',
                    'criado_por': user,
                }
            )
            if was_created:
                created_vencimentos.append(venc)
                logger.info('Created Vencimento from duplicata: %s (NFe %s)', venc.titulo, nfe.chave_acesso)
    
    # 2. If no duplicatas found, check pagamento type and create single vencimento
    if not duplicatas:
        pagamentos = parse_pagamentos_from_xml(xml_content) if xml_content else []
        
        for pag in pagamentos:
            tpag = pag.get('tPag', '99')
            vpag = pag.get('vPag', Decimal('0'))
            
            if vpag <= 0 or tpag == '90':  # Sem pagamento
                continue
            
            label = TPAG_LABELS.get(tpag, f'Pagamento ({tpag})')
            
            # For boleto (15) or duplicata mercantil (14), use data_emissao + 30d as proxy
            if tpag in ('14', '15'):
                from datetime import timedelta
                data_venc = nfe.data_emissao.date() + timedelta(days=30)
            else:
                data_venc = nfe.data_emissao.date()
            
            venc, was_created = Vencimento.objects.get_or_create(
                titulo=f"{label} - NFe {nfe.numero}/{nfe.serie}",
                nfe=nfe,
                valor=vpag,
                defaults={
                    'descricao': f"{label} da NFe {nfe.chave_acesso}. Emitente: {nfe.emitente_nome}",
                    'data_vencimento': data_venc,
                    'tipo': 'despesa' if nfe.tipo_operacao == '0' else 'receita',
                    'status': 'pendente',
                    'criado_por': user,
                }
            )
            if was_created:
                created_vencimentos.append(venc)
    
    # 3. ICMS tax vencimento (fix the broken signal - now done here properly)
    if nfe.valor_icms and nfe.valor_icms > 0:
        venc, was_created = Vencimento.objects.get_or_create(
            titulo=f"ICMS - NFe {nfe.numero}/{nfe.serie}",
            nfe=nfe,
            valor=nfe.valor_icms,
            defaults={
                'descricao': f"ICMS retido NFe {nfe.chave_acesso}",
                'data_vencimento': nfe.data_emissao.date(),
                'tipo': 'despesa',
                'status': 'pendente',
                'criado_por': user,
            }
        )
        if was_created:
            created_vencimentos.append(venc)
    
    return created_vencimentos


@transaction.atomic
def create_vencimentos_from_import_metadata(nfe, import_metadata: dict, user=None):
    """
    Create Vencimento records from import_metadata (forma_pagamento).
    Used when importing remote NFes where the user specifies payment terms.
    
    This supplements duplicata-based vencimentos.
    """
    from apps.financeiro.models import Vencimento
    
    forma = import_metadata.get('forma_pagamento', '')
    created = []
    
    if forma == 'boleto':
        vencimento_date = import_metadata.get('vencimento')
        valor = import_metadata.get('valor', nfe.valor_nota)
        
        if isinstance(vencimento_date, str):
            vencimento_date = parse_date(vencimento_date)
        
        if vencimento_date and valor:
            venc, was_created = Vencimento.objects.get_or_create(
                titulo=f"Boleto - NFe {nfe.numero}/{nfe.serie}",
                nfe=nfe,
                defaults={
                    'descricao': f"Boleto da NFe {nfe.chave_acesso}. Emitente: {nfe.emitente_nome}",
                    'valor': Decimal(str(valor)),
                    'data_vencimento': vencimento_date,
                    'tipo': 'despesa',
                    'status': 'pendente',
                    'criado_por': user,
                }
            )
            if was_created:
                created.append(venc)
    
    elif forma == 'avista':
        venc, was_created = Vencimento.objects.get_or_create(
            titulo=f"Pagamento à Vista - NFe {nfe.numero}/{nfe.serie}",
            nfe=nfe,
            defaults={
                'descricao': f"Pagamento à vista da NFe {nfe.chave_acesso}. Emitente: {nfe.emitente_nome}",
                'valor': nfe.valor_nota,
                'data_vencimento': nfe.data_emissao.date(),
                'tipo': 'despesa',
                'status': 'pago',
                'criado_por': user,
            }
        )
        if was_created:
            created.append(venc)
    
    elif forma == 'cartao':
        # Cartao handled separately via TransacaoCartao — create vencimento as reference
        venc, was_created = Vencimento.objects.get_or_create(
            titulo=f"Cartão - NFe {nfe.numero}/{nfe.serie}",
            nfe=nfe,
            defaults={
                'descricao': f"Pagamento por cartão da NFe {nfe.chave_acesso}. Emitente: {nfe.emitente_nome}",
                'valor': nfe.valor_nota,
                'data_vencimento': nfe.data_emissao.date(),
                'tipo': 'despesa',
                'status': 'pendente',
                'criado_por': user,
            }
        )
        if was_created:
            created.append(venc)
    
    elif forma == 'outra':
        obs = import_metadata.get('observacao', '')
        venc, was_created = Vencimento.objects.get_or_create(
            titulo=f"Pagamento - NFe {nfe.numero}/{nfe.serie}",
            nfe=nfe,
            defaults={
                'descricao': f"NFe {nfe.chave_acesso}. {obs}. Emitente: {nfe.emitente_nome}",
                'valor': nfe.valor_nota,
                'data_vencimento': nfe.data_emissao.date(),
                'tipo': 'despesa',
                'status': 'pendente',
                'criado_por': user,
            }
        )
        if was_created:
            created.append(venc)
    
    return created


@transaction.atomic
def reflect_cliente_from_nfe(nfe, user=None, force=False) -> Tuple[Optional[Any], bool, bool, dict]:
    """
    Auto-create or update Cliente from NFe destinatário data.
    
    Similar to reflect_fornecedor_from_nfe but for the sales side (destinatário).
    
    Returns: (cliente, created, updated, divergencias)
    """
    from apps.comercial.models import Cliente
    
    cpf_cnpj = nfe.destinatario_cnpj or nfe.destinatario_cpf
    nome = nfe.destinatario_nome
    
    if not cpf_cnpj and not nome:
        logger.debug('reflect_cliente_from_nfe: No dest data in NFe %s', nfe.chave_acesso)
        return None, False, False, {}
    
    # Normalize CPF/CNPJ to digits only
    cpf_cnpj_digits = re.sub(r'\D', '', cpf_cnpj) if cpf_cnpj else ''
    
    # Try to find existing cliente
    existing = None
    if cpf_cnpj_digits:
        # Match by normalized digits
        for cliente in Cliente.objects.all():
            existing_digits = re.sub(r'\D', '', cliente.cpf_cnpj or '')
            if existing_digits == cpf_cnpj_digits:
                existing = cliente
                break
    
    if existing is None and nome:
        existing = Cliente.objects.filter(nome=nome).first()
    
    if existing:
        # Check for divergences
        divergencias = {}
        if nome and existing.nome != nome:
            divergencias['nome'] = {'atual': existing.nome, 'nfe': nome}
        if cpf_cnpj_digits and re.sub(r'\D', '', existing.cpf_cnpj or '') != cpf_cnpj_digits:
            divergencias['cpf_cnpj'] = {'atual': existing.cpf_cnpj, 'nfe': cpf_cnpj}
        
        if divergencias and not force:
            return existing, False, False, divergencias
        
        if divergencias and force:
            if 'nome' in divergencias:
                existing.nome = nome
            if 'cpf_cnpj' in divergencias:
                existing.cpf_cnpj = cpf_cnpj
            
            # Update email/IE if available
            if nfe.destinatario_email and not existing.email:
                existing.email = nfe.destinatario_email
            if nfe.destinatario_inscricao_estadual and not existing.inscricao_estadual:
                existing.inscricao_estadual = nfe.destinatario_inscricao_estadual
            
            existing.save()
            return existing, False, True, divergencias
        
        return existing, False, False, {}
    
    # Create new cliente
    tipo_pessoa = 'pj' if len(cpf_cnpj_digits) == 14 else 'pf'
    
    cliente = Cliente.objects.create(
        nome=nome or f'Cliente {cpf_cnpj}',
        tipo_pessoa=tipo_pessoa,
        cpf_cnpj=cpf_cnpj or '',
        inscricao_estadual=nfe.destinatario_inscricao_estadual or '',
        email=nfe.destinatario_email or '',
        criado_por=user,
        observacoes=f'Auto-cadastrado a partir da NFe {nfe.chave_acesso}',
    )
    
    logger.info('reflect_cliente_from_nfe: Created Cliente %s from NFe %s', cliente.nome, nfe.chave_acesso)
    return cliente, True, False, {}


@transaction.atomic
def create_stock_exit_from_emission(nfe):
    """
    Create stock exit (saída) movements when an NFe de saída is emitted successfully.
    
    Called when NFe emission is confirmed (status 100 = authorized).
    Only processes NFes with tipo_operacao='1' (saída).
    """
    from apps.estoque.services import create_movimentacao
    from apps.estoque.models import Produto
    from apps.fiscal.models import ItemNFe
    
    if nfe.tipo_operacao != '1':
        logger.debug('create_stock_exit_from_emission: NFe %s is not saída (tipo=%s)', nfe.chave_acesso, nfe.tipo_operacao)
        return []
    
    items = ItemNFe.objects.filter(nfe=nfe)
    created_movements = []
    
    for item in items:
        try:
            # Find matching product
            produto = Produto.objects.filter(codigo=item.codigo_produto).first()
            if not produto:
                produto = Produto.objects.filter(nome__iexact=item.descricao).first()
            
            if not produto:
                logger.warning('create_stock_exit_from_emission: Produto not found for item %s (%s)', 
                             item.codigo_produto, item.descricao)
                continue
            
            mov = create_movimentacao(
                produto=produto,
                tipo='saida',
                quantidade=item.quantidade_comercial,
                valor_unitario=item.valor_unitario_comercial,
                origem='nfe',
                documento_referencia=nfe.chave_acesso,
            )
            created_movements.append(mov)
            logger.info('create_stock_exit_from_emission: Created saída for %s qty=%s', 
                       produto.nome, item.quantidade_comercial)
        except Exception as e:
            logger.error('create_stock_exit_from_emission: Error processing item %s: %s', 
                        item.numero_item, str(e))
    
    return created_movements


def preview_nfe_from_xml(xml_content: str) -> Dict[str, Any]:
    """
    Parse an NFe XML and return a preview dict without persisting anything.
    Used for the frontend preview step before confirming the import.
    """
    import xml.etree.ElementTree as ET
    
    preview = {
        'chave_acesso': '',
        'numero': '',
        'serie': '',
        'data_emissao': '',
        'natureza_operacao': '',
        'emitente': {
            'cnpj': '',
            'nome': '',
            'fantasia': '',
            'inscricao_estadual': '',
        },
        'destinatario': {
            'cnpj': '',
            'cpf': '',
            'nome': '',
            'inscricao_estadual': '',
            'email': '',
        },
        'totais': {
            'valor_produtos': '0.00',
            'valor_nota': '0.00',
            'valor_icms': '0.00',
            'valor_pis': '0.00',
            'valor_cofins': '0.00',
            'valor_ipi': '0.00',
            'valor_frete': '0.00',
            'valor_desconto': '0.00',
        },
        'itens': [],
        'duplicatas': [],
        'pagamentos': [],
        'already_imported': False,
    }
    
    try:
        # Normalize XML
        content = xml_content.strip()
        
        # Try to extract nfeProc or NFe
        m = re.search(r'(<nfeProc[\s\S]*?</nfeProc>)', content, flags=re.IGNORECASE)
        if not m:
            m = re.search(r'(<NFe[\s\S]*?</NFe>)', content, flags=re.IGNORECASE)
        if m:
            content = m.group(1)
        
        root = ET.fromstring(content)
        
        # Find infNFe
        inf = None
        for elem in root.iter():
            local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if local_name == 'infNFe':
                inf = elem
                break
        
        if inf is None:
            return {**preview, 'error': 'infNFe não encontrado no XML'}
        
        def _find(parent, tag_name):
            """Find child element by local name, ignoring namespace."""
            for child in parent:
                local = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                if local == tag_name:
                    return child
            return None
        
        def _text(parent, tag_name, default=''):
            """Get text of child element."""
            elem = _find(parent, tag_name)
            return (elem.text or default) if elem is not None else default
        
        # Chave
        chave_id = inf.get('Id', '')
        if chave_id.startswith('NFe'):
            chave_id = chave_id[3:]
        preview['chave_acesso'] = chave_id
        
        # IDE
        ide = _find(inf, 'ide')
        if ide is not None:
            preview['numero'] = _text(ide, 'nNF')
            preview['serie'] = _text(ide, 'serie')
            preview['data_emissao'] = _text(ide, 'dhEmi') or _text(ide, 'dEmi')
            preview['natureza_operacao'] = _text(ide, 'natOp')
        
        # Emitente
        emit = _find(inf, 'emit')
        if emit is not None:
            preview['emitente'] = {
                'cnpj': _text(emit, 'CNPJ'),
                'nome': _text(emit, 'xNome'),
                'fantasia': _text(emit, 'xFant'),
                'inscricao_estadual': _text(emit, 'IE'),
            }
        
        # Destinatário
        dest = _find(inf, 'dest')
        if dest is not None:
            preview['destinatario'] = {
                'cnpj': _text(dest, 'CNPJ'),
                'cpf': _text(dest, 'CPF'),
                'nome': _text(dest, 'xNome'),
                'inscricao_estadual': _text(dest, 'IE'),
                'email': _text(dest, 'email'),
            }
        
        # Totais
        total_elem = _find(inf, 'total')
        if total_elem is not None:
            icms_tot = _find(total_elem, 'ICMSTot')
            if icms_tot is not None:
                preview['totais'] = {
                    'valor_produtos': _text(icms_tot, 'vProd', '0.00'),
                    'valor_nota': _text(icms_tot, 'vNF', '0.00'),
                    'valor_icms': _text(icms_tot, 'vICMS', '0.00'),
                    'valor_pis': _text(icms_tot, 'vPIS', '0.00'),
                    'valor_cofins': _text(icms_tot, 'vCOFINS', '0.00'),
                    'valor_ipi': _text(icms_tot, 'vIPI', '0.00'),
                    'valor_frete': _text(icms_tot, 'vFrete', '0.00'),
                    'valor_desconto': _text(icms_tot, 'vDesc', '0.00'),
                }
        
        # Items (det)
        items = []
        for elem in inf:
            local_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag
            if local_name == 'det':
                prod = _find(elem, 'prod')
                if prod is not None:
                    items.append({
                        'numero_item': elem.get('nItem', ''),
                        'codigo': _text(prod, 'cProd'),
                        'descricao': _text(prod, 'xProd'),
                        'ncm': _text(prod, 'NCM'),
                        'cfop': _text(prod, 'CFOP'),
                        'unidade': _text(prod, 'uCom'),
                        'quantidade': _text(prod, 'qCom', '0'),
                        'valor_unitario': _text(prod, 'vUnCom', '0.00'),
                        'valor_total': _text(prod, 'vProd', '0.00'),
                    })
        preview['itens'] = items
        
        # Duplicatas
        preview['duplicatas'] = parse_duplicatas_from_xml(xml_content)
        # Convert date objects in duplicatas to strings for JSON serialization
        for dup in preview['duplicatas']:
            if dup.get('data_vencimento') and hasattr(dup['data_vencimento'], 'isoformat'):
                dup['data_vencimento'] = dup['data_vencimento'].isoformat()
            if dup.get('valor') and hasattr(dup['valor'], '__str__'):
                dup['valor'] = str(dup['valor'])
        
        # Pagamentos
        pagamentos = parse_pagamentos_from_xml(xml_content)
        for pag in pagamentos:
            pag['label'] = TPAG_LABELS.get(pag.get('tPag', ''), pag.get('tPag', ''))
            if pag.get('vPag') and hasattr(pag['vPag'], '__str__'):
                pag['vPag'] = str(pag['vPag'])
        preview['pagamentos'] = pagamentos
        
        # Check if already imported
        try:
            from apps.fiscal.models import NFe
            if chave_id and NFe.objects.filter(chave_acesso=chave_id).exists():
                preview['already_imported'] = True
        except Exception:
            pass
        
    except Exception as e:
        logger.error('preview_nfe_from_xml: Error parsing XML: %s', str(e))
        preview['error'] = str(e)
    
    return preview
