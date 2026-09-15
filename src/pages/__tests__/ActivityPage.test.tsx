import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@supabase/supabase-js';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import App from '../../App';
import { ActivityPage } from '../ActivityPage';
import { loadActivityHistory } from '../../tracking/activityTracker';
import { useAuth } from '../../auth/useAuth';
import type { GameSession } from '../../types/activity';

vi.mock('../../tracking/activityTracker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../tracking/activityTracker')>()),
  loadActivityHistory: vi.fn(),
}));

vi.mock('../../auth/useAuth', () => ({ useAuth: vi.fn() }));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

const guestAuth = { user: null, isInitializing: false, isConfigured: false, status: 'guest' };
const signedInAuth = {
  user: { id: 'user-1', email: 'kid@example.com' } as User,
  isInitializing: false,
  isConfigured: true,
  status: 'authenticated',
};

function setAuth(value: object) {
  vi.mocked(useAuth).mockReturnValue(value as ReturnType<typeof useAuth>);
}

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

/** Mirrors the real GameSession shape returned by both tracking stores. */
function session(overrides: Partial<GameSession> & { id: string; gameId: string }): GameSession {
  return {
    userId: null,
    startedAt: daysAgo(0),
    completedAt: daysAgo(0),
    questionsCount: 5,
    correctCount: 4,
    mistakes: [],
    ...overrides,
  };
}

/** Grade 4 + Grade 7 activity in one history, as a real student would accumulate. */
const MIXED_HISTORY: GameSession[] = [
  session({ id: 's1', gameId: 'fractionBalloons', completedAt: daysAgo(0), questionsCount: 6, correctCount: 5 }),
  session({ id: 's2', gameId: 'hitTheTarget', completedAt: daysAgo(1), questionsCount: 4, correctCount: 3 }),
  session({ id: 's3', gameId: 'cargoStation', completedAt: daysAgo(10), questionsCount: 8, correctCount: 6 }),
];

function resolveWith(sessions: GameSession[], failed = false) {
  vi.mocked(loadActivityHistory).mockResolvedValue({ sessions, failed });
}

async function renderActivity(entries: string[] = ['/activity']) {
  const result = renderWithProviders(<ActivityPage />, entries);
  await act(async () => {});
  return result;
}

beforeEach(() => {
  vi.mocked(loadActivityHistory).mockReset();
  setAuth(guestAuth);
  resolveWith([]);
});

afterEach(async () => {
  await resetLanguage();
  vi.clearAllMocks();
});

describe('ActivityPage — loading', () => {
  it('shows a skeleton with an accessible label and never flashes zeroes', async () => {
    let resolve: (value: { sessions: GameSession[]; failed: boolean }) => void = () => {};
    vi.mocked(loadActivityHistory).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const { container } = renderWithProviders(<ActivityPage />, ['/activity']);
    expect(screen.getByText(t('activity.loading'))).toBeInTheDocument();
    expect(container.querySelector('.activity-skeleton-tile')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText(t('activity.empty'))).not.toBeInTheDocument();

    await act(async () => resolve({ sessions: MIXED_HISTORY, failed: false }));
    expect(screen.queryByText(t('activity.loading'))).not.toBeInTheDocument();
  });

  it('stays in the skeleton while auth is still initializing', () => {
    setAuth({ ...guestAuth, isInitializing: true });
    renderWithProviders(<ActivityPage />, ['/activity']);
    expect(screen.getByText(t('activity.loading'))).toBeInTheDocument();
    expect(loadActivityHistory).not.toHaveBeenCalled();
  });
});

describe('ActivityPage — empty state', () => {
  it('shows a friendly message and a play button instead of a zeroed dashboard', async () => {
    await renderActivity();
    expect(screen.getByText(t('activity.empty'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('activity.emptyAction') })).toHaveAttribute('href', '/');
    expect(screen.queryByText(t('activity.summary.games'))).not.toBeInTheDocument();
  });

  it('treats never-completed sessions as no activity at all', async () => {
    resolveWith([session({ id: 'open', gameId: 'cargoStation', completedAt: null })]);
    await renderActivity();
    expect(screen.getByText(t('activity.empty'))).toBeInTheDocument();
  });
});

describe('ActivityPage — failure', () => {
  it('shows a gentle fallback with no technical detail and keeps navigation available', async () => {
    resolveWith([], true);
    await renderActivity();
    expect(screen.getByText(t('activity.errorTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('activity.errorHint'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('activity.errorAction') })).toHaveAttribute('href', '/');
    expect(screen.queryByText(t('activity.empty'))).not.toBeInTheDocument();
  });
});

describe('ActivityPage — guest', () => {
  it('renders guest history with a one-line device-only caption', async () => {
    resolveWith(MIXED_HISTORY);
    await renderActivity();
    expect(loadActivityHistory).toHaveBeenCalledWith(null);
    expect(screen.getByText(t('fractionBalloons.gameName'))).toBeInTheDocument();
    expect(screen.getByText(t('activity.guestNote'))).toBeInTheDocument();
  });

  it('shows the guest caption on the empty state too', async () => {
    await renderActivity();
    expect(screen.getByText(t('activity.guestNote'))).toBeInTheDocument();
  });
});

describe('ActivityPage — signed in', () => {
  it('loads through the tracking abstraction with the signed-in user id and hides the guest caption', async () => {
    setAuth(signedInAuth);
    resolveWith(MIXED_HISTORY);
    await renderActivity();
    expect(loadActivityHistory).toHaveBeenCalledWith('user-1');
    expect(screen.getByText(t('games.hitTheTarget.name'))).toBeInTheDocument();
    expect(screen.queryByText(t('activity.guestNote'))).not.toBeInTheDocument();
  });
});

describe('ActivityPage — summary metrics', () => {
  beforeEach(() => resolveWith(MIXED_HISTORY));

  it('shows session, question, correct and practice-day totals', async () => {
    const { container } = await renderActivity();
    const tiles = [...container.querySelectorAll('.activity-tile')].map((tile) => ({
      value: tile.querySelector('.activity-tile-value')?.textContent,
      label: tile.querySelector('.activity-tile-label')?.textContent,
    }));
    expect(tiles).toEqual([
      { value: '3', label: t('activity.summary.games') },
      { value: '18', label: t('activity.summary.questions') },
      { value: '14', label: t('activity.summary.correct') },
      { value: '3', label: t('activity.summary.days') },
    ]);
  });

  it('phrases accuracy as "N of M correct" rather than a headline percentage', async () => {
    await renderActivity();
    expect(screen.getByText(t('activity.summary.accuracy', { correct: 14, total: 18 }))).toBeInTheDocument();
  });
});

describe('ActivityPage — recent activity', () => {
  it('lists sessions newest first with localized names, never raw game ids', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    const titles = [...container.querySelectorAll('.activity-card-title')].map((node) => node.textContent);
    expect(titles).toEqual([
      t('fractionBalloons.gameName'),
      t('games.hitTheTarget.name'),
      t('cargoStation.gameName'),
    ]);
    expect(screen.queryByText('fractionBalloons')).not.toBeInTheDocument();
  });

  it('labels dates relatively for today and yesterday', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    const dates = [...container.querySelectorAll('.activity-card-date')].map((node) => node.textContent);
    expect(dates[0]).toBe(t('activity.recent.today'));
    expect(dates[1]).toBe(t('activity.recent.yesterday'));
    expect(dates[2]).not.toBe(t('activity.recent.today'));
  });

  it('shows grade and topic next to each game', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    const first = container.querySelector('.activity-card')!;
    expect(within(first as HTMLElement).getByText(/כיתה ד'/)).toBeInTheDocument();
  });

  it('shows the per-session score as correct-of-total', async () => {
    resolveWith([MIXED_HISTORY[0]]);
    const { container } = await renderActivity();
    expect(container.querySelector('.activity-card-score')).toHaveTextContent(
      t('activity.recent.score', { correct: 5, total: 6 }),
    );
  });

  it('mixes Grade 4 and Grade 7 activity in one list', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    expect(container.querySelectorAll('.activity-card')).toHaveLength(3);
  });
});

describe('ActivityPage — play again', () => {
  it('links each activity card to its game route from the registry', async () => {
    resolveWith([MIXED_HISTORY[0]]);
    await renderActivity();
    const link = screen.getByRole('link', {
      name: t('activity.recent.playAgain', { game: t('fractionBalloons.gameName') }),
    });
    expect(link).toHaveAttribute('href', '/grade/4/simple-fractions/fraction-balloons');
  });

  it('navigates to the game when the card is activated from the keyboard', async () => {
    setAuth(guestAuth);
    resolveWith([MIXED_HISTORY[0]]);
    renderWithProviders(<App />, ['/activity']);
    await act(async () => {});

    const link = screen.getByRole('link', {
      name: t('activity.recent.playAgain', { game: t('fractionBalloons.gameName') }),
    });
    link.focus();
    expect(link).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: t('fractionBalloons.gameName') })).toBeInTheDocument();
    });
  });

  it('renders a non-interactive card for a game that is no longer in the registry', async () => {
    resolveWith([session({ id: 'ghost', gameId: 'retiredGame' })]);
    const { container } = await renderActivity();
    expect(screen.getByText(t('activity.unknownGame'))).toBeInTheDocument();
    expect(container.querySelector('a.activity-card')).toBeNull();
  });
});

describe('ActivityPage — what I practised', () => {
  it('groups topics under their grade with session and problem counts', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();

    const gradeTitles = [...container.querySelectorAll('.activity-grade-title')].map((node) => node.textContent);
    expect(gradeTitles).toEqual([t('grades.4'), t('grades.7')]);

    expect(screen.getByText(t('topics.simpleFractions.name'))).toBeInTheDocument();
    expect(screen.getByText(t('topics.coordinateSystem.name'))).toBeInTheDocument();
    const counts = [...container.querySelectorAll('.activity-topic-counts')].map((node) => node.textContent);
    expect(counts.some((text) => text?.includes(t('activity.practiced.sessions', { n: 1 })))).toBe(true);
  });

  it('uses honest practice labels and never claims mastery', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    const statuses = [...container.querySelectorAll('.activity-status')].map((node) => node.textContent);
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(status).not.toMatch(/master|שליט/i);
    }
  });

  it('links a topic card back to its topic page', async () => {
    resolveWith([MIXED_HISTORY[2]]);
    await renderActivity();
    const link = screen.getByRole('link', {
      name: t('activity.practiced.playMore', { topic: t('topics.divisionWithRemainder.name') }),
    });
    expect(link).toHaveAttribute('href', '/grade/4/division-with-remainder');
  });
});

describe('ActivityPage — insight', () => {
  it('shows exactly one encouraging insight', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    const insights = container.querySelectorAll('.activity-insight');
    expect(insights).toHaveLength(1);
    expect(insights[0].textContent).not.toMatch(/fail|weak|poor|כישלון|חלש/i);
  });

  it('links the insight to the suggested topic', async () => {
    resolveWith([session({ id: 'a', gameId: 'cargoStation', completedAt: daysAgo(40) })]);
    await renderActivity();
    expect(screen.getByRole('link', { name: t('activity.insight.action') })).toHaveAttribute(
      'href',
      '/grade/4/division-with-remainder',
    );
  });
});

describe('ActivityPage — time filter', () => {
  it('filters already-loaded sessions client side without re-querying the backend', async () => {
    resolveWith(MIXED_HISTORY);
    const { container } = await renderActivity();
    expect(container.querySelectorAll('.activity-card')).toHaveLength(3);

    await userEvent.click(screen.getByRole('button', { name: t('activity.range.week') }));
    expect(container.querySelectorAll('.activity-card')).toHaveLength(2);
    expect(loadActivityHistory).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: t('activity.range.all') }));
    expect(container.querySelectorAll('.activity-card')).toHaveLength(3);
  });

  it('marks the active range with aria-pressed, not colour alone', async () => {
    resolveWith(MIXED_HISTORY);
    await renderActivity();
    expect(screen.getByRole('button', { name: t('activity.range.all') })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: t('activity.range.week') })).toHaveAttribute('aria-pressed', 'false');
  });

  it('explains an empty range instead of looking broken', async () => {
    resolveWith([session({ id: 'old', gameId: 'cargoStation', completedAt: daysAgo(60) })]);
    await renderActivity();
    await userEvent.click(screen.getByRole('button', { name: t('activity.range.week') }));
    expect(screen.getByText(t('activity.range.empty'))).toBeInTheDocument();
  });
});

describe('ActivityPage — languages', () => {
  it('renders in Hebrew by default', async () => {
    resolveWith(MIXED_HISTORY);
    await renderActivity();
    expect(screen.getByRole('heading', { level: 1, name: 'הפעילות שלי' })).toBeInTheDocument();
    expect(screen.getByText('הנה כל מה שתרגלתם במתמטיקו')).toBeInTheDocument();
  });

  it('renders in English when the language is switched', async () => {
    await useLanguage('en');
    resolveWith(MIXED_HISTORY);
    await renderActivity();
    expect(screen.getByRole('heading', { level: 1, name: 'My Activity' })).toBeInTheDocument();
    expect(screen.getByText('Fraction Balloons')).toBeInTheDocument();
    expect(screen.getByText(t('activity.summary.games'))).toBeInTheDocument();
  });
});
