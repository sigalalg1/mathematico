import { useTranslation } from 'react-i18next';
import './SoundToggle.css';

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={onToggle}
      aria-label={t(enabled ? 'common.soundOn' : 'common.soundOff')}
      aria-pressed={enabled}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
