import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SoundToggle } from './SoundToggle';
import { MonkeyFigure } from './MonkeyFigure';
import { useSound } from '../audio/useSound';
import './BasketballMonkeyCourt.css';

interface ShotState {
  target: string;
  result: 'correct' | 'wrong';
  sequence: number;
}

/**
 * The basketball court: a monkey, a ball and the animation that sends it at
 * whichever answer was tapped.
 *
 * It wraps a training activity rather than containing one, and reads nothing
 * from it but the semantic classes the shared answer buttons already carry —
 * so it works with any activity at all, times tables or two-digit addition,
 * without either side knowing about the other.
 */
export function BasketballMonkeyCourt({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { enabled, play, toggle } = useSound();
  const [shot, setShot] = useState<ShotState | null>(null);
  const soundTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (soundTimer.current !== null) window.clearTimeout(soundTimer.current);
    },
    [],
  );

  function handleCourtClick(event: MouseEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('.tr-option');
    if (!target || target.disabled) return;

    const player = event.currentTarget.querySelector<HTMLElement>('.bm-player');
    const targetBox = target.getBoundingClientRect();
    const playerBox = player?.getBoundingClientRect();
    if (playerBox) {
      const startX = playerBox.left + playerBox.width * 0.82 - (targetBox.left + targetBox.width / 2);
      const startY = playerBox.top + playerBox.height * 0.25 - (targetBox.top + targetBox.height * 0.46);
      target.style.setProperty('--bm-shot-x', `${startX}px`);
      target.style.setProperty('--bm-shot-y', `${startY}px`);
    }

    play('fire');
    // Training owns answer state. Read its resulting semantic class after React
    // has committed, solely to coordinate the court animation and sound.
    queueMicrotask(() => {
      const result = target.classList.contains('tr-option-wrong') ? 'wrong' : 'correct';
      const value = target.dataset.testid?.replace('tr-option-', '') ?? target.textContent?.trim() ?? '';
      setShot((previous) => ({ target: value, result, sequence: (previous?.sequence ?? 0) + 1 }));
      soundTimer.current = window.setTimeout(() => play(result === 'correct' ? 'hit' : 'miss'), 260);
    });
  }

  return (
    <div
      className="basketball-shell"
      data-shot-target={shot?.target}
      data-shot-result={shot?.result}
      data-shot-sequence={shot?.sequence}
      onClick={handleCourtClick}
    >
      <div className="bm-sound">
        <SoundToggle enabled={enabled} onToggle={toggle} />
      </div>
      <MonkeyFigure label={t('basketballMonkey.a11y.monkey')} />
      {children}
    </div>
  );
}
