import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ur from './locales/ur.json';
import ar from './locales/ar.json';

// RTL languages
export const RTL_LANGUAGES = ['ur', 'ar'];

// Supported languages config
export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '/assets/img/flags/english.svg', dir: 'ltr' as const },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', flag: '/assets/img/flags/pk.png', dir: 'rtl' as const },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '/assets/img/flags/arabic.svg', dir: 'rtl' as const },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Apply direction on language change
const applyDirection = (lng: string) => {
  const isRTL = RTL_LANGUAGES.includes(lng);
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lng);

  // Toggle RTL Bootstrap stylesheet
  if (isRTL) {
    document.body.classList.add('rtl-mode');
  } else {
    document.body.classList.remove('rtl-mode');
  }
};

// Apply on init
applyDirection(i18n.language || 'en');

// Apply on every language change
i18n.on('languageChanged', applyDirection);

export default i18n;
