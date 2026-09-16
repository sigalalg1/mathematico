import type { TrainingClock } from './clock';

/**
 * Measures how long a child was *actually* working on a session.
 *
 * Elapsed time is always derived from `clock.now()` deltas rather than by
 * counting interval ticks: intervals drift, and a throttled or suspended tab
 * stops delivering them altogether. A display may poll this tracker on a timer,
 * but the number it reads is a timestamp difference, never an accumulator of
 * ticks.
 *
 * Time can be held by several independent reasons at once (the tab is hidden
 * AND the child paused). The tracker only runs again once every hold has been
 * released, so the two can never cancel each other out.
 */
export type ActiveTimeHold = 'hidden' | 'paused';

export interface ActiveTimeTracker {
  /** Active milliseconds so far, excluding every held span. */
  elapsedMs: () => number;
  /** Stops accumulating for this reason; repeating the same reason is a no-op. */
  hold: (reason: ActiveTimeHold) => void;
  /** Releases one reason; time resumes when no reason is left. */
  release: (reason: ActiveTimeHold) => void;
  /** True while at least one hold is active. */
  isHeld: () => boolean;
  /** Back to zero and running — used when the same configuration is replayed. */
  reset: () => void;
}

export function createActiveTimeTracker(clock: TrainingClock): ActiveTimeTracker {
  let accumulatedMs = 0;
  /** When the currently running span began, or `null` while held. */
  let runningSince: number | null = clock.now();
  const holds = new Set<ActiveTimeHold>();

  const settle = () => {
    if (runningSince === null) return;
    accumulatedMs += Math.max(0, clock.now() - runningSince);
    runningSince = null;
  };

  return {
    elapsedMs: () =>
      runningSince === null ? accumulatedMs : accumulatedMs + Math.max(0, clock.now() - runningSince),
    hold: (reason) => {
      holds.add(reason);
      settle();
    },
    release: (reason) => {
      holds.delete(reason);
      if (holds.size === 0 && runningSince === null) runningSince = clock.now();
    },
    isHeld: () => holds.size > 0,
    reset: () => {
      accumulatedMs = 0;
      runningSince = holds.size === 0 ? clock.now() : null;
    },
  };
}
