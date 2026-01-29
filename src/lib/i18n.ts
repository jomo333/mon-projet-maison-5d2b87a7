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

// Helper to format currency
export const formatCurrency = (amount: number) => {
  const locale = i18n.language === 'en' ? 'en-CA' : 'fr-CA';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper to format numbers
export const formatNumber = (num: number) => {
  const locale = i18n.language === 'en' ? 'en-CA' : 'fr-CA';
  return new Intl.NumberFormat(locale).format(num);
};

export default i18n;
