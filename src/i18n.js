import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './translations/en.json';
import hi from './translations/hi.json';
import pa from './translations/pa.json';
import bn from './translations/bn.json';
import ta from './translations/ta.json';
import te from './translations/te.json';
import mr from './translations/mr.json';
import gu from './translations/gu.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      pa: { translation: pa },
      bn: { translation: bn },
      ta: { translation: ta },
      te: { translation: te },
      mr: { translation: mr },
      gu: { translation: gu }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
