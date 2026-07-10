import { isObject, asArray, toRegExp } from './lib/util.js';

/**
 * mediaTypeExpected — assert a `content` map declares / forbids media types.
 * Drives §6.4 (PATCH -> merge-patch+json), §9.1 (json responses) and §11.1
 * (problem+json on errors).
 *
 * `given` should select a `content` object, e.g.
 * `$.paths[*][*].requestBody.content` or a specific response's `content`.
 *
 * Media types are matched as regexes against the content-map keys, so
 * `application/problem+json` works verbatim (the `+` is escaped for you only if
 * you pass a plain string with no regex metacharacters — otherwise pass a valid
 * regex). Prefer anchored, escaped patterns.
 *
 * options:
 *   require      {string|string[]} each pattern must match >=1 declared media type.
 *   requireOneOf {string|string[]} at least one pattern must match.
 *   forbid       {string|string[]} no declared media type may match any pattern.
 *
 * @param {unknown} targetVal - a content object (map mediaType -> mediaTypeObject).
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function mediaTypeExpected(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const keys = Object.keys(targetVal);
  const results = [];

  const test = (pattern, key) => {
    const re = toRegExp(pattern);
    return re ? re.test(key) : false;
  };

  for (const pattern of asArray(opts.require)) {
    if (!keys.some((k) => test(pattern, k))) {
      results.push({ message: `content must declare a media type matching "${pattern}"`, path: [...base] });
    }
  }

  const oneOf = asArray(opts.requireOneOf);
  if (oneOf.length && !oneOf.some((p) => keys.some((k) => test(p, k)))) {
    results.push({ message: `content must declare one of these media types: ${oneOf.join(', ')}`, path: [...base] });
  }

  for (const pattern of asArray(opts.forbid)) {
    for (const key of keys.filter((k) => test(pattern, k))) {
      results.push({ message: `content must not declare media type "${key}"`, path: [...base, key] });
    }
  }

  return results.length ? results : undefined;
}
