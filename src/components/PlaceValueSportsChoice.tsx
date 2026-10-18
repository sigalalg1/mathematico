import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MonkeyFigure } from './MonkeyFigure';
import { useSound } from '../audio/useSound';
import './PlaceValueSportsChoice.css';

export interface SportsOption {
  value: string;
  label: ReactNode;
}

interface PlaceValueSportsChoiceProps {
  sport: 'basketball' | 'soccer';
  options: SportsOption[];
  /** Correctness is always decided by `question.validate`, same as every other interaction in this unit — never by string equality against one stored answer. */
  validate: (raw: string) => boolean;
  locked: boolean;
  lastRaw: string | null;
  answered: boolean;
  onAnswer: (raw: string) => void;
}

interface ShotState {
  value: string;
  result: 'correct' | 'wrong';
  sequence: number;
}

const HIT_SOUND_DELAY_MS = 260;

/**
 * A playful drop-in alternative to the plain option buttons
 * (`MultipleChoiceInput`/`CompareSymbolInput`/`EvenOddInput` in
 * `PlaceValueQuestionScene`) for 2–4 option questions — basketball hoops or
 * soccer goals instead of a button grid. Deliberately generic over option
 * *count* (2, 3 or 4), unlike the original `BasketballMonkeyCourt` /
 * `PenaltyShootoutPage`, which are built around a fixed 4 hoops / 4 goal
 * corners respectively.
 *
 * This component only ever decides how an answer is *picked* — it is never
 * the source of truth for correctness, explanation text, scoring, or
 * progress; `validate`, `onAnswer` and everything downstream are the exact
 * same props/callbacks the plain button renderers already use, so swapping
 * this in changes nothing about the question's mathematics.
 */
export function PlaceValueSportsChoice({ sport, options, validate, locked, lastRaw, answered, onAnswer }: PlaceValueSportsChoiceProps) {
  const { t } = useTranslation();
  const { play } = useSound();
  const [shot, setShot] = useState<ShotState | null>(null);
  const soundTimer = useRef<number | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const launcherRef = useRef<HTMLDivElement | null>(null);

  function shoot(event: MouseEvent<HTMLButtonElement>, value: string) {
    if (locked) return;
    const target = event.currentTarget;
    const launcher = launcherRef.current;
    if (launcher) {
      const targetBox = target.getBoundingClientRect();
      const launcherBox = launcher.getBoundingClientRect();
      const startX = launcherBox.left + launcherBox.width / 2 - (targetBox.left + targetBox.width / 2);
      const startY = launcherBox.top + launcherBox.height / 2 - (targetBox.top + targetBox.height / 2);
      target.style.setProperty('--psc-shot-x', `${startX}px`);
      target.style.setProperty('--psc-shot-y', `${startY}px`);
    }

    play(sport === 'basketball' ? 'fire' : 'footballKick');
    const isCorrect = validate(value);
    if (soundTimer.current !== null) window.clearTimeout(soundTimer.current);
    setShot((previous) => ({ value, result: isCorrect ? 'correct' : 'wrong', sequence: (previous?.sequence ?? 0) + 1 }));
    soundTimer.current = window.setTimeout(
      () => play(sport === 'basketball' ? (isCorrect ? 'hit' : 'miss') : isCorrect ? 'footballGoal' : 'footballSave'),
      HIT_SOUND_DELAY_MS,
    );
    onAnswer(value);
  }

  return (
    <div className={`psc-field psc-${sport}`} ref={fieldRef} data-shot-value={shot?.value} data-shot-result={shot?.result} data-shot-sequence={shot?.sequence}>
      <div className="psc-launcher" ref={launcherRef}>
        {sport === 'basketball' ? <MonkeyFigure label={t('decimalExamPrep.common.basketballPlayer')} className="psc-monkey" /> : <SoccerKicker label={t('decimalExamPrep.common.soccerPlayer')} />}
      </div>
      <div className={`psc-targets psc-targets-${options.length}`}>
        {options.map((option) => {
          const classes = ['psc-target', `psc-target-${sport}`];
          if (answered) {
            if (validate(option.value)) classes.push('is-correct');
            else if (option.value === lastRaw) classes.push('is-wrong');
          }
          // Toggling between two identically-defined animation classes on
          // every shot (rather than reusing one) forces the CSS animation to
          // restart even when the same target is shot twice in a row during
          // retry — React only restarts a running animation when the class
          // string itself changes.
          if (shot && shot.value === option.value) classes.push(shot.sequence % 2 === 0 ? 'psc-shooting-a' : 'psc-shooting-b');
          return (
            <button
              key={option.value}
              type="button"
              className={classes.join(' ')}
              data-testid={`psc-target-${option.value}`}
              disabled={locked}
              onClick={(event) => shoot(event, option.value)}
            >
              <span className="psc-target-visual" aria-hidden="true" />
              <span className="psc-target-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SoccerKicker({ label }: { label: string }) {
  return (
    <div className="psc-kicker" role="img" aria-label={label}>
      ⚽
    </div>
  );
}
