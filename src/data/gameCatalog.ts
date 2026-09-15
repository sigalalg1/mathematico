import type { Game, Topic } from '../types';
import {
  coordinateSystemGames,
  divisionWithRemainderGames,
  multiplicationGames,
  simpleFractionsGames,
} from './games';
import { topics } from './topics';

/**
 * Every game the app knows about, in one flat list. Adding a new topic's game
 * array here is the *only* step needed to make it show up on the activity page.
 */
export const allGames: Game[] = [
  ...divisionWithRemainderGames,
  ...simpleFractionsGames,
  ...multiplicationGames,
  ...coordinateSystemGames,
];

/**
 * Presentation metadata for one game, as the activity page needs it: a
 * localizable name, an icon that carries the game's identity, where to play it
 * again, and which grade/topic it belongs to.
 */
export interface GamePresentation {
  gameId: string;
  /** i18n key — never show the raw game id to a child. */
  nameKey: string;
  icon: string;
  /** Route to play again; undefined when the game has no route yet. */
  path?: string;
  topicId?: string;
  gradeId?: number;
  /** CSS accent class suffix, derived from the topic so new games inherit one for free. */
  accent: string;
}

/**
 * Topic → visual accent. This is the whole "hardcoded" surface of the page: a
 * topic without an entry simply falls back to the primary accent, so a new
 * grade or topic renders correctly before anyone touches this file.
 */
const TOPIC_ACCENTS: Record<string, string> = {
  divisionWithRemainder: 'amber',
  simpleFractions: 'pink',
  multiplication: 'green',
  coordinateSystem: 'blue',
};

const DEFAULT_ACCENT = 'violet';

/** Topics that can host games, longest path first so nested paths match the most specific topic. */
const routableTopics: Topic[] = topics
  .filter((topic): topic is Topic & { path: string } => Boolean(topic.path))
  .sort((a, b) => b.path!.length - a.path!.length);

/** A game belongs to the topic whose route is a prefix of the game's route. */
function findTopicForGame(game: Game): Topic | undefined {
  if (!game.path) return undefined;
  return routableTopics.find((topic) => game.path!.startsWith(`${topic.path}/`));
}

function toPresentation(game: Game): GamePresentation {
  const topic = findTopicForGame(game);
  return {
    gameId: game.id,
    nameKey: game.nameKey,
    icon: game.icon,
    path: game.path,
    topicId: topic?.id,
    gradeId: topic?.gradeId,
    accent: (topic && TOPIC_ACCENTS[topic.id]) ?? DEFAULT_ACCENT,
  };
}

const catalog: Map<string, GamePresentation> = new Map(
  allGames.map((game) => [game.id, toPresentation(game)]),
);

/**
 * Looks up how to present a game id that came back from tracking data. Old
 * sessions can reference games that no longer exist in the registry (a renamed
 * or removed game), so this always returns something renderable instead of
 * throwing or leaking a raw id into the UI.
 */
export function getGamePresentation(gameId: string): GamePresentation {
  return (
    catalog.get(gameId) ?? {
      gameId,
      nameKey: 'activity.unknownGame',
      icon: '🎲',
      accent: DEFAULT_ACCENT,
    }
  );
}
