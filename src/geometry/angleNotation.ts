/**
 * Chapter 21 — angle notation math: the three-letter name (middle letter is
 * always the vertex), name-equivalence, and the Greek-letter shorthand.
 * Framework-agnostic: pure string/array logic over point labels.
 */

export function threeLetterName(armA: string, vertex: string, armB: string): string {
  return `${armA}${vertex}${armB}`;
}

/**
 * Whether `name` is a mathematically correct three-letter name for the angle
 * at `vertexLabel` between the two rays labeled `armLabels`. The outer two
 * letters may appear in either order (∠BAC and ∠CAB name the same angle);
 * only the middle letter must be the vertex.
 */
export function isValidAngleName(name: string, vertexLabel: string, armLabels: readonly [string, string]): boolean {
  if (name.length !== 3) return false;
  const [first, middle, last] = name;
  if (middle !== vertexLabel) return false;
  const outerGiven = [first, last].sort().join('');
  const outerExpected = [...armLabels].sort().join('');
  return outerGiven === outerExpected;
}

/** Both correct three-letter orderings for one angle. */
export function allValidThreeLetterNames(vertexLabel: string, armLabels: readonly [string, string]): string[] {
  const [a, b] = armLabels;
  return [threeLetterName(a, vertexLabel, b), threeLetterName(b, vertexLabel, a)];
}

/**
 * A vertex-only name (e.g. "∠F") is unambiguous only when exactly one angle
 * exists at that vertex — i.e. the vertex has exactly two rays.
 */
export function canUseVertexOnlyName(rayCountAtVertex: number): boolean {
  return rayCountAtVertex === 2;
}

/** Whether two three-letter names refer to the exact same angle (same vertex, same unordered pair of arms). */
export function namesReferToSameAngle(nameA: string, nameB: string): boolean {
  if (nameA.length !== 3 || nameB.length !== 3) return false;
  if (nameA[1] !== nameB[1]) return false;
  const outerA = [nameA[0], nameA[2]].sort().join('');
  const outerB = [nameB[0], nameB[2]].sort().join('');
  return outerA === outerB;
}

/**
 * Greek-letter shorthand (chapter 21): α/β/γ/δ, used per-diagram (never
 * meant to correspond across different diagrams). The mnemonic ties the
 * Greek order to the Latin alphabet order the letters are introduced in:
 * Alpha↔A, Beta↔B, Gamma↔G, Delta↔D.
 */
export const GREEK_LETTERS = ['α', 'β', 'γ', 'δ'] as const;
export type GreekLetter = (typeof GREEK_LETTERS)[number];

/** The Greek letter for the Nth (0-based) angle introduced in a diagram, per the chapter's mnemonic, or `null` once past δ. */
export function greekLetterForIndex(index: number): GreekLetter | null {
  return GREEK_LETTERS[index] ?? null;
}

/**
 * Builds a three-letter name that is deliberately wrong in exactly one way —
 * a plausible distractor for "which of these is NOT a valid name" / "select
 * the correct name" exercises. `kind` controls which mistake it makes:
 *  - `wrongVertex`: the middle letter is one of the arm letters instead of the vertex (the classic naming error).
 *  - `wrongArm`: one outer letter is swapped for an unrelated point label.
 */
export function invalidAngleName(
  vertexLabel: string,
  armLabels: readonly [string, string],
  kind: 'wrongVertex' | 'wrongArm',
  unrelatedLabel?: string,
): string {
  const [a, b] = armLabels;
  if (kind === 'wrongVertex') {
    // Middle letter becomes an arm, and the vertex moves to an outer slot —
    // still uses only the "real" letters of this angle, so it is tempting.
    return threeLetterName(vertexLabel, a, b);
  }
  const swap = unrelatedLabel ?? '?';
  return threeLetterName(swap, vertexLabel, b);
}
