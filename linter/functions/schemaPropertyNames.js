import { forEachProperty } from './lib/schemaWalk.js';
import { matchesCasing } from './lib/casing.js';
import { toRegExp, isObject } from './lib/util.js';

/**
 * schemaPropertyNames — assert every declared property name (recursively,
 * across all subschemas) obeys a casing convention and/or a pattern.
 *
 * `given` should select a schema (e.g. a response/request body schema, or
 * `$.components.schemas[*]`). The walk is cycle-safe.
 *
 * options (apply in combination; a name violating any active check is flagged):
 *   casing        {string} one of camel|pascal|kebab|snake|screamingSnake|flat.
 *   allowPattern  {string} regex a name MUST match.
 *   forbidPattern {string} regex a name MUST NOT match (e.g. spaces / non-ASCII).
 *   flags         {string} regex flags for allow/forbid.
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function schemaPropertyNames(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const allow = opts.allowPattern !== undefined ? toRegExp(opts.allowPattern, opts.flags) : undefined;
  const forbid = opts.forbidPattern !== undefined ? toRegExp(opts.forbidPattern, opts.flags) : undefined;
  const casing = typeof opts.casing === 'string' ? opts.casing : undefined;
  const results = [];

  forEachProperty(targetVal, (name, _schema, path) => {
    const problems = [];
    if (casing && !matchesCasing(name, casing)) problems.push(`must be ${casing} case`);
    if (allow && !allow.test(name)) problems.push(`must match ${allow.toString()}`);
    if (forbid && forbid.test(name)) problems.push(`must not match ${forbid.toString()}`);
    if (problems.length) {
      results.push({
        message: `property name "${name}" ${problems.join('; ')}`,
        path: [...base, ...path],
      });
    }
  });

  return results.length ? results : undefined;
}
