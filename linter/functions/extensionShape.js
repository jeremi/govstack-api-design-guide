import { isObject, toRegExp, SEMVER_PATTERN } from './lib/util.js';

/**
 * extensionShape — validate the presence and shape of an `x-govstack-*`
 * extension on a container object (operation, info, message, …). Drives the
 * §17 delivery/ordering trio, §18.7 deprecation metadata and §20.3 guide
 * metadata.
 *
 * `given` should select the container that carries the extension (e.g. an
 * operation, or `$.info`).
 *
 * options:
 *   extension {string} the extension key to validate, e.g. "x-govstack-delivery".
 *   required  {boolean} default true — absent extension is a violation.
 *   valueType {"string"|"object"|"array"} expected type of the value.
 *   enum      {any[]}  for string values: allowed values.
 *   requiredKeys {string[]} for object values: keys that must be present.
 *   semverKeys   {string[]} for object values: keys whose value must be SemVer.
 *   keyEnums     {object}   { key: [allowed values] } for object values.
 *   keyPatterns  {object}   { key: regexString } for object values.
 *
 * @param {unknown} targetVal - the container object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function extensionShape(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(options)) return;
  const key = options.extension;
  if (typeof key !== 'string' || !key) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const here = [...base, key];
  const results = [];
  const present = Object.prototype.hasOwnProperty.call(targetVal, key);

  if (!present) {
    if (options.required !== false) results.push({ message: `must declare "${key}"`, path: [...base] });
    return results.length ? results : undefined;
  }

  const value = targetVal[key];

  if (options.valueType !== undefined) {
    const actual = Array.isArray(value) ? 'array' : typeof value;
    const wanted = options.valueType === 'object' && Array.isArray(value) ? 'array' : options.valueType;
    const ok =
      (wanted === 'object' && isObject(value)) ||
      (wanted === 'array' && Array.isArray(value)) ||
      (wanted !== 'object' && wanted !== 'array' && actual === wanted);
    if (!ok) {
      results.push({ message: `"${key}" must be of type ${options.valueType}`, path: here });
      return results; // shape checks below assume the right type
    }
  }

  if (Array.isArray(options.enum) && !options.enum.includes(value)) {
    results.push({ message: `"${key}" must be one of ${JSON.stringify(options.enum)}`, path: here });
  }

  if (isObject(value)) {
    for (const k of Array.isArray(options.requiredKeys) ? options.requiredKeys : []) {
      if (!Object.prototype.hasOwnProperty.call(value, k)) {
        results.push({ message: `"${key}" must declare "${k}"`, path: here });
      }
    }
    const semverRe = toRegExp(SEMVER_PATTERN);
    for (const k of Array.isArray(options.semverKeys) ? options.semverKeys : []) {
      if (k in value && !(typeof value[k] === 'string' && semverRe.test(value[k]))) {
        results.push({ message: `"${key}.${k}" must be a SemVer string`, path: [...here, k] });
      }
    }
    if (isObject(options.keyEnums)) {
      for (const [k, allowed] of Object.entries(options.keyEnums)) {
        if (k in value && Array.isArray(allowed) && !allowed.includes(value[k])) {
          results.push({ message: `"${key}.${k}" must be one of ${JSON.stringify(allowed)}`, path: [...here, k] });
        }
      }
    }
    if (isObject(options.keyPatterns)) {
      for (const [k, pat] of Object.entries(options.keyPatterns)) {
        const re = toRegExp(pat);
        if (re && k in value && !(typeof value[k] === 'string' && re.test(value[k]))) {
          results.push({ message: `"${key}.${k}" must match ${re.toString()}`, path: [...here, k] });
        }
      }
    }
  }

  return results.length ? results : undefined;
}
