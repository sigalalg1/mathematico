import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  TrainingActivityDefinition,
  TrainingAnswerRecord,
  TrainingConfiguration,
  TrainingMode,
  TrainingQuestion,
  TrainingSessionResult,
} from '../types/training';
import { computeSessionResult, longestStreakOf } from './metrics';
import { systemTrainingClock, type TrainingClock } from './clock';
import { createActiveTimeTracker } from './activeTime';

export type TrainingPhase = 'answering' | 'feedback' | 'completed';

interface UseTrainingSessionInput {
  activity: TrainingActivityDefinition;
  configuration: TrainingConfiguration;
  mode: TrainingMode;
  /** Injected in tests for exact, non-flaky timings. */
  clock?: TrainingClock;
}

export interface TrainingSessionState {
  question: TrainingQuestion;
  /** 0-based position of the current question. */
  index: number;
  total: number;
  phase: TrainingPhase;
  /** The answer just given, while `phase` is `feedback`. */
  lastAnswer: { value: string; isCorrect: boolean; correctAnswer: string } | null;
  correctCount: number;
  /** Consecutive correct answers right now — reset to 0 by any mistake. */
  currentStreak: number;
  longestStreak: number;
  answers: TrainingAnswerRecord[];
  /** Available once the last question has been answered and acknowledged. */
  result: TrainingSessionResult | null;
  /** Increments on every restart, so session tracking can open a fresh row. */
  roundKey: number;
  submit: (answer: string) => void;
  /** Leaves feedback and presents the next question — or finishes the session. */
  advance: () => void;
  /** Runs the identical configuration again from the start. */
  restart: () => void;
  /**
   * Active milliseconds since the session started, excluding time the tab was
   * hidden or the session was paused. Read on demand (by the challenge timer),
   * never stored in state, so the display cannot drift from the measurement.
   */
  getActiveDurationMs: () => number;
  /** Stops the clock. Nothing in the app calls this yet; a pause UI would. */
  pause: () => void;
  resume: () => void;
  isPaused: boolean;
}

/** Correct answers at the very end of the list — the streak the child is on now. */
function trailingStreak(answers: TrainingAnswerRecord[]): number {
  let streak = 0;
  for (let i = answers.length - 1; i >= 0 && answers[i].isCorrect; i -= 1) streak += 1;
  return streak;
}

/**
 * The generic training engine: session lifecycle, fair per-question timing,
 * streak bookkeeping and metrics. It knows nothing about multiplication, or
 * about how a question is presented.
 *
 * A wrong answer never ends the session and never repeats the question — the
 * child simply continues, and the mistake costs them only their streak.
 */
export function useTrainingSession({
  activity,
  configuration,
  mode,
  clock = systemTrainingClock,
}: UseTrainingSessionInput): TrainingSessionState {
  const buildQuestions = useCallback(
    () =>
      activity.generateQuestions({
        difficultyId: configuration.difficultyId,
        count: configuration.questionCount,
      }),
    [activity, configuration.difficultyId, configuration.questionCount],
  );

  const [questions, setQuestions] = useState<TrainingQuestion[]>(buildQuestions);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<TrainingPhase>('answering');
  const [lastAnswer, setLastAnswer] = useState<TrainingSessionState['lastAnswer']>(null);
  const [answers, setAnswers] = useState<TrainingAnswerRecord[]>([]);
  const [result, setResult] = useState<TrainingSessionResult | null>(null);
  const [roundKey, setRoundKey] = useState(0);

  /**
   * Mirrors `answers` so the final metrics can be computed in the same tick the
   * last question is acknowledged, without putting side effects in a state
   * updater.
   */
  const answersRef = useRef<TrainingAnswerRecord[]>([]);

  /**
   * The session's single source of duration: active time only, with hidden and
   * paused spans excluded. Every measurement below is an offset into it, so
   * per-question think time and the session total can never disagree.
   */
  const [activeTime] = useState(() => createActiveTimeTracker(clock));

  const [isPaused, setIsPaused] = useState(false);

  /**
   * Set only by the engine, only when a question actually becomes interactive,
   * and measured in active time. App-controlled feedback pauses therefore fall
   * outside every measurement, and there is no player-triggered way to restart
   * the clock on a question.
   */
  const questionPresentedAtRef = useRef(activeTime.elapsedMs());
  const sessionStartRef = useRef({ timestamp: clock.timestamp() });

  /**
   * A child who switches app, locks the phone or backgrounds the tab must not
   * come back to an inflated (and therefore worse) pace. The hidden span is
   * excluded from active time; the session itself is left completely intact.
   */
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const sync = () => {
      if (document.visibilityState === 'hidden') activeTime.hold('hidden');
      else activeTime.release('hidden');
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      // Leaving the activity must not leave the tracker held for a stale reason.
      activeTime.release('hidden');
    };
  }, [activeTime]);

  const pause = useCallback(() => {
    activeTime.hold('paused');
    setIsPaused(true);
  }, [activeTime]);

  const resume = useCallback(() => {
    activeTime.release('paused');
    setIsPaused(false);
  }, [activeTime]);

  const submit = useCallback(
    (value: string) => {
      if (phase !== 'answering') return;
      const question = questions[index];
      const isCorrect = value === question.answer;
      const elapsedMs = Math.max(0, activeTime.elapsedMs() - questionPresentedAtRef.current);

      answersRef.current = [
        ...answersRef.current,
        {
          questionId: question.id,
          prompt: question.prompt,
          answer: value,
          correctAnswer: question.answer,
          isCorrect,
          elapsedMs,
        },
      ];
      setAnswers(answersRef.current);
      setLastAnswer({ value, isCorrect, correctAnswer: question.answer });
      setPhase('feedback');
    },
    [activeTime, index, phase, questions],
  );

  const advance = useCallback(() => {
    if (phase !== 'feedback') return;
    setLastAnswer(null);

    if (index === questions.length - 1) {
      setPhase('completed');
      setResult(
        computeSessionResult({
          id: clock.newId(),
          configuration,
          mode,
          startedAt: sessionStartRef.current.timestamp,
          completedAt: clock.timestamp(),
          totalDurationMs: activeTime.elapsedMs(),
          answers: answersRef.current,
        }),
      );
      return;
    }

    setIndex((value) => value + 1);
    setPhase('answering');
    // The next question is on screen and interactive from this moment on.
    questionPresentedAtRef.current = activeTime.elapsedMs();
  }, [activeTime, clock, configuration, index, mode, phase, questions.length]);

  const restart = useCallback(() => {
    answersRef.current = [];
    setQuestions(buildQuestions());
    setIndex(0);
    setPhase('answering');
    setLastAnswer(null);
    setAnswers([]);
    setResult(null);
    setRoundKey((value) => value + 1);
    sessionStartRef.current = { timestamp: clock.timestamp() };
    // A replay is a fresh measurement, but an existing hold (a still-hidden
    // tab, or a paused session) survives it rather than silently start counting.
    activeTime.reset();
    questionPresentedAtRef.current = activeTime.elapsedMs();
  }, [activeTime, buildQuestions, clock]);

  const streaks = useMemo(
    () => ({ current: trailingStreak(answers), longest: longestStreakOf(answers) }),
    [answers],
  );

  return {
    question: questions[index],
    index,
    total: questions.length,
    phase,
    lastAnswer,
    correctCount: answers.filter((answer) => answer.isCorrect).length,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    answers,
    result,
    roundKey,
    submit,
    advance,
    restart,
    getActiveDurationMs: activeTime.elapsedMs,
    pause,
    resume,
    isPaused,
  };
}
