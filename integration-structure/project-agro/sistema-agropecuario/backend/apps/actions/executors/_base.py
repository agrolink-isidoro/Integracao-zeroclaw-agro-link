"""
Shared utilities for action executors.

Provides a thin bridge between executor logic (which resolves names → PKs)
and DRF serializers (which enforce field-level and cross-field validation,
and run the authoritative create/update business logic).

Usage pattern
─────────────
    # 1. Validate only (use validated_data to build model kwargs manually)
    s = validate_via_serializer(MySerializer, data, user=criado_por)
    instance = MyModel(tenant=tenant, **s.validated_data)
    instance.save()

    # 2. Validate + save (serializer's create() is trusted)
    instance = save_via_serializer(MySerializer, data, user=criado_por,
                                   tenant=tenant, criado_por=criado_por)
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class _FakeRequest:
    """
    Minimal request-like object injected into DRF serializer context.

    Many serializers only read `request.user` (for audit/permission checks)
    and `request.tenant` (for scoping queries).  This shim provides both
    without requiring an actual HTTP request.
    """
    def __init__(self, user=None, tenant=None):
        self.user = user
        self.tenant = tenant
        self.auth = None


def validate_via_serializer(serializer_class, data: dict, user=None, tenant=None):
    """
    Run DRF serializer validation against *data*.

    Returns the bound serializer (with `.validated_data` populated) so the
    caller can inspect or use validated values before deciding how to save.

    Raises ``ValueError`` if validation fails (errors are included in the
    message so they surface as human-readable action failure reasons).
    """
    request = _FakeRequest(user=user, tenant=tenant)
    s = serializer_class(data=data, context={'request': request})
    if not s.is_valid():
        raise ValueError(
            f"[{serializer_class.__name__}] Validation failed: {s.errors}"
        )
    logger.debug(
        "validate_via_serializer: %s OK  fields=%s",
        serializer_class.__name__, list(s.validated_data.keys()),
    )
    return s


def save_via_serializer(serializer_class, data: dict, user=None, tenant=None, **save_kwargs):
    """
    Validate *data* and call ``serializer.save(**save_kwargs)``.

    ``save_kwargs`` are merged into ``validated_data`` before ``create()``
    is called — this is how DRF views inject ``tenant`` and ``criado_por``
    that may not be part of the incoming payload.

    Returns the saved model instance.
    Raises ``ValueError`` on validation failure.
    """
    s = validate_via_serializer(serializer_class, data, user=user, tenant=tenant)
    instance = s.save(**save_kwargs)
    logger.debug(
        "save_via_serializer: %s → pk=%s",
        serializer_class.__name__, getattr(instance, 'pk', '?'),
    )
    return instance
