import { describe, expect, it } from 'vitest';
import {
  assertPlaceChallengeIsSound,
  buildNumberLinePlaceChallenges,
  classifyPlacement,
  countTicks,
  NUMBER_LINE_PLACE_TOTAL,
  placeQuestionSignature,
  placementCount,
  tickValues,
} from '../numberLinePlaceData';
import type { PlaceChallenge } from '../../../types/numberLinePlace';

const RUNS = 300;

const sessions: PlaceChallenge[][] = Array.from({ length: RUNS }, () => buildNumberLinePlaceChallenges());
const all: PlaceChallenge[] = sessions.flat();

describe('find the spot — session shape', () => {
  it('always builds the advertised number of questions with unique ids', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(NUMBER_LINE_PLACE_TOTAL);
      expect(new Set(session.map((c) => c.id)).size).toBe(session.length);
    }
  });

  it('never repeats the same question inside one session', () => {
    for (const session of sessions) {
      expect(new Set(session.map(placeQuestionSignature)).size).toBe(session.length);
    }
  });

  it('asks about a positive number before it asks about a negative one', () => {
    for (const session of sessions) {
      expect(session[0].target).toBeGreaterThan(0);
      expect(session[1].target).toBeLessThan(0);
    }
  });

  it('gets steadily harder: the line never shrinks and the step never gets smaller', () => {
    for (const session of sessions) {
      for (let i = 1; i < session.length; i++) {
        expect(session[i].max).toBeGreaterThanOrEqual(session[i - 1].max);
        expect(session[i].step).toBeGreaterThanOrEqual(session[i - 1].step);
      }
    }
  });

  it('reaches steps larger than one so the student must read the spacing', () => {
    for (const session of sessions) {
      expect(session.some((c) => c.step > 1)).toBe(true);
    }
  });
});

describe('find the spot — generator invariants', () => {
  it('passes its own soundness check for every generated question', () => {
    for (const challenge of all) {
      expect(() => assertPlaceChallengeIsSound(challenge)).not.toThrow();
    }
  });

  it('puts the target on a real tick, never on zero and never on an end of the line', () => {
    for (const challenge of all) {
      const ticks = tickValues(challenge.min, challenge.max, challenge.step);
      expect(ticks).toContain(challenge.target);
      expect(challenge.target).not.toBe(0);
      expect(challenge.target).not.toBe(challenge.min);
      expect(challenge.target).not.toBe(challenge.max);
      expect(Number.isInteger(challenge.target)).toBe(true);
    }
  });

  it('keeps every tick an exact whole number — no floating point drift', () => {
    for (const challenge of all) {
      for (const value of tickValues(challenge.min, challenge.max, challenge.step)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBe(Math.round(value));
      }
    }
  });

  it('never prints the answer on the target tick', () => {
    for (const challenge of all) {
      expect(challenge.labeledValues).not.toContain(challenge.target);
    }
  });

  it('always leaves the origin labelled plus at least one more number', () => {
    for (const challenge of all) {
      expect(challenge.labeledValues).toContain(0);
      expect(challenge.labeledValues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('always leaves something to work out — never labels every tick', () => {
    for (const challenge of all) {
      const ticks = tickValues(challenge.min, challenge.max, challenge.step);
      expect(challenge.labeledValues.length).toBeLessThan(ticks.length);
    }
  });

  it('lets only one tick spacing explain the labels the student can see', () => {
    for (const challenge of all) {
      const ticks = tickValues(challenge.min, challenge.max, challenge.step);
      const derived = new Set<number>();
      for (const a of challenge.labeledValues) {
        for (const b of challenge.labeledValues) {
          if (a === b) continue;
          derived.add((b - a) / (ticks.indexOf(b) - ticks.indexOf(a)));
        }
      }
      expect([...derived]).toEqual([challenge.step]);
    }
  });

  it('counts the explanation from the nearest labelled tick', () => {
    for (const challenge of all) {
      expect(challenge.labeledValues).toContain(challenge.anchor);
      const gap = Math.abs(countTicks(challenge.anchor, challenge.target, challenge.step));
      expect(gap).toBeGreaterThanOrEqual(1);
      for (const value of challenge.labeledValues) {
        expect(Math.abs(countTicks(value, challenge.target, challenge.step))).toBeGreaterThanOrEqual(gap);
      }
    }
  });

  it('shows a line that is readable: both sides of zero and 5+ ticks', () => {
    for (const challenge of all) {
      expect(challenge.min).toBeLessThan(0);
      expect(challenge.max).toBeGreaterThan(0);
      expect(tickValues(challenge.min, challenge.max, challenge.step).length).toBeGreaterThanOrEqual(5);
      expect(tickValues(challenge.min, challenge.max, challenge.step)).toContain(0);
    }
  });
});

describe('find the spot — counting helpers', () => {
  it('reports how far the target sits from the anchor, and in which direction', () => {
    for (const challenge of all) {
      const count = placementCount(challenge);
      expect(count.ticks).toBeGreaterThan(0);
      const expected = challenge.anchor + (count.direction === 'right' ? 1 : -1) * count.ticks * challenge.step;
      expect(expected).toBe(challenge.target);
    }
  });

  it('lists ticks inclusively from both ends of the line', () => {
    expect(tickValues(-4, 4, 2)).toEqual([-4, -2, 0, 2, 4]);
    expect(tickValues(-2, 2, 1)).toEqual([-2, -1, 0, 1, 2]);
  });
});

describe('find the spot — wrong answers are classified, not lumped together', () => {
  const challenge: PlaceChallenge = {
    id: 'test',
    min: -10,
    max: 10,
    step: 1,
    labeledValues: [-10, -5, 0, 5, 10],
    target: -7,
    anchor: -5,
  };

  it('names the mirror-image click a sign flip', () => {
    expect(classifyPlacement(challenge, 7)).toBe('signFlip');
  });

  it('names a click one or two ticks away a counting slip', () => {
    expect(classifyPlacement(challenge, -6)).toBe('offByTicks');
    expect(classifyPlacement(challenge, -9)).toBe('offByTicks');
  });

  it('falls back to a general explanation for a far-away click', () => {
    expect(classifyPlacement(challenge, 2)).toBe('other');
  });

  it('prefers the sign flip reading even when the mirror is also close', () => {
    const near: PlaceChallenge = { ...challenge, target: -1, anchor: 0 };
    expect(classifyPlacement(near, 1)).toBe('signFlip');
  });

  it('classifies every wrong tick of every generated question without throwing', () => {
    for (const item of all) {
      for (const value of tickValues(item.min, item.max, item.step)) {
        if (value === item.target) continue;
        expect(['signFlip', 'offByTicks', 'other']).toContain(classifyPlacement(item, value));
      }
    }
  });
});

describe('find the spot — the soundness check really rejects bad questions', () => {
  const base = () => structuredClone(all[0]);

  it('rejects a target that is not on a tick', () => {
    const bad = base();
    bad.target = bad.max + 3;
    expect(() => assertPlaceChallengeIsSound(bad)).toThrow(/not on a tick/);
  });

  it('rejects a labelled target', () => {
    const bad = base();
    bad.labeledValues = [...bad.labeledValues, bad.target];
    expect(() => assertPlaceChallengeIsSound(bad)).toThrow(/must not show its own number/);
  });

  it('rejects a line with only the origin labelled', () => {
    const bad = base();
    bad.labeledValues = [0];
    expect(() => assertPlaceChallengeIsSound(bad)).toThrow(/work the step out/);
  });

  it('rejects an anchor that is not the nearest labelled tick', () => {
    const bad = all.find((c) => c.labeledValues.length > 2)!;
    const broken = structuredClone(bad);
    broken.anchor = [...broken.labeledValues].sort(
      (a, b) => Math.abs(b - broken.target) - Math.abs(a - broken.target),
    )[0];
    expect(() => assertPlaceChallengeIsSound(broken)).toThrow(/nearer labelled tick/);
  });

  it('rejects zero as a target', () => {
    const bad = base();
    bad.target = 0;
    expect(() => assertPlaceChallengeIsSound(bad)).toThrow();
  });

  it('rejects a line that does not cross zero', () => {
    const bad = base();
    bad.min = 1;
    expect(() => assertPlaceChallengeIsSound(bad)).toThrow(/both sides of zero/);
  });
});
