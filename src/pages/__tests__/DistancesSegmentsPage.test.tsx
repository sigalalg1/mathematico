import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { DistancesSegmentsPage } from '../DistancesSegmentsPage';

// Three deterministic segments: a positive horizontal one, a negative vertical
// one, and one that crosses zero — the three cases the stages teach.
vi.mock('../../data/games/distancesSegmentsData', () => ({
  DISTANCES_SEGMENTS_TOTAL: 3,
  buildDistancesSegmentsStages: () => [
    {
      id: 'stage1',
      nameKey: 'distancesSegments.stages.stage1.name',
      introKey: 'distancesSegments.stages.stage1.intro',
      challenges: [{ id: 'stage1-0', a: { x: 1, y: 2 }, b: { x: 5, y: 2 }, axis: 'x', length: 4 }],
    },
    {
      id: 'stage2',
      nameKey: 'distancesSegments.stages.stage3.name',
      introKey: 'distancesSegments.stages.stage3.intro',
      challenges: [{ id: 'stage2-0', a: { x: -3, y: -1 }, b: { x: -3, y: -5 }, axis: 'y', length: 4 }],
    },
    {
      id: 'stage3',
      nameKey: 'distancesSegments.stages.stage4.name',
      introKey: 'distancesSegments.stages.stage4.intro',
      challenges: [{ id: 'stage3-0', a: { x: -2, y: 3 }, b: { x: 4, y: 3 }, axis: 'x', length: 6 }],
    },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const answerBox = () => screen.getByLabelText(t('distancesSegments.inputLabel'));
const checkButton = () => screen.getByRole('button', { name: t('distancesSegments.actions.check') });

function answer(value: string) {
  fireEvent.change(answerBox(), { target: { value } });
  fireEvent.click(checkButton());
}

describe('Distances and Segments', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('accepts the length of a positive horizontal segment', () => {
    renderWithProviders(<DistancesSegmentsPage />);
    answer('4');
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('does not advance on a wrong length and leaves the input usable for a retry', () => {
    renderWithProviders(<DistancesSegmentsPage />);
    answer('6');
    expect(screen.getByText(t('distancesSegments.feedback.incorrectHint'))).toBeInTheDocument();
    expect(progress()).toBe('1');
    // Regression guard: retry in place after a miss.
    expect(answerBox()).not.toBeDisabled();
    expect(checkButton()).not.toBeDisabled();

    fireEvent.change(answerBox(), { target: { value: '4' } });
    fireEvent.click(checkButton());
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('accepts the length of a segment between two negative coordinates', () => {
    renderWithProviders(<DistancesSegmentsPage />);
    answer('4');
    act(() => vi.advanceTimersByTime(800));
    answer('4'); // (-3,-1) to (-3,-5)
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('3');
  });

  it('accepts the length of a segment that crosses zero, and completes the round', () => {
    renderWithProviders(<DistancesSegmentsPage />);
    answer('4');
    act(() => vi.advanceTimersByTime(800));
    answer('4');
    act(() => vi.advanceTimersByTime(800));
    answer('6'); // (-2,3) to (4,3) spans the Y axis: 2 + 4
    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText(t('distancesSegments.completion.title'))).toBeInTheDocument();
    expect(screen.getByText(t('distancesSegments.completion.firstTry', { count: 3 }))).toBeInTheDocument();
  });

  it('rejects a signed answer being typed at all (length is never negative)', () => {
    renderWithProviders(<DistancesSegmentsPage />);
    fireEvent.change(answerBox(), { target: { value: '-4' } });
    expect(answerBox()).toHaveValue('');
  });
});
