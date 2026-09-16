import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../../components/PageLayout';
import { useGameSessionTracking } from '../../hooks/useGameSessionTracking';
import type {
  TrainingActivityDefinition,
  TrainingConfiguration,
  TrainingImprovement,
  TrainingMode,
} from '../../types/training';
import { isChallengeEligible, resolveConfiguration } from '../configuration';
import { useTrainingRecords } from '../useTrainingRecords';
import { useTrainingSession } from '../useTrainingSession';
import type { TrainingClock } from '../clock';
import { TrainingPlayScreen, type TrainingQuestionRenderContext } from './TrainingPlayScreen';
import { TrainingResultsScreen } from './TrainingResultsScreen';
import { TrainingSetupScreen } from './TrainingSetupScreen';
import './TrainingActivity.css';

/**
 * How long the answer feedback stays on screen before the next question. These
 * pauses are app-controlled, so the engine deliberately excludes them from the
 * child's measured think time — a wrong answer showing for longer can never
 * make the next question look slower.
 */
const CORRECT_FEEDBACK_MS = 450;
const WRONG_FEEDBACK_MS = 1200;

interface TrainingActivityScreenProps<TPayload> {
  activity: TrainingActivityDefinition<TPayload>;
  /** Activity title, back link and grade pill for the page shell. */
  titleKey: string;
  contextLabel: string;
  backTo: string;
  backLabel: string;
  /** Shown above the fact on every question. */
  promptKey: string;
  /** Injected in tests so timings are exact. */
  clock?: TrainingClock;
  /**
   * Lets an activity draw its own question scene (a shaded model, a number
   * line) in place of the default fact-and-choices layout. Everything else —
   * setup, session, timing, results — stays shared.
   */
  renderQuestion?: (context: TrainingQuestionRenderContext<TPayload>) => ReactNode;
}

/**
 * The full practice / personal-challenge experience for any activity that
 * declares training capabilities: configuration, the session itself, records
 * and results. A second activity needs a question generator and its own copy —
 * not another copy of this screen.
 */
export function TrainingActivityScreen<TPayload = never>({
  activity,
  titleKey,
  contextLabel,
  backTo,
  backLabel,
  promptKey,
  clock,
  renderQuestion,
}: TrainingActivityScreenProps<TPayload>) {
  const { t } = useTranslation();
  const { capabilities } = activity;

  const [mode, setMode] = useState<TrainingMode>('practice');
  const [difficultyId, setDifficultyId] = useState<string | null>(capabilities.defaultDifficultyId);
  const [questionCount, setQuestionCount] = useState(capabilities.defaultQuestionCount);
  const [run, setRun] = useState<{ configuration: TrainingConfiguration; mode: TrainingMode; key: number } | null>(null);

  // Switching to challenge mode may leave a length that is not challenge-eligible.
  const chooseMode = useCallback(
    (next: TrainingMode) => {
      setMode(next);
      if (next === 'challenge' && !isChallengeEligible(capabilities, questionCount)) {
        setQuestionCount(capabilities.challengeQuestionCounts[0] ?? capabilities.defaultQuestionCount);
      }
    },
    [capabilities, questionCount],
  );

  const start = useCallback(() => {
    setRun((previous) => ({
      configuration: resolveConfiguration(activity.id, capabilities, { difficultyId, questionCount }),
      mode,
      key: (previous?.key ?? 0) + 1,
    }));
  }, [activity.id, capabilities, difficultyId, mode, questionCount]);

  return (
    <PageLayout
      title={t(titleKey)}
      context={contextLabel}
      backTo={backTo}
      backLabel={backLabel}
      subtitle={run ? undefined : t(`${activity.i18nPrefix}.intro`)}
      variant="game"
    >
      {run === null ? (
        <TrainingSetupScreen
          activity={activity}
          mode={mode}
          difficultyId={difficultyId}
          questionCount={questionCount}
          onModeChange={chooseMode}
          onDifficultyChange={setDifficultyId}
          onQuestionCountChange={setQuestionCount}
          onStart={start}
        />
      ) : (
        <TrainingRun
          // A fresh configuration is a fresh run, never a mutated one.
          key={run.key}
          activity={activity}
          configuration={run.configuration}
          mode={run.mode}
          promptKey={promptKey}
          backTo={backTo}
          backLabel={backLabel}
          clock={clock}
          renderQuestion={renderQuestion}
          onChangeSettings={() => setRun(null)}
        />
      )}
    </PageLayout>
  );
}

interface TrainingRunProps<TPayload> {
  activity: TrainingActivityDefinition<TPayload>;
  configuration: TrainingConfiguration;
  mode: TrainingMode;
  promptKey: string;
  backTo: string;
  backLabel: string;
  clock?: TrainingClock;
  renderQuestion?: (context: TrainingQuestionRenderContext<TPayload>) => ReactNode;
  onChangeSettings: () => void;
}

/** One session of a fixed configuration, with its records and results. */
function TrainingRun<TPayload>({
  activity,
  configuration,
  mode,
  promptKey,
  backTo,
  backLabel,
  clock,
  renderQuestion,
  onChangeSettings,
}: TrainingRunProps<TPayload>) {
  const session = useTrainingSession({ activity, configuration, mode, clock });
  const isChallenge = mode === 'challenge';
  const { personalBest, save } = useTrainingRecords(
    configuration,
    activity.capabilities.paceRecordMinAccuracy,
    isChallenge,
  );
  const [improvement, setImprovement] = useState<TrainingImprovement | null>(null);

  // Training sessions also land in the app-wide activity log, so the unit's
  // "completed" badge and the progress screen keep working unchanged.
  useGameSessionTracking(activity.id, {
    total: session.total,
    score: session.correctCount,
    completed: session.phase === 'completed',
    mistakes: session.answers
      .filter((answer) => !answer.isCorrect)
      .map((answer) => ({
        questionId: answer.questionId,
        selectedAnswer: answer.answer,
        correctAnswer: answer.correctAnswer,
      })),
    roundKey: session.roundKey,
  });

  // The feedback beat, then the next question.
  const { phase, lastAnswer, advance } = session;
  useEffect(() => {
    if (phase !== 'feedback' || !lastAnswer) return undefined;
    const timer = window.setTimeout(advance, lastAnswer.isCorrect ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, lastAnswer, advance]);

  const result = session.result;
  useEffect(() => {
    if (!result || !isChallenge) return;
    let cancelled = false;
    save(result)
      .then((comparison) => {
        if (!cancelled) setImprovement(comparison);
      })
      .catch(() => {
        // The result is still shown; only the comparison is missing.
      });
    return () => {
      cancelled = true;
    };
    // `save` is stable per configuration; the comparison runs once per result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, isChallenge]);

  const retry = useCallback(() => {
    setImprovement(null);
    session.restart();
    // `session.restart` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.restart]);

  if (result) {
    return (
      <TrainingResultsScreen
        result={result}
        mode={mode}
        improvement={improvement}
        personalBest={personalBest}
        onRetrySameConfiguration={retry}
        onChangeSettings={onChangeSettings}
        backTo={backTo}
        backLabel={backLabel}
      />
    );
  }

  return <TrainingPlayScreen session={session} mode={mode} promptKey={promptKey} renderQuestion={renderQuestion} />;
}
