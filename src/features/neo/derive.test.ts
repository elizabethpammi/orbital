import { describe, expect, it } from 'vitest';
import type { NeoApproach } from '../../../shared/types';
import {
  DEFAULT_SORT,
  filterApproaches,
  nextSort,
  representativeDiameterM,
  sortApproaches,
} from './derive';

function approach(overrides: Partial<NeoApproach>): NeoApproach {
  return {
    id: 'id-0',
    name: '2026 AA',
    hazardous: false,
    diameterMinM: 100,
    diameterMaxM: 400,
    epochMs: 1_000,
    missKm: 1_000_000,
    velocityKps: 10,
    ...overrides,
  };
}

const rows: NeoApproach[] = [
  approach({ id: 'a', name: '2026 QF3', missKm: 5_000_000, epochMs: 3_000, velocityKps: 8, hazardous: true }),
  approach({ id: 'b', name: 'Apophis', missKm: 100_000, epochMs: 1_000, velocityKps: 30 }),
  approach({ id: 'c', name: '2026 ab1', missKm: 900_000, epochMs: 2_000, velocityKps: 15, hazardous: true }),
];

describe('sortApproaches', () => {
  it('sorts by miss distance ascending and descending', () => {
    expect(sortApproaches(rows, { key: 'missKm', direction: 'asc' }).map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(sortApproaches(rows, { key: 'missKm', direction: 'desc' }).map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts names case-insensitively', () => {
    const sorted = sortApproaches(rows, { key: 'name', direction: 'asc' });
    expect(sorted.map((r) => r.name)).toEqual(['2026 ab1', '2026 QF3', 'Apophis']);
  });

  it('does not mutate its input and breaks ties stably by id', () => {
    const tied = [approach({ id: 'z' }), approach({ id: 'y' })];
    const copy = [...tied];
    const sorted = sortApproaches(tied, { key: 'missKm', direction: 'asc' });
    expect(tied).toEqual(copy);
    expect(sorted.map((r) => r.id)).toEqual(['y', 'z']);
  });
});

describe('nextSort', () => {
  it('flips direction on the active column and resets to asc on a new one', () => {
    expect(nextSort(DEFAULT_SORT, 'date')).toEqual({ key: 'date', direction: 'desc' });
    expect(nextSort({ key: 'date', direction: 'desc' }, 'date')).toEqual({ key: 'date', direction: 'asc' });
    expect(nextSort({ key: 'missKm', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' });
  });
});

describe('filterApproaches', () => {
  it('matches names case-insensitively with surrounding whitespace ignored', () => {
    expect(filterApproaches(rows, { query: '  apoPHIS ', hazardousOnly: false })).toHaveLength(1);
    expect(filterApproaches(rows, { query: '2026', hazardousOnly: false })).toHaveLength(2);
  });

  it('applies the hazardous flag alone and combined with a query', () => {
    expect(filterApproaches(rows, { query: '', hazardousOnly: true }).map((r) => r.id)).toEqual(['a', 'c']);
    expect(filterApproaches(rows, { query: 'qf3', hazardousOnly: true }).map((r) => r.id)).toEqual(['a']);
  });

  it('returns everything for an empty filter and nothing for an impossible one', () => {
    expect(filterApproaches(rows, { query: '', hazardousOnly: false })).toHaveLength(3);
    expect(filterApproaches(rows, { query: 'no such rock', hazardousOnly: false })).toHaveLength(0);
  });
});

describe('representativeDiameterM', () => {
  it('is the geometric mean of the bounds', () => {
    expect(representativeDiameterM({ diameterMinM: 100, diameterMaxM: 400 })).toBe(200);
  });
});
