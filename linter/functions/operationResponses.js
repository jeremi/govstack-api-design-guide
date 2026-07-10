import { isObject, asArray, statusMatcher } from './lib/util.js';

const isSuccess = (key) => typeof key === 'string' && key[0] === '2' && /^\d{3}$/.test(key);

/**
 * operationResponses — assert an operation's declared response set satisfies
 * presence / absence / count constraints.
 *
 * `given` should select an operation object, e.g.
 * `$.paths[*][get,put,post,delete,patch]`. The function reads `.responses`.
 *
 * options (all optional; combine as needed):
 *   require       {string|string[]} each matcher MUST match >=1 declared status.
 *   requireOneOf  {string|string[]} at least one matcher must match.
 *   forbid        {string|string[]} no declared status may match any matcher.
 *   minCount      {number} at least this many response entries.
 *   minNonSuccess {number} at least this many non-2xx responses.
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function operationResponses(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const responses = targetVal.responses;
  if (!isObject(responses)) {
    // No responses object at all is itself a violation of any presence check.
    if (options && (options.require || options.requireOneOf || options.minCount)) {
      const base = context && Array.isArray(context.path) ? context.path : [];
      return [{ message: 'operation declares no responses', path: [...base] }];
    }
    return;
  }
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const keys = Object.keys(responses);
  const results = [];

  for (const pattern of asArray(opts.require)) {
    const m = statusMatcher(pattern);
    if (!keys.some(m)) {
      results.push({ message: `operation must declare a "${pattern}" response`, path: [...base, 'responses'] });
    }
  }

  const oneOf = asArray(opts.requireOneOf);
  if (oneOf.length) {
    const ok = oneOf.some((pattern) => keys.some(statusMatcher(pattern)));
    if (!ok) {
      results.push({
        message: `operation must declare at least one of these responses: ${oneOf.join(', ')}`,
        path: [...base, 'responses'],
      });
    }
  }

  for (const pattern of asArray(opts.forbid)) {
    const m = statusMatcher(pattern);
    for (const key of keys.filter(m)) {
      results.push({ message: `operation must not declare a "${key}" response`, path: [...base, 'responses', key] });
    }
  }

  if (Number.isInteger(opts.minCount) && keys.length < opts.minCount) {
    results.push({
      message: `operation must declare at least ${opts.minCount} responses (found ${keys.length})`,
      path: [...base, 'responses'],
    });
  }

  if (Number.isInteger(opts.minNonSuccess)) {
    const nonSuccess = keys.filter((k) => !isSuccess(k)).length;
    if (nonSuccess < opts.minNonSuccess) {
      results.push({
        message: `operation must declare at least ${opts.minNonSuccess} non-2xx response(s) (found ${nonSuccess})`,
        path: [...base, 'responses'],
      });
    }
  }

  return results.length ? results : undefined;
}
