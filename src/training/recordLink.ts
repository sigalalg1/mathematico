import type { TrainingConfiguration } from '../types/training';
import { MULTIPLICATION_TABLES_ID } from '../data/games/multiplicationTablesData';
import { BASKETBALL_MONKEY_ID } from '../data/games/basketballMonkeyData';
import { FRACTION_TRAINING_ACTIVITY_IDS } from '../data/games/fractionsPart1Training';
import { ARITHMETIC_SKILL_IDS } from '../data/games/arithmeticFluencyData';

/**
 * Where each training activity's page lives, so a record card can deep-link
 * straight back into the exact same challenge. Kept as an explicit map rather
 * than derived from the route table, because a couple of activities
 * (multiplication tables, basketball monkey) don't carry `:activityId` in
 * their route at all.
 */
const ACTIVITY_ROUTES: Record<string, string> = {
  [MULTIPLICATION_TABLES_ID]: '/grade/4/multiplication/multiplication-tables',
  [BASKETBALL_MONKEY_ID]: '/grade/4/multiplication/basketball-monkey',
  ...Object.fromEntries(FRACTION_TRAINING_ACTIVITY_IDS.map((id) => [id, `/grade/4/fractions-part-1/${id}`])),
  ...Object.fromEntries(ARITHMETIC_SKILL_IDS.map((id) => [id, `/grade/2/arithmetic-fluency/${id}`])),
};

/**
 * A link that lands a child straight back into this exact challenge — same
 * activity, difficulty and question count — and starts it immediately.
 * `TrainingActivityScreen` reads these query params on mount. Returns `null`
 * when the activity has no known route (never expected for a currently
 * registered activity, but kept explicit rather than assumed).
 */
export function buildRecordLaunchPath(configuration: TrainingConfiguration): string | null {
  const base = ACTIVITY_ROUTES[configuration.activityId];
  if (!base) return null;
  const params = new URLSearchParams({
    mode: 'challenge',
    count: String(configuration.questionCount),
    start: '1',
  });
  if (configuration.difficultyId) params.set('difficulty', configuration.difficultyId);
  return `${base}?${params.toString()}`;
}
