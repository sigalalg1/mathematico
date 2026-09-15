/**
 * Shared notation helpers for the Grade 7 Signed Numbers unit.
 *
 * Every string produced here is math notation and must be rendered inside
 * `<MathText>` so it stays left-to-right on the Hebrew (RTL) page.
 */

/** A plain signed value: "-4", "0", "7". Never renders a negative zero. */
export function formatSigned(value: number): string {
  if (value === 0) return '0';
  return String(value);
}

/** A value used as a term in an expression: negatives get parentheses, e.g. "(-4)". */
export function formatTerm(value: number): string {
  return value < 0 ? `(${value})` : formatSigned(value);
}

export type SignedOperator = '+' | '-' | '×' | ':';

/**
 * A full binary expression, e.g. "-3 + 5", "2 - (-6)", "(-4) × 3".
 *
 * A leading minus needs no brackets in a sum, but the multiplication and
 * division forms are conventionally written with both factors bracketed.
 */
export function formatExpression(left: number, operator: SignedOperator, right: number): string {
  const leftText = operator === '+' || operator === '-' ? formatSigned(left) : formatTerm(left);
  return `${leftText} ${operator} ${formatTerm(right)}`;
}

/** Absolute-value notation, e.g. "|-7|". */
export function formatAbsolute(value: number): string {
  return `|${formatSigned(value)}|`;
}

/** The sign of a non-zero value as the token students read in the sign rule. */
export function signToken(value: number): '+' | '-' {
  return value < 0 ? '-' : '+';
}
