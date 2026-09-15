import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CoordinateGrid } from '../CoordinateGrid';
import { gridClientPoint } from '../../test/testUtils';

describe('CoordinateGrid — rendering', () => {
  it('renders the plane LTR so the axes never mirror on an RTL page', () => {
    const { container } = render(<CoordinateGrid />);
    expect(container.querySelector('.coordinate-grid')).toHaveAttribute('dir', 'ltr');
  });

  it('draws tick labels for every integer from -5 to 5', () => {
    const { container } = render(<CoordinateGrid />);
    const labels = [...container.querySelectorAll('.tick-label')].map((node) => node.textContent);
    for (let n = -5; n <= 5; n++) expect(labels).toContain(String(n));
  });

  it('is hidden from assistive tech when purely decorative', () => {
    const { container } = render(<CoordinateGrid point={{ x: 1, y: 2 }} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('stays in the accessibility tree when it contains real controls', () => {
    const { container } = render(
      <CoordinateGrid
        clickablePoints={[{ id: 'a', point: { x: 1, y: 2 }, label: 'A' }]}
        onSelectPoint={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
  });
});

describe('CoordinateGrid — scale and partial labels', () => {
  const labels = (container: HTMLElement) => [...container.querySelectorAll('.tick-label')].map((node) => node.textContent);

  it('labels every tick with its own index when no scale is given', () => {
    const { container } = render(<CoordinateGrid />);
    expect(labels(container)).toHaveLength(21); // 10 per axis plus the shared origin
  });

  it('multiplies tick labels by the unit scale without moving anything', () => {
    const { container } = render(<CoordinateGrid unitScale={2} />);
    const text = labels(container);
    for (const value of ['2', '4', '6', '8', '10', '-10']) expect(text).toContain(value);
    expect(text).not.toContain('3');
  });

  it('renders clean halves for a fractional scale', () => {
    const { container } = render(<CoordinateGrid unitScale={0.5} />);
    const text = labels(container);
    expect(text).toContain('0.5');
    expect(text).toContain('2.5');
    expect(text).toContain('-2.5');
  });

  it('shows only the requested tick labels but keeps every tick mark', () => {
    const { container } = render(<CoordinateGrid unitScale={2} labeledTicks={{ x: [1, 2], y: [] }} />);
    expect(labels(container).sort()).toEqual(['0', '2', '4']);
    expect(container.querySelectorAll('.tick-mark')).toHaveLength(20);
  });

  it('draws a scale hint spanning two ticks only when asked', () => {
    const { container, rerender } = render(<CoordinateGrid />);
    expect(container.querySelector('.scale-hint-span')).not.toBeInTheDocument();

    rerender(<CoordinateGrid unitScale={5} scaleHint={{ axis: 'y', fromTick: 0, toTick: 2 }} />);
    expect(container.querySelector('.scale-hint-span')).toBeInTheDocument();
    expect([...container.querySelectorAll('.scale-hint-label')].map((n) => n.textContent)).toEqual(['0', '10']);
  });
});

describe('CoordinateGrid — click mapping', () => {
  it('reports the nearest integer coordinate that was clicked', () => {
    const onGridClick = vi.fn();
    const { container } = render(<CoordinateGrid onGridClick={onGridClick} />);
    const catcher = container.querySelector('.grid-click-catcher')!;

    for (const point of [
      { x: 0, y: 0 },
      { x: 3, y: -2 },
      { x: -5, y: 5 },
      { x: -1, y: 4 },
    ]) {
      onGridClick.mockClear();
      fireEvent.click(catcher, gridClientPoint(point.x, point.y));
      expect(onGridClick).toHaveBeenCalledWith(point);
    }
  });

  it('reports the quadrant that was clicked', () => {
    const onQuadrantClick = vi.fn();
    const { container } = render(<CoordinateGrid onQuadrantClick={onQuadrantClick} />);
    const catcher = container.querySelector('.grid-click-catcher')!;

    for (const [point, quadrant] of [
      [{ x: 3, y: 3 }, 1],
      [{ x: -3, y: 3 }, 2],
      [{ x: -3, y: -3 }, 3],
      [{ x: 3, y: -3 }, 4],
    ] as const) {
      onQuadrantClick.mockClear();
      fireEvent.click(catcher, gridClientPoint(point.x, point.y));
      expect(onQuadrantClick).toHaveBeenCalledWith(quadrant);
    }
  });
});

describe('CoordinateGrid — answered vs locked', () => {
  it('keeps clickable points usable after a wrong answer (answered but not locked)', () => {
    const onSelectPoint = vi.fn();
    render(
      <CoordinateGrid
        clickablePoints={[{ id: 'a', point: { x: 1, y: 2 }, label: 'A' }]}
        onSelectPoint={onSelectPoint}
        pointsAnswered
        pointsLocked={false}
      />,
    );

    const target = screen.getByRole('button', { name: 'A' });
    expect(target).toHaveAttribute('tabindex', '0');
    expect(target.getAttribute('class')).not.toContain('is-disabled');

    fireEvent.click(target);
    expect(onSelectPoint).toHaveBeenCalledWith('a');
  });

  it('locks clickable points only when explicitly locked', () => {
    render(
      <CoordinateGrid
        clickablePoints={[{ id: 'a', point: { x: 1, y: 2 }, label: 'A' }]}
        onSelectPoint={() => {}}
        pointsAnswered
        pointsLocked
      />,
    );
    const target = screen.getByRole('button', { name: 'A' });
    expect(target).toHaveAttribute('tabindex', '-1');
    expect(target.getAttribute('class')).toContain('is-disabled');
  });

  it('keeps axis targets usable after an incorrect answer and locks them once correct', () => {
    const { rerender } = render(
      <CoordinateGrid
        interactiveTargets={['xAxis', 'yAxis']}
        targetLabels={{ xAxis: 'X axis', yAxis: 'Y axis' }}
        status="incorrect"
        onSelectTarget={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'X axis' })).toHaveAttribute('tabindex', '0');

    rerender(
      <CoordinateGrid
        interactiveTargets={['xAxis', 'yAxis']}
        targetLabels={{ xAxis: 'X axis', yAxis: 'Y axis' }}
        status="correct"
        onSelectTarget={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'X axis' })).toHaveAttribute('tabindex', '-1');
  });

  it('responds to keyboard activation on axis targets', () => {
    const onSelectTarget = vi.fn();
    render(
      <CoordinateGrid
        interactiveTargets={['origin']}
        targetLabels={{ origin: 'Origin' }}
        onSelectTarget={onSelectTarget}
      />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Origin' }), { key: 'Enter' });
    expect(onSelectTarget).toHaveBeenCalledWith('origin');
  });
});
