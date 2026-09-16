import type {
  TrainingAnswerRecord,
  TrainingConfiguration,
  TrainingMode,
  TrainingSessionResult,
} from '../types/training';

/**
 * Accuracy, pace and streak are kept as three independent numbers on purpose —
 * they are never blended into a single score.
 */

/** Longest run of consecutive correct answers in the given order. */
export function longestStreakOf(answers: Pick<TrainingAnswerRecord, 'isCorrect'>[]): number {
  let longest = 0;
  let current = 0;
  for (const answer of answers) {
    current = answer.isCorrect ? current + 1 : 0;
    if (current > longest) longest = current;
  }
  return longest;
}

interface ComputeInput {
  id: string;
  configuration: TrainingConfiguration;
  mode: TrainingMode;
  startedAt: string;
  completedAt: string;
  /** Wall-clock duration including feedback pauses. */
  totalDurationMs: number;
  answers: TrainingAnswerRecord[];
}

/**
 * Turns a finished run into its stored result. Everything stays in whole
 * milliseconds and unrounded ratios; display code rounds, storage never does.
 */
export function computeSessionResult({
  id,
  configuration,
  mode,
  startedAt,
  completedAt,
  totalDurationMs,
  answers,
}: ComputeInput): TrainingSessionResult {
  const totalQuestions = answers.length;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const answeringDurationMs = answers.reduce((sum, answer) => sum + answer.elapsedMs, 0);

  return {
    id,
    configuration,
    mode,
    startedAt,
    completedAt,
    totalDurationMs,
    answeringDurationMs,
    totalQuestions,
    correctCount,
    incorrectCount: totalQuestions - correctCount,
    accuracy: totalQuestions === 0 ? 0 : correctCount / totalQuestions,
    longestStreak: longestStreakOf(answers),
    averageMsPerQuestion: totalQuestions === 0 ? 0 : answeringDurationMs / totalQuestions,
  };
}

/** Seconds per question, rounded for display only (e.g. `3.1`). */
export function secondsPerQuestion(averageMsPerQuestion: number): number {
  if (!Number.isFinite(averageMsPerQuestion) || averageMsPerQuestion <= 0) return 0;
  return Math.round(averageMsPerQuestion / 100) / 10;
}

/**
 * A duration as `M:SS` (`0:34`, `1:08`) — the running-timer and total-time
 * format. Exact milliseconds are kept everywhere else; rounding happens here.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Accuracy as a whole percentage, for display only. */
export function accuracyPercent(accuracy: number): number {
  return Math.round(accuracy * 100);
}
