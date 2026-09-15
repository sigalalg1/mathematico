import { describe, expect, it } from 'vitest';
import {
  assertChallengeIsSound,
  buildCoordinateScaleChallenges,
  COORDINATE_SCALE_MAX,
  COORDINATE_SCALE_MIN,
  COORDINATE_SCALE_TOTAL,
  formatScaleValue,
  questionSignature,
} from '../coordinateScaleData';
import { SUPPORTED_SCALES } from '../../../types/coordinateScale';
import type { Point, ScaleChallenge, ScaleValue } from '../../../types/coordinateScale';

const RUNS = 300;

const sessions: ScaleChallenge[][] = Array.from({ length: RUNS }, () => buildCoordinateScaleChallenges());
const all: ScaleChallenge[] = sessions.flat();

function value(tick: number, scale: ScaleValue): number {
  return tick * scale;
}

function inBounds(point: Point): boolean {
  return (
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= COORDINATE_SCALE_MIN &&
    point.x <= COORDINATE_SCALE_MAX &&
    point.y >= COORDINATE_SCALE_MIN &&
    point.y <= COORDINATE_SCALE_MAX
  );
}

describe('coordinate scale — session shape', () => {
  it('always builds the advertised number of questions with unique ids', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(COORDINATE_SCALE_TOTAL);
      expect(new Set(session.map((c) => c.id)).size).toBe(session.length);
    }
  });

  it('never repeats the same question inside one session', () => {
    for (const session of sessions) {
      expect(new Set(session.map(questionSignature)).size).toBe(session.length);
    }
  });

  it('covers every asked scale and both question kinds across a session', () => {
    for (const session of sessions) {
      const scales = new Set(session.map((c) => c.scale));
      expect(scales.has(0.5)).toBe(true);
      expect([...scales].some((s) => s === 2 || s === 5 || s === 10)).toBe(true);
      expect(new Set(session.map((c) => c.kind))).toEqual(new Set(['axisValue', 'locatePoint']));
      expect(new Set(session.map((c) => c.evidence))).toEqual(new Set(['labels', 'anchor']));
    }
  });

  it('asks only about positive coordinates before negatives appear', () => {
    for (const session of sessions) {
      const firstNegative = session.findIndex((c) => c.targetValue.x < 0 || c.targetValue.y < 0);
      if (firstNegative === -1) continue;
      // Negatives are a later-level difficulty, never the opening question.
      expect(firstNegative).toBeGreaterThan(0);
    }
  });

  it('introduces the anchor-point exercise only after label-reading questions', () => {
    for (const session of sessions) {
      const firstAnchor = session.findIndex((c) => c.evidence === 'anchor');
      const lastLabels = session.map((c) => c.evidence).lastIndexOf('labels');
      expect(firstAnchor).toBeGreaterThan(0);
      expect(firstAnchor).toBeGreaterThan(lastLabels - session.length);
      expect(lastLabels).toBeLessThan(firstAnchor);
    }
  });
});

describe('coordinate scale — generator invariants', () => {
  it('passes its own soundness check for every generated question', () => {
    for (const challenge of all) {
      expect(() => assertChallengeIsSound(challenge)).not.toThrow();
    }
  });

  it('only uses supported, positive scales', () => {
    for (const challenge of all) {
      expect(challenge.scale).toBeGreaterThan(0);
      expect(SUPPORTED_SCALES).toContain(challenge.scale);
    }
  });

  it('keeps the target and every candidate on a real grid tick inside the visible bounds', () => {
    for (const challenge of all) {
      expect(inBounds(challenge.targetTick)).toBe(true);
      for (const option of challenge.options) expect(inBounds(option.tick)).toBe(true);
      if (challenge.anchor) expect(inBounds(challenge.anchor.tick)).toBe(true);
    }
  });

  it('aligns every asked value exactly to its grid position', () => {
    for (const challenge of all) {
      expect(challenge.targetValue.x).toBe(value(challenge.targetTick.x, challenge.scale));
      expect(challenge.targetValue.y).toBe(value(challenge.targetTick.y, challenge.scale));
      // No floating point drift: halves stay exact.
      expect(Number.isFinite(challenge.targetValue.x)).toBe(true);
      expect(Math.abs((challenge.targetValue.x * 2) % 1)).toBe(0);
      expect(Math.abs((challenge.targetValue.y * 2) % 1)).toBe(0);
    }
  });

  it('shows 3 or 4 mutually distinct candidates with exactly one correct', () => {
    for (const challenge of all) {
      expect(challenge.options.length).toBeGreaterThanOrEqual(3);
      expect(challenge.options.length).toBeLessThanOrEqual(4);
      expect(new Set(challenge.options.map((o) => `${o.tick.x},${o.tick.y}`)).size).toBe(challenge.options.length);
      expect(challenge.options.filter((o) => o.kind === 'correct')).toHaveLength(1);
      const correct = challenge.options.find((o) => o.id === challenge.correctOptionId)!;
      expect(correct.kind).toBe('correct');
      expect(correct.tick).toEqual(challenge.targetTick);
    }
  });

  it('never places a candidate on top of the anchor point', () => {
    for (const challenge of all) {
      if (!challenge.anchor) continue;
      for (const option of challenge.options) {
        expect(`${option.tick.x},${option.tick.y}`).not.toBe(`${challenge.anchor.tick.x},${challenge.anchor.tick.y}`);
      }
    }
  });

  it('keeps every axis question and its candidates on that single axis', () => {
    for (const challenge of all) {
      if (challenge.kind !== 'axisValue') continue;
      const axis = challenge.axis!;
      for (const option of challenge.options) {
        expect(axis === 'x' ? option.tick.y : option.tick.x).toBe(0);
      }
    }
  });
});

describe('coordinate scale — distractors are real misconceptions', () => {
  it('builds every wrong candidate from a named mistake, never a random point', () => {
    for (const challenge of all) {
      const { targetTick: tick, targetValue: v, scale } = challenge;
      for (const option of challenge.options) {
        if (option.kind === 'correct') continue;
        switch (option.kind) {
          case 'scaleAsOne':
            // Where the point would sit if every square were worth 1.
            expect(option.tick).toEqual({ x: v.x, y: v.y });
            break;
          case 'wrongScale': {
            const others = SUPPORTED_SCALES.filter((s) => s !== scale && s !== 1);
            expect(others.some((s) => option.tick.x === v.x / s && option.tick.y === v.y / s)).toBe(true);
            break;
          }
          case 'swappedXY':
            expect(option.tick).toEqual({ x: tick.y, y: tick.x });
            break;
          case 'signError':
            expect(
              (option.tick.x === -tick.x && option.tick.y === tick.y) ||
                (option.tick.x === tick.x && option.tick.y === -tick.y),
            ).toBe(true);
            break;
          default:
            throw new Error(`unexpected candidate kind ${option.kind}`);
        }
      }
    }
  });

  it('always offers a scale-related wrong answer for integer scales', () => {
    for (const challenge of all) {
      if (challenge.scale === 0.5) continue;
      expect(challenge.options.some((o) => o.kind === 'scaleAsOne' || o.kind === 'wrongScale')).toBe(true);
    }
  });

  it('offers an X/Y swap candidate for two-dimensional questions often enough to teach it', () => {
    const locate = all.filter((c) => c.kind === 'locatePoint');
    const withSwap = locate.filter((c) => c.options.some((o) => o.kind === 'swappedXY'));
    expect(withSwap.length).toBeGreaterThan(0);
    for (const challenge of withSwap) {
      const swap = challenge.options.find((o) => o.kind === 'swappedXY')!;
      expect(swap.tick).not.toEqual(challenge.targetTick);
    }
  });

  it('offers a sign-error candidate somewhere in the pool', () => {
    expect(all.some((c) => c.options.some((o) => o.kind === 'signError'))).toBe(true);
  });

  it('never marks a distractor as the correct answer', () => {
    for (const challenge of all) {
      for (const option of challenge.options) {
        if (option.id === challenge.correctOptionId) continue;
        expect(`${option.tick.x},${option.tick.y}`).not.toBe(`${challenge.targetTick.x},${challenge.targetTick.y}`);
      }
    }
  });
});

describe('coordinate scale — the scale is always readable and unique', () => {
  it('gives at least two known points on every axis the student must read', () => {
    for (const challenge of all) {
      const axes: ('x' | 'y')[] = challenge.kind === 'axisValue' ? [challenge.axis!] : ['x', 'y'];
      for (const axis of axes) {
        const knownTicks = new Set<number>([0, ...challenge.labeledTicks[axis]]);
        if (challenge.anchor) knownTicks.add(challenge.anchor.tick[axis]);
        expect(knownTicks.size).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('lets only one scale explain everything the student can see', () => {
    for (const challenge of all) {
      const axes: ('x' | 'y')[] = challenge.kind === 'axisValue' ? [challenge.axis!] : ['x', 'y'];
      for (const axis of axes) {
        const known: [number, number][] = [[0, 0]];
        for (const tick of challenge.labeledTicks[axis]) known.push([tick, value(tick, challenge.scale)]);
        if (challenge.anchor) {
          known.push([challenge.anchor.tick[axis], value(challenge.anchor.tick[axis], challenge.scale)]);
        }
        const derived = new Set<number>();
        for (const [t1, v1] of known) {
          for (const [t2, v2] of known) {
            if (t1 === t2) continue;
            derived.add((v2 - v1) / (t2 - t1));
          }
        }
        expect([...derived]).toEqual([challenge.scale]);
      }
    }
  });

  it('anchors are always off both axes so they pin the scale down', () => {
    for (const challenge of all) {
      if (!challenge.anchor) continue;
      expect(challenge.anchor.tick.x).not.toBe(0);
      expect(challenge.anchor.tick.y).not.toBe(0);
      expect(challenge.labeledTicks.x).toEqual([]);
      expect(challenge.labeledTicks.y).toEqual([]);
    }
  });

  it('never labels the answer tick of an axis question', () => {
    for (const challenge of all) {
      if (challenge.kind !== 'axisValue') continue;
      const axis = challenge.axis!;
      for (const option of challenge.options) {
        expect(challenge.labeledTicks[axis]).not.toContain(option.tick[axis]);
      }
    }
  });

  it('only hides some labels — the partially labelled axis still shows numbers', () => {
    for (const challenge of all) {
      if (challenge.evidence !== 'labels') continue;
      const axes: ('x' | 'y')[] = challenge.kind === 'axisValue' ? [challenge.axis!] : ['x', 'y'];
      for (const axis of axes) {
        expect(challenge.labeledTicks[axis].length).toBeGreaterThanOrEqual(2);
        for (const tick of challenge.labeledTicks[axis]) {
          expect(Number.isInteger(tick)).toBe(true);
          expect(tick).not.toBe(0);
          expect(Math.abs(tick)).toBeLessThanOrEqual(COORDINATE_SCALE_MAX);
        }
      }
    }
  });

  it('points its wrong-answer explanation at evidence the student can actually see', () => {
    for (const challenge of all) {
      const { axis, fromTick, toTick } = challenge.reference;
      expect(fromTick).toBe(0);
      expect(toTick).not.toBe(0);
      const visible =
        challenge.labeledTicks[axis].includes(toTick) || (challenge.anchor !== null && challenge.anchor.tick[axis] === toTick);
      expect(visible).toBe(true);
    }
  });
});

describe('coordinate scale — soundness check actually rejects bad questions', () => {
  const base = () => structuredClone(all[0]);

  it('rejects an unsupported scale', () => {
    const bad = base();
    (bad as { scale: number }).scale = 3;
    expect(() => assertChallengeIsSound(bad)).toThrow(/not supported/);
  });

  it('rejects a value that does not match its grid position', () => {
    const bad = base();
    bad.targetValue = { x: bad.targetValue.x + 1, y: bad.targetValue.y };
    expect(() => assertChallengeIsSound(bad)).toThrow();
  });

  it('rejects two candidates sharing a position', () => {
    const bad = base();
    bad.options[1] = { ...bad.options[1], tick: { ...bad.options[0].tick } };
    expect(() => assertChallengeIsSound(bad)).toThrow();
  });

  it('rejects an axis with no readable scale evidence', () => {
    const bad = all.find((c) => c.evidence === 'labels' && c.kind === 'locatePoint')!;
    const broken = structuredClone(bad);
    broken.labeledTicks = { x: [], y: [] };
    expect(() => assertChallengeIsSound(broken)).toThrow(/scale/);
  });

  it('rejects an anchor sitting on an axis, which would leave the scale unknown', () => {
    const anchored = all.find((c) => c.anchor !== null)!;
    const broken = structuredClone(anchored);
    broken.anchor = { ...broken.anchor!, tick: { x: 0, y: broken.anchor!.tick.y } };
    expect(() => assertChallengeIsSound(broken)).toThrow();
  });

  it('rejects a candidate outside the visible grid', () => {
    const bad = base();
    bad.options[0] = { ...bad.options[0], tick: { x: 9, y: 9 }, kind: 'signError' };
    expect(() => assertChallengeIsSound(bad)).toThrow();
  });
});

describe('coordinate scale — value formatting', () => {
  it('shows clean halves and never a negative zero', () => {
    expect(formatScaleValue(0)).toBe('0');
    expect(formatScaleValue(-0)).toBe('0');
    expect(formatScaleValue(3.5)).toBe('3.5');
    expect(formatScaleValue(-1.5)).toBe('-1.5');
    expect(formatScaleValue(10)).toBe('10');
  });

  it('never produces an ugly float for any supported scale', () => {
    for (const scale of SUPPORTED_SCALES) {
      for (let tick = COORDINATE_SCALE_MIN; tick <= COORDINATE_SCALE_MAX; tick++) {
        expect(formatScaleValue(tick * scale)).toMatch(/^-?\d+(\.5)?$/);
      }
    }
  });
});
