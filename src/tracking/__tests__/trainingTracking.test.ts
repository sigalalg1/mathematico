import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTrainingPersonalBest, getTrainingResults, saveTrainingResult } from '../trainingTracker';
import { getLocalTrainingResults, clearLocalTrainingResults } from '../localTrainingStore';
import { getSupabaseTrainingResults, saveSupabaseTrainingResult } from '../supabaseTrainingStore';
import { configurationKey } from '../../training/configuration';
import type { TrainingConfiguration, TrainingSessionResult } from '../../types/training';

vi.mock('../supabaseTrainingStore', () => ({
  saveSupabaseTrainingResult: vi.fn(),
  getSupabaseTrainingResults: vi.fn(),
}));

const saveRemote = vi.mocked(saveSupabaseTrainingResult);
const readRemote = vi.mocked(getSupabaseTrainingResults);

const CONFIG: TrainingConfiguration = {
  activityId: 'multiplicationTables',
  difficultyId: 'basic',
  questionCount: 20,
  rulesVersion: 1,
};
const KEY = configurationKey(CONFIG);

function makeResult(
  id: string,
  { correctCount = 20, longestStreak = 20, averageMsPerQuestion = 3000, configuration = CONFIG } = {},
): TrainingSessionResult {
  const totalQuestions = configuration.questionCount;
  return {
    id,
    configuration,
    mode: 'challenge',
    startedAt: `2026-01-01T10:00:00.000Z`,
    completedAt: `2026-01-01T10:0${id.slice(-1)}:00.000Z`,
    totalDurationMs: 90_000,
    answeringDurationMs: averageMsPerQuestion * totalQuestions,
    totalQuestions,
    correctCount,
    incorrectCount: totalQuestions - correctCount,
    accuracy: correctCount / totalQuestions,
    longestStreak,
    averageMsPerQuestion,
  };
}

describe('training persistence — guest (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearLocalTrainingResults();
  });

  it('stores a guest result and reads it back for the same configuration', async () => {
    await saveTrainingResult(makeResult('r1'), null);

    expect(await getTrainingResults(KEY, null)).toHaveLength(1);
    expect(saveRemote).not.toHaveBeenCalled();
  });

  it('keeps results of different configurations apart', async () => {
    await saveTrainingResult(makeResult('r1'), null);
    await saveTrainingResult(makeResult('r2', { configuration: { ...CONFIG, questionCount: 50 } }), null);
    await saveTrainingResult(makeResult('r3', { configuration: { ...CONFIG, difficultyId: 'hard' } }), null);
    await saveTrainingResult(makeResult('r4', { configuration: { ...CONFIG, rulesVersion: 2 } }), null);

    expect(await getTrainingResults(KEY, null)).toHaveLength(1);
    expect(getLocalTrainingResults(configurationKey({ ...CONFIG, questionCount: 50 }))).toHaveLength(1);
    expect(getLocalTrainingResults(configurationKey({ ...CONFIG, difficultyId: 'hard' }))).toHaveLength(1);
    expect(getLocalTrainingResults(configurationKey({ ...CONFIG, rulesVersion: 2 }))).toHaveLength(1);
  });

  it('derives a guest personal best from the stored results', async () => {
    await saveTrainingResult(makeResult('r1', { averageMsPerQuestion: 4000 }), null);
    await saveTrainingResult(makeResult('r2', { correctCount: 18, longestStreak: 11, averageMsPerQuestion: 1000 }), null);

    const best = await getTrainingPersonalBest(KEY, null, 1);
    expect(best?.attempts).toBe(2);
    expect(best?.bestAccuracy).toBe(1);
    expect(best?.bestLongestStreak).toBe(20);
    // The 1000ms run had mistakes, so it cannot take the pace record.
    expect(best?.bestAverageMsPerQuestion).toBe(4000);
  });

  it('survives unreadable stored data instead of throwing', async () => {
    localStorage.setItem('mathematico-training-results', 'not json at all');
    expect(await getTrainingResults(KEY, null)).toEqual([]);

    localStorage.setItem('mathematico-training-results', '[{"nonsense":true}]');
    expect(await getTrainingResults(KEY, null)).toEqual([]);
  });
});

describe('training persistence — signed in (Supabase)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearLocalTrainingResults();
    saveRemote.mockReset();
    readRemote.mockReset();
  });

  it('writes a signed-in result to Supabase and not to the guest store', async () => {
    saveRemote.mockResolvedValue(true);
    const result = makeResult('r1');

    await saveTrainingResult(result, 'user-1');

    expect(saveRemote).toHaveBeenCalledWith(result, 'user-1', KEY);
    expect(getLocalTrainingResults(KEY)).toEqual([]);
  });

  it('reads a signed-in history from Supabase, scoped to the configuration', async () => {
    readRemote.mockResolvedValue([makeResult('r1'), makeResult('r2', { correctCount: 19, longestStreak: 12 })]);

    const best = await getTrainingPersonalBest(KEY, 'user-1', 1);

    expect(readRemote).toHaveBeenCalledWith('user-1', KEY);
    expect(best?.attempts).toBe(2);
    expect(best?.bestAccuracy).toBe(1);
  });

  it('falls back to the guest store when the write fails, so no result is lost', async () => {
    saveRemote.mockResolvedValue(false);
    await saveTrainingResult(makeResult('r1'), 'user-1');
    expect(getLocalTrainingResults(KEY)).toHaveLength(1);

    saveRemote.mockRejectedValue(new Error('offline'));
    await saveTrainingResult(makeResult('r2'), 'user-1');
    expect(getLocalTrainingResults(KEY)).toHaveLength(2);
  });

  it('falls back to locally stored results when the backend is unreachable', async () => {
    saveRemote.mockRejectedValue(new Error('offline'));
    await saveTrainingResult(makeResult('r1'), 'user-1');

    readRemote.mockRejectedValue(new Error('offline'));
    expect(await getTrainingResults(KEY, 'user-1')).toHaveLength(1);

    readRemote.mockResolvedValue(null);
    expect(await getTrainingResults(KEY, 'user-1')).toHaveLength(1);
  });
});
