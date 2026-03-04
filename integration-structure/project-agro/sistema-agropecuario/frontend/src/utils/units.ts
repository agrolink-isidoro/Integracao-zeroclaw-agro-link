export const UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  t: 'ton',
  saca_60kg: 'Saca (60kg)'
};

export function getUnitLabel(unit?: string) {
  if (!unit) return '';
  return UNIT_LABELS[unit] || unit;
}
