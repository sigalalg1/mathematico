/**
 * Card background tints for the grade 3–4 activity listings. Kept in their own
 * module so the tile components file exports components only.
 */
export const PASTEL_TONES = ['mint', 'lavender', 'sky', 'peach', 'yellow', 'pink'] as const;

export type PastelTone = (typeof PASTEL_TONES)[number];

/** Rotates through the palette so adjacent tiles never share a tint. */
export function toneForIndex(index: number): PastelTone {
  return PASTEL_TONES[index % PASTEL_TONES.length];
}
