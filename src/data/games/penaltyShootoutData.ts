import type { GoalTarget, MissOutcome, ShootoutQuestion } from '../../types/penaltyShootout';
import { shuffle } from '../../utils/shuffle';

export const PENALTY_SHOOTOUT_COUNT = 8;
export const PENALTY_MIN_OPERAND = 20;
export const PENALTY_MAX_OPERAND = 599;

type RandomSource = () => number;
type Range = { left: [number, number]; right: [number, number]; minSum: number; maxSum: number };

const TARGETS: GoalTarget[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
const OUTCOMES: MissOutcome[] = ['save', 'post', 'wide'];
const RANGES: Range[] = [
  { left: [20, 79], right: [20, 79], minSum: 60, maxSum: 139 },
  { left: [30, 89], right: [20, 89], minSum: 70, maxSum: 159 },
  { left: [40, 89], right: [30, 89], minSum: 90, maxSum: 169 },
  { left: [55, 99], right: [55, 99], minSum: 120, maxSum: 189 },
  { left: [60, 99], right: [60, 99], minSum: 130, maxSum: 198 },
  { left: [100, 399], right: [25, 99], minSum: 160, maxSum: 489 },
  { left: [200, 499], right: [100, 399], minSum: 350, maxSum: 799 },
  { left: [300, 599], right: [150, 399], minSum: 500, maxSum: 900 },
];

export function hasRegrouping(left: number, right: number): boolean {
  return left % 10 + (right % 10) >= 10 || Math.floor(left / 10) % 10 + (Math.floor(right / 10) % 10) >= 10;
}

function candidatesFor(range: Range): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];
  for (let left = range.left[0]; left <= range.left[1]; left += 1) {
    for (let right = range.right[0]; right <= range.right[1]; right += 1) {
      const sum = left + right;
      if (sum >= range.minSum && sum <= range.maxSum && left % 10 + (right % 10) >= 10) candidates.push([left, right]);
    }
  }
  return candidates;
}

export function buildAdditionChoices(left: number, right: number, random: RandomSource = Math.random): number[] {
  const answer = left + right;
  const placeValueError = answer >= 200 ? answer - 100 : answer + 100;
  const nearError = answer + (random() < 0.5 ? -1 : 1);
  const forgottenCarry = answer - 10;
  return shuffle([answer, forgottenCarry, nearError, placeValueError], random);
}

/** Builds a unique, ordered match; random input is injectable for deterministic tests. */
export function buildPenaltyShootoutMatch(random: RandomSource = Math.random): ShootoutQuestion[] {
  const used = new Set<string>();
  return RANGES.map((range, index) => {
    const available = candidatesFor(range).filter(([left, right]) => !used.has(`${left}+${right}`));
    const [left, right] = available[Math.floor(random() * available.length)];
    used.add(`${left}+${right}`);
    const values = buildAdditionChoices(left, right, random);
    const choices = shuffle(TARGETS, random).map((target, choiceIndex) => ({ target, value: values[choiceIndex] }));
    const wrongOutcomes = Object.fromEntries(
      TARGETS.map((target, targetIndex) => [target, OUTCOMES[(index + targetIndex) % OUTCOMES.length]]),
    ) as Record<GoalTarget, MissOutcome>;
    return {
      id: `penalty-${index}-${left}+${right}`,
      left,
      right,
      answer: left + right,
      choices,
      wrongOutcomes,
      keeperDive: index % 2 === 0 ? 'left' : 'right',
    };
  });
}
