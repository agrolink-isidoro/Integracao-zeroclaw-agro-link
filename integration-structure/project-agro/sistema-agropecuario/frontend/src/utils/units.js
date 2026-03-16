export const UNIT_LABELS = {
    kg: 'kg',
    t: 'ton',
    saca_60kg: 'Saca (60kg)'
};
export function getUnitLabel(unit) {
    if (!unit)
        return '';
    return UNIT_LABELS[unit] || unit;
}
