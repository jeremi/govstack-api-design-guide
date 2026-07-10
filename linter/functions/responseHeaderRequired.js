import { isObject, asArray, statusMatcher } from './lib/util.js';

/**
 * responseHeaderRequired — assert that responses whose status matches a pattern
 * declare one or more headers, and (optionally) that a companion status exists.
 *
 * `given` should select an operation's `responses` object, e.g.
 * `$.paths[*][get,put,post,delete,patch].responses`.
 *
 * options:
 *   status         {string} status matcher: "201" | "2xx" | "default" | regex.
 *   headers        {string|string[]} header name(s) each matching response MUST
 *                  declare (compared case-insensitively by default).
 *   caseInsensitive{boolean} default true.
 *   requireStatus  {boolean} if true, at least one response must match `status`
 *                  (otherwise the rule only constrains matches that exist).
 *   alsoRequireStatus {string} a companion status matcher that MUST also be
 *                  present in the responses object (e.g. a 304 alongside ETag).
 *
 * @param {unknown} targetVal - a responses object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function responseHeaderRequired(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const wanted = asArray(opts.headers).filter((h) => typeof h === 'string' && h.length);
  const matchStatus = statusMatcher(opts.status);
  const ci = opts.caseInsensitive !== false;
  const results = [];

  const statusKeys = Object.keys(targetVal);
  const matching = statusKeys.filter(matchStatus);

  if (opts.requireStatus === true && matching.length === 0) {
    results.push({
      message: `no response declared for status "${opts.status}"`,
      path: [...base],
    });
  }

  for (const key of matching) {
    const response = targetVal[key];
    if (!isObject(response)) continue;
    const declared = isObject(response.headers) ? Object.keys(response.headers) : [];
    const declaredCmp = ci ? declared.map((h) => h.toLowerCase()) : declared;
    for (const header of wanted) {
      const needle = ci ? header.toLowerCase() : header;
      if (!declaredCmp.includes(needle)) {
        results.push({
          message: `${key} response must declare a "${header}" header`,
          path: [...base, key],
        });
      }
    }
  }

  if (opts.alsoRequireStatus !== undefined) {
    const companion = statusMatcher(opts.alsoRequireStatus);
    if (!statusKeys.some(companion)) {
      results.push({
        message: `responses must also declare a "${opts.alsoRequireStatus}" response`,
        path: [...base],
      });
    }
  }

  return results.length ? results : undefined;
}
