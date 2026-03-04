from django.db.models.signals import post_save
from django.db.models import F
from django.dispatch import receiver
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


# ============================================
# VENDA COLHEITA → SAÍDA DE ESTOQUE
# ============================================

@receiver(post_save, sender='comercial.VendaColheita')
def venda_colheita_saida_estoque(sender, instance, created, **kwargs):
    """
    Ao criar uma VendaColheita, registra uma movimentação de saída no estoque.
    
    A venda pode vir de:
    - silo_bolsa: reduz estoque_atual do silo
    - carga_viagem: reduz peso_total da carga
    
    Se houver produto vinculado, cria MovimentacaoEstoque de saída usando o service transacional.
    """
    if not created:
        return

    try:
        from apps.estoque.services import create_movimentacao
        from apps.estoque.models import Produto

        produto = instance.produto
        quantidade = instance.quantidade

        if not produto:
            # Tentar inferir produto a partir da origem
            if instance.origem_tipo == 'silo_bolsa':
                try:
                    from apps.comercial.models import SiloBolsa
                    silo = SiloBolsa.objects.select_related('carga_viagem__cultura').get(id=instance.origem_id)
                    cultura_nome = silo.carga_viagem.cultura.nome
                    produto = Produto.objects.filter(nome__icontains=cultura_nome).first()
                except Exception:
                    pass
            elif instance.origem_tipo == 'carga_viagem':
                try:
                    from apps.comercial.models import CargaViagem
                    carga = CargaViagem.objects.select_related('cultura').get(id=instance.origem_id)
                    cultura_nome = carga.cultura.nome
                    produto = Produto.objects.filter(nome__icontains=cultura_nome).first()
                except Exception:
                    pass

        if not produto:
            logger.warning(
                "VendaColheita %s: produto não encontrado para gerar saída de estoque.",
                instance.pk,
            )
            return

        criado_por = getattr(instance, 'criado_por', None)

        with transaction.atomic():
            create_movimentacao(
                produto=produto,
                tipo='saida',
                quantidade=quantidade,
                valor_unitario=instance.preco_unitario,
                criado_por=criado_por,
                origem='venda',
                documento_referencia=f'Venda #{instance.pk}',
                motivo=f'Saída por venda de colheita para {instance.cliente.nome if instance.cliente else ""}',
                local_armazenamento=instance.local_armazenamento,
            )

        # Atualizar saldo do SiloBolsa quando origem for silo_bolsa
        if instance.origem_tipo == 'silo_bolsa':
            try:
                from apps.comercial.models import SiloBolsa
                SiloBolsa.objects.filter(id=instance.origem_id).update(
                    estoque_atual=F('estoque_atual') - quantidade
                )
            except Exception:
                logger.exception("Erro ao atualizar estoque do SiloBolsa %s", instance.origem_id)

        logger.info("Saída de estoque criada para VendaColheita %s", instance.pk)

    except Exception:
        logger.exception("Erro ao criar saída de estoque para VendaColheita %s", getattr(instance, 'pk', None))


# ============================================
# COMPRA → NFe AUTOMÁTICA
# ============================================

@receiver(post_save, sender='comercial.Compra')
def try_create_nfe_from_compra(sender, instance, created, **kwargs):
    """Ao salvar uma Compra com `xml_content` tenta criar uma NFe e vincular à compra.

    Regras:
    - `instance.xml_content` deve estar presente
    - `instance.fornecedor` deve estar presente
    - `instance.nfe` deve ser None (idempotência)

    O código reusa a lógica de parsing do `NFeViewSet._extract_nfe_data` quando possível.
    """
    try:
        if not instance.xml_content or not instance.fornecedor:
            return

        if instance.nfe is not None:
            # já vinculada
            return

        # Try to parse NFe XML and create NFe object using NFeViewSet helpers
        from apps.fiscal.views import NFeViewSet
        from xsdata.formats.dataclass.parsers import XmlParser
        from nfelib.nfe.bindings.v4_0.proc_nfe_v4_00 import NfeProc

        xml_content = instance.xml_content

        parser = XmlParser()
        try:
            proc_nfe = parser.from_string(xml_content, NfeProc)
        except Exception as e:
            logger.warning(f"Failed to parse NFe XML for Compra {instance.id}: {e}")
            return

        view = NFeViewSet()
        nfe_data = view._extract_nfe_data(proc_nfe, xml_content)

        # Basic structural validation of chave_acesso
        try:
            from apps.fiscal.utils import validate_chave_acesso
            chave = nfe_data.get('chave_acesso')
            if not chave or not validate_chave_acesso(chave):
                logger.warning(f"Invalid chave_acesso for Compra {instance.id}: {chave}")
                return
        except Exception:
            # continue even if validation utility not available
            pass

        from apps.fiscal.models import NFe
        if NFe.objects.filter(chave_acesso=nfe_data.get('chave_acesso')).exists():
            nfe_obj = NFe.objects.get(chave_acesso=nfe_data.get('chave_acesso'))
            instance.nfe = nfe_obj
            instance.save()
            return

        # Create NFe and items atomically
        from django.db import transaction
        from apps.fiscal.models import ItemNFe

        with transaction.atomic():
            nfe_obj = NFe.objects.create(**nfe_data)
            # associate supplier from the compra when possible
            try:
                if instance.fornecedor is not None:
                    nfe_obj.fornecedor = instance.fornecedor
                    nfe_obj.save()
            except Exception:
                pass

            # process items using view helper
            try:
                view._process_nfe_items(proc_nfe, nfe_obj)
            except Exception as e:
                # If processing items fails, rollback the NFe creation
                logger.exception(f"Failed to create items for NFe from Compra {instance.id}: {e}")
                raise
            instance.nfe = nfe_obj

            # Mapear impostos agregados da NFe para a Compra
            try:
                instance.valor_icms = nfe_obj.valor_icms
                instance.valor_pis = nfe_obj.valor_pis
                instance.valor_cofins = nfe_obj.valor_cofins
            except Exception:
                # não interromper por falha no mapeamento
                logger.exception('Failed to map impostos from NFe to Compra %s', instance.id)

            instance.save()

            # Se o fornecedor estiver com cadastro incompleto, criar notificação in-app e tentar enviar e-mail
            try:
                fornecedor = instance.fornecedor
                missing = []
                for f in ('email', 'cep', 'endereco', 'cidade', 'estado'):
                    if not getattr(fornecedor, f):
                        missing.append(f)
                if missing:
                    # notificação para o usuário que criou o fornecedor, se existir
                    try:
                        from apps.administrativo.models import Notificacao
                        user = fornecedor.criado_por
                        titulo = f"Fornecedor {fornecedor.nome} com cadastro incompleto"
                        mensagem = (
                            f"O fornecedor {fornecedor.nome} (id={fornecedor.id}) foi vinculado à NFe {nfe_obj.chave_acesso} "
                            f"mas está com campos incompletos: {', '.join(missing)}. Por favor complete o cadastro."
                        )
                        if user:
                            Notificacao.objects.create(titulo=titulo, mensagem=mensagem, tipo='warning', prioridade='media', usuario=user)
                    except Exception:
                        # não interromper o fluxo de criação de NFe por erro em notificação
                        logger.exception("Error while creating Notificacao for incomplete fornecedor")

                    # tentativa de envio de e-mail: para o fornecedor (se tiver email) e para admins
                    try:
                        from django.core.mail import send_mail, mail_admins
                        if fornecedor.email:
                            send_mail(titulo, mensagem, 'no-reply@agro.local', [fornecedor.email], fail_silently=True)
                        # sempre notificar administradores
                        mail_admins(titulo, mensagem, fail_silently=True)
                    except Exception:
                        logger.exception("Error while sending notification emails for incomplete fornecedor")
            except Exception:
                logger.exception("Error while checking fornecedor completeness for Compra %s", instance.id)

        logger.info(f"Created NFe (chave={nfe_obj.chave_acesso}) from Compra {instance.id}")

    except Exception:
        logger.exception(f"Error in try_create_nfe_from_compra for Compra {instance.id}")
