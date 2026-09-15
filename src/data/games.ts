import type { Game } from '../types';

export const coordinateSystemGames: Game[] = [
  {
    id: 'coordinateVocabulary',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-vocabulary',
    nameKey: 'vocabulary.gameName',
    descriptionKey: 'vocabulary.gameDescription',
    icon: '📖',
  },
  {
    id: 'meetTheAxes',
    enabled: true,
    path: '/grade/7/coordinate-system/meet-the-axes',
    nameKey: 'exercises.meetTheAxes.name',
    descriptionKey: 'exercises.meetTheAxes.description',
    icon: '🧭',
  },
  {
    id: 'hitTheTarget',
    enabled: true,
    path: '/grade/7/coordinate-system/hit-the-target',
    nameKey: 'games.hitTheTarget.name',
    descriptionKey: 'games.hitTheTarget.description',
    icon: '🎯',
  },
  {
    id: 'launchTheSpaceship',
    enabled: true,
    path: '/grade/7/coordinate-system/launch-the-spaceship',
    nameKey: 'games.launchTheSpaceship.name',
    descriptionKey: 'games.launchTheSpaceship.description',
    icon: '🚀',
  },
  {
    id: 'quadrantChallenge',
    enabled: true,
    path: '/grade/7/coordinate-system/quadrant-challenge',
    nameKey: 'quadrantChallenge.gameName',
    descriptionKey: 'quadrantChallenge.gameDescription',
    icon: '🧩',
  },
  {
    id: 'coordinateDetective',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-detective',
    nameKey: 'coordinateDetective.gameName',
    descriptionKey: 'coordinateDetective.gameDescription',
    icon: '🔍',
  },
  {
    id: 'findThePoint',
    enabled: true,
    path: '/grade/7/coordinate-system/find-the-point',
    nameKey: 'games.findThePoint.name',
    descriptionKey: 'games.findThePoint.description',
    icon: '📍',
  },
  {
    id: 'distancesSegments',
    enabled: true,
    path: '/grade/7/coordinate-system/distances-segments',
    nameKey: 'distancesSegments.gameName',
    descriptionKey: 'distancesSegments.gameDescription',
    icon: '📏',
  },
  {
    id: 'shapesOnPlane',
    enabled: true,
    path: '/grade/7/coordinate-system/shapes-on-plane',
    nameKey: 'shapesOnPlane.gameName',
    descriptionKey: 'shapesOnPlane.gameDescription',
    icon: '📐',
  },
  {
    id: 'coordinateMission',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-mission',
    nameKey: 'coordinateMission.gameName',
    descriptionKey: 'coordinateMission.gameDescription',
    icon: '🚩',
  },
  {
    id: 'drawByCoordinates',
    enabled: true,
    path: '/grade/7/coordinate-system/draw-by-coordinates',
    nameKey: 'games.drawByCoordinates.name',
    descriptionKey: 'games.drawByCoordinates.description',
    icon: '🎨',
  },
  {
    id: 'coordinateScale',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-scale',
    nameKey: 'coordinateScale.gameName',
    descriptionKey: 'coordinateScale.gameDescription',
    icon: '📊',
  },
];

export const divisionWithRemainderGames: Game[] = [
  {
    id: 'cargoStation',
    enabled: true,
    path: '/grade/4/division-with-remainder/cargo-station',
    nameKey: 'cargoStation.gameName',
    descriptionKey: 'cargoStation.gameDescription',
    icon: '📦',
  },
];

export const simpleFractionsGames: Game[] = [
  {
    id: 'fractionFactory',
    enabled: true,
    path: '/grade/4/simple-fractions/fraction-factory',
    nameKey: 'fractionFactory.gameName',
    descriptionKey: 'fractionFactory.gameDescription',
    icon: '🍕',
  },
];

const FRACTIONS_PART1_PATH = '/grade/4/fractions-part-1';

export const fractionsPart1Games: Game[] = [
  ['build-a-fraction', '🟠'],
  ['numerator-denominator', '🔢'],
  ['find-the-fraction', '🔎'],
  ['build-the-whole', '🧩'],
  ['same-fraction', '🎭'],
  ['fraction-number-line', '📍'],
  ['which-is-greater', '⚖️'],
  ['fraction-of-collection', '⭐'],
  ['fraction-pizzeria', '🍕'],
  ['fractions-challenge', '🏆'],
].map(([id, icon]) => ({
  id,
  enabled: true,
  path: `${FRACTIONS_PART1_PATH}/${id}`,
  nameKey: `fractionsPart1.activities.${id}.name`,
  descriptionKey: `fractionsPart1.activities.${id}.description`,
  icon,
}));

export const multiplicationGames: Game[] = [
  {
    id: 'monkeyBalloonShooter',
    enabled: true,
    path: '/grade/4/multiplication/monkey-balloon-shooter',
    nameKey: 'monkeyBalloonShooter.gameName',
    descriptionKey: 'monkeyBalloonShooter.gameDescription',
    icon: '🐵',
  },
  {
    id: 'blockBuilders',
    enabled: true,
    path: '/grade/4/multiplication/block-builders',
    nameKey: 'blockBuilders.gameName',
    descriptionKey: 'blockBuilders.gameDescription',
    icon: '🧱',
  },
];
