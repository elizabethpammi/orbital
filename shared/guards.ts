/**
 * Hand-written runtime type guards.
 *
 * Deliberately no validation library: the shapes here are small and stable,
 * and a few composable primitives keep the whole surface auditable at a
 * glance while adding zero dependencies to the serverless bundles.
 */

import type { Apod, ApiResult, IssPosition, NeoApproach, NeoFeed } from './types.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Accepts a finite number or a numeric string; returns the number or null. */
export function toFiniteNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  if (isString(value) && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function isApod(value: unknown): value is Apod {
  return (
    isRecord(value) &&
    isString(value.date) &&
    isString(value.title) &&
    isString(value.explanation) &&
    (value.mediaType === 'image' || value.mediaType === 'video' || value.mediaType === 'other') &&
    isString(value.url) &&
    (value.hdUrl === null || isString(value.hdUrl)) &&
    (value.copyright === null || isString(value.copyright))
  );
}

export function isNeoApproach(value: unknown): value is NeoApproach {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isBoolean(value.hazardous) &&
    isFiniteNumber(value.diameterMinM) &&
    isFiniteNumber(value.diameterMaxM) &&
    isFiniteNumber(value.epochMs) &&
    isFiniteNumber(value.missKm) &&
    isFiniteNumber(value.velocityKps)
  );
}

export function isNeoFeed(value: unknown): value is NeoFeed {
  return (
    isRecord(value) &&
    isString(value.startDate) &&
    isString(value.endDate) &&
    Array.isArray(value.approaches) &&
    value.approaches.every(isNeoApproach)
  );
}

export function isIssPosition(value: unknown): value is IssPosition {
  return (
    isRecord(value) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    isFiniteNumber(value.altitudeKm) &&
    isFiniteNumber(value.velocityKmh) &&
    isFiniteNumber(value.timestamp)
  );
}

/** Validates the transport envelope; `isData` validates the payload inside it. */
export function isApiResult<T>(
  value: unknown,
  isData: (data: unknown) => data is T,
): value is ApiResult<T> {
  if (!isRecord(value)) return false;
  if (value.ok === true) {
    return isString(value.fetchedAt) && isData(value.data);
  }
  if (value.ok === false) {
    return isRecord(value.error) && isString(value.error.code) && isString(value.error.message);
  }
  return false;
}
