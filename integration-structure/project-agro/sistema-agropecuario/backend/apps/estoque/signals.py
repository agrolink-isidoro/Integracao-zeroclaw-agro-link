from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.fiscal.models import ItemNFe
from .models import Produto, Lote, MovimentacaoEstoque, MovimentacaoStatement
from .utils import ProdutoNFeValidator, FornecedorManager
from .services import create_movimentacao


@receiver(post_save, sender=ItemNFe)
def criar_movimentacao_estoque(sender, instance, created, **kwargs):
    """
    Quando um ItemNFe é salvo, cria movimentação de entrada no estoque.
    Inclui validações robustas e enriquecimento automático de dados.
    Usa o service transacional `create_movimentacao` para garantir atomicidade.
    """
    if created:
        try:
            with transaction.atomic():
                # 1. Validar fornecedor
                fornecedor_autorizado, msg_fornecedor = FornecedorManager.validar_fornecedor_nfe(instance.nfe)
                if not fornecedor_autorizado:
                    raise ValidationError(f"Fornecedor não autorizado: {msg_fornecedor}")

                # 2. Preparar dados do produto
                produto_data = {
                    'codigo': instance.codigo_produto,
                    'nome': instance.descricao,
                    'unidade': instance.unidade_comercial,
                    'custo_unitario': instance.valor_unitario_comercial,
                }

                # 3. Validar e enriquecer dados do produto
                produto_data_validado = ProdutoNFeValidator.validar_produto_nfe(instance, produto_data)

                # 4. Criar ou atualizar produto
                produto, produto_created = Produto.objects.get_or_create(
                    codigo=instance.codigo_produto,
                    defaults=produto_data_validado
                )

                # 5. Atualizar produto existente se necessário
                if not produto_created:
                    # Atualizar campos se estiverem vazios
                    campos_para_atualizar = {}
                    for campo, valor in produto_data_validado.items():
                        if campo != 'codigo' and not getattr(produto, campo, None):
                            campos_para_atualizar[campo] = valor

                    if campos_para_atualizar:
                        for campo, valor in campos_para_atualizar.items():
                            setattr(produto, campo, valor)
                        produto.save()

                # 6. Criar lote se aplicável
                lote = None
                if hasattr(instance, 'numero_lote') and instance.numero_lote:
                    lote, lote_created = Lote.objects.get_or_create(
                        produto=produto,
                        numero_lote=instance.numero_lote,
                        defaults={
                            'quantidade_inicial': instance.quantidade_comercial,
                            'quantidade_atual': instance.quantidade_comercial,
                        }
                    )

                # 7. Criar movimentação de entrada usando service transacional
                create_movimentacao(
                    produto=produto,
                    tipo='entrada',
                    quantidade=instance.quantidade_comercial,
                    valor_unitario=instance.valor_unitario_comercial,
                    origem='nfe',
                    lote=lote,
                    documento_referencia=instance.nfe.chave_acesso,
                )

                # 8. Registrar auditoria
                ProdutoNFeValidator.criar_auditoria_produto(
                    produto, instance,
                    'criado' if produto_created else 'atualizado'
                )

                # 9. Registrar fornecedor
                FornecedorManager.registrar_fornecedor_nfe(instance.nfe)

        except ValidationError as e:
            # Log do erro e re-raise
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro ao processar ItemNFe {instance.numero_item} da NFE {instance.nfe.numero}: {str(e)}")
            raise
        except Exception as e:
            # Log de erro inesperado
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erro inesperado ao processar ItemNFe {instance.numero_item}: {str(e)}")
            raise


@receiver(post_delete, sender=MovimentacaoEstoque)
def registrar_delecao_movimentacao(sender, instance, **kwargs):
    """Quando uma movimentação for deletada, registrar uma declaração indicando remoção/reversão.

    Segurança: nunca acessar `instance.<related>` diretamente porque o related-object pode
    ter sido removido e provocar DoesNotExist durante o post_delete. Resolver via `_id`
    e buscar com `Model.objects.filter(pk=...).first()` (retorna None se não existir).
    """
    try:
        # Produto (snapshot) — não usar descriptor que pode lançar DoesNotExist
        produto_obj = None
        if getattr(instance, 'produto_id', None):
            produto_obj = Produto.objects.filter(pk=instance.produto_id).first()
        produto_codigo = produto_obj.codigo if produto_obj else None
        produto_nome = produto_obj.nome if produto_obj else None

        # Resolver demais relacionamentos com segurança (usando _id)
        lote_obj = None
        if getattr(instance, 'lote_id', None):
            lote_obj = Lote.objects.filter(pk=instance.lote_id).first()

        fazenda_obj = None
        if getattr(instance, 'fazenda_id', None):
            from apps.fazendas.models import Fazenda
            fazenda_obj = Fazenda.objects.filter(pk=instance.fazenda_id).first()

        talhao_obj = None
        if getattr(instance, 'talhao_id', None):
            from apps.fazendas.models import Talhao
            talhao_obj = Talhao.objects.filter(pk=instance.talhao_id).first()

        local_armazen_obj = None
        if getattr(instance, 'local_armazenamento_id', None):
            local_armazen_obj = LocalArmazenamento.objects.filter(pk=instance.local_armazenamento_id).first()

        saldo_resultante = produto_obj.quantidade_estoque if produto_obj and hasattr(produto_obj, 'quantidade_estoque') else None

        # Criar statement com snapshots (evitar FK para produto quando possível)
        MovimentacaoStatement.objects.create(
            movimentacao=None,
            produto=None,
            produto_codigo=produto_codigo,
            produto_nome=produto_nome,
            tipo=instance.tipo,
            quantidade=instance.quantidade,
            unidade=(produto_obj.unidade if produto_obj else None),
            valor_unitario=instance.valor_unitario,
            valor_total=instance.valor_total,
            data_movimentacao=instance.data_movimentacao,
            documento_referencia=instance.documento_referencia,
            motivo=(f"DELETED: {instance.motivo}" if instance.motivo else "DELETED"),
            observacoes=f"Movimentacao deletada (id {instance.id})",
            lote=lote_obj,
            fazenda=fazenda_obj,
            talhao=talhao_obj,
            local_armazenamento=local_armazen_obj,
            saldo_resultante=saldo_resultante,
            metadata={'deleted': True},
            criado_por=instance.criado_por
        )
    except Exception:
        import logging
        logging.getLogger(__name__).exception('Erro ao registrar declaração de deleção de movimentação')