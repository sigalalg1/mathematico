import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { clickGridAt, renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { CoordinateMissionPage } from '../CoordinateMissionPage';

// A representative slice of the capstone: one of each interaction style.
vi.mock('../../data/games/coordinateMissionData', () => ({
  COORDINATE_MISSION_TOTAL: 5,
  buildCoordinateMissionChallenges: () => [
    {
      id: 'mission-identifyAxis',
      kind: 'identifyAxis',
      promptKey: 'coordinateMission.prompts.identifyAxis',
      correctAxis: 'yAxis',
    },
    {
      id: 'mission-readCoordinate',
      kind: 'readCoordinate',
      promptKey: 'coordinateMission.prompts.readCoordinate',
      point: { x: -2, y: 4 },
      correctPoint: { x: -2, y: 4 },
    },
    {
      id: 'mission-quadrant',
      kind: 'quadrant',
      promptKey: 'coordinateMission.prompts.quadrant',
      point: { x: 3, y: -2 },
      correctQuadrant: 4,
    },
    {
      id: 'mission-segment',
      kind: 'segment',
      promptKey: 'coordinateMission.prompts.segment',
      segmentA: { x: -2, y: 1 },
      segmentB: { x: 3, y: 1 },
      correctLength: 5,
    },
    {
      id: 'mission-completeRectangle',
      kind: 'completeRectangle',
      promptKey: 'coordinateMission.prompts.completeRectangle',
      rectangleVertices: [
        { x: -1, y: -1 },
        { x: 2, y: -1 },
        { x: 2, y: 2 },
        { x: -1, y: 2 },
      ],
      correctPoint: { x: -1, y: 2 },
    },
  ],
  COORDINATE_MISSION_TOTAL_COUNT: 5,
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');
const submitButton = () => screen.getByRole('button', { name: t('hitTheTarget.actions.fire') });

describe('Coordinate Mission — mixed capstone flow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps the X/Y answer pair pinned LTR so RTL never reverses it', () => {
    const { container } = renderWithProviders(<CoordinateMissionPage />);
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') }));
    act(() => vi.advanceTimersByTime(800));

    expect(container.querySelector('.coordinate-mission-input-row')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByLabelText(t('hitTheTarget.inputs.x'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('hitTheTarget.inputs.y'))).toBeInTheDocument();
  });

  it('walks a student through axis, coordinate, quadrant, segment and rectangle tasks', () => {
    const { container } = renderWithProviders(<CoordinateMissionPage />);

    // 1 — click the Y axis on the plane.
    expect(progress()).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') }));
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');

    // 2 — read the plotted point's coordinates.
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.x')), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.y')), { target: { value: '4' } });
    fireEvent.click(submitButton());
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('3');

    // 3 — click the quadrant the point lies in.
    clickGridAt(container, 3, -2);
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('4');

    // 4 — type the segment length.
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.x')), { target: { value: '5' } });
    fireEvent.click(submitButton());
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('5');

    // 5 — complete the rectangle.
    clickGridAt(container, -1, 2);
    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText(t('coordinateMission.completion.title'))).toBeInTheDocument();
    expect(screen.getByText(t('coordinateMission.completion.firstTry', { count: 5 }))).toBeInTheDocument();
  });

  it('does not advance on a wrong axis click and keeps the axis targets selectable', () => {
    renderWithProviders(<CoordinateMissionPage />);
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.xAxis') }));

    expect(screen.getByText(t('coordinateMission.feedback.incorrectHint'))).toBeInTheDocument();
    expect(progress()).toBe('1');
    // Regression guard: a wrong answer must not lock the axis targets.
    expect(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') })).toHaveAttribute('tabindex', '0');

    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') }));
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('does not advance on a wrong typed coordinate and lets the student correct it', () => {
    renderWithProviders(<CoordinateMissionPage />);
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') }));
    act(() => vi.advanceTimersByTime(800));

    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.x')), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.y')), { target: { value: '-2' } });
    fireEvent.click(submitButton());

    expect(progress()).toBe('2');
    expect(screen.getByLabelText(t('hitTheTarget.inputs.x'))).not.toBeDisabled();
    expect(submitButton()).not.toBeDisabled();
  });

  it('recommends more practice based on what the student actually missed', () => {
    const { container } = renderWithProviders(<CoordinateMissionPage />);
    fireEvent.click(screen.getByRole('button', { name: t('vocabulary.targets.yAxis') }));
    act(() => vi.advanceTimersByTime(800));
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.x')), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.y')), { target: { value: '4' } });
    fireEvent.click(submitButton());
    act(() => vi.advanceTimersByTime(800));

    clickGridAt(container, -3, 3); // wrong quadrant
    clickGridAt(container, 3, -2);
    act(() => vi.advanceTimersByTime(800));
    fireEvent.change(screen.getByLabelText(t('hitTheTarget.inputs.x')), { target: { value: '5' } });
    fireEvent.click(submitButton());
    act(() => vi.advanceTimersByTime(800));
    clickGridAt(container, -1, 2);
    act(() => vi.advanceTimersByTime(800));

    expect(
      screen.getByText(t('coordinateMission.completion.recommendation', { game: t('quadrantChallenge.gameName') })),
    ).toBeInTheDocument();
  });
});
