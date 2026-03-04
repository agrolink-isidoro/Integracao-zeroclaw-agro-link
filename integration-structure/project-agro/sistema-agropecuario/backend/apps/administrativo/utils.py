from decimal import Decimal


def compute_inss(salario: Decimal, sm: Decimal = Decimal('1621.00'), inss_teto: Decimal = Decimal('8537.55')):
    """Compute INSS progressive contribution and return (total, breakdown list).
    breakdown: list of dicts with from, to, aliquota, valor
    """
    brackets = [
        (sm, Decimal('0.075')),
        (sm * Decimal('2'), Decimal('0.09')),
        (sm * Decimal('3'), Decimal('0.12')),
        (inss_teto, Decimal('0.14')),
    ]
    base = salario if salario <= inss_teto else inss_teto
    last_limit = Decimal('0')
    total = Decimal('0')
    breakdown = []
    for limit, rate in brackets:
        if base <= last_limit:
            break
        taxable = min(base, limit) - last_limit
        valor = (taxable * rate).quantize(Decimal('0.001'))
        breakdown.append({'from': float(last_limit), 'to': float(limit), 'aliquota': float(rate), 'valor': float(valor)})
        total += valor
        last_limit = limit
    # quantize total to 3 decimals
    total = total.quantize(Decimal('0.001'))
    return total, breakdown


def compute_ir(salario_bruto: Decimal, inss_val: Decimal, dependentes: int = 0, dependente_deducao: Decimal = Decimal('189.59'),
               ir_isencao: Decimal = Decimal('5000'), ir_reductor_limit: Decimal = Decimal('7350'), ir_reductor_idx: Decimal = Decimal('0.133145'),
               ir_aliquota_alta: Decimal = Decimal('0.275'), ir_parcela_deduzir: Decimal = Decimal('893.66')):
    """Compute IR (approximation based on 2026 redutor rules) and return (imposto, info_dict)
    """
    base = salario_bruto - inss_val - (Decimal(dependentes) * dependente_deducao)
    if salario_bruto <= ir_isencao:
        return Decimal('0'), {'motivo': 'isento por faixa'}

    if salario_bruto <= ir_reductor_limit:
        redutor = (salario_bruto * ir_reductor_idx).quantize(Decimal('0.001'))
        base_reduzida = base - redutor
        if base_reduzida <= ir_isencao:
            return Decimal('0'), {'motivo': 'isencao parcial com redutor', 'redutor': float(redutor)}
        imposto = (base_reduzida * ir_aliquota_alta - ir_parcela_deduzir).quantize(Decimal('0.001'))
        return max(imposto, Decimal('0')), {'motivo': 'redutor aplicado', 'redutor': float(redutor)}

    imposto = (base * ir_aliquota_alta - ir_parcela_deduzir).quantize(Decimal('0.001'))
    return max(imposto, Decimal('0')), {'motivo': 'alíquota alta'}
