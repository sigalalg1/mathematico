import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from './MathText';
import { Goalkeeper, type KeeperState } from './Goalkeeper';
import { MonkeyFigure } from './MonkeyFigure';
import { useSound } from '../audio/useSound';
import '../pages/PenaltyShootoutPage.css';
import './SoccerGoalCourt.css';

export interface SoccerOption {
  value: string;
  label: ReactNode;
}

interface SoccerGoalCourtProps {
  options: SoccerOption[];
  /** Correctness is always decided by `question.validate`, same as every other interaction in this unit. */
  validate: (raw: string) => boolean;
  locked: boolean;
  lastRaw: string | null;
  answered: boolean;
  onAnswer: (raw: string) => void;
}

// Up to 4 of the real penalty-shootout's own fixed goal corners — for fewer
// than 4 options the remaining corners are simply never offered, the same
// way a real goal still looks and plays correctly with the keeper covering
// corners nobody is aiming at this round.
const CORNERS = ['bottomLeft', 'bottomRight', 'topLeft', 'topRight'] as const;
type Corner = (typeof CORNERS)[number];

type Phase = 'ready' | 'kicking' | 'goal' | 'save';
const KICK_MS = 360;
const RESULT_MS = 820;

function getKeeperState(phase: Phase, corner: Corner | undefined, correct: boolean): KeeperState {
  if (phase === 'goal') return 'disappointed';
  if (phase === 'save') return 'save';
  if (phase === 'kicking') {
    const isLeftSide = corner?.includes('Left');
    // On a goal the keeper guessed the wrong side; on a save, the right one.
    if (correct) return isLeftSide ? 'diveRight' : 'diveLeft';
    return isLeftSide ? 'diveLeft' : 'diveRight';
  }
  return 'ready';
}

/**
 * A generic answer picker built from the *real* penalty-shootout assets and
 * sequencing (`Goalkeeper`, `PenaltyShootoutPage.css`'s goal/net/ball/keeper
 * styling and timing) — reused rather than reimplemented, the way
 * `BasketballMonkeyCourt` is reused unmodified for basketball-mode
 * questions. Unlike the original page (built around one fixed addition fact
 * and 4 narratively-scripted miss outcomes per question), this takes any
 * 2–4 labelled options plus `validate`, so any sufficiently small-option
 * question can use it — a wrong kick is always a generic, honestly-simple
 * "save", since a specific "post"/"wide" narrative would require per-option
 * data this unit's generators don't (and don't need to) produce.
 */
export function SoccerGoalCourt({ options, validate, locked, lastRaw, answered, onAnswer }: SoccerGoalCourtProps) {
  const { t } = useTranslation();
  const { play } = useSound();
  const [phase, setPhase] = useState<Phase>('ready');
  const [selected, setSelected] = useState<{ value: string; corner: Corner } | null>(null);
  const kickTimer = useRef<number | null>(null);
  const resultTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (kickTimer.current !== null) window.clearTimeout(kickTimer.current);
      if (resultTimer.current !== null) window.clearTimeout(resultTimer.current);
    },
    [],
  );

  function kick(value: string, corner: Corner) {
    if (locked || phase !== 'ready') return;
    setSelected({ value, corner });
    setPhase('kicking');
    play('footballKick');
    onAnswer(value);

    const correct = validate(value);
    kickTimer.current = window.setTimeout(() => {
      setPhase(correct ? 'goal' : 'save');
      play(correct ? 'footballGoal' : 'footballSave');
      resultTimer.current = window.setTimeout(() => {
        // A miss resets locally so the child can kick again — the Training
        // engine's own `retry` phase is what actually re-enables `locked`
        // for a genuine wrong answer; this only resets this court's own
        // kick/dive animation state so a second attempt plays cleanly too.
        if (!correct) {
          setSelected(null);
          setPhase('ready');
        }
      }, RESULT_MS);
    }, KICK_MS);
  }

  const keeperState = getKeeperState(phase, selected?.corner, selected ? validate(selected.value) : false);

  return (
    <div className="penalty-shootout psc2-embedded">
      <section className={`ps-stadium ps-phase-${phase}`}>
        <div className="ps-crowd" aria-hidden="true" />
        <div className="ps-pitch">
          <div className={`ps-goal${phase === 'goal' ? ' ps-goal-react' : ''}`}>
            <div className="ps-net" aria-hidden="true" />
            <Goalkeeper state={keeperState} diveSide={selected?.corner.includes('Right') ? 'right' : 'left'} />
            <div className="ps-targets">
              {options.map((option, index) => {
                const corner = CORNERS[index];
                const classes = [`ps-target`, `ps-target-${corner}`];
                if (selected?.value === option.value) classes.push('is-selected');
                if (answered) {
                  if (validate(option.value)) classes.push('is-correct');
                  else if (option.value === lastRaw) classes.push('is-wrong');
                }
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={classes.join(' ')}
                    data-testid={`sgc-target-${option.value}`}
                    disabled={locked || phase !== 'ready'}
                    onClick={() => kick(option.value, corner)}
                    aria-label={t('decimalExamPrep.common.soccerTarget', { position: t(`penaltyShootout.positions.${corner}`) })}
                  >
                    <MathText>{option.label}</MathText>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ps-penalty-arc" aria-hidden="true" />
          <MonkeyFigure label={t('decimalExamPrep.common.soccerPlayer')} className={`sgc-kicker${phase === 'kicking' ? ' sgc-kicker-kick' : ''}`} />
          <div className={`ps-ball sgc-ball${selected ? ` ps-ball-${selected.corner}` : ''}${phase !== 'ready' ? ' ps-ball-flight' : ''}`} aria-hidden="true">
            ⚽
          </div>
          {(phase === 'goal' || phase === 'save') && <div className={`ps-result ps-result-${phase}`} role="status">{t(`penaltyShootout.results.${phase}`)}</div>}
        </div>
      </section>
    </div>
  );
}
