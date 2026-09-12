import { normalizeNeoFeed } from '../shared/normalize.js';
import {
  cachedUpstream,
  fetchUpstreamJson,
  nasaApiKey,
  ok,
  sendResult,
  utcDate,
  withErrorEnvelope,
} from './_lib.js';

/**
 * GET /api/neo — NeoWs close approaches for the next 7 days (today + 6).
 *
 * NeoWs caps a feed request at a 7-day window, which is exactly the product
 * window, so a single upstream call covers the whole view.
 */
export default withErrorEnvelope('neo', async (_req, res) => {
  const startDate = utcDate(0);
  const endDate = utcDate(6);

  const url = new URL('https://api.nasa.gov/neo/rest/v1/feed');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('api_key', nasaApiKey());

  const raw = await cachedUpstream(url.toString(), 10 * 60_000, () => fetchUpstreamJson(url));
  sendResult(res, ok(normalizeNeoFeed(raw, startDate, endDate)), {
    cacheControl: 'public, s-maxage=1800, stale-while-revalidate=21600',
  });
});
