import { isObject } from './lib/util.js';

/**
 * s08 requestIdCorrelation — proxy for guide 8.4: a request SHOULD carry an
 * X-Request-Id header, and the server MUST echo it in the response (or
 * generate one if absent from the request).
 *
 * Checks, per operation:
 *   - it SHOULD declare an X-Request-Id header parameter (in: header);
 *   - every 2xx response MUST declare an X-Request-Id response header
 *     (mechanically, presence in the spec stands in for "echoed or
 *     generated" — the runtime behaviour is out of scope).
 *
 * Does NOT verify: actual runtime echo/generate behaviour, distinctness
 * from the error-envelope `traceId` (§11.3, explicitly a BB's choice), or
 * path-item-level (shared) parameters — only operation-level parameters are
 * inspected.
 *
 * `given` should select an operation, e.g.
 * `$.paths[*][get,put,post,delete,patch]`.
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function requestIdCorrelation(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const params = Array.isArray(targetVal.parameters) ? targetVal.parameters : [];
  const hasParam = params.some(
    (p) => isObject(p) && p.in === 'header' && typeof p.name === 'string' && p.name.toLowerCase() === 'x-request-id',
  );
  if (!hasParam) {
    results.push({
      message: 'operation should declare an X-Request-Id header parameter for correlation',
      path: [...base, 'parameters'],
    });
  }

  const responses = targetVal.responses;
  if (isObject(responses)) {
    for (const [status, response] of Object.entries(responses)) {
      if (status[0] !== '2' || !isObject(response)) continue;
      const declared = isObject(response.headers) ? Object.keys(response.headers).map((h) => h.toLowerCase()) : [];
      if (!declared.includes('x-request-id')) {
        results.push({
          message: `${status} response must declare an X-Request-Id header (echoed or server-generated)`,
          path: [...base, 'responses', status],
        });
      }
    }
  }

  return results.length ? results : undefined;
}
