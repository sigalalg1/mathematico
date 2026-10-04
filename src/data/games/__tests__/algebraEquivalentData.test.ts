import { describe, expect, it } from 'vitest';
import { assertEquivalenceChallengeIsSound, buildEquivalenceChallenges, EQUIVALENT_TOTAL } from '../algebraEquivalentData';
import { seededRandom } from '../../../utils/random';
import { evalLinearExpr } from '../../../utils/algebra';

const RUNS = 500;
const sessions = Array.from({ length: RUNS }, (_, index) => buildEquivalenceChallenges(seededRandom(2000 + index)));
const all = sessions.flat();

describe('session shape', () => {
  it('always builds the full fixed progression, in order', () => {
    for (const session of sessions) {
      expect(session).toHaveLength(EQUIVALENT_TOTAL);
      expect(session.map((c) => c.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
    }
  });

  it('both equivalent and not-equivalent questions appear in every session', () => {
    for (const session of sessions) {
      expect(session.some((c) => c.equivalent)).toBe(true);
      expect(session.some((c) => !c.equivalent)).toBe(true);
    }
  });
});

describe('generator invariants', () => {
  it('every generated question passes its own soundness check', () => {
    for (const challenge of all) expect(() => assertEquivalenceChallengeIsSound(challenge)).not.toThrow();
  });

  it('the two sample x-values are always distinct', () => {
    for (const challenge of all) expect(challenge.sampleXs[0]).not.toBe(challenge.sampleXs[1]);
  });

  it('when equivalent, both sample substitutions genuinely agree', () => {
    for (const challenge of all.filter((c) => c.equivalent)) {
      for (const x of challenge.sampleXs) {
        expect(evalLinearExpr(challenge.aExpr, x)).toBe(evalLinearExpr(challenge.bExpr, x));
      }
    }
  });

  it('when not equivalent, at least one sample substitution genuinely disagrees', () => {
    const notEquivalent = all.filter((c) => !c.equivalent);
    expect(notEquivalent.length).toBeGreaterThan(0);
    for (const challenge of notEquivalent) {
      const disagrees = challenge.sampleXs.some((x) => evalLinearExpr(challenge.aExpr, x) !== evalLinearExpr(challenge.bExpr, x));
      expect(disagrees).toBe(true);
    }
  });

  it('q3 always demonstrates the "ax + b is not (a+b)x" misconception as not-equivalent', () => {
    for (const session of sessions) {
      const q3 = session.find((c) => c.id === 'q3')!;
      expect(q3.equivalent).toBe(false);
    }
  });

  it('q4 and q8 (distribution) are always equivalent', () => {
    for (const session of sessions) {
      expect(session.find((c) => c.id === 'q4')!.equivalent).toBe(true);
      expect(session.find((c) => c.id === 'q8')!.equivalent).toBe(true);
    }
  });
});

describe('the soundness check really rejects bad questions', () => {
  it('rejects an equivalent flag that disagrees with the expressions', () => {
    const corrupted = structuredClone(all.find((c) => c.equivalent)!);
    corrupted.equivalent = false;
    expect(() => assertEquivalenceChallengeIsSound(corrupted)).toThrow();
  });

  it('rejects a not-equivalent question whose samples happen to coincide', () => {
    const corrupted = structuredClone(all.find((c) => !c.equivalent)!);
    // Force both samples to agree, simulating the exact bug this check exists to catch.
    corrupted.sampleXs = [0, 0];
    corrupted.bExpr = { ...corrupted.aExpr };
    corrupted.equivalent = false;
    expect(() => assertEquivalenceChallengeIsSound(corrupted)).toThrow();
  });
});
