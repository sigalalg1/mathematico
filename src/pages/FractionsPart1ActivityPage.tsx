import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import { FractionNotation } from '../components/FractionNotation';
import { FractionShape } from '../components/FractionShape';
import { FractionNumberLine } from '../components/FractionNumberLine';
import { FractionCollection } from '../components/FractionCollection';
import { MathText } from '../components/MathText';
import { useSound } from '../audio/useSound';
import { useFractionsPart1Game } from '../hooks/useFractionsPart1Game';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { FRACTIONS_PART1_ACTIVITY_IDS } from '../data/games/fractionsPart1Data';
import type { FractionActivityId, FractionChallenge, FractionChoice, FractionValue } from '../types/fractionsPart1';
import './FractionsPart1ActivityPage.css';

const TOPIC_PATH = '/grade/4/fractions-part-1';
const ADVANCE_MS = 700;

function isActivityId(value: string | undefined): value is FractionActivityId {
  return FRACTIONS_PART1_ACTIVITY_IDS.includes(value as FractionActivityId);
}

export function FractionsPart1ActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  if (!isActivityId(activityId)) return <Navigate to={TOPIC_PATH} replace />;
  return <FractionActivity activityId={activityId} />;
}

function FractionActivity({ activityId }: { activityId: FractionActivityId }) {
  const { t } = useTranslation();
  const { enabled, play, toggle } = useSound();
  const game = useFractionsPart1Game(activityId);
  const challenge = game.challenge;
  const [selectedPieces, setSelectedPieces] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useGameSessionTracking(activityId, {
    total: game.total,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (lastResetKey !== resetKey) {
    setLastResetKey(resetKey);
    setSelectedPieces([]);
    setSelectedAnswer(null);
  }

  useEffect(() => {
    if (game.status !== 'correct') return undefined;
    play('hit');
    const timer = window.setTimeout(game.next, ADVANCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  function submit(answer: string) {
    if (game.status === 'correct') return;
    setSelectedAnswer(answer);
    game.submit(answer);
    if (answer !== challenge.correctAnswer) play('miss');
    else play('select');
  }

  function togglePiece(index: number) {
    if (game.status === 'correct') return;
    play('select');
    setSelectedPieces((current) => (current.includes(index) ? current.filter((value) => value !== index) : [...current, index]));
    if (game.status === 'incorrect') setSelectedAnswer(null);
  }

  if (game.completed) {
    return (
      <PageLayout title={t(`fractionsPart1.activities.${activityId}.name`)} backTo={TOPIC_PATH} backLabel={t('fractionsPart1.unitName')} variant="game">
        <div className="fp-game">
          <section className="fp-finale">
            <div className="fp-medal" aria-hidden="true">⅝</div>
            <h2>{t('fractionsPart1.completion.title')}</h2>
            <p>{t('fractionsPart1.completion.body', { count: game.total })}</p>
            <div className="fp-actions">
              <button type="button" className="btn fp-primary" onClick={game.retry}>{t('fractionsPart1.actions.playAgain')}</button>
              <Link className="btn fp-secondary" to={TOPIC_PATH}>{t('fractionsPart1.actions.back')}</Link>
            </div>
          </section>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t(`fractionsPart1.activities.${activityId}.name`)} backTo={TOPIC_PATH} backLabel={t('fractionsPart1.unitName')} variant="game">
      <div className="fp-game">
        <section className={`fp-scene fp-scene-${activityId} fp-status-${game.status}`}>
          <FractionScenery activityId={activityId} />
          <header className="fp-hud">
            <FractionProgress current={game.index + 1} total={game.total} />
            <SoundToggle enabled={enabled} onToggle={toggle} />
          </header>
          <div className="fp-prompt">
            <span>{t(challenge.promptKey)}</span>
            {showsTarget(challenge) && (
              <FractionNotation numerator={challenge.fraction.numerator} denominator={challenge.fraction.denominator} size="lg" />
            )}
          </div>
          <div className="fp-play">
            <FractionGuide status={game.status} />
            <ChallengeScene
              challenge={challenge}
              selectedPieces={selectedPieces}
              selectedAnswer={selectedAnswer}
              status={game.status}
              onTogglePiece={togglePiece}
              onSubmit={submit}
              checkLabel={t('fractionsPart1.actions.check')}
              pieceLabel={(index, total) => t('fractionsPart1.a11y.piece', { index: index + 1, total })}
              collectionLabel={t('fractionsPart1.a11y.collection', {
                selected: challenge.collectionSelected,
                total: challenge.collectionTotal,
              })}
              lineLabel={t('fractionsPart1.a11y.numberLine')}
            />
          </div>
          {game.status !== 'unanswered' && (
            <div className={`fp-feedback fp-feedback-${game.status}`} role="status">
              {t(game.status === 'correct' ? 'fractionsPart1.feedback.correct' : 'fractionsPart1.feedback.retry')}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}

function showsTarget(challenge: FractionChallenge): boolean {
  return (
    ['build', 'findModel', 'equivalent', 'numberLinePlace', 'pizzaBuild'].includes(challenge.kind) ||
    (challenge.kind === 'collection' && challenge.choices.length === 0)
  );
}

interface ChallengeSceneProps {
  challenge: FractionChallenge;
  selectedPieces: number[];
  selectedAnswer: string | null;
  status: 'unanswered' | 'correct' | 'incorrect';
  onTogglePiece: (index: number) => void;
  onSubmit: (answer: string) => void;
  checkLabel: string;
  pieceLabel: (index: number, total: number) => string;
  collectionLabel: string;
  lineLabel: string;
}

function ChallengeScene(props: ChallengeSceneProps) {
  const { challenge, selectedPieces, selectedAnswer, status, onTogglePiece, onSubmit, checkLabel, pieceLabel } = props;
  const isPizza = challenge.kind === 'pizzaBuild' || challenge.kind === 'pizzaRead';
  const isBuild = challenge.kind === 'build' || challenge.kind === 'pizzaBuild';

  if (isBuild) {
    return (
      <div className={`fp-direct-model${isPizza ? ' fp-pizza' : ''}`}>
        <FractionShape
          shape={isPizza ? 'circle' : challenge.shape}
          pieces={challenge.fraction.denominator}
          selected={selectedPieces}
          onTogglePiece={onTogglePiece}
          pieceLabel={(index) => pieceLabel(index, challenge.fraction.denominator)}
          data-testid="fraction-direct-model"
        />
        <FractionNotation numerator={selectedPieces.length} denominator={challenge.fraction.denominator} size="lg" />
        <button type="button" className="fp-check" disabled={selectedPieces.length === 0 || status === 'correct'} onClick={() => onSubmit(String(selectedPieces.length))}>
          {checkLabel}
        </button>
      </div>
    );
  }

  if (challenge.kind === 'readModel' || challenge.kind === 'pizzaRead') {
    return (
      <>
        <div className={`fp-hero-model${isPizza ? ' fp-pizza' : ''}`}>
          <FractionShape shape={isPizza ? 'circle' : challenge.shape} pieces={challenge.fraction.denominator} selected={challenge.selected} />
        </div>
        <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
      </>
    );
  }

  if (challenge.kind === 'terms') {
    const highlight = challenge.termTarget === 'numerator' || challenge.termTarget === 'selected' ? 'numerator' : 'denominator';
    return (
      <>
        <div className="fp-symbol-model">
          <FractionShape shape={challenge.shape} pieces={challenge.fraction.denominator} selected={challenge.selected} />
          <FractionNotation numerator={challenge.fraction.numerator} denominator={challenge.fraction.denominator} highlight={highlight} size="lg" />
        </div>
        <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
      </>
    );
  }

  if (challenge.kind === 'findModel' || challenge.kind === 'equivalent') {
    return (
      <div className="fp-model-dock">
        {challenge.choices.map((choice) => (
          <ModelChoice
            key={choice.id}
            choice={choice}
            selected={selectedAnswer === choice.value}
            correct={status === 'correct' && selectedAnswer === choice.value}
            wrong={status === 'incorrect' && selectedAnswer === choice.value}
            onSelect={() => onSubmit(choice.value)}
          />
        ))}
      </div>
    );
  }

  if (challenge.kind === 'whole') {
    const assembled = [...new Set([...challenge.selected, ...selectedPieces])];
    return (
      <div className="fp-direct-model fp-whole-builder">
        <div className="fp-whole-workbench">
          <FractionShape
            shape={challenge.shape}
            pieces={challenge.fraction.denominator}
            selected={assembled}
            separated
            onTogglePiece={(index) => {
              if (!challenge.selected.includes(index)) onTogglePiece(index);
            }}
            pieceLabel={(index) => pieceLabel(index, challenge.fraction.denominator)}
          />
        </div>
        <button
          type="button"
          className="fp-check"
          disabled={selectedPieces.length === 0 || status === 'correct'}
          onClick={() => onSubmit(String(assembled.length))}
        >
          {checkLabel}
        </button>
      </div>
    );
  }

  if (challenge.kind === 'numberLinePlace' || challenge.kind === 'numberLineRead') {
    return (
      <div className="fp-line-stage">
        <FractionNumberLine
          denominator={challenge.fraction.denominator}
          markedNumerator={challenge.kind === 'numberLineRead' ? challenge.fraction.numerator : undefined}
          selectedNumerator={challenge.kind === 'numberLinePlace' && selectedAnswer !== null ? Number(selectedAnswer) : null}
          interactive={challenge.kind === 'numberLinePlace'}
          onSelect={(value) => onSubmit(String(value))}
          label={props.lineLabel}
        />
        {challenge.kind === 'numberLineRead' && (
          <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
        )}
      </div>
    );
  }

  if (challenge.kind === 'compare' && challenge.compareWith) {
    return (
      <>
        <div className="fp-comparison">
          <VisualFraction fraction={challenge.fraction} shape="circle" />
          <span className="fp-comparison-slot">{selectedAnswer ?? '?'}</span>
          <VisualFraction fraction={challenge.compareWith} shape="bar" />
        </div>
        <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
      </>
    );
  }

  if (challenge.choices.length === 0) {
    return (
      <div className="fp-direct-collection">
        <FractionCollection
          total={challenge.collectionTotal!}
          selected={0}
          selectedIndices={selectedPieces}
          onToggle={onTogglePiece}
          label={props.collectionLabel}
        />
        <FractionNotation numerator={selectedPieces.length} denominator={challenge.collectionTotal!} size="lg" />
        <button
          type="button"
          className="fp-check"
          disabled={selectedPieces.length === 0 || status === 'correct'}
          onClick={() => onSubmit(String(selectedPieces.length))}
        >
          {checkLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      <FractionCollection total={challenge.collectionTotal!} selected={challenge.collectionSelected!} label={props.collectionLabel} />
      <ChoiceDock choices={challenge.choices} selected={selectedAnswer} status={status} onSelect={onSubmit} />
    </>
  );
}

function VisualFraction({ fraction, shape }: { fraction: FractionValue; shape: 'circle' | 'bar' }) {
  return (
    <div className="fp-visual-fraction">
      <FractionShape shape={shape} pieces={fraction.denominator} selected={Array.from({ length: fraction.numerator }, (_, index) => index)} />
      <FractionNotation numerator={fraction.numerator} denominator={fraction.denominator} />
    </div>
  );
}

function ModelChoice({
  choice,
  selected,
  correct,
  wrong,
  onSelect,
}: {
  choice: FractionChoice;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  onSelect: () => void;
}) {
  const fraction = choice.fraction!;
  return (
    <button type="button" className={`fp-model-choice${selected ? ' is-selected' : ''}${correct ? ' is-correct' : ''}${wrong ? ' is-wrong' : ''}`} onClick={onSelect}>
      <FractionShape
        shape={choice.shape ?? 'bar'}
        pieces={fraction.denominator}
        selected={Array.from({ length: fraction.numerator }, (_, index) => index)}
      />
      <FractionNotation numerator={fraction.numerator} denominator={fraction.denominator} size="sm" />
    </button>
  );
}

function ChoiceDock({
  choices,
  selected,
  status,
  onSelect,
}: {
  choices: FractionChoice[];
  selected: string | null;
  status: 'unanswered' | 'correct' | 'incorrect';
  onSelect: (answer: string) => void;
}) {
  return (
    <div className="fp-choice-dock">
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          type="button"
          className={`fp-choice fp-choice-${index % 4}${selected === choice.value ? ' is-selected' : ''}${
            selected === choice.value && status === 'correct' ? ' is-correct' : ''
          }${selected === choice.value && status === 'incorrect' ? ' is-wrong' : ''}`}
          onClick={() => onSelect(choice.value)}
          disabled={status === 'correct'}
        >
          {choice.fraction ? (
            <FractionNotation numerator={choice.fraction.numerator} denominator={choice.fraction.denominator} />
          ) : (
            <MathText>{choice.value}</MathText>
          )}
        </button>
      ))}
    </div>
  );
}

function FractionProgress({ current, total }: { current: number; total: number }) {
  const { t } = useTranslation();
  return (
    <div className="fp-progress" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total} aria-label={t('fractionsPart1.progress', { current, total })}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={`fp-pip${index + 1 < current ? ' is-done' : ''}${index + 1 === current ? ' is-active' : ''}`} aria-hidden="true" />
      ))}
    </div>
  );
}

function FractionGuide({ status }: { status: 'unanswered' | 'correct' | 'incorrect' }) {
  return (
    <svg className={`fp-guide fp-guide-${status}`} viewBox="0 0 120 150" aria-hidden="true">
      <ellipse cx="60" cy="140" rx="38" ry="7" fill="rgba(25,45,90,.18)" />
      <path d="M28 82 Q60 58 92 82 L84 130 Q60 143 36 130 Z" fill="#5b46d6" />
      <circle cx="60" cy="56" r="34" fill="#ffcf9f" />
      <path d="M29 52 Q35 15 62 20 Q90 22 91 57 Q75 37 29 52" fill="#29416f" />
      <circle cx="49" cy="58" r="4" fill="#252144" />
      <circle cx="72" cy="58" r="4" fill="#252144" />
      <path d={status === 'correct' ? 'M47 71 Q60 84 74 70' : status === 'incorrect' ? 'M48 76 Q60 65 73 76' : 'M49 72 Q60 78 72 72'} fill="none" stroke="#8a4c39" strokeWidth="3" strokeLinecap="round" />
      <path className="fp-guide-arm" d="M34 92 Q15 78 18 60" fill="none" stroke="#ffcf9f" strokeWidth="12" strokeLinecap="round" />
      {status === 'incorrect' && <text x="8" y="42" fontSize="25" fontWeight="900" fill="#29416f">?</text>}
      {status === 'correct' && <path d="M91 30 l7 12 14 2-10 10 3 14-14-7-12 7 2-15-10-9 14-2z" fill="#ffd54f" />}
    </svg>
  );
}

function FractionScenery({ activityId }: { activityId: FractionActivityId }) {
  return (
    <div className="fp-scenery" aria-hidden="true" style={{ '--fp-scene-index': FRACTIONS_PART1_ACTIVITY_IDS.indexOf(activityId) } as CSSProperties}>
      <span className="fp-orb fp-orb-1" />
      <span className="fp-orb fp-orb-2" />
      <span className="fp-hill fp-hill-1" />
      <span className="fp-hill fp-hill-2" />
    </div>
  );
}
