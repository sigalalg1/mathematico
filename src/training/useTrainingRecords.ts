import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import type { TrainingConfiguration, TrainingImprovement, TrainingPersonalBest, TrainingSessionResult } from '../types/training';
import { getTrainingPersonalBest, saveTrainingResult } from '../tracking/trainingTracker';
import { configurationKey } from './configuration';
import { compareWithPersonalBest, derivePersonalBest } from './personalBests';

interface UseTrainingRecordsResult {
  /** Best figures for this configuration before the session in progress. */
  personalBest: TrainingPersonalBest | null;
  isLoading: boolean;
  /**
   * Stores a finished result and reports how it compares with what came
   * before it. Never rejects: a persistence failure still returns the
   * comparison, so the child always sees their result.
   */
  save: (result: TrainingSessionResult) => Promise<TrainingImprovement>;
}

/**
 * Loads and updates the personal bests for one fixed configuration. Works
 * identically for a signed-in student (Supabase) and a guest (localStorage) —
 * the tracker decides, and the bests themselves are derived from the stored
 * results either way.
 */
export function useTrainingRecords(
  configuration: TrainingConfiguration,
  paceRecordMinAccuracy: number,
  enabled = true,
): UseTrainingRecordsResult {
  const { user, isInitializing } = useAuth();
  const key = configurationKey(configuration);

  /**
   * Holds the key it was loaded for, so "still loading" is derived rather than
   * tracked as a second piece of state that could fall out of step.
   */
  const [loaded, setLoaded] = useState<{ key: string; best: TrainingPersonalBest | null } | null>(null);
  /** The best as it stood before the current session — what a result is judged against. */
  const baselineRef = useRef<{ key: string; best: TrainingPersonalBest | null } | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!enabled || isInitializing) return undefined;
    let cancelled = false;

    getTrainingPersonalBest(key, userId, paceRecordMinAccuracy)
      .then((best) => {
        if (cancelled) return;
        baselineRef.current = { key, best };
        setLoaded({ key, best });
      })
      .catch(() => {
        if (cancelled) return;
        // History is unavailable; treat it as "nothing to compare against yet"
        // rather than blocking the results screen.
        baselineRef.current = { key, best: null };
        setLoaded({ key, best: null });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, isInitializing, key, userId, paceRecordMinAccuracy]);

  const save = useCallback(
    async (result: TrainingSessionResult): Promise<TrainingImprovement> => {
      // If the session finished before the history landed, read it now rather
      // than mistake a fast student for a first-time one.
      let baseline = baselineRef.current?.key === key ? baselineRef.current.best : undefined;
      if (baseline === undefined) {
        try {
          baseline = await getTrainingPersonalBest(key, userId, paceRecordMinAccuracy);
        } catch {
          baseline = null;
        }
        baselineRef.current = { key, best: baseline };
      }

      const improvement = compareWithPersonalBest(result, baseline, paceRecordMinAccuracy);

      try {
        await saveTrainingResult(result, userId);
      } catch {
        // Persistence must never swallow the child's result on screen.
      }

      // Fold the new result in locally so an immediate retry is judged against it.
      const merged = mergeBest(baseline, derivePersonalBest([result], paceRecordMinAccuracy), result);
      baselineRef.current = { key, best: merged };
      setLoaded({ key, best: merged });

      return improvement;
    },
    [key, paceRecordMinAccuracy, userId],
  );

  return {
    personalBest: loaded?.key === key ? loaded.best : null,
    isLoading: enabled && loaded?.key !== key,
    save,
  };
}

/** Combines the previous bests with a freshly finished result. */
function mergeBest(
  previous: TrainingPersonalBest | null,
  fromResult: TrainingPersonalBest | null,
  result: TrainingSessionResult,
): TrainingPersonalBest | null {
  if (!fromResult) return previous;
  if (!previous) return fromResult;

  const paceCandidates = [previous.bestAverageMsPerQuestion, fromResult.bestAverageMsPerQuestion].filter(
    (value): value is number => value !== null,
  );

  return {
    ...previous,
    attempts: previous.attempts + 1,
    bestAccuracy: Math.max(previous.bestAccuracy, fromResult.bestAccuracy),
    bestLongestStreak: Math.max(previous.bestLongestStreak, fromResult.bestLongestStreak),
    bestAverageMsPerQuestion: paceCandidates.length === 0 ? null : Math.min(...paceCandidates),
    lastCompletedAt: result.completedAt,
  };
}
