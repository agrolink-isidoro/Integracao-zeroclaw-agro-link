"""
Services para o app financeiro
"""
from decimal import Decimal
from django.db import transaction
from django.db import models
from django.utils import timezone
from ..models import (
    Vencimento, RateioCusto, RateioTalhao, RateioApproval,
    Financiamento, ParcelaFinanciamento, Emprestimo, ParcelaEmprestimo,
    Transferencia, LancamentoFinanceiro
)
from django.contrib.contenttypes.models import ContentType


def transferir_entre_contas(conta_origem, conta_destino, valor, tipo='interno', criado_por=None, descricao=None, pix_key_origem=None, pix_key_destino=None, origem_ct=None, origem_obj=None, destino_ct=None, destino_obj=None, tenant=None):
    """Realiza uma transferência entre contas criande objeto Transferencia e dois lancamentos (saida/entrada).

    Para transferências PIX, `conta_destino` pode ser None (o dinheiro sai para um destinatário
    externo identificado pela chave PIX). Neste caso, apenas o lançamento de saída é criado.

    Retorna a instância de Transferencia criada.
    """
    # Validations: for PIX transfers, require pix keys
    if tipo == 'pix':
        if not pix_key_origem:
            raise ValueError('pix_key_origem é obrigatório para transferências do tipo pix')
        if not pix_key_destino:
            raise ValueError('pix_key_destino é obrigatório para transferências do tipo pix')
    else:
        # For non-PIX transfers, conta_destino is required
        if not conta_destino:
            raise ValueError('conta_destino é obrigatória para transferências do tipo ' + tipo)

    with transaction.atomic():
        _tk = {'tenant': tenant} if tenant else {}
        transfer = Transferencia.objects.create(
            conta_origem=conta_origem,
            conta_destino=conta_destino,
            tipo_transferencia=tipo,
            valor=valor,
            descricao=descricao or '',
            pix_key_origem=pix_key_origem,
            pix_key_destino=pix_key_destino,
            criado_por=criado_por,
            **_tk,
        )

        # set optional generic relations
        if origem_ct and origem_obj:
            transfer.origem_content_type = ContentType.objects.get_for_model(origem_ct) if not isinstance(origem_ct, ContentType) else origem_ct
            transfer.origem_object_id = origem_obj.id if hasattr(origem_obj, 'id') else origem_obj
        if destino_ct and destino_obj:
            transfer.destino_content_type = ContentType.objects.get_for_model(destino_ct) if not isinstance(destino_ct, ContentType) else destino_ct
            transfer.destino_object_id = destino_obj.id if hasattr(destino_obj, 'id') else destino_obj
        transfer.save()

        # Create LancamentoFinanceiro: 'saida' in origem
        LancamentoFinanceiro.objects.create(
            conta=conta_origem,
            tipo='saida',
            valor=valor,
            data=timezone.now().date(),
            descricao=f"Transferencia {transfer.id} -> {descricao or ''}",
            origem_content_type=ContentType.objects.get_for_model(transfer),
            origem_object_id=transfer.id,
            criado_por=criado_por,
            **_tk,
        )

        # Create LancamentoFinanceiro: 'entrada' in destino (only if conta_destino is set)
        if conta_destino:
            LancamentoFinanceiro.objects.create(
                conta=conta_destino,
                tipo='entrada',
                valor=valor,
                data=timezone.now().date(),
                descricao=f"Transferencia {transfer.id} <- {descricao or ''}",
                origem_content_type=ContentType.objects.get_for_model(transfer),
                origem_object_id=transfer.id,
                criado_por=criado_por,
                **_tk,
            )

        return transfer


def pagar_vencimentos_por_transferencia(conta_origem, itens, tipo='interno', dados_bancarios=None, criado_por=None, client_tx_id=None, descricao=None):
    """Paga um ou múltiplos Vencimentos por meio de uma Transferência.

    itens: lista de dicts { 'vencimento': <id>, 'valor': Decimal/str }
    dados_bancarios: dict com campos opcionais (banco, agencia, conta, pix_key, nome_titular, cnpj_cpf, etc.)

    Retorna a Transferencia criada (ou existente se client_tx_id for informado e já existir).
    """
    from ..models import Transferencia, PaymentAllocation, Vencimento
    from decimal import Decimal

    # Idempotency: if client_tx_id provided, return existing
    if client_tx_id:
        existing = Transferencia.objects.filter(client_tx_id=client_tx_id).first()
        if existing:
            return existing

    # Validate inputs
    if not itens or not isinstance(itens, (list, tuple)):
        raise ValueError('itens é obrigatório e deve ser uma lista de alocações')

    total = Decimal('0.00')
    processed_items = []
    for it in itens:
        venc_id = it.get('vencimento')
        valor = Decimal(str(it.get('valor')))
        if valor <= 0:
            raise ValueError('valor de cada item deve ser maior que zero')
        total += valor
        processed_items.append({'vencimento': venc_id, 'valor': valor})

    # PIX validation
    if tipo == 'pix':
        if not dados_bancarios or not (dados_bancarios.get('pix_key') or dados_bancarios.get('pix_key_origem') or dados_bancarios.get('pix_key_destino')):
            raise ValueError('Chave PIX é obrigatória para transferências do tipo pix')

    with transaction.atomic():
        # Create Transferencia
        status = 'settled' if tipo in ['pix', 'interno'] else 'pending'
        # Resolve conta_destino to instance when an id is provided
        conta_destino_obj = None
        if dados_bancarios and dados_bancarios.get('conta_destino'):
            try:
                conta_destino_obj = Transferencia._meta.get_field('conta_destino').related_model.objects.get(pk=dados_bancarios.get('conta_destino'))
            except Exception:
                conta_destino_obj = None

        transfer = Transferencia.objects.create(
            conta_origem=conta_origem,
            conta_destino=conta_destino_obj,
            tipo_transferencia=tipo,
            valor=total,
            descricao=descricao or '',
            pix_key_origem=dados_bancarios.get('pix_key_origem') if dados_bancarios else None,
            pix_key_destino=dados_bancarios.get('pix_key_destino') if dados_bancarios else None,
            status=status,
            payment_metadata=dados_bancarios or {},
            client_tx_id=client_tx_id,
            criado_por=criado_por
        )

        # Create allocations and update vencimentos
        for it in processed_items:
            venc = Vencimento.objects.select_for_update().get(pk=it['vencimento'])
            alloc = PaymentAllocation.objects.create(
                transferencia=transfer,
                vencimento=venc,
                valor_alocado=it['valor']
            )

            # If transfer is settled (PIX/interno) and allocation covers the full value, mark as paid
            if transfer.status == 'settled':
                if it['valor'] >= venc.valor:
                    venc.status = 'pago'
                    venc.data_pagamento = timezone.now().date()
                    venc.save()
                else:
                    # Partial settled: leave as pending but annotate description
                    venc.descricao = (venc.descricao or '') + f"\nParcialmente pago: R$ {it['valor']} via Transferencia {transfer.id}"
                    venc.save()
            else:
                # For pending transfers (TED/DOC), do not mark vencimento as paid yet; annotate as pending
                venc.descricao = (venc.descricao or '') + f"\nPagamento pendente por transferencia {transfer.id}: R$ {it['valor']}"
                venc.save()

        # Create Lancamentos
        LancamentoFinanceiro.objects.create(
            conta=conta_origem,
            tipo='saida',
            valor=total,
            data=timezone.now().date(),
            descricao=f"Pagamento por transferencia {transfer.id} -> {descricao or ''}",
            origem_content_type=ContentType.objects.get_for_model(transfer),
            origem_object_id=transfer.id,
            criado_por=criado_por
        )

        # If conta_destino present and is a ContaBancaria instance, create entrada
        conta_destino = None
        if dados_bancarios and dados_bancarios.get('conta_destino_obj'):
            conta_destino = dados_bancarios.get('conta_destino_obj')
        elif dados_bancarios and dados_bancarios.get('conta_destino'):
            # try to resolve id
            try:
                conta_destino = Transferencia._meta.get_field('conta_destino').related_model.objects.get(pk=dados_bancarios.get('conta_destino'))
            except Exception:
                conta_destino = None

        if conta_destino:
            LancamentoFinanceiro.objects.create(
                conta=conta_destino,
                tipo='entrada',
                valor=total,
                data=timezone.now().date(),
                descricao=f"Pagamento por transferencia {transfer.id} <- {descricao or ''}",
                origem_content_type=ContentType.objects.get_for_model(transfer),
                origem_object_id=transfer.id,
                criado_por=criado_por
            )

        return transfer


def marcar_transferencia_settled(transferencia, settlement_date=None, external_reference=None, taxa_bancaria=None, payment_metadata=None, criado_por=None):
    """Marca uma transferência pendente como settled (liquidada) e atualiza vinculações.

    - Se já estiver settled, é idempotente e retorna a instância.
    - Cria entrada na conta_destino caso não exista.
    - Atualiza vencimentos ligados via PaymentAllocation: se a transferência agora for settled, marca vencimentos pagos quando cobertos.
    """
    from ..models import LancamentoFinanceiro, PaymentAllocation, Vencimento

    if transferencia.status == 'settled':
        # Already settled: nothing to do
        return transferencia

    with transaction.atomic():
        transferencia.status = 'settled'
        transferencia.settlement_date = settlement_date or timezone.now().date()
        if external_reference:
            transferencia.external_reference = external_reference
        if taxa_bancaria is not None:
            transferencia.taxa_bancaria = taxa_bancaria
        if payment_metadata:
            # merge or set
            transferencia.payment_metadata = {**(transferencia.payment_metadata or {}), **payment_metadata}
        transferencia.save()

        # Ensure there's an 'entrada' lancamento in conta_destino
        lancs_dest = LancamentoFinanceiro.objects.filter(origem_content_type=ContentType.objects.get_for_model(transferencia), origem_object_id=transferencia.id, tipo='entrada')
        if not lancs_dest.exists() and transferencia.conta_destino:
            LancamentoFinanceiro.objects.create(
                conta=transferencia.conta_destino,
                tipo='entrada',
                valor=transferencia.valor,
                data=transferencia.settlement_date,
                descricao=f"Transferencia {transferencia.id} liquidada",
                origem_content_type=ContentType.objects.get_for_model(transferencia),
                origem_object_id=transferencia.id,
                criado_por=criado_por
            )

        # Update allocations / vencimentos
        allocations = PaymentAllocation.objects.filter(transferencia=transferencia).select_for_update()
        for alloc in allocations:
            venc = alloc.vencimento
            if alloc.valor_alocado >= venc.valor:
                venc.status = 'pago'
                venc.data_pagamento = transferencia.settlement_date
                venc.save()
            else:
                venc.descricao = (venc.descricao or '') + f"\nParcialmente pago (liquidado): R$ {alloc.valor_alocado} via Transferencia {transferencia.id}"
                venc.save()

        return transferencia


def calcular_rateio_por_area(rateio_custo):
    """
    Calcula o rateio de custos baseado na área dos talhões
    """
    if not rateio_custo.talhoes.exists():
        return False

    # Calcular área total (protege contra area_size/area_hectares = None)
    # Sempre retorna Decimal para evitar TypeError ao multiplicar com valor_total
    def _safe_area(talhao):
        a = talhao.area_size if talhao.area_size is not None else (
            talhao.area_hectares if getattr(talhao, 'area_hectares', None) is not None else 0
        )
        val = a or 0
        return Decimal(str(val)) if not isinstance(val, Decimal) else val

    area_total = sum(_safe_area(t) for t in rateio_custo.talhoes.all())
    if area_total == 0:
        # Sem áreas definidas: distribuir igualmente
        n = rateio_custo.talhoes.count()
        area_total = Decimal(n)
        _safe_area = lambda t: Decimal('1')  # noqa: E731 — cada talhão recebe peso igual

    rateio_custo.area_total_hectares = area_total

    # Criar ou atualizar rateios por talhão
    rateios_talhao = []
    for talhao in rateio_custo.talhoes.all():
        proporcao = _safe_area(talhao) / area_total
        valor_rateado = (rateio_custo.valor_total * proporcao).quantize(Decimal('0.01'))

        rateio_talhao, created = RateioTalhao.objects.update_or_create(
            rateio=rateio_custo,
            talhao=talhao,
            defaults={
                'proporcao_area': proporcao,
                'valor_rateado': valor_rateado
            }
        )
        rateios_talhao.append(rateio_talhao)

    rateio_custo.save()
    return rateios_talhao


def gerar_parcelas_financiamento(financiamento):
    """
    Gera parcelas para um financiamento usando o método de cálculo apropriado
    """
    if financiamento.parcelas.exists():
        raise ValueError("Parcelas já foram geradas para este financiamento")

    parcelas_data = financiamento.gerar_parcelas()
    if not parcelas_data:
        return []

    parcelas = []
    data_vencimento = financiamento.data_primeiro_vencimento

    for parcela_data in parcelas_data:
        parcela = ParcelaFinanciamento.objects.create(
            financiamento=financiamento,
            numero_parcela=parcela_data['numero'],
            valor_parcela=parcela_data['valor_parcela'],
            juros=parcela_data['juros'],
            amortizacao=parcela_data['amortizacao'],
            saldo_devedor=parcela_data['saldo_devedor'],
            data_vencimento=data_vencimento
        )
        parcelas.append(parcela)

        # Avançar para o próximo mês
        if data_vencimento.month == 12:
            data_vencimento = data_vencimento.replace(year=data_vencimento.year + 1, month=1)
        else:
            data_vencimento = data_vencimento.replace(month=data_vencimento.month + 1)

    return parcelas


def gerar_parcelas_emprestimo(emprestimo):
    """
    Gera parcelas para um empréstimo usando o método de cálculo apropriado
    """
    if emprestimo.parcelas.exists():
        raise ValueError("Parcelas já foram geradas para este empréstimo")

    parcelas_data = emprestimo.gerar_parcelas()
    if not parcelas_data:
        return []

    parcelas = []
    data_vencimento = emprestimo.data_primeiro_vencimento

    for parcela_data in parcelas_data:
        parcela = ParcelaEmprestimo.objects.create(
            emprestimo=emprestimo,
            numero_parcela=parcela_data['numero'],
            valor_parcela=parcela_data['valor_parcela'],
            juros=parcela_data['juros'],
            amortizacao=parcela_data['amortizacao'],
            saldo_devedor=parcela_data['saldo_devedor'],
            data_vencimento=data_vencimento
        )
        parcelas.append(parcela)

        # Avançar para o próximo mês
        if data_vencimento.month == 12:
            data_vencimento = data_vencimento.replace(year=data_vencimento.year + 1, month=1)
        else:
            data_vencimento = data_vencimento.replace(month=data_vencimento.month + 1)

    return parcelas


def atualizar_status_vencimentos():
    """
    Atualiza o status dos vencimentos baseado na data atual
    """
    hoje = timezone.now().date()

    # Marcar como atrasados vencimentos pendentes com data vencida
    vencimentos_atrasados = Vencimento.objects.filter(
        status='pendente',
        data_vencimento__lt=hoje
    )
    vencimentos_atrasados.update(status='atrasado')

    return {
        'atrasados': vencimentos_atrasados.count()
    }


def criar_vencimento_rateio(rateio_custo, user):
    """
    Cria um vencimento para um rateio aprovado, quando aplicável.
    Apenas cria vencimentos para destinos que representem despesas a pagar
    (ex: 'despesa_adm', 'financeiro'). Para destinos operacionais/investimento
    optamos por registrar contabilização sem gerar vencimento automático.
    """
    if getattr(rateio_custo, 'destino', 'operacional') not in ['despesa_adm', 'financeiro']:
        # Não criar vencimento para rateios que não representam despesas a pagar
        return None

    vencimento = Vencimento.objects.create(
        titulo=f"Rateio: {rateio_custo.titulo}",
        descricao=f"Rateio de custos aprovado - {rateio_custo.descricao}",
        valor=rateio_custo.valor_total,
        data_vencimento=rateio_custo.data_rateio,
        tipo='despesa',
        criado_por=user
    )
    return vencimento


def generate_rateio_from_despesa(despesa):
    """
    Gera um preview do rateio para uma despesa administrativa SEM persistir.
    Retorna lista de dicts com {talhao, talhao_nome, area, proporcao, valor_rateado}
    ou None se não houver talhões (safra sem talhões ou despesa sem safra).
    """
    from apps.administrativo.models import DespesaAdministrativa

    if not isinstance(despesa, DespesaAdministrativa):
        raise ValueError("Objeto deve ser uma DespesaAdministrativa")

    # Obter talhões da safra associada
    talhoes = []
    if hasattr(despesa, 'safra') and despesa.safra:
        talhoes = list(despesa.safra.talhoes.all())

    if not talhoes:
        return None

    area_total = sum(t.area_size for t in talhoes)
    if area_total == 0:
        return None

    parts = []
    for t in talhoes:
        proporcao = t.area_size / area_total
        valor_rateado = despesa.valor * proporcao
        parts.append({
            'talhao': t.id,
            'talhao_nome': str(t),
            'area': float(t.area_size),
            'proporcao': round(float(proporcao), 4),
            'valor_rateado': round(float(valor_rateado), 2),
        })

    return parts


def create_rateio_from_despesa(despesa, created_by):
    """
    Cria um rateio a partir de uma despesa administrativa
    """
    from apps.administrativo.models import DespesaAdministrativa
    from django.contrib.contenttypes.models import ContentType

    if not isinstance(despesa, DespesaAdministrativa):
        raise ValueError("Objeto deve ser uma DespesaAdministrativa")

    # Criar rateio
    rateio = RateioCusto.objects.create(
        titulo=f"Rateio - {despesa.titulo}",
        descricao=f"Rateio automático da despesa {despesa.titulo}",
        valor_total=despesa.valor,
        data_rateio=despesa.data,
        criado_por=created_by,
        safra=getattr(despesa, 'safra', None),
        centro_custo=getattr(despesa, 'centro', None),
        destino='despesa_adm',
        **({'tenant_id': despesa.tenant_id} if getattr(despesa, 'tenant_id', None) else {}),
    )

    # Set origem generic link to the DespesaAdministrativa
    rateio.origem_content_type = ContentType.objects.get_for_model(despesa)
    rateio.origem_object_id = despesa.id
    rateio.save()

    # Adicionar talhões da safra usando add() em vez de set() para evitar criação automática
    if hasattr(despesa, 'safra') and despesa.safra:
        for talhao in despesa.safra.talhoes.all():
            rateio.talhoes.add(talhao)

    # Calcular rateio
    calcular_rateio_por_area(rateio)

    # Criar aprovação pendente se não existir
    RateioApproval.objects.get_or_create(
        rateio=rateio,
        defaults={'criado_por': created_by}
    )

    return rateio


def create_rateio_from_operacao(operacao, created_by=None):
    """
    Cria um rateio a partir de uma operação agrícola (Manejo, Plantio, Colheita).

    O comportamento:
    - Usa `operacao.custo_total` como `valor_total` do Rateio
    - Determina a data a partir do campo de operação (data_manejo/data_plantio/data_colheita)
    - Atribui talhões relacionados (operacao.talhoes ou operacao.plantio.talhoes)
    - Calcula rateios por área e cria uma `RateioApproval` pendente
    - Popula campos: origem (GFK), safra (se aplicável), destino (operacional)
    """
    from django.utils import timezone
    from django.contrib.contenttypes.models import ContentType

    valor = getattr(operacao, 'custo_total', None)
    if not valor or valor == 0:
        raise ValueError('Operação não possui custo_total definido')

    titulo = f"Rateio - Operação #{getattr(operacao, 'id', 'N/A')}"
    descricao = getattr(operacao, 'descricao', '') or f"Rateio automático da operação {operacao.__class__.__name__}"

    # Determinar data
    data = None
    if hasattr(operacao, 'data_manejo'):
        data = operacao.data_manejo
    elif hasattr(operacao, 'data_plantio'):
        data = operacao.data_plantio
    elif hasattr(operacao, 'data_colheita'):
        data = operacao.data_colheita
    data = data or timezone.now().date()

    # Determine safra if operacao has plantio
    safra = getattr(operacao, 'plantio', None) if hasattr(operacao, 'plantio') else None

    rateio = RateioCusto.objects.create(
        titulo=titulo,
        descricao=descricao,
        valor_total=valor,
        data_rateio=data,
        criado_por=created_by,
        safra=safra,
        destino='operacional',
        # Herdar tenant da operação (caso seja TenantModel)
        **({'tenant_id': operacao.tenant_id} if getattr(operacao, 'tenant_id', None) else {}),
    )

    # Set origem generic link to the operation
    rateio.origem_content_type = ContentType.objects.get_for_model(operacao)
    rateio.origem_object_id = getattr(operacao, 'id', None)
    rateio.save()

    # Adicionar talhões
    talhoes = []
    if hasattr(operacao, 'talhoes') and operacao.talhoes.exists():
        talhoes = list(operacao.talhoes.all())
    elif hasattr(operacao, 'plantio') and getattr(operacao, 'plantio'):
        talhoes = list(operacao.plantio.talhoes.all())

    for t in talhoes:
        rateio.talhoes.add(t)

    calcular_rateio_por_area(rateio)

    RateioApproval.objects.get_or_create(
        rateio=rateio,
        defaults={'criado_por': created_by}
    )

    return rateio


def create_rateios_proporcional_safras(valor, titulo, data, source_obj, destino='manutencao', created_by=None):
    """
    Distribui um custo (valor) proporcionalmente entre todas as safras (Plantio)
    com status 'em_andamento', pela área total de seus talhões.

    Cria um RateioCusto auto-aprovado para cada safra e calcula o rateio por área
    dentro de cada uma.

    Args:
        valor: Decimal ou float — o custo total a distribuir
        titulo: str — título base do rateio
        data: date — data de referência do rateio
        source_obj: model instance — origem do custo (OrdemServico, Abastecimento…)
        destino: str — valor válido de RateioCusto.DESTINO_CHOICES (padrão: 'manutencao')
        created_by: User | None — usuário responsável

    Returns:
        list[RateioCusto] — rateios criados
    """
    from decimal import Decimal
    from django.utils import timezone
    from django.contrib.contenttypes.models import ContentType
    from apps.agricultura.models import Plantio

    valor = Decimal(str(valor))
    if valor <= 0:
        return []

    safras = list(Plantio.objects.filter(status='em_andamento').prefetch_related('talhoes'))
    if not safras:
        return []

    # ---- Calcular área total de todas as safras em andamento ----
    def area_safra(s):
        total = Decimal('0')
        for t in s.talhoes.all():
            a = t.area_hectares if t.area_hectares is not None else (t.area_size if t.area_size is not None else 0)
            total += Decimal(str(a))
        return total

    areas = {s.id: area_safra(s) for s in safras}
    area_total = sum(areas.values())

    if area_total == 0:
        # Sem área definida: distribuir igualmente
        area_total = Decimal(len(safras))
        areas = {s.id: Decimal('1') for s in safras}

    rateios_criados = []
    data_ref = data or timezone.now().date()

    for safra in safras:
        area_s = areas[safra.id]
        if area_s <= 0:
            continue
        proporcao = area_s / area_total
        valor_safra = (valor * proporcao).quantize(Decimal('0.01'))
        if valor_safra <= 0:
            continue

        rateio = RateioCusto.objects.create(
            titulo=titulo,
            descricao=(
                f"Rateio automático proporcional por área "
                f"({float(proporcao * 100):.1f}% de R${valor:.2f})"
            ),
            valor_total=valor_safra,
            data_rateio=data_ref,
            criado_por=created_by,
            safra=safra,
            destino=destino,
            **({'tenant_id': source_obj.tenant_id} if getattr(source_obj, 'tenant_id', None) else {}),
        )

        # Vincular origem (GFK)
        rateio.origem_content_type = ContentType.objects.get_for_model(source_obj)
        rateio.origem_object_id = source_obj.pk
        rateio.save()

        for talhao in safra.talhoes.all():
            rateio.talhoes.add(talhao)

        calcular_rateio_por_area(rateio)

        # ---- Auto-aprovar ----
        # O signal create_rateio_approval já cria o RateioApproval ao salvar o RateioCusto.
        # Aqui apenas o aprovamos automaticamente.
        try:
            approval = rateio.approval
        except RateioApproval.DoesNotExist:
            approval = RateioApproval.objects.create(rateio=rateio, criado_por=created_by)

        if approval.status != 'approved':
            approver = created_by
            if not approver:
                from django.contrib.auth import get_user_model
                approver = get_user_model().objects.filter(is_superuser=True).first()
            if approver:
                approval.approve(
                    approver,
                    comentario='Auto-aprovado: custo de maquinário distribuído entre safras em andamento por área'
                )
            else:
                approval.status = 'approved'
                from django.utils import timezone as tz
                approval.aprovado_em = tz.now()
                approval.save(update_fields=['status', 'aprovado_em'])

        rateios_criados.append(rateio)

    return rateios_criados


def parse_bank_statement_text(text):
    """Parses CSV-like bank statement `text` and returns (preview, errors, rows_count).

    Robust to common amount formats ("1.234,56", "1,234.56", "1000.50"),
    date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) and forgiving of missing fields.
    """
    import io, csv, datetime, decimal, re

    def parse_amount(s):
        s = (s or '').strip()
        if not s:
            return decimal.Decimal('0')
        s = s.replace(' ', '')
        # If both '.' and ',' present: treat '.' as thousands and ',' as decimal
        if '.' in s and ',' in s:
            s = s.replace('.', '').replace(',', '.')
        elif ',' in s and '.' not in s:
            # treat ',' as decimal separator
            s = s.replace(',', '.')
        else:
            # remove stray thousands commas
            s = s.replace(',', '')
        # remove any non-numeric except '-' and '.'
        s = re.sub(r"[^0-9\-\.]", '', s)
        return decimal.Decimal(s)

    def parse_date(s):
        s = (s or '').strip()
        if not s:
            return None
        # Try ISO first
        try:
            return datetime.date.fromisoformat(s)
        except Exception:
            pass
        # Try DD/MM/YYYY or DD-MM-YYYY
        for fmt in ('%d/%m/%Y', '%d-%m-%Y'):
            try:
                return datetime.datetime.strptime(s, fmt).date()
            except Exception:
                continue
        # Last resort: try parsing as YYYY/MM/DD
        for fmt in ('%Y/%m/%d', '%Y-%m-%d'):
            try:
                return datetime.datetime.strptime(s, fmt).date()
            except Exception:
                continue
        return None

    preview = []
    errors = []
    reader = csv.DictReader(io.StringIO(text))
    rownum = 0
    for row in reader:
        rownum += 1
        try:
            raw_date = (row.get('date') or row.get('data') or '').strip()
            date_val = parse_date(raw_date)
            amt_text = (row.get('amount') or row.get('valor') or '0')
            amount = parse_amount(amt_text)
            description = (row.get('description') or row.get('descricao') or '').strip()
            external_id = (row.get('external_id') or row.get('id') or '').strip() or None
            balance_text = (row.get('balance') or row.get('saldo') or '').strip()
            balance = parse_amount(balance_text) if balance_text else None

            preview.append({
                'external_id': external_id,
                'date': date_val.isoformat() if date_val else None,
                'amount': str(amount),
                'description': description,
                'balance': str(balance) if balance is not None else None,
            })
        except Exception as e:
            errors.append({'row': rownum, 'error': str(e)})

    return preview, errors, len(preview)


@transaction.atomic
def process_bank_statement_import(import_id):
    """Processa uma importação existente identificada por `import_id`.

    This function is safe to call synchronously (fallback) or from Celery task.
    It updates the `BankStatementImport` object with rows_count, errors_count and status.
    """
    import io, decimal
    from ..models import BankStatementImport, BankTransaction

    imp = BankStatementImport.objects.select_for_update().get(id=import_id)

    if imp.arquivo_hash and BankStatementImport.objects.filter(arquivo_hash=imp.arquivo_hash, status='success').exclude(id=imp.id).exists():
        # Already imported successfully previously — mark this import as failed/duplicate
        imp.status = 'failed'
        imp.errors_count = 0
        imp.rows_count = 0
        imp.save()
        return {
            'status': 'duplicate',
            'import_id': imp.id
        }

    # Read file content
    try:
        content = imp.arquivo.read()
        if isinstance(content, bytes):
            try:
                text = content.decode('utf-8')
            except Exception:
                text = content.decode('latin-1')
        else:
            text = str(content)
    except Exception:
        imp.status = 'failed'
        imp.errors_count = 0
        imp.rows_count = 0
        imp.save()
        return {'status': 'error', 'error': 'cannot read file', 'import_id': imp.id}

    preview, errors, rows_count = parse_bank_statement_text(text)

    import logging
    logger = logging.getLogger(__name__)

    rows_created = 0
    errors_count = 0
    for item in preview:
        try:
            date_val = item['date']
            if date_val:
                # ensure stored as date
                import datetime
                date_obj = datetime.date.fromisoformat(date_val)
            else:
                date_obj = None

            tx = BankTransaction.objects.create(
                importacao=imp,
                external_id=item['external_id'],
                date=date_obj,
                amount=decimal.Decimal(item['amount']),
                description=item['description'],
                balance=(decimal.Decimal(item['balance']) if item['balance'] else None),
                raw_payload=item
            )

            # Try to auto-match this bank transaction to a pending Transferencia
            try:
                match_bank_transaction_to_transfer(tx)
            except Exception:
                logger.exception(f"Error matching transaction {tx.id} to transfer")

            rows_created += 1
        except Exception as e:
            # Log exception details so tests/CI surface errors clearly
            logger.exception(f"Failed creating BankTransaction for import {imp.id} row {item}: {e}")
            errors_count += 1

    imp.rows_count = rows_created
    imp.errors_count = errors_count
    imp.status = 'success' if errors_count == 0 else 'failed'
    imp.save()

    return {
        'status': imp.status,
        'rows_count': imp.rows_count,
        'errors_count': imp.errors_count,
        'import_id': imp.id
    }


def match_bank_transaction_to_transfer(transaction):
    """Attempt to match a BankTransaction to a pending Transferencia and mark it settled.

    Matching strategy (in order):
    1. Match by external_id -> transferencia.external_reference
    2. Match by amount + conta (statement conta == transferencia.conta_destino) + date (same day or within 1 day)

    If matched, calls marcar_transferencia_settled and returns the Transferencia instance, else returns None.
    """
    from ..models import Transferencia, BankStatementImport
    import datetime

    # Normalize values
    ext_id = transaction.external_id
    amount = transaction.amount
    tx_date = transaction.date
    stmt_conta = transaction.importacao.conta

    # 1) Try external_id match
    if ext_id:
        tr = Transferencia.objects.filter(external_reference=ext_id).order_by('-data').first()
        if tr and tr.status != 'settled':
            marcar_transferencia_settled(tr, settlement_date=tx_date or None, external_reference=ext_id, payment_metadata={'matched_by': 'external_id', 'bank_tx_id': transaction.id})
            return tr

    # 2) Try amount + conta_destino + date proximity
    # Only attempt this when transaction date is present (to reduce false positives)
    if not tx_date:
        return None

    # Ensure tx_date is a date object
    if isinstance(tx_date, str):
        try:
            tx_date = datetime.date.fromisoformat(tx_date)
        except Exception:
            return None

    # prefer matching allocations linked to vencimentos (more reliable)
    start = tx_date - datetime.timedelta(days=1)
    end = tx_date + datetime.timedelta(days=1)
    q = Transferencia.objects.filter(conta_destino=stmt_conta, status='pending', allocations__vencimento__data_vencimento__gte=start, allocations__vencimento__data_vencimento__lte=end, allocations__valor_alocado=amount)
    tr = q.order_by('-data').distinct().first()
    if not tr:
        # fallback: match by transfer.valor and data proximity
        q2 = Transferencia.objects.filter(valor=amount, conta_destino=stmt_conta, status='pending')
        q2 = q2.filter(data__date__gte=start, data__date__lte=end)
        tr = q2.order_by('-data').first()

    if tr:
        # use transaction.external_id as external_reference when present
        marcar_transferencia_settled(tr, settlement_date=tx_date or None, external_reference=transaction.external_id or tr.external_reference, payment_metadata={'matched_by': 'amount+date+conta', 'bank_tx_id': transaction.id, 'bank_description': transaction.description})
        return tr

    return None

    return None


def resumo_financeiro(data_referencia=None, tenant=None):
    """
    Retorna um resumo financeiro completo
    """
    if data_referencia is None:
        data_referencia = timezone.now().date()

    _tf = {'tenant': tenant} if tenant else {}

    # Vencimentos
    vencimentos = Vencimento.objects.filter(**_tf)
    resumo_vencimentos = {
        'total_pendente': vencimentos.filter(status='pendente').aggregate(
            total=models.Sum('valor'))['total'] or Decimal('0'),
        'total_pago': vencimentos.filter(status='pago').aggregate(
            total=models.Sum('valor'))['total'] or Decimal('0'),
        'total_atrasado': vencimentos.filter(status='atrasado').aggregate(
            total=models.Sum('valor'))['total'] or Decimal('0'),
        'count_pendente': vencimentos.filter(status='pendente').count(),
        'count_pago': vencimentos.filter(status='pago').count(),
        'count_atrasado': vencimentos.filter(status='atrasado').count(),
    }

    # Financiamentos
    financiamentos = Financiamento.objects.filter(status='ativo', **_tf)
    resumo_financiamentos = {
        'total_financiado': financiamentos.aggregate(
            total=models.Sum('valor_financiado'))['total'] or Decimal('0'),
        'total_pendente': sum(f.valor_pendente for f in financiamentos),
        'count_ativos': financiamentos.count(),
    }

    # Empréstimos
    emprestimos = Emprestimo.objects.filter(status='ativo', **_tf)
    resumo_emprestimos = {
        'total_emprestado': emprestimos.aggregate(
            total=models.Sum('valor_emprestimo'))['total'] or Decimal('0'),
        'total_pendente': sum(e.valor_pendente for e in emprestimos),
        'count_ativos': emprestimos.count(),
    }

    return {
        'vencimentos': resumo_vencimentos,
        'financiamentos': resumo_financiamentos,
        'emprestimos': resumo_emprestimos,
        'data_referencia': data_referencia
    }


def validar_transicao_status_vencimento(vencimento, novo_status):
    """
    Valida se uma transição de status é permitida
    """
    transicoes_permitidas = {
        'pendente': ['pago', 'cancelado', 'atrasado'],
        'atrasado': ['pago', 'cancelado'],
        'pago': [],  # Status final
        'cancelado': [],  # Status final
    }

    if novo_status not in transicoes_permitidas.get(vencimento.status, []):
        raise ValueError(f"Transição de '{vencimento.status}' para '{novo_status}' não é permitida")

    return True


def validar_transicao_status_parcela(parcela, novo_status):
    """
    Valida se uma transição de status de parcela é permitida
    """
    transicoes_permitidas = {
        'pendente': ['pago', 'cancelado', 'atrasado'],
        'atrasado': ['pago', 'cancelado'],
        'pago': [],  # Status final
        'cancelado': [],  # Status final
    }

    if novo_status not in transicoes_permitidas.get(parcela.status, []):
        raise ValueError(f"Transição de '{parcela.status}' para '{novo_status}' não é permitida")

    return True


@transaction.atomic
def aprovar_rateio(rateio_approval, user, comentario=None):
    """
    Aprova um rateio e cria o vencimento correspondente
    """
    rateio_approval.approve(user, comentario)

    # Criar vencimento
    vencimento = criar_vencimento_rateio(rateio_approval.rateio, user)

    return rateio_approval, vencimento


def bulk_atualizar_status_vencimentos(vencimento_ids, novo_status, user):
    """
    Atualiza o status de múltiplos vencimentos
    """
    vencimentos = Vencimento.objects.filter(id__in=vencimento_ids)

    atualizados = []
    for vencimento in vencimentos:
        try:
            validar_transicao_status_vencimento(vencimento, novo_status)
            vencimento.status = novo_status
            if novo_status == 'pago':
                vencimento.data_pagamento = timezone.now().date()
            vencimento.save()
            atualizados.append(vencimento)
        except ValueError:
            continue  # Pular vencimentos que não podem ter o status alterado

    return atualizados


@transaction.atomic
def quitar_vencimento(vencimento, user, valor_pago=None, conta_id=None, data_pagamento=None, reconciliar=False):
    """
    Quita (total ou parcialmente) um `Vencimento` criando um `LancamentoFinanceiro`.

    Regras:
    - Se `valor_pago` for None assume o valor total do vencimento.
    - Se `valor_pago` >= vencimento.valor -> marca como pago.
    - Se `valor_pago` < vencimento.valor -> marca a parte paga como pago e cria um novo `Vencimento` com o restante.
    - Evita duplicar lançamentos quando já existe um `LancamentoFinanceiro` vinculado ao vencimento.
    """
    from django.contrib.contenttypes.models import ContentType
    from ..models import LancamentoFinanceiro, ContaBancaria

    if valor_pago is None:
        valor_pago = vencimento.valor

    ct = ContentType.objects.get_for_model(Vencimento)
    existing = LancamentoFinanceiro.objects.filter(origem_content_type=ct, origem_object_id=vencimento.id).first()
    if existing:
        # Idempotency: se já existe um lançamento vinculado, retorne-o
        return existing

    # Determine tipo do lançamento (saída para despesa, entrada para receita)
    tipo = 'saida' if vencimento.tipo == 'despesa' else 'entrada'

    data_pag = data_pagamento or timezone.now().date()

    conta = None
    if conta_id:
        try:
            conta = ContaBancaria.objects.get(id=conta_id)
        except ContaBancaria.DoesNotExist:
            conta = None

    # Cria lançamento para a parte paga
    lanc = LancamentoFinanceiro.objects.create(
        conta=conta,
        tipo=tipo,
        valor=valor_pago,
        data=data_pag,
        descricao=f'Quitar Vencimento #{vencimento.id} - {vencimento.titulo}',
        origem_content_type=ct,
        origem_object_id=vencimento.id,
        criado_por=user
    )

    if reconciliar:
        lanc.reconciled = True
        lanc.reconciled_at = timezone.now()
        lanc.save()

    # Atualiza o vencimento (total ou parcial)
    if valor_pago >= vencimento.valor:
        vencimento.status = 'pago'
        vencimento.data_pagamento = data_pag
        vencimento.save()
    else:
        # parcial: marca parte paga e cria um novo vencimento para o restante
        restante = vencimento.valor - valor_pago
        # Atualizar vencimento atual para representar a parte paga
        vencimento.valor = valor_pago
        vencimento.status = 'pago'
        vencimento.data_pagamento = data_pag
        vencimento.save()

        # Criar vencimento remanescente
        Vencimento.objects.create(
            titulo=f"{vencimento.titulo} (restante)",
            descricao=f"Parcelamento automático - remanescente de vencimento #{vencimento.id}",
            valor=restante,
            data_vencimento=vencimento.data_vencimento,
            tipo=vencimento.tipo,
            talhao=vencimento.talhao,
            criado_por=vencimento.criado_por
        )

    return lanc


@transaction.atomic
def bulk_quitar_vencimentos(vencimento_ids, user, conta_id=None, data_pagamento=None, reconciliar=False):
    processed = []
    skipped = []
    lancamentos = []

    vencimentos = Vencimento.objects.filter(id__in=vencimento_ids)
    for v in vencimentos:
        try:
            l = quitar_vencimento(v, user, valor_pago=None, conta_id=conta_id, data_pagamento=data_pagamento, reconciliar=reconciliar)
            lancamentos.append(l.id if l else None)
            processed.append(v.id)
        except Exception:
            skipped.append(v.id)
            continue

    return {
        'processed': processed,
        'skipped': skipped,
        'lancamentos': lancamentos
    }