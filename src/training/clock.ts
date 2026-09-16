/**
 * The training engine's only source of time, so tests can drive sessions with
 * exact, deterministic durations instead of real wall-clock delays.
 */
export interface TrainingClock {
  /** Monotonic milliseconds, used for every duration. */
  now: () => number;
  /** Wall-clock ISO timestamp, used for stored start/finish times. */
  timestamp: () => string;
  /** Identifier for a newly created session result. */
  newId: () => string;
}

/** `crypto.randomUUID` is unavailable in insecure contexts (plain-http dev hosts). */
function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Fall through to the non-crypto id below.
  }
  return `training-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const systemTrainingClock: TrainingClock = {
  // performance.now() is immune to the system clock being adjusted mid-session.
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  timestamp: () => new Date().toISOString(),
  newId,
};
