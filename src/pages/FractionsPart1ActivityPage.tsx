import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { SoundToggle } from '../components/SoundToggle';
import {
  FractionChallengeScene,
  FractionGuide,
  FractionPrompt,
  type FractionSceneStatus,
} from '../components/FractionChallengeScene';
import { useSound } from '../audio/useSound';
import { useFractionsPart1Game } from '../hooks/useFractionsPart1Game';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { FRACTIONS_PART1_ACTIVITY_IDS } from '../data/games/fractionsPart1Data';
import { getFractionTrainingActivity } from '../data/games/fractionsPart1Training';
import { TrainingActivityScreen } from '../training/components/TrainingActivityScreen';
import type { TrainingQuestionRenderProps } from '../training/components/TrainingPlayScreen';
import type { FractionActivityId, FractionChallenge } from '../types/fractionsPart1';
import './FractionsPart1ActivityPage.css';

const TOPIC_PATH = '/grade/4/fractions-part-1';
const ADVANCE_MS = 700;

function isActivityId(value: string | undefined): value is FractionActivityId {
  return FRACTIONS_PART1_ACTIVITY_IDS.includes(value as FractionActivityId);
}

export function FractionsPart1ActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();
  if (!isActivityId(activityId)) return <Navigate to={TOPIC_PATH} replace />;

  // Most of the unit now runs on the shared training system, where the child
  // first picks a level and a length. The closing mixed-review challenge keeps
  // its own fixed round — see `fractionsPart1Training` for why.
  const trainingActivity = getFractionTrainingActivity(activityId);
  if (trainingActivity) return <FractionTrainingActivity activityId={activityId} />;

  return <FractionActivity activityId={activityId} />;
}

/**
 * A fraction activity as a training activity: the shared setup, session,
 * progress and results screens, with this unit's own visual question in the
 * middle instead of a line of text and four buttons.
 */
function FractionTrainingActivity({ activityId }: { activityId: FractionActivityId }) {
  const { t } = useTranslation();
  const activity = getFractionTrainingActivity(activityId)!;

  return (
    <TrainingActivityScreen
      activity={activity}
      titleKey={`fractionsPart1.activities.${activityId}.name`}
      promptKey={`fractionsPart1.activities.${activityId}.prompt`}
      contextLabel={t('grades.4')}
      backTo={TOPIC_PATH}
      backLabel={t('fractionsPart1.unitName')}
      renderQuestion={(context) => (
        // A fresh scene per question, so a half-shaded model never carries over.
        <FractionTrainingScene key={context.question.id} activityId={activityId} context={context} />
      )}
    />
  );
}

function FractionTrainingScene({
  activityId,
  context,
}: {
  activityId: FractionActivityId;
  context: TrainingQuestionRenderProps<FractionChallenge>;
}) {
  const { enabled, play, toggle } = useSound();
  const { question, phase, lastAnswer } = context;
  const challenge = question.payload!;
  const [selectedPieces, setSelectedPieces] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const status: FractionSceneStatus =
    phase === 'answering' || !lastAnswer ? 'unanswered' : lastAnswer.isCorrect ? 'correct' : 'incorrect';

  useEffect(() => {
    if (status === 'correct') play('hit');
    else if (status === 'incorrect') play('miss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function submit(answer: string) {
    if (phase !== 'answering') return;
    setSelectedAnswer(answer);
    play('select');
    context.submit(answer);
  }

  function togglePiece(index: number) {
    if (phase !== 'answering') return;
    play('select');
    setSelectedPieces((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  }

  return (
    <section className={`fp-scene fp-scene-${activityId} fp-status-${status}`}>
      <FractionScenery activityId={activityId} />
      <header className="fp-hud fp-hud-training">
        <SoundToggle enabled={enabled} onToggle={toggle} />
      </header>
      <FractionPrompt challenge={challenge} />
      <div className="fp-play">
        <FractionGuide status={status} />
        <FractionChallengeScene
          challenge={challenge}
          selectedPieces={selectedPieces}
          selectedAnswer={selectedAnswer}
          status={status}
          onTogglePiece={togglePiece}
          onSubmit={submit}
        />
      </div>
    </section>
  );
}

/**
 * The unit's original fixed round, still used by the closing mixed-review
 * challenge: a wrong answer stays on the same question until it is right.
 */
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
      <PageLayout title={t(`fractionsPart1.activities.${activityId}.name`)} context={t('grades.4')} backTo={TOPIC_PATH} backLabel={t('fractionsPart1.unitName')} variant="game">
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
    <PageLayout title={t(`fractionsPart1.activities.${activityId}.name`)} context={t('grades.4')} backTo={TOPIC_PATH} backLabel={t('fractionsPart1.unitName')} variant="game">
      <div className="fp-game">
        <section className={`fp-scene fp-scene-${activityId} fp-status-${game.status}`}>
          <FractionScenery activityId={activityId} />
          <header className="fp-hud">
            <FractionProgress current={game.index + 1} total={game.total} />
            <SoundToggle enabled={enabled} onToggle={toggle} />
          </header>
          <FractionPrompt challenge={challenge} />
          <div className="fp-play">
            <FractionGuide status={game.status} />
            <FractionChallengeScene
              challenge={challenge}
              selectedPieces={selectedPieces}
              selectedAnswer={selectedAnswer}
              status={game.status}
              onTogglePiece={togglePiece}
              onSubmit={submit}
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
