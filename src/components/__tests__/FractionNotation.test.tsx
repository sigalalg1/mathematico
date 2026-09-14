import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FractionNotation } from '../FractionNotation';

describe('FractionNotation', () => {
  it('stacks the numerator above the denominator', () => {
    const { container } = render(<FractionNotation numerator={3} denominator={4} />);

    expect(container.querySelector('.fraction-numerator')).toHaveTextContent('3');
    expect(container.querySelector('.fraction-denominator')).toHaveTextContent('4');
    // Reading order inside the notation must be numerator first, bar, denominator.
    const parts = Array.from(container.querySelectorAll('.fraction-inner > *')).map((node) => node.className);
    expect(parts[0]).toContain('fraction-numerator');
    expect(parts[1]).toContain('fraction-bar');
    expect(parts[2]).toContain('fraction-denominator');
  });

  it('keeps its own LTR direction so it stays correct inside RTL text', () => {
    const { container } = render(
      <p dir="rtl">
        ההזמנה היא <FractionNotation numerator={2} denominator={5} />
      </p>,
    );

    expect(container.querySelector('.fraction')).toHaveAttribute('dir', 'ltr');
  });

  it('renders identically inside LTR text', () => {
    const { container } = render(
      <p dir="ltr">
        The order is <FractionNotation numerator={2} denominator={5} />
      </p>,
    );

    expect(container.querySelector('.fraction')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('math')).toHaveAccessibleName('2/5');
  });

  it('lights up only the half the lesson is pointing at', () => {
    const { container, rerender } = render(<FractionNotation numerator={3} denominator={4} highlight="denominator" />);
    expect(container.querySelector('.fraction-denominator')).toHaveClass('fraction-lit');
    expect(container.querySelector('.fraction-numerator')).not.toHaveClass('fraction-lit');

    rerender(<FractionNotation numerator={3} denominator={4} highlight="numerator" />);
    expect(container.querySelector('.fraction-numerator')).toHaveClass('fraction-lit');
    expect(container.querySelector('.fraction-denominator')).not.toHaveClass('fraction-lit');

    rerender(<FractionNotation numerator={3} denominator={4} highlight="both" />);
    expect(container.querySelectorAll('.fraction-lit')).toHaveLength(2);

    rerender(<FractionNotation numerator={3} denominator={4} />);
    expect(container.querySelectorAll('.fraction-lit')).toHaveLength(0);
  });

  it('shows a placeholder while the numerator is still unknown', () => {
    render(<FractionNotation numerator={0} denominator={4} unknownNumerator />);

    expect(screen.getByRole('math')).toHaveAccessibleName('?/4');
  });
});
