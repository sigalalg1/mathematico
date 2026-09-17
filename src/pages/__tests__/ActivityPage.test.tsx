import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { ActivityPage } from '../ActivityPage';
import { completeLocalSession, startLocalSession } from '../../tracking/localActivityStore';
import { saveLocalTrainingResult } from '../../tracking/localTrainingStore';
import type { TrainingSessionResult } from '../../types/training';

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

let sequence = 0;

function makeChallengeResult(overrides: Partial<TrainingSessionResult> & { correctCount: number; averageMsPerQuestion: number }): TrainingSessionResult {
  sequence += 1;
  const activityId = overrides.configuration?.activityId ?? 'multiplicationTables';
  const questionCount = overrides.configuration?.questionCount ?? 20;
  const configuration = overrides.configuration ?? { activityId, difficultyId: 'basic', questionCount, rulesVersion: 1 };
  return {
    id: `result-${sequence}`,
    configuration,
    mode: 'challenge',
    startedAt: `2026-01-${String(sequence).padStart(2, '0')}T10:00:00.000Z`,
    completedAt: overrides.completedAt ?? `2026-01-${String(sequence).padStart(2, '0')}T10:02:00.000Z`,
    totalDurationMs: 120_000,
    answeringDurationMs: overrides.averageMsPerQuestion * questionCount,
    totalQuestions: questionCount,
    correctCount: overrides.correctCount,
    incorrectCount: questionCount - overrides.correctCount,
    accuracy: overrides.correctCount / questionCount,
    longestStreak: overrides.correctCount,
    averageMsPerQuestion: overrides.averageMsPerQuestion,
  };
}

/** Seeds one completed round in the legacy activity log, for Recent Activity. */
function seedLegacySession(gameId: string, correctCount: number, questionsCount: number) {
  const session = startLocalSession(gameId);
  completeLocalSession(session.id, { questionsCount, correctCount, mistakes: [] });
}

describe('ActivityPage — empty states', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows a friendly empty state when there is no activity at all', async () => {
    renderWithProviders(<ActivityPage />, ['/activity']);
    expect(await screen.findByText(t('activity.empty'))).toBeInTheDocument();
  });

  it('shows a records empty state when there is ordinary activity but no personal challenge yet', async () => {
    seedLegacySession('multiplicationTables', 8, 10);
    renderWithProviders(<ActivityPage />, ['/activity']);

    expect(await screen.findByText(t('activity.records.emptyTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('activity.recent.title'))).toBeInTheDocument();
  });
});

describe('ActivityPage — my records', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('aggregates repeated attempts of the same configuration into one record card, showing the best pace', async () => {
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 18, averageMsPerQuestion: 3200, completedAt: '2026-01-01T10:00:00.000Z' }));
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 20, averageMsPerQuestion: 2800, completedAt: '2026-01-02T10:00:00.000Z' }));

    renderWithProviders(<ActivityPage />, ['/activity']);

    const cards = await screen.findAllByText(t('multiplicationTables.gameName'));
    expect(cards).toHaveLength(1);
    expect(screen.getByText('2.8', { exact: false })).toBeInTheDocument();
  });

  it('keeps different question counts as separate record cards', async () => {
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 20, averageMsPerQuestion: 2800 }));
    saveLocalTrainingResult(
      makeChallengeResult({
        configuration: { activityId: 'multiplicationTables', difficultyId: 'basic', questionCount: 50, rulesVersion: 1 },
        correctCount: 50,
        averageMsPerQuestion: 3000,
      }),
    );

    renderWithProviders(<ActivityPage />, ['/activity']);
    expect(await screen.findAllByText(t('multiplicationTables.gameName'))).toHaveLength(2);
  });

  it('never shows a fabricated time for an activity with no pace-eligible attempt', async () => {
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 15, averageMsPerQuestion: 3200 }));
    renderWithProviders(<ActivityPage />, ['/activity']);

    await screen.findByText(t('multiplicationTables.gameName'));
    expect(screen.queryByText(t('training.results.paceUnit'))).not.toBeInTheDocument();
    expect(screen.getByText(t('activity.records.correctFraction', { correct: 15, total: 20 }))).toBeInTheDocument();
  });

  it('links a relaunchable record to the exact same challenge configuration', async () => {
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 20, averageMsPerQuestion: 2800 }));
    renderWithProviders(<ActivityPage />, ['/activity']);

    const link = await screen.findByRole('link', { name: new RegExp(t('activity.records.cta')) });
    expect(link).toHaveAttribute('href', '/grade/4/multiplication/multiplication-tables?mode=challenge&count=20&start=1&difficulty=basic');
  });

  it('does not link a record whose configuration can no longer be safely reconstructed', async () => {
    saveLocalTrainingResult(
      makeChallengeResult({
        configuration: { activityId: 'a-retired-activity', difficultyId: null, questionCount: 20, rulesVersion: 1 },
        correctCount: 20,
        averageMsPerQuestion: 2800,
      }),
    );
    renderWithProviders(<ActivityPage />, ['/activity']);

    await screen.findByText('a-retired-activity');
    expect(screen.queryByText(t('activity.records.cta'))).not.toBeInTheDocument();
  });
});

describe('ActivityPage — summary', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows average accuracy, average pace and challenge count once challenges have been played', async () => {
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 20, averageMsPerQuestion: 3000 }));
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 18, averageMsPerQuestion: 4000 }));

    renderWithProviders(<ActivityPage />, ['/activity']);
    const summary = await screen.findByTestId('activity-summary');
    expect(within(summary).getByText('95%')).toBeInTheDocument();
    expect(within(summary).getByText('2')).toBeInTheDocument();
  });
});

describe('ActivityPage — recent activity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows only the latest few attempts, with a way to reveal more', async () => {
    for (let i = 0; i < 6; i += 1) seedLegacySession('multiplicationTables', 8, 10);

    renderWithProviders(<ActivityPage />, ['/activity']);
    await screen.findByText(t('activity.recent.title'));

    const list = document.querySelectorAll('.activity-row');
    expect(list.length).toBeLessThan(6);

    fireEvent.click(screen.getByText(t('activity.recent.showMore')));
    expect(document.querySelectorAll('.activity-row').length).toBe(6);
  });

  it('still surfaces an ordinary (non-challenge) completed activity', async () => {
    seedLegacySession('multiplicationTables', 8, 10);
    renderWithProviders(<ActivityPage />, ['/activity']);
    expect(await screen.findByText(t('multiplicationTables.gameName'))).toBeInTheDocument();
  });
});

describe('ActivityPage — Hebrew RTL and English LTR', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders records-section copy in Hebrew by default', async () => {
    saveLocalTrainingResult(makeChallengeResult({ correctCount: 20, averageMsPerQuestion: 2800 }));
    renderWithProviders(<ActivityPage />, ['/activity']);
    expect(await screen.findByText('השיאים שלי')).toBeInTheDocument();
  });
});
