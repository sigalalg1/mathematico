import type { FractionShapeKind } from './fractionFactory';

export interface FractionValue {
  numerator: number;
  denominator: number;
}

export type FractionActivityId =
  | 'build-a-fraction'
  | 'numerator-denominator'
  | 'find-the-fraction'
  | 'build-the-whole'
  | 'same-fraction'
  | 'fraction-number-line'
  | 'which-is-greater'
  | 'fraction-of-collection'
  | 'fraction-pizzeria'
  | 'fractions-challenge';

export type FractionChallengeKind =
  | 'build'
  | 'readModel'
  | 'terms'
  | 'findModel'
  | 'whole'
  | 'equivalent'
  | 'numberLinePlace'
  | 'numberLineRead'
  | 'compare'
  | 'collection'
  | 'pizzaBuild'
  | 'pizzaRead';

export interface FractionChoice {
  id: string;
  value: string;
  fraction?: FractionValue;
  shape?: FractionShapeKind;
}

export interface FractionChallenge {
  id: string;
  activityId: FractionActivityId;
  kind: FractionChallengeKind;
  fraction: FractionValue;
  shape: FractionShapeKind;
  promptKey: string;
  selected: number[];
  choices: FractionChoice[];
  compareWith?: FractionValue;
  collectionTotal?: number;
  collectionSelected?: number;
  termTarget?: 'numerator' | 'denominator' | 'selected' | 'total';
  correctAnswer: string;
}
