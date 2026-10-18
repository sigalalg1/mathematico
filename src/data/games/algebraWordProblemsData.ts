/**
 * Grade 7 Algebra — Activity 8: From Words to Equations (מבעיה למשוואה).
 *
 * The unit's closing synthesis: story → equation → solution → interpretation.
 * The student never starts from an already-built equation — they first pick
 * which equation the story actually describes (multiple choice, not typed —
 * mobile-friendly, per the unit's interaction guidance), and only then see it
 * solved and the answer read back in the story's own terms.
 *
 * A fixed eight-question progression; every equation is `a·x ± b = c`,
 * built from an intended integer solution so it is always exact.
 */
import { randomInt, randomOf, type RandomSource } from '../../utils/random';
import { formatLinearEquation, solveLinearEquation, type LinearEquation } from '../../utils/algebra';
import { shuffle } from '../../utils/shuffle';

export type WordProblemTemplateId = 'abstractPlus' | 'storyPlus' | 'abstractMinus' | 'storyMinus';

export interface WordProblemChallenge {
  id: string;
  templateId: WordProblemTemplateId;
  storyParams: { a: number; b: number; c: number; name: string; other: string };
  equation: LinearEquation;
  solution: number;
  options: string[];
  answer: string;
}

const OPTION_COUNT = 4;
const NAME_PAIRS: [string, string][] = [
  ['Dana', 'Tom'],
  ['Noa', 'Omer'],
  ['Maya', 'Itai'],
  ['Yael', 'Ron'],
];

interface LevelSpec {
  id: string;
  templateId: WordProblemTemplateId;
  aRange: [number, number];
  bRange: [number, number];
  solutionRange: [number, number];
}

const LEVELS: LevelSpec[] = [
  { id: 'q1', templateId: 'abstractPlus', aRange: [2, 4], bRange: [2, 9], solutionRange: [2, 9] },
  { id: 'q2', templateId: 'storyPlus', aRange: [2, 4], bRange: [2, 9], solutionRange: [2, 9] },
  { id: 'q3', templateId: 'abstractMinus', aRange: [2, 4], bRange: [2, 9], solutionRange: [3, 9] },
  { id: 'q4', templateId: 'storyMinus', aRange: [2, 4], bRange: [2, 9], solutionRange: [3, 9] },
  { id: 'q5', templateId: 'abstractPlus', aRange: [3, 5], bRange: [3, 12], solutionRange: [2, 8] },
  { id: 'q6', templateId: 'storyPlus', aRange: [3, 5], bRange: [3, 12], solutionRange: [2, 8] },
  { id: 'q7', templateId: 'abstractMinus', aRange: [3, 5], bRange: [3, 12], solutionRange: [4, 9] },
  { id: 'q8', templateId: 'storyMinus', aRange: [3, 5], bRange: [3, 12], solutionRange: [4, 9] },
];

function buildEquation(a: number, b: number, solution: number, isPlus: boolean): LinearEquation {
  const target = isPlus ? a * solution + b : a * solution - b;
  return { left: { coefficient: a, constant: isPlus ? b : -b }, right: { coefficient: 0, constant: target } };
}

/** Plausible wrong translations: the other operation, or the coefficient and constant swapped. */
function buildDistractors(a: number, b: number, c: number, isPlus: boolean, correct: string, random: RandomSource): string[] {
  const candidates = new Set<string>();
  candidates.add(formatLinearEquation({ left: { coefficient: a, constant: isPlus ? -b : b }, right: { coefficient: 0, constant: c } }));
  candidates.add(formatLinearEquation({ left: { coefficient: a + 1, constant: isPlus ? b : -b }, right: { coefficient: 0, constant: c } }));
  candidates.add(formatLinearEquation({ left: { coefficient: b, constant: isPlus ? a : -a }, right: { coefficient: 0, constant: c } }));
  candidates.delete(correct);

  let guard = 0;
  while (candidates.size < OPTION_COUNT - 1 && guard < 50) {
    guard += 1;
    const filler = formatLinearEquation({
      left: { coefficient: randomInt(random, 2, 6), constant: randomInt(random, -9, 9) },
      right: { coefficient: 0, constant: c },
    });
    if (filler !== correct) candidates.add(filler);
  }

  return shuffle([...candidates], random).slice(0, OPTION_COUNT - 1);
}

function buildChallenge(level: LevelSpec, random: RandomSource): WordProblemChallenge {
  const a = randomInt(random, level.aRange[0], level.aRange[1]);
  const b = randomInt(random, level.bRange[0], level.bRange[1]);
  const solution = randomInt(random, level.solutionRange[0], level.solutionRange[1]);
  const isPlus = level.templateId === 'abstractPlus' || level.templateId === 'storyPlus';
  const equation = buildEquation(a, b, solution, isPlus);
  const target = equation.right.constant;
  const answer = formatLinearEquation(equation);
  const [name, other] = randomOf(random, NAME_PAIRS);

  return {
    id: level.id,
    templateId: level.templateId,
    storyParams: { a, b, c: target, name, other },
    equation,
    solution,
    options: shuffle([answer, ...buildDistractors(a, b, target, isPlus, answer, random)], random),
    answer,
  };
}

export const WORD_PROBLEMS_TOTAL = LEVELS.length;

export function buildWordProblemChallenges(random: RandomSource = Math.random): WordProblemChallenge[] {
  return LEVELS.map((level) => buildChallenge(level, random));
}

/** Runtime self-check, also the test suite's primary correctness gate. */
export function assertWordProblemChallengeIsSound(challenge: WordProblemChallenge): void {
  const fail = (reason: string): never => {
    throw new Error(`Invalid word-problem question (${challenge.id}): ${reason}`);
  };

  const solved = solveLinearEquation(challenge.equation);
  if (solved === null) fail('the equation has no unique solution');
  if (solved !== challenge.solution) fail('the stated solution does not match solving the equation');
  if (formatLinearEquation(challenge.equation) !== challenge.answer) fail('the answer does not match the equation it was built from');

  if (new Set(challenge.options).size !== challenge.options.length) fail('duplicate options');
  if (challenge.options.length !== OPTION_COUNT) fail(`expected ${OPTION_COUNT} options, got ${challenge.options.length}`);
  if (!challenge.options.includes(challenge.answer)) fail('the answer is not among its own options');
}
