import type { AxisHighlight } from './quiz';

export type GridTargetId = 'xAxis' | 'yAxis' | 'origin';

export interface VocabularyChoice {
  id: string;
  /** Translation key for a text label. */
  labelKey?: string;
  /** Raw, language-neutral label (e.g. a number) rendered LTR-safe. */
  labelText?: string;
}

interface BaseVocabularyQuestion {
  id: string;
  promptKey: string;
  explanationKey: string;
  correctId: string;
  /** A term shown prominently above the prompt (e.g. for "term → definition" questions). */
  subjectKey?: string;
  /** An ordered pair to display above the prompt, rendered LTR-safe. */
  pair?: [number, number];
}

export interface ChoiceVocabularyQuestion extends BaseVocabularyQuestion {
  kind: 'choice';
  options: VocabularyChoice[];
  /** Optional grid reinforcement to show when the answer is wrong. */
  highlight?: AxisHighlight;
}

export interface GridTargetVocabularyQuestion extends BaseVocabularyQuestion {
  kind: 'gridTarget';
  targets: GridTargetId[];
}

export type VocabularyQuestion = ChoiceVocabularyQuestion | GridTargetVocabularyQuestion;
