import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getDirection } from './index';

export function useDocumentDirection(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = getDirection(i18n.language);
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
}
