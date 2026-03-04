from apps.core.mixins import TenantQuerySetMixin
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import ItemNFeOverrideSerializer
_mod = __import__('apps.fiscal.models_overrides', fromlist=['ItemNFeOverride'])
ItemNFeOverride = _mod.ItemNFeOverride


class ItemNFeOverrideViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD básico para overrides de itens da NFe.

    - `criado_por` é preenchido automaticamente no `perform_create`.
    - Permissões: apenas usuários autenticados podem criar/editar (pode ser refinado depois).
    """
    queryset = ItemNFeOverride.objects.all().order_by('-criado_em')
    serializer_class = ItemNFeOverrideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        user = getattr(self.request, 'user', None)
        # If client requests 'aplicado=True' while NFe is confirmed, ensure user has permission
        data_aplicado = serializer.validated_data.get('aplicado', False)
        item = serializer.validated_data.get('item') if 'item' in serializer.validated_data else None
        if data_aplicado and item and getattr(item.nfe, 'estoque_confirmado', False):
            if not (user and user.has_perm('fiscal.apply_itemnfeoverride')):
                raise PermissionDenied('Você não tem permissão para aplicar overrides em NF-e confirmadas.')

        inst = serializer.save(criado_por=user, **self._get_tenant_kwargs())
        # If override is created already applied and NFe was confirmed, attempt to apply adjustments.
        # If application fails, revert 'aplicado' and raise a ValidationError so client sees the failure.
        from rest_framework.exceptions import ValidationError
        try:
            if getattr(inst, 'aplicado', False) and getattr(inst.item, 'nfe', None) and getattr(inst.item.nfe, 'estoque_confirmado', False):
                from django.db import transaction
                with transaction.atomic():
                    from .services.overrides import apply_item_override
                    apply_item_override(inst, user=user)
        except Exception as e:
            # Revert aplicado flag and surface error
            inst.aplicado = False
            inst.save(update_fields=['aplicado'])
            raise ValidationError({'detail': f'failed_to_apply_override: {str(e)}'})

    @action(detail=True, methods=['post'])
    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        user = getattr(self.request, 'user', None)
        # Inspect if update attempts to mark aplicado=True on a confirmed NFe
        data_aplicado = serializer.validated_data.get('aplicado', False)
        inst_item = serializer.instance.item if serializer.instance else None
        if data_aplicado and inst_item and getattr(inst_item.nfe, 'estoque_confirmado', False):
            if not (user and user.has_perm('fiscal.apply_itemnfeoverride')):
                raise PermissionDenied('Você não tem permissão para aplicar overrides em NF-e confirmadas.')
        inst = serializer.save()
        # If override became applied as part of update, attempt to apply adjustments and revert on failure
        from rest_framework.exceptions import ValidationError
        try:
            if getattr(inst, 'aplicado', False) and getattr(inst.item, 'nfe', None) and getattr(inst.item.nfe, 'estoque_confirmado', False):
                from django.db import transaction
                with transaction.atomic():
                    from .services.overrides import apply_item_override
                    apply_item_override(inst, user=user)
        except Exception as e:
            # Revert applied flag to keep consistent state and surface error to client
            inst.aplicado = False
            inst.save(update_fields=['aplicado'])
            raise ValidationError({'detail': f'failed_to_apply_override: {str(e)}'})

    def apply(self, request, pk=None):
        """Apply an existing override (mark it applied and create adjustments if needed)."""
        from rest_framework.exceptions import PermissionDenied
        inst = self.get_object()
        user = getattr(request, 'user', None)
        if inst.aplicado:
            return Response({'detail': 'already_applied'}, status=200)

        # If the parent NFe is confirmed, applying requires specific permission
        if getattr(inst.item, 'nfe', None) and getattr(inst.item.nfe, 'estoque_confirmado', False):
            if not (user and user.has_perm('fiscal.apply_itemnfeoverride')):
                raise PermissionDenied('Você não tem permissão para aplicar este override.')

        # Attempt to apply adjustments first; only mark as applied after success to keep state consistent.
        try:
            from django.db import transaction
            # Run apply synchronously within a single transaction so caller sees the result immediately
            with transaction.atomic():
                # Lock fresh instance to avoid races
                fresh = ItemNFeOverride.objects.select_for_update().get(pk=inst.pk)
                if fresh.aplicado:
                    return Response({'detail': 'already_applied'}, status=200)
                # Optimistically mark as applied before running apply; will be reverted on failure
                fresh.aplicado = True
                fresh.save(update_fields=['aplicado'])
                try:
                    from .services.overrides import apply_item_override
                    apply_item_override(fresh, user=user, force=True)
                except Exception as e:
                    # revert aplicado flag on failure and report
                    try:
                        ItemNFeOverride.objects.filter(pk=inst.pk).update(aplicado=False)
                    except Exception:
                        pass
                    # Create a Notificacao for the requesting user (or fallback to superusers)
                    try:
                        from apps.administrativo.models import Notificacao
                        from django.contrib.auth import get_user_model
                        notified = False
                        if user and getattr(user, 'is_authenticated', False):
                            try:
                                Notificacao.objects.create(
                                    titulo=f'Falha ao aplicar override #{inst.pk}',
                                    mensagem=f'Falha ao aplicar override #{inst.pk} na NFe {getattr(fresh.item.nfe, "chave_acesso", None)}: {str(e)}',
                                    tipo='error',
                                    prioridade='alta',
                                    usuario=user
                                )
                                notified = True
                            except Exception:
                                notified = False
                        if not notified:
                            User = get_user_model()
                            admins = User.objects.filter(is_superuser=True)[:3]
                            for u in admins:
                                try:
                                    Notificacao.objects.create(
                                        titulo=f'Falha ao aplicar override #{inst.pk}',
                                        mensagem=f'Falha ao aplicar override #{inst.pk} na NFe {getattr(fresh.item.nfe, "chave_acesso", None)}: {str(e)}',
                                        tipo='error',
                                        prioridade='critica',
                                        usuario=u
                                    )
                                except Exception:
                                    pass
                    except Exception:
                        import logging
                        logging.getLogger(__name__).exception('Failed to create Notificacao for failed override apply')
                    import logging
                    logging.getLogger(__name__).exception('apply failed')
                    return Response({'error': 'apply_failed', 'message': str(e)}, status=400)

        except Exception as e:
            import logging
            logging.getLogger(__name__).exception('Failed to apply override')
            return Response({'error': 'apply_failed', 'message': str(e)}, status=400)

        return Response({'detail': 'applied'}, status=200)
