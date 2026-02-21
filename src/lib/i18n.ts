import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { fr, enCA } from 'date-fns/locale';

import frTranslations from '@/locales/fr.json';
import enTranslations from '@/locales/en.json';

const STORAGE_KEY = 'app_lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: frTranslations },
      en: { translation: enTranslations }
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    }
  });

// Helper to get current locale for date-fns
export const getDateLocale = () => {
  return i18n.language === 'en' ? enCA : fr;
};

// Helper to format currency with consistent formatting:
// - Always 2 decimal places (e.g., 30 833,00 $)
// - Space as thousands separator for French, comma for English
// - Rounded to 2 decimals
export const formatCurrency = (amount: number) => {
  // Round to 2 decimal places
  const rounded = Math.round(amount * 100) / 100;
  const locale = i18n.language === 'en' ? 'en-CA' : 'fr-CA';
  
  // Format with 2 decimal places et séparateur de milliers (ex: 1 254 699,00$)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(rounded);
  
  // Add currency symbol in the correct position
  return i18n.language === 'en' ? `$${formatted}` : `${formatted}$`;
};

// Helper to format numbers
export const formatNumber = (num: number) => {
  const locale = i18n.language === 'en' ? 'en-CA' : 'fr-CA';
  return new Intl.NumberFormat(locale).format(num);
};

export default i18n;
