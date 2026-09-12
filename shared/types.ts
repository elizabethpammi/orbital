/**
 * The wire contract between the /api layer and the client.
 *
 * Every endpoint returns an `ApiResult<T>` envelope. Upstream payloads are
 * normalized server-side into these shapes, and the client re-validates the
 * envelope with the same guards before trusting it — the browser never sees
 * (or depends on) raw NASA / wheretheiss.at response shapes.
 */

export interface ApiError {
  /** Stable machine-readable code, e.g. `upstream_unavailable`. */
  code: string;
  /** Human-readable summary, safe to render. */
  message: string;
}

export type ApiResult<T> =
  | { ok: true; data: T; fetchedAt: string }
  | { ok: false; error: ApiError };

/** NASA Astronomy Picture of the Day, normalized. */
export interface Apod {
  date: string;
  title: string;
  explanation: string;
  mediaType: 'image' | 'video' | 'other';
  url: string;
  hdUrl: string | null;
  copyright: string | null;
}

/** One close approach of a near-Earth object within the requested window. */
export interface NeoApproach {
  id: string;
  name: string;
  hazardous: boolean;
  /** Estimated diameter bounds, meters. */
  diameterMinM: number;
  diameterMaxM: number;
  /** Close-approach epoch, milliseconds since Unix epoch (UTC). */
  epochMs: number;
  /** Miss distance, kilometers. */
  missKm: number;
  /** Relative velocity, kilometers per second. */
  velocityKps: number;
}

export interface NeoFeed {
  /** ISO dates bounding the window (inclusive). */
  startDate: string;
  endDate: string;
  approaches: NeoApproach[];
}

/** A single ISS position sample. */
export interface IssPosition {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  /** Sample time, seconds since Unix epoch (as reported upstream). */
  timestamp: number;
}
