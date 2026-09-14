import type { MistakeType, TargetPoint } from '../../types/hitTheTarget';

/** Classifies a wrong attempt against the real target so feedback can teach, not just mark it wrong. */
export function classifyMistake(target: TargetPoint, attempt: TargetPoint): MistakeType {
  const isSwapped =
    target.x !== target.y && attempt.x === target.y && attempt.y === target.x;
  if (isSwapped) return 'swapped';

  const xSignFlipped = target.x !== 0 && attempt.x === -target.x && attempt.y === target.y;
  if (xSignFlipped) return 'xSign';

  const ySignFlipped = target.y !== 0 && attempt.y === -target.y && attempt.x === target.x;
  if (ySignFlipped) return 'ySign';

  return 'other';
}
