import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { clickGridAt, renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { DrawByCoordinatesPage } from '../DrawByCoordinatesPage';

const DRAWING = {
  id: 'test-shape',
  nameKey: 'drawByCoordinates.drawings.house',
  emoji: '🏠',
  points: [
    { x: 0, y: 0 },
    { x: 3, y: 0 },
    { x: 3, y: 2 },
  ],
};

vi.mock('../../data/games/drawByCoordinatesData', () => ({
  DRAW_BY_COORDINATES_MIN: -5,
  DRAW_BY_COORDINATES_MAX: 5,
  getDrawings: () => [DRAWING],
  pickRandomDrawing: () => DRAWING,
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progressText = (current: number) => t('drawByCoordinates.progress', { current, total: 3 });

describe('Draw by Coordinates', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks for the first point of the drawing', () => {
    renderWithProviders(<DrawByCoordinatesPage />);
    expect(screen.getByText(progressText(1))).toBeInTheDocument();
    expect(screen.getByText(t('drawByCoordinates.promptLead'), { exact: false })).toBeInTheDocument();
  });

  it('advances to the next point when the right coordinate is clicked', () => {
    const { container } = renderWithProviders(<DrawByCoordinatesPage />);
    clickGridAt(container, 0, 0);
    expect(screen.getByText(progressText(2))).toBeInTheDocument();
    expect(container.querySelectorAll('.draw-point')).toHaveLength(1);
  });

  it('does not advance on a wrong click and hints at which coordinate is off', () => {
    const { container } = renderWithProviders(<DrawByCoordinatesPage />);
    clickGridAt(container, 0, 0);
    clickGridAt(container, 3, 4); // right X, wrong Y

    expect(screen.getByText(progressText(2))).toBeInTheDocument();
    expect(screen.getByText(t('drawByCoordinates.feedback.checkY'))).toBeInTheDocument();
    // The plane stays clickable so the student can simply try again.
    expect(container.querySelector('.grid-click-catcher')).not.toBeNull();

    clickGridAt(container, 3, 0);
    expect(screen.getByText(progressText(3))).toBeInTheDocument();
  });

  it('hints about X when only the X coordinate is wrong', () => {
    const { container } = renderWithProviders(<DrawByCoordinatesPage />);
    clickGridAt(container, -2, 0);
    expect(screen.getByText(t('drawByCoordinates.feedback.checkX'))).toBeInTheDocument();
  });

  it('completes the drawing when the final point is placed', () => {
    const { container } = renderWithProviders(<DrawByCoordinatesPage />);
    clickGridAt(container, 0, 0);
    clickGridAt(container, 3, 0);
    clickGridAt(container, 3, 2);

    expect(screen.getByText(t('drawByCoordinates.completion.title'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('drawByCoordinates.actions.anotherDrawing') })).toBeInTheDocument();
  });

  it('starts a new drawing from the completion screen', () => {
    const { container } = renderWithProviders(<DrawByCoordinatesPage />);
    clickGridAt(container, 0, 0);
    clickGridAt(container, 3, 0);
    clickGridAt(container, 3, 2);

    act(() => {
      screen.getByRole('button', { name: t('drawByCoordinates.actions.anotherDrawing') }).click();
    });
    expect(screen.getByText(progressText(1))).toBeInTheDocument();
  });
});
