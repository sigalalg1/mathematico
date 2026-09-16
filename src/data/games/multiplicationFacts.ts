import type { MultiplicationFact } from '../../types/monkeyBalloonShooter';
import { shuffle } from '../../utils/shuffle';

/**
 * Shared multiplication-fact helpers for every activity built on the times
 * tables (the balloon game and the tables drill), so a plausible wrong answer
 * means the same thing everywhere.
 */

export function multiplicationFact(left: number, right: number): MultiplicationFact {
  return { left, right, product: left * right };
}

/**
 * Wrong answers a child could plausibly land on: the neighbouring rows and
 * columns of the times table, and the two squares around the fact. Random
 * unrelated numbers would be too easy to rule out.
 */
export function meaningfulDistractors({ left, right, product }: MultiplicationFact, howMany: number): number[] {
  const neighbours = [
    (left - 1) * right,
    (left + 1) * right,
    left * (right - 1),
    left * (right + 1),
    left * left,
    right * right,
  ];
  // Still table-shaped, but further out; only used when the neighbours collide.
  const backup = [
    (left + 2) * right,
    left * (right + 2),
    (left - 1) * (right + 1),
    (left + 1) * (right - 1),
    product + 1,
    product - 1,
    product + 2,
  ];

  const taken = new Set([product]);
  const chosen: number[] = [];

  for (const candidate of [...shuffle(neighbours), ...backup]) {
    if (chosen.length === howMany) break;
    if (candidate <= 0 || taken.has(candidate)) continue;
    taken.add(candidate);
    chosen.push(candidate);
  }

  return chosen;
}
