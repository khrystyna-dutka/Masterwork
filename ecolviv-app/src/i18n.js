// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en.json';
import translationUK from './locales/uk.json';

const resources = {
  en: {
    translation: translationEN
  },
  uk: {
    translation: translationUK
  }
};

// Отримати збережену мову з localStorage або використати українську
const savedLanguage = localStorage.getItem('language') || 'uk';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'uk',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;