import { isObject } from './lib/util.js';

const LEGACY_RATE_LIMIT_HEADERS = ['ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset'];

/**
 * s08 rateLimitHeaders — proxy for guide 8.7: a 429 response SHOULD declare
 * Retry-After. Legacy three-header names are flagged in `forbidLegacy` mode.
 * Declaring the advisory structured RateLimit header is optional (MAY), so
 * its presence is not checked.
 *
 * Proxy signal: an operation that declares a 429 response is treated as
 * rate-limited, whether the BB or a gateway enforces the quota.
 *
 * Does NOT verify: that rate limiting is actually implemented, that the quota
 * scope or gateway ownership is documented, or the headers' runtime values.
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

  if (!Object.hasOwn(targetVal, '429')) return;

  const response429 = targetVal['429'];
  const declared429 = isObject(response429) && isObject(response429.headers)
    ? Object.keys(response429.headers).map((h) => h.toLowerCase())
    : [];
  if (!declared429.includes('retry-after')) {
    results.push({ message: '429 response must declare a "Retry-After" header', path: [...base, '429'] });
  }

  return results.length ? results : undefined;
}
