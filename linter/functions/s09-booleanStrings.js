import { forEachProperty } from './lib/schemaWalk.js';
import { isObject, toRegExp } from './lib/util.js';

/**
 * s09-booleanStrings — PROXY for §9.3 (real JSON booleans). Flags properties
 * that look boolean but are modelled as strings. Two heuristics, each a finding:
 *
 *   1. a property whose NAME matches a boolean-ish pattern (is/has/can prefixes)
 *      whose schema `type` includes "string";
 *   2. a property whose schema `enum` is made up solely of the string literals
 *      "true"/"false" (any case), regardless of name.
 *
 * It does NOT catch boolean-ish fields typed as integer 0/1, nor boolean values
 * that are typed string without a boolean-ish name — those are not mechanically
 * distinguishable from legitimate strings.
 *
 * `given` should select a schema (e.g. `$.components.schemas[*]`). Cycle-safe.
 *
 * options:
 *   namePattern {string} regex a property NAME must match for heuristic 1.
 *   nameFlags   {string} regex flags for namePattern.
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const DEFAULT_NAME_PATTERN =
  '^(is|has|can|should|must|will|allow|allows|enable|enables|require|requires|use|uses|include|includes)[A-Z0-9]';

export default function s09BooleanStrings(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const nameRe = toRegExp(opts.namePattern || DEFAULT_NAME_PATTERN, opts.nameFlags);
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  forEachProperty(targetVal, (name, schema, path) => {
    if (!isObject(schema)) return;
    const full = [...base, ...path];
    const type = schema.type;
    const typeList = Array.isArray(type) ? type : type === undefined ? [] : [type];

    // Heuristic 1: boolean-looking name modelled as a string.
    if (nameRe && nameRe.test(name) && typeList.includes('string')) {
      results.push({
        message: `boolean-looking field "${name}" is typed string; use a real JSON boolean (true/false)`,
        path: full,
      });
    }

    // Heuristic 2: enum of the string literals "true"/"false".
    const en = schema.enum;
    if (
      Array.isArray(en) &&
      en.length > 0 &&
      en.every((v) => typeof v === 'string' && ['true', 'false'].includes(v.toLowerCase()))
    ) {
      results.push({
        message: `field "${name}" enumerates string booleans (${JSON.stringify(en)}); use a real JSON boolean`,
        path: full,
      });
    }
  });

  return results.length ? results : undefined;
}
