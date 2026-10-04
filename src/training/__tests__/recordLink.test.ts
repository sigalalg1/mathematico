import { describe, expect, it } from 'vitest';
import { buildRecordLaunchPath } from '../recordLink';
import type { TrainingConfiguration } from '../../types/training';

describe('buildRecordLaunchPath', () => {
  it('builds a challenge auto-start link for an activity with its own route param', () => {
    const configuration: TrainingConfiguration = {
      activityId: 'build-a-fraction',
      difficultyId: 'hard',
      questionCount: 10,
      rulesVersion: 1,
    };
    expect(buildRecordLaunchPath(configuration)).toBe(
      '/grade/4/fractions-part-1/build-a-fraction?mode=challenge&count=10&start=1&difficulty=hard',
    );
  });

  it('builds a link for an activity with a fixed (non-parameterized) route', () => {
    const configuration: TrainingConfiguration = {
      activityId: 'basketballMonkey',
      difficultyId: 'basic',
      questionCount: 20,
      rulesVersion: 1,
    };
    expect(buildRecordLaunchPath(configuration)).toBe(
      '/grade/4/multiplication/basketball-monkey?mode=challenge&count=20&start=1&difficulty=basic',
    );
  });

  it('omits the difficulty param when the configuration has none', () => {
    const configuration: TrainingConfiguration = {
      activityId: 'multiplicationTables',
      difficultyId: null,
      questionCount: 20,
      rulesVersion: 1,
    };
    expect(buildRecordLaunchPath(configuration)).toBe('/grade/4/multiplication/multiplication-tables?mode=challenge&count=20&start=1');
  });

  it('returns null for an activity id with no known route', () => {
    const configuration: TrainingConfiguration = {
      activityId: 'not-a-real-activity',
      difficultyId: null,
      questionCount: 10,
      rulesVersion: 1,
    };
    expect(buildRecordLaunchPath(configuration)).toBeNull();
  });
});
