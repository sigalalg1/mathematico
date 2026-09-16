import { describe, expect, it } from 'vitest';
import { getTrainingActivity, listTrainingActivities } from '../registry';
import { resolveConfiguration } from '../configuration';
import i18n from '../../i18n';

/**
 * Contract every training activity must satisfy. A second activity (two-digit
 * × one-digit multiplication, say) only has to add its definition here to be
 * held to the same rules — nothing in the training engine changes.
 */
describe('training activity registry', () => {
  const activities = listTrainingActivities();

  it('registers at least one activity, each resolvable by id', () => {
    expect(activities.length).toBeGreaterThan(0);
    for (const activity of activities) {
      expect(getTrainingActivity(activity.id)).toBe(activity);
    }
    expect(getTrainingActivity('not-an-activity')).toBeUndefined();
  });

  it.each(listTrainingActivities())('$id declares a coherent set of capabilities', (activity) => {
    const { capabilities } = activity;

    expect(capabilities.questionCounts.length).toBeGreaterThan(0);
    expect(capabilities.questionCounts).toContain(capabilities.defaultQuestionCount);
    // Challenge lengths must be a subset of what the activity can actually run.
    for (const count of capabilities.challengeQuestionCounts) {
      expect(capabilities.questionCounts).toContain(count);
    }
    if (!capabilities.supportsChallenge) expect(capabilities.challengeQuestionCounts).toEqual([]);

    if (capabilities.difficulties.length > 0) {
      expect(capabilities.difficulties.map((option) => option.id)).toContain(capabilities.defaultDifficultyId);
    } else {
      expect(capabilities.defaultDifficultyId).toBeNull();
    }

    expect(capabilities.paceRecordMinAccuracy).toBeGreaterThan(0);
    expect(capabilities.paceRecordMinAccuracy).toBeLessThanOrEqual(1);
    expect(Number.isInteger(capabilities.rulesVersion)).toBe(true);
  });

  it.each(listTrainingActivities())('$id has translated copy in both languages', (activity) => {
    for (const language of ['he', 'en'] as const) {
      const t = i18n.getFixedT(language);
      for (const key of [`${activity.i18nPrefix}.gameName`, `${activity.i18nPrefix}.intro`, `${activity.i18nPrefix}.prompt`]) {
        expect(t(key)).not.toBe(key);
      }
      for (const option of activity.capabilities.difficulties) {
        expect(t(option.labelKey)).not.toBe(option.labelKey);
        expect(t(option.descriptionKey)).not.toBe(option.descriptionKey);
      }
    }
  });

  it.each(listTrainingActivities())('$id generates every supported configuration', (activity) => {
    const { capabilities } = activity;
    const difficultyIds = capabilities.difficulties.length > 0 ? capabilities.difficulties.map((option) => option.id) : [null];

    for (const difficultyId of difficultyIds) {
      for (const count of capabilities.questionCounts) {
        const configuration = resolveConfiguration(activity.id, capabilities, { difficultyId, questionCount: count });
        expect(configuration.questionCount).toBe(count);
        expect(configuration.difficultyId).toBe(difficultyId);

        const questions = activity.generateQuestions({ difficultyId, count });
        expect(questions).toHaveLength(count);
        for (const question of questions) {
          expect(question.options).toContain(question.answer);
          expect(new Set(question.options).size).toBe(question.options.length);
          expect(question.prompt.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
