import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { CoordinateDetectivePage } from '../CoordinateDetectivePage';

vi.mock('../../data/games/coordinateDetectiveData', () => ({
  COORDINATE_DETECTIVE_TOTAL: 2,
  buildCoordinateDetectiveChallenges: () => [
    {
      id: 'detective-0',
      target: { x: 2, y: 5 },
      wrongAnswer: { x: 5, y: 2 },
      category: 'swappedXY',
      options: ['xSignError', 'swappedXY', 'ySignError'],
    },
    {
      id: 'detective-1',
      target: { x: -3, y: 4 },
      wrongAnswer: { x: 3, y: 4 },
      category: 'xSignError',
      options: ['swappedXY', 'xSignError', 'zeroConfusion'],
    },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const category = (id: string) => screen.getByRole('button', { name: t(`coordinateDetective.categories.${id}`) });
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');

describe('Coordinate Detective', () => {
  it('shows the correct point, the wrong answer, and the mistake choices', () => {
    renderWithProviders(<CoordinateDetectivePage />);
    expect(screen.getByText(t('coordinateDetective.prompt'))).toBeInTheDocument();
    expect(screen.getByText(t('coordinateDetective.legendTarget'))).toBeInTheDocument();
    expect(screen.getByText(t('coordinateDetective.legendWrong'))).toBeInTheDocument();
    expect(category('swappedXY')).toBeInTheDocument();
  });

  it('recognises a swapped-coordinates mistake', () => {
    renderWithProviders(<CoordinateDetectivePage />);
    fireEvent.click(category('swappedXY'));
    expect(screen.queryByText(t('coordinateDetective.feedback.incorrectHint'))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('quiz.actions.next') })).toBeInTheDocument();
  });

  it('is intentionally single-attempt: a wrong pick locks the options and offers Next', () => {
    renderWithProviders(<CoordinateDetectivePage />);
    fireEvent.click(category('xSignError'));

    expect(screen.getByText(t('coordinateDetective.feedback.incorrectHint'))).toBeInTheDocument();
    for (const id of ['xSignError', 'swappedXY', 'ySignError']) {
      expect(category(id)).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: t('quiz.actions.next') })).toBeInTheDocument();
    expect(progress()).toBe('1');
  });

  it('moves to the next case only when Next is pressed', () => {
    renderWithProviders(<CoordinateDetectivePage />);
    fireEvent.click(category('swappedXY'));
    expect(progress()).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: t('quiz.actions.next') }));
    expect(progress()).toBe('2');
    expect(category('zeroConfusion')).toBeInTheDocument();
  });

  it('shows the completion screen after the last case', () => {
    renderWithProviders(<CoordinateDetectivePage />);
    fireEvent.click(category('swappedXY'));
    fireEvent.click(screen.getByRole('button', { name: t('quiz.actions.next') }));
    fireEvent.click(category('xSignError'));
    fireEvent.click(screen.getByRole('button', { name: t('quiz.actions.next') }));

    expect(screen.getByText(t('coordinateDetective.completion.title'))).toBeInTheDocument();
    expect(screen.getByText(t('coordinateDetective.completion.firstTry', { count: 2 }))).toBeInTheDocument();
  });
});
