import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { FractionNotation } from '../components/FractionNotation';
import { FractionShape } from '../components/FractionShape';
import { useFractionBalloonsGame } from '../hooks/useFractionBalloonsGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { FRACTION_BALLOONS_TOTAL } from '../data/games/fractionBalloonsData';
import { useSound } from '../audio/useSound';
import type { BalloonFraction } from '../types/fractionBalloons';
import './FractionBalloonsPage.css';

const GAME_ID = 'fractionBalloons';
const TOPIC_PATH = '/grade/4/simple-fractions';

/** How long the burst is on screen before the next question floats in. */
const POP_MS = 600;
/** How long a wrongly tapped balloon wobbles before it settles back. */
const WOBBLE_MS = 520;

/** Per-balloon float rhythm, so the four never bob in lockstep. */
const FLOAT_RHYTHM = [
  { duration: '3.4s', delay: '0s', drift: '6px' },
  { duration: '4.1s', delay: '-1.2s', drift: '-8px' },
  { duration: '3.7s', delay: '-2.4s', drift: '9px' },
  { duration: '4.5s', delay: '-0.6s', drift: '-5px' },
];

export function FractionBalloonsPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useFractionBalloonsGame();
  const question = game.question;

  /** Index of the balloon currently bursting, if any. */
  const [popping, setPopping] = useState<number | null>(null);
  /**
   * The balloon shaking off a wrong tap. `seed` alternates the keyframe name so
   * tapping the same wrong balloon twice in a row restarts the wobble.
   */
  const [wobbling, setWobbling] = useState<{ index: number; seed: number } | null>(null);

  useGameSessionTracking(GAME_ID, {
    total: FRACTION_BALLOONS_TOTAL,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  // Every new question (and every replay) arrives with a fresh sky.
  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPopping(null);
    setWobbling(null);
  }

  // The burst plays out, then the next question comes by itself — no "Next" button.
  useEffect(() => {
    if (popping === null) return undefined;
    const timer = window.setTimeout(() => game.next(), POP_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popping]);

  // A wrong balloon stays in the sky; only its wobble ends.
  useEffect(() => {
    if (wobbling === null) return undefined;
    const timer = window.setTimeout(() => setWobbling(null), WOBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [wobbling]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  function tapBalloon(index: number, option: BalloonFraction) {
    if (game.status === 'correct') return;
    const isCorrect = option.numerator === question.target.numerator && option.denominator === question.target.denominator;
    game.submit(option);

    if (isCorrect) {
      play('hit');
      setWobbling(null);
      setPopping(index);
      return;
    }
    play('miss');
    setWobbling({ index, seed: game.attemptSeed });
  }

  if (game.completed) {
    return (
      <PageLayout title={t('fractionBalloons.gameName')} backTo={TOPIC_PATH} backLabel={t('simpleFractionsPage.title')} variant="game">
        <div className="fb-game">
          <section className="fb-sky fb-sky-done">
            <Clouds />
            <div className="fb-completion">
              <p className="fb-completion-emoji" aria-hidden="true">
                🎈🎈🎈
              </p>
              <h2 className="fb-completion-title">{t('fractionBalloons.completion.title')}</h2>
              <p className="fb-completion-summary">{t('fractionBalloons.completion.summary', { total: game.total })}</p>
              <div className="fb-completion-actions">
                <button type="button" className="btn fb-btn fb-btn-primary" onClick={game.retry}>
                  {t('fractionBalloons.actions.playAgain')}
                </button>
                <Link className="btn fb-btn fb-btn-ghost" to={TOPIC_PATH}>
                  {t('fractionBalloons.actions.backToTopic')}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('fractionBalloons.gameName')} backTo={TOPIC_PATH} backLabel={t('simpleFractionsPage.title')} variant="game">
      <div className="fb-game">
        <section className="fb-sky">
          <Clouds />

          <div className="fb-hud">
            <BalloonProgress current={game.index + 1} total={game.total} />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <div className="fb-question" data-testid="fb-question">
            {question.kind === 'symbolic' ? (
              <>
                <p className="fb-prompt">{t('fractionBalloons.prompt.symbolic')}</p>
                <FractionNotation
                  numerator={question.target.numerator}
                  denominator={question.target.denominator}
                  size="lg"
                  className="fb-target"
                  data-testid="fb-target-fraction"
                />
              </>
            ) : (
              <>
                <p className="fb-prompt">{t('fractionBalloons.prompt.visual')}</p>
                <FractionShape
                  shape={question.shape}
                  pieces={question.target.denominator}
                  selected={question.selectedPieces}
                  separated
                  className="fb-target-shape"
                  data-testid="fb-target-shape"
                />
              </>
            )}
          </div>

          <div className="fb-balloons">
            {question.options.map((option, index) => {
              const rhythm = FLOAT_RHYTHM[index % FLOAT_RHYTHM.length];
              const classes = ['fb-balloon', `fb-balloon-${index % FLOAT_RHYTHM.length}`];
              if (popping === index) classes.push('fb-balloon-popping');
              if (wobbling?.index === index) classes.push(`fb-balloon-wobbling-${wobbling.seed % 2}`);

              return (
                <button
                  key={`${option.numerator}-${option.denominator}`}
                  type="button"
                  className={classes.join(' ')}
                  style={
                    {
                      '--fb-float-duration': rhythm.duration,
                      '--fb-float-delay': rhythm.delay,
                      '--fb-drift': rhythm.drift,
                    } as CSSProperties
                  }
                  data-testid={`fb-balloon-${option.numerator}-${option.denominator}`}
                  aria-label={t('fractionBalloons.a11y.balloon', { numerator: option.numerator, denominator: option.denominator })}
                  onClick={() => tapBalloon(index, option)}
                >
                  <span className="fb-balloon-body">
                    <span className="fb-balloon-shine" aria-hidden="true" />
                    <FractionNotation numerator={option.numerator} denominator={option.denominator} size="lg" className="fb-balloon-fraction" />
                  </span>
                  <span className="fb-balloon-knot" aria-hidden="true" />
                  <span className="fb-balloon-string" aria-hidden="true" />
                  {popping === index && <Burst />}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

/** The confetti specks a popped balloon throws out. */
function Burst() {
  return (
    <span className="fb-burst" aria-hidden="true" data-testid="fb-burst">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="fb-spark" style={{ '--fb-spark-angle': `${i * 45}deg` } as CSSProperties} />
      ))}
    </span>
  );
}

/** Progress as a row of little balloons, popped as the session goes on. */
function BalloonProgress({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();

  return (
    <div
      className="fb-progress"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={t('fractionBalloons.progress', { current, total })}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'todo';
        return <span key={i} className={`fb-pip fb-pip-${state}`} aria-hidden="true" />;
      })}
    </div>
  );
}

/** Static background clouds — pure decoration behind the play area. */
function Clouds() {
  return (
    <div className="fb-clouds" aria-hidden="true">
      <span className="fb-cloud fb-cloud-1" />
      <span className="fb-cloud fb-cloud-2" />
      <span className="fb-cloud fb-cloud-3" />
    </div>
  );
}
