import type {
  FractionActivityId,
  FractionChallenge,
  FractionChallengeKind,
  FractionChoice,
  FractionValue,
} from '../../types/fractionsPart1';
import type { FractionShapeKind } from '../../types/fractionShape';
import { shuffle } from '../../utils/shuffle';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';

export const FRACTIONS_PART1_ACTIVITY_IDS: FractionActivityId[] = [
  'build-a-fraction',
  'numerator-denominator',
  'find-the-fraction',
  'build-the-whole',
  'same-fraction',
  'fraction-number-line',
  'which-is-greater',
  'fraction-of-collection',
  'fraction-pizzeria',
  'fractions-challenge',
];

export const FRACTIONS_PART1_SESSION_SIZE = 6;
export const FRACTIONS_CHALLENGE_SESSION_SIZE = 9;

const SHAPES: FractionShapeKind[] = ['circle', 'bar', 'grid'];
const EARLY_DENOMINATORS = [2, 3, 4] as const;
const LATER_DENOMINATORS = [4, 5, 6, 8] as const;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function fractionKey(fraction: FractionValue): string {
  return `${fraction.numerator}/${fraction.denominator}`;
}

export function fractionsEquivalent(left: FractionValue, right: FractionValue): boolean {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

export function compareFractions(left: FractionValue, right: FractionValue): '<' | '>' | '=' {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference === 0 ? '=' : difference > 0 ? '>' : '<';
}

export function fractionNumberLinePosition(fraction: FractionValue): number {
  return fraction.numerator / fraction.denominator;
}

export function collectionFraction(selected: number, total: number): FractionValue {
  return { numerator: selected, denominator: total };
}

function makeFraction(random: () => number, difficulty: number): FractionValue {
  const denominators = difficulty < 2 ? EARLY_DENOMINATORS : [...EARLY_DENOMINATORS, ...LATER_DENOMINATORS];
  const denominator = pickRandom(random, denominators);
  const numerator = difficulty === 0 ? 1 : randomInt(random, 1, Math.max(1, denominator - 1));
  return { numerator, denominator };
}

function selectedIndices(random: () => number, total: number, count: number): number[] {
  return shuffle(
    Array.from({ length: total }, (_, index) => index),
    random,
  )
    .slice(0, count)
    .sort((a, b) => a - b);
}

function fractionChoices(random: () => number, target: FractionValue): FractionChoice[] {
  const candidates: FractionValue[] = [
    target,
    { numerator: Math.min(target.denominator, target.numerator + 1), denominator: target.denominator },
    { numerator: target.numerator, denominator: target.denominator === 8 ? 6 : target.denominator + 1 },
    { numerator: Math.max(1, target.denominator - target.numerator), denominator: target.denominator },
  ];
  const unique = [...new Map(candidates.map((value) => [fractionKey(value), value])).values()];
  for (let denominator = 2; unique.length < 4; denominator++) {
    const candidate = { numerator: 1, denominator };
    if (!unique.some((value) => fractionKey(value) === fractionKey(candidate))) unique.push(candidate);
  }
  return shuffle(
    unique.slice(0, 4).map((fraction) => ({ id: fractionKey(fraction), value: fractionKey(fraction), fraction })),
    random,
  );
}

function numericChoices(random: () => number, answer: number, min = 1, max = 8): FractionChoice[] {
  const values = new Set([answer]);
  for (let offset = 1; values.size < 4; offset++) {
    if (answer - offset >= min) values.add(answer - offset);
    if (answer + offset <= max) values.add(answer + offset);
  }
  return shuffle(
    [...values].slice(0, 4).map((value) => ({ id: String(value), value: String(value) })),
    random,
  );
}

function equivalentChoices(random: () => number, target: FractionValue): FractionChoice[] {
  const divisor = gcd(target.numerator, target.denominator);
  const base = { numerator: target.numerator / divisor, denominator: target.denominator / divisor };
  const multiplier = base.denominator * 2 <= 8 ? 2 : 1;
  const equivalent = { numerator: base.numerator * multiplier, denominator: base.denominator * multiplier };
  const distractors = [
    { numerator: Math.min(equivalent.denominator, equivalent.numerator + 1), denominator: equivalent.denominator },
    { numerator: equivalent.numerator, denominator: Math.min(8, equivalent.denominator + 1) },
    { numerator: base.numerator, denominator: Math.min(8, base.denominator + 1) },
  ].filter((value) => !fractionsEquivalent(value, target));
  const values = [equivalent, ...distractors];
  return shuffle(
    [...new Map(values.map((value) => [fractionKey(value), value])).values()].slice(0, 4).map((fraction, index) => ({
      id: fractionKey(fraction),
      value: fractionKey(fraction),
      fraction,
      shape: SHAPES[index % SHAPES.length],
    })),
    random,
  );
}

const ACTIVITY_KINDS: Record<FractionActivityId, FractionChallengeKind[]> = {
  'build-a-fraction': ['build', 'build', 'readModel'],
  'numerator-denominator': ['terms'],
  'find-the-fraction': ['findModel', 'readModel'],
  'build-the-whole': ['whole'],
  'same-fraction': ['equivalent'],
  'fraction-number-line': ['numberLinePlace', 'numberLineRead'],
  'which-is-greater': ['compare'],
  'fraction-of-collection': ['collection'],
  'fraction-pizzeria': ['pizzaBuild', 'pizzaRead'],
  'fractions-challenge': [
    'build',
    'terms',
    'findModel',
    'whole',
    'equivalent',
    'numberLinePlace',
    'compare',
    'collection',
    'readModel',
  ],
};

function buildChallenge(
  activityId: FractionActivityId,
  kind: FractionChallengeKind,
  index: number,
  random: () => number,
): FractionChallenge {
  const difficulty = index < 2 ? 0 : index < 4 ? 1 : 2;
  const fraction = makeFraction(random, difficulty);
  const shape = pickRandom(random, SHAPES);
  const base = {
    id: `${activityId}-${index}-${kind}-${fractionKey(fraction)}`,
    activityId,
    kind,
    fraction,
    shape,
    selected: [] as number[],
    choices: [] as FractionChoice[],
  };

  if (kind === 'build' || kind === 'pizzaBuild') {
    return {
      ...base,
      promptKey: kind === 'pizzaBuild' ? 'fractionsPart1.prompts.pizzaBuild' : 'fractionsPart1.prompts.build',
      correctAnswer: String(fraction.numerator),
    };
  }

  if (kind === 'readModel' || kind === 'pizzaRead') {
    return {
      ...base,
      promptKey: kind === 'pizzaRead' ? 'fractionsPart1.prompts.pizzaRead' : 'fractionsPart1.prompts.readModel',
      selected: selectedIndices(random, fraction.denominator, fraction.numerator),
      choices: fractionChoices(random, fraction),
      correctAnswer: fractionKey(fraction),
    };
  }

  if (kind === 'terms') {
    const termTarget = pickRandom(random, ['numerator', 'denominator', 'selected', 'total'] as const);
    const answer = termTarget === 'numerator' || termTarget === 'selected' ? fraction.numerator : fraction.denominator;
    return {
      ...base,
      promptKey: `fractionsPart1.prompts.terms.${termTarget}`,
      selected: selectedIndices(random, fraction.denominator, fraction.numerator),
      termTarget,
      choices: numericChoices(random, answer),
      correctAnswer: String(answer),
    };
  }

  if (kind === 'findModel') {
    const choices = fractionChoices(random, fraction).map((choice, choiceIndex) => ({
      ...choice,
      shape: SHAPES[choiceIndex % SHAPES.length],
    }));
    return { ...base, promptKey: 'fractionsPart1.prompts.findModel', choices, correctAnswer: fractionKey(fraction) };
  }

  if (kind === 'whole') {
    const shownNumerator = difficulty === 0 ? 1 : fraction.numerator;
    const shown = { ...fraction, numerator: shownNumerator };
    return {
      ...base,
      fraction: shown,
      promptKey: 'fractionsPart1.prompts.whole',
      selected: selectedIndices(random, shown.denominator, shown.numerator),
      choices: numericChoices(random, shown.denominator),
      correctAnswer: String(shown.denominator),
    };
  }

  if (kind === 'equivalent') {
    const simpleTargets = [
      { numerator: 1, denominator: 2 },
      { numerator: 1, denominator: 3 },
      { numerator: 2, denominator: 3 },
      { numerator: 1, denominator: 4 },
      { numerator: 3, denominator: 4 },
    ];
    const target = pickRandom(random, simpleTargets);
    const choices = equivalentChoices(random, target);
    const correct = choices.find((choice) => choice.fraction && fractionsEquivalent(choice.fraction, target))!;
    return {
      ...base,
      fraction: target,
      promptKey: 'fractionsPart1.prompts.equivalent',
      choices,
      correctAnswer: correct.value,
    };
  }

  if (kind === 'numberLinePlace') {
    return {
      ...base,
      promptKey: 'fractionsPart1.prompts.numberLinePlace',
      choices: Array.from({ length: fraction.denominator + 1 }, (_, value) => ({
        id: String(value),
        value: String(value),
      })),
      correctAnswer: String(fraction.numerator),
    };
  }

  if (kind === 'numberLineRead') {
    return {
      ...base,
      promptKey: 'fractionsPart1.prompts.numberLineRead',
      choices: fractionChoices(random, fraction),
      correctAnswer: fractionKey(fraction),
    };
  }

  if (kind === 'compare') {
    const sameDenominator = random() < 0.65;
    const right = sameDenominator
      ? { numerator: randomInt(random, 1, fraction.denominator - 1), denominator: fraction.denominator }
      : makeFraction(random, Math.max(1, difficulty));
    return {
      ...base,
      promptKey: 'fractionsPart1.prompts.compare',
      compareWith: right,
      choices: ['<', '>', '='].map((value) => ({ id: value, value })),
      correctAnswer: compareFractions(fraction, right),
    };
  }

  if (activityId === 'fraction-of-collection' && index % 2 === 0) {
    return {
      ...base,
      promptKey: 'fractionsPart1.prompts.collectionBuild',
      collectionTotal: fraction.denominator,
      collectionSelected: 0,
      correctAnswer: String(fraction.numerator),
    };
  }

  const total = pickRandom(random, [4, 6, 8, 10, 12]);
  const selected = randomInt(random, 1, total - 1);
  const collection = collectionFraction(selected, total);
  return {
    ...base,
    fraction: collection,
    promptKey: 'fractionsPart1.prompts.collection',
    collectionTotal: total,
    collectionSelected: selected,
    choices: fractionChoices(random, collection),
    correctAnswer: fractionKey(collection),
  };
}

export function generateFractionActivity(
  activityId: FractionActivityId,
  seed: number,
  count = activityId === 'fractions-challenge' ? FRACTIONS_CHALLENGE_SESSION_SIZE : FRACTIONS_PART1_SESSION_SIZE,
): FractionChallenge[] {
  const random = createSeededRandom(seed);
  const kinds = ACTIVITY_KINDS[activityId];
  return Array.from({ length: count }, (_, index) => buildChallenge(activityId, kinds[index % kinds.length], index, random));
}

export function isFractionChallengeCorrect(challenge: FractionChallenge, answer: string): boolean {
  return answer === challenge.correctAnswer;
}
