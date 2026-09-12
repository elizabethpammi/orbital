import { normalizeIss } from '../shared/normalize';
import { fetchUpstreamJson, ok, sendResult, withErrorEnvelope } from './_lib';

/**
 * GET /api/iss — live ISS position (NORAD 25544) via wheretheiss.at.
 *
 * The station moves ~7.7 km/s, so responses are never cached; the client
 * polls this endpoint on a 5-second interval.
 */
export default withErrorEnvelope('iss', async (_req, res) => {
  const url = new URL('https://api.wheretheiss.at/v1/satellites/25544');
  url.searchParams.set('units', 'kilometers');

  const raw = await fetchUpstreamJson(url);
  sendResult(res, ok(normalizeIss(raw)), { cacheControl: 'no-store' });
});
