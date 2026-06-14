import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation imports
import en from './locales/en/common.json';
import es from './locales/es/common.json';
import fr from './locales/fr/common.json';
import it from './locales/it/common.json';
import de from './locales/de/common.json';
import pt from './locales/pt/common.json';
import ca from './locales/ca/common.json';
import ja from './locales/ja/common.json';
import tr from './locales/tr/common.json';
import ar from './locales/ar/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
      de: { translation: de },
      pt: { translation: pt },
      ca: { translation: ca },
      ja: { translation: ja },
      tr: { translation: tr },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

// Sync <html lang> and direction (RTL for Arabic)
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);
const applyDir = (lng: string) => {
  if (typeof document === 'undefined') return;
  const code = (lng || 'en').split('-')[0];
  document.documentElement.lang = code;
  document.documentElement.dir = RTL_LANGS.has(code) ? 'rtl' : 'ltr';
};
applyDir(i18n.language);
i18n.on('languageChanged', applyDir);

export default i18n;
