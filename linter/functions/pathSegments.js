import { isObject } from './lib/util.js';
import { matchesCasing } from './lib/casing.js';
import { isStandardUnversionedPath } from './lib/standardEndpoints.js';
import { pathSegmentsOf, isPathParameter as isParam } from './lib/resourcePaths.js';

const VERSION_SEG = /^v\d+$/;
// A colon outside any `{param}`, as in `events:search` or `{eventId}:cancel`.
const COLON_METHOD = /:[^{}]*$/;
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

function declaredDigitalRegistryCollection(pathItem) {
  if (!isObject(pathItem)) return undefined;
  const declarations = new Set();

  for (const method of HTTP_METHODS) {
    const operation = pathItem[method];
    if (!isObject(operation)) continue;
    const metadata = operation['x-govstack-digital-registries'];
    if (!isObject(metadata) || !Object.prototype.hasOwnProperty.call(metadata, 'collection')) continue;
    if (typeof metadata.collection !== 'string' || metadata.collection.length === 0) return undefined;
    declarations.add(metadata.collection);
  }

  return declarations.size === 1 ? declarations.values().next().value : undefined;
}

function declaredCollectionIdentifierIndexes(pathItem, segments) {
  const collection = declaredDigitalRegistryCollection(pathItem);
  if (collection === undefined) return new Set();

  const matches = [];
  for (let index = 1; index < segments.length; index += 1) {
    if (segments[index - 1] === 'collections' && segments[index] === collection) matches.push(index);
  }
  return matches.length === 1 ? new Set(matches) : new Set();
}

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
 *     "segmentCasing"        literal segments obey `casing` (default kebab);
 *                            a colon custom method is reported with a
 *                            pointer to action sub-resources (guide 5.3, 5.8)
 *     "maxDepthAfterVersion" at most `max` resource/action levels follow the
 *                            version prefix; parameterized and evidence-backed
 *                            fixed identifiers do NOT count (default max 2)
 *                                                               (guide 5.4)
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
  const pathKeys = Object.keys(targetVal).filter((key) => typeof key === 'string' && key.startsWith('/'));

  for (const key of pathKeys) {
    const segs = pathSegmentsOf(key);
    const here = [...base, key];

    // Guide 5.10 fixes the location and spelling of a closed set of endpoints
    // elsewhere (RFC 8615 well-known URIs, optional /health and /ready
    // endpoints preserved by 5.10, and runtime specification discovery), so
    // 5.1 and 5.3 must not fire on them.
    if (isStandardUnversionedPath(key) && (check === 'versionPrefix' || check === 'segmentCasing')) continue;

    if (check === 'versionPrefix') {
      const exemptPaths = Array.isArray(opts.exemptPaths) ? opts.exemptPaths : [];
      if (exemptPaths.includes(key)) continue;
      if (segs.length === 0 || !VERSION_SEG.test(segs[0])) {
        results.push({ message: `path "${key}" must start with a version prefix (/v{N}/…)`, path: here });
      }
    } else if (check === 'segmentCasing') {
      const casing = typeof opts.casing === 'string' ? opts.casing : 'kebab';
      for (const seg of segs) {
        if (VERSION_SEG.test(seg) || isParam(seg)) continue;
        if (COLON_METHOD.test(seg)) {
          results.push({
            message: `path "${key}" segment "${seg}" uses a colon custom method; use an action sub-resource such as "/search" or "/{id}/cancel" instead (guide 5.8)`,
            path: here,
          });
        } else if (!matchesCasing(seg, casing)) {
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
      const offset = VERSION_SEG.test(segs[0]) ? 1 : 0;
      const identifierIndexes = declaredCollectionIdentifierIndexes(targetVal[key], segs);
      // "Levels of nesting" counts resource/action segments only. Path
      // parameters are identifiers rather than levels. A literal identifier is
      // equivalent only when Digital Registries operation metadata consistently
      // declares the matching value at /collections/{id}; arbitrary literal
      // positions are deliberately not guessed. An action sub-resource remains
      // a level.
      // Guide 5.8/15.5/16.11 support paths like
      // /v1/operations/{operationId}/cancel and
      // /v1/subscriptions/{subscriptionId}/rotate-secret — three raw segments,
      // but only two non-param levels — so params must not count toward depth.
      const levels = segs.filter((seg, index) => index >= offset && !isParam(seg) && !identifierIndexes.has(index));
      if (levels.length > max) {
        results.push({
          message: `path "${key}" has ${levels.length} levels of nesting after the version prefix (max ${max}; identifiers do not count)`,
          path: here,
        });
      }
    }
  }

  return results.length ? results : undefined;
}
