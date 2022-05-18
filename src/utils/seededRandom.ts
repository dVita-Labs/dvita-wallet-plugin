/**
 * Lehmer RNG https://en.wikipedia.org/wiki/Lehmer_random_number_generator
 * Inspiration from https://gist.github.com/blixt/f17b47c62508be59987b
 * Do NOT use for cryptographic purposes
 */
export function seededRandom(originalSeed: number) {
  let seed = (originalSeed <= 0 ? (originalSeed + 2147483646) : originalSeed) % 2147483647;
  return function random() {
    seed = seed * 48271 % 2147483647;
    return (seed - 1) / 2147483646;
  }
}
