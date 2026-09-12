import { describe, expect, it } from 'vitest';
import { generateStars, hashSeed, mulberry32 } from './starfield';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('stays in [0, 1) and is roughly uniform', () => {
    const random = mulberry32(42);
    let sum = 0;
    for (let i = 0; i < 10_000; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10_000).toBeGreaterThan(0.47);
    expect(sum / 10_000).toBeLessThan(0.53);
  });
});

describe('hashSeed', () => {
  it('maps equal strings to equal seeds and distinct dates to distinct seeds', () => {
    expect(hashSeed('2026-09-11')).toBe(hashSeed('2026-09-11'));
    expect(hashSeed('2026-09-11')).not.toBe(hashSeed('2026-09-12'));
  });
});

describe('generateStars', () => {
  it('produces an identical field for the same seed', () => {
    expect(generateStars(hashSeed('2026-09-11'), 100)).toEqual(
      generateStars(hashSeed('2026-09-11'), 100),
    );
  });

  it('produces a different field for a different seed', () => {
    const today = generateStars(hashSeed('2026-09-11'), 100);
    const tomorrow = generateStars(hashSeed('2026-09-12'), 100);
    expect(today).not.toEqual(tomorrow);
  });

  it('keeps every star within bounds', () => {
    for (const star of generateStars(7, 500)) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(1);
      expect(star.radius).toBeGreaterThan(0);
      expect(star.alpha).toBeGreaterThanOrEqual(0.25);
      expect(star.alpha).toBeLessThanOrEqual(1);
    }
  });
});
