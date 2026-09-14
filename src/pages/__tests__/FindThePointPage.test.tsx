import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { FindThePointPage } from '../FindThePointPage';

vi.mock('../../data/games/findThePointData', () => ({
  FIND_THE_POINT_MIN: -5,
  FIND_THE_POINT_MAX: 5,
  FIND_THE_POINT_TOTAL: 2,
  buildFindThePointStages: () => [
    {
      id: 'stage1',
      nameKey: 'findThePoint.stages.stage1.name',
      introKey: 'findThePoint.stages.stage1.intro',
      challenges: [
        {
          id: 'stage1-0',
          correct: { x: 2, y: 3 },
          correctOptionId: 'opt-a',
          options: [
            { id: 'opt-a', point: { x: 2, y: 3 }, label: 'A' },
            { id: 'opt-b', point: { x: 3, y: 2 }, label: 'B' },
            { id: 'opt-c', point: { x: -2, y: 3 }, label: 'C' },
            { id: 'opt-d', point: { x: 2, y: -3 }, label: 'D' },
          ],
        },
      ],
    },
    {
      id: 'stage2',
      nameKey: 'findThePoint.stages.stage2.name',
      introKey: 'findThePoint.stages.stage2.intro',
      challenges: [
        {
          id: 'stage2-0',
          correct: { x: -4, y: -1 },
          correctOptionId: 'opt-w',
          options: [
            { id: 'opt-w', point: { x: -4, y: -1 }, label: 'A' },
            { id: 'opt-x', point: { x: 4, y: -1 }, label: 'B' },
            { id: 'opt-y', point: { x: -4, y: 1 }, label: 'C' },
            { id: 'opt-z', point: { x: -1, y: -4 }, label: 'D' },
          ],
        },
      ],
    },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const point = (label: string) => screen.getByRole('button', { name: label });

describe('Find the Point', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows four labelled, clickable points on the plane', () => {
    renderWithProviders(<FindThePointPage />);
    for (const label of ['A', 'B', 'C', 'D']) {
      expect(point(label)).toBeInTheDocument();
    }
    expect(screen.getByText(t('findThePoint.promptLead'), { exact: false })).toBeInTheDocument();
  });

  it('advances when the point matching the shown pair is clicked', () => {
    renderWithProviders(<FindThePointPage />);
    expect(progress()).toBe('1');
    fireEvent.click(point('A'));
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('does not advance on a wrong point and keeps every point clickable for a retry', () => {
    const { container } = renderWithProviders(<FindThePointPage />);
    fireEvent.click(point('B')); // the swapped-coordinates distractor

    expect(progress()).toBe('1');
    expect(screen.getByText(t('findThePoint.feedback.swapped'))).toBeInTheDocument();
    // Regression guard: an incorrect answer must not disable the points.
    expect(container.querySelectorAll('.clickable-point.is-disabled')).toHaveLength(0);
    for (const label of ['A', 'B', 'C', 'D']) {
      expect(point(label)).toHaveAttribute('tabindex', '0');
    }

    fireEvent.click(point('A'));
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('locks the points only once the answer is correct', () => {
    const { container } = renderWithProviders(<FindThePointPage />);
    fireEvent.click(point('A'));
    expect(container.querySelectorAll('.clickable-point.is-disabled')).toHaveLength(4);
  });

  it('explains an X sign mistake rather than just marking it wrong', () => {
    renderWithProviders(<FindThePointPage />);
    fireEvent.click(point('C')); // (-2, 3) instead of (2, 3)
    const expected = t('findThePoint.feedback.xSign', {
      direction: t('findThePoint.words.right'),
      sign: t('findThePoint.words.positive'),
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('reaches the completion screen after the last challenge', () => {
    renderWithProviders(<FindThePointPage />);
    fireEvent.click(point('A'));
    act(() => vi.advanceTimersByTime(800));
    fireEvent.click(point('A'));
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText(t('findThePoint.completion.title'))).toBeInTheDocument();
  });
});
