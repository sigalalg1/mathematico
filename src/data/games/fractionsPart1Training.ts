import type {
  FractionActivityId,
  FractionChallenge,
  FractionChallengeKind,
  FractionChoice,
  FractionValue,
} from '../../types/fractionsPart1';
import type { FractionShapeKind } from '../../types/fractionShape';
import type { TrainingActivityDefinition, TrainingCapabilities, TrainingQuestion } from '../../types/training';
import { createSeededRandom, pickRandom, randomInt } from '../../utils/seededRandom';
import { shuffle } from '../../utils/shuffle';
import {
  asFractionDifficulty,
  COLLECTION_TOTALS,
  comparisonPair,
  drawFraction,
  drawSeries,
  equivalencePair,
  fractionDistractors,
  fractionSign,
  fractionValueKey,
  MODEL_DENOMINATORS,
  NUMBER_LINE_DENOMINATORS,
  PIZZA_DENOMINATORS,
  type FractionDifficultyId,
} from './fractionDifficulty';

/**
 * The fraction activities that run on the shared training system: a level, a
 * session length, and then the same visual questions the unit always had, drawn
 * from a level-appropriate set of fractions.
 *
 * `fractions-challenge` is deliberately absent. It is the unit's closing review
 * and asks exactly one question per concept taught before it, so both a shorter
 * round and a single difficulty band would take away the thing it is for.
 * `build-the-whole` is absent because it is not a listed activity any more.
 */
export const FRACTION_TRAINING_ACTIVITY_IDS = [
  'build-a-fraction',
  'numerator-denominator',
  'find-the-fraction',
  'same-fraction',
  'fraction-number-line',
  'which-is-greater',
  'fraction-of-collection',
  'fraction-pizzeria',
] as const;

export type FractionTrainingActivityId = (typeof FRACTION_TRAINING_ACTIVITY_IDS)[number];

/**
 * Bump when the fractions a level covers change, so a stored configuration can
 * never be read as if it had been produced under the current rules.
 */
export const FRACTIONS_TRAINING_RULES_VERSION = 1;

/** One correct answer and three distractors, wherever the activity offers choices. */
const CHOICE_COUNT = 4;

const SHAPES: FractionShapeKind[] = ['circle', 'bar', 'grid'];

export function isFractionTrainingActivity(activityId: string): activityId is FractionTrainingActivityId {
  return (FRACTION_TRAINING_ACTIVITY_IDS as readonly string[]).includes(activityId);
}

/** The question types each activity cycles through, unchanged from the unit. */
const ACTIVITY_KINDS: Record<FractionTrainingActivityId, FractionChallengeKind[]> = {
  'build-a-fraction': ['build', 'build', 'readModel'],
  'numerator-denominator': ['terms'],
  'find-the-fraction': ['findModel', 'readModel'],
  'same-fraction': ['equivalent'],
  'fraction-number-line': ['numberLinePlace', 'numberLineRead'],
  'which-is-greater': ['compare'],
  'fraction-of-collection': ['collection'],
  'fraction-pizzeria': ['pizzaBuild', 'pizzaRead'],
};

/** Which denominators a level means for this particular activity's model. */
function denominatorPool(activityId: FractionTrainingActivityId, difficulty: FractionDifficultyId): readonly number[] {
  if (activityId === 'fraction-pizzeria') return PIZZA_DENOMINATORS[difficulty];
  if (activityId === 'fraction-number-line') return NUMBER_LINE_DENOMINATORS[difficulty];
  return MODEL_DENOMINATORS[difficulty];
}

function toChoices(fractions: FractionValue[], shaped: boolean): FractionChoice[] {
  return fractions.map((fraction, index) => ({
    id: fractionValueKey(fraction),
    value: fractionValueKey(fraction),
    fraction,
    ...(shaped ? { shape: SHAPES[index % SHAPES.length] } : {}),
  }));
}

/**
 * The correct fraction is drawn first, and the picture, the answer and every
 * distractor are derived from it. Nothing about a question is generated twice,
 * so a model can never disagree with the answer it is asking for.
 */
function buildChallenge(
  activityId: FractionTrainingActivityId,
  kind: FractionChallengeKind,
  difficulty: FractionDifficultyId,
  index: number,
  random: () => number,
): FractionChallenge {
  const pool = denominatorPool(activityId, difficulty);
  const fraction = drawFraction(random, pool);
  const shape = activityId === 'fraction-pizzeria' ? 'circle' : pickRandom(random, SHAPES);
  const base = {
    id: `${activityId}-${difficulty}-${index}`,
    activityId: activityId as FractionActivityId,
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
      selected: shadedIndices(random, fraction),
      choices: shuffle(
        toChoices([fraction, ...fractionDistractors(random, fraction, difficulty, CHOICE_COUNT - 1, { pool })], false),
        random,
      ),
      correctAnswer: fractionValueKey(fraction),
    };
  }

  if (kind === 'terms') {
    const termTarget = pickRandom(random, ['numerator', 'denominator', 'selected', 'total'] as const);
    const asksNumerator = termTarget === 'numerator' || termTarget === 'selected';
    const answer = asksNumerator ? fraction.numerator : fraction.denominator;
    return {
      ...base,
      promptKey: `fractionsPart1.prompts.terms.${termTarget}`,
      selected: shadedIndices(random, fraction),
      termTarget,
      choices: numericChoices(random, answer, difficulty, { min: 1, max: Math.max(...pool) }),
      correctAnswer: String(answer),
    };
  }

  if (kind === 'findModel') {
    return {
      ...base,
      promptKey: 'fractionsPart1.prompts.findModel',
      choices: shuffle(
        toChoices([fraction, ...fractionDistractors(random, fraction, difficulty, CHOICE_COUNT - 1, { pool })], true),
        random,
      ),
      correctAnswer: fractionValueKey(fraction),
    };
  }

  if (kind === 'equivalent') {
    const { base: target, equivalent } = equivalencePair(random, difficulty);
    // Distractors are built around the equivalent form, so none of them can be
    // a second correct answer — `fractionDistractors` never returns a value
    // equal to what it was given, and equal values are equal to the target too.
    const distractors = fractionDistractors(random, equivalent, difficulty, CHOICE_COUNT - 1, { pool });
    return {
      ...base,
      fraction: target,
      promptKey: 'fractionsPart1.prompts.equivalent',
      choices: shuffle(toChoices([equivalent, ...distractors], true), random),
      correctAnswer: fractionValueKey(equivalent),
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
    // The line shows the mark and nothing else; the value lives only here and
    // in the answer choices, never next to the point.
    return {
      ...base,
      promptKey: 'fractionsPart1.prompts.numberLineRead',
      choices: shuffle(
        toChoices([fraction, ...fractionDistractors(random, fraction, difficulty, CHOICE_COUNT - 1, { pool })], false),
        random,
      ),
      correctAnswer: fractionValueKey(fraction),
    };
  }

  if (kind === 'compare') {
    const [left, right] = comparisonPair(random, difficulty);
    return {
      ...base,
      fraction: left,
      compareWith: right,
      promptKey: 'fractionsPart1.prompts.compare',
      choices: ['<', '>', '='].map((value) => ({ id: value, value })),
      correctAnswer: fractionSign(left, right),
    };
  }

  // The collection activity alternates between colouring a share of the group
  // and reading one off it.
  const total = pickRandom(random, COLLECTION_TOTALS[difficulty]);
  const selected = randomInt(random, 1, total - 1);
  const collection: FractionValue = { numerator: selected, denominator: total };

  if (index % 2 === 0) {
    return {
      ...base,
      fraction: collection,
      promptKey: 'fractionsPart1.prompts.collectionBuild',
      collectionTotal: total,
      collectionSelected: 0,
      correctAnswer: String(selected),
    };
  }

  return {
    ...base,
    fraction: collection,
    promptKey: 'fractionsPart1.prompts.collection',
    collectionTotal: total,
    collectionSelected: selected,
    choices: shuffle(
      toChoices(
        [
          collection,
          ...fractionDistractors(random, collection, difficulty, CHOICE_COUNT - 1, {
            pool: COLLECTION_TOTALS[difficulty],
            maxDenominator: Math.max(...COLLECTION_TOTALS[difficulty]),
          }),
        ],
        false,
      ),
      random,
    ),
    correctAnswer: fractionValueKey(collection),
  };
}

/** Which parts of the whole are shaded — exactly as many as the numerator says. */
function shadedIndices(random: () => number, fraction: FractionValue): number[] {
  return shuffle(
    Array.from({ length: fraction.denominator }, (_, index) => index),
    random,
  )
    .slice(0, fraction.numerator)
    .sort((a, b) => a - b);
}

function numericChoices(
  random: () => number,
  answer: number,
  difficulty: FractionDifficultyId,
  bounds: { min: number; max: number },
): FractionChoice[] {
  const distractors = numberDistractorsFor(random, answer, difficulty, bounds);
  return shuffle([answer, ...distractors], random).map((value) => ({ id: String(value), value: String(value) }));
}

/**
 * Basic keeps the wrong numbers two apart, so a child who counted correctly is
 * never talked out of their answer; the harder levels sit right next to it,
 * which is exactly the off-by-one a miscount produces.
 */
function numberDistractorsFor(
  random: () => number,
  answer: number,
  difficulty: FractionDifficultyId,
  bounds: { min: number; max: number },
): number[] {
  const step = difficulty === 'basic' ? 2 : 1;
  const values: number[] = [];

  for (let offset = step; values.length < CHOICE_COUNT - 1 && offset <= bounds.max - bounds.min + step; offset += step) {
    for (const candidate of [answer - offset, answer + offset]) {
      if (values.length >= CHOICE_COUNT - 1) break;
      if (candidate < bounds.min || candidate > bounds.max || candidate === answer || values.includes(candidate)) continue;
      values.push(candidate);
    }
  }

  return shuffle(values, random);
}

/** What the child can actually answer with — used by the engine, not the scene. */
function optionsFor(challenge: FractionChallenge): string[] {
  if (challenge.choices.length > 0) return challenge.choices.map((choice) => choice.value);
  // A "colour this much" question is answered with how many parts were taken.
  const total = challenge.collectionTotal ?? challenge.fraction.denominator;
  return Array.from({ length: total }, (_, index) => String(index + 1));
}

export interface FractionTrainingInput {
  difficultyId: string | null;
  count: number;
  /** Fixed seed for deterministic tests; a fresh round otherwise. */
  seed?: number;
}

export function buildFractionTrainingQuestions(
  activityId: FractionTrainingActivityId,
  { difficultyId, count, seed }: FractionTrainingInput,
): TrainingQuestion<FractionChallenge>[] {
  const difficulty = asFractionDifficulty(difficultyId);
  const random = createSeededRandom(seed ?? Math.floor(Math.random() * 0x7fffffff));
  const kinds = ACTIVITY_KINDS[activityId];

  const challenges = drawSeries(
    count,
    (index) => buildChallenge(activityId, kinds[index % kinds.length], difficulty, index, random),
    // Two questions in a row about the very same fraction feel like a glitch,
    // so the drawer re-rolls them; a comparison is identified by both sides.
    (challenge) =>
      `${challenge.kind}:${fractionValueKey(challenge.fraction)}${
        challenge.compareWith ? `:${fractionValueKey(challenge.compareWith)}` : ''
      }`,
  );

  return challenges.map((challenge, index) => ({
    id: `${challenge.id}-${index}`,
    prompt: challenge.promptKey,
    answer: challenge.correctAnswer,
    options: optionsFor(challenge),
    payload: challenge,
  }));
}

/**
 * Fractions offer a level and a session length — and no personal challenge.
 *
 * Reading a model, placing a point or choosing a comparison sign is thinking
 * work, not recall, and timing it would teach a child to guess rather than to
 * look. `supportsChallenge: false` is what removes the mode switch, the pace
 * tile and every speed record from these activities; it is not a UI decision
 * taken screen by screen.
 */
export const FRACTION_TRAINING_CAPABILITIES: TrainingCapabilities = {
  questionCounts: [5, 10, 20],
  defaultQuestionCount: 10,
  difficulties: [
    { id: 'basic', labelKey: 'training.difficulty.basic', descriptionKey: 'fractionsPart1.difficulty.basic' },
    {
      id: 'intermediate',
      labelKey: 'training.difficulty.intermediate',
      descriptionKey: 'fractionsPart1.difficulty.intermediate',
    },
    { id: 'hard', labelKey: 'training.difficulty.hard', descriptionKey: 'fractionsPart1.difficulty.hard' },
  ],
  defaultDifficultyId: 'basic',
  supportsChallenge: false,
  challengeQuestionCounts: [],
  // Inert while `supportsChallenge` is false: no pace is ever recorded or shown.
  paceRecordMinAccuracy: 1,
  rulesVersion: FRACTIONS_TRAINING_RULES_VERSION,
};

export const fractionsPart1TrainingActivities: TrainingActivityDefinition<FractionChallenge>[] =
  FRACTION_TRAINING_ACTIVITY_IDS.map((activityId) => ({
    id: activityId,
    i18nPrefix: `fractionsPart1.activities.${activityId}`,
    capabilities: FRACTION_TRAINING_CAPABILITIES,
    generateQuestions: (input) => buildFractionTrainingQuestions(activityId, input),
  }));

export function getFractionTrainingActivity(
  activityId: string,
): TrainingActivityDefinition<FractionChallenge> | undefined {
  return fractionsPart1TrainingActivities.find((activity) => activity.id === activityId);
}
