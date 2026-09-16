import type { Game } from '../types';

const GEOMETRY_PATH = '/grade/3/geometry-angles-triangles';

export const geometryAnglesTrianglesGames: Game[] = [
  ['meet-the-angle', '∠'],
  ['angle-types', '°'],
  ['angle-hunter', '◎'],
  ['build-an-angle', '∟'],
  ['find-the-angles', '◔'],
  ['meet-the-triangle', '△'],
  ['triangles-by-sides', '▲'],
  ['triangles-by-angles', '▽'],
  ['triangle-lab', '▼'],
  ['who-am-i', '?'],
  ['rotation', '↻'],
  ['geometry-challenge', '◆'],
].map(([id, icon]) => ({
  id,
  enabled: true,
  path: `${GEOMETRY_PATH}/${id}`,
  nameKey: `geometry.activities.${id}.name`,
  descriptionKey: `geometry.activities.${id}.description`,
  icon,
}));

export const coordinateSystemGames: Game[] = [
  {
    id: 'coordinateVocabulary',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-vocabulary',
    nameKey: 'vocabulary.gameName',
    descriptionKey: 'vocabulary.gameDescription',
    icon: 'xy',
  },
  {
    id: 'meetTheAxes',
    enabled: true,
    path: '/grade/7/coordinate-system/meet-the-axes',
    nameKey: 'exercises.meetTheAxes.name',
    descriptionKey: 'exercises.meetTheAxes.description',
    icon: '⊥',
  },
  {
    id: 'hitTheTarget',
    enabled: true,
    path: '/grade/7/coordinate-system/hit-the-target',
    nameKey: 'games.hitTheTarget.name',
    descriptionKey: 'games.hitTheTarget.description',
    icon: '◎',
  },
  {
    id: 'launchTheSpaceship',
    enabled: true,
    path: '/grade/7/coordinate-system/launch-the-spaceship',
    nameKey: 'games.launchTheSpaceship.name',
    descriptionKey: 'games.launchTheSpaceship.description',
    icon: '↗',
  },
  {
    id: 'quadrantChallenge',
    enabled: true,
    path: '/grade/7/coordinate-system/quadrant-challenge',
    nameKey: 'quadrantChallenge.gameName',
    descriptionKey: 'quadrantChallenge.gameDescription',
    icon: '⊞',
  },
  {
    id: 'coordinateDetective',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-detective',
    nameKey: 'coordinateDetective.gameName',
    descriptionKey: 'coordinateDetective.gameDescription',
    icon: '≠',
  },
  {
    id: 'findThePoint',
    enabled: true,
    path: '/grade/7/coordinate-system/find-the-point',
    nameKey: 'games.findThePoint.name',
    descriptionKey: 'games.findThePoint.description',
    icon: '•',
  },
  {
    id: 'distancesSegments',
    enabled: true,
    path: '/grade/7/coordinate-system/distances-segments',
    nameKey: 'distancesSegments.gameName',
    descriptionKey: 'distancesSegments.gameDescription',
    icon: '↔',
  },
  {
    id: 'shapesOnPlane',
    enabled: true,
    path: '/grade/7/coordinate-system/shapes-on-plane',
    nameKey: 'shapesOnPlane.gameName',
    descriptionKey: 'shapesOnPlane.gameDescription',
    icon: '△',
  },
  {
    id: 'coordinateMission',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-mission',
    nameKey: 'coordinateMission.gameName',
    descriptionKey: 'coordinateMission.gameDescription',
    icon: '◇',
  },
  {
    id: 'drawByCoordinates',
    enabled: true,
    path: '/grade/7/coordinate-system/draw-by-coordinates',
    nameKey: 'games.drawByCoordinates.name',
    descriptionKey: 'games.drawByCoordinates.description',
    icon: '□',
  },
  {
    id: 'coordinateScale',
    enabled: true,
    path: '/grade/7/coordinate-system/coordinate-scale',
    nameKey: 'coordinateScale.gameName',
    descriptionKey: 'coordinateScale.gameDescription',
    icon: '↕',
  },
];

export const divisionWithRemainderGames: Game[] = [];

/** Grade 7 — Signed Numbers, in teaching order: the line, then order, then distance, then the four operations. */
export const signedNumbersGames: Game[] = [
  {
    id: 'numberLinePlace',
    enabled: true,
    path: '/grade/7/signed-numbers/find-the-spot',
    nameKey: 'numberLinePlace.gameName',
    descriptionKey: 'numberLinePlace.gameDescription',
    icon: '±',
  },
  {
    id: 'compareSigned',
    enabled: true,
    path: '/grade/7/signed-numbers/which-is-greater',
    nameKey: 'compareSigned.gameName',
    descriptionKey: 'compareSigned.gameDescription',
    icon: '<',
  },
  {
    id: 'absoluteValue',
    enabled: true,
    path: '/grade/7/signed-numbers/distance-from-zero',
    nameKey: 'absoluteValue.gameName',
    descriptionKey: 'absoluteValue.gameDescription',
    icon: '|x|',
  },
  {
    id: 'signedAddSub',
    enabled: true,
    path: '/grade/7/signed-numbers/steps-on-the-line',
    nameKey: 'signedAddSub.gameName',
    descriptionKey: 'signedAddSub.gameDescription',
    icon: '+−',
  },
  {
    id: 'signRules',
    enabled: true,
    path: '/grade/7/signed-numbers/the-sign-rule',
    nameKey: 'signRules.gameName',
    descriptionKey: 'signRules.gameDescription',
    icon: '×',
  },
];

export const simpleFractionsGames: Game[] = [];

const FRACTIONS_PART1_PATH = '/grade/4/fractions-part-1';

/**
 * "Build the Whole" stays in the registry so stored practice history can still
 * resolve its name and route, but it is disabled: its interaction amounts to
 * selecting every remaining piece, with no decision for the child to make, so
 * it is no longer listed as an activity.
 */
const DISABLED_FRACTION_ACTIVITIES = new Set(['build-the-whole']);

export const fractionsPart1Games: Game[] = [
  ['build-a-fraction', '½'],
  ['numerator-denominator', '¼'],
  ['find-the-fraction', '⅓'],
  ['build-the-whole', '1'],
  ['same-fraction', '='],
  ['fraction-number-line', '↔'],
  ['which-is-greater', '<'],
  ['fraction-of-collection', '⅕'],
  ['fraction-pizzeria', '⅛'],
  ['fractions-challenge', '⅚'],
].map(([id, icon]) => ({
  id,
  enabled: !DISABLED_FRACTION_ACTIVITIES.has(id),
  path: `${FRACTIONS_PART1_PATH}/${id}`,
  nameKey: `fractionsPart1.activities.${id}.name`,
  descriptionKey: `fractionsPart1.activities.${id}.description`,
  icon,
}));

export const multiplicationGames: Game[] = [
  {
    id: 'multiplicationTables',
    enabled: true,
    path: '/grade/4/multiplication/multiplication-tables',
    nameKey: 'multiplicationTables.gameName',
    descriptionKey: 'multiplicationTables.gameDescription',
    icon: '×',
  },
  {
    id: 'monkeyBalloonShooter',
    enabled: true,
    path: '/grade/4/multiplication/monkey-balloon-shooter',
    nameKey: 'monkeyBalloonShooter.gameName',
    descriptionKey: 'monkeyBalloonShooter.gameDescription',
    icon: '×',
  },
  {
    id: 'basketballMonkey',
    enabled: true,
    path: '/grade/4/multiplication/basketball-monkey',
    nameKey: 'basketballMonkey.gameName',
    descriptionKey: 'basketballMonkey.gameDescription',
    icon: '●',
  },
];

/**
 * Every activity in one list, so shared UI (activity history, "continue
 * training") can resolve a stored gameId back to its name and route without
 * each screen re-assembling the same set.
 */
export const allGames: Game[] = [
  ...geometryAnglesTrianglesGames,
  ...coordinateSystemGames,
  ...signedNumbersGames,
  ...divisionWithRemainderGames,
  ...simpleFractionsGames,
  ...fractionsPart1Games,
  ...multiplicationGames,
];

export function findGame(gameId: string): Game | undefined {
  return allGames.find((game) => game.id === gameId);
}
