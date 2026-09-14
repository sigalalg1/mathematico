import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { SoundToggle } from '../components/SoundToggle';
import { useCargoStationGame, CARGO_STATION_TOTAL_COUNT } from '../hooks/useCargoStationGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { evaluateQuotientChoice } from '../data/games/cargoStationData';
import { useSound } from '../audio/useSound';
import './CargoStationPage.css';

const GAME_ID = 'cargoStation';
const TOPIC_PATH = '/grade/4/division-with-remainder';

/**
 * One tick flies a whole load to one robot, so the depot empties robot by robot
 * and a shortfall always shows up as the *last* robot standing half loaded.
 */
const DEAL_TICK_MS = 160;
/** How long the equation stays up before the robots fire their thrusters. */
const SUCCESS_HOLD_MS = 1100;
const LAUNCH_MS = 850;
/** A failed attempt is held long enough to be read, then the station resets itself. */
const FAIL_HOLD_MS = 1900;

/** Distinct, index-stable robot colours so a robot keeps its identity across a mission. */
const ROBOT_COLORS = ['#4dd4c1', '#6aa8ff', '#ffb45c', '#c78bff', '#7ee08a', '#ff8fa8'];

/**
 * ARRIVAL -> DECISION -> DISTRIBUTION -> LAUNCH -> NEXT MISSION.
 * `ready` waits for the single tap; `dealing` runs the distribution animation;
 * the rest are the outcomes the child watches play out.
 */
type Phase = 'ready' | 'dealing' | 'success' | 'launch' | 'tooHigh' | 'tooLow';

export function CargoStationPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useCargoStationGame();
  const challenge = game.challenge;
  const { dividend, divisor } = challenge;

  const [phase, setPhase] = useState<Phase>('ready');
  const [choice, setChoice] = useState<number | null>(null);
  /** How many robots the conveyor has reached so far. */
  const [loadedRobots, setLoadedRobots] = useState(0);

  useGameSessionTracking(GAME_ID, {
    total: CARGO_STATION_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  // A new mission (or a replayed round) always arrives with an empty station.
  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPhase('ready');
    setChoice(null);
    setLoadedRobots(0);
  }

  // Runs the distribution: every tick sends one robot its whole requested load,
  // taking whatever the depot has left — so a shortfall strands the last robot.
  useEffect(() => {
    if (phase !== 'dealing' || choice === null) return undefined;
    const outcome = evaluateQuotientChoice(challenge, choice);
    let served = 0;
    const timer = window.setInterval(() => {
      served += 1;
      setLoadedRobots(served);
      play('move');
      if (served < divisor) return;
      window.clearInterval(timer);
      play(outcome === 'correct' ? 'hit' : 'miss');
      setPhase(outcome === 'correct' ? 'success' : outcome);
    }, DEAL_TICK_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, choice, challenge]);

  // Outcome pacing: celebrate and auto-advance, or show the failure and reset.
  useEffect(() => {
    if (phase === 'success') {
      const timer = window.setTimeout(() => {
        play('fire');
        setPhase('launch');
      }, SUCCESS_HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'launch') {
      const timer = window.setTimeout(() => game.next(), LAUNCH_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === 'tooHigh' || phase === 'tooLow') {
      const timer = window.setTimeout(() => {
        setPhase('ready');
        setChoice(null);
        setLoadedRobots(0);
      }, FAIL_HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  // Stage changes stay audible but invisible: no "Stage 2" label on screen.
  const previousStageIndex = usePrevious(game.stageIndex);
  useEffect(() => {
    if (previousStageIndex === undefined || previousStageIndex === game.stageIndex) return;
    play('stageComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.stageIndex]);

  function chooseAmount(amount: number) {
    if (phase !== 'ready') return;
    play('phaseChange');
    setChoice(amount);
    setLoadedRobots(0);
    setPhase('dealing');
    game.submit({ quotient: amount });
  }

  if (game.completed) {
    return (
      <PageLayout
        title={t('cargoStation.gameName')}
        backTo={TOPIC_PATH}
        backLabel={t('divisionWithRemainderPage.title')}
        variant="game"
      >
        <div className="cargo-station">
          <CargoStationCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
        </div>
      </PageLayout>
    );
  }

  // Robot i is served the requested amount, or whatever the depot has left.
  const loads = Array.from({ length: divisor }, (_, i) =>
    i < loadedRobots && choice !== null ? Math.max(0, Math.min(choice, dividend - i * choice)) : 0,
  );
  const delivered = loads.reduce((sum, load) => sum + load, 0);
  const settled = phase === 'success' || phase === 'launch' || phase === 'tooLow';
  const inDepot = settled ? 0 : dividend - delivered;
  const inStorage = settled ? dividend - delivered : 0;
  const feedbackKey = phase === 'tooHigh' ? 'tooHigh' : phase === 'tooLow' ? 'tooLow' : null;

  return (
    <PageLayout
      title={t('cargoStation.gameName')}
      backTo={TOPIC_PATH}
      backLabel={t('divisionWithRemainderPage.title')}
      variant="game"
    >
      <div className="cargo-station">
        <section className={`cs-scene cs-scene-${phase}`}>
          <div className="cs-hud">
            <MissionPath current={game.index + 1} total={game.total} />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <div className="cs-field">
            <div className="cs-depot" aria-label={t('cargoStation.a11y.depot', { count: inDepot })}>
              <span className="cs-zone-label">{t('cargoStation.depot.label')}</span>
              <span className="cs-depot-count">
                <MathText>{inDepot}</MathText>
              </span>
              <div className="cs-depot-pile" data-testid="depot-boxes">
                {Array.from({ length: inDepot }, (_, i) => (
                  <Box key={i} index={i} />
                ))}
              </div>
            </div>

            <div className="cs-bay" style={{ '--cs-robot-count': divisor } as CSSProperties} data-testid="robot-bay">
              {loads.map((load, index) => (
                <Robot
                  key={index}
                  index={index}
                  load={load}
                  requested={choice}
                  phase={phase}
                  color={ROBOT_COLORS[index % ROBOT_COLORS.length]}
                />
              ))}
            </div>

            <div className="cs-storage" aria-label={t('cargoStation.a11y.storage', { count: inStorage })}>
              <span className="cs-zone-label">{t('cargoStation.storage.label')}</span>
              <div className="cs-storage-pile" data-testid="storage-boxes">
                {Array.from({ length: inStorage }, (_, i) => (
                  <Box key={i} index={i} leftover />
                ))}
                {inStorage === 0 && <span className="cs-storage-empty">{t('cargoStation.storage.empty')}</span>}
              </div>
              <span className="cs-storage-count">
                <MathText>{inStorage}</MathText>
              </span>
            </div>
          </div>

          <div className="cs-console">
            {phase === 'ready' && (
              <>
                <p className="cs-question">{t('cargoStation.question')}</p>
                <div className="cs-choices">
                  {game.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="cs-choice"
                      onClick={() => chooseAmount(option)}
                      aria-label={t('cargoStation.a11y.choose', { count: option })}
                    >
                      <MathText>{option}</MathText>
                    </button>
                  ))}
                </div>
              </>
            )}

            {(phase === 'success' || phase === 'launch') && (
              <p className="cs-equation" data-testid="cargo-equation">
                <MathText className="cs-equation-text">
                  {dividend} ÷ {divisor} = <span className="cs-equation-quotient">{challenge.quotient}</span>{' '}
                  {challenge.remainder > 0 && (
                    <>
                      {t('cargoStation.equation.remainderWord')}{' '}
                      <span className="cs-equation-remainder">{challenge.remainder}</span>
                    </>
                  )}
                </MathText>
              </p>
            )}

            {feedbackKey && <p className={`cs-alert cs-alert-${feedbackKey}`}>{t(`cargoStation.feedback.${feedbackKey}`)}</p>}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

/** Game-native progress: a row of launch pads, lit as missions are completed. */
function MissionPath({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();

  return (
    <div
      className="cs-path"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={t('cargoStation.progress', { current, total })}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'todo';
        return <span key={i} className={`cs-pad cs-pad-${state}`} aria-hidden="true" />;
      })}
    </div>
  );
}

function Box({ index, leftover = false }: { index: number; leftover?: boolean }) {
  return (
    <span
      className={`cs-box${leftover ? ' cs-box-leftover' : ''}`}
      style={{ '--cs-box-index': index } as CSSProperties}
      aria-hidden="true"
    />
  );
}

interface RobotProps {
  index: number;
  load: number;
  requested: number | null;
  phase: Phase;
  color: string;
}

function Robot({ index, load, requested, phase, color }: RobotProps) {
  const { t } = useTranslation();
  const full = requested !== null && load >= requested;
  const incomplete = phase === 'tooHigh' && !full;
  const cleared = (phase === 'success' || phase === 'launch' || phase === 'tooLow') && full;
  const fill = requested && requested > 0 ? Math.min(load / requested, 1) : 0;

  const classes = ['cs-robot'];
  if (incomplete) classes.push('cs-robot-incomplete');
  if (cleared) classes.push('cs-robot-ready');
  if (phase === 'launch') classes.push('cs-robot-launching');

  return (
    <div
      className={classes.join(' ')}
      style={{ '--cs-robot-color': color, '--cs-robot-delay': `${index * 70}ms` } as CSSProperties}
      aria-label={t('cargoStation.a11y.robot', { index: index + 1, count: load })}
      data-testid={`robot-${index}`}
    >
      {/* The too-low lesson: one more box is still on its way to everyone. */}
      {phase === 'tooLow' && <span className="cs-ghost-box" aria-hidden="true" />}

      <span className="cs-robot-stack" data-testid={`robot-stack-${index}`}>
        {Array.from({ length: load }, (_, i) => (
          <Box key={i} index={i} />
        ))}
      </span>

      <RobotGlyph />

      <span className="cs-meter" aria-hidden="true">
        <span className="cs-meter-fill" style={{ '--cs-meter': `${Math.round(fill * 100)}%` } as CSSProperties} />
      </span>

      <span className="cs-robot-count" aria-hidden="true">
        <MathText>{load}</MathText>
      </span>
    </div>
  );
}

/** An original blocky loader robot, drawn entirely from plain SVG primitives. */
function RobotGlyph() {
  return (
    <svg viewBox="0 0 72 92" className="cs-robot-svg" aria-hidden="true" focusable="false">
      <ellipse cx="36" cy="87" rx="24" ry="5" className="cs-robot-shadow" />
      <rect x="33" y="0" width="6" height="11" rx="3" className="cs-robot-trim" />
      <circle cx="36" cy="2" r="5" className="cs-robot-lamp" />
      <rect x="8" y="10" width="56" height="38" rx="13" className="cs-robot-head" />
      <rect x="14" y="17" width="44" height="16" rx="8" className="cs-robot-visor" />
      <rect x="21" y="21" width="10" height="9" rx="4.5" className="cs-robot-eye" />
      <rect x="41" y="21" width="10" height="9" rx="4.5" className="cs-robot-eye" />
      <rect x="27" y="39" width="18" height="4" rx="2" className="cs-robot-mouth" />
      <rect x="2" y="50" width="68" height="16" rx="7" className="cs-robot-tray" />
      <rect x="10" y="54" width="52" height="4" rx="2" className="cs-robot-tray-line" />
      <rect x="16" y="68" width="12" height="14" rx="4" className="cs-robot-leg" />
      <rect x="44" y="68" width="12" height="14" rx="4" className="cs-robot-leg" />
      <g className="cs-robot-thruster" aria-hidden="true">
        <path d="M22 82 L36 104 L50 82 Z" className="cs-robot-flame" />
      </g>
    </svg>
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
        {ROBOT_COLORS.slice(0, 4).map((color, index) => (
          <span
            key={color}
            className="cs-completion-robot"
            style={{ '--cs-robot-color': color, '--cs-robot-delay': `${index * 120}ms` } as CSSProperties}
          >
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
