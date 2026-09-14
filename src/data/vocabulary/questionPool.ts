import type { ChoiceVocabularyQuestion, GridTargetVocabularyQuestion, VocabularyQuestion } from '../../types/vocabularyQuiz';
import { shuffle } from '../../utils/shuffle';
import { vocabularyTermIds, type VocabularyTermId } from './terms';

function pickDistractors(termId: VocabularyTermId, count: number): VocabularyTermId[] {
  const startIndex = vocabularyTermIds.indexOf(termId);
  const distractors: VocabularyTermId[] = [];
  for (let offset = 1; distractors.length < count; offset++) {
    const candidate = vocabularyTermIds[(startIndex + offset) % vocabularyTermIds.length];
    if (candidate !== termId) distractors.push(candidate);
  }
  return distractors;
}

const riddleQuestions: ChoiceVocabularyQuestion[] = vocabularyTermIds.map((termId) => ({
  id: `riddle-${termId}`,
  kind: 'choice',
  promptKey: `vocabulary.terms.${termId}.riddle`,
  explanationKey: `vocabulary.terms.${termId}.definition`,
  correctId: termId,
  options: [termId, ...pickDistractors(termId, 3)].map((id) => ({
    id,
    labelKey: `vocabulary.terms.${id}.term`,
  })),
}));

const definitionQuestions: ChoiceVocabularyQuestion[] = vocabularyTermIds.map((termId) => ({
  id: `definition-${termId}`,
  kind: 'choice',
  promptKey: `vocabulary.terms.${termId}.recallPrompt`,
  explanationKey: `vocabulary.terms.${termId}.definition`,
  correctId: termId,
  options: [termId, ...pickDistractors(termId, 3)].map((id) => ({
    id,
    labelKey: `vocabulary.terms.${id}.definition`,
  })),
}));

const gridTargetQuestions: GridTargetVocabularyQuestion[] = [
  {
    id: 'grid-click-xAxis',
    kind: 'gridTarget',
    promptKey: 'vocabulary.prompts.clickXAxis',
    explanationKey: 'vocabulary.explanations.xAxis',
    correctId: 'xAxis',
    targets: ['xAxis', 'yAxis', 'origin'],
  },
  {
    id: 'grid-click-yAxis',
    kind: 'gridTarget',
    promptKey: 'vocabulary.prompts.clickYAxis',
    explanationKey: 'vocabulary.explanations.yAxis',
    correctId: 'yAxis',
    targets: ['xAxis', 'yAxis', 'origin'],
  },
  {
    id: 'grid-click-origin',
    kind: 'gridTarget',
    promptKey: 'vocabulary.prompts.clickOrigin',
    explanationKey: 'vocabulary.explanations.origin',
    correctId: 'origin',
    targets: ['xAxis', 'yAxis', 'origin'],
  },
];

const axisChoiceQuestions: ChoiceVocabularyQuestion[] = [
  {
    id: 'axis-horizontal',
    kind: 'choice',
    promptKey: 'vocabulary.prompts.whichAxisHorizontal',
    explanationKey: 'vocabulary.explanations.xAxis',
    correctId: 'xAxis',
    highlight: { axis: 'x', region: 'all' },
    options: [
      { id: 'xAxis', labelKey: 'vocabulary.letters.x' },
      { id: 'yAxis', labelKey: 'vocabulary.letters.y' },
    ],
  },
  {
    id: 'axis-vertical',
    kind: 'choice',
    promptKey: 'vocabulary.prompts.whichAxisVertical',
    explanationKey: 'vocabulary.explanations.yAxis',
    correctId: 'yAxis',
    highlight: { axis: 'y', region: 'all' },
    options: [
      { id: 'xAxis', labelKey: 'vocabulary.letters.x' },
      { id: 'yAxis', labelKey: 'vocabulary.letters.y' },
    ],
  },
];

const coordinatePairs: [number, number][] = [
  [3, -2],
  [-4, 5],
  [2, 4],
  [-3, -5],
  [1, -4],
];

function buildPairQuestions(pair: [number, number], index: number): ChoiceVocabularyQuestion[] {
  const [x, y] = pair;
  const toOptions = (correct: number, decoy: number) =>
    [correct, decoy].map((value) => ({ id: `${value}`, labelText: `${value}` }));

  return [
    {
      id: `pair-${index}-x`,
      kind: 'choice',
      promptKey: 'vocabulary.prompts.xCoordinateOfPoint',
      explanationKey: 'vocabulary.explanations.xThenY',
      correctId: `${x}`,
      pair,
      options: toOptions(x, y),
    },
    {
      id: `pair-${index}-y`,
      kind: 'choice',
      promptKey: 'vocabulary.prompts.yCoordinateOfPoint',
      explanationKey: 'vocabulary.explanations.xThenY',
      correctId: `${y}`,
      pair,
      options: toOptions(y, x),
    },
  ];
}

export const vocabularyQuestionPool: VocabularyQuestion[] = [
  ...riddleQuestions,
  ...definitionQuestions,
  ...gridTargetQuestions,
  ...axisChoiceQuestions,
  ...coordinatePairs.flatMap((pair, index) => buildPairQuestions(pair, index)),
];

export const VOCABULARY_PRACTICE_ROUND_SIZE = 8;

export function shuffleVocabularyQuestion(question: VocabularyQuestion): VocabularyQuestion {
  if (question.kind === 'choice') {
    return { ...question, options: shuffle(question.options) };
  }
  return question;
}
