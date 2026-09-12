/**
 * Normalizers: raw upstream payloads → the shapes in `types.ts`.
 *
 * Each normalizer takes `unknown` and either returns a fully-validated value
 * or throws `NormalizeError`. Partial data is handled per-endpoint: a NeoWs
 * feed with some malformed entries still normalizes (bad rows are dropped),
 * while a malformed APOD or ISS payload fails outright — there is no partial
 * picture-of-the-day.
 */

import { isRecord, isString, toFiniteNumber } from './guards.js';
import type { Apod, IssPosition, NeoApproach, NeoFeed } from './types.js';

export class NormalizeError extends Error {
  override readonly name = 'NormalizeError';
  constructor(
    readonly source: 'apod' | 'neo' | 'iss',
    message: string,
  ) {
    super(`[${source}] ${message}`);
  }
}

export function normalizeApod(raw: unknown): Apod {
  if (!isRecord(raw)) throw new NormalizeError('apod', 'payload is not an object');
  const { date, title, explanation, media_type, url, hdurl, copyright } = raw;
  if (!isString(date) || !isString(title) || !isString(explanation)) {
    throw new NormalizeError('apod', 'missing date/title/explanation');
  }
  const mediaType: Apod['mediaType'] =
    media_type === 'image' || media_type === 'video' ? media_type : 'other';
  if (!isString(url)) throw new NormalizeError('apod', 'missing media url');
  return {
    date,
    title,
    explanation,
    mediaType,
    url,
    hdUrl: isString(hdurl) ? hdurl : null,
    copyright: isString(copyright) ? copyright.trim() : null,
  };
}

/**
 * Flattens NeoWs `near_earth_objects` (keyed by date) into one sorted list of
 * close approaches. Individually malformed objects are skipped rather than
 * failing the whole feed — NeoWs data quality varies day to day.
 */
export function normalizeNeoFeed(raw: unknown, startDate: string, endDate: string): NeoFeed {
  if (!isRecord(raw) || !isRecord(raw.near_earth_objects)) {
    throw new NormalizeError('neo', 'missing near_earth_objects');
  }
  const approaches: NeoApproach[] = [];
  for (const day of Object.values(raw.near_earth_objects)) {
    if (!Array.isArray(day)) continue;
    for (const neo of day) {
      const normalized = normalizeNeoObject(neo);
      if (normalized) approaches.push(normalized);
    }
  }
  approaches.sort((a, b) => a.epochMs - b.epochMs);
  return { startDate, endDate, approaches };
}

function normalizeNeoObject(neo: unknown): NeoApproach | null {
  if (!isRecord(neo) || !isString(neo.id) || !isString(neo.name)) return null;

  const meters = isRecord(neo.estimated_diameter)
    ? neo.estimated_diameter.meters
    : undefined;
  if (!isRecord(meters)) return null;
  const diameterMinM = toFiniteNumber(meters.estimated_diameter_min);
  const diameterMaxM = toFiniteNumber(meters.estimated_diameter_max);

  const approach = Array.isArray(neo.close_approach_data) ? neo.close_approach_data[0] : undefined;
  if (!isRecord(approach)) return null;
  const epochMs = toFiniteNumber(approach.epoch_date_close_approach);
  const missKm = isRecord(approach.miss_distance)
    ? toFiniteNumber(approach.miss_distance.kilometers)
    : null;
  const velocityKps = isRecord(approach.relative_velocity)
    ? toFiniteNumber(approach.relative_velocity.kilometers_per_second)
    : null;

  if (
    diameterMinM === null ||
    diameterMaxM === null ||
    epochMs === null ||
    missKm === null ||
    velocityKps === null
  ) {
    return null;
  }

  return {
    id: neo.id,
    // NeoWs wraps provisional designations in parens, e.g. "(2024 AB1)".
    name: neo.name.replace(/^\((.*)\)$/, '$1'),
    hazardous: neo.is_potentially_hazardous_asteroid === true,
    diameterMinM,
    diameterMaxM,
    epochMs,
    missKm,
    velocityKps,
  };
}

export function normalizeIss(raw: unknown): IssPosition {
  if (!isRecord(raw)) throw new NormalizeError('iss', 'payload is not an object');
  const latitude = toFiniteNumber(raw.latitude);
  const longitude = toFiniteNumber(raw.longitude);
  const altitudeKm = toFiniteNumber(raw.altitude);
  const velocityKmh = toFiniteNumber(raw.velocity);
  const timestamp = toFiniteNumber(raw.timestamp);
  if (
    latitude === null ||
    longitude === null ||
    altitudeKm === null ||
    velocityKmh === null ||
    timestamp === null
  ) {
    throw new NormalizeError('iss', 'missing position fields');
  }
  if (latitude < -90 || latitude > 90) throw new NormalizeError('iss', 'latitude out of range');
  // wheretheiss.at reports longitude in [-180, 180]; wrap only if it strays,
  // so in-range values pass through without floating-point drift.
  const lon =
    longitude >= -180 && longitude <= 180 ? longitude : ((((longitude + 180) % 360) + 360) % 360) - 180;
  return { latitude, longitude: lon, altitudeKm, velocityKmh, timestamp };
}
