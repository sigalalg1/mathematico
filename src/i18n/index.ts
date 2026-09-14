import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import he from './locales/he/translation.json';

export const supportedLanguages = ['he', 'en'] as const;
export type Language = (typeof supportedLanguages)[number];

export const rtlLanguages: Language[] = ['he'];

const STORAGE_KEY = 'mathematico-language';
const DEFAULT_LANGUAGE: Language = 'he';

function isSupportedLanguage(value: string | null): value is Language {
  return supportedLanguages.includes(value as Language);
}

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

export function getDirection(language: string): 'rtl' | 'ltr' {
  return rtlLanguages.includes(language as Language) ? 'rtl' : 'ltr';
}

export function setLanguage(language: Language): void {
  localStorage.setItem(STORAGE_KEY, language);
  void i18n.changeLanguage(language);
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
