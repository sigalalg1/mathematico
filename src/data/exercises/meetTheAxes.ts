import type { VocabularyQuestion } from '../../types/vocabularyQuiz';

export const meetTheAxesQuestions: VocabularyQuestion[] = [
  {
    id: 'horizontal-axis',
    kind: 'gridTarget',
    promptKey: 'exercises.meetTheAxes.questions.horizontalAxis.prompt',
    explanationKey: 'exercises.meetTheAxes.questions.horizontalAxis.explanation',
    correctId: 'xAxis',
    targets: ['xAxis', 'yAxis'],
  },
  {
    id: 'vertical-axis',
    kind: 'gridTarget',
    promptKey: 'exercises.meetTheAxes.questions.verticalAxis.prompt',
    explanationKey: 'exercises.meetTheAxes.questions.verticalAxis.explanation',
    correctId: 'yAxis',
    targets: ['xAxis', 'yAxis'],
  },
  {
    id: 'x-increase',
    kind: 'choice',
    promptKey: 'exercises.meetTheAxes.questions.xIncrease.prompt',
    explanationKey: 'exercises.meetTheAxes.questions.xIncrease.explanation',
    correctId: 'right',
    highlight: { axis: 'x', region: 'positive' },
    options: [
      { id: 'left', labelKey: 'exercises.meetTheAxes.options.left' },
      { id: 'right', labelKey: 'exercises.meetTheAxes.options.right' },
    ],
  },
  {
    id: 'y-increase',
    kind: 'choice',
    promptKey: 'exercises.meetTheAxes.questions.yIncrease.prompt',
    explanationKey: 'exercises.meetTheAxes.questions.yIncrease.explanation',
    correctId: 'up',
    highlight: { axis: 'y', region: 'positive' },
    options: [
      { id: 'up', labelKey: 'exercises.meetTheAxes.options.up' },
      { id: 'down', labelKey: 'exercises.meetTheAxes.options.down' },
    ],
  },
  {
    id: 'x-negative',
    kind: 'choice',
    promptKey: 'exercises.meetTheAxes.questions.xNegative.prompt',
    explanationKey: 'exercises.meetTheAxes.questions.xNegative.explanation',
    correctId: 'left',
    highlight: { axis: 'x', region: 'negative' },
    options: [
      { id: 'left', labelKey: 'exercises.meetTheAxes.options.left' },
      { id: 'right', labelKey: 'exercises.meetTheAxes.options.right' },
    ],
  },
  {
    id: 'y-negative',
    kind: 'choice',
    promptKey: 'exercises.meetTheAxes.questions.yNegative.prompt',
    explanationKey: 'exercises.meetTheAxes.questions.yNegative.explanation',
    correctId: 'down',
    highlight: { axis: 'y', region: 'negative' },
    options: [
      { id: 'up', labelKey: 'exercises.meetTheAxes.options.up' },
      { id: 'down', labelKey: 'exercises.meetTheAxes.options.down' },
    ],
  },
];
