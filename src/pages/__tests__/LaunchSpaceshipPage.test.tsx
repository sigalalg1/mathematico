import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { clickGridAt, renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { LaunchSpaceshipPage } from '../LaunchSpaceshipPage';

// One guided destination followed by one direct (click-the-plane) destination.
vi.mock('../../data/games/launchSpaceshipStages', () => ({
  LAUNCH_RANGE_MIN: -5,
  LAUNCH_RANGE_MAX: 5,
  LAUNCH_SPACESHIP_TOTAL: 2,
  launchSpaceshipStages: [
    { id: 'stage1', nameKey: 'launchSpaceship.stages.stage1.name', introKey: 'launchSpaceship.stages.stage1.intro', count: 1, mode: 'guided' },
    { id: 'stage4', nameKey: 'launchSpaceship.stages.stage4.name', introKey: 'launchSpaceship.stages.stage4.intro', count: 1, mode: 'direct' },
  ],
  generateDestination: () => ({ x: 2, y: 1 }),
  buildStageDestinations: (stageId: string) => (stageId === 'stage1' ? [{ x: 2, y: 1 }] : [{ x: -3, y: 2 }]),
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const arrow = (direction: 'left' | 'right' | 'up' | 'down') =>
  screen.getByRole('button', { name: t(`exercises.meetTheAxes.options.${direction}`) });

describe('Launch the Spaceship', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts in the guided X phase with left/right controls pinned LTR', () => {
    const { container } = renderWithProviders(<LaunchSpaceshipPage />);
    expect(screen.getByText(t('launchSpaceship.destinationLabel'))).toBeInTheDocument();
    expect(arrow('left')).toBeInTheDocument();
    expect(arrow('right')).toBeInTheDocument();
    expect(container.querySelector('.launch-spaceship-controls')).toHaveAttribute('dir', 'ltr');
  });

  it('switches from the X phase to the Y phase only once X matches the destination', () => {
    renderWithProviders(<LaunchSpaceshipPage />);
    fireEvent.click(arrow('right'));
    expect(screen.queryByText(t('launchSpaceship.feedback.xDone'))).not.toBeInTheDocument();

    fireEvent.click(arrow('right')); // x = 2, matches
    expect(screen.getByText(t('launchSpaceship.feedback.xDone'))).toBeInTheDocument();
    expect(arrow('up')).toBeInTheDocument();
    expect(arrow('down')).toBeInTheDocument();
  });

  it('hints at the right direction after repeatedly moving away from the destination', () => {
    renderWithProviders(<LaunchSpaceshipPage />);
    fireEvent.click(arrow('left'));
    fireEvent.click(arrow('left'));
    const expected = t('launchSpaceship.hints.direction', {
      axis: 'X',
      sign: t('launchSpaceship.words.positive'),
      direction: t('launchSpaceship.words.right'),
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('advances to the next destination after arriving', () => {
    renderWithProviders(<LaunchSpaceshipPage />);
    fireEvent.click(arrow('right'));
    fireEvent.click(arrow('right'));
    fireEvent.click(arrow('up'));
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('validates a directly clicked destination: a wrong point does not finish the round', () => {
    const { container } = renderWithProviders(<LaunchSpaceshipPage />);
    fireEvent.click(arrow('right'));
    fireEvent.click(arrow('right'));
    fireEvent.click(arrow('up'));
    act(() => vi.advanceTimersByTime(800));

    clickGridAt(container, 3, 2); // X sign error
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText(t('launchSpaceship.completion.title'))).not.toBeInTheDocument();
    expect(container.querySelector('.grid-click-catcher')).not.toBeNull();

    clickGridAt(container, -3, 2);
    act(() => vi.advanceTimersByTime(500)); // flight animation
    act(() => vi.advanceTimersByTime(800)); // auto-advance after arrival
    expect(screen.getByText(t('launchSpaceship.completion.title'))).toBeInTheDocument();
  });
});
