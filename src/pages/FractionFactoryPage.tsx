import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { FractionNotation } from '../components/FractionNotation';
import { FractionShape } from '../components/FractionShape';
import { MathText } from '../components/MathText';
import { useFractionFactoryGame, FRACTION_FACTORY_TOTAL_COUNT } from '../hooks/useFractionFactoryGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { isCorrectCut } from '../data/games/fractionFactoryData';
import { useSound } from '../audio/useSound';
import './FractionFactoryPage.css';

const GAME_ID = 'fractionFactory';
const TOPIC_PATH = '/grade/4/simple-fractions';

/** How long the cutting machine runs before the pieces are there. */
const CUT_MS = 700;
/** A teaching beat is held long enough to be read, then the machine resets. */
const TEACH_MS = 2300;
/**
 * Selection is freely toggleable, so the factory packs the order a beat after
 * the child stops changing their mind — no "check" button anywhere.
 */
const PACK_MS = 900;
const SHIP_MS = 1400;

/** Steppers stay inside the introductory range this game teaches. */
const MIN_DENOMINATOR = 2;
const MAX_DENOMINATOR = 8;

type Phase =
  | 'cut' // build order: how many equal pieces?
  | 'pattern' // equal-parts beat: which cutting setup is valid?
  | 'cutting' // the blade comes down
  | 'select' // take the pieces the order asks for
  | 'reverse' // read the cut whole, write its fraction
  | 'wrongCut'
  | 'wrongPattern'
  | 'wrongPick'
  | 'wrongReverse'
  | 'shipping';

function startPhase(kind: string): Phase {
  if (kind === 'equalParts') return 'pattern';
  if (kind === 'reverse') return 'reverse';
  return 'cut';
}

export function FractionFactoryPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useFractionFactoryGame();
  const order = game.order;

  const [phase, setPhase] = useState<Phase>(() => startPhase(order.kind));
  /** How many pieces the machine actually cut — the child's denominator decision. */
  const [cutPieces, setCutPieces] = useState<number | null>(order.kind === 'build' ? null : order.denominator);
  const [selected, setSelected] = useState<number[]>(order.preselected);
  const [writtenNumerator, setWrittenNumerator] = useState(1);
  const [writtenDenominator, setWrittenDenominator] = useState(MIN_DENOMINATOR);
  /** Reverse orders are only judged once the child has actually dialled something. */
  const [writingTouched, setWritingTouched] = useState(false);

  useGameSessionTracking(GAME_ID, {
    total: FRACTION_FACTORY_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  // Every new order (and every replayed shift) arrives at an empty machine.
  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPhase(startPhase(order.kind));
    setCutPieces(order.kind === 'build' ? null : order.denominator);
    setSelected(order.preselected);
    setWrittenNumerator(1);
    setWrittenDenominator(MIN_DENOMINATOR);
    setWritingTouched(false);
  }

  // The blade comes down, then the scene shows what that cut produced.
  useEffect(() => {
    if (phase !== 'cutting' || cutPieces === null) return undefined;
    const timer = window.setTimeout(() => {
      if (isCorrectCut(order, cutPieces)) {
        play('phaseChange');
        setPhase('select');
        return;
      }
      play('miss');
      game.submit({ denominator: cutPieces, numerator: null });
      setPhase('wrongCut');
    }, CUT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cutPieces]);

  // A wrong cut / wrong cutting pattern is shown, then the machine resets itself.
  useEffect(() => {
    if (phase !== 'wrongCut' && phase !== 'wrongPattern') return undefined;
    const timer = window.setTimeout(() => {
      setPhase(phase === 'wrongCut' ? 'cut' : 'pattern');
      setCutPieces(order.kind === 'build' ? null : order.denominator);
      setSelected([]);
    }, TEACH_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Packing: a short settle after the last tap, then the order is judged.
  useEffect(() => {
    if (phase !== 'select' || selected.length === 0 || cutPieces === null) return undefined;
    const timer = window.setTimeout(() => {
      game.submit({ denominator: cutPieces, numerator: selected.length });
      if (selected.length === order.numerator) {
        play('hit');
        setPhase('shipping');
      } else {
        play('miss');
        setPhase('wrongPick');
      }
    }, PACK_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected]);

  // The same settle rule for a reverse order's numerator/denominator dials.
  useEffect(() => {
    if (phase !== 'reverse' || !writingTouched) return undefined;
    const timer = window.setTimeout(() => {
      game.submit({ denominator: writtenDenominator, numerator: writtenNumerator });
      if (writtenDenominator === order.denominator && writtenNumerator === order.numerator) {
        play('hit');
        setPhase('shipping');
      } else {
        play('miss');
        setPhase('wrongReverse');
      }
    }, PACK_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, writingTouched, writtenNumerator, writtenDenominator]);

  // The finished product leaves on the belt and the next order arrives by itself.
  useEffect(() => {
    if (phase !== 'shipping') return undefined;
    const timer = window.setTimeout(() => {
      play('fire');
      game.next();
    }, SHIP_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  // Internal progression stays audible but invisible — no "Stage 2" on screen.
  const previousStageId = usePrevious(order.stageId);
  useEffect(() => {
    if (previousStageId === undefined || previousStageId === order.stageId) return;
    play('stageComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.stageId]);

  function chooseCut(pieces: number) {
    if (phase !== 'cut') return;
    play('cut');
    setCutPieces(pieces);
    setSelected([]);
    setPhase('cutting');
  }

  function choosePattern(equal: boolean) {
    if (phase !== 'pattern') return;
    if (!equal) {
      play('miss');
      game.submit({ denominator: order.denominator, numerator: null });
      setPhase('wrongPattern');
      return;
    }
    play('cut');
    setCutPieces(order.denominator);
    setSelected([]);
    setPhase('cutting');
  }

  function togglePiece(index: number) {
    if (phase !== 'select' && phase !== 'wrongPick') return;
    play('select');
    setPhase('select');
    setSelected((current) => (current.includes(index) ? current.filter((i) => i !== index) : [...current, index]));
  }

  function writeFraction(numerator: number, denominator: number) {
    if (phase !== 'reverse' && phase !== 'wrongReverse') return;
    play('select');
    setWritingTouched(true);
    setPhase('reverse');
    setWrittenDenominator(denominator);
    setWrittenNumerator(Math.min(numerator, denominator));
  }

  if (game.completed) {
    return (
      <PageLayout title={t('fractionFactory.gameName')} backTo={TOPIC_PATH} backLabel={t('simpleFractionsPage.title')} variant="game">
        <div className="fraction-factory">
          <FactoryCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
        </div>
      </PageLayout>
    );
  }

  // Before the cutting decision is made the whole is still whole — one piece.
  const uncut = phase === 'cut' || phase === 'pattern' || phase === 'cutting';
  const displayedPieces = uncut ? 1 : (cutPieces ?? 1);
  const showUnequal = phase === 'wrongPattern';
  const separated = !uncut;
  const shapeSelectable = phase === 'select' || phase === 'wrongPick';
  const revealOrder = order.kind !== 'reverse';

  return (
    <PageLayout title={t('fractionFactory.gameName')} backTo={TOPIC_PATH} backLabel={t('simpleFractionsPage.title')} variant="game">
      <div className="fraction-factory">
        <section className={`ff-scene ff-scene-${phase}`}>
          <div className="ff-hud">
            <OrderPath current={game.index + 1} total={game.total} />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <div className="ff-floor">
            <div className="ff-ticket" data-testid="ff-ticket">
              <span className="ff-ticket-label">{t('fractionFactory.ticket.label')}</span>
              {revealOrder ? (
                <FractionNotation numerator={order.numerator} denominator={order.denominator} size="lg" data-testid="ff-order-fraction" />
              ) : (
                <span className="ff-ticket-unknown" aria-label={t('fractionFactory.ticket.unknown')}>
                  ?
                </span>
              )}
            </div>

            <div className="ff-machine">
              <MachineFrame cutting={phase === 'cutting'} />
              <div className={`ff-product${phase === 'shipping' ? ' ff-product-shipping' : ''}`}>
                <FractionShape
                  shape={order.shape}
                  pieces={displayedPieces}
                  unequal={showUnequal}
                  separated={separated}
                  selected={selected}
                  onTogglePiece={shapeSelectable ? togglePiece : undefined}
                  pieceLabel={(index) => t('fractionFactory.a11y.piece', { index: index + 1, total: displayedPieces })}
                  data-testid="ff-shape"
                />
              </div>
              <div className="ff-belt" aria-hidden="true">
                <span className="ff-belt-tread" />
              </div>
            </div>

            <div className="ff-crate" aria-hidden="true">
              <CrateGlyph shipping={phase === 'shipping'} />
            </div>
          </div>

          <div className="ff-console">
            {phase === 'cut' && (
              <>
                <p className="ff-prompt">{t('fractionFactory.prompt.cut')}</p>
                <div className="ff-choices">
                  {order.cutOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className="ff-choice"
                      onClick={() => chooseCut(option)}
                      aria-label={t('fractionFactory.a11y.cut', { count: option })}
                    >
                      <MathText>{option}</MathText>
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase === 'pattern' && (
              <>
                <p className="ff-prompt">{t('fractionFactory.prompt.pattern')}</p>
                <div className="ff-patterns">
                  {(order.equalPatternFirst ? [true, false] : [false, true]).map((equal) => (
                    <button
                      key={String(equal)}
                      type="button"
                      className="ff-pattern"
                      onClick={() => choosePattern(equal)}
                      data-testid={equal ? 'ff-pattern-equal' : 'ff-pattern-unequal'}
                      aria-label={t(equal ? 'fractionFactory.a11y.patternEqual' : 'fractionFactory.a11y.patternUnequal', {
                        count: order.denominator,
                      })}
                    >
                      <FractionShape shape={order.shape} pieces={order.denominator} unequal={!equal} separated className="ff-pattern-shape" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase === 'cutting' && <p className="ff-prompt ff-prompt-quiet">{t('fractionFactory.prompt.cutting')}</p>}

            {(phase === 'select' || phase === 'shipping') && cutPieces !== null && (
              <div className="ff-lesson" data-testid="ff-lesson">
                <FractionNotation
                  numerator={selected.length}
                  denominator={cutPieces}
                  unknownNumerator={selected.length === 0}
                  highlight={selected.length === 0 ? 'denominator' : phase === 'shipping' ? 'both' : 'numerator'}
                  size="lg"
                  data-testid="ff-built-fraction"
                />
                <p className="ff-lesson-text">
                  {phase === 'shipping'
                    ? t('fractionFactory.feedback.shipped')
                    : selected.length === 0
                      ? t('fractionFactory.lesson.denominator', { count: cutPieces })
                      : t('fractionFactory.lesson.numerator', { count: selected.length })}
                </p>
              </div>
            )}

            {phase === 'wrongCut' && cutPieces !== null && (
              <div className="ff-teach ff-teach-wrong" data-testid="ff-wrong-cut">
                <p className="ff-teach-text">{t('fractionFactory.feedback.wrongCut', { got: cutPieces, want: order.denominator })}</p>
                <div className="ff-teach-row">
                  <FractionNotation numerator={1} denominator={cutPieces} highlight="denominator" data-testid="ff-made-piece" />
                  <span className="ff-teach-vs" aria-hidden="true">
                    ≠
                  </span>
                  <FractionNotation numerator={1} denominator={order.denominator} highlight="denominator" data-testid="ff-needed-piece" />
                </div>
              </div>
            )}

            {phase === 'wrongPattern' && (
              <div className="ff-teach ff-teach-wrong" data-testid="ff-wrong-pattern">
                <p className="ff-teach-text">{t('fractionFactory.feedback.unequal')}</p>
                <div className="ff-teach-row">
                  <FractionNotation numerator={1} denominator={order.denominator} highlight="denominator" />
                </div>
              </div>
            )}

            {phase === 'wrongPick' && cutPieces !== null && (
              <div className="ff-teach ff-teach-wrong" data-testid="ff-wrong-pick">
                <p className="ff-teach-text">{t('fractionFactory.feedback.wrongPick')}</p>
                <div className="ff-teach-row">
                  <FractionNotation numerator={selected.length} denominator={cutPieces} highlight="numerator" data-testid="ff-built-fraction" />
                  <span className="ff-teach-vs" aria-hidden="true">
                    ≠
                  </span>
                  <FractionNotation numerator={order.numerator} denominator={order.denominator} highlight="numerator" />
                </div>
              </div>
            )}

            {(phase === 'reverse' || phase === 'wrongReverse') && (
              <div className="ff-writer">
                <p className="ff-prompt">
                  {phase === 'wrongReverse' ? t('fractionFactory.feedback.wrongReverse') : t('fractionFactory.prompt.reverse')}
                </p>
                <FractionDial
                  numerator={writtenNumerator}
                  denominator={writtenDenominator}
                  wrong={phase === 'wrongReverse'}
                  onChange={writeFraction}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

/** Game-native progress: a row of crates on the shipping rail, filled as orders leave. */
function OrderPath({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();

  return (
    <div
      className="ff-path"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={t('fractionFactory.progress', { current, total })}
    >
      {Array.from({ length: total }, (_, i) => {
        const state = i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'todo';
        return <span key={i} className={`ff-pip ff-pip-${state}`} aria-hidden="true" />;
      })}
    </div>
  );
}

/** The cutting machine: a gantry with a blade that drops while the whole is cut. */
function MachineFrame({ cutting }: { cutting: boolean }) {
  return (
    <svg viewBox="0 0 320 120" className={`ff-machine-svg${cutting ? ' ff-machine-cutting' : ''}`} aria-hidden="true" focusable="false">
      <rect x="6" y="8" width="308" height="26" rx="9" className="ff-machine-beam" />
      <rect x="6" y="34" width="26" height="78" rx="8" className="ff-machine-leg" />
      <rect x="288" y="34" width="26" height="78" rx="8" className="ff-machine-leg" />
      <circle cx="52" cy="21" r="7" className="ff-machine-lamp" />
      <circle cx="74" cy="21" r="7" className="ff-machine-lamp ff-machine-lamp-2" />
      <rect x="112" y="8" width="96" height="14" rx="6" className="ff-machine-vent" />
      <g className="ff-blade">
        <rect x="150" y="26" width="20" height="34" rx="4" className="ff-blade-arm" />
        <path d="M132 58 H188 L160 96 Z" className="ff-blade-edge" />
      </g>
    </svg>
  );
}

/** The shipping crate the finished product drops into. */
function CrateGlyph({ shipping }: { shipping: boolean }) {
  return (
    <svg viewBox="0 0 96 84" className={`ff-crate-svg${shipping ? ' ff-crate-open' : ''}`} aria-hidden="true" focusable="false">
      <rect x="6" y="24" width="84" height="54" rx="8" className="ff-crate-body" />
      <path d="M6 40 H90" className="ff-crate-line" />
      <path d="M20 24 L48 50 L76 24" className="ff-crate-line" />
      <rect x="2" y="14" width="92" height="14" rx="6" className="ff-crate-lid" />
    </svg>
  );
}

interface FractionDialProps {
  numerator: number;
  denominator: number;
  wrong: boolean;
  onChange: (numerator: number, denominator: number) => void;
}

/**
 * The reverse-order control: a stacked fraction the child dials in, so writing
 * "3 out of 4" stays as tactile as tapping pieces. Deliberately not a quiz.
 */
function FractionDial({ numerator, denominator, wrong, onChange }: FractionDialProps) {
  const { t } = useTranslation();

  return (
    <div className={`ff-dial${wrong ? ' ff-dial-wrong' : ''}`} data-testid="ff-dial">
      <div className="ff-dial-row">
        <button
          type="button"
          className="ff-dial-btn"
          onClick={() => onChange(numerator - 1, denominator)}
          disabled={numerator <= 1}
          aria-label={t('fractionFactory.a11y.numeratorDown')}
        >
          −
        </button>
        <span className="ff-dial-value" data-testid="ff-dial-numerator">
          <MathText>{numerator}</MathText>
        </span>
        <button
          type="button"
          className="ff-dial-btn"
          onClick={() => onChange(numerator + 1, denominator)}
          disabled={numerator >= denominator}
          aria-label={t('fractionFactory.a11y.numeratorUp')}
        >
          +
        </button>
      </div>

      <span className="ff-dial-bar" aria-hidden="true" />

      <div className="ff-dial-row">
        <button
          type="button"
          className="ff-dial-btn"
          onClick={() => onChange(numerator, denominator - 1)}
          disabled={denominator <= MIN_DENOMINATOR}
          aria-label={t('fractionFactory.a11y.denominatorDown')}
        >
          −
        </button>
        <span className="ff-dial-value" data-testid="ff-dial-denominator">
          <MathText>{denominator}</MathText>
        </span>
        <button
          type="button"
          className="ff-dial-btn"
          onClick={() => onChange(numerator, denominator + 1)}
          disabled={denominator >= MAX_DENOMINATOR}
          aria-label={t('fractionFactory.a11y.denominatorUp')}
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

interface FactoryCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function FactoryCompletion({ total, firstTryCount, onRetry }: FactoryCompletionProps) {
  const { t } = useTranslation();

  return (
    <div className="ff-completion">
      <div className="ff-completion-shapes" aria-hidden="true">
        {(
          [
            ['circle', 4, [0, 1, 2]],
            ['bar', 3, [0, 1]],
            ['grid', 6, [0, 2, 4, 5]],
          ] as const
        ).map(([shape, pieces, selected], index) => (
          <span key={shape} className="ff-completion-shape" style={{ '--ff-delay': `${index * 140}ms` } as CSSProperties}>
            <FractionShape shape={shape} pieces={pieces} selected={[...selected]} separated />
          </span>
        ))}
      </div>
      <h2 className="ff-completion-title">{t('fractionFactory.completion.title')}</h2>
      <p className="ff-completion-summary">{t('fractionFactory.completion.summary', { total })}</p>
      <p className="ff-completion-detail">{t('fractionFactory.completion.firstTry', { first: firstTryCount })}</p>
      <div className="ff-completion-actions">
        <button type="button" className="btn ff-btn ff-btn-primary" onClick={onRetry}>
          {t('fractionFactory.actions.playAgain')}
        </button>
        <Link className="btn ff-btn ff-btn-ghost" to={TOPIC_PATH}>
          {t('fractionFactory.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}
