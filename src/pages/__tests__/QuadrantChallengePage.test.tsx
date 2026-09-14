import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { clickGridAt, renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { QuadrantChallengePage } from '../QuadrantChallengePage';

vi.mock('../../data/games/quadrantChallengeData', () => ({
  quadrantSigns: {
    1: { x: '+', y: '+' },
    2: { x: '-', y: '+' },
    3: { x: '-', y: '-' },
    4: { x: '+', y: '-' },
  },
  QUADRANT_CHALLENGE_TOTAL: 3,
  buildQuadrantChallengeStages: () => [
    {
      id: 'stage1',
      nameKey: 'quadrantChallenge.stages.stage1.name',
      introKey: 'quadrantChallenge.stages.stage1.intro',
      challenges: [
        {
          id: 'stage1-a',
          kind: 'click',
          promptKey: 'quadrantChallenge.prompts.whichQuadrant',
          point: { x: -3, y: 2 },
          correctLocation: 2,
        },
      ],
    },
    {
      id: 'stage2',
      nameKey: 'quadrantChallenge.stages.stage4.name',
      introKey: 'quadrantChallenge.stages.stage4.intro',
      challenges: [
        {
          id: 'stage2-a',
          kind: 'signs',
          promptKey: 'quadrantChallenge.prompts.whichSigns',
          highlightQuadrant: 3,
          correctSigns: { x: '-', y: '-' },
        },
      ],
    },
    {
      id: 'stage3',
      nameKey: 'quadrantChallenge.stages.stage5.name',
      introKey: 'quadrantChallenge.stages.stage5.intro',
      challenges: [
        {
          id: 'stage3-a',
          kind: 'choice',
          promptKey: 'quadrantChallenge.prompts.whereIsThisPoint',
          pair: { x: 0, y: 3 },
          correctLocation: 'yAxis',
          options: [
            { id: 1, labelKey: 'quadrantChallenge.locations.quadrant1' },
            { id: 'xAxis', labelKey: 'quadrantChallenge.locations.xAxis' },
            { id: 'yAxis', labelKey: 'quadrantChallenge.locations.yAxis' },
            { id: 'origin', labelKey: 'quadrantChallenge.locations.origin' },
          ],
        },
      ],
    },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');

/** Each sign button carries its own accessible name, e.g. "X +" / "Y −". */
function signButton(axis: 'x' | 'y', sign: 'plus' | 'minus') {
  return screen.getByRole('button', {
    name: `${t(`quadrantChallenge.signLabels.${axis}`)} ${t(`quadrantChallenge.signLabels.${sign}`)}`,
  });
}

describe('Quadrant Challenge', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('asks which quadrant a point is in and advances when the right quadrant is clicked', () => {
    const { container } = renderWithProviders(<QuadrantChallengePage />);
    expect(screen.getByText(t('quadrantChallenge.prompts.whichQuadrant'))).toBeInTheDocument();
    expect(progress()).toBe('1');

    clickGridAt(container, -3, 2); // quadrant II
    act(() => vi.advanceTimersByTime(700));
    expect(progress()).toBe('2');
  });

  it('does not advance on a wrong quadrant and leaves the grid clickable for another try', () => {
    const { container } = renderWithProviders(<QuadrantChallengePage />);
    clickGridAt(container, 3, 2); // quadrant I — wrong

    expect(screen.getByText(t('quadrantChallenge.feedback.clickHint'))).toBeInTheDocument();
    expect(progress()).toBe('1');
    // Regression guard: a wrong answer must not lock the plane.
    expect(container.querySelector('.grid-click-catcher')).not.toBeNull();

    clickGridAt(container, -4, 1);
    act(() => vi.advanceTimersByTime(700));
    expect(progress()).toBe('2');
  });

  it('accepts a sign pair only when both signs match the highlighted quadrant', () => {
    const { container } = renderWithProviders(<QuadrantChallengePage />);
    clickGridAt(container, -3, 2);
    act(() => vi.advanceTimersByTime(700));

    expect(screen.getByText(t('quadrantChallenge.prompts.whichSigns'))).toBeInTheDocument();

    fireEvent.click(signButton('x', 'minus'));
    fireEvent.click(signButton('y', 'plus')); // quadrant II signs, not quadrant III
    expect(screen.getByText(t('quadrantChallenge.feedback.signsHint'))).toBeInTheDocument();
    expect(progress()).toBe('2');

    fireEvent.click(signButton('y', 'minus'));
    act(() => vi.advanceTimersByTime(700));
    expect(progress()).toBe('3');
  });

  it('never accepts a quadrant for a point that actually lies on an axis', () => {
    const { container } = renderWithProviders(<QuadrantChallengePage />);
    clickGridAt(container, -3, 2);
    act(() => vi.advanceTimersByTime(700));
    fireEvent.click(signButton('x', 'minus'));
    fireEvent.click(signButton('y', 'minus'));
    act(() => vi.advanceTimersByTime(700));

    // (0, 3) sits on the Y axis — picking quadrant I must be rejected.
    fireEvent.click(screen.getByRole('button', { name: t('quadrantChallenge.locations.quadrant1') }));
    expect(screen.getByText(t('quadrantChallenge.feedback.clickHint'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: t('quadrantChallenge.locations.yAxis') }));
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByText(t('quadrantChallenge.completion.title'))).toBeInTheDocument();
  });
});
