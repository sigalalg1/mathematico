import type { TrainingActivityDefinition } from '../types/training';
import { multiplicationTablesActivity } from '../data/games/multiplicationTablesData';
import { fractionsPart1TrainingActivities } from '../data/games/fractionsPart1Training';
import { basketballMonkeyActivity } from '../data/games/basketballMonkeyData';
import { arithmeticFluencyActivities } from '../data/games/arithmeticFluencyData';

/**
 * Every activity that opts into the training system. Adding a new one is a
 * single entry here plus its own definition module — no training code changes.
 */
const TRAINING_ACTIVITIES: TrainingActivityDefinition<unknown>[] = [
  multiplicationTablesActivity,
  basketballMonkeyActivity,
  ...fractionsPart1TrainingActivities,
  ...arithmeticFluencyActivities,
];

export function getTrainingActivity(activityId: string): TrainingActivityDefinition<unknown> | undefined {
  return TRAINING_ACTIVITIES.find((activity) => activity.id === activityId);
}

export function listTrainingActivities(): TrainingActivityDefinition<unknown>[] {
  return TRAINING_ACTIVITIES;
}
