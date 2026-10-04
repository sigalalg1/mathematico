import type { TrainingActivityDefinition, TrainingQuestion } from '../../types/training';
import { shuffle } from '../../utils/shuffle';
import { randomInt, type RandomSource } from '../../utils/random';

/**
 * Grade 2 arithmetic fluency: the four foundational addition/subtraction skills
 * a 7-8 year old has to make automatic, each as its own training activity.
 *
 * Every question is built so its defining property holds BY CONSTRUCTION — a
 * "no regrouping" question can never accidentally need a carry, and a
 * subtraction can never come out negative. `assertSoundExpression` then
 * re-checks that property on every generated question, so a future edit to a
 * digit range fails loudly in tests instead of quietly teaching the wrong
 * skill.
 */

export type ArithmeticSkillId =
  | 'arithmeticFactsTo20'
  | 'arithmeticTwoDigitPlain'
  | 'arithmeticAdditionRegrouping'
  | 'arithmeticSubtractionRegrouping';

export const ARITHMETIC_FACTS_TO_20: ArithmeticSkillId = 'arithmeticFactsTo20';
export const ARITHMETIC_TWO_DIGIT_PLAIN: ArithmeticSkillId = 'arithmeticTwoDigitPlain';
export const ARITHMETIC_ADDITION_REGROUPING: ArithmeticSkillId = 'arithmeticAdditionRegrouping';
export const ARITHMETIC_SUBTRACTION_REGROUPING: ArithmeticSkillId = 'arithmeticSubtractionRegrouping';

export const ARITHMETIC_SKILL_IDS: ArithmeticSkillId[] = [
  ARITHMETIC_FACTS_TO_20,
  ARITHMETIC_TWO_DIGIT_PLAIN,
  ARITHMETIC_ADDITION_REGROUPING,
  ARITHMETIC_SUBTRACTION_REGROUPING,
];

/** One correct answer plus three plausible near-misses. */
export const ARITHMETIC_CHOICES = 4;

/**
 * Bumped whenever the digit ranges or the question shape materially change, so
 * an old personal best never silently competes against different questions.
 */
export const ARITHMETIC_RULES_VERSION = 1;

export type ArithmeticDifficultyId = 'basic' | 'intermediate' | 'hard';

/**
 * The minus sign (U+2212), not a hyphen: it matches the `×` the multiplication
 * activities already use and keeps the expression legible at large sizes.
 */
export const MINUS = '−';

export interface ArithmeticExpression {
  left: number;
  right: number;
  operator: '+' | typeof MINUS;
  answer: number;
}

const onesOf = (value: number) => value % 10;
const tensOf = (value: number) => Math.floor(value / 10);

/** True when adding these two numbers carries out of the ones column. */
export function requiresCarry(left: number, right: number): boolean {
  return onesOf(left) + onesOf(right) >= 10;
}

/** True when subtracting needs a ten broken open to take the ones away. */
export function requiresBorrow(minuend: number, subtrahend: number): boolean {
  return onesOf(minuend) < onesOf(subtrahend);
}

function difficultyOf(value: string | null): ArithmeticDifficultyId {
  return value === 'intermediate' || value === 'hard' ? value : 'basic';
}

function add(left: number, right: number): ArithmeticExpression {
  return { left, right, operator: '+', answer: left + right };
}

function subtract(left: number, right: number): ArithmeticExpression {
  return { left, right, operator: MINUS, answer: left - right };
}

// --- skill 1: addition and subtraction facts to 20 --------------------------

/**
 * Difficulty here is the real pedagogical ladder for early number facts:
 * inside a single ten, then inside two tens without ever crossing the ten, then
 * the bridging facts (7+5, 15−7) that stay effortful longest.
 */
function generateFactsTo20(difficulty: ArithmeticDifficultyId, random: RandomSource): ArithmeticExpression {
  const wantsAddition = random() < 0.5;

  if (difficulty === 'basic') {
    if (wantsAddition) {
      // Sum kept at or below ten, so the whole fact lives in one ten.
      const left = randomInt(random, 1, 8);
      return add(left, randomInt(random, 1, 10 - left));
    }
    // The answer is derived from the minuend, so it can never go below 1.
    const minuend = randomInt(random, 3, 10);
    return subtract(minuend, randomInt(random, 1, minuend - 1));
  }

  if (difficulty === 'intermediate') {
    if (wantsAddition) {
      // A teen plus a single digit that does not fill the ones column.
      const left = randomInt(random, 10, 18);
      return add(left, randomInt(random, 1, 9 - onesOf(left)));
    }
    // Take away no more ones than the minuend already has: no bridging.
    const minuend = randomInt(random, 11, 19);
    return subtract(minuend, randomInt(random, 1, onesOf(minuend)));
  }

  if (wantsAddition) {
    // Deliberately bridges the ten: the pair always sums to 11 or more.
    const left = randomInt(random, 2, 9);
    return add(left, randomInt(random, 11 - left, 9));
  }
  // Deliberately breaks the ten open: more ones are taken than the teen has.
  const minuend = randomInt(random, 11, 18);
  return subtract(minuend, randomInt(random, onesOf(minuend) + 1, 9));
}

// --- skill 2: two-digit addition and subtraction without regrouping ---------

/**
 * Built digit by digit from the column constraint itself rather than by
 * drawing two numbers and hoping: the ones digits are chosen so they cannot
 * reach ten, and the tens digits so they cannot reach ten either.
 */
function generateTwoDigitPlain(difficulty: ArithmeticDifficultyId, random: RandomSource): ArithmeticExpression {
  const wantsAddition = random() < 0.5;

  if (wantsAddition) {
    let leftTens: number;
    let rightTens: number;
    let leftOnes: number;
    let rightOnes: number;

    if (difficulty === 'basic') {
      // Small digits throughout; neither column can come close to ten.
      leftTens = randomInt(random, 1, 3);
      rightTens = randomInt(random, 1, 3);
      leftOnes = randomInt(random, 0, 4);
      rightOnes = randomInt(random, 0, 4);
    } else if (difficulty === 'intermediate') {
      leftTens = randomInt(random, 1, 8);
      rightTens = randomInt(random, 1, 9 - leftTens);
      leftOnes = randomInt(random, 0, 9);
      rightOnes = randomInt(random, 0, 9 - leftOnes);
    } else {
      // Still no carry, but every column is pushed right up to the boundary —
      // the case where a child who is guessing will reach for one anyway.
      leftTens = randomInt(random, 3, 8);
      rightTens = randomInt(random, Math.max(1, 7 - leftTens), 9 - leftTens);
      leftOnes = randomInt(random, 1, 8);
      rightOnes = randomInt(random, Math.max(1, 6 - leftOnes), 9 - leftOnes);
    }

    return add(leftTens * 10 + leftOnes, rightTens * 10 + rightOnes);
  }

  // Subtraction: every digit of the minuend is chosen first, and each digit of
  // the subtrahend is then drawn at or below it — so no column can borrow.
  //
  // The tens digit is drawn strictly below the minuend's, which matters
  // pedagogically: with equal tens (38 − 37) the tens column does no work and
  // the child is really only subtracting single digits. Keeping them apart
  // means both columns are always exercised, and the answer is always itself a
  // two-digit number.
  const band =
    difficulty === 'basic'
      ? { tens: [2, 5] as const, ones: [2, 9] as const, tensGap: 0, onesGap: 0 }
      : difficulty === 'intermediate'
        ? { tens: [3, 9] as const, ones: [0, 9] as const, tensGap: 0, onesGap: 0 }
        : { tens: [5, 9] as const, ones: [4, 9] as const, tensGap: 3, onesGap: 4 };

  const minuendTens = randomInt(random, band.tens[0], band.tens[1]);
  const minuendOnes = randomInt(random, band.ones[0], band.ones[1]);
  const subtrahendTens = randomInt(
    random,
    band.tensGap ? Math.max(1, minuendTens - band.tensGap) : 1,
    minuendTens - 1,
  );
  const subtrahendOnes = randomInt(random, band.onesGap ? Math.max(0, minuendOnes - band.onesGap) : 0, minuendOnes);

  return subtract(minuendTens * 10 + minuendOnes, subtrahendTens * 10 + subtrahendOnes);
}

// --- skill 3: two-digit addition with regrouping ----------------------------

/**
 * The ones digits are drawn as a pair that must overflow (`rightOnes` starts at
 * `10 - leftOnes`), so a carry is guaranteed, and the tens are capped so the
 * total — carry included — still fits inside 100.
 */
function generateAdditionRegrouping(
  difficulty: ArithmeticDifficultyId,
  random: RandomSource,
): ArithmeticExpression {
  const leftOnes = randomInt(random, 1, 9);
  const rightOnes = randomInt(random, 10 - leftOnes, 9);

  let leftTens: number;
  let rightTens: number;

  if (difficulty === 'basic') {
    leftTens = randomInt(random, 1, 3);
    rightTens = randomInt(random, 1, 3);
  } else if (difficulty === 'intermediate') {
    leftTens = randomInt(random, 1, 6);
    rightTens = randomInt(random, 1, Math.min(6, 7 - leftTens));
  } else {
    // The tens are pushed as high as they can go while the carried ten still
    // fits: totals land in the eighties and nineties.
    leftTens = randomInt(random, 2, 6);
    rightTens = randomInt(random, Math.max(2, 7 - leftTens), Math.min(6, 8 - leftTens));
  }

  return add(leftTens * 10 + leftOnes, rightTens * 10 + rightOnes);
}

// --- skill 4: two-digit subtraction with regrouping -------------------------

/**
 * The subtrahend's ones digit is drawn first and the minuend's is then drawn
 * strictly below it, which forces the borrow; the tens are drawn so that the
 * borrowed ten always leaves a non-negative tens column.
 */
function generateSubtractionRegrouping(
  difficulty: ArithmeticDifficultyId,
  random: RandomSource,
): ArithmeticExpression {
  const subtrahendOnes = randomInt(random, 1, 9);
  const minuendOnes = randomInt(random, 0, subtrahendOnes - 1);

  let minuendTens: number;
  let subtrahendTens: number;

  if (difficulty === 'basic') {
    minuendTens = randomInt(random, 3, 5);
    subtrahendTens = randomInt(random, 1, minuendTens - 1);
  } else if (difficulty === 'intermediate') {
    minuendTens = randomInt(random, 4, 8);
    subtrahendTens = randomInt(random, 1, minuendTens - 1);
  } else {
    // A large minuend against a subtrahend close behind it: the answer is
    // small, so an unnoticed borrow is immediately, obviously wrong.
    minuendTens = randomInt(random, 6, 9);
    subtrahendTens = randomInt(random, Math.max(1, minuendTens - 4), minuendTens - 1);
  }

  return subtract(minuendTens * 10 + minuendOnes, subtrahendTens * 10 + subtrahendOnes);
}

// --- soundness -------------------------------------------------------------

/**
 * The runtime guarantee behind every claim the difficulty copy makes. Called on
 * each generated question, so a broken digit range surfaces as a thrown error
 * in the very first test that generates one rather than as a wrong question in
 * front of a child.
 */
export function assertSoundExpression(expression: ArithmeticExpression, skillId: ArithmeticSkillId): void {
  const { left, right, operator, answer } = expression;
  const isAddition = operator === '+';
  const actual = isAddition ? left + right : left - right;

  if (answer !== actual) {
    throw new Error(`arithmetic: ${left} ${operator} ${right} was labelled ${answer}, not ${actual}`);
  }
  if (answer < 0) {
    throw new Error(`arithmetic: ${left} ${operator} ${right} is negative (${answer})`);
  }
  if (!Number.isInteger(left) || !Number.isInteger(right)) {
    throw new Error(`arithmetic: ${left} ${operator} ${right} has a non-integer operand`);
  }

  switch (skillId) {
    case ARITHMETIC_FACTS_TO_20:
      if (left > 20 || right > 20 || answer > 20) {
        throw new Error(`facts-to-20: ${left} ${operator} ${right} leaves the first two tens`);
      }
      break;

    case ARITHMETIC_TWO_DIGIT_PLAIN:
      if (left < 10 || left > 99 || right < 10 || right > 99) {
        throw new Error(`two-digit: ${left} ${operator} ${right} is not two two-digit numbers`);
      }
      if (isAddition ? requiresCarry(left, right) : requiresBorrow(left, right)) {
        throw new Error(`two-digit plain: ${left} ${operator} ${right} needs regrouping`);
      }
      if (isAddition && tensOf(left) + tensOf(right) > 9) {
        throw new Error(`two-digit plain: ${left} + ${right} carries out of the tens`);
      }
      break;

    case ARITHMETIC_ADDITION_REGROUPING:
      if (!isAddition) throw new Error(`addition-regrouping: got a subtraction (${left} ${operator} ${right})`);
      if (left < 10 || left > 99 || right < 10 || right > 99) {
        throw new Error(`addition-regrouping: ${left} + ${right} is not two two-digit numbers`);
      }
      if (!requiresCarry(left, right)) {
        throw new Error(`addition-regrouping: ${left} + ${right} never carries`);
      }
      if (answer > 99) throw new Error(`addition-regrouping: ${left} + ${right} passes 99`);
      break;

    case ARITHMETIC_SUBTRACTION_REGROUPING:
      if (isAddition) throw new Error(`subtraction-regrouping: got an addition (${left} + ${right})`);
      if (left < 10 || left > 99 || right < 10 || right > 99) {
        throw new Error(`subtraction-regrouping: ${left} ${MINUS} ${right} is not two two-digit numbers`);
      }
      if (!requiresBorrow(left, right)) {
        throw new Error(`subtraction-regrouping: ${left} ${MINUS} ${right} never borrows`);
      }
      break;
  }
}

/** The one place a skill id turns into its generator. */
export function generateArithmeticExpression(
  skillId: ArithmeticSkillId,
  difficultyId: string | null,
  random: RandomSource = Math.random,
): ArithmeticExpression {
  const difficulty = difficultyOf(difficultyId);
  const expression =
    skillId === ARITHMETIC_FACTS_TO_20
      ? generateFactsTo20(difficulty, random)
      : skillId === ARITHMETIC_TWO_DIGIT_PLAIN
        ? generateTwoDigitPlain(difficulty, random)
        : skillId === ARITHMETIC_ADDITION_REGROUPING
          ? generateAdditionRegrouping(difficulty, random)
          : generateSubtractionRegrouping(difficulty, random);

  assertSoundExpression(expression, skillId);
  return expression;
}

// --- distractors -----------------------------------------------------------

/**
 * How far a wrong answer may sit from the right one. A distractor exists to
 * make the child actually finish the calculation, so it has to be close enough
 * to be worth ruling out — an option 60 away is answered by glancing, not by
 * adding. Enforced for every option of every question.
 */
export const MAX_DISTRACTOR_DISTANCE = 20;

/** Swapping the two digits of the answer — a genuine place-value slip. */
function transposed(answer: number): number {
  if (answer < 10 || answer > 99) return answer;
  return onesOf(answer) * 10 + tensOf(answer);
}

/**
 * Wrong answers a grade 2 child could genuinely arrive at, ordered by how
 * likely the mistake is for the skill being practised. A random number would be
 * ruled out on sight and would make the drill measure nothing.
 */
function distractorCandidates(expression: ArithmeticExpression, skillId: ArithmeticSkillId): number[] {
  const { left, right, operator, answer } = expression;
  const nearby = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10];

  switch (skillId) {
    case ARITHMETIC_ADDITION_REGROUPING:
      // Writing the ones digit and forgetting to carry the ten is *the* error.
      return [answer - 10, answer + 1, answer - 1, answer + 10, transposed(answer), ...nearby];

    case ARITHMETIC_SUBTRACTION_REGROUPING: {
      // Taking the smaller ones digit from the larger one regardless of which
      // number it belongs to — the classic "can't take 8 from 2, so do 8−2".
      const smallerFromLarger = (tensOf(left) - tensOf(right)) * 10 + Math.abs(onesOf(left) - onesOf(right));
      return [smallerFromLarger, answer + 10, answer - 1, answer + 1, answer - 10, ...nearby];
    }

    case ARITHMETIC_TWO_DIGIT_PLAIN:
      // Slipping a column is the mistake that survives once the facts are known.
      return [answer + 10, answer - 10, transposed(answer), answer + 1, answer - 1, ...nearby];

    default:
      // A mixed +/− drill: reading the sign the wrong way round is the top slip,
      // and inside the first two tens it always stays a believable distance away.
      return [operator === '+' ? left - right : left + right, answer + 1, answer - 1, answer + 2, answer - 2, ...nearby];
  }
}

/**
 * Exactly `ARITHMETIC_CHOICES - 1` distinct, positive wrong answers, each within
 * `MAX_DISTRACTOR_DISTANCE` of the truth. The padding loop is what makes that a
 * guarantee rather than a hope: it keeps widening the offset until enough
 * distinct values exist, so a question can never end up with a duplicate or a
 * missing option — and there are always far more candidates in range than the
 * three needed.
 */
export function arithmeticDistractors(
  expression: ArithmeticExpression,
  skillId: ArithmeticSkillId,
  howMany: number = ARITHMETIC_CHOICES - 1,
): number[] {
  const taken = new Set([expression.answer]);
  const chosen: number[] = [];

  const take = (candidate: number) => {
    if (chosen.length >= howMany) return;
    if (!Number.isInteger(candidate) || candidate <= 0 || taken.has(candidate)) return;
    if (Math.abs(candidate - expression.answer) > MAX_DISTRACTOR_DISTANCE) return;
    taken.add(candidate);
    chosen.push(candidate);
  };

  for (const candidate of distractorCandidates(expression, skillId)) take(candidate);
  for (let offset = 3; chosen.length < howMany && offset <= MAX_DISTRACTOR_DISTANCE; offset += 1) {
    take(expression.answer + offset);
    take(expression.answer - offset);
  }

  if (chosen.length < howMany) {
    throw new Error(`arithmetic: could not build ${howMany} distractors for ${expression.left} ${expression.operator} ${expression.right}`);
  }

  return chosen;
}

// --- questions -------------------------------------------------------------

export function buildArithmeticQuestions(
  skillId: ArithmeticSkillId,
  input: { difficultyId: string | null; count: number },
  random: RandomSource = Math.random,
): TrainingQuestion[] {
  const questions: TrainingQuestion[] = [];
  let previousPrompt = '';

  for (let index = 0; index < input.count; index += 1) {
    let expression = generateArithmeticExpression(skillId, input.difficultyId, random);
    // A narrow band (facts inside one ten) can repeat; a handful of re-draws
    // avoids asking the identical fact twice in a row without ever looping for
    // long, and a repeat further apart is exactly what a fluency drill wants.
    for (let attempt = 0; attempt < 8 && `${expression.left}${expression.operator}${expression.right}` === previousPrompt; attempt += 1) {
      expression = generateArithmeticExpression(skillId, input.difficultyId, random);
    }
    previousPrompt = `${expression.left}${expression.operator}${expression.right}`;

    const distractors = arithmeticDistractors(expression, skillId);
    questions.push({
      id: `af-${index}`,
      prompt: `${expression.left} ${expression.operator} ${expression.right}`,
      answer: String(expression.answer),
      options: shuffle([expression.answer, ...distractors], random).map(String),
    });
  }

  return questions;
}

// --- activity definitions --------------------------------------------------

function capabilitiesFor(skillId: ArithmeticSkillId): TrainingActivityDefinition['capabilities'] {
  return {
    // The same fluency-drill lengths the times-table drill established.
    questionCounts: [5, 10, 20, 50],
    defaultQuestionCount: 10,
    difficulties: (['basic', 'intermediate', 'hard'] as const).map((id) => ({
      id,
      labelKey: `training.difficulty.${id}`,
      descriptionKey: `arithmeticFluency.skills.${skillId}.difficulty.${id}`,
    })),
    defaultDifficultyId: 'basic',
    supportsChallenge: true,
    // 5 and 10 are too short for a record to mean anything.
    challengeQuestionCounts: [20, 50],
    // A speed record for a fluency skill only counts on a flawless run.
    paceRecordMinAccuracy: 1,
    rulesVersion: ARITHMETIC_RULES_VERSION,
  };
}

function activityFor(skillId: ArithmeticSkillId): TrainingActivityDefinition {
  return {
    id: skillId,
    i18nPrefix: `arithmeticFluency.skills.${skillId}`,
    capabilities: capabilitiesFor(skillId),
    generateQuestions: (input) => buildArithmeticQuestions(skillId, input),
  };
}

export const arithmeticFluencyActivities: TrainingActivityDefinition[] =
  ARITHMETIC_SKILL_IDS.map(activityFor);

/** Which monkey game draws a skill's questions. */
export type ArithmeticSceneId = 'balloons' | 'court';

export interface ArithmeticSkillPresentation {
  skillId: ArithmeticSkillId;
  /** Route segment under the unit path, and the tile's stable link. */
  slug: string;
  scene: ArithmeticSceneId;
  icon: string;
}

/**
 * The single source of truth for how the four skills appear: the unit listing,
 * the routes and the activity screen all read this, so a skill can never end up
 * listed at one address and routed at another.
 *
 * The two scenes alternate deliberately. Both monkey games are already built
 * and already carry the playful identity, so rather than asking a 7-year-old to
 * pick a game before they pick what to practise, each skill simply arrives in
 * one of them — and the unit as a whole stays varied.
 */
export const ARITHMETIC_SKILL_PRESENTATION: ArithmeticSkillPresentation[] = [
  { skillId: ARITHMETIC_FACTS_TO_20, slug: 'facts-to-20', scene: 'balloons', icon: '+' },
  { skillId: ARITHMETIC_TWO_DIGIT_PLAIN, slug: 'two-digit', scene: 'court', icon: '±' },
  { skillId: ARITHMETIC_ADDITION_REGROUPING, slug: 'addition-regrouping', scene: 'balloons', icon: '⊞' },
  { skillId: ARITHMETIC_SUBTRACTION_REGROUPING, slug: 'subtraction-regrouping', scene: 'court', icon: '⊟' },
];

export function findArithmeticSkillBySlug(slug: string | undefined): ArithmeticSkillPresentation | undefined {
  return ARITHMETIC_SKILL_PRESENTATION.find((entry) => entry.slug === slug);
}

export function getArithmeticActivity(skillId: ArithmeticSkillId): TrainingActivityDefinition {
  const activity = arithmeticFluencyActivities.find((candidate) => candidate.id === skillId);
  if (!activity) throw new Error(`arithmetic fluency: unknown skill ${skillId}`);
  return activity;
}
