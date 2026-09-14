import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { useCargoStationGame, CARGO_STATION_TOTAL_COUNT } from '../hooks/useCargoStationGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import type { SplitProblem } from '../types/cargoStation';
import './CargoStationPage.css';

const GAME_ID = 'cargoStation';
const TOPIC_PATH = '/grade/4/division-with-remainder';
const STEPPER_MAX = 12;
/** Distinct, cool-but-playful loader colours; index-stable so a robot keeps its identity. */
const LOADER_COLORS = ['#4dd4c1', '#6aa8ff', '#ffb45c', '#c78bff', '#7ee08a', '#ff8fa8'];

export function CargoStationPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useCargoStationGame();
  const challenge = game.challenge;

  const [loads, setLoads] = useState<number[]>(() => new Array(challenge.divisor).fill(0));
  const [splitConfirmed, setSplitConfirmed] = useState(false);
  const [splitProblem, setSplitProblem] = useState<SplitProblem | null>(null);
  const [quotientInput, setQuotientInput] = useState(0);
  const [remainderInput, setRemainderInput] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(false);

  useGameSessionTracking(GAME_ID, {
    total: CARGO_STATION_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  // Reset the station whenever a new delivery (or a new round) starts.
  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setLoads(new Array(challenge.divisor).fill(0));
    setSplitConfirmed(false);
    setSplitProblem(null);
    setQuotientInput(0);
    setRemainderInput(0);
  }

  useEffect(() => {
    if (game.status === 'correct') play('hit');
    else if (game.status === 'incorrect') play('miss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  const previousStageIndex = usePrevious(game.stageIndex);
  useEffect(() => {
    if (previousStageIndex === undefined || previousStageIndex === game.stageIndex) return;
    play('stageComplete');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the chime, not derived state
    setBannerVisible(true);
    const timer = window.setTimeout(() => setBannerVisible(false), 2400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.stageIndex]);

  useEffect(() => {
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.next(), 1100);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  const dealt = loads.reduce((sum, value) => sum + value, 0);
  const onPlatform = challenge.dividend - dealt;
  const locked = game.status === 'correct';
  const minLoad = Math.min(...loads);
  const maxLoad = Math.max(...loads);
  const uneven = maxLoad !== minLoad;

  function giveCrateTo(index: number) {
    if (splitConfirmed || locked || onPlatform === 0) return;
    setSplitProblem(null);
    setLoads((current) => current.map((value, i) => (i === index ? value + 1 : value)));
    play('move');
  }

  function resetLoads() {
    if (splitConfirmed || locked) return;
    setLoads(new Array(challenge.divisor).fill(0));
    setSplitProblem(null);
  }

  function checkSplit() {
    if (uneven) {
      setSplitProblem('unequal');
      play('miss');
      return;
    }
    if (onPlatform >= challenge.divisor) {
      setSplitProblem('canGiveMore');
      play('miss');
      return;
    }
    setSplitProblem(null);
    setSplitConfirmed(true);
    play('phaseChange');
  }

  function deliver() {
    if (locked) return;
    game.submit({ quotient: quotientInput, remainder: remainderInput });
  }

  if (game.completed) {
    return (
      <PageLayout title={t('cargoStation.gameName')} backTo={TOPIC_PATH} backLabel={t('divisionWithRemainderPage.title')}>
        <div className="cargo-station">
          <CargoStationCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
        </div>
      </PageLayout>
    );
  }

  const showCounts = game.status === 'incorrect';

  return (
    <PageLayout title={t('cargoStation.gameName')} backTo={TOPIC_PATH} backLabel={t('divisionWithRemainderPage.title')}>
      <div className="cargo-station">
        <div className="cs-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="cargoStation.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <div className="cs-stage-row">
          <span className="cs-stage-pill">{t(game.stage.nameKey)}</span>
          {bannerVisible && <span className="cs-stage-banner">{t(game.stage.introKey)}</span>}
        </div>

        <div className="cs-mission">
          <span className="cs-mission-chip">
            <span className="cs-mission-chip-icon" aria-hidden="true" />
            <MathText>{challenge.dividend}</MathText> {t('cargoStation.mission.crates')}
          </span>
          <span className="cs-mission-chip">
            <span className="cs-mission-chip-icon cs-mission-chip-icon-loader" aria-hidden="true" />
            <MathText>{challenge.divisor}</MathText> {t('cargoStation.mission.loaders')}
          </span>
        </div>
        <p className="cs-instruction">
          {splitConfirmed ? t('cargoStation.mission.readNumbers') : t('cargoStation.mission.instruction')}
        </p>

        <section className={`cs-scene${splitConfirmed ? ' cs-scene-confirmed' : ''}`}>
          <div className={`cs-platform${splitConfirmed ? ' cs-platform-leftover' : ''}${showCounts ? ' cs-highlight' : ''}`}>
            <span className="cs-platform-label">
              {splitConfirmed ? t('cargoStation.platform.leftoverTitle') : t('cargoStation.platform.title')}
            </span>
            <div className="cs-crate-field" data-testid="platform-crates">
              {Array.from({ length: onPlatform }, (_, i) => (
                <span key={i} className={`cs-crate${splitConfirmed ? ' cs-crate-leftover' : ''}`} />
              ))}
              {onPlatform === 0 && <span className="cs-platform-empty">{t('cargoStation.platform.empty')}</span>}
            </div>
            {showCounts && (
              <span className="cs-count-callout">{t('cargoStation.counts.leftover', { crates: onPlatform })}</span>
            )}
          </div>

          <div className="cs-loaders" style={{ '--cs-loader-count': challenge.divisor } as CSSProperties}>
            {loads.map((count, index) => (
              <LoaderRobot
                key={index}
                index={index}
                count={count}
                color={LOADER_COLORS[index % LOADER_COLORS.length]}
                disabled={splitConfirmed || locked || onPlatform === 0}
                uneven={splitProblem === 'unequal' && count !== maxLoad}
                cheering={locked}
                showCount={!splitConfirmed || showCounts}
                onGive={() => giveCrateTo(index)}
              />
            ))}
          </div>
          {showCounts && <span className="cs-count-callout cs-count-callout-loaders">{t('cargoStation.counts.perLoader', { crates: minLoad })}</span>}
        </section>

        {!splitConfirmed ? (
          <div className="cs-actions">
            <button type="button" className="btn cs-btn cs-btn-ghost" onClick={resetLoads} disabled={dealt === 0}>
              {t('cargoStation.actions.reset')}
            </button>
            <button type="button" className="btn cs-btn cs-btn-primary" onClick={checkSplit}>
              {t('cargoStation.actions.checkSplit')}
            </button>
          </div>
        ) : (
          <div className="cs-answer">
            <div className="cs-equation">
              <MathText className="cs-equation-text">
                {challenge.dividend} ÷ {challenge.divisor} ={' '}
                <span className="cs-slot-value">{quotientInput}</span> {t('cargoStation.equation.remainderWord')}{' '}
                <span className="cs-slot-value cs-slot-value-remainder">{remainderInput}</span>
              </MathText>
            </div>
            {/* LTR so the two steppers sit in the same order as the written form above. */}
            <div className="cs-steppers" dir="ltr">
              <NumberStepper
                label={t('cargoStation.equation.perLoader')}
                value={quotientInput}
                onChange={setQuotientInput}
                disabled={locked}
                variant="quotient"
              />
              <NumberStepper
                label={t('cargoStation.equation.leftover')}
                value={remainderInput}
                onChange={setRemainderInput}
                disabled={locked}
                variant="remainder"
              />
            </div>
            <button type="button" className="btn cs-btn cs-btn-primary" onClick={deliver} disabled={locked}>
              {t('cargoStation.actions.deliver')}
            </button>
          </div>
        )}

        {splitProblem && <p className="cs-feedback cs-feedback-hint">{t(`cargoStation.split.${splitProblem}`)}</p>}
        {game.status === 'incorrect' && <p className="cs-feedback cs-feedback-hint">{t('cargoStation.feedback.incorrect')}</p>}
        {game.status === 'correct' && <p className="cs-feedback cs-feedback-correct">{t('cargoStation.feedback.correct')}</p>}
      </div>
    </PageLayout>
  );
}

interface LoaderRobotProps {
  index: number;
  count: number;
  color: string;
  disabled: boolean;
  uneven: boolean;
  cheering: boolean;
  showCount: boolean;
  onGive: () => void;
}

function LoaderRobot({ index, count, color, disabled, uneven, cheering, showCount, onGive }: LoaderRobotProps) {
  const { t } = useTranslation();
  const classes = ['cs-loader'];
  if (uneven) classes.push('cs-loader-uneven');
  if (cheering) classes.push('cs-loader-cheering');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      style={{ '--cs-loader-color': color } as CSSProperties}
      onClick={onGive}
      disabled={disabled}
      aria-label={t('cargoStation.a11y.giveCrate', { index: index + 1, crates: count })}
    >
      <span className="cs-loader-stack" data-testid={`loader-stack-${index}`}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className="cs-crate cs-crate-loaded" />
        ))}
      </span>
      {/* Re-mounting on every change replays the little "nod" animation. */}
      <span className="cs-loader-figure" key={count}>
        <RobotGlyph />
      </span>
      <span className="cs-loader-badge">{showCount ? <MathText>{count}</MathText> : '?'}</span>
    </button>
  );
}

/** A simple original blocky loader built from plain SVG rectangles. */
function RobotGlyph() {
  return (
    <svg viewBox="0 0 64 68" className="cs-robot" aria-hidden="true" focusable="false">
      <rect x="30" y="2" width="4" height="9" rx="2" className="cs-robot-antenna" />
      <circle cx="32" cy="4" r="4" className="cs-robot-light" />
      <rect x="10" y="11" width="44" height="34" rx="10" className="cs-robot-head" />
      <rect x="18" y="22" width="10" height="11" rx="5" className="cs-robot-eye" />
      <rect x="36" y="22" width="10" height="11" rx="5" className="cs-robot-eye" />
      <rect x="24" y="37" width="16" height="4" rx="2" className="cs-robot-mouth" />
      <rect x="4" y="46" width="56" height="12" rx="5" className="cs-robot-tray" />
      <rect x="14" y="58" width="10" height="8" rx="3" className="cs-robot-foot" />
      <rect x="40" y="58" width="10" height="8" rx="3" className="cs-robot-foot" />
    </svg>
  );
}

interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  variant: 'quotient' | 'remainder';
}

function NumberStepper({ label, value, onChange, disabled, variant }: NumberStepperProps) {
  const { t } = useTranslation();

  return (
    <div className={`cs-stepper cs-stepper-${variant}`}>
      <span className="cs-stepper-label">{label}</span>
      <div className="cs-stepper-controls" dir="ltr">
        <button
          type="button"
          className="cs-stepper-button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value === 0}
          aria-label={t(`cargoStation.a11y.decrease.${variant}`)}
        >
          −
        </button>
        <output className="cs-stepper-value">
          <MathText>{value}</MathText>
        </output>
        <button
          type="button"
          className="cs-stepper-button"
          onClick={() => onChange(Math.min(STEPPER_MAX, value + 1))}
          disabled={disabled || value === STEPPER_MAX}
          aria-label={t(`cargoStation.a11y.increase.${variant}`)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function usePrevious<T>(value: T): T | undefined {
  const [state, setState] = useState<{ current: T; previous: T | undefined }>({ current: value, previous: undefined });
  if (state.current !== value) {
    setState({ current: value, previous: state.current });
  }
  return state.previous;
}

interface CargoStationCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function CargoStationCompletion({ total, firstTryCount, onRetry }: CargoStationCompletionProps) {
  const { t } = useTranslation();

  return (
    <div className="cs-completion">
      <div className="cs-completion-crew" aria-hidden="true">
        {LOADER_COLORS.slice(0, 4).map((color, index) => (
          <span key={color} className="cs-completion-robot" style={{ '--cs-loader-color': color, '--cs-delay': `${index * 120}ms` } as CSSProperties}>
            <RobotGlyph />
          </span>
        ))}
      </div>
      <h2 className="cs-completion-title">{t('cargoStation.completion.title')}</h2>
      <p className="cs-completion-summary">{t('cargoStation.completion.summary', { total })}</p>
      <p className="cs-completion-detail">{t('cargoStation.completion.firstTry', { first: firstTryCount })}</p>
      <div className="cs-completion-actions">
        <button type="button" className="btn cs-btn cs-btn-primary" onClick={onRetry}>
          {t('cargoStation.actions.playAgain')}
        </button>
        <Link className="btn cs-btn cs-btn-ghost" to={TOPIC_PATH}>
          {t('cargoStation.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}
