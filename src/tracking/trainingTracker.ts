import type { TrainingPersonalBest, TrainingSessionResult } from '../types/training';
import { configurationKey } from '../training/configuration';
import { derivePersonalBest } from '../training/personalBests';
import { getLocalTrainingResults, saveLocalTrainingResult } from './localTrainingStore';
import { getSupabaseTrainingResults, saveSupabaseTrainingResult } from './supabaseTrainingStore';

/**
 * The single entry point for training persistence, mirroring
 * `activityTracker`: callers never touch Supabase or localStorage directly,
 * and a backend failure degrades to the guest store instead of losing a result
 * or interrupting the child.
 */

export async function saveTrainingResult(result: TrainingSessionResult, userId: string | null): Promise<void> {
  const key = configurationKey(result.configuration);

  if (userId) {
    try {
      if (await saveSupabaseTrainingResult(result, userId, key)) return;
    } catch {
      // Fall through to the local store below.
    }
  }

  saveLocalTrainingResult(result);
}

/** Newest-first history for one fixed configuration. */
export async function getTrainingResults(
  configKey: string,
  userId: string | null,
): Promise<TrainingSessionResult[]> {
  if (userId) {
    try {
      const remote = await getSupabaseTrainingResults(userId, configKey);
      if (remote) return remote;
    } catch {
      // Unreachable backend — show whatever was stored locally instead.
    }
  }
  return getLocalTrainingResults(configKey);
}

/**
 * Personal bests are always computed from the stored results, never kept as a
 * separately maintained row that could drift away from its own history.
 */
export async function getTrainingPersonalBest(
  configKey: string,
  userId: string | null,
  paceRecordMinAccuracy: number,
): Promise<TrainingPersonalBest | null> {
  const results = await getTrainingResults(configKey, userId);
  return derivePersonalBest(results, paceRecordMinAccuracy);
}
