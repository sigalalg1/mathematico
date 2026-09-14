import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { clickGridAt, renderWithProviders } from '../../test/testUtils';
import i18n from '../../i18n';
import { ShapesOnPlanePage } from '../ShapesOnPlanePage';

const LABELS = ['A', 'B', 'C', 'D'];

vi.mock('../../data/games/shapesOnPlaneData', () => ({
  SHAPES_ON_PLANE_TOTAL: 5,
  buildShapesOnPlaneStages: () => [
    {
      id: 'stage1',
      nameKey: 'shapesOnPlane.stages.stage1.name',
      introKey: 'shapesOnPlane.stages.stage1.intro',
      challenges: [
        {
          id: 'stage1-0',
          kind: 'completeShape',
          shapeKind: 'rectangle',
          // A(-1,-1) B(2,-1) C(2,1) -> D(-1,1)
          vertices: [
            { x: -1, y: -1 },
            { x: 2, y: -1 },
            { x: 2, y: 1 },
            { x: -1, y: 1 },
          ],
          vertexLabels: LABELS,
          missingIndex: 3,
        },
        {
          id: 'stage1-1',
          kind: 'completeShape',
          shapeKind: 'square',
          vertices: [
            { x: 0, y: 0 },
            { x: 3, y: 0 },
            { x: 3, y: 3 },
            { x: 0, y: 3 },
          ],
          vertexLabels: LABELS,
          missingIndex: 3,
        },
        {
          id: 'stage1-2',
          kind: 'completeShape',
          shapeKind: 'isoscelesTrapezoid',
          // A(-4,-2) B(4,-2) C(2,1) -> D(-2,1)
          vertices: [
            { x: -4, y: -2 },
            { x: 4, y: -2 },
            { x: 2, y: 1 },
            { x: -2, y: 1 },
          ],
          vertexLabels: LABELS,
          missingIndex: 3,
        },
      ],
    },
    {
      id: 'stage2',
      nameKey: 'shapesOnPlane.stages.stage3.name',
      introKey: 'shapesOnPlane.stages.stage3.intro',
      challenges: [
        {
          id: 'stage2-0',
          kind: 'perimeter',
          shapeKind: 'rectangle',
          vertices: [
            { x: 0, y: 0 },
            { x: 3, y: 0 },
            { x: 3, y: 2 },
            { x: 0, y: 2 },
          ],
          vertexLabels: LABELS,
          answerNumber: 10,
        },
      ],
    },
    {
      id: 'stage3',
      nameKey: 'shapesOnPlane.stages.stage4.name',
      introKey: 'shapesOnPlane.stages.stage4.intro',
      challenges: [
        {
          id: 'stage3-0',
          kind: 'area',
          shapeKind: 'rectangle',
          vertices: [
            { x: 0, y: 0 },
            { x: 3, y: 0 },
            { x: 3, y: 2 },
            { x: 0, y: 2 },
          ],
          vertexLabels: LABELS,
          answerNumber: 6,
        },
      ],
    },
  ],
}));

const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options) as string;
const progress = () => screen.getByRole('progressbar').getAttribute('aria-valuenow');

describe('Shapes on the Plane — completing a missing vertex', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('names the shape and only shows the three known vertices', () => {
    const { container } = renderWithProviders(<ShapesOnPlanePage />);
    expect(screen.getByText(t('shapesOnPlane.prompts.completeShapeTitle.rectangle'))).toBeInTheDocument();
    expect(container.querySelectorAll('.vertex-label')).toHaveLength(3);
  });

  it('completes a rectangle when the right point for D is clicked', () => {
    const { container } = renderWithProviders(<ShapesOnPlanePage />);
    clickGridAt(container, -1, 1);
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('does not complete the shape on a wrong point, and allows another click', () => {
    const { container } = renderWithProviders(<ShapesOnPlanePage />);
    clickGridAt(container, 4, 4);

    expect(screen.getByText(t('shapesOnPlane.feedback.incorrectHintPoint'))).toBeInTheDocument();
    expect(progress()).toBe('1');
    // Regression guard: the plane stays clickable after a wrong point.
    expect(container.querySelector('.grid-click-catcher')).not.toBeNull();

    clickGridAt(container, -1, 1);
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('2');
  });

  it('completes a square', () => {
    const { container } = renderWithProviders(<ShapesOnPlanePage />);
    clickGridAt(container, -1, 1);
    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText(t('shapesOnPlane.prompts.completeShapeTitle.square'))).toBeInTheDocument();
    clickGridAt(container, 0, 3);
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('3');
  });

  it('states the parallel-sides condition for a trapezoid and accepts the mirrored vertex', () => {
    const { container } = renderWithProviders(<ShapesOnPlanePage />);
    clickGridAt(container, -1, 1);
    act(() => vi.advanceTimersByTime(800));
    clickGridAt(container, 0, 3);
    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText(t('shapesOnPlane.prompts.completeShapeTitle.isoscelesTrapezoid'))).toBeInTheDocument();
    expect(screen.getByText(t('shapesOnPlane.prompts.parallelSidesNote'))).toBeInTheDocument();

    clickGridAt(container, -2, 1);
    act(() => vi.advanceTimersByTime(800));
    expect(progress()).toBe('4');
  });
});

describe('Shapes on the Plane — measurement challenges', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function completeStage1(container: HTMLElement) {
    clickGridAt(container, -1, 1);
    act(() => vi.advanceTimersByTime(800));
    clickGridAt(container, 0, 3);
    act(() => vi.advanceTimersByTime(800));
    clickGridAt(container, -2, 1);
    act(() => vi.advanceTimersByTime(800));
  }

  it('checks a typed perimeter and area, then shows the completion screen', () => {
    const { container } = renderWithProviders(<ShapesOnPlanePage />);
    completeStage1(container);

    const input = () => screen.getByLabelText(t('shapesOnPlane.inputLabel'));
    const check = () => screen.getByRole('button', { name: t('shapesOnPlane.actions.check') });

    expect(screen.getByText(t('shapesOnPlane.prompts.perimeter'))).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: '12' } });
    fireEvent.click(check());
    expect(screen.getByText(t('shapesOnPlane.feedback.incorrectHintNumber'))).toBeInTheDocument();
    expect(input()).not.toBeDisabled();

    fireEvent.change(input(), { target: { value: '10' } });
    fireEvent.click(check());
    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText(t('shapesOnPlane.prompts.area'))).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: '6' } });
    fireEvent.click(check());
    act(() => vi.advanceTimersByTime(800));

    expect(screen.getByText(t('shapesOnPlane.completion.title'))).toBeInTheDocument();
  });
});
