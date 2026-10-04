/**
 * Grade 7 Algebra — Activity 4: Equivalent Expressions (ביטויים שווי ערך).
 *
 * Two expressions can look different and still be the same quantity. Rather
 * than stating the rule, every question lets the student test it themselves:
 * two sample values of x are substituted into both sides, so "equivalent" or
 * "not equivalent" is something they can see, not something they're told.
 *
 * A fixed eight-question progression (not a repeatable drill — see
 * `algebraPatternsData.ts` for why), built on exact structural comparison:
 * two linear expressions are equivalent iff their coefficient AND constant
 * both match — never approximated by sampling a couple of x-values, even
 * though sampling is exactly what the UI shows the student to build the
 * intuition from.
 */
import { randomInt, type RandomSource } from '../../utils/random';
import { evalLinearExpr, formatLinearExpr, simplifyTerms, type AlgebraTerm, type LinearExpr } from '../../utils/algebra';

export interface EquivalenceChallenge {
  id: string;
  aDisplay: string;
  bDisplay: string;
  aExpr: LinearExpr;
  bExpr: LinearExpr;
  /** The two values substituted into both sides for the guided comparison. */
  sampleXs: [number, number];
  equivalent: boolean;
}

function expressionsEquivalent(a: LinearExpr, b: LinearExpr): boolean {
  return a.coefficient === b.coefficient && a.constant === b.constant;
}

interface LevelSpec {
  id: string;
  build: (random: RandomSource) => Omit<EquivalenceChallenge, 'id' | 'sampleXs' | 'equivalent'>;
}

const LEVELS: LevelSpec[] = [
  {
    // The most literal case: repeated addition IS multiplication.
    id: 'q1',
    build: () => {
      const terms: AlgebraTerm[] = [{ coefficient: 1, isVariable: true }, { coefficient: 1, isVariable: true }];
      const aExpr = simplifyTerms(terms);
      const bExpr: LinearExpr = { coefficient: 2, constant: 0 };
      return { aDisplay: 'x + x', bDisplay: formatLinearExpr(bExpr), aExpr, bExpr };
    },
  },
  {
    id: 'q2',
    build: (random) => {
      const a = randomInt(random, 2, 5);
      const terms: AlgebraTerm[] = [{ coefficient: a, isVariable: true }, { coefficient: 1, isVariable: true }];
      const aExpr = simplifyTerms(terms);
      const bExpr: LinearExpr = { coefficient: a + 1, constant: 0 };
      return { aDisplay: `${a}x + x`, bDisplay: formatLinearExpr(bExpr), aExpr, bExpr };
    },
  },
  {
    // The misconception this whole activity exists to prevent later: an x
    // term and a plain number are never the same kind of thing.
    id: 'q3',
    build: (random) => {
      const a = randomInt(random, 2, 5);
      const b = randomInt(random, 2, 9);
      const aExpr: LinearExpr = { coefficient: a, constant: b };
      const bExpr: LinearExpr = { coefficient: a + b, constant: 0 };
      return { aDisplay: formatLinearExpr(aExpr), bDisplay: formatLinearExpr(bExpr), aExpr, bExpr };
    },
  },
  {
    // Distribution: a(x + b) really does equal ax + ab.
    id: 'q4',
    build: (random) => {
      const a = randomInt(random, 2, 4);
      const b = randomInt(random, 2, 5);
      const aExpr: LinearExpr = { coefficient: a, constant: a * b };
      return { aDisplay: `${a}(x + ${b})`, bDisplay: formatLinearExpr(aExpr), aExpr, bExpr: aExpr };
    },
  },
  {
    // Same coefficient, different constant — close enough to look right.
    id: 'q5',
    build: (random) => {
      const a = randomInt(random, 2, 6);
      const b = randomInt(random, 1, 8);
      const delta = randomInt(random, 1, 4);
      const aExpr: LinearExpr = { coefficient: a, constant: b };
      const bExpr: LinearExpr = { coefficient: a, constant: b + delta };
      return { aDisplay: formatLinearExpr(aExpr), bDisplay: formatLinearExpr(bExpr), aExpr, bExpr };
    },
  },
  {
    // Three unsimplified terms this time — the x-terms still only combine
    // with each other.
    id: 'q6',
    build: (random) => {
      const a = randomInt(random, 2, 4);
      const c = randomInt(random, 1, 3);
      const b = randomInt(random, 1, 8);
      const terms: AlgebraTerm[] = [
        { coefficient: a, isVariable: true },
        { coefficient: b, isVariable: false },
        { coefficient: c, isVariable: true },
      ];
      const aExpr = simplifyTerms(terms);
      return { aDisplay: `${a}x + ${b} + ${c}x`, bDisplay: formatLinearExpr(aExpr), aExpr, bExpr: aExpr };
    },
  },
  {
    // Same constant, coefficient off by one — the other half of "both
    // numbers matter", not just the constant.
    id: 'q7',
    build: (random) => {
      const a = randomInt(random, 2, 6);
      const b = randomInt(random, -8, 8);
      const aExpr: LinearExpr = { coefficient: a, constant: b };
      const bExpr: LinearExpr = { coefficient: a + 1, constant: b };
      return { aDisplay: formatLinearExpr(aExpr), bDisplay: formatLinearExpr(bExpr), aExpr, bExpr };
    },
  },
  {
    // Distribution again, this time with a subtraction inside.
    id: 'q8',
    build: (random) => {
      const a = randomInt(random, 2, 4);
      const b = randomInt(random, 2, 5);
      const aExpr: LinearExpr = { coefficient: a, constant: -a * b };
      return { aDisplay: `${a}(x - ${b})`, bDisplay: formatLinearExpr(aExpr), aExpr, bExpr: aExpr };
    },
  },
];

export const EQUIVALENT_TOTAL = LEVELS.length;

/**
 * Picks two sample x-values for the guided comparison. When the expressions
 * are not equivalent, this avoids the single x (if any) where they happen to
 * coincide anyway — the whole point is that the mismatch is visible in what
 * gets shown, not merely true in principle.
 */
function pickSampleXs(aExpr: LinearExpr, bExpr: LinearExpr, random: RandomSource): [number, number] {
  const coefficientDiff = aExpr.coefficient - bExpr.coefficient;
  const coincidentalX = coefficientDiff === 0 ? null : (bExpr.constant - aExpr.constant) / coefficientDiff;

  const pick = (): number => {
    let value = randomInt(random, -6, 6);
    let guard = 0;
    while (value === coincidentalX && guard < 50) {
      guard += 1;
      value = randomInt(random, -6, 6);
    }
    return value;
  };

  const first = pick();
  let second = pick();
  while (second === first) second = pick();
  return [first, second];
}

export function buildEquivalenceChallenges(random: RandomSource = Math.random): EquivalenceChallenge[] {
  return LEVELS.map((level) => {
    const built = level.build(random);
    const equivalent = expressionsEquivalent(built.aExpr, built.bExpr);
    const sampleXs = pickSampleXs(built.aExpr, built.bExpr, random);
    return { id: level.id, ...built, sampleXs, equivalent };
  });
}

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertEquivalenceChallengeIsSound(challenge: EquivalenceChallenge): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid equivalence question (${challenge.id}): ${reason}`);
  };

  const structurallyEquivalent = expressionsEquivalent(challenge.aExpr, challenge.bExpr);
  if (structurallyEquivalent !== challenge.equivalent) fail('the equivalent flag disagrees with the expressions themselves');

  // The sample substitutions shown must actually agree with the verdict —
  // the whole point of the activity is that this check is visible, not just
  // asserted.
  for (const x of challenge.sampleXs) {
    const matches = evalLinearExpr(challenge.aExpr, x) === evalLinearExpr(challenge.bExpr, x);
    if (challenge.equivalent && !matches) fail(`claimed equivalent, but the samples disagree at x=${x}`);
  }
  if (!challenge.equivalent) {
    const everySampleAgrees = challenge.sampleXs.every((x) => evalLinearExpr(challenge.aExpr, x) === evalLinearExpr(challenge.bExpr, x));
    if (everySampleAgrees) fail('claimed not equivalent, but every shown sample agrees — the mismatch would never be visible');
  }
}
