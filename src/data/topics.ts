import type { Game, Topic } from '../types';
import {
  coordinateSystemGames,
  divisionWithRemainderGames,
  fractionsPart1Games,
  geometryAnglesTrianglesGames,
  multiplicationGames,
  signedNumbersGames,
  simpleFractionsGames,
} from './games';

export const topics: Topic[] = [
  {
    id: 'geometryAnglesTriangles',
    gradeId: 3,
    enabled: true,
    path: '/grade/3/geometry-angles-triangles',
  },
  {
    id: 'divisionWithRemainder',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/division-with-remainder',
  },
  {
    id: 'simpleFractions',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/simple-fractions',
  },
  {
    id: 'fractionsPart1',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/fractions-part-1',
  },
  {
    id: 'multiplication',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/multiplication',
  },
  {
    id: 'penaltyShootout',
    gradeId: 4,
    enabled: true,
    path: '/grade/4/penalty-shootout',
  },
  {
    id: 'coordinateSystem',
    gradeId: 7,
    enabled: true,
    path: '/grade/7/coordinate-system',
  },
  {
    id: 'signedNumbers',
    gradeId: 7,
    enabled: true,
    path: '/grade/7/signed-numbers',
  },
  {
    id: 'fractions',
    gradeId: 7,
    enabled: false,
  },
  {
    id: 'geometry',
    gradeId: 7,
    enabled: false,
  },
  {
    id: 'algebraBasics',
    gradeId: 7,
    enabled: false,
  },
];

export function getTopicsForGrade(gradeId: number): Topic[] {
  return topics.filter((topic) => topic.gradeId === gradeId);
}

/**
 * Topics that list their activities via a dedicated `Game[]` array (as
 * opposed to a topic whose path routes straight to a single game page, e.g.
 * `penaltyShootout`). Only listed here so `topicHasActivity` can check that
 * the array actually contains a playable game, not just that the topic is
 * flagged enabled.
 */
const TOPIC_GAMES: Partial<Record<string, Game[]>> = {
  geometryAnglesTriangles: geometryAnglesTrianglesGames,
  divisionWithRemainder: divisionWithRemainderGames,
  simpleFractions: simpleFractionsGames,
  fractionsPart1: fractionsPart1Games,
  multiplication: multiplicationGames,
  coordinateSystem: coordinateSystemGames,
  signedNumbers: signedNumbersGames,
};

function topicHasActivity(topic: Topic): boolean {
  if (!topic.enabled) return false;
  const games = TOPIC_GAMES[topic.id];
  // A topic with no listing array (e.g. one whose path routes straight to a
  // single game page) is playable as soon as it's enabled.
  if (games === undefined) return true;
  return games.some((game) => game.enabled && Boolean(game.path));
}

/** Whether a grade has at least one enabled topic that actually contains a playable activity. */
export function gradeHasContent(gradeId: number): boolean {
  return getTopicsForGrade(gradeId).some(topicHasActivity);
}
