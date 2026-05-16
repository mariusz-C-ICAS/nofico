/**
 * Data: 2026-05-10 13:04
 * Utworzył: Agent AI
 * Zmiany: Inicjalizacja konfiguracji wielojęzyczności (i18n).
 * Opis: Moduł odpowiedzialny za tłumaczenia w aplikacji. 
 * Zmienność języka jest wspierana globalnie bez wymogu odświeżenia strony.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from '../shared/locales/en/translation.json';
import translationPL from '../shared/locales/pl/translation.json';
import translationDE from '../shared/locales/de/translation.json';
import translationFR from '../shared/locales/fr/translation.json';
import translationUA from '../shared/locales/ua/translation.json';
import translationES from '../shared/locales/es/translation.json';

const resources = {
  en: { translation: translationEN.translation },
  pl: { translation: translationPL.translation },
  de: { translation: translationDE.translation },
  fr: { translation: translationFR.translation },
  ua: { translation: translationUA.translation },
  es: { translation: translationES.translation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pl', // Domyślny język ustawiony na PL zgodnie z wymaganiami
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
