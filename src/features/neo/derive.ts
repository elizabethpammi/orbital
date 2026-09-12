/**
 * Pure derivation logic for the Near Earth table — kept free of React so the
 * sort/filter behavior is unit-testable without rendering anything.
 */

import type { NeoApproach } from '../../../shared/types';

export type SortKey = 'name' | 'date' | 'missKm' | 'diameter' | 'velocityKps';
export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: SortSpec = { key: 'date', direction: 'asc' };

/** Geometric mean of the diameter bounds — one comparable "size" number. */
export function representativeDiameterM(neo: Pick<NeoApproach, 'diameterMinM' | 'diameterMaxM'>): number {
  return Math.sqrt(neo.diameterMinM * neo.diameterMaxM);
}

function sortValue(neo: NeoApproach, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return neo.name.toLowerCase();
    case 'date':
      return neo.epochMs;
    case 'missKm':
      return neo.missKm;
    case 'diameter':
      return representativeDiameterM(neo);
    case 'velocityKps':
      return neo.velocityKps;
  }
}

export function sortApproaches(rows: readonly NeoApproach[], spec: SortSpec): NeoApproach[] {
  const sign = spec.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, spec.key);
    const vb = sortValue(b, spec.key);
    if (va < vb) return -sign;
    if (va > vb) return sign;
    // Stable tiebreak so equal values don't jitter between renders.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Clicking the active column flips direction; a new column starts ascending. */
export function nextSort(current: SortSpec, key: SortKey): SortSpec {
  if (current.key === key) {
    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { key, direction: 'asc' };
}

export interface NeoFilter {
  query: string;
  hazardousOnly: boolean;
}

export function filterApproaches(rows: readonly NeoApproach[], filter: NeoFilter): NeoApproach[] {
  const query = filter.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.hazardousOnly && !row.hazardous) return false;
    if (query && !row.name.toLowerCase().includes(query)) return false;
    return true;
  });
}

/* Formatting ------------------------------------------------------------- */

const compactKm = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatMissDistance(missKm: number): string {
  return `${compactKm.format(missKm)} km`;
}

export function formatDiameterRange(neo: Pick<NeoApproach, 'diameterMinM' | 'diameterMaxM'>): string {
  const format = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);
  return `${format(neo.diameterMinM)}–${format(neo.diameterMaxM)}`;
}

export function formatVelocity(kps: number): string {
  return `${kps.toFixed(1)} km/s`;
}

export function formatApproachDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  });
}
