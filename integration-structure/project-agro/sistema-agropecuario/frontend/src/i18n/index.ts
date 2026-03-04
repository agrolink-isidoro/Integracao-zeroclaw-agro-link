type Lang = 'pt' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  pt: {
    'startSession.selectTalhoesLabel': 'Selecione talhões',
    'startSession.selectTalhoesNote': 'Não informe quantidade aqui',
    'startSession.helperText': 'As quantidades são registradas posteriormente durante movimentações de carga ou ao registrar a colheita.',
    'startSession.tooltip': 'Quantidades são informadas durante movimentação de carga ou registro da colheita.'
  },
  en: {
    'startSession.selectTalhoesLabel': 'Select plots',
    'startSession.selectTalhoesNote': 'Do not enter quantities here',
    'startSession.helperText': 'Quantities are recorded later during load movements or when registering the harvest.',
    'startSession.tooltip': 'Quantities are provided during load movement or harvest registration.'
  }
};

let currentLang: Lang = (typeof window !== 'undefined' && (window as any).APP_LANG) || 'pt';

export const setLang = (lang: Lang) => {
  currentLang = lang;
};

export const t = (key: string) => {
  return translations[currentLang as Lang]?.[key] || key;
};
