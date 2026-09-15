import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { FractionShape } from '../FractionShape';
import { buildFractionPieces, FRACTION_VIEW, separationOffset } from '../../utils/fractionShapeGeometry';
import type { FractionShapeKind } from '../../types/fractionShape';

const SHAPES: FractionShapeKind[] = ['circle', 'bar', 'grid'];
const DENOMINATORS = [2, 3, 4, 5, 6, 8];

describe('fraction geometry — the same maths behind every shape', () => {
  it('always produces exactly `denominator` pieces, whatever the shape', () => {
    for (const shape of SHAPES) {
      for (const denominator of DENOMINATORS) {
        expect(buildFractionPieces(shape, denominator)).toHaveLength(denominator);
        expect(buildFractionPieces(shape, denominator, true)).toHaveLength(denominator);
      }
    }
  });

  it('draws an uncut whole as a single piece', () => {
    for (const shape of SHAPES) {
      expect(buildFractionPieces(shape, 1)).toHaveLength(1);
    }
  });

  it('keeps every piece inside the shared viewBox and numbers them 0..n-1', () => {
    for (const shape of SHAPES) {
      for (const denominator of DENOMINATORS) {
        const pieces = buildFractionPieces(shape, denominator);
        expect(pieces.map((piece) => piece.index)).toEqual(pieces.map((_, i) => i));
        for (const piece of pieces) {
          expect(piece.path.length).toBeGreaterThan(0);
          expect(piece.cx).toBeGreaterThanOrEqual(0);
          expect(piece.cx).toBeLessThanOrEqual(FRACTION_VIEW);
          expect(piece.cy).toBeGreaterThanOrEqual(0);
          expect(piece.cy).toBeLessThanOrEqual(FRACTION_VIEW);
        }
      }
    }
  });

  it('separates pieces outwards from the centre of the whole', () => {
    for (const shape of SHAPES) {
      for (const piece of buildFractionPieces(shape, 4)) {
        const { dx, dy } = separationOffset(piece);
        expect(Math.hypot(dx, dy)).toBeCloseTo(1, 5);
      }
    }
  });

  it('an unequal cut has the same number of pieces but different geometry', () => {
    for (const shape of SHAPES) {
      const equal = buildFractionPieces(shape, 4);
      const unequal = buildFractionPieces(shape, 4, true);
      expect(unequal).toHaveLength(equal.length);
      expect(unequal.map((piece) => piece.path)).not.toEqual(equal.map((piece) => piece.path));
    }
  });
});

describe('FractionShape', () => {
  it('renders one tappable piece per denominator', () => {
    for (const shape of SHAPES) {
      const { getAllByRole, unmount } = render(<FractionShape shape={shape} pieces={6} onTogglePiece={() => {}} />);
      expect(getAllByRole('button')).toHaveLength(6);
      unmount();
    }
  });

  it('marks exactly the selected pieces, whichever shape is rendering', () => {
    for (const shape of SHAPES) {
      const { container, unmount } = render(<FractionShape shape={shape} pieces={4} selected={[0, 2]} />);
      const selected = container.querySelectorAll('[data-selected="true"]');
      expect(selected).toHaveLength(2);
      expect(container.querySelector('[data-testid="fraction-piece-0"]')).toHaveAttribute('data-selected', 'true');
      expect(container.querySelector('[data-testid="fraction-piece-1"]')).toHaveAttribute('data-selected', 'false');
      unmount();
    }
  });

  it('toggles a piece on click and reports its index', () => {
    const onToggle = vi.fn();
    const { getByTestId } = render(<FractionShape shape="bar" pieces={5} onTogglePiece={onToggle} />);

    fireEvent.click(getByTestId('fraction-piece-3'));
    expect(onToggle).toHaveBeenCalledWith(3);
  });

  it('is read-only when no toggle handler is given', () => {
    const { queryAllByRole } = render(<FractionShape shape="grid" pieces={4} selected={[1]} />);
    expect(queryAllByRole('button')).toHaveLength(0);
  });
});
