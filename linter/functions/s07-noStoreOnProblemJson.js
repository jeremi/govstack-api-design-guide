import { isObject } from './lib/util.js';

/**
 * s07-noStoreOnProblemJson — assert that a response using
 * `application/problem+json` content declares a `Cache-Control` header
 * (guide 7.20). Presence-only: does not check that the header's value is
 * actually `no-store`, and does not attempt to identify "Operation-status
 * responses" (§15), which have no content-type signature to key off.
 *
 * `given` should select individual response objects, e.g.
 * `$.paths[*][get,put,post,delete,patch].responses[*]`.
 *
 * @param {unknown} targetVal - a response object.
 * @param {object} [options] - unused.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s07NoStoreOnProblemJson(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const content = targetVal.content;
  if (!isObject(content)) return;

  const isProblemJson = Object.keys(content).some((key) => /^application\/problem\+json/i.test(key));
  if (!isProblemJson) return;

  const declared = isObject(targetVal.headers) ? Object.keys(targetVal.headers) : [];
  const hasCacheControl = declared.some((h) => h.toLowerCase() === 'cache-control');
  if (hasCacheControl) return;

  const base = context && Array.isArray(context.path) ? context.path : [];
  return [
    {
      message: 'application/problem+json response must declare a "Cache-Control" header',
      path: [...base],
    },
  ];
}
