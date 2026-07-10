import { isObject } from './lib/util.js';
import { matchesCasing } from './lib/casing.js';

const VERSION_SEG = /^v\d+$/;
const isParam = (seg) => seg.startsWith('{') && seg.endsWith('}');
const split = (key) => key.split('/').filter((s) => s.length > 0);

/**
 * pathSegments — structural checks over the OpenAPI `paths` object. One check
 * per rule instance (selected by `check`), so each guide rule maps to one
 * clearly-named Spectral rule.
 *
 * `given` should be `$.paths`.
 *
 * options:
 *   check {string} required, one of:
 *     "versionPrefix"        every path key starts with /v{N}/  (guide 5.1)
 *     "segmentCasing"        every non-version, non-param segment obeys `casing`
 *                            (default kebab)                     (guide 5.3)
 *     "maxDepthAfterVersion" at most `max` NON-PARAM levels follow the version
 *                            prefix; `{param}` segments do NOT count as levels
 *                            (default max 2)                     (guide 5.4)
 *   casing      {string}   for "segmentCasing" (default "kebab").
 *   max         {number}   for "maxDepthAfterVersion" (default 2).
 *   exemptPaths {string[]} for "versionPrefix": path keys matched EXACTLY that
 *                          are exempt from the version-prefix requirement (the
 *                          guide 5.9 unversioned operational endpoints).
 *
 * @param {unknown} targetVal - the paths object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function pathSegments(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const check = opts.check;
  const results = [];

  for (const key of Object.keys(targetVal)) {
    if (typeof key !== 'string' || !key.startsWith('/')) continue;
    const segs = split(key);
    const here = [...base, key];

    if (check === 'versionPrefix') {
      // Guide 5.9 mandates UNVERSIONED operational liveness endpoints (/health,
      // and optionally /ready); exempt those exact path keys from the /v{N}/
      // requirement so 5.1 and 5.9 do not contradict each other.
      const exemptPaths = Array.isArray(opts.exemptPaths) ? opts.exemptPaths : [];
      if (exemptPaths.includes(key)) continue;
      if (segs.length === 0 || !VERSION_SEG.test(segs[0])) {
        results.push({ message: `path "${key}" must start with a version prefix (/v{N}/…)`, path: here });
      }
    } else if (check === 'segmentCasing') {
      const casing = typeof opts.casing === 'string' ? opts.casing : 'kebab';
      for (const seg of segs) {
        if (VERSION_SEG.test(seg) || isParam(seg)) continue;
        if (!matchesCasing(seg, casing)) {
          results.push({ message: `path "${key}" segment "${seg}" must be ${casing} case`, path: here });
        }
      }
    } else if (check === 'maxDepthAfterVersion') {
      const max = Number.isInteger(opts.max) ? opts.max : 2;
      const afterVersion = VERSION_SEG.test(segs[0]) ? segs.slice(1) : segs;
      // "Levels of nesting" counts resource/action segments only: a `{param}`
      // path parameter is NOT a level. Guide 5.8/15.5/16.11 mandate paths like
      // /v1/operations/{operationId}/cancel and
      // /v1/subscriptions/{subscriptionId}/rotate-secret — three raw segments,
      // but only two non-param levels — so params must not count toward depth.
      const levels = afterVersion.filter((seg) => !isParam(seg));
      if (levels.length > max) {
        results.push({
          message: `path "${key}" has ${levels.length} levels of nesting after the version prefix (max ${max}; path parameters do not count)`,
          path: here,
        });
      }
    }
  }

  return results.length ? results : undefined;
}
