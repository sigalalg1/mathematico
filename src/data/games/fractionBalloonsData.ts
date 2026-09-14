import type { BalloonFraction, BalloonQuestion, BalloonQuestionKind } from '../../types/fractionBalloons';
import type { FractionShapeKind } from '../../types/fractionFactory';
import { shuffle } from '../../utils/shuffle';

/**
 * The whole content of this prototype: eight fractions a 9-10 year old can read
 * at a glance. Deliberately tiny — this game is a game-feel experiment, not a
 * curriculum unit, so there is no stage arc and no difficulty ramp.
 */
export const FRACTION_BALLOON_FRACTIONS: readonly BalloonFraction[] = [
  { numerator: 1, denominator: 2 },
  { numerator: 1, denominator: 3 },
  { numerator: 2, denominator: 3 },
  { numerator: 1, denominator: 4 },
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 2, denominator: 5 },
  { numerator: 3, denominator: 5 },
];

/** Questions per session. */
export const FRACTION_BALLOONS_TOTAL = 6;

/** Balloons per question: one correct, three distractors. */
export const BALLOONS_PER_QUESTION = 4;

const SHAPES: FractionShapeKind[] = ['circle', 'bar', 'grid'];

export function sameFraction(a: BalloonFraction, b: BalloonFraction): boolean {
  return a.numerator === b.numerator && a.denominator === b.denominator;
}

function value(fraction: BalloonFraction): number {
  return fraction.numerator / fraction.denominator;
}

/**
 * Three other fractions from the set whose *values* all differ from the answer
 * and from each other, so 1/2 and 2/4 can never float side by side and leave
 * two defensible taps.
 */
function buildDistractors(answer: BalloonFraction): BalloonFraction[] {
  const takenValues = new Set([value(answer)]);
  const distractors: BalloonFraction[] = [];

  for (const candidate of shuffle([...FRACTION_BALLOON_FRACTIONS])) {
    if (distractors.length === BALLOONS_PER_QUESTION - 1) break;
    if (takenValues.has(value(candidate))) continue;
    takenValues.add(value(candidate));
    distractors.push(candidate);
  }

  return distractors;
}

/** Colours in the first `numerator` pieces, which reads cleanly on all three shapes. */
function contiguousPieces(numerator: number): number[] {
  return Array.from({ length: numerator }, (_, i) => i);
}

/** Builds one session: distinct target fractions, alternating question kinds. */
export function buildFractionBalloonQuestions(): BalloonQuestion[] {
  const targets = shuffle([...FRACTION_BALLOON_FRACTIONS]).slice(0, FRACTION_BALLOONS_TOTAL);
  // Alternating means both question types always appear, and the starting kind
  // varies so two sessions in a row do not open identically.
  const visualFirst = Math.random() < 0.5;

  return targets.map((target, index) => {
    const kind: BalloonQuestionKind = (index % 2 === 0) === visualFirst ? 'visual' : 'symbolic';
    return {
      id: `balloon-${index}`,
      kind,
      target,
      shape: SHAPES[index % SHAPES.length],
      selectedPieces: kind === 'visual' ? contiguousPieces(target.numerator) : [],
      options: shuffle([target, ...buildDistractors(target)]),
    };
  });
}
