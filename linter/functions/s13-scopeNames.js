import { isObject, toRegExp } from './lib/util.js';

/**
 * scopeNames — assert every OAuth scope string obeys the GovStack scope naming
 * convention (§13.4). Scopes are the *keys* of an oauth2 scheme's
 * `flows.<flow>.scopes` object.
 *
 * This is a proxy: it validates the *shape* of each scope string against the
 * default `bb:{bb-code}:{resource}:{action}` and its two documented
 * alternatives (reverse-DNS `global.govstack.{bb-code}.{resource}.{action}` and
 * `resource.action`). It does NOT verify that `{bb-code}` is the BB's actual
 * registered code (§9.11), that scopes are unique ecosystem-wide, that a single
 * convention is used consistently, or that every operation documents its scopes.
 *
 * Given: a `scopes` object (`$.components.securitySchemes[*].flows[*].scopes`).
 *
 * options:
 *   patterns {string[]} regexes; each scope key must match at least one.
 *   flags    {string}   regex flags applied to every pattern.
 *   label    {string}   convention name used in the message.
 *
 * @param {unknown} targetVal - a scopes object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function scopeNames(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const label = typeof opts.label === 'string' ? opts.label : 'the GovStack scope naming convention';

  const regexes = (Array.isArray(opts.patterns) ? opts.patterns : [])
    .map((p) => toRegExp(p, typeof opts.flags === 'string' ? opts.flags : undefined))
    .filter((r) => r instanceof RegExp);
  if (regexes.length === 0) return;

  const results = [];
  for (const key of Object.keys(targetVal)) {
    if (!regexes.some((r) => r.test(key))) {
      results.push({
        message: `scope "${key}" does not match ${label} (bb:{bb-code}:{resource}:{action})`,
        path: [...base, key],
      });
    }
  }
  return results.length ? results : undefined;
}
