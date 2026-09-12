import { describe, expect, it } from 'vitest';
import { isApiResult, isApod, isIssPosition, isNeoFeed } from './guards.js';
import { NormalizeError, normalizeApod, normalizeIss, normalizeNeoFeed } from './normalize.js';

const rawApod = {
  date: '2026-09-11',
  title: 'The Horsehead Nebula',
  explanation: 'A dark nebula in Orion.',
  media_type: 'image',
  url: 'https://apod.nasa.gov/apod/image/horsehead.jpg',
  hdurl: 'https://apod.nasa.gov/apod/image/horsehead_hd.jpg',
  copyright: '  Jane Astronomer\n',
  service_version: 'v1',
};

function rawNeo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '3542519',
    name: '(2010 PK9)',
    is_potentially_hazardous_asteroid: true,
    estimated_diameter: {
      meters: { estimated_diameter_min: 130.0289270043, estimated_diameter_max: 290.7118453 },
    },
    close_approach_data: [
      {
        epoch_date_close_approach: 1789200000000,
        miss_distance: { kilometers: '31282912.22' },
        relative_velocity: { kilometers_per_second: '19.4794586771' },
      },
    ],
    ...overrides,
  };
}

describe('normalizeApod', () => {
  it('normalizes a valid image payload and passes its own guard', () => {
    const apod = normalizeApod(rawApod);
    expect(apod).toEqual({
      date: '2026-09-11',
      title: 'The Horsehead Nebula',
      explanation: 'A dark nebula in Orion.',
      mediaType: 'image',
      url: 'https://apod.nasa.gov/apod/image/horsehead.jpg',
      hdUrl: 'https://apod.nasa.gov/apod/image/horsehead_hd.jpg',
      copyright: 'Jane Astronomer',
    });
    expect(isApod(apod)).toBe(true);
  });

  it('maps unknown media types to "other" and missing optionals to null', () => {
    const apod = normalizeApod({
      ...rawApod,
      media_type: 'interactive',
      hdurl: undefined,
      copyright: undefined,
    });
    expect(apod.mediaType).toBe('other');
    expect(apod.hdUrl).toBeNull();
    expect(apod.copyright).toBeNull();
  });

  it('throws NormalizeError on a malformed payload', () => {
    expect(() => normalizeApod({ title: 42 })).toThrow(NormalizeError);
    expect(() => normalizeApod('not an object')).toThrow(NormalizeError);
  });
});

describe('normalizeNeoFeed', () => {
  it('flattens the date-keyed feed, parses numeric strings, and sorts by epoch', () => {
    const feed = normalizeNeoFeed(
      {
        near_earth_objects: {
          '2026-09-12': [
            rawNeo({
              id: 'late',
              close_approach_data: [
                {
                  epoch_date_close_approach: 2000000000000,
                  miss_distance: { kilometers: '500000' },
                  relative_velocity: { kilometers_per_second: '12.5' },
                },
              ],
            }),
          ],
          '2026-09-11': [rawNeo({ id: 'early' })],
        },
      },
      '2026-09-11',
      '2026-09-17',
    );
    expect(feed.approaches.map((a) => a.id)).toEqual(['early', 'late']);
    expect(feed.approaches[0]?.missKm).toBeCloseTo(31282912.22);
    expect(feed.approaches[0]?.velocityKps).toBeCloseTo(19.4794586771);
    expect(isNeoFeed(feed)).toBe(true);
  });

  it('strips the parenthesis wrapper from provisional designations', () => {
    const feed = normalizeNeoFeed(
      { near_earth_objects: { d: [rawNeo()] } },
      '2026-09-11',
      '2026-09-17',
    );
    expect(feed.approaches[0]?.name).toBe('2010 PK9');
  });

  it('drops individually malformed objects instead of failing the feed', () => {
    const feed = normalizeNeoFeed(
      {
        near_earth_objects: {
          d: [
            rawNeo(),
            rawNeo({ id: 'bad-1', estimated_diameter: null }),
            rawNeo({ id: 'bad-2', close_approach_data: [] }),
            'not even an object',
          ],
        },
      },
      '2026-09-11',
      '2026-09-17',
    );
    expect(feed.approaches).toHaveLength(1);
    expect(feed.approaches[0]?.id).toBe('3542519');
  });

  it('throws when near_earth_objects is missing entirely', () => {
    expect(() => normalizeNeoFeed({}, 'a', 'b')).toThrow(NormalizeError);
  });
});

describe('normalizeIss', () => {
  const rawIss = {
    name: 'iss',
    id: 25544,
    latitude: 45.1,
    longitude: -122.4,
    altitude: 420.5,
    velocity: 27560.9,
    timestamp: 1789300000,
  };

  it('normalizes a valid payload and passes its own guard', () => {
    const iss = normalizeIss(rawIss);
    expect(iss).toEqual({
      latitude: 45.1,
      longitude: -122.4,
      altitudeKm: 420.5,
      velocityKmh: 27560.9,
      timestamp: 1789300000,
    });
    expect(isIssPosition(iss)).toBe(true);
  });

  it('wraps out-of-range longitudes into [-180, 180)', () => {
    expect(normalizeIss({ ...rawIss, longitude: 190 }).longitude).toBe(-170);
    expect(normalizeIss({ ...rawIss, longitude: -181 }).longitude).toBe(179);
  });

  it('rejects impossible latitudes and missing fields', () => {
    expect(() => normalizeIss({ ...rawIss, latitude: 97 })).toThrow(NormalizeError);
    expect(() => normalizeIss({ ...rawIss, altitude: 'soon' })).toThrow(NormalizeError);
  });
});

describe('isApiResult (envelope guard)', () => {
  it('accepts ok and error envelopes, rejects everything else', () => {
    const apod = normalizeApod(rawApod);
    expect(isApiResult({ ok: true, data: apod, fetchedAt: 'now' }, isApod)).toBe(true);
    expect(isApiResult({ ok: false, error: { code: 'x', message: 'y' } }, isApod)).toBe(true);
    expect(isApiResult({ ok: true, data: { nope: 1 }, fetchedAt: 'now' }, isApod)).toBe(false);
    expect(isApiResult({ ok: false, error: 'boom' }, isApod)).toBe(false);
    expect(isApiResult(null, isApod)).toBe(false);
  });
});
