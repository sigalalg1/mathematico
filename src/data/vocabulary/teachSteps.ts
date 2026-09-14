import type { TeachStep } from '../../types/teachStep';

const SAMPLE_POINT: [number, number] = [3, -2];

export const teachSteps: TeachStep[] = [
  {
    id: 'coordinateSystem',
    termKey: 'vocabulary.terms.coordinateSystem.term',
    definitionKey: 'vocabulary.terms.coordinateSystem.definition',
    visual: {},
  },
  {
    id: 'horizontal',
    termKey: 'vocabulary.terms.horizontal.term',
    definitionKey: 'vocabulary.terms.horizontal.definition',
    visual: { highlight: { axis: 'x', region: 'all' } },
  },
  {
    id: 'vertical',
    termKey: 'vocabulary.terms.vertical.term',
    definitionKey: 'vocabulary.terms.vertical.definition',
    visual: { highlight: { axis: 'y', region: 'all' } },
  },
  {
    id: 'xAxis',
    termKey: 'vocabulary.terms.xAxis.term',
    definitionKey: 'vocabulary.terms.xAxis.definition',
    visual: { highlight: { axis: 'x', region: 'all' } },
  },
  {
    id: 'yAxis',
    termKey: 'vocabulary.terms.yAxis.term',
    definitionKey: 'vocabulary.terms.yAxis.definition',
    visual: { highlight: { axis: 'y', region: 'all' } },
  },
  {
    id: 'origin',
    termKey: 'vocabulary.terms.origin.term',
    definitionKey: 'vocabulary.terms.origin.definition',
    visual: { highlightOrigin: true },
  },
  {
    id: 'point',
    termKey: 'vocabulary.terms.point.term',
    definitionKey: 'vocabulary.terms.point.definition',
    visual: { point: { x: SAMPLE_POINT[0], y: SAMPLE_POINT[1] } },
  },
  {
    id: 'quadrant',
    termKey: 'vocabulary.terms.quadrant.term',
    definitionKey: 'vocabulary.terms.quadrant.definition',
    visual: { quadrant: 1 },
  },
  {
    id: 'pointCoordinates',
    termKey: 'vocabulary.terms.pointCoordinates.term',
    definitionKey: 'vocabulary.terms.pointCoordinates.definition',
    visual: { point: { x: SAMPLE_POINT[0], y: SAMPLE_POINT[1] }, pair: SAMPLE_POINT },
  },
  {
    id: 'orderedPair',
    termKey: 'vocabulary.terms.orderedPair.term',
    definitionKey: 'vocabulary.terms.orderedPair.definition',
    visual: { point: { x: SAMPLE_POINT[0], y: SAMPLE_POINT[1] }, pair: SAMPLE_POINT },
  },
  {
    id: 'xCoordinate',
    termKey: 'vocabulary.terms.xCoordinate.term',
    definitionKey: 'vocabulary.terms.xCoordinate.definition',
    visual: {
      point: { x: SAMPLE_POINT[0], y: SAMPLE_POINT[1] },
      pair: SAMPLE_POINT,
      emphasize: 'x',
    },
  },
  {
    id: 'yCoordinate',
    termKey: 'vocabulary.terms.yCoordinate.term',
    definitionKey: 'vocabulary.terms.yCoordinate.definition',
    visual: {
      point: { x: SAMPLE_POINT[0], y: SAMPLE_POINT[1] },
      pair: SAMPLE_POINT,
      emphasize: 'y',
    },
  },
];
