/**
 * Deterministic starfield generation.
 *
 * mulberry32 is a tiny, well-distributed 32-bit PRNG — more than enough for
 * scenery, and seeding it means the "Tonight" sky is stable for a given date:
 * the field doesn't reshuffle on re-render, and tests can assert exact output.
 */

export interface Star {
  /** Position as fractions of the canvas [0, 1). */
  x: number;
  y: number;
  /** Radius in CSS pixels. */
  radius: number;
  /** Base opacity [0.25, 1]. */
  alpha: number;
  /** Phase offset for the twinkle cycle, radians. */
  twinklePhase: number;
}

/** mulberry32: 32-bit state, period ~2^32. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so string seeds (e.g. an ISO date) map to well-spread 32-bit ints. */
export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function generateStars(seed: number, count: number): Star[] {
  const random = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    // Cubing skews the distribution toward small radii: many faint stars, few bright.
    const magnitude = random() ** 3;
    stars.push({
      x: random(),
      y: random(),
      radius: 0.3 + magnitude * 1.5,
      alpha: 0.25 + random() * 0.75,
      twinklePhase: random() * Math.PI * 2,
    });
  }
  return stars;
}
