import { useTranslation } from 'react-i18next';
import { setLanguage, type Language } from '../i18n';
import './LanguageSwitcher.css';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const nextLanguage: Language = i18n.language === 'he' ? 'en' : 'he';

  return (
    <button
      type="button"
      className="language-switcher"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={t('language.label')}
    >
      {t('language.switchTo')}
    </button>
  );
}
