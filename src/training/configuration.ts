import type { TrainingCapabilities, TrainingConfiguration } from '../types/training';

/**
 * The identity of a fixed challenge configuration. A record is only ever
 * compared against results carrying the identical key, so changing the
 * difficulty, the question count or the generator's rules version starts a
 * fresh, separate record.
 */
export function configurationKey(configuration: TrainingConfiguration): string {
  const { activityId, difficultyId, questionCount, rulesVersion } = configuration;
  return `${activityId}|${difficultyId ?? '-'}|${questionCount}|v${rulesVersion}`;
}

export function sameConfiguration(a: TrainingConfiguration, b: TrainingConfiguration): boolean {
  return configurationKey(a) === configurationKey(b);
}

/**
 * Clamps a chosen difficulty/count pair onto what the activity actually
 * supports, so a stale link or stored preference can never produce a
 * configuration the activity cannot generate.
 */
export function resolveConfiguration(
  activityId: string,
  capabilities: TrainingCapabilities,
  choice: { difficultyId: string | null; questionCount: number },
): TrainingConfiguration {
  const difficultyId = capabilities.difficulties.some((option) => option.id === choice.difficultyId)
    ? choice.difficultyId
    : capabilities.defaultDifficultyId;

  const questionCount = capabilities.questionCounts.includes(choice.questionCount)
    ? choice.questionCount
    : capabilities.defaultQuestionCount;

  return { activityId, difficultyId, questionCount, rulesVersion: capabilities.rulesVersion };
}

/** True when this activity offers a personal challenge at this question count. */
export function isChallengeEligible(capabilities: TrainingCapabilities, questionCount: number): boolean {
  return capabilities.supportsChallenge && capabilities.challengeQuestionCounts.includes(questionCount);
}
