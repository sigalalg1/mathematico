import type { Game } from '../types';
import { ARITHMETIC_SKILL_PRESENTATION } from './games/arithmeticFluencyData';

export const ARITHMETIC_FLUENCY_PATH = '/grade/2/arithmetic-fluency';

/**
 * Grade 2 — arithmetic fluency. Four foundational addition/subtraction skills,
 * each a separate activity so a child can deliberately choose the one they want
 * to get faster at, and each keeping its own personal bests. Built from the
 * skill list itself, so the listing, the routes and the generators cannot drift
 * apart.
 */
export const arithmeticFluencyGames: Game[] = ARITHMETIC_SKILL_PRESENTATION.map(({ skillId, slug, icon }) => ({
  id: skillId,
  enabled: true,
  path: `${ARITHMETIC_FLUENCY_PATH}/${slug}`,
  nameKey: `arithmeticFluency.skills.${skillId}.gameName`,
  descriptionKey: `arithmeticFluency.skills.${skillId}.gameDescription`,
  icon,
}));

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

const GEOMETRY_GRADE7_PATH = '/grade/7/geometry';

/**
 * Grade 7 — Angles. Sourced from the attached textbook excerpt (chapters
 * 20–22): rays/vertex/angle identification, the four angle types, angle
 * notation (three-letter names, the "select all valid names" format, and
 * Greek-letter shorthand), and comparing angle sizes. The construct-an-angle
 * drag lab and the measure-an-angle digital protractor are this build's own
 * additions (the excerpt only gestures at construction, and has no
 * interactive-protractor mechanic at all) — see the final report.
 * `anglesConstruct` and `anglesMeasure` are deliberately last: they ask a
 * child to *build* or *measure* an angle only after they can already
 * identify, classify, name and compare one.
 */
export const geometryGrade7Games: Game[] = [
  {
    id: 'anglesIdentify',
    enabled: true,
    path: `${GEOMETRY_GRADE7_PATH}/rays-and-angles`,
    nameKey: 'anglesGrade7.identify.gameName',
    descriptionKey: 'anglesGrade7.identify.gameDescription',
    icon: '∠',
  },
  {
    id: 'anglesTypes',
    enabled: true,
    path: `${GEOMETRY_GRADE7_PATH}/angle-types`,
    nameKey: 'anglesGrade7.types.gameName',
    descriptionKey: 'anglesGrade7.types.gameDescription',
    icon: '⌐',
  },
  {
    id: 'anglesNotation',
    enabled: true,
    path: `${GEOMETRY_GRADE7_PATH}/angle-notation`,
    nameKey: 'anglesGrade7.notation.gameName',
    descriptionKey: 'anglesGrade7.notation.gameDescription',
    icon: 'α',
  },
  {
    id: 'anglesCompare',
    enabled: true,
    path: `${GEOMETRY_GRADE7_PATH}/compare-angles`,
    nameKey: 'anglesGrade7.compare.gameName',
    descriptionKey: 'anglesGrade7.compare.gameDescription',
    icon: '≷',
  },
  {
    id: 'anglesConstruct',
    enabled: true,
    path: `${GEOMETRY_GRADE7_PATH}/construct-an-angle`,
    nameKey: 'anglesGrade7.construct.gameName',
    descriptionKey: 'anglesGrade7.construct.gameDescription',
    icon: '✎',
  },
  {
    id: 'anglesMeasure',
    enabled: true,
    path: `${GEOMETRY_GRADE7_PATH}/measure-an-angle`,
    nameKey: 'anglesGrade7.measure.gameName',
    descriptionKey: 'anglesGrade7.measure.gameDescription',
    icon: '∡',
  },
];

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

const ALGEBRA_PATH = '/grade/7/algebra';

/**
 * Grade 7 — Algebra, in the progression the unit's design calls for: patterns
 * and variables first, through expressions, substitution and equivalence, to
 * combining like terms, then the meaning of an equation, solving one, and
 * finally turning a word problem into one.
 */
export const algebraGames: Game[] = [
  {
    id: 'algebraPatterns',
    enabled: true,
    path: `${ALGEBRA_PATH}/patterns-and-variables`,
    nameKey: 'algebraPatterns.gameName',
    descriptionKey: 'algebraPatterns.gameDescription',
    icon: 'ƒ',
  },
  {
    id: 'algebraExpressions',
    enabled: true,
    path: `${ALGEBRA_PATH}/build-an-expression`,
    nameKey: 'algebraExpressions.gameName',
    descriptionKey: 'algebraExpressions.gameDescription',
    icon: 'x+',
  },
  {
    id: 'algebraSubstitution',
    enabled: true,
    path: `${ALGEBRA_PATH}/substitution`,
    nameKey: 'algebraSubstitution.gameName',
    descriptionKey: 'algebraSubstitution.gameDescription',
    icon: 'x=',
  },
  {
    id: 'algebraEquivalent',
    enabled: true,
    path: `${ALGEBRA_PATH}/equivalent-expressions`,
    nameKey: 'algebraEquivalent.gameName',
    descriptionKey: 'algebraEquivalent.gameDescription',
    icon: '⚖',
  },
  {
    id: 'algebraLikeTerms',
    enabled: true,
    path: `${ALGEBRA_PATH}/combining-like-terms`,
    nameKey: 'algebraLikeTerms.gameName',
    descriptionKey: 'algebraLikeTerms.gameDescription',
    icon: '3x',
  },
  {
    id: 'algebraEquationMeaning',
    enabled: true,
    path: `${ALGEBRA_PATH}/understanding-equations`,
    nameKey: 'algebraEquationMeaning.gameName',
    descriptionKey: 'algebraEquationMeaning.gameDescription',
    icon: '🟰',
  },
  {
    id: 'algebraSolving',
    enabled: true,
    path: `${ALGEBRA_PATH}/solving-equations`,
    nameKey: 'algebraSolving.gameName',
    descriptionKey: 'algebraSolving.gameDescription',
    icon: '🧮',
  },
  {
    id: 'algebraWordProblems',
    enabled: true,
    path: `${ALGEBRA_PATH}/from-words-to-equations`,
    nameKey: 'algebraWordProblems.gameName',
    descriptionKey: 'algebraWordProblems.gameDescription',
    icon: '📖',
  },
];

const DECIMAL_PLACE_VALUE_PATH = '/grade/4/decimal-place-value';

/**
 * Grade 4 — Decimal Place Value exam-prep unit. Eight skills building one
 * cohesive base-10 number-sense journey (not eight disconnected mini-games):
 * place value and conversions, construction and decomposition, ordering and
 * sequences, rounding and estimation, addition/subtraction with regrouping,
 * reasoning without full calculation, missing numbers and constraints, and
 * word problems tying several of the above together.
 */
export const decimalPlaceValueGames: Game[] = [
  {
    id: 'decimalPlaceValue',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/place-value-and-conversions`,
    nameKey: 'decimalPlaceValue.gameName',
    descriptionKey: 'decimalPlaceValue.gameDescription',
    icon: '#',
  },
  {
    id: 'decimalDecomposition',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/build-and-break-numbers`,
    nameKey: 'decimalDecomposition.gameName',
    descriptionKey: 'decimalDecomposition.gameDescription',
    icon: '🧩',
  },
  {
    id: 'decimalOrdering',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/comparing-and-sequences`,
    nameKey: 'decimalOrdering.gameName',
    descriptionKey: 'decimalOrdering.gameDescription',
    icon: '<>',
  },
  {
    id: 'decimalRounding',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/rounding-and-estimation`,
    nameKey: 'decimalRounding.gameName',
    descriptionKey: 'decimalRounding.gameDescription',
    icon: '≈',
  },
  {
    id: 'decimalArithmetic',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/addition-and-subtraction`,
    nameKey: 'decimalArithmetic.gameName',
    descriptionKey: 'decimalArithmetic.gameDescription',
    icon: '+−',
  },
  {
    id: 'decimalParity',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/reasoning-without-calculating`,
    nameKey: 'decimalParity.gameName',
    descriptionKey: 'decimalParity.gameDescription',
    icon: '🧠',
  },
  {
    id: 'decimalConstraints',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/missing-numbers-and-puzzles`,
    nameKey: 'decimalConstraints.gameName',
    descriptionKey: 'decimalConstraints.gameDescription',
    icon: '?',
  },
  {
    id: 'decimalWordProblems',
    enabled: true,
    path: `${DECIMAL_PLACE_VALUE_PATH}/word-problems`,
    nameKey: 'decimalWordProblems.gameName',
    descriptionKey: 'decimalWordProblems.gameDescription',
    icon: '📖',
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
  ...arithmeticFluencyGames,
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
