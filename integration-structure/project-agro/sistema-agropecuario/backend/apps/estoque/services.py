from decimal import Decimal
import logging
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import F
from django.core.mail import mail_admins
from apps.estoque.models import MovimentacaoEstoque, MovimentacaoStatement, ProdutoAuditoria, Produto

logger = logging.getLogger(__name__)


def create_movimentacao(*, produto: Produto = None, produto_id: int = None, tipo: str, quantidade: Decimal,
                        valor_unitario: Decimal = None, criado_por=None, **extra_fields) -> MovimentacaoEstoque:
    """
    Cria uma MovimentacaoEstoque de forma transacional e atômica.

    - Faz SELECT FOR UPDATE no produto (e lote se informado) para evitar condições de corrida
    - Calcula `saldo_anterior` e `saldo_posterior` e bloqueia operações que resultem em saldo negativo
    - Salva a MovimentacaoEstoque, atualiza os snapshots no correspondente MovimentacaoStatement
    - Garante que a auditoria de produto seja criada

    Args:
        produto: instância de Produto (opcional se produto_id informado)
        produto_id: id do produto (opcional)
        tipo: 'entrada' ou 'saida'
        quantidade: Decimal
        valor_unitario: Decimal (opcional)
        criado_por: usuário dono da operação
        extra_fields: outros campos aceitos por MovimentacaoEstoque (lote, origem, fazenda, talhao, motivo, etc.)

    Returns:
        MovimentacaoEstoque salvo

    Raises:
        ValidationError se operação inválida (ex: saldo negativo)
    """
    if produto is None and produto_id is None:
        raise ValueError("produto ou produto_id deve ser informado")

    if produto is None:
        produto = Produto.objects.select_for_update().get(pk=produto_id)

    # Lock the product row
    with transaction.atomic(savepoint=True):
        try:
            # log entry
            logger.debug("create_movimentacao start: produto=%s tipo=%s quantidade=%s", produto.pk if produto else produto_id, tipo, quantidade)

            produto = Produto.objects.select_for_update().get(pk=produto.pk)

            saldo_anterior = Decimal(produto.quantidade_estoque or 0)
            quantidade_dec = Decimal(quantidade)

            # Normalize valor_unitario to Decimal if provided and quantize to currency precision (2dp)
            if valor_unitario is not None and not isinstance(valor_unitario, Decimal):
                try:
                    valor_unitario = Decimal(str(valor_unitario))
                except Exception:
                    valor_unitario = None
            if isinstance(valor_unitario, Decimal):
                from decimal import ROUND_HALF_UP
                valor_unitario = valor_unitario.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Allow negative flag (pop once)
            allow_negative = extra_fields.pop('allow_negative', False)

            if tipo == 'entrada':
                saldo_posterior = saldo_anterior + quantidade_dec
            elif tipo == 'saida':
                # For 'saida' we must ensure we are not consuming reserved quantities
                available = saldo_anterior - (produto.quantidade_reservada or 0)
                if quantidade_dec > available and not allow_negative:
                    raise ValidationError("Operação de saída excede a quantidade disponível (considerando reservas)")
                saldo_posterior = saldo_anterior - quantidade_dec
            elif tipo == 'reserva':
                # Reservas não alteram quantidade_estoque but lock quantity via quantidade_reservada
                available = saldo_anterior - (produto.quantidade_reservada or 0)
                if quantidade_dec > available:
                    raise ValidationError("Não há quantidade disponível suficiente para reservar")
                saldo_posterior = saldo_anterior
            elif tipo == 'liberacao':
                # Liberação reduz a quantidade_reservada
                if (produto.quantidade_reservada or 0) < quantidade_dec:
                    raise ValidationError("Quantidade a liberar é maior que a reservada")
                saldo_posterior = saldo_anterior
            elif tipo == 'reversao':
                # Reversão é aceitável; Business logic may add more validations elsewhere
                saldo_posterior = saldo_anterior
            else:
                raise ValidationError(f"Tipo de movimentação inválido: {tipo}")

            # Block negative balances unless explicitly allowed (for entrada/saida)
            if tipo in ('entrada', 'saida') and saldo_posterior < 0 and not allow_negative:
                raise ValidationError("Operação resultaria em saldo negativo; ajuste manual requerido")

            # Prepare movimentacao payload
            payload = {
                'produto': produto,
                'tipo': tipo,
                'quantidade': quantidade_dec,
                'valor_unitario': valor_unitario,
                'criado_por': criado_por,
                'saldo_anterior': saldo_anterior,
                'saldo_posterior': saldo_posterior,
            }
            payload.update(extra_fields)

            # Auto-set tenant from product if not explicitly provided
            if 'tenant' not in payload and 'tenant_id' not in payload:
                if getattr(produto, 'tenant_id', None):
                    payload['tenant'] = produto.tenant

            movimentacao = MovimentacaoEstoque.objects.create(**payload)

            # At this point MovimentacaoEstoque.save() already updated produto.quantidade_estoque and criou statement/auditoria
            # Ensure statement snapshots and cost data are updated atomically
            try:
                logger.debug("Updating MovimentacaoStatement for movimentacao=%s", getattr(movimentacao, 'pk', None))
                stmt = MovimentacaoStatement.objects.filter(movimentacao=movimentacao).order_by('-criado_em').first()
                if stmt:
                    stmt.saldo_anterior = saldo_anterior
                    stmt.saldo_posterior = saldo_posterior
                    stmt.custo_alocado = movimentacao.custo_alocado
                    stmt.rateio = movimentacao.rateio
                    stmt.pendente_rateio = movimentacao.pendente_rateio
                    stmt.custo_fonte = movimentacao.custo_fonte
                    stmt.save()
            except Exception:
                # If statement update fails, log and re-raise to roll back
                logger.exception("Erro atualizando MovimentacaoStatement for movimentacao=%s", getattr(movimentacao, 'pk', None))
                raise
        except Exception:
            # dump traceback for quick debugging in dev
            try:
                import traceback
                with open('/tmp/create_movimentacao_error.log', 'a') as fh:
                    fh.write('\n==== create_movimentacao exception ====' + '\n')
                    fh.write(traceback.format_exc())
            except Exception:
                logger.exception('Falha ao gravar /tmp/create_movimentacao_error.log')
            # re-raise so outer transaction handles rollback and caller can catch
            raise

        # Automatic rateio creation when context exists (e.g., plantio or ordem_servico)
        try:
            from apps.financeiro.models import RateioCusto

            needs_rateio = (
                movimentacao.rateio is None
                and movimentacao.custo_alocado is not None
                and (movimentacao.plantio_id is not None or movimentacao.ordem_servico_id is not None)
            )

            if needs_rateio:
                rateio = RateioCusto.objects.create(
                    titulo=f"Auto-rateio movimentacao {movimentacao.id}",
                    descricao=f"Rateio automático gerado para movimentacao {movimentacao.id}",
                    valor_total=movimentacao.custo_alocado,
                    criado_por=criado_por
                )

                # Mark movimentacao as pending rateio and link
                MovimentacaoEstoque.objects.filter(pk=movimentacao.pk).update(rateio=rateio, pendente_rateio=True)

                # Update statement as well
                if stmt:
                    stmt.rateio = rateio
                    stmt.pendente_rateio = True
                    stmt.save()
        except Exception:
            # Don't silently swallow DB errors; let the transaction roll back
            raise

        # Ensure there is at least one ProdutoAuditoria for the movimentacao
        try:
            ProdutoAuditoria.objects.create(
                produto=produto,
                acao='movimentacao',
                origem=movimentacao.origem or 'manual',
                produto_codigo=produto.codigo,
                produto_nome=produto.nome,
                produto_categoria=produto.categoria,
                produto_unidade=produto.unidade,
                quantidade=movimentacao.quantidade,
                valor_unitario=movimentacao.valor_unitario,
                documento_referencia=movimentacao.documento_referencia,
                observacoes=movimentacao.observacoes,
                criado_por=criado_por
            )
        except Exception:
            # Any failure here should roll back the transaction
            raise

        return movimentacao


def reserve_operacao_stock(operacao, criado_por=None):
    """Reserva as quantidades necessárias para uma operação.

    Cria movimenções do tipo 'reserva' para cada produto em `operacao.produtos_operacao`.
    Levanta ValidationError se qualquer produto não tiver quantidade disponível suficiente.
    """
    from django.core.exceptions import ValidationError as DjangoValidationError

    logger.info("Iniciando reserva de estoque para operacao %s", getattr(operacao, 'pk', None))

    with transaction.atomic():
        # lock all products involved
        for item in operacao.produtos_operacao.select_related('produto').all():
            produto = Produto.objects.select_for_update().get(pk=item.produto.pk)
            try:
                create_movimentacao(produto=produto, tipo='reserva', quantidade=item.quantidade_total, criado_por=criado_por, operacao=operacao, origem='agricultura')
            except DjangoValidationError as e:
                # Log the failure with context
                logger.warning("Falha ao reservar produto %s para operacao %s: %s", produto.pk, getattr(operacao, 'pk', None), str(e))
                raise DjangoValidationError({
                    'produto': produto.pk,
                    'mensagem': str(e)
                })


def commit_reservations_for_operacao(operacao, criado_por=None):
    """Conclui reservas para uma operação e gera as saídas correspondentes (IDEMPOTENTE).

    Para cada produto reservado para a operação, cria:
      1) movimentação 'liberacao' para reduzir quantidade_reservada
      2) movimentação 'saida' que consome o estoque (com custo unitário do produto)
    Após as movimentações, atualiza custo_insumos e custo_total na Operacao.
    
    Idempotente: Verifica se as movimentações já foram criadas antes de criar novas.
    """
    from decimal import Decimal
    from apps.estoque.models import MovimentacaoEstoque
    
    with transaction.atomic():
        total_custo_insumos = Decimal('0')

        for item in operacao.produtos_operacao.select_related('produto').all():
            produto = Produto.objects.select_for_update().get(pk=item.produto.pk)
            q = item.quantidade_total
            custo_unit = produto.custo_unitario  # may be None

            doc_ref = f'Operação #{operacao.pk}'

            # Verificar se a movimentação de liberação já foi feita (idempotência)
            liberacao_exists = MovimentacaoEstoque.objects.filter(
                operacao=operacao,
                produto=produto,
                tipo='liberacao',
                quantidade=q
            ).exists()

            if not liberacao_exists:
                # First release reservation (validates reserved quantity)
                create_movimentacao(
                    produto=produto, tipo='liberacao', quantidade=q,
                    criado_por=criado_por, operacao=operacao, origem='agricultura',
                    documento_referencia=doc_ref,
                )

            # Verificar se a movimentação de saída já foi feita (idempotência)
            saida_exists = MovimentacaoEstoque.objects.filter(
                operacao=operacao,
                produto=produto,
                tipo='saida',
                quantidade=q
            ).exists()

            if not saida_exists:
                # Then create the actual exit (saida) with unit cost for cost tracking
                create_movimentacao(
                    produto=produto, tipo='saida', quantidade=q,
                    valor_unitario=custo_unit,
                    criado_por=criado_por, operacao=operacao, origem='agricultura',
                    documento_referencia=doc_ref,
                )

            if custo_unit:
                total_custo_insumos += Decimal(str(custo_unit)) * Decimal(str(q))

        # Update Operacao.custo_insumos and recompute custo_total
        if total_custo_insumos > 0:
            from apps.agricultura.models import Operacao as OperacaoModel
            op_fresh = OperacaoModel.objects.get(pk=operacao.pk)
            op_fresh.custo_insumos = total_custo_insumos
            op_fresh.calcular_custo_total()  # recompute from all three components
            op_fresh.save(update_fields=['custo_insumos', 'custo_total'])


def release_reservations_for_operacao(operacao, criado_por=None):
    """Libera as reservas associadas a uma operação (por exemplo, ao cancelar) - IDEMPOTENTE.

    Cria movimentações 'liberacao' para cada produto reservado na operação.
    Idempotente: Verifica se a movimentação já foi criada antes de criar uma nova.
    """
    from apps.estoque.models import MovimentacaoEstoque
    
    with transaction.atomic():
        for item in operacao.produtos_operacao.select_related('produto').all():
            produto = Produto.objects.select_for_update().get(pk=item.produto.pk)
            q = item.quantidade_total
            
            # Verificar se a movimentação de liberação já foi feita (idempotência)
            liberacao_exists = MovimentacaoEstoque.objects.filter(
                operacao=operacao,
                produto=produto,
                tipo='liberacao',
                quantidade=q
            ).exists()
            
            if not liberacao_exists:
                # If there is less reserved than q, we still call liberacao which will raise if inconsistent
                create_movimentacao(
                    produto=produto, tipo='liberacao', quantidade=q, 
                    criado_por=criado_por, operacao=operacao, origem='agricultura'
                )


# ============================================
# FASE 1 - COMERCIAL REVAMP: Services de Localização
# ============================================

from apps.estoque.models import Localizacao, ProdutoArmazenado
from django.utils import timezone


class EstoqueLocalizacaoService:
    """Service layer para operações de estoque com localizações - FASE 1"""

    @staticmethod
    def criar_localizacao(dados):
        """Cria uma nova localização de armazenamento."""
        localizacao = Localizacao(**dados)
        localizacao.full_clean()
        localizacao.save()
        return localizacao

    @staticmethod
    def atualizar_capacidade_localizacao(localizacao_id, diferenca_peso):
        """Atualiza a capacidade ocupada de uma localização."""
        localizacao = Localizacao.objects.get(id=localizacao_id)
        nova_ocupacao = localizacao.capacidade_ocupada + diferenca_peso
        
        if nova_ocupacao > localizacao.capacidade_total:
            raise ValidationError(
                f'Capacidade máxima da localização {localizacao.nome} seria excedida. '
                f'Disponível: {localizacao.capacidade_disponivel} kg'
            )
        
        if nova_ocupacao < 0:
            raise ValidationError(f'Capacidade ocupada não pode ser negativa.')
        
        localizacao.capacidade_ocupada = nova_ocupacao
        localizacao.save()

    @staticmethod
    @transaction.atomic
    def movimentar_entre_localizacoes(produto_id, localizacao_origem_id, localizacao_destino_id, 
                                     quantidade, lote, usuario=None, observacoes=None):
        """Movimenta produto entre duas localizações."""
        produto = Produto.objects.get(id=produto_id)
        localizacao_origem = Localizacao.objects.get(id=localizacao_origem_id)
        localizacao_destino = Localizacao.objects.get(id=localizacao_destino_id)
        
        # Verificar produto na origem
        try:
            produto_origem = ProdutoArmazenado.objects.get(
                produto=produto, localizacao=localizacao_origem, lote=lote
            )
        except ProdutoArmazenado.DoesNotExist:
            raise ValidationError(
                f'Produto {produto.nome} (Lote {lote}) não encontrado na origem'
            )
        
        # Validar quantidade
        if produto_origem.quantidade < quantidade:
            raise ValidationError('Quantidade insuficiente')
        
        # Validar capacidade destino
        peso = quantidade
        if localizacao_destino.capacidade_disponivel < peso:
            raise ValidationError(f'Capacidade insuficiente no destino')
        
        # Reduzir na origem
        produto_origem.quantidade -= quantidade
        if produto_origem.quantidade == 0:
            produto_origem.delete()
        else:
            produto_origem.save()
        
        # Adicionar no destino
        produto_destino, _ = ProdutoArmazenado.objects.get_or_create(
            produto=produto, localizacao=localizacao_destino, lote=lote,
            defaults={'quantidade': 0, 'data_entrada': timezone.now().date(), 'status': 'disponivel'}
        )
        produto_destino.quantidade += quantidade
        produto_destino.save()
        
        # Atualizar capacidades
        EstoqueLocalizacaoService.atualizar_capacidade_localizacao(localizacao_origem.id, -peso)
        EstoqueLocalizacaoService.atualizar_capacidade_localizacao(localizacao_destino.id, peso)
        
        # Registrar movimentação
        movimentacao = MovimentacaoEstoque.objects.create(
            produto=produto, tipo='transferencia', origem='manual', quantidade=quantidade,
            data_movimentacao=timezone.now(), localizacao_origem=localizacao_origem,
            localizacao_destino=localizacao_destino,
            documento_referencia=f'TRANSF-{lote}', motivo=f'Transferência entre localizações',
            observacoes=observacoes or f'Lote: {lote}', criado_por=usuario
        )
        
        return movimentacao

    @staticmethod
    def consultar_saldo_por_localizacao(produto_id=None, localizacao_id=None):
        """Consulta saldo de produtos por localização."""
        queryset = ProdutoArmazenado.objects.select_related('produto', 'localizacao')
        
        if produto_id:
            queryset = queryset.filter(produto_id=produto_id)
        if localizacao_id:
            queryset = queryset.filter(localizacao_id=localizacao_id)
        
        return queryset.filter(quantidade__gt=0).order_by('localizacao__nome', 'produto__nome')


