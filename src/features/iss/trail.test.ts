import { describe, expect, it } from 'vitest';
import { appendToTrail, splitAtAntimeridian, TRAIL_LENGTH, type TrailPoint } from './trail';

function point(longitude: number, timestamp: number, latitude = 0): TrailPoint {
  return { latitude, longitude, timestamp };
}

describe('appendToTrail', () => {
  it('appends new samples and caps the trail length', () => {
    let trail: TrailPoint[] = [];
    for (let i = 0; i < TRAIL_LENGTH + 10; i++) {
      trail = appendToTrail(trail, point(i, i));
    }
    expect(trail).toHaveLength(TRAIL_LENGTH);
    expect(trail[0]?.timestamp).toBe(10); // oldest samples dropped
    expect(trail[trail.length - 1]?.timestamp).toBe(TRAIL_LENGTH + 9);
  });

  it('ignores a sample with a timestamp it already has', () => {
    const trail = appendToTrail([point(10, 100)], point(11, 100));
    expect(trail).toHaveLength(1);
    expect(trail[0]?.longitude).toBe(10);
  });
});

describe('splitAtAntimeridian', () => {
  it('keeps a well-behaved trail as one segment', () => {
    const segments = splitAtAntimeridian([point(10, 1), point(15, 2), point(20, 3)]);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveLength(3);
  });

  it('splits where the track wraps from +179 to -179', () => {
    const segments = splitAtAntimeridian([
      point(170, 1),
      point(179, 2),
      point(-179, 3),
      point(-170, 4),
    ]);
    expect(segments).toHaveLength(2);
    expect(segments[0]?.map((p) => p.longitude)).toEqual([170, 179]);
    expect(segments[1]?.map((p) => p.longitude)).toEqual([-179, -170]);
  });

  it('drops single-point fragments that cannot be drawn as lines', () => {
    const segments = splitAtAntimeridian([point(179, 1), point(-179, 2)]);
    expect(segments).toHaveLength(0);
  });
});
