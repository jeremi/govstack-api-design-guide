import { toRegExp } from './lib/util.js';

/**
 * valuePattern — assert a single string value matches / does not match a regex.
 *
 * `given` must select the string itself (e.g. `$.info.version`,
 * `$.servers[*].url`, a channel address key). Spectral invokes the function
 * once per selected value, so `targetVal` is one string.
 *
 * options:
 *   match        {string} value MUST match this regex (anchored as written).
 *   notMatch     {string} value MUST NOT match this regex.
 *   forbidPattern{string} alias of notMatch (reads better for deny-lists).
 *   flags        {string} regex flags applied to both (e.g. "i").
 *   name         {string} human label for the value in messages (default "value").
 *
 * Non-string input returns undefined (no error), so it composes safely with
 * broad `given` selectors.
 *
 * @param {unknown} targetVal
 * @param {object} options
 * @returns {{message:string}[]|undefined}
 */
export default function valuePattern(targetVal, options) {
  if (typeof targetVal !== 'string') return;
  const opts = options && typeof options === 'object' ? options : {};
  const label = typeof opts.name === 'string' && opts.name ? opts.name : 'value';
  const flags = typeof opts.flags === 'string' ? opts.flags : undefined;
  const results = [];

  if (opts.match !== undefined) {
    const re = toRegExp(opts.match, flags);
    if (re && !re.test(targetVal)) {
      results.push({ message: `${label} "${targetVal}" must match ${re.toString()}` });
    }
  }

  const deny = opts.notMatch !== undefined ? opts.notMatch : opts.forbidPattern;
  if (deny !== undefined) {
    const re = toRegExp(deny, flags);
    if (re && re.test(targetVal)) {
      results.push({ message: `${label} "${targetVal}" must not match ${re.toString()}` });
    }
  }

  return results.length ? results : undefined;
}
