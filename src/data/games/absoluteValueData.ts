import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import type {
  AbsoluteChallenge,
  AbsoluteComparison,
  AbsoluteDifficultyId,
  AbsoluteKind,
} from '../../types/absoluteValue';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';

const KINDS: Record<AbsoluteDifficultyId, AbsoluteKind[]> = {
  basic: ['distance', 'direct', 'opposites', 'direct'],
  intermediate: ['direct', 'compare', 'opposites', 'compare'],
  hard: ['expression', 'scope', 'expression', 'compare'],
};

export const ABSOLUTE_VALUE_RULES_VERSION = 2;

export function absoluteValue(value: number): number {
  return Math.abs(value);
}

export function comparisonFor(left: number, right: number): AbsoluteComparison {
  return left < right ? '<' : left > right ? '>' : '=';
}

function bars(value: number): string {
  return `|${value}|`;
}

function choices(random: () => number, answer: number, includeNegative = true): string[] {
  const candidates = [answer, -answer, answer + 1, Math.max(0, answer - 1), 0, answer + 2]
    .filter((value, index, all) => (includeNegative || value >= 0) && all.indexOf(value) === index)
    .slice(0, 4);
  for (let value = 1; candidates.length < 4; value++) {
    if (!candidates.includes(value)) candidates.push(value);
  }
  return shuffle(candidates.map(String), random);
}

function makeChallenge(
  difficulty: AbsoluteDifficultyId,
  kind: AbsoluteKind,
  index: number,
  random: () => number,
): AbsoluteChallenge {
  const limit = difficulty === 'basic' ? 10 : difficulty === 'intermediate' ? 20 : 12;
  const signed = () => randomInt(random, -limit, limit);
  const base = {
    id: `absolute-${difficulty}-${index}`,
    difficulty,
    kind,
    min: -limit,
    max: limit,
    showNumberLine: kind === 'distance' || (difficulty === 'basic' && kind === 'direct'),
  };

  if (kind === 'distance') {
    const magnitude = index % 5 === 0 ? 0 : randomInt(random, 1, limit);
    const value = random() < 0.7 ? -magnitude : magnitude;
    return {
      ...base,
      values: [value, -value],
      answer: String(magnitude),
      options: choices(random, magnitude),
      expression: bars(value),
      steps: [`distance(0, ${value}) = ${magnitude}`, `${bars(value)} = ${magnitude}`],
      feedbackKey: 'absoluteValue.feedback.distance',
    };
  }

  if (kind === 'direct') {
    const value = index % 7 === 0 ? 0 : signed();
    const answer = absoluteValue(value);
    return {
      ...base,
      values: [value],
      answer: String(answer),
      options: choices(random, answer),
      expression: bars(value),
      steps: [`${bars(value)} = ${answer}`],
      feedbackKey: 'absoluteValue.feedback.distance',
    };
  }

  if (kind === 'opposites') {
    const magnitude = randomInt(random, 1, limit);
    const answer = bars(magnitude);
    return {
      ...base,
      values: [-magnitude, magnitude],
      answer,
      options: shuffle([bars(magnitude), bars(-magnitude - 1), String(-magnitude), String(magnitude)], random),
      expression: `${bars(-magnitude)} = ?`,
      steps: [`${bars(-magnitude)} = ${magnitude}`, `${bars(magnitude)} = ${magnitude}`],
      feedbackKey: 'absoluteValue.feedback.opposites',
    };
  }

  if (kind === 'compare') {
    const left = signed();
    let right = index % 4 === 0 ? -left : signed();
    if (left === 0 && right === 0) right = 1;
    const answer = comparisonFor(absoluteValue(left), absoluteValue(right));
    return {
      ...base,
      values: [left, right],
      answer,
      options: ['<', '=', '>'],
      expression: `${bars(left)} □ ${bars(right)}`,
      steps: [`${absoluteValue(left)} ${answer} ${absoluteValue(right)}`],
      feedbackKey: 'absoluteValue.feedback.compare',
    };
  }

  if (kind === 'scope') {
    const magnitude = randomInt(random, 1, limit);
    const inside = random() < 0.5 ? -magnitude : magnitude;
    const answer = -magnitude;
    return {
      ...base,
      values: [inside],
      answer: String(answer),
      options: shuffle([answer, magnitude, answer - 1, magnitude + 1].map(String), random),
      expression: `−${bars(inside)}`,
      steps: [`${bars(inside)} = ${magnitude}`, `−${bars(inside)} = −${magnitude}`],
      feedbackKey: 'absoluteValue.feedback.scope',
    };
  }

  const a = signed();
  const b = signed();
  const operation = pickRandom(random, ['+', '−', '·'] as const);
  const left = absoluteValue(a);
  const right = absoluteValue(b);
  const multiplier = operation === '·' ? 2 : left;
  const answer = operation === '+' ? left + right : operation === '−' ? left - right : multiplier * right;
  const expression = operation === '·' ? `2·${bars(b)}` : `${bars(a)} ${operation} ${bars(b)}`;
  const middle = operation === '·' ? `2·${right}` : `${left} ${operation} ${right}`;
  return {
    ...base,
    values: operation === '·' ? [2, b] : [a, b],
    answer: String(answer),
    options: choices(random, answer),
    expression,
    steps: [`${expression} → ${middle} → ${answer}`],
    feedbackKey: 'absoluteValue.feedback.steps',
  };
}

export function assertAbsoluteChallengeIsSound(challenge: AbsoluteChallenge): void {
  if (new Set(challenge.options).size !== challenge.options.length) throw new Error('duplicate options');
  if (challenge.options.filter((option) => option === challenge.answer).length !== 1) {
    throw new Error('question must contain exactly one correct answer');
  }
  if (challenge.min >= 0 || challenge.max <= 0) throw new Error('number line must include zero');
  if (challenge.kind === 'compare') {
    const [left, right] = challenge.values;
    if (challenge.answer !== comparisonFor(Math.abs(left), Math.abs(right))) throw new Error('incorrect comparison');
  }
}

export interface AbsoluteTrainingInput {
  difficultyId: string | null;
  count: number;
  seed?: number;
}

export function buildAbsoluteValueQuestions({
  difficultyId,
  count,
  seed,
}: AbsoluteTrainingInput): TrainingQuestion<AbsoluteChallenge>[] {
  const difficulty: AbsoluteDifficultyId =
    difficultyId === 'intermediate' || difficultyId === 'hard' ? difficultyId : 'basic';
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = KINDS[difficulty];
  return Array.from({ length: count }, (_, index) => {
    const challenge = makeChallenge(difficulty, kinds[index % kinds.length], index, random);
    assertAbsoluteChallengeIsSound(challenge);
    return {
      id: challenge.id,
      prompt: challenge.expression,
      answer: challenge.answer,
      options: challenge.options,
      payload: challenge,
    };
  });
}

export const ABSOLUTE_VALUE_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 20],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'absoluteValue.difficulty.basic' },
    { id: 'intermediate', labelKey: 'training.difficulty.intermediate', descriptionKey: 'absoluteValue.difficulty.intermediate' },
    { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'absoluteValue.difficulty.hard' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  paceRecordMinAccuracy: 1,
  rulesVersion: ABSOLUTE_VALUE_RULES_VERSION,
};

export const absoluteValueActivity: TrainingActivityDefinition<AbsoluteChallenge> = {
  id: 'absoluteValue',
  i18nPrefix: 'absoluteValue',
  capabilities: ABSOLUTE_VALUE_CAPABILITIES,
  generateQuestions: buildAbsoluteValueQuestions,
};
