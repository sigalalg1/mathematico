/**
 * Pedagogical order: each concept only depends on concepts already listed
 * before it. The Learn phase walks this list in order; the Practice phase
 * (which only starts once everything has been introduced) may shuffle freely.
 */
export const vocabularyTermIds = [
  'coordinateSystem',
  'horizontal',
  'vertical',
  'xAxis',
  'yAxis',
  'origin',
  'point',
  'quadrant',
  'pointCoordinates',
  'orderedPair',
  'xCoordinate',
  'yCoordinate',
] as const;

export type VocabularyTermId = (typeof vocabularyTermIds)[number];
