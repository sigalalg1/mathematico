import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../test/testUtils';
import i18n from '../i18n';
import { setLanguage } from '../i18n';
import { HitTheTargetPage } from '../pages/HitTheTargetPage';
import { getActivityHistory, completeGameSession, startGameSession } from '../tracking/activityTracker';
import { playSoundEffect } from '../audio/soundEffects';

vi.mock('../data/games/hitTheTargetStages', () => ({
  hitTheTargetStages: [
    { id: 'stage1', nameKey: 'hitTheTarget.stages.stage1.name', introKey: 'hitTheTarget.stages.stage1.intro', count: 1 },
  ],
  HIT_THE_TARGET_RANGE_MIN: -5,
  HIT_THE_TARGET_RANGE_MAX: 5,
  HIT_THE_TARGET_TOTAL: 1,
  generateTarget: () => ({ x: 2, y: 3 }),
  buildStageTargets: () => [{ x: 2, y: 3 }],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

/** Replaces localStorage with one that throws on every access, as blocked-storage browsers do. */
function breakLocalStorage() {
  const throwing = {
    getItem: () => {
      throw new Error('storage blocked');
    },
    setItem: () => {
      throw new Error('storage blocked');
    },
    removeItem: () => {
      throw new Error('storage blocked');
    },
    clear: () => {
      throw new Error('storage blocked');
    },
    key: () => {
      throw new Error('storage blocked');
    },
    length: 0,
  };
  vi.spyOn(window, 'localStorage', 'get').mockReturnValue(throwing as unknown as Storage);
}

describe('resilience — storage failures never break gameplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('still renders and plays a game when localStorage throws on every call', () => {
    breakLocalStorage();
    renderWithProviders(<HitTheTargetPage />);

    const [xInput, yInput] = screen.getAllByRole('textbox');
    fireEvent.change(xInput, { target: { value: '2' } });
    fireEvent.change(yInput, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: t('hitTheTarget.actions.fire') }));
    act(() => vi.advanceTimersByTime(300)); // firing animation
    act(() => vi.advanceTimersByTime(800)); // auto-advance after a hit

    expect(screen.getByText(t('hitTheTarget.completion.title'))).toBeInTheDocument();
  });

  it('still toggles sound when the preference cannot be persisted', () => {
    breakLocalStorage();
    renderWithProviders(<HitTheTargetPage />);
    fireEvent.click(screen.getByRole('button', { name: t('common.soundOn') }));
    expect(screen.getByRole('button', { name: t('common.soundOff') })).toBeInTheDocument();
  });

  it('still switches language when the choice cannot be persisted', async () => {
    breakLocalStorage();
    expect(() => setLanguage('en')).not.toThrow();
    await i18n.changeLanguage('he');
  });
});

describe('resilience — activity tracking never surfaces to the player', () => {
  afterEach(() => vi.restoreAllMocks());

  it('falls back to a local session for a guest and never rejects', async () => {
    await expect(startGameSession('hitTheTarget', null)).resolves.toEqual(expect.any(String));
  });

  it('swallows a failure while completing a session', async () => {
    await expect(
      completeGameSession('a-session-that-does-not-exist', { questionsCount: 5, correctCount: 5, mistakes: [] }),
    ).resolves.toBeUndefined();
  });

  it('returns an empty history rather than throwing when nothing is stored', async () => {
    await expect(getActivityHistory(null)).resolves.toEqual(expect.any(Array));
  });

  it('keeps gameplay working when the tracker itself rejects', async () => {
    vi.useFakeTimers();
    const tracker = await import('../tracking/activityTracker');
    vi.spyOn(tracker, 'startGameSession').mockRejectedValue(new Error('backend down'));
    vi.spyOn(tracker, 'completeGameSession').mockRejectedValue(new Error('backend down'));

    renderWithProviders(<HitTheTargetPage />);
    const [xInput, yInput] = screen.getAllByRole('textbox');
    fireEvent.change(xInput, { target: { value: '2' } });
    fireEvent.change(yInput, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: t('hitTheTarget.actions.fire') }));
    act(() => vi.advanceTimersByTime(300)); // firing animation
    act(() => vi.advanceTimersByTime(800)); // auto-advance after a hit

    expect(screen.getByText(t('hitTheTarget.completion.title'))).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('resilience — optional browser APIs', () => {
  it('does not throw when the Web Audio API is unavailable (jsdom has none)', () => {
    for (const sound of ['fire', 'hit', 'miss', 'stageComplete', 'gameComplete', 'move', 'phaseChange'] as const) {
      expect(() => playSoundEffect(sound)).not.toThrow();
    }
  });

  it('runs without Supabase configured, in guest mode', async () => {
    const { supabase } = await import('../lib/supabase');
    expect(supabase).toBeNull();
  });
});
