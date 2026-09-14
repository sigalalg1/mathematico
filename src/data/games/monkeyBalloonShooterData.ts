import type { MultiplicationFact, ShooterQuestion } from '../../types/monkeyBalloonShooter';
import { shuffle } from '../../utils/shuffle';

/** Questions per session. */
export const MONKEY_SHOOTER_TOTAL = 8;

/** Balloons per question: one correct product, three distractors. */
export const BALLOONS_PER_QUESTION = 4;

/**
 * The tables a 9-10 year old meets first. A fact built only from these is an
 * "easy" fact and opens the session.
 */
const EASY_FACTORS = [2, 3, 4, 5, 10];
/** The tables that usually come later; a fact using one of these closes the session. */
const HARD_FACTORS = [6, 7, 8, 9];

const ALL_FACTORS = [...EASY_FACTORS, ...HARD_FACTORS].sort((a, b) => a - b);

/** How many of the eight questions come from the easy half. */
const EASY_QUESTIONS = Math.floor(MONKEY_SHOOTER_TOTAL / 2);

function fact(left: number, right: number): MultiplicationFact {
  return { left, right, product: left * right };
}

/** Every fact in the 2-10 tables, split by how hard its factors are. */
function buildFactPools(): { easy: MultiplicationFact[]; hard: MultiplicationFact[] } {
  const easy: MultiplicationFact[] = [];
  const hard: MultiplicationFact[] = [];

  for (const left of ALL_FACTORS) {
    for (const right of ALL_FACTORS) {
      // Only one orientation of each pair, so 7x8 and 8x7 are not two questions.
      if (right < left) continue;
      const item = fact(left, right);
      if (HARD_FACTORS.includes(left) || HARD_FACTORS.includes(right)) hard.push(item);
      else easy.push(item);
    }
  }

  return { easy, hard };
}

/**
 * Wrong answers a child could plausibly land on: the neighbouring rows and
 * columns of the times table, and the two squares around the fact. Random
 * unrelated numbers would be too easy to rule out.
 */
function meaningfulDistractors({ left, right, product }: MultiplicationFact): number[] {
  const neighbours = [
    (left - 1) * right,
    (left + 1) * right,
    left * (right - 1),
    left * (right + 1),
    left * left,
    right * right,
  ];
  // Still table-shaped, but further out; only used when the neighbours collide.
  const backup = [(left + 2) * right, left * (right + 2), (left - 1) * (right + 1), (left + 1) * (right - 1), product + 1, product - 1, product + 2];

  const taken = new Set([product]);
  const chosen: number[] = [];

  for (const candidate of [...shuffle(neighbours), ...backup]) {
    if (chosen.length === BALLOONS_PER_QUESTION - 1) break;
    if (candidate <= 0 || taken.has(candidate)) continue;
    taken.add(candidate);
    chosen.push(candidate);
  }

  return chosen;
}

/**
 * One session: easier facts first, harder ones later. The ramp is just this
 * ordering — deliberately no stage system, this is a small game-feel prototype.
 */
export function buildMonkeyShooterQuestions(): ShooterQuestion[] {
  const { easy, hard } = buildFactPools();
  const facts = [...shuffle(easy).slice(0, EASY_QUESTIONS), ...shuffle(hard).slice(0, MONKEY_SHOOTER_TOTAL - EASY_QUESTIONS)];

  return facts.map((item, index) => ({
    id: `shot-${index}`,
    fact: item,
    options: shuffle([item.product, ...meaningfulDistractors(item)]),
  }));
}
