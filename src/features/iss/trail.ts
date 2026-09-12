/**
 * Ground-track trail logic, kept pure for testing.
 *
 * The interesting edge case is the antimeridian: when the station crosses
 * ±180° longitude, a naive polyline draws a horizontal slash across the whole
 * map. The trail is therefore split into segments wherever consecutive
 * samples jump more than 180° in longitude.
 */

import type { IssPosition } from '../../../shared/types';

export const TRAIL_LENGTH = 30;

export type TrailPoint = Pick<IssPosition, 'latitude' | 'longitude' | 'timestamp'>;

/** Appends a sample, dropping duplicates (same timestamp) and old points. */
export function appendToTrail(trail: readonly TrailPoint[], sample: TrailPoint): TrailPoint[] {
  const last = trail[trail.length - 1];
  if (last && last.timestamp === sample.timestamp) return [...trail];
  return [...trail, sample].slice(-TRAIL_LENGTH);
}

/** Splits the trail into drawable segments at antimeridian crossings. */
export function splitAtAntimeridian(trail: readonly TrailPoint[]): TrailPoint[][] {
  const segments: TrailPoint[][] = [];
  let current: TrailPoint[] = [];
  let previous: TrailPoint | undefined;
  for (const point of trail) {
    if (previous && Math.abs(point.longitude - previous.longitude) > 180) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(point);
    previous = point;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
