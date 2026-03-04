import logging
from django.db import transaction
from typing import Tuple

logger = logging.getLogger(__name__)

def _normalize_cpf_cnpj(value: str) -> str:
    if not value:
        return ''
    return ''.join(ch for ch in value if ch.isdigit())


def reflect_fornecedor_from_nfe(nfe, user, force: bool = False, nome_override: str | None = None, cpf_cnpj_override: str | None = None) -> Tuple[object, bool, bool, dict]:
    """Reflect fornecedor from NFe into comercial.Fornecedor.

    Returns (fornecedor, created, updated, diff)

    Matching priority:
      - cpf_cnpj (normalized digits) when present
      - exact nome match

    If a conflict exists (found fornecedor but fields diverge) and force is False,
    function returns fornecedor, False, False, diff and does not modify DB.
    If force is True, updates the fornecedor and returns updated=True.
    Operation is transactional.
    """
    from apps.comercial.models import Fornecedor

    emitente_nome = nome_override if nome_override is not None else (getattr(nfe, 'emitente_nome', None) or '')
    emitente_cnpj = cpf_cnpj_override if cpf_cnpj_override is not None else (getattr(nfe, 'emitente_cnpj', None) or '')
    cpf_cnpj_norm = _normalize_cpf_cnpj(emitente_cnpj)

    created = False
    updated = False
    diff = {}

    # Select candidate by cpf_cnpj if present
    fornecedor_qs = None
    if cpf_cnpj_norm:
        fornecedor_qs = Fornecedor.objects.filter(cpf_cnpj__icontains=cpf_cnpj_norm)
    if not fornecedor_qs or not fornecedor_qs.exists():
        fornecedor_qs = Fornecedor.objects.filter(nome=emitente_nome)

    fornecedor = fornecedor_qs.first() if fornecedor_qs.exists() else None

    if not fornecedor:
        # Create
        with transaction.atomic():
            fornecedor = Fornecedor.objects.create(
                nome=emitente_nome,
                cpf_cnpj=cpf_cnpj_norm or '',
                criado_por=user if hasattr(user, 'id') else None,
            )
            created = True
            logger.info('Created fornecedor %s from NFe %s by user %s', fornecedor.id, getattr(nfe, 'chave_acesso', None), getattr(user, 'id', None))
        return fornecedor, created, updated, diff

    # Already exists: check for differences
    current = {
        'nome': fornecedor.nome or '',
        'cpf_cnpj': fornecedor.cpf_cnpj or '',
    }
    desired = {
        'nome': emitente_nome or '',
        'cpf_cnpj': cpf_cnpj_norm or '',
    }

    for k in desired:
        if (current.get(k) or '') != (desired.get(k) or ''):
            diff[k] = {'current': current.get(k), 'desired': desired.get(k)}

    if diff and not force:
        logger.info('Conflict detected for fornecedor %s from NFe %s: %s', fornecedor.id, getattr(nfe, 'chave_acesso', None), diff)
        return fornecedor, False, False, diff

    if diff and force:
        with transaction.atomic():
            fornecedor.nome = desired['nome'] or fornecedor.nome
            fornecedor.cpf_cnpj = desired['cpf_cnpj'] or fornecedor.cpf_cnpj
            fornecedor.save(update_fields=['nome', 'cpf_cnpj'])
            updated = True
            logger.info('Updated fornecedor %s from NFe %s by user %s (force)', fornecedor.id, getattr(nfe, 'chave_acesso', None), getattr(user, 'id', None))

    return fornecedor, created, updated, diff
