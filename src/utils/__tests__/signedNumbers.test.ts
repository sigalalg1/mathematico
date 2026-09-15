import { describe, expect, it } from 'vitest';
import { formatAbsolute, formatExpression, formatSigned, formatTerm, signToken } from '../signedNumbers';

describe('signed number notation', () => {
  it('writes a plain signed value and never a negative zero', () => {
    expect(formatSigned(5)).toBe('5');
    expect(formatSigned(-5)).toBe('-5');
    expect(formatSigned(0)).toBe('0');
    expect(formatSigned(-0)).toBe('0');
  });

  it('brackets a negative term so it reads as one number', () => {
    expect(formatTerm(-4)).toBe('(-4)');
    expect(formatTerm(4)).toBe('4');
    expect(formatTerm(0)).toBe('0');
  });

  it('leaves a leading minus unbracketed in a sum but brackets it in a product', () => {
    expect(formatExpression(-3, '+', 5)).toBe('-3 + 5');
    expect(formatExpression(2, '-', -6)).toBe('2 - (-6)');
    expect(formatExpression(-4, '×', 3)).toBe('(-4) × 3');
    expect(formatExpression(-12, ':', -3)).toBe('(-12) : (-3)');
  });

  it('writes absolute value with bars around the signed number', () => {
    expect(formatAbsolute(-7)).toBe('|-7|');
    expect(formatAbsolute(7)).toBe('|7|');
    expect(formatAbsolute(0)).toBe('|0|');
  });

  it('reads the sign of a value as the token used in the sign rule', () => {
    expect(signToken(-2)).toBe('-');
    expect(signToken(2)).toBe('+');
  });

  it('never produces a stray minus for values that round to zero', () => {
    expect(formatExpression(-0, '+', -0)).toBe('0 + 0');
    expect(formatAbsolute(-0)).toBe('|0|');
  });
});
