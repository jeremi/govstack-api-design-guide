import { isObject } from './lib/util.js';

const LEGACY_RATE_LIMIT_HEADERS = ['ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset'];
const shouldCheck = (status) => /^2\d\d$/.test(status) || status === '429';

/**
 * s08 rateLimitHeaders — proxy for guide 8.7: endpoints rate-limited by the
 * BB itself MUST declare the structured RateLimit response header, and 429
 * responses MUST additionally declare Retry-After. Legacy three-header names
 * are forbidden in `forbidLegacy` mode.
 *
 * Proxy signal: an operation that declares a 429 response is treated as
 * "rate-limited by the BB itself" (the delegated-to-gateway exception,
 * which requires only a prose statement, is not mechanically checkable).
 * RateLimit is then required on that operation's 2xx and 429 responses.
 *
 * Does NOT verify: that rate limiting is actually implemented, the
 * delegated-to-gateway prose exception, or the header's runtime field
 * values.
 *
 * `given` should select an operation's `responses`, e.g.
 * `$.paths[*][get,put,post,delete,patch].responses`.
 *
 * @param {unknown} targetVal - a responses object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function rateLimitHeaders(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];
  const statuses = Object.keys(targetVal);

  if (options?.forbidLegacy === true) {
    for (const [status, response] of Object.entries(targetVal)) {
      const declared = isObject(response) && isObject(response.headers)
        ? Object.keys(response.headers).map((header) => header.toLowerCase())
        : [];
      const legacy = LEGACY_RATE_LIMIT_HEADERS.filter((header) => declared.includes(header));
      if (legacy.length) {
        results.push({
          message: `${status} response declares legacy rate-limit headers: ${legacy.join(', ')}`,
          path: [...base, status, 'headers'],
        });
      }
    }
    return results.length ? results : undefined;
  }

  if (!statuses.includes('429')) return;

  const response429 = targetVal['429'];
  const declared429 = isObject(response429) && isObject(response429.headers)
    ? Object.keys(response429.headers).map((h) => h.toLowerCase())
    : [];
  if (!declared429.includes('retry-after')) {
    results.push({ message: '429 response must declare a "Retry-After" header', path: [...base, '429'] });
  }

  for (const status of statuses.filter(shouldCheck)) {
    const response = targetVal[status];
    if (!isObject(response)) continue;
    const declared = isObject(response.headers) ? Object.keys(response.headers).map((h) => h.toLowerCase()) : [];
    if (!declared.includes('ratelimit')) {
      results.push({
        message: `${status} response must declare the structured "RateLimit" header`,
        path: [...base, status],
      });
    }
  }

  return results.length ? results : undefined;
}
