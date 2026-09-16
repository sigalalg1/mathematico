import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from './MathText';
import type { SoundName } from '../audio/soundEffects';
import type { MonkeyPose } from '../types/monkeyBalloonShooter';
import './MonkeyBalloonScene.css';

/**
 * The monkey-and-balloons scene, with no idea what kind of question it is
 * showing.
 *
 * It owns exactly what is visual: the dart's flight, the pop or the bounce, the
 * monkey's pose and the jungle behind them. Everything else — which question is
 * asked, what happens after a hit or a miss, scoring, timing — belongs to
 * whoever renders it. That is what lets the same scene sit on top of the
 * original multiplication round engine and on top of a generic training
 * session without either of them knowing about the other.
 */

/** How long the popper dart is in the air. */
export const FLIGHT_MS = 260;
/** How long the burst is on screen after a hit. */
export const POP_MS = 520;
/** How long the monkey stays puzzled after a miss. */
export const RECOVER_MS = 560;

/** Per-balloon float rhythm and resting offset, so the four never bob in lockstep. */
const FLOAT_RHYTHM = [
  { duration: '3.4s', delay: '0s', drift: '7px', lift: '0px' },
  { duration: '4.2s', delay: '-1.3s', drift: '-9px', lift: '26px' },
  { duration: '3.8s', delay: '-2.5s', drift: '10px', lift: '14px' },
  { duration: '4.6s', delay: '-0.7s', drift: '-6px', lift: '38px' },
];

/** A shot in progress: which balloon, whether it will pop, and the dart's path. */
interface Shot {
  index: number;
  option: string;
  correct: boolean;
  seed: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
}

export interface MonkeyBalloonSceneProps {
  /** The expression itself, e.g. `7 × 8` or `23 + 14`. Always rendered LTR. */
  prompt: string;
  /** The already-translated line above the expression. */
  promptLabel: string;
  /** Answer values in display order; exactly one of them is `correctAnswer`. */
  options: string[];
  correctAnswer: string;
  /** Changes whenever a new question is on screen, resetting the scene. */
  resetKey: string;
  /** Blocks new shots — e.g. while the owner is showing its own feedback. */
  locked?: boolean;
  /** Fired the instant a balloon is shot at, before the dart has flown. */
  onShoot: (option: string) => void;
  /** Fired once the pop or the bounce has finished playing. */
  onShotSettled?: (option: string, isCorrect: boolean) => void;
  /**
   * Clears a missed shot so the very same question can be tried again. The
   * original multiplication game retries in place; a training session counts
   * the miss and moves on instead, so it leaves this off.
   */
  retryAfterMiss?: boolean;
  /** The row of balloon pips. Omitted when the owner already shows progress. */
  progress?: { current: number; total: number };
  /** Anything extra for the scene's top bar, e.g. a sound toggle. */
  hudExtra?: ReactNode;
  /** Sound is owned by the page, so one preference drives the whole screen. */
  play?: (name: SoundName) => void;
}

export function MonkeyBalloonScene({
  prompt,
  promptLabel,
  options,
  correctAnswer,
  resetKey,
  locked = false,
  onShoot,
  onShotSettled,
  retryAfterMiss = false,
  progress,
  hudExtra,
  play,
}: MonkeyBalloonSceneProps) {
  const { t } = useTranslation();
  const sceneRef = useRef<HTMLDivElement>(null);
  const monkeyRef = useRef<HTMLDivElement>(null);

  const [shot, setShot] = useState<Shot | null>(null);
  /** Flips true when the dart reaches the balloon — the pop or the bounce starts here. */
  const [landed, setLanded] = useState(false);
  /** Distinguishes consecutive shots at the same balloon, for the dart animation. */
  const seedRef = useRef(0);

  // Every new question (and every replay) starts from a calm scene.
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setShot(null);
    setLanded(false);
  }

  // The dart flies, then lands: the balloon pops or shrugs the dart off.
  useEffect(() => {
    if (shot === null || landed) return undefined;
    const timer = window.setTimeout(() => {
      setLanded(true);
      play?.(shot.correct ? 'hit' : 'miss');
    }, FLIGHT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot, landed]);

  // The pop or the bounce finishes: tell the owner, and clear a miss if asked.
  useEffect(() => {
    if (!shot || !landed) return undefined;
    const timer = window.setTimeout(
      () => {
        onShotSettled?.(shot.option, shot.correct);
        if (!shot.correct && retryAfterMiss) {
          setShot(null);
          setLanded(false);
        }
      },
      shot.correct ? POP_MS : RECOVER_MS,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot, landed]);

  /**
   * The dart's path, measured in scene coordinates so it works unchanged in both
   * LTR and RTL, where the monkey sits on the opposite side.
   */
  function aimAt(balloon: HTMLElement): Pick<Shot, 'x' | 'y' | 'dx' | 'dy' | 'angle'> {
    const scene = sceneRef.current?.getBoundingClientRect();
    const monkey = monkeyRef.current?.getBoundingClientRect();
    const target = balloon.getBoundingClientRect();
    if (!scene || !monkey) return { x: 0, y: 0, dx: 0, dy: 0, angle: 0 };

    const x = monkey.left - scene.left + monkey.width / 2;
    const y = monkey.top - scene.top + monkey.height * 0.3;
    const dx = target.left - scene.left + target.width / 2 - x;
    const dy = target.top - scene.top + target.height * 0.35 - y;

    return { x, y, dx, dy, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  }

  function shootAt(index: number, option: string, element: HTMLElement) {
    // Ignore taps while a dart is still in the air, a balloon is bursting, or
    // the owner has taken control of the scene.
    if (locked || (shot !== null && (!landed || shot.correct))) return;

    const correct = option === correctAnswer;
    seedRef.current += 1;
    onShoot(option);
    play?.('fire');
    setLanded(false);
    setShot({ index, option, correct, seed: seedRef.current, ...aimAt(element) });
  }

  const pose: MonkeyPose = shot === null ? 'idle' : !landed ? 'aiming' : shot.correct ? 'happy' : 'puzzled';

  return (
    <div className="mb-scene" ref={sceneRef}>
      <Jungle />

      {(progress || hudExtra) && (
        <div className="mb-hud">
          {progress && <BalloonProgress current={progress.current} total={progress.total} />}
          {hudExtra}
        </div>
      )}

      <div className="mb-question" data-testid="mb-question">
        <p className="mb-prompt">{promptLabel}</p>
        <MathText className="mb-fact">
          <Expression prompt={prompt} />
        </MathText>
      </div>

      <div className="mb-play">
        <div className="mb-monkey-slot" ref={monkeyRef}>
          <Monkey pose={pose} />
        </div>

        <div className="mb-balloons">
          {options.map((option, index) => {
            const rhythm = FLOAT_RHYTHM[index % FLOAT_RHYTHM.length];
            const classes = ['mb-balloon', `mb-balloon-${index % FLOAT_RHYTHM.length}`];
            if (shot?.index === index) classes.push('mb-balloon-targeted');
            if (shot?.index === index && landed) {
              classes.push(shot.correct ? 'mb-balloon-popping' : `mb-balloon-dodging-${shot.seed % 2}`);
            }

            return (
              <button
                key={option}
                type="button"
                className={classes.join(' ')}
                style={
                  {
                    '--mb-float-duration': rhythm.duration,
                    '--mb-float-delay': rhythm.delay,
                    '--mb-drift': rhythm.drift,
                    '--mb-lift': rhythm.lift,
                  } as CSSProperties
                }
                data-testid={`mb-balloon-${option}`}
                aria-label={t('monkeyBalloonShooter.a11y.balloon', { value: option })}
                onClick={(event) => shootAt(index, option, event.currentTarget)}
              >
                <span className="mb-balloon-body">
                  <span className="mb-balloon-shine" aria-hidden="true" />
                  <MathText className="mb-balloon-value">{option}</MathText>
                </span>
                <span className="mb-balloon-knot" aria-hidden="true" />
                <span className="mb-balloon-string" aria-hidden="true" />
                {shot?.index === index && landed && shot.correct && <Burst />}
              </button>
            );
          })}
        </div>
      </div>

      {shot && (
        <span
          className="mb-trajectory"
          data-testid="mb-trajectory"
          aria-hidden="true"
          style={
            {
              left: `${shot.x}px`,
              top: `${shot.y}px`,
              width: `${Math.hypot(shot.dx, shot.dy)}px`,
              '--mb-trajectory-angle': `${shot.angle}deg`,
            } as CSSProperties
          }
        />
      )}

      {shot && (!landed || !shot.correct) && (
        <span
          key={shot.seed}
          className={`mb-dart${landed ? ' mb-dart-bounced' : ''}`}
          data-testid="mb-dart"
          aria-hidden="true"
          style={
            {
              left: `${shot.x}px`,
              top: `${shot.y}px`,
              '--mb-dart-dx': `${shot.dx}px`,
              '--mb-dart-dy': `${shot.dy}px`,
              '--mb-dart-angle': `${shot.angle}deg`,
              '--mb-dart-flight': `${FLIGHT_MS}ms`,
            } as CSSProperties
          }
        />
      )}
    </div>
  );
}

/**
 * The expression, split on its spaces so the operator can be accented. Works
 * for `7 × 8` and `23 + 14` alike — the scene never has to know which it is.
 */
function Expression({ prompt }: { prompt: string }) {
  const parts = prompt.split(' ').filter(Boolean);

  return (
    <>
      {parts.map((part, index) => (
        // Positions are stable for a given prompt, and parts repeat (`2 + 2`).
        <span key={`${part}-${index}`} className={index % 2 === 1 ? 'mb-fact-accent' : undefined}>
          {part}
        </span>
      ))}
      <span>=</span>
      <span className="mb-fact-accent">?</span>
    </>
  );
}

/**
 * An original cartoon monkey, drawn as one small SVG. Its four poses are CSS
 * classes plus a swapped mouth — no rigging, no sprite sheet, no assets.
 */
export function Monkey({ pose }: { pose: MonkeyPose }) {
  const { t } = useTranslation();

  return (
    <svg
      className={`mb-monkey mb-monkey-${pose}`}
      viewBox="0 0 120 150"
      role="img"
      aria-label={t(`monkeyBalloonShooter.a11y.monkey.${pose}`)}
      data-testid="mb-monkey"
      data-pose={pose}
    >
      {/* tail */}
      <path className="mb-monkey-tail" d="M78 118 q26 6 22 -22 q-3 -16 -16 -12" fill="none" stroke="#8a5a34" strokeWidth="7" strokeLinecap="round" />
      {/* body */}
      <ellipse cx="60" cy="112" rx="30" ry="28" fill="#a9713f" />
      <ellipse cx="60" cy="116" rx="19" ry="18" fill="#f3d3ac" />
      {/* legs */}
      <ellipse cx="42" cy="138" rx="12" ry="8" fill="#8a5a34" />
      <ellipse cx="78" cy="138" rx="12" ry="8" fill="#8a5a34" />
      {/* the popper arm — swings up when the monkey aims */}
      <g className="mb-monkey-arm">
        <rect x="57" y="88" width="37" height="11" rx="5.5" fill="#8a5a34" />
        <g className="mb-popper">
          <path d="M83 80 h26 q7 0 7 7 v14 q0 7 -7 7 H91 q-8 0 -8 -8z" />
          <rect className="mb-popper-tank" x="87" y="84" width="18" height="20" rx="8" />
          <path className="mb-popper-handle" d="M91 104 v12 h12 l-3 -12" />
          <rect className="mb-popper-nozzle" x="109" y="87" width="10" height="14" rx="5" />
          <circle className="mb-popper-tip" cx="120" cy="94" r="6" />
        </g>
      </g>
      {/* head */}
      <g className="mb-monkey-head">
        <circle cx="34" cy="58" r="12" fill="#a9713f" />
        <circle cx="34" cy="58" r="6" fill="#f3d3ac" />
        <circle cx="86" cy="58" r="12" fill="#a9713f" />
        <circle cx="86" cy="58" r="6" fill="#f3d3ac" />
        <circle cx="60" cy="58" r="30" fill="#a9713f" />
        <path className="mb-monkey-headband" d="M34 51 Q60 34 86 51 L85 58 Q60 43 35 58 Z" />
        <path className="mb-monkey-headband-tail" d="M84 51 q14 -9 19 1 q-11 1 -16 8" />
        <ellipse cx="60" cy="68" rx="22" ry="18" fill="#f3d3ac" />
        <ellipse cx="60" cy="40" rx="24" ry="12" fill="#c08a52" />
        {/* eyes */}
        <g className="mb-monkey-eyes">
          <circle cx="50" cy="52" r="5.5" fill="#fff" />
          <circle cx="70" cy="52" r="5.5" fill="#fff" />
          <circle className="mb-pupil" cx="51.5" cy="53" r="3" fill="#2b1a0d" />
          <circle className="mb-pupil" cx="71.5" cy="53" r="3" fill="#2b1a0d" />
        </g>
        {/* nostrils */}
        <circle cx="55" cy="63" r="1.8" fill="#8a5a34" />
        <circle cx="65" cy="63" r="1.8" fill="#8a5a34" />
        {/* mouth — the expression swap */}
        {pose === 'happy' ? (
          <path d="M48 70 q12 14 24 0 q-12 6 -24 0" fill="#8a5a34" />
        ) : pose === 'puzzled' ? (
          <ellipse cx="60" cy="73" rx="5" ry="6" fill="#8a5a34" />
        ) : (
          <path d="M50 71 q10 8 20 0" fill="none" stroke="#8a5a34" strokeWidth="3" strokeLinecap="round" />
        )}
      </g>
      {pose === 'puzzled' && (
        <text className="mb-monkey-think" x="96" y="26" fontSize="24">
          ?
        </text>
      )}
    </svg>
  );
}

/** The confetti specks a popped balloon throws out. */
function Burst() {
  return (
    <span className="mb-burst" aria-hidden="true" data-testid="mb-burst">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="mb-spark" style={{ '--mb-spark-angle': `${i * 45}deg` } as CSSProperties} />
      ))}
    </span>
  );
}

/** Progress as a row of little balloons, popped as the session goes on. */
function BalloonProgress({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();

  return (
    <div
      className="mb-progress"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={t('monkeyBalloonShooter.progress', { current, total })}
    >
      <span className="mb-progress-label">{t('monkeyBalloonShooter.progress', { current, total })}</span>
      <span className="mb-progress-track" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => {
          const state = i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'todo';
          return <span key={i} className={`mb-pip mb-pip-${state}`} aria-hidden="true" />;
        })}
      </span>
    </div>
  );
}

/** A quiet moonlit jungle training arena behind the play area. */
export function Jungle() {
  return (
    <div className="mb-jungle" aria-hidden="true">
      <span className="mb-stars" />
      <span className="mb-moon" />
      <span className="mb-cloud mb-cloud-1" />
      <span className="mb-cloud mb-cloud-2" />
      <span className="mb-hill mb-hill-1" />
      <span className="mb-hill mb-hill-2" />
      <span className="mb-leaf mb-leaf-1" />
      <span className="mb-leaf mb-leaf-2" />
      <span className="mb-ground" />
    </div>
  );
}
