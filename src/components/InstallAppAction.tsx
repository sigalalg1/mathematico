import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInstallApp } from '../hooks/useInstallApp';
import './InstallAppAction.css';

export function InstallAppAction() {
  const { t } = useTranslation();
  const { canInstall, showIosInstall, install, dismiss } = useInstallApp();
  const [showInstructions, setShowInstructions] = useState(false);

  if (!canInstall && !showIosInstall) return null;

  if (showIosInstall && showInstructions) {
    return (
      <div className="install-instructions" role="status">
        <span>{t('install.iosInstructions')}</span>
        <button className="install-dismiss" type="button" onClick={dismiss}>
          {t('install.dismiss')}
        </button>
      </div>
    );
  }

  return (
    <button
      className="header-nav-link install-action"
      type="button"
      onClick={canInstall ? () => void install() : () => setShowInstructions(true)}
    >
      {canInstall ? t('install.action') : t('install.iosAction')}
    </button>
  );
}
