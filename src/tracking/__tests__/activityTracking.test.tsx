import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import type { Session, User } from '@supabase/supabase-js';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { HitTheTargetPage } from '../../pages/HitTheTargetPage';
import { ActivityPage } from '../../pages/ActivityPage';
import { getLocalActivityHistory } from '../localActivityStore';
import { startSupabaseSession, completeSupabaseSession, getSupabaseActivityHistory } from '../supabaseActivityStore';

// One deterministic, single-question round so a game can be finished in a test.
vi.mock('../../data/games/hitTheTargetStages', () => ({
  hitTheTargetStages: [
    { id: 'stage1', nameKey: 'hitTheTarget.stages.stage1.name', introKey: 'hitTheTarget.stages.stage1.intro', count: 1 },
  ],
  HIT_THE_TARGET_RANGE_MIN: -5,
  HIT_THE_TARGET_RANGE_MAX: 5,
  HIT_THE_TARGET_TOTAL: 1,
  generateTarget: () => ({ x: 2, y: 3 }),
  buildStageTargets: () => [{ x: 2, y: 3 }],
}));

vi.mock('../supabaseActivityStore', () => ({
  startSupabaseSession: vi.fn(),
  completeSupabaseSession: vi.fn().mockResolvedValue(undefined),
  getSupabaseActivityHistory: vi.fn().mockResolvedValue([]),
}));

type FakeAuth = Record<string, ReturnType<typeof vi.fn>>;
const holder: { client: { auth: FakeAuth } | null } = { client: null };

vi.mock('../../lib/supabase', () => ({
  get supabase() {
    return holder.client;
  },
  get isSupabaseConfigured() {
    return holder.client !== null;
  },
}));

const user = { id: 'user-1', email: 'kid@example.com' } as User;
const session = { user } as Session;

let authStateCallback: ((event: string, session: Session | null) => void) | null = null;

/** `sessionPromise` lets a test hold the initial session lookup open to exercise the load race. */
function configureSupabase(sessionPromise: Promise<{ data: { session: Session | null } }>) {
  holder.client = {
    auth: {
      getSession: vi.fn(() => sessionPromise),
      onAuthStateChange: vi.fn((cb: (event: string, session: Session | null) => void) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

/** Plays the single-question round to completion. */
function playRound() {
  const [xInput, yInput] = screen.getAllByRole('textbox');
  fireEvent.change(xInput, { target: { value: '2' } });
  fireEvent.change(yInput, { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: t('hitTheTarget.actions.fire') }));
  act(() => vi.advanceTimersByTime(300));
  act(() => vi.advanceTimersByTime(800));
}

beforeEach(() => {
  holder.client = null;
  authStateCallback = null;
  localStorage.clear();
  vi.mocked(startSupabaseSession).mockReset();
  vi.mocked(completeSupabaseSession).mockClear();
  vi.mocked(getSupabaseActivityHistory).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('scenarios 2 & 7 — a guest plays and their progress persists locally', () => {
  it('records a completed round in localStorage and shows it on the activity page after a reload', async () => {
    vi.useFakeTimers();
    const { unmount } = renderWithProviders(<HitTheTargetPage />);
    await act(async () => {}); // session opens asynchronously

    playRound();
    expect(screen.getByText(t('hitTheTarget.completion.title'))).toBeInTheDocument();
    await act(async () => {});

    const history = getLocalActivityHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ gameId: 'hitTheTarget', userId: null, correctCount: 1, questionsCount: 1 });

    // Re-mounting with the same localStorage is what a page refresh looks like.
    unmount();
    vi.useRealTimers();
    renderWithProviders(<ActivityPage />, ['/activity']);
    expect(await screen.findByText(t('games.hitTheTarget.name'))).toBeInTheDocument();
    expect(startSupabaseSession).not.toHaveBeenCalled();
  });
});

describe('scenario 8 — a signed-in student’s activity goes to Supabase', () => {
  it('opens the session against Supabase, not localStorage, once auth has resolved', async () => {
    vi.mocked(startSupabaseSession).mockResolvedValue({
      id: 'remote-session',
      userId: user.id,
      gameId: 'hitTheTarget',
      startedAt: new Date().toISOString(),
      completedAt: null,
      questionsCount: 0,
      correctCount: 0,
      mistakes: [],
    });
    configureSupabase(Promise.resolve({ data: { session } }));

    vi.useFakeTimers();
    renderWithProviders(<HitTheTargetPage />);
    await act(async () => {});

    expect(startSupabaseSession).toHaveBeenCalledWith('hitTheTarget', user.id);
    playRound();
    await act(async () => {});
    expect(completeSupabaseSession).toHaveBeenCalledWith(
      'remote-session',
      expect.objectContaining({ questionsCount: 1, correctCount: 1 }),
    );
    expect(getLocalActivityHistory()).toHaveLength(0);
  });

  it('does not open a guest session while the stored session is still loading (load race)', async () => {
    let resolveSession: (value: { data: { session: Session | null } }) => void = () => {};
    configureSupabase(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    vi.mocked(startSupabaseSession).mockResolvedValue(null);

    renderWithProviders(<HitTheTargetPage />);
    await act(async () => {});
    // Auth hasn't resolved yet: nothing may be tracked in either backend.
    expect(startSupabaseSession).not.toHaveBeenCalled();
    expect(localStorage.getItem('mathematico-guest-activity')).toBeNull();

    await act(async () => {
      resolveSession({ data: { session } });
    });
    expect(startSupabaseSession).toHaveBeenCalledTimes(1);
    expect(startSupabaseSession).toHaveBeenCalledWith('hitTheTarget', user.id);
  });

  it('falls back to a local session when the Supabase insert fails', async () => {
    vi.mocked(startSupabaseSession).mockRejectedValue(new Error('row level security'));
    configureSupabase(Promise.resolve({ data: { session } }));

    vi.useFakeTimers();
    renderWithProviders(<HitTheTargetPage />);
    await act(async () => {});
    playRound();
    await act(async () => {});

    expect(screen.getByText(t('hitTheTarget.completion.title'))).toBeInTheDocument();
    expect(getLocalActivityHistory()).toHaveLength(1);
  });
});

describe('scenario 6 — auth changes never interrupt gameplay', () => {
  it('keeps the round playable when the student signs out mid-game', async () => {
    vi.mocked(startSupabaseSession).mockResolvedValue(null);
    configureSupabase(Promise.resolve({ data: { session } }));

    vi.useFakeTimers();
    renderWithProviders(<HitTheTargetPage />);
    await act(async () => {});

    await act(async () => authStateCallback?.('SIGNED_OUT', null));

    playRound();
    expect(screen.getByText(t('hitTheTarget.completion.title'))).toBeInTheDocument();
  });
});
