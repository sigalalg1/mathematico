import { describe, expect, it } from 'vitest';
import {
  evalLinearExpr,
  formatLinearEquation,
  formatLinearExpr,
  formatSubstitutionSteps,
  formatTerms,
  satisfiesEquation,
  simplifyTerms,
  solveLinearEquation,
  type AlgebraTerm,
  type LinearEquation,
} from '../algebra';

describe('formatLinearExpr', () => {
  it.each([
    [{ coefficient: 1, constant: 0 }, 'x'],
    [{ coefficient: -1, constant: 0 }, '-x'],
    [{ coefficient: 3, constant: 0 }, '3x'],
    [{ coefficient: 0, constant: 5 }, '5'],
    [{ coefficient: 0, constant: -5 }, '-5'],
    [{ coefficient: 0, constant: 0 }, '0'],
    [{ coefficient: 3, constant: 2 }, '3x + 2'],
    [{ coefficient: 3, constant: -2 }, '3x - 2'],
    [{ coefficient: -2, constant: 5 }, '-2x + 5'],
    [{ coefficient: -1, constant: -5 }, '-x - 5'],
  ])('%j -> %s', (expr, expected) => {
    expect(formatLinearExpr(expr)).toBe(expected);
  });
});

describe('evalLinearExpr', () => {
  it('evaluates coefficient * x + constant', () => {
    expect(evalLinearExpr({ coefficient: 3, constant: 2 }, 4)).toBe(14);
    expect(evalLinearExpr({ coefficient: -2, constant: 5 }, -3)).toBe(11);
    expect(evalLinearExpr({ coefficient: 0, constant: 7 }, 100)).toBe(7);
  });
});

describe('formatSubstitutionSteps', () => {
  it('shows the replacement, the product and the final value as separate steps', () => {
    const steps = formatSubstitutionSteps({ coefficient: 2, constant: 3 }, 4);
    expect(steps).toEqual(['2x + 3', '2·4 + 3', '8 + 3', '11']);
  });

  it('replaces x with the value (parenthesised when negative) as its own step', () => {
    const steps = formatSubstitutionSteps({ coefficient: 3, constant: 5 }, -2);
    expect(steps[0]).toBe('3x + 5');
    expect(steps[1]).toContain('(-2)');
    expect(steps.at(-1)).toBe(evalLinearExpr({ coefficient: 3, constant: 5 }, -2).toString());
  });

  it('never jumps straight from the expression to the final value', () => {
    const steps = formatSubstitutionSteps({ coefficient: 2, constant: -4 }, 5);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0]).not.toBe(steps.at(-1));
  });

  it('never repeats the same value as two separate steps when there is no constant term', () => {
    // "3x" at x=7: the product (21) and the final value (21) are the same
    // number — it must appear once, not as a redundant extra step.
    const steps = formatSubstitutionSteps({ coefficient: 3, constant: 0 }, 7);
    expect(steps).toEqual(['3x', '3·7', '21']);
    expect(new Set(steps).size).toBe(steps.length);
  });

  it('every step evaluates to the same final answer when read as a formula', () => {
    for (let coefficient = -4; coefficient <= 4; coefficient += 1) {
      for (let constant = -3; constant <= 3; constant += 1) {
        for (let x = -5; x <= 5; x += 1) {
          const expr = { coefficient, constant };
          const steps = formatSubstitutionSteps(expr, x);
          expect(Number(steps.at(-1))).toBe(evalLinearExpr(expr, x));
          // No two consecutive steps should ever repeat the same text.
          for (let i = 1; i < steps.length; i += 1) expect(steps[i]).not.toBe(steps[i - 1]);
        }
      }
    }
  });
});

describe('simplifyTerms / formatTerms', () => {
  it('combines like terms, keeping x-terms and constants separate', () => {
    const terms: AlgebraTerm[] = [
      { coefficient: 4, isVariable: true },
      { coefficient: 3, isVariable: false },
      { coefficient: -2, isVariable: true },
      { coefficient: 5, isVariable: false },
    ];
    expect(simplifyTerms(terms)).toEqual({ coefficient: 2, constant: 8 });
    expect(formatTerms(terms)).toBe('4x + 3 - 2x + 5');
  });

  it('never merges a variable term into a constant or vice versa', () => {
    const onlyVariables: AlgebraTerm[] = [
      { coefficient: 3, isVariable: true },
      { coefficient: 2, isVariable: true },
    ];
    expect(simplifyTerms(onlyVariables)).toEqual({ coefficient: 5, constant: 0 });

    const onlyConstants: AlgebraTerm[] = [
      { coefficient: 3, isVariable: false },
      { coefficient: 2, isVariable: false },
    ];
    expect(simplifyTerms(onlyConstants)).toEqual({ coefficient: 0, constant: 5 });
  });

  it('formats a single leading negative term without a stray leading "+"', () => {
    const terms: AlgebraTerm[] = [
      { coefficient: -3, isVariable: true },
      { coefficient: 4, isVariable: false },
    ];
    expect(formatTerms(terms)).toBe('-3x + 4');
  });
});

describe('solveLinearEquation / satisfiesEquation', () => {
  it('solves a one-step equation', () => {
    const equation: LinearEquation = { left: { coefficient: 1, constant: 5 }, right: { coefficient: 0, constant: 12 } };
    expect(solveLinearEquation(equation)).toBe(7);
  });

  it('solves a two-step equation', () => {
    const equation: LinearEquation = { left: { coefficient: 2, constant: 3 }, right: { coefficient: 0, constant: 11 } };
    expect(solveLinearEquation(equation)).toBe(4);
  });

  it('solves an equation with the variable on both sides', () => {
    const equation: LinearEquation = { left: { coefficient: 3, constant: 2 }, right: { coefficient: 1, constant: 10 } };
    expect(solveLinearEquation(equation)).toBe(4);
  });

  it('returns null rather than a wrong answer when the coefficients cancel out', () => {
    const identity: LinearEquation = { left: { coefficient: 2, constant: 3 }, right: { coefficient: 2, constant: 3 } };
    expect(solveLinearEquation(identity)).toBeNull();
    const noSolution: LinearEquation = { left: { coefficient: 2, constant: 3 }, right: { coefficient: 2, constant: 5 } };
    expect(solveLinearEquation(noSolution)).toBeNull();
  });

  it('the computed solution always satisfies its own equation', () => {
    for (let a = -5; a <= 5; a += 1) {
      for (let b = -5; b <= 5; b += 1) {
        for (let c = -5; c <= 5; c += 1) {
          for (let d = -5; d <= 5; d += 1) {
            const equation: LinearEquation = { left: { coefficient: a, constant: b }, right: { coefficient: c, constant: d } };
            const solution = solveLinearEquation(equation);
            if (solution === null) continue;
            expect(satisfiesEquation(equation, solution)).toBe(true);
          }
        }
      }
    }
  });

  it('rejects a value that does not satisfy the equation', () => {
    const equation: LinearEquation = { left: { coefficient: 2, constant: 3 }, right: { coefficient: 0, constant: 11 } };
    expect(satisfiesEquation(equation, 5)).toBe(false);
  });
});

describe('formatLinearEquation', () => {
  it('joins both sides with "="', () => {
    const equation: LinearEquation = { left: { coefficient: 2, constant: 3 }, right: { coefficient: 0, constant: 11 } };
    expect(formatLinearEquation(equation)).toBe('2x + 3 = 11');
  });
});
