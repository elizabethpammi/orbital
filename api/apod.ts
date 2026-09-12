import { normalizeApod } from '../shared/normalize';
import {
  cachedUpstream,
  fetchUpstreamJson,
  nasaApiKey,
  ok,
  sendResult,
  withErrorEnvelope,
} from './_lib';

/**
 * GET /api/apod — NASA Astronomy Picture of the Day.
 *
 * APOD changes once per day; an hour of shared cache (plus a day of
 * stale-while-revalidate) keeps the DEMO_KEY quota far from its limit.
 */
export default withErrorEnvelope('apod', async (_req, res) => {
  const url = new URL('https://api.nasa.gov/planetary/apod');
  url.searchParams.set('api_key', nasaApiKey());
  url.searchParams.set('thumbs', 'true');

  const raw = await cachedUpstream(url.toString(), 10 * 60_000, () => fetchUpstreamJson(url));
  sendResult(res, ok(normalizeApod(raw)), {
    cacheControl: 'public, s-maxage=3600, stale-while-revalidate=86400',
  });
});
