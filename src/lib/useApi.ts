/**
 * Typed fetch layer for the /api endpoints.
 *
 * Two invariants the hook enforces:
 *  1. In-flight requests are aborted when the component unmounts or a reload
 *     supersedes them (AbortController).
 *  2. A slow response can never overwrite a newer one (monotonic request id —
 *     the stale-response guard). Abort alone doesn't cover this: a reload
 *     issued while an earlier response is mid-parse would otherwise race.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiResult } from '../../shared/guards';

export class ApiRequestError extends Error {
  override readonly name = 'ApiRequestError';
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchApi<T>(
  path: string,
  isData: (data: unknown) => data is T,
  signal?: AbortSignal,
): Promise<T> {
  let payload: unknown;
  try {
    const init: RequestInit = signal ? { signal } : {};
    const response = await fetch(path, init);
    payload = await response.json();
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiRequestError('network', 'Could not reach the API. Check your connection.');
  }
  if (!isApiResult(payload, isData)) {
    throw new ApiRequestError('bad_payload', 'The API returned an unexpected shape.');
  }
  if (!payload.ok) {
    throw new ApiRequestError(payload.error.code, payload.error.message);
  }
  return payload.data;
}

export type ApiState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: ApiRequestError };

interface UseApiOptions {
  /** Re-fetch on this interval (ms). Omit for a single fetch. */
  pollMs?: number;
}

export function useApi<T>(
  path: string,
  isData: (data: unknown) => data is T,
  { pollMs }: UseApiOptions = {},
): ApiState<T> & { reload: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading', data: null, error: null });
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(
    (background: boolean) => {
      const requestId = ++requestIdRef.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (!background) setState({ status: 'loading', data: null, error: null });

      fetchApi(path, isData, controller.signal)
        .then((data) => {
          if (requestId !== requestIdRef.current) return; // stale — a newer request owns the state
          setState({ status: 'success', data, error: null });
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) return;
          if (error instanceof DOMException && error.name === 'AbortError') return;
          const wrapped =
            error instanceof ApiRequestError
              ? error
              : new ApiRequestError('unknown', 'Something went wrong.');
          setState({ status: 'error', data: null, error: wrapped });
        });
    },
    [path, isData],
  );

  useEffect(() => {
    load(false);
    let timer: ReturnType<typeof setInterval> | undefined;
    if (pollMs) {
      // Background polls keep the last good data on screen instead of flashing a spinner.
      timer = setInterval(() => load(true), pollMs);
    }
    return () => {
      if (timer) clearInterval(timer);
      controllerRef.current?.abort();
    };
  }, [load, pollMs]);

  const reload = useCallback(() => load(false), [load]);
  return { ...state, reload };
}
