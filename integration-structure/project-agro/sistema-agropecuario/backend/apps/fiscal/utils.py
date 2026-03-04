def validate_chave_acesso(chave: str) -> bool:
    """Valida uma chave de acesso de NFe (44 dígitos) usando módulo 11.

    Regras resumidas:
    - Deve ser composta apenas por dígitos e ter 44 caracteres.
    - O último dígito é o dígito verificador (DV). O DV é calculado a partir dos 43
      primeiros dígitos usando o algoritmo módulo 11 (pesos de 2 a 9, repetidos
      da direita para a esquerda). Se o resultado da subtração for 10 ou 11, DV=0.

    Retorna True se válido, False caso contrário.
    """
    if not isinstance(chave, str):
        return False
    chave = chave.strip()
    if not chave.isdigit() or len(chave) != 44:
        return False

    body = chave[:-1]
    dv = int(chave[-1])

    total = 0
    weight = 2
    for c in reversed(body):
        total += int(c) * weight
        weight += 1
        if weight > 9:
            weight = 2

    resto = total % 11
    dig = 11 - resto
    if dig == 10 or dig == 11:
        dig = 0

    return dig == dv


def serializer_errors_to_bad_fields(errors, data=None):
    """Converts DRF serializer.errors dict into standardized `bad_fields` list.

    Args:
        errors: dict-like object from serializer.errors
        data: optional dict of input data to include value_preview

    Returns: list of dicts with keys: field, code, message, value_preview
    """
    bad_fields = []
    for field, val in errors.items():
        if field in ('non_field_errors', '__all__'):
            items = val if isinstance(val, (list, tuple)) else [val]
            for e in items:
                bad_fields.append({'field': None, 'code': 'invalid', 'message': str(e), 'value_preview': None})
            continue

        # field-specific errors
        items = val if isinstance(val, (list, tuple)) else [val]
        for e in items:
            # Allow nested dicts to be stringified
            message = str(e)
            value_preview = None
            try:
                if data and isinstance(data, dict):
                    value_preview = data.get(field)
            except Exception:
                value_preview = None
            bad_fields.append({'field': field, 'code': 'invalid', 'message': message, 'value_preview': value_preview})
    return bad_fields
