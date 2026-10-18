import { beforeEach, describe, expect, it } from 'vitest';
import { getMockExamHistory, getReadinessAssessment, saveMockExamResult, type StoredMockExamResult } from '../decimalExamPrepStore';

function makeResult(overrides: Partial<StoredMockExamResult> = {}): StoredMockExamResult {
  return {
    takenAt: new Date().toISOString(),
    overallCorrect: 20,
    overallTotal: 22,
    skillStats: [
      { skillId: 'placeValue', correct: 3, total: 3 },
      { skillId: 'rounding', correct: 2, total: 2 },
    ],
    ...overrides,
  };
}

describe('decimalExamPrepStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists results per user and keeps guest/user histories separate', () => {
    saveMockExamResult(null, makeResult());
    saveMockExamResult('user-1', makeResult({ overallCorrect: 10, overallTotal: 22 }));

    expect(getMockExamHistory(null)).toHaveLength(1);
    expect(getMockExamHistory('user-1')).toHaveLength(1);
    expect(getMockExamHistory('user-2')).toHaveLength(0);
    expect(getMockExamHistory('user-1')[0].overallCorrect).toBe(10);
  });

  it('stores most-recent-first and caps the stored history', () => {
    for (let i = 0; i < 25; i += 1) {
      saveMockExamResult('capped-user', makeResult({ overallCorrect: i }));
    }
    const history = getMockExamHistory('capped-user');
    expect(history.length).toBeLessThanOrEqual(20);
    expect(history[0].overallCorrect).toBe(24);
  });

  it('survives corrupted storage without throwing', () => {
    localStorage.setItem('mathematico-decimal-mockexam-guest', 'not json');
    expect(getMockExamHistory(null)).toEqual([]);
  });

  describe('getReadinessAssessment', () => {
    it('reports notEnoughAttempts with zero or one prior mock exam', () => {
      expect(getReadinessAssessment('fresh-user').status).toBe('notEnoughAttempts');
      saveMockExamResult('fresh-user', makeResult());
      expect(getReadinessAssessment('fresh-user').status).toBe('notEnoughAttempts');
    });

    it('reports ready when the last two attempts both clear 85% with no persistent weak skill', () => {
      const userId = 'ready-user';
      saveMockExamResult(userId, makeResult({ overallCorrect: 19, overallTotal: 22 }));
      saveMockExamResult(userId, makeResult({ overallCorrect: 20, overallTotal: 22 }));
      const assessment = getReadinessAssessment(userId);
      expect(assessment.status).toBe('ready');
      expect(assessment.weakSkillIds).toEqual([]);
    });

    it('reports notYet when overall accuracy is below the readiness threshold', () => {
      const userId = 'low-accuracy-user';
      saveMockExamResult(userId, makeResult({ overallCorrect: 10, overallTotal: 22 }));
      saveMockExamResult(userId, makeResult({ overallCorrect: 11, overallTotal: 22 }));
      expect(getReadinessAssessment(userId).status).toBe('notYet');
    });

    it('reports notYet and names a skill that stayed weak across both of the last two attempts', () => {
      const userId = 'weak-skill-user';
      saveMockExamResult(userId, {
        takenAt: new Date().toISOString(),
        overallCorrect: 20,
        overallTotal: 22,
        skillStats: [{ skillId: 'constraints', correct: 0, total: 2 }],
      });
      saveMockExamResult(userId, {
        takenAt: new Date().toISOString(),
        overallCorrect: 20,
        overallTotal: 22,
        skillStats: [{ skillId: 'constraints', correct: 1, total: 2 }],
      });
      const assessment = getReadinessAssessment(userId);
      expect(assessment.status).toBe('notYet');
      expect(assessment.weakSkillIds).toContain('constraints');
    });

    it('only considers the two most recent attempts, not the full history', () => {
      const userId = 'history-user';
      // Two old, bad attempts, then two recent, good ones.
      saveMockExamResult(userId, makeResult({ overallCorrect: 5, overallTotal: 22 }));
      saveMockExamResult(userId, makeResult({ overallCorrect: 5, overallTotal: 22 }));
      saveMockExamResult(userId, makeResult({ overallCorrect: 20, overallTotal: 22 }));
      saveMockExamResult(userId, makeResult({ overallCorrect: 20, overallTotal: 22 }));
      expect(getReadinessAssessment(userId).status).toBe('ready');
    });
  });
});
