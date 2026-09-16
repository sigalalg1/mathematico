/**
 * The one random source shared by generators that need reproducible sessions.
 *
 * Every generator takes a `RandomSource` rather than calling `Math.random`
 * directly, so a test can replay an exact sequence of questions and a preview
 * can be made deterministic without touching the generator itself.
 */
export type RandomSource = () => number;

/**
 * A small linear congruential generator. Deliberately not cryptographic: it
 * only has to be repeatable for a given seed and evenly spread enough that a
 * question pool is properly explored.
 */
export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

/** A whole number in `[min, max]`, both ends included. */
export function randomInt(random: RandomSource, min: number, max: number): number {
  if (max < min) throw new Error(`randomInt: empty range ${min}..${max}`);
  return min + Math.floor(random() * (max - min + 1));
}

/** Picks one item; the caller guarantees the list is non-empty. */
export function randomOf<T>(random: RandomSource, items: readonly T[]): T {
  return items[randomInt(random, 0, items.length - 1)];
}
