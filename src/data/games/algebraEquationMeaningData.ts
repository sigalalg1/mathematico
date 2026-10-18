/**
 * Grade 7 Algebra — Activity 6: Understanding Equations (מהי משוואה?).
 *
 * Before any solving procedure, the idea an equation itself expresses: the
 * two sides have equal value, and a "solution" is simply whichever x makes
 * that true. Every question is answered by testing — substituting a
 * candidate value and checking both sides — never by applying a rule, since
 * there isn't one here yet.
 *
 * A fixed eight-question progression (see `algebraPatternsData.ts` for why
 * this is a walkthrough, not a repeatable drill).
 */
import { randomInt, type RandomSource } from '../../utils/random';
import { satisfiesEquation, solveLinearEquation, type LinearEquation } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export type EquationMeaningKind = 'isSolution' | 'pickSolution';

export interface EquationMeaningChallenge {
  id: string;
  kind: EquationMeaningKind;
  equation: LinearEquation;
  /** Set only for `isSolution` — the candidate value the question asks about. */
  testValue: number | null;
  options: string[];
  answer: string;
}

const OPTION_COUNT = 4;

interface LevelSpec {
  id: string;
  kind: EquationMeaningKind;
  coefficientRange: [number, number];
  constantRange: [number, number];
  solutionRange: [number, number];
}

const LEVELS: LevelSpec[] = [
  { id: 'q1', kind: 'pickSolution', coefficientRange: [1, 1], constantRange: [1, 9], solutionRange: [1, 9] },
  { id: 'q2', kind: 'pickSolution', coefficientRange: [1, 1], constantRange: [1, 9], solutionRange: [1, 9] },
  { id: 'q3', kind: 'pickSolution', coefficientRange: [2, 4], constantRange: [1, 9], solutionRange: [1, 9] },
  { id: 'q4', kind: 'pickSolution', coefficientRange: [2, 4], constantRange: [1, 9], solutionRange: [1, 9] },
  { id: 'q5', kind: 'isSolution', coefficientRange: [1, 1], constantRange: [1, 9], solutionRange: [1, 9] },
  { id: 'q6', kind: 'isSolution', coefficientRange: [2, 4], constantRange: [1, 9], solutionRange: [1, 9] },
  { id: 'q7', kind: 'isSolution', coefficientRange: [2, 4], constantRange: [-9, 9], solutionRange: [-9, -1] },
  { id: 'q8', kind: 'pickSolution', coefficientRange: [2, 4], constantRange: [-9, 9], solutionRange: [-9, -1] },
];

/** `coefficient * x + constant = target`, built from an intended solution so it's always exact. */
function buildEquationWithSolution(coefficient: number, constant: number, solution: number): LinearEquation {
  const target = coefficient * solution + constant;
  return { left: { coefficient, constant }, right: { coefficient: 0, constant: target } };
}

function uniqueCandidates(random: RandomSource, correct: number, spread: number): number[] {
  const values = new Set<number>([correct]);
  let guard = 0;
  while (values.size < OPTION_COUNT && guard < 200) {
    guard += 1;
    values.add(correct + randomInt(random, 1, spread) * (random() < 0.5 ? -1 : 1));
  }
  return [...values];
}

function buildChallenge(level: LevelSpec, random: RandomSource): EquationMeaningChallenge {
  const coefficient = randomInt(random, level.coefficientRange[0], level.coefficientRange[1]);
  const constant = randomInt(random, level.constantRange[0], level.constantRange[1]);
  const solution = randomInt(random, level.solutionRange[0], level.solutionRange[1]);
  const equation = buildEquationWithSolution(coefficient, constant, solution);

  if (level.kind === 'pickSolution') {
    const candidates = uniqueCandidates(random, solution, Math.max(3, Math.abs(coefficient) + 2));
    return {
      id: level.id,
      kind: level.kind,
      equation,
      testValue: null,
      options: shuffle(candidates.map(String), random),
      answer: String(solution),
    };
  }

  // isSolution: half the time, genuinely test the real solution; the other
  // half, test a nearby wrong value — both outcomes need to occur, or the
  // question degenerates into "is this always yes".
  const askAboutRealSolution = random() < 0.5;
  const testValue = askAboutRealSolution ? solution : solution + randomInt(random, 1, Math.max(2, Math.abs(coefficient) + 1));
  const isSolutionAnswer = satisfiesEquation(equation, testValue);

  return {
    id: level.id,
    kind: level.kind,
    equation,
    testValue,
    options: ['yes', 'no'],
    answer: isSolutionAnswer ? 'yes' : 'no',
  };
}

export const EQUATION_MEANING_TOTAL = LEVELS.length;

export function buildEquationMeaningChallenges(random: RandomSource = Math.random): EquationMeaningChallenge[] {
  return LEVELS.map((level) => buildChallenge(level, random));
}

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertEquationMeaningChallengeIsSound(challenge: EquationMeaningChallenge): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid equation-meaning question (${challenge.id}): ${reason}`);
  };

  const solution = solveLinearEquation(challenge.equation);
  if (solution === null) fail('the equation has no unique solution');

  if (new Set(challenge.options).size !== challenge.options.length) fail('duplicate options');
  if (!challenge.options.includes(challenge.answer)) fail('the answer is not among its own options');

  if (challenge.kind === 'pickSolution') {
    if (challenge.options.length !== OPTION_COUNT) fail(`expected ${OPTION_COUNT} options, got ${challenge.options.length}`);
    if (!satisfiesEquation(challenge.equation, Number(challenge.answer))) fail('the answer does not actually solve the equation');
    for (const option of challenge.options) {
      if (option !== challenge.answer && satisfiesEquation(challenge.equation, Number(option))) {
        fail(`a wrong option (${option}) also solves the equation`);
      }
    }
  } else {
    if (challenge.testValue === null) fail('missing the test value');
    const actuallySatisfies = satisfiesEquation(challenge.equation, challenge.testValue!);
    const claimsYes = challenge.answer === 'yes';
    if (actuallySatisfies !== claimsYes) fail('the yes/no answer disagrees with substituting the test value');
  }
}
