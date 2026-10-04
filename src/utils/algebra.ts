/**
 * Shared algebraic notation and arithmetic for the Grade 7 Algebra unit.
 *
 * Every expression in this unit is linear in one variable, so a single pair
 * of numbers — a coefficient and a constant — is enough to represent it
 * exactly: `coefficient * x + constant`. Formatting, evaluating, solving and
 * simplifying all work off this one shape, so every activity's generator
 * agrees with every other's about what a "clean" expression or equation
 * looks like.
 *
 * Every string produced here is math notation and must be rendered inside
 * `<MathText>` so it stays left-to-right on the Hebrew (RTL) page — the same
 * rule the Signed Numbers unit's `formatExpression` follows.
 */
import { formatSigned, formatTerm } from './signedNumbers';

export interface LinearExpr {
  coefficient: number;
  constant: number;
}

/** `coefficient * x + constant`, e.g. `{ coefficient: 3, constant: 2 }` → "3x + 2". */
export function formatLinearExpr(expr: LinearExpr, variable = 'x'): string {
  const { coefficient, constant } = expr;
  let head = '';
  if (coefficient === 1) head = variable;
  else if (coefficient === -1) head = `-${variable}`;
  else if (coefficient !== 0) head = `${coefficient}${variable}`;

  if (constant === 0) return head || '0';
  const tail = constant < 0 ? `- ${Math.abs(constant)}` : `+ ${constant}`;
  return head ? `${head} ${tail}` : formatSigned(constant);
}

/** The value of `coefficient * x + constant` at a given `x`. */
export function evalLinearExpr(expr: LinearExpr, x: number): number {
  return expr.coefficient * x + expr.constant;
}

/**
 * Every step of substituting `x` into an expression, shown in order:
 * the original expression, the replacement (`x` swapped for its value,
 * parenthesised when negative), the product, then the final value. The
 * replacement step is the whole point — the expression never jumps straight
 * to its numeric answer.
 */
export function formatSubstitutionSteps(expr: LinearExpr, x: number, variable = 'x'): string[] {
  const steps = [formatLinearExpr(expr, variable)];

  // Adds a step only when it actually differs from the one before it — a
  // coefficient of 1 or -1 makes "replace x" and "multiply out" collapse to
  // the same text, and no constant term makes "multiply out" and "the
  // answer" collapse too. Either is a real step with nothing left to show,
  // not a repeat of the one before.
  const addStep = (text: string) => {
    if (steps.at(-1) !== text) steps.push(text);
  };

  if (expr.coefficient !== 0) {
    const valueText = formatTerm(x);
    const replaced =
      expr.coefficient === 1
        ? valueText
        : expr.coefficient === -1
          ? `-${valueText}`
          : `${formatTerm(expr.coefficient)}·${valueText}`;
    addStep(expr.constant === 0 ? replaced : `${replaced} ${expr.constant < 0 ? '-' : '+'} ${Math.abs(expr.constant)}`);

    const product = expr.coefficient * x;
    addStep(expr.constant === 0 ? formatSigned(product) : `${formatSigned(product)} ${expr.constant < 0 ? '-' : '+'} ${Math.abs(expr.constant)}`);
  }

  addStep(formatSigned(evalLinearExpr(expr, x)));
  return steps;
}

/** One unsimplified term in a sum, e.g. the `+3` or `-2x` of `4x + 3 - 2x`. */
export interface AlgebraTerm {
  coefficient: number;
  isVariable: boolean;
}

/** Folds a list of terms into the single `LinearExpr` they're equivalent to. */
export function simplifyTerms(terms: AlgebraTerm[]): LinearExpr {
  let coefficient = 0;
  let constant = 0;
  for (const term of terms) {
    if (term.isVariable) coefficient += term.coefficient;
    else constant += term.coefficient;
  }
  return { coefficient, constant };
}

/** Renders an unsimplified term list in the order given, e.g. "4x + 3 - 2x + 5". */
export function formatTerms(terms: AlgebraTerm[], variable = 'x'): string {
  return terms
    .map((term, index) => {
      const magnitude = Math.abs(term.coefficient);
      const symbol = term.isVariable ? (magnitude === 1 ? variable : `${magnitude}${variable}`) : `${magnitude}`;
      if (index === 0) return term.coefficient < 0 ? `-${symbol}` : symbol;
      return `${term.coefficient < 0 ? '-' : '+'} ${symbol}`;
    })
    .join(' ');
}

export interface LinearEquation {
  left: LinearExpr;
  right: LinearExpr;
}

export function formatLinearEquation(equation: LinearEquation, variable = 'x'): string {
  return `${formatLinearExpr(equation.left, variable)} = ${formatLinearExpr(equation.right, variable)}`;
}

/**
 * The unique `x` that makes both sides equal, or `null` when the coefficients
 * cancel out (either every `x` works, or none does) — never expected from a
 * generator, but a real possibility to guard against, not assume away.
 */
export function solveLinearEquation(equation: LinearEquation): number | null {
  const coefficientDiff = equation.left.coefficient - equation.right.coefficient;
  if (coefficientDiff === 0) return null;
  return (equation.right.constant - equation.left.constant) / coefficientDiff;
}

/**
 * Whether substituting `x` into both sides actually balances the equation.
 * Compared with a small tolerance rather than `===`: `x` itself can be a
 * non-terminating binary fraction (e.g. a `1/3`-style solution) even though
 * every coefficient involved is a small integer, so an exact comparison
 * would reject a genuinely correct solution to floating-point noise.
 */
export function satisfiesEquation(equation: LinearEquation, x: number): boolean {
  return Math.abs(evalLinearExpr(equation.left, x) - evalLinearExpr(equation.right, x)) < 1e-9;
}
