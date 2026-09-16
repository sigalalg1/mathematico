import type { Grade } from '../types';
import { gradeHasContent } from './topics';

/**
 * A grade is enabled/visible purely because it has at least one actual
 * playable activity — see `gradeHasContent`. Add a new grade id here (and
 * its `grades.<id>` i18n key) and it will show up on its own once the first
 * topic/game is added for it; nothing else needs to change.
 */
const KNOWN_GRADE_IDS = [1, 2, 3, 4, 5, 6, 7];

export const grades: Grade[] = KNOWN_GRADE_IDS.map((id) => ({ id, enabled: gradeHasContent(id) }));
