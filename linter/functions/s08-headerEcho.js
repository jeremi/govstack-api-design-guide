import { isObject, statusMatcher } from './lib/util.js';

/**
 * s08 headerEcho — proxy: IF an operation declares a given request header
 * parameter, THEN its matching (default 2xx) responses must declare a given
 * response header. Drives guide 8.2 (Accept-Language -> Content-Language):
 * a "localisation request" is proxied as one that carries Accept-Language.
 *
 * Does NOT verify: that the echoed value is actually derived from the
 * request (only that the response declares the header), nor requests that
 * omit Accept-Language entirely (that MUST is about requests that ARE
 * localising, which this proxy can only detect via the header's presence).
 *
 * `given` should select an operation, e.g.
 * `$.paths[*][get,put,post,delete,patch]`.
 *
 * options:
 *   requestHeader  {string} (required) request header parameter name (in:
 *                  header) whose presence triggers the check.
 *   responseHeader {string} (required) header name each matching response
 *                  must declare.
 *   status         {string} status matcher for responses to check (default
 *                  "2xx").
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function headerEcho(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  if (typeof opts.requestHeader !== 'string' || typeof opts.responseHeader !== 'string') return;
  const base = context && Array.isArray(context.path) ? context.path : [];

  const params = Array.isArray(targetVal.parameters) ? targetVal.parameters : [];
  const reqName = opts.requestHeader.toLowerCase();
  const hasRequestHeader = params.some(
    (p) => isObject(p) && p.in === 'header' && typeof p.name === 'string' && p.name.toLowerCase() === reqName,
  );
  if (!hasRequestHeader) return;

  const responses = targetVal.responses;
  if (!isObject(responses)) return;
  const matchStatus = statusMatcher(opts.status || '2xx');
  const respName = opts.responseHeader.toLowerCase();
  const results = [];

  for (const [status, response] of Object.entries(responses)) {
    if (!matchStatus(status) || !isObject(response)) continue;
    const declared = isObject(response.headers) ? Object.keys(response.headers).map((h) => h.toLowerCase()) : [];
    if (!declared.includes(respName)) {
      results.push({
        message: `operation accepts "${opts.requestHeader}" but ${status} response does not declare "${opts.responseHeader}"`,
        path: [...base, 'responses', status],
      });
    }
  }

  return results.length ? results : undefined;
}
