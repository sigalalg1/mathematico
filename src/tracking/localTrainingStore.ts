import type { TrainingSessionResult } from '../types/training';
import { configurationKey } from '../training/configuration';

/**
 * Guest-mode persistence for training results. Deliberately the same shape and
 * the same silent-failure philosophy as `localActivityStore`: storage problems
 * must never stop a child finishing (or repeating) a session.
 */

const STORAGE_KEY = 'mathematico-training-results';

/** Plenty of history for deriving records, without letting storage grow forever. */
const MAX_STORED_RESULTS = 300;

function isResult(value: unknown): value is TrainingSessionResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<TrainingSessionResult>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.totalQuestions === 'number' &&
    typeof candidate.configuration === 'object' &&
    candidate.configuration !== null
  );
}

function readAll(): TrainingSessionResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isResult) : [];
  } catch {
    return [];
  }
}

function writeAll(results: TrainingSessionResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(0, MAX_STORED_RESULTS)));
  } catch {
    // Storage unavailable or full — drop silently rather than break the session.
  }
}

export function saveLocalTrainingResult(result: TrainingSessionResult): void {
  writeAll([result, ...readAll().filter((stored) => stored.id !== result.id)]);
}

/** Newest first, restricted to one fixed configuration. */
export function getLocalTrainingResults(key: string): TrainingSessionResult[] {
  return readAll()
    .filter((result) => configurationKey(result.configuration) === key)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function clearLocalTrainingResults(): void {
  writeAll([]);
}
