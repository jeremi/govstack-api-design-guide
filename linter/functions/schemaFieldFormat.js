import { forEachProperty } from './lib/schemaWalk.js';
import { isObject, toRegExp } from './lib/util.js';

/**
 * schemaFieldFormat — for every property whose NAME matches a pattern, require
 * its schema to declare given type/format/pattern/contentEncoding constraints.
 * Drives the §10 data-type proxies (timestamps -> date-time, money -> object,
 * base64 -> contentEncoding + maxLength, …). Cycle-safe walk.
 *
 * `given` should select a schema (e.g. a request/response body or
 * `$.components.schemas[*]`).
 *
 * options:
 *   namePattern {string} regex a property NAME must match to be checked (req'd).
 *   nameFlags   {string} regex flags for namePattern (e.g. "i").
 *   require {object} constraints the matching property schema must declare:
 *     type            {string}   schema.type must equal (array type ok).
 *     format          {string}   schema.format must equal.
 *     formatOneOf     {string[]} schema.format must be one of.
 *     contentEncoding {string}   schema.contentEncoding must equal.
 *     pattern         {string}   schema.pattern must equal exactly.
 *     mustDeclare     {string[]} these keywords must simply be present
 *                                (e.g. ["maxLength"]).
 *     forbidType      {string|string[]} schema.type must NOT be any of these
 *                                (e.g. money field must not be "number").
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function schemaFieldFormat(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(options)) return;
  const nameRe = toRegExp(options.namePattern, options.nameFlags);
  if (!nameRe) return;
  const req = isObject(options.require) ? options.require : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  forEachProperty(targetVal, (name, schema, path) => {
    if (!nameRe.test(name)) return;
    if (!isObject(schema)) return;
    const full = [...base, ...path];
    const type = schema.type;
    const typeList = Array.isArray(type) ? type : [type];

    if (req.type !== undefined && !typeList.includes(req.type)) {
      results.push({ message: `property "${name}" must declare type "${req.type}"`, path: full });
    }
    if (req.forbidType !== undefined) {
      const forbidden = Array.isArray(req.forbidType) ? req.forbidType : [req.forbidType];
      const hit = forbidden.find((t) => typeList.includes(t));
      if (hit) results.push({ message: `property "${name}" must not declare type "${hit}"`, path: full });
    }
    if (req.format !== undefined && schema.format !== req.format) {
      results.push({ message: `property "${name}" must declare format "${req.format}"`, path: full });
    }
    if (Array.isArray(req.formatOneOf) && !req.formatOneOf.includes(schema.format)) {
      results.push({ message: `property "${name}" format must be one of ${req.formatOneOf.join(', ')}`, path: full });
    }
    if (req.contentEncoding !== undefined && schema.contentEncoding !== req.contentEncoding) {
      results.push({ message: `property "${name}" must declare contentEncoding "${req.contentEncoding}"`, path: full });
    }
    if (req.pattern !== undefined && schema.pattern !== req.pattern) {
      results.push({ message: `property "${name}" must declare pattern ${JSON.stringify(req.pattern)}`, path: full });
    }
    for (const kw of Array.isArray(req.mustDeclare) ? req.mustDeclare : []) {
      if (!(kw in schema)) {
        results.push({ message: `property "${name}" must declare "${kw}"`, path: full });
      }
    }
  });

  return results.length ? results : undefined;
}
