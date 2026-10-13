import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ruTranslation from '../locales/ru.json'
import enTranslation from '../locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ruTranslation },
      en: { translation: enTranslation },
    },
    fallbackLng: 'en',
    supportedLngs: ['ru', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })
  .then(() => {
    // Keep <html lang> in sync so screen readers pick the right voice.
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en'
  })
  .catch(() => {
    // i18n init errors are non-fatal for Chunk 0 stubs
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
