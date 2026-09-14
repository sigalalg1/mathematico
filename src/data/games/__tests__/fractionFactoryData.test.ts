import { describe, expect, it } from 'vitest';
import {
  buildCutOptions,
  buildFractionFactoryOrders,
  builtFraction,
  isCorrectCut,
  FRACTION_DENOMINATORS,
  FRACTION_FACTORY_TOTAL,
  FRACTION_SHAPES,
} from '../fractionFactoryData';
import type { FractionOrder } from '../../../types/fractionFactory';

const RUNS = 400;

const SESSIONS: FractionOrder[][] = Array.from({ length: RUNS }, () => buildFractionFactoryOrders());
const ALL = SESSIONS.flat();

describe('fraction factory — every generated fraction is a legal intro fraction', () => {
  it('keeps denominator > 0, numerator > 0 and numerator <= denominator', () => {
    for (const order of ALL) {
      expect(order.denominator).toBeGreaterThan(0);
      expect(order.numerator).toBeGreaterThan(0);
      expect(order.numerator).toBeLessThanOrEqual(order.denominator);
    }
  });

  it('never produces an improper fraction or a fraction above one', () => {
    for (const order of ALL) {
      expect(order.numerator / order.denominator).toBeLessThanOrEqual(1);
    }
  });

  it('only uses whole numbers', () => {
    for (const order of ALL) {
      expect(Number.isInteger(order.numerator)).toBe(true);
      expect(Number.isInteger(order.denominator)).toBe(true);
    }
  });

  it('only uses denominators from the configured set', () => {
    for (const order of ALL) {
      expect(FRACTION_DENOMINATORS).toContain(order.denominator);
    }
  });

  it('exercises the whole configured denominator set over many sessions', () => {
    const seen = new Set(ALL.map((order) => order.denominator));
    expect([...seen].sort((a, b) => a - b)).toEqual([...FRACTION_DENOMINATORS]);
  });
});

describe('fraction factory — the shape of a session', () => {
  it('runs between six and eight orders and advertises that total', () => {
    expect(FRACTION_FACTORY_TOTAL).toBeGreaterThanOrEqual(6);
    expect(FRACTION_FACTORY_TOTAL).toBeLessThanOrEqual(8);
    for (const session of SESSIONS) {
      expect(session).toHaveLength(FRACTION_FACTORY_TOTAL);
      expect(new Set(session.map((order) => order.id)).size).toBe(session.length);
    }
  });

  it('opens with unit fractions, so the whole attention is on the cut', () => {
    for (const order of ALL) {
      if (order.stageId === 'stage1') {
        expect(order.kind).toBe('build');
        expect(order.numerator).toBe(1);
      }
    }
  });

  it('teaches equal parts exactly once per session, early on', () => {
    for (const session of SESSIONS) {
      const equalPartsIndexes = session.map((order, i) => (order.kind === 'equalParts' ? i : -1)).filter((i) => i >= 0);
      expect(equalPartsIndexes).toHaveLength(1);
      expect(equalPartsIndexes[0]).toBeLessThan(session.length / 2);
    }
  });

  it('asks for a numerator above one once the cut is understood', () => {
    for (const order of ALL) {
      if (order.stageId === 'stage3' || order.stageId === 'stage4') {
        expect(order.numerator).toBeGreaterThan(1);
      }
    }
  });

  it('includes reverse (visual -> symbolic) orders with pieces already highlighted', () => {
    const reverse = ALL.filter((order) => order.kind === 'reverse');
    expect(reverse.length).toBeGreaterThan(0);
    for (const order of reverse) {
      expect(order.preselected).toHaveLength(order.numerator);
      expect(new Set(order.preselected).size).toBe(order.numerator);
      for (const index of order.preselected) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(order.denominator);
      }
      // A reverse order must never already show the fraction the dial starts on.
      expect(`${order.numerator}/${order.denominator}`).not.toBe('1/2');
    }
  });

  it('leaves non-reverse orders with nothing pre-selected', () => {
    for (const order of ALL) {
      if (order.kind !== 'reverse') expect(order.preselected).toEqual([]);
    }
  });

  it('rotates through all three whole-representations inside a session', () => {
    for (const session of SESSIONS) {
      expect(new Set(session.map((order) => order.shape)).size).toBe(FRACTION_SHAPES.length);
    }
  });

  it('never repeats the same fraction twice inside one session', () => {
    for (const session of SESSIONS) {
      const keys = session.map((order) => `${order.numerator}/${order.denominator}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('varies the orders between sessions', () => {
    const signatures = new Set(SESSIONS.map((session) => session.map((o) => `${o.numerator}/${o.denominator}`).join('|')));
    expect(signatures.size).toBeGreaterThan(1);
  });
});

describe('fraction factory — the cutting machine buttons', () => {
  it('offers the right piece count plus nearby real denominators', () => {
    for (const order of ALL) {
      if (order.kind !== 'build') {
        expect(order.cutOptions).toEqual([]);
        continue;
      }
      expect(order.cutOptions).toHaveLength(3);
      expect(order.cutOptions).toContain(order.denominator);
      expect(new Set(order.cutOptions).size).toBe(order.cutOptions.length);
      for (const option of order.cutOptions) expect(FRACTION_DENOMINATORS).toContain(option);
    }
  });

  it('offers exactly one correct button; every other one is a real mistake', () => {
    for (const order of ALL) {
      if (order.kind !== 'build') continue;
      expect(order.cutOptions.filter((option) => isCorrectCut(order, option))).toEqual([order.denominator]);
    }
  });

  it('moves the correct button around instead of parking it in one slot', () => {
    const positions = new Set(Array.from({ length: 150 }, () => buildCutOptions(4).indexOf(4)));
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('fraction factory — what the child builds', () => {
  it('maps the number of selected pieces onto the numerator, keeping the denominator', () => {
    const order = ALL[0];
    for (let selected = 0; selected <= order.denominator; selected++) {
      expect(builtFraction(order, selected)).toEqual({ numerator: selected, denominator: order.denominator });
    }
  });

  it('accepts only the requested piece count as the correct cut', () => {
    for (const order of ALL) {
      expect(isCorrectCut(order, order.denominator)).toBe(true);
      expect(isCorrectCut(order, order.denominator + 1)).toBe(false);
      expect(isCorrectCut(order, order.denominator - 1)).toBe(false);
    }
  });
});
