/**
 * Shared plumbing for the serverless handlers.
 *
 * Handlers are plain Node `(req, res)` functions — no framework — so the same
 * code runs unchanged as a Vercel function, inside Vite's dev middleware, and
 * under `scripts/serve.mjs` for a production-like local preview.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiResult } from '../shared/types';

export type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

const UPSTREAM_TIMEOUT_MS = 9_000;

export class UpstreamError extends Error {
  override readonly name = 'UpstreamError';
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = 'upstream_unavailable',
  ) {
    super(message);
  }
}

/** GET an upstream JSON payload with a hard timeout. Never leaks the URL's query (API keys) into errors. */
export async function fetchUpstreamJson(url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (cause) {
    const reason = cause instanceof Error && cause.name === 'TimeoutError' ? 'timed out' : 'unreachable';
    throw new UpstreamError(502, `${url.hostname} ${reason}`);
  }
  if (response.status === 429) {
    throw new UpstreamError(
      503,
      `${url.hostname} rate limit reached — the shared DEMO_KEY is easy to exhaust. Try again shortly, or set NASA_API_KEY.`,
      'upstream_rate_limited',
    );
  }
  if (!response.ok) {
    throw new UpstreamError(502, `${url.hostname} responded ${response.status}`);
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new UpstreamError(502, `${url.hostname} returned invalid JSON`);
  }
}

export function sendResult<T>(
  res: ServerResponse,
  result: ApiResult<T>,
  options: { status?: number; cacheControl?: string } = {},
): void {
  const status = options.status ?? (result.ok ? 200 : 502);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': options.cacheControl ?? 'no-store',
  });
  res.end(JSON.stringify(result));
}

export function ok<T>(data: T): ApiResult<T> {
  return { ok: true, data, fetchedAt: new Date().toISOString() };
}

export function fail(code: string, message: string): ApiResult<never> {
  return { ok: false, error: { code, message } };
}

/**
 * Wraps a handler body so every failure leaves as a typed error envelope —
 * clients always parse JSON, never an HTML error page.
 */
export function withErrorEnvelope(
  source: string,
  body: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
): Handler {
  return async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendResult(res, fail('method_not_allowed', 'Only GET is supported.'), { status: 405 });
      return;
    }
    try {
      await body(req, res);
    } catch (cause) {
      if (cause instanceof UpstreamError) {
        sendResult(res, fail(cause.code, cause.message), { status: cause.status });
      } else {
        const message = cause instanceof Error ? cause.message : 'Unexpected error.';
        sendResult(res, fail(`${source}_failed`, message), { status: 500 });
      }
    }
  };
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * Per-instance memoization in front of an upstream fetch. The CDN cache
 * (`s-maxage`) already shields production traffic; this additionally shields
 * the rate-limited DEMO_KEY during local dev and warm-lambda bursts, where
 * no CDN sits in front of the handler.
 */
export async function cachedUpstream(
  key: string,
  ttlMs: number,
  load: () => Promise<unknown>,
): Promise<unknown> {
  const hit = memoryCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await load();
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function nasaApiKey(): string {
  return process.env.NASA_API_KEY?.trim() || 'DEMO_KEY';
}

/** UTC calendar date as YYYY-MM-DD, offset by `plusDays`. */
export function utcDate(plusDays = 0): string {
  const d = new Date(Date.now() + plusDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}
