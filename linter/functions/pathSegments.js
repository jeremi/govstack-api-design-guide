import { isObject } from './lib/util.js';
import { matchesCasing } from './lib/casing.js';
import { isStandardUnversionedPath } from './lib/standardEndpoints.js';
import { resourcePath, isPathParameter as isParam } from './lib/resourcePaths.js';

const VERSION_SEG = /^v\d+$/;
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

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
 *     "segmentCasing"        resource segments obey `casing` (default kebab);
 *                            colon methods use camelCase          (guide 5.3)
 *     "maxDepthAfterVersion" at most `max` NON-PARAM levels follow the version
 *                            prefix; `{param}` segments do NOT count as levels
 *                            (default max 2)                     (guide 5.4)
 *     "standardEndpointsReadOnly" the guide 5.10 standard unversioned endpoints
 *                            declare no mutating method            (guide 5.10)
 *   casing      {string}   for "segmentCasing" (default "kebab").
 *   max         {number}   for "maxDepthAfterVersion" (default 2).
 *   exemptPaths {string[]} for "versionPrefix": additional path keys matched
 *                          EXACTLY that are exempt from the version-prefix
 *                          requirement, on top of the guide 5.10 set.
 *
 * "versionPrefix" and "segmentCasing" both skip the guide 5.10 standard
 * unversioned endpoints, whose location and spelling are fixed elsewhere.
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
    const { segments: segs, customMethod } = resourcePath(key);
    const here = [...base, key];

    // Guide 5.10 fixes the location and spelling of a closed set of endpoints
    // elsewhere (RFC 8615 well-known URIs, the 5.9 operational endpoints, and
    // runtime specification discovery), so 5.1 and 5.3 must not fire on them.
    if (isStandardUnversionedPath(key) && (check === 'versionPrefix' || check === 'segmentCasing')) continue;

    if (check === 'versionPrefix') {
      const exemptPaths = Array.isArray(opts.exemptPaths) ? opts.exemptPaths : [];
      if (exemptPaths.includes(key)) continue;
      if (segs.length === 0 || !VERSION_SEG.test(segs[0])) {
        results.push({ message: `path "${key}" must start with a version prefix (/v{N}/…)`, path: here });
      }
    } else if (check === 'segmentCasing') {
      const casing = typeof opts.casing === 'string' ? opts.casing : 'kebab';
      if (customMethod !== undefined && !matchesCasing(customMethod, 'camel')) {
        results.push({ message: `path "${key}" custom method "${customMethod}" must be camel case`, path: here });
      }
      for (const seg of segs) {
        if (VERSION_SEG.test(seg) || isParam(seg)) continue;
        if (!matchesCasing(seg, casing)) {
          results.push({ message: `path "${key}" segment "${seg}" must be ${casing} case`, path: here });
        }
      }
    } else if (check === 'standardEndpointsReadOnly') {
      if (!isStandardUnversionedPath(key)) continue;
      const item = targetVal[key];
      if (!isObject(item)) continue;
      for (const method of MUTATING_METHODS) {
        if (method in item) {
          results.push({
            message: `path "${key}" is a standard unversioned endpoint (guide 5.10) and must not declare "${method}"; a business resource belongs on the versioned surface`,
            path: [...here, method],
          });
        }
      }
    } else if (check === 'maxDepthAfterVersion') {
      const max = Number.isInteger(opts.max) ? opts.max : 2;
      const afterVersion = VERSION_SEG.test(segs[0]) ? segs.slice(1) : segs;
      // "Levels of nesting" counts resource/action segments only: a `{param}`
      // path parameter is NOT a level. A colon custom method adds no level.
      // Guide 5.8/15.5/16.11 support paths like
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
