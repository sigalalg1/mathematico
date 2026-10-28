import type { TrainingActivityDefinition } from '../types/training';
import { multiplicationTablesActivity } from '../data/games/multiplicationTablesData';
import { fractionsPart1TrainingActivities } from '../data/games/fractionsPart1Training';
import { basketballMonkeyActivity } from '../data/games/basketballMonkeyData';
import { arithmeticFluencyActivities } from '../data/games/arithmeticFluencyData';
import { algebraExpressionsActivity } from '../data/games/algebraExpressionsData';
import { algebraSubstitutionActivity } from '../data/games/algebraSubstitutionData';
import { algebraLikeTermsActivity } from '../data/games/algebraLikeTermsData';
import { absoluteValueActivity } from '../data/games/absoluteValueData';
import { signRulesActivity } from '../data/games/signRulesData';
import { anglesIdentifyActivity } from '../data/games/anglesIdentifyData';
import { anglesTypesActivity } from '../data/games/anglesTypesData';
import { anglesNotationActivity } from '../data/games/anglesNotationData';
import { anglesCompareActivity } from '../data/games/anglesCompareData';
import { anglesConstructActivity } from '../data/games/anglesConstructData';
import { anglesMeasureActivity } from '../data/games/anglesMeasureData';

/**
 * Every activity that opts into the training system. Adding a new one is a
 * single entry here plus its own definition module — no training code changes.
 */
const TRAINING_ACTIVITIES: TrainingActivityDefinition<unknown>[] = [
  multiplicationTablesActivity,
  basketballMonkeyActivity,
  ...fractionsPart1TrainingActivities,
  ...arithmeticFluencyActivities,
  algebraExpressionsActivity,
  algebraSubstitutionActivity,
  algebraLikeTermsActivity,
  absoluteValueActivity,
  signRulesActivity,
  anglesIdentifyActivity,
  anglesTypesActivity,
  anglesNotationActivity,
  anglesCompareActivity,
  anglesConstructActivity,
  anglesMeasureActivity,
];

export function getTrainingActivity(activityId: string): TrainingActivityDefinition<unknown> | undefined {
  return TRAINING_ACTIVITIES.find((activity) => activity.id === activityId);
}

export function listTrainingActivities(): TrainingActivityDefinition<unknown>[] {
  return TRAINING_ACTIVITIES;
}
