import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumberLine } from '../NumberLine';

const labels = (container: HTMLElement) => [...container.querySelectorAll('.number-line-tick-label')].map((n) => n.textContent);

describe('NumberLine — drawing the line', () => {
  it('draws one tick per step and labels them all by default', () => {
    const { container } = render(<NumberLine min={-3} max={3} />);
    expect(container.querySelectorAll('.number-line-tick')).toHaveLength(7);
    expect(labels(container)).toEqual(['-3', '-2', '-1', '0', '1', '2', '3']);
  });

  it('honours a step larger than one', () => {
    const { container } = render(<NumberLine min={-4} max={4} step={2} />);
    expect(labels(container)).toEqual(['-4', '-2', '0', '2', '4']);
  });

  it('labels only the values it is told to, and always keeps the ticks', () => {
    const { container } = render(<NumberLine min={-3} max={3} labeledValues={[-3, 0, 3]} />);
    expect(labels(container)).toEqual(['-3', '0', '3']);
    expect(container.querySelectorAll('.number-line-tick')).toHaveLength(7);
  });

  it('marks zero out from the other ticks', () => {
    const { container } = render(<NumberLine min={-2} max={2} />);
    expect(container.querySelectorAll('.number-line-tick-zero')).toHaveLength(1);
  });

  it('stays left-to-right so it reads correctly on an RTL page', () => {
    const { container } = render(<NumberLine min={-2} max={2} />);
    expect(container.querySelector('.number-line')).toHaveAttribute('dir', 'ltr');
  });

  it('hides itself from assistive tech when nothing on it is interactive', () => {
    const { container } = render(<NumberLine min={-2} max={2} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('NumberLine — positions map to the line, not to pixels the caller guesses', () => {
  it('places the ends at the ends and zero in the middle of a symmetric line', () => {
    const { container } = render(
      <NumberLine min={-5} max={5} markers={[{ id: 'a', value: -5 }, { id: 'b', value: 0 }, { id: 'c', value: 5 }]} />,
    );
    const [left, middle, right] = [...container.querySelectorAll('.number-line-marker-dot')].map((node) =>
      Number(node.getAttribute('cx')),
    );
    expect(left).toBeLessThan(middle);
    expect(middle).toBeLessThan(right);
    expect(middle - left).toBeCloseTo(right - middle, 5);
  });

  it('spaces equal value gaps equally', () => {
    const { container } = render(
      <NumberLine min={-4} max={4} markers={[{ id: 'a', value: -2 }, { id: 'b', value: 0 }, { id: 'c', value: 2 }]} />,
    );
    const [a, b, c] = [...container.querySelectorAll('.number-line-marker-dot')].map((node) => Number(node.getAttribute('cx')));
    expect(b - a).toBeCloseTo(c - b, 5);
  });
});

describe('NumberLine — clickable points', () => {
  it('exposes each point as a button named after its value', () => {
    render(<NumberLine min={-2} max={2} clickablePoints={[{ id: 'p', value: -2 }, { id: 'q', value: 1 }]} />);
    expect(screen.getByRole('button', { name: '-2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });

  it('prefers an explicit label over the raw value', () => {
    render(<NumberLine min={-2} max={2} clickablePoints={[{ id: 'p', value: -2, label: 'A' }]} />);
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
  });

  it('reports the id that was clicked', () => {
    const onSelect = vi.fn();
    render(<NumberLine min={-2} max={2} clickablePoints={[{ id: 'p', value: 1 }]} onSelectPoint={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(onSelect).toHaveBeenCalledWith('p');
  });

  it('answers the keyboard as well as the mouse', () => {
    const onSelect = vi.fn();
    render(<NumberLine min={-2} max={2} clickablePoints={[{ id: 'p', value: 1 }]} onSelectPoint={onSelect} />);
    fireEvent.keyDown(screen.getByRole('button', { name: '1' }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('p');
  });

  it('keeps every point reachable while the round is only answered, not solved', () => {
    const { container } = render(
      <NumberLine
        min={-2}
        max={2}
        clickablePoints={[{ id: 'p', value: 1 }, { id: 'q', value: -1 }]}
        selectedPointId="q"
        pointsAnswered
        pointsLocked={false}
      />,
    );
    expect(container.querySelectorAll('.number-line-point.is-incorrect')).toHaveLength(1);
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(0);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('tabindex', '0');
  });

  it('locks and marks the right point once the round is solved', () => {
    const { container } = render(
      <NumberLine
        min={-2}
        max={2}
        clickablePoints={[{ id: 'p', value: 1 }, { id: 'q', value: -1 }]}
        selectedPointId="p"
        correctPointId="p"
        pointsAnswered
      />,
    );
    expect(container.querySelectorAll('.number-line-point.is-correct')).toHaveLength(1);
    expect(container.querySelectorAll('.number-line-point.is-disabled')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('NumberLine — teaching overlays', () => {
  it('draws a hop as an arc with its label', () => {
    const { container } = render(
      <NumberLine min={-5} max={5} hops={[{ id: 'h', from: -3, to: 2, label: '+5', variant: 'correct' }]} />,
    );
    expect(container.querySelectorAll('.number-line-hop-correct')).toHaveLength(1);
    expect(container.querySelector('.number-line-hop-label')?.textContent).toBe('+5');
    expect(container.querySelector('.number-line-hop-path')?.getAttribute('d')).toMatch(/^M .* Q .*/);
  });

  it('draws a distance bracket, with or without a size written on it', () => {
    const { container } = render(
      <NumberLine min={-5} max={5} spans={[{ id: 's', from: 0, to: -4, label: '4' }, { id: 't', from: 1, to: 3 }]} />,
    );
    expect(container.querySelectorAll('.number-line-span-bracket')).toHaveLength(2);
    expect([...container.querySelectorAll('.number-line-span-label')].map((n) => n.textContent)).toEqual(['4']);
  });

  it('shades a region of the line', () => {
    const { container } = render(<NumberLine min={-5} max={5} regions={[{ id: 'r', from: -1, to: 5, variant: 'correct' }]} />);
    const region = container.querySelector('.number-line-region-correct');
    expect(region).toBeInTheDocument();
    expect(Number(region?.getAttribute('width'))).toBeGreaterThan(0);
  });

  it('shades a region given in either order', () => {
    const { container } = render(<NumberLine min={-5} max={5} regions={[{ id: 'r', from: 5, to: -1 }]} />);
    expect(Number(container.querySelector('.number-line-region')?.getAttribute('width'))).toBeGreaterThan(0);
  });

  it('positions the walker by transform so it can slide between values', () => {
    const { container } = render(<NumberLine min={-5} max={5} walker={{ value: 2, label: '2' }} />);
    expect(container.querySelector('.number-line-walker')?.getAttribute('transform')).toMatch(/^translate\(/);
    expect(container.querySelector('.number-line-walker-label')?.textContent).toBe('2');
  });
});
