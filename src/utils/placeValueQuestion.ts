/**
 * Small shared helpers every Decimal Place Value skill generator uses:
 * wrapping a `PlaceValueQuestion` for Training Mode, and building a clean
 * 4-option numeric multiple-choice set.
 */
import type { TrainingQuestion } from '../types/training';
import type { PlaceValueQuestion } from '../types/placeValue';
import { shuffle } from './shuffle';
import { randomInt, randomOf, type RandomSource } from './random';

export function toTrainingQuestion(question: PlaceValueQuestion): TrainingQuestion<PlaceValueQuestion> {
  return {
    id: question.id,
    prompt: question.display,
    answer: question.correctAnswerDisplay,
    options: question.interaction.kind === 'multipleChoice' ? question.interaction.options : [],
    payload: question,
  };
}

/**
 * Parses a `constructChoice` answer (e.g. "1002+2543" or "5710-1548", as
 * built by `PlaceValueQuestionScene`'s `ConstructChoiceInput`) into its two
 * operands, operator and computed result. Returns `null` for anything else
 * (e.g. a raw value submitted by a different interaction kind, or garbage),
 * so a `validate` function can safely call this on any string it's handed.
 */
export function parseConstructAnswer(raw: string): { a: number; b: number; operator: '+' | '-'; result: number } | null {
  const match = /^(\d+)([+-])(\d+)$/.exec(raw);
  if (!match) return null;
  const a = Number(match[1]);
  const operator = match[2] as '+' | '-';
  const b = Number(match[3]);
  return { a, b, operator, result: operator === '+' ? a + b : a - b };
}

/**
 * A correct value plus unique, non-negative numeric distractors scattered
 * around it. A generator bug that collapses every distractor to the same
 * value can never silently ship a one-option question — this always
 * returns `count` distinct strings or throws trying.
 */
export function numericMultipleChoice(random: RandomSource, correct: number, spread: number, count = 4): string[] {
  const values = new Set<number>([correct]);
  let guard = 0;
  while (values.size < count && guard < 500) {
    guard += 1;
    const delta = randomInt(random, 1, Math.max(1, spread)) * randomOf(random, [-1, 1]);
    const candidate = correct + delta;
    if (candidate >= 0) values.add(candidate);
  }
  if (values.size < count) {
    // Extremely small `correct`/`spread` combinations can run out of room
    // below zero — pad upward, which always has room.
    let extra = correct + spread + 1;
    while (values.size < count) {
      if (!values.has(extra)) values.add(extra);
      extra += 1;
    }
  }
  return shuffle([...values].map(String), random);
}
