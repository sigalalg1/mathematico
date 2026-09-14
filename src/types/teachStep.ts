import type { AxisHighlight } from './quiz';
import type { VocabularyTermId } from '../data/vocabulary/terms';

export interface TeachVisual {
  highlight?: AxisHighlight;
  point?: { x: number; y: number };
  highlightOrigin?: boolean;
  quadrant?: 1 | 2 | 3 | 4;
  pair?: [number, number];
  /** Which part of the pair to emphasize, for xCoordinate/yCoordinate teach cards. */
  emphasize?: 'x' | 'y';
}

export interface TeachStep {
  id: VocabularyTermId;
  termKey: string;
  definitionKey: string;
  visual: TeachVisual;
}
