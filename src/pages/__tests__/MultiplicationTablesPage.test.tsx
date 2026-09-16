import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, resetLanguage, useLanguage } from '../../test/testUtils';
import i18n from '../../i18n';
import { MultiplicationTablesPage } from '../MultiplicationTablesPage';
import type { TrainingActivityDefinition } from '../../types/training';

/**
 * A deterministic question set, so a test always knows which choice is right:
 * question i asks `(i+1) × 2`, with the correct product and one wrong option.
 */
vi.mock('../../data/games/multiplicationTablesData', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../data/games/multiplicationTablesData')>();
  const activity: TrainingActivityDefinition = {
    ...original.multiplicationTablesActivity,
    generateQuestions: ({ count }) =>
      Array.from({ length: count }, (_, index) => ({
        id: `mt-${index}`,
        prompt: `${index + 1} × 2`,
        answer: String((index + 1) * 2),
        options: [String((index + 1) * 2), String((index + 1) * 2 + 1)],
      })),
  };
  return { ...original, multiplicationTablesActivity: activity };
});

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;

const CORRECT_FEEDBACK_MS = 450;
const WRONG_FEEDBACK_MS = 1200;

/** Answers question `index`, spending `thinkMs` on it first. */
async function answer(index: number, correct: boolean, thinkMs: number) {
  await act(async () => {
    vi.advanceTimersByTime(thinkMs);
  });
  const value = correct ? (index + 1) * 2 : (index + 1) * 2 + 1;
  fireEvent.click(screen.getByTestId(`tr-option-${value}`));
  await act(async () => {
    vi.advanceTimersByTime(correct ? CORRECT_FEEDBACK_MS : WRONG_FEEDBACK_MS);
  });
}

/**
 * Plays a whole session. `wrongAt` lists the 0-based questions to get wrong;
 * `thinkMs` is the time spent on every question.
 */
async function playSession(total: number, { wrongAt = [] as number[], thinkMs = 3000 } = {}) {
  for (let index = 0; index < total; index += 1) {
    await answer(index, !wrongAt.includes(index), thinkMs);
  }
  // Let the result be stored and compared with the previous bests.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Backgrounding the tab (phone locked, app switched), as the browser reports it. */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function start({ mode = 'practice', count = 5, difficulty = 'basic' } = {}) {
  if (mode === 'challenge') fireEvent.click(screen.getByTestId('tr-mode-challenge'));
  fireEvent.click(screen.getByTestId(`tr-difficulty-${difficulty}`));
  fireEvent.click(screen.getByTestId(`tr-count-${count}`));
  fireEvent.click(screen.getByTestId('tr-start'));
}

describe('Multiplication Tables — practice mode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    renderWithProviders(<MultiplicationTablesPage />);
  });
  afterEach(() => vi.useRealTimers());

  it('offers every practice length the activity declares', () => {
    for (const count of [5, 10, 20, 50]) {
      expect(screen.getByTestId(`tr-count-${count}`)).toBeInTheDocument();
    }
  });

  it.each([5, 10, 20, 50])('runs a full %i-question practice round', async (count) => {
    start({ count });
    await playSession(count);

    expect(screen.getByTestId('tr-results')).toBeInTheDocument();
    expect(screen.getByText(`${count}/${count}`)).toBeInTheDocument();
    expect(screen.getByText(t('training.results.practiceTitle'))).toBeInTheDocument();
  });

  it('keeps going after a mistake instead of ending the round', async () => {
    start({ count: 5 });
    await answer(0, false, 2000);

    // Straight on to the next question — no elimination, no repeat.
    expect(screen.getByTestId('tr-question')).toHaveTextContent('2 × 2');

    await answer(1, true, 2000);
    await answer(2, true, 2000);
    await answer(3, true, 2000);
    await answer(4, true, 2000);

    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText(t('training.results.accuracyDetail', { percent: 80 }))).toBeInTheDocument();
  });

  it('shows no pace figure and no streak chip in practice', async () => {
    start({ count: 5 });
    expect(screen.queryByTestId('tr-streak')).not.toBeInTheDocument();

    await playSession(5);
    expect(screen.queryByText(t('training.results.paceLabel'))).not.toBeInTheDocument();
    expect(screen.queryByTestId('tr-improvement')).not.toBeInTheDocument();
  });

  it('never puts a clock in front of the child in practice', async () => {
    start({ count: 5 });

    expect(screen.queryByTestId('tr-timer')).not.toBeInTheDocument();
    await answer(0, true, 20_000);
    // Twenty seconds on one question changes nothing on screen: practice is
    // measured internally, but never timed at the child.
    expect(screen.queryByTestId('tr-timer')).not.toBeInTheDocument();

    for (let index = 1; index < 5; index += 1) await answer(index, true, 3000);
    await act(async () => {
      await Promise.resolve();
    });
    // And the summary stays about correctness, with no time anywhere on it.
    expect(screen.queryByTestId('tr-total-time')).not.toBeInTheDocument();
    expect(screen.queryByText(t('training.results.paceUnit'))).not.toBeInTheDocument();
  });

  it('runs the same settings again straight from the results screen', async () => {
    start({ count: 5 });
    await playSession(5);

    fireEvent.click(screen.getByText(t('training.actions.practiceAgain')));

    expect(screen.queryByTestId('tr-results')).not.toBeInTheDocument();
    expect(screen.getByTestId('tr-question')).toHaveTextContent('1 × 2');
  });
});

describe('Multiplication Tables — personal challenge', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    renderWithProviders(<MultiplicationTablesPage />);
  });
  afterEach(() => vi.useRealTimers());

  it('only offers the challenge-eligible lengths', () => {
    fireEvent.click(screen.getByTestId('tr-mode-challenge'));
    expect(screen.queryByTestId('tr-count-5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tr-count-10')).not.toBeInTheDocument();
    expect(screen.getByTestId('tr-count-20')).toBeInTheDocument();
    expect(screen.getByTestId('tr-count-50')).toBeInTheDocument();
  });

  it('shows the streak, resets it on a mistake and reports the longest run', async () => {
    start({ mode: 'challenge', count: 20 });
    expect(screen.getByTestId('tr-streak')).toHaveTextContent(t('training.hud.streak', { value: 0 }));

    await answer(0, true, 1000);
    await answer(1, true, 1000);
    expect(screen.getByTestId('tr-streak')).toHaveTextContent(t('training.hud.streak', { value: 2 }));

    await answer(2, false, 1000);
    expect(screen.getByTestId('tr-streak')).toHaveTextContent(t('training.hud.streak', { value: 0 }));

    for (let index = 3; index < 20; index += 1) await answer(index, true, 1000);
    await act(async () => {
      await Promise.resolve();
    });

    // 17 correct in a row after the mistake is the longest run of the session.
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('19/20')).toBeInTheDocument();
  });

  it('runs a small, subtle clock through the challenge and totals it on the summary', async () => {
    start({ mode: 'challenge', count: 20 });
    expect(screen.getByTestId('tr-timer')).toHaveTextContent('0:00');

    await answer(0, true, 3000);
    // 3s of thinking plus the short feedback beat.
    expect(screen.getByTestId('tr-timer')).toHaveTextContent('0:03');

    await answer(1, true, 3000);
    expect(screen.getByTestId('tr-timer')).toHaveTextContent('0:06');

    for (let index = 2; index < 20; index += 1) await answer(index, true, 3000);
    await act(async () => {
      await Promise.resolve();
    });

    // 20 × 3s of thinking and 20 × 0.45s of feedback: 1:09 in `M:SS`.
    expect(screen.getByTestId('tr-total-time')).toHaveTextContent('1:09');
  });

  it('leaves time the app was in the background out of the measured pace', async () => {
    start({ mode: 'challenge', count: 20 });

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('tr-timer')).toHaveTextContent('0:02');

    // The child locks their phone for ten seconds in the middle of question 1.
    await act(async () => {
      setVisibility('hidden');
      vi.advanceTimersByTime(10_000);
      setVisibility('visible');
    });
    expect(screen.getByTestId('tr-timer')).toHaveTextContent('0:02');

    await answer(0, true, 1000);
    for (let index = 1; index < 20; index += 1) await answer(index, true, 3000);
    await act(async () => {
      await Promise.resolve();
    });

    // Every question took 3 active seconds. Counting the ten hidden ones would
    // have reported 3.5 and quietly spoiled the child's pace.
    expect(screen.queryByText('3.5')).not.toBeInTheDocument();
    expect(screen.getByText(t('training.results.paceLabel'))).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('replays the identical activity, difficulty, length and mode on "try again"', async () => {
    start({ mode: 'challenge', count: 20, difficulty: 'hard' });
    await playSession(20, { thinkMs: 3000 });
    expect(screen.getByText(t('training.results.firstAttempt'))).toBeInTheDocument();

    fireEvent.click(screen.getByText(t('training.actions.tryAgainSame')));

    // Straight back into a challenge — no settings screen in between.
    expect(screen.queryByTestId('tr-start')).not.toBeInTheDocument();
    expect(screen.getByTestId('tr-streak')).toBeInTheDocument();
    expect(screen.getByTestId('tr-timer')).toBeInTheDocument();

    await playSession(20, { thinkMs: 2000 });

    // Judged against the first run, which is only possible if the activity,
    // difficulty, question count and mode were all carried over unchanged.
    expect(screen.queryByText(t('training.results.firstAttempt'))).not.toBeInTheDocument();
    expect(screen.getByText(t('training.results.record.pace', { seconds: 2, improvement: 1 }))).toBeInTheDocument();
  });

  it('treats the first result as a saved baseline, not a record', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 3000 });

    expect(screen.getByText(t('training.results.firstAttempt'))).toBeInTheDocument();
    expect(screen.queryByText(/./, { selector: '.tr-record' })).not.toBeInTheDocument();
    // Pace is still reported — the baseline to beat next time.
    expect(screen.getByText(t('training.results.paceLabel'))).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('celebrates a faster flawless retry of the identical configuration', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 3000 });

    fireEvent.click(screen.getByText(t('training.actions.tryAgainSame')));
    await playSession(20, { thinkMs: 2500 });

    expect(screen.getByText(t('training.results.record.pace', { seconds: 2.5, improvement: 0.5 }))).toBeInTheDocument();
  });

  it('does not claim an improvement of zero seconds for a hair-thin speed record', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 3000 });

    fireEvent.click(screen.getByText(t('training.actions.tryAgainSame')));
    await playSession(20, { thinkMs: 2980 });

    expect(screen.getByText(t('training.results.record.paceNarrow', { seconds: 3 }))).toBeInTheDocument();
    expect(screen.queryByText(/שיפור של 0 שניות/)).not.toBeInTheDocument();
  });

  it('never turns a faster but sloppier run into a speed record', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 3000 });

    fireEvent.click(screen.getByText(t('training.actions.tryAgainSame')));
    await playSession(20, { thinkMs: 1000, wrongAt: [4, 11] });

    expect(screen.getByText(t('training.results.paceNeedsPerfect'))).toBeInTheDocument();
    expect(screen.queryByText(/שיא מהירות חדש/)).not.toBeInTheDocument();
    expect(screen.getByText(t('training.results.noNewRecords'))).toBeInTheDocument();
    // The flawless slower run still holds the pace record.
    expect(screen.getByText(t('training.results.paceValue', { seconds: 3 }))).toBeInTheDocument();
    expect(screen.getByText(t('training.results.bestPace'))).toBeInTheDocument();
  });

  it('reports a longer streak as its own record, independently of pace', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 2000, wrongAt: [9] });

    fireEvent.click(screen.getByText(t('training.actions.tryAgainSame')));
    await playSession(20, { thinkMs: 4000, wrongAt: [2] });

    // 17 in a row beats the previous best of 10, even though the run was slower.
    expect(screen.getByText(t('training.results.record.streak', { value: 17 }))).toBeInTheDocument();
  });

  it('keeps a different question count as a separate record', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 3000 });
    expect(screen.getByText(t('training.results.firstAttempt'))).toBeInTheDocument();

    fireEvent.click(screen.getByText(t('training.actions.changeSettings')));
    start({ mode: 'challenge', count: 50 });
    await playSession(50, { thinkMs: 5000 });

    // A brand-new configuration, so this is a baseline again rather than a
    // much slower result judged against the 20-question record.
    expect(screen.getByText(t('training.results.firstAttempt'))).toBeInTheDocument();
  });

  it('keeps a different difficulty as a separate record', async () => {
    start({ mode: 'challenge', count: 20, difficulty: 'basic' });
    await playSession(20, { thinkMs: 3000 });

    fireEvent.click(screen.getByText(t('training.actions.changeSettings')));
    start({ mode: 'challenge', count: 20, difficulty: 'hard' });
    await playSession(20, { thinkMs: 6000 });

    expect(screen.getByText(t('training.results.firstAttempt'))).toBeInTheDocument();
  });

  it('remembers a guest record across a fresh mount of the page', async () => {
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 3000 });
    cleanup();

    // A reload: nothing is left in memory, only what localStorage kept.
    renderWithProviders(<MultiplicationTablesPage />);
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 2000 });

    expect(screen.getByText(t('training.results.record.pace', { seconds: 2, improvement: 1 }))).toBeInTheDocument();
  });
});

describe('Multiplication Tables — English', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(async () => {
    vi.useRealTimers();
    await resetLanguage();
  });

  it('renders the whole flow in English', async () => {
    await useLanguage('en');
    renderWithProviders(<MultiplicationTablesPage />);

    expect(screen.getByText('Personal challenge')).toBeInTheDocument();
    start({ mode: 'challenge', count: 20 });
    await playSession(20, { thinkMs: 2000 });

    expect(screen.getByText('Challenge finished!')).toBeInTheDocument();
    expect(screen.getByText('Pace')).toBeInTheDocument();
    expect(screen.getByText('sec per question')).toBeInTheDocument();
  });
});
