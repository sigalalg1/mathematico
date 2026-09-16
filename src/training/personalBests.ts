import type {
  TrainingDimensionComparison,
  TrainingImprovement,
  TrainingPersonalBest,
  TrainingSessionResult,
} from '../types/training';
import { configurationKey } from './configuration';

/**
 * Personal bests are always DERIVED from the stored results of one fixed
 * configuration rather than maintained as a separate mutable "current best"
 * record. There is therefore nothing that can drift out of sync, and guest
 * (localStorage) and signed-in (Supabase) students get identical figures from
 * the same code path.
 */

/**
 * A session's pace only counts as a record when it cleared the activity's
 * accuracy bar — otherwise racing through with wrong answers would "win".
 */
export function isPaceEligible(result: TrainingSessionResult, paceRecordMinAccuracy: number): boolean {
  return result.totalQuestions > 0 && result.accuracy >= paceRecordMinAccuracy;
}

/**
 * Folds every stored result for one configuration into its best figures.
 * Returns `null` when there is no history yet.
 */
export function derivePersonalBest(
  results: TrainingSessionResult[],
  paceRecordMinAccuracy: number,
): TrainingPersonalBest | null {
  if (results.length === 0) return null;

  let bestAccuracy = 0;
  let bestLongestStreak = 0;
  let bestAverageMsPerQuestion: number | null = null;
  let lastCompletedAt = results[0].completedAt;

  for (const result of results) {
    if (result.accuracy > bestAccuracy) bestAccuracy = result.accuracy;
    if (result.longestStreak > bestLongestStreak) bestLongestStreak = result.longestStreak;
    if (
      isPaceEligible(result, paceRecordMinAccuracy) &&
      (bestAverageMsPerQuestion === null || result.averageMsPerQuestion < bestAverageMsPerQuestion)
    ) {
      bestAverageMsPerQuestion = result.averageMsPerQuestion;
    }
    if (result.completedAt > lastCompletedAt) lastCompletedAt = result.completedAt;
  }

  return {
    configurationKey: configurationKey(results[0].configuration),
    configuration: results[0].configuration,
    attempts: results.length,
    bestAccuracy,
    bestLongestStreak,
    bestAverageMsPerQuestion,
    lastCompletedAt,
  };
}

function higherIsBetter(value: number, previousBest: number | null): TrainingDimensionComparison {
  const isRecord = previousBest !== null && value > previousBest;
  return {
    value,
    previousBest,
    isRecord,
    improvement: isRecord ? value - previousBest : null,
  };
}

/**
 * Compares a just-finished result with the bests that existed BEFORE it.
 *
 * On a first attempt nothing is flagged as a record: the run is the baseline,
 * and the UI says so plainly instead of celebrating a number with nothing to
 * compare against.
 */
export function compareWithPersonalBest(
  result: TrainingSessionResult,
  previousBest: TrainingPersonalBest | null,
  paceRecordMinAccuracy: number,
): TrainingImprovement {
  const isFirstAttempt = previousBest === null;
  const previousPace = previousBest?.bestAverageMsPerQuestion ?? null;
  const isEligible = isPaceEligible(result, paceRecordMinAccuracy);
  // Faster means a *smaller* average, so pace is the one dimension where the
  // comparison runs the other way.
  const paceIsRecord = isEligible && previousPace !== null && result.averageMsPerQuestion < previousPace;

  return {
    isFirstAttempt,
    accuracy: higherIsBetter(result.accuracy, previousBest?.bestAccuracy ?? null),
    streak: higherIsBetter(result.longestStreak, previousBest?.bestLongestStreak ?? null),
    pace: {
      value: result.averageMsPerQuestion,
      previousBest: previousPace,
      isRecord: paceIsRecord,
      improvement: paceIsRecord ? previousPace - result.averageMsPerQuestion : null,
      isEligible,
    },
  };
}
