import type { TrainingConfiguration, TrainingActivityDefinition, TrainingPersonalBest, TrainingSessionResult } from '../types/training';
import { configurationKey, isChallengeEligible } from './configuration';
import { derivePersonalBest } from './personalBests';
import { buildRecordLaunchPath } from './recordLink';
import { getTrainingActivity } from './registry';

/** One aggregated personal-best card: a distinct activity + difficulty + question-count configuration. */
export interface TrainingRecordCard {
  configuration: TrainingConfiguration;
  personalBest: TrainingPersonalBest;
  /**
   * Whether this exact configuration can still be safely relaunched — false
   * once the activity's rules, difficulty set or question counts have moved
   * on since this record was set, so an old record is still shown but is
   * never wired to a different challenge pretending to be the same one.
   */
  isRelaunchable: boolean;
  launchPath: string | null;
}

/**
 * Folds every stored challenge result (practice sessions never reach this
 * store — see `TrainingActivityScreen`) into one card per distinct
 * configuration, newest first by last-played date.
 */
export function buildTrainingRecords(results: TrainingSessionResult[]): TrainingRecordCard[] {
  const byKey = new Map<string, TrainingSessionResult[]>();
  for (const result of results) {
    const key = configurationKey(result.configuration);
    const group = byKey.get(key);
    if (group) group.push(result);
    else byKey.set(key, [result]);
  }

  const cards: TrainingRecordCard[] = [];
  for (const group of byKey.values()) {
    const configuration = group[0].configuration;
    const activity = getTrainingActivity(configuration.activityId);
    const paceRecordMinAccuracy = activity?.capabilities.paceRecordMinAccuracy ?? 1;
    const personalBest = derivePersonalBest(group, paceRecordMinAccuracy);
    if (!personalBest) continue;

    const relaunchable = canRelaunch(configuration, activity);
    const launchPath = relaunchable ? buildRecordLaunchPath(configuration) : null;
    cards.push({ configuration, personalBest, isRelaunchable: relaunchable && launchPath !== null, launchPath });
  }

  return cards.sort((a, b) => b.personalBest.lastCompletedAt.localeCompare(a.personalBest.lastCompletedAt));
}

function canRelaunch(configuration: TrainingConfiguration, activity: TrainingActivityDefinition<unknown> | undefined): boolean {
  if (!activity) return false;
  const { capabilities } = activity;
  if (capabilities.rulesVersion !== configuration.rulesVersion) return false;
  if (!isChallengeEligible(capabilities, configuration.questionCount)) return false;
  if (configuration.difficultyId === null) return capabilities.defaultDifficultyId === null;
  return capabilities.difficulties.some((option) => option.id === configuration.difficultyId);
}

/** The compact top-of-page metrics: overall pace/accuracy/volume across every challenge played. */
export interface TrainingSummary {
  averageAccuracy: number | null;
  averagePaceMs: number | null;
  challengeCount: number;
}

export function summarizeTrainingResults(results: TrainingSessionResult[]): TrainingSummary {
  if (results.length === 0) return { averageAccuracy: null, averagePaceMs: null, challengeCount: 0 };
  const averageAccuracy = results.reduce((sum, result) => sum + result.accuracy, 0) / results.length;
  const averagePaceMs = results.reduce((sum, result) => sum + result.averageMsPerQuestion, 0) / results.length;
  return { averageAccuracy, averagePaceMs, challengeCount: results.length };
}
