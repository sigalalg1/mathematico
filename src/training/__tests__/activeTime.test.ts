import { describe, expect, it } from 'vitest';
import { createActiveTimeTracker } from '../activeTime';
import type { TrainingClock } from '../clock';

/** A hand-cranked clock, so every duration below is exact rather than timed. */
function fakeClock(): TrainingClock & { advance: (ms: number) => void } {
  let current = 0;
  return {
    now: () => current,
    timestamp: () => new Date(1_700_000_000_000 + current).toISOString(),
    newId: () => 'id',
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe('active time tracking', () => {
  it('starts at zero and accumulates real elapsed time', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    expect(tracker.elapsedMs()).toBe(0);
    clock.advance(1500);
    expect(tracker.elapsedMs()).toBe(1500);
    clock.advance(500);
    expect(tracker.elapsedMs()).toBe(2000);
  });

  it('excludes a paused span and resumes from where it stopped', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    clock.advance(3000);
    tracker.hold('paused');
    clock.advance(60_000);

    // The pause is invisible, no matter how long it lasted.
    expect(tracker.elapsedMs()).toBe(3000);
    expect(tracker.isHeld()).toBe(true);

    tracker.release('paused');
    clock.advance(2000);
    expect(tracker.elapsedMs()).toBe(5000);
    expect(tracker.isHeld()).toBe(false);
  });

  it('excludes time the tab was hidden', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    clock.advance(4000);
    tracker.hold('hidden');
    clock.advance(10_000);
    tracker.release('hidden');
    clock.advance(1000);

    expect(tracker.elapsedMs()).toBe(5000);
  });

  it('keeps the clock stopped until every reason has been released', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    clock.advance(1000);
    tracker.hold('paused');
    tracker.hold('hidden');
    clock.advance(5000);

    // Coming back to a paused session must not restart the clock.
    tracker.release('hidden');
    clock.advance(5000);
    expect(tracker.elapsedMs()).toBe(1000);

    tracker.release('paused');
    clock.advance(2000);
    expect(tracker.elapsedMs()).toBe(3000);
  });

  it('ignores a repeated hold instead of losing the first one', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    tracker.hold('hidden');
    clock.advance(1000);
    tracker.hold('hidden');
    clock.advance(1000);
    tracker.release('hidden');

    expect(tracker.elapsedMs()).toBe(0);
  });

  it('ignores releasing a reason that was never held', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    clock.advance(1000);
    tracker.release('paused');
    clock.advance(1000);

    expect(tracker.elapsedMs()).toBe(2000);
  });

  it('totals a long run of alternating active, hidden and paused spans', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    clock.advance(5000); // active
    tracker.hold('hidden');
    clock.advance(30_000); // phone locked
    tracker.release('hidden');
    clock.advance(7000); // active
    tracker.hold('paused');
    clock.advance(12_000); // paused
    tracker.release('paused');
    clock.advance(3000); // active

    expect(tracker.elapsedMs()).toBe(15_000);
  });

  it('restarts from zero and keeps running on reset', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    clock.advance(9000);
    tracker.reset();
    expect(tracker.elapsedMs()).toBe(0);
    clock.advance(1000);
    expect(tracker.elapsedMs()).toBe(1000);
  });

  it('stays stopped when reset while held', () => {
    const clock = fakeClock();
    const tracker = createActiveTimeTracker(clock);

    tracker.hold('hidden');
    tracker.reset();
    clock.advance(4000);
    expect(tracker.elapsedMs()).toBe(0);

    tracker.release('hidden');
    clock.advance(1000);
    expect(tracker.elapsedMs()).toBe(1000);
  });
});
