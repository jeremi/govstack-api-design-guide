import { forEachProperty } from './lib/schemaWalk.js';
import { isObject, toRegExp } from './lib/util.js';

const MAX_COMPOSED_ALTERNATIVES = 256;

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
 *   excludeNamePattern {string} matching property names are skipped.
 *   composed    {boolean} evaluate type/format across allOf/anyOf/oneOf.
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
  const excludeNameRe = toRegExp(options.excludeNamePattern, options.nameFlags);
  const req = isObject(options.require) ? options.require : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  forEachProperty(targetVal, (name, schema, path) => {
    if (!nameRe.test(name)) return;
    if (excludeNameRe && excludeNameRe.test(name)) return;
    if (!isObject(schema)) return;
    const full = [...base, ...path];
    const type = schema.type;
    const typeList = Array.isArray(type) ? type : [type];
    const alternatives = options.composed ? schemaAlternatives(schema) : undefined;

    if (req.type !== undefined && !(alternatives
      ? alternativesSatisfy(alternatives, ({ types }) => (
        types?.has(req.type) && [...types].every((candidate) => candidate === req.type || candidate === 'null')
      ))
      : typeList.includes(req.type))) {
      results.push({ message: `property "${name}" must declare type "${req.type}"`, path: full });
    }
    if (req.forbidType !== undefined) {
      const forbidden = Array.isArray(req.forbidType) ? req.forbidType : [req.forbidType];
      const hit = forbidden.find((t) => typeList.includes(t));
      if (hit) results.push({ message: `property "${name}" must not declare type "${hit}"`, path: full });
    }
    if (req.format !== undefined && !(alternatives
      ? alternativesSatisfy(alternatives, ({ formats }) => formats?.has(req.format))
      : schema.format === req.format)) {
      results.push({ message: `property "${name}" must declare format "${req.format}"`, path: full });
    }
    if (Array.isArray(req.formatOneOf) && !(alternatives
      ? alternativesSatisfy(
        alternatives,
        ({ formats }) => formats !== undefined && [...formats].every((format) => req.formatOneOf.includes(format)),
      )
      : req.formatOneOf.includes(schema.format))) {
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

function schemaAlternatives(schema, ancestors = new Set()) {
  if (!isObject(schema)) return [{ invalid: true }];
  if (ancestors.has(schema)) return [{}];

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(schema);

  let alternatives = [{
    types: declaredValues(schema.type),
    formats: declaredValues(schema.format),
  }];

  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) {
      const branchAlternatives = schemaAlternatives(branch, nextAncestors);
      alternatives = mergeAlternativeSets(alternatives, branchAlternatives);
    }
  }

  for (const keyword of ['anyOf', 'oneOf']) {
    const branches = schema[keyword];
    if (!Array.isArray(branches) || branches.length === 0) continue;

    const branchAlternatives = [];
    for (const branch of branches) {
      const candidates = schemaAlternatives(branch, nextAncestors);
      if (branchAlternatives.length + candidates.length > MAX_COMPOSED_ALTERNATIVES) return [{ invalid: true }];
      branchAlternatives.push(...candidates);
    }
    alternatives = mergeAlternativeSets(alternatives, branchAlternatives);
  }

  return alternatives;
}

function declaredValues(value) {
  if (value === undefined) return undefined;
  return new Set(Array.isArray(value) ? value : [value]);
}

function intersectDeclared(left, right) {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return new Set([...left].filter((value) => right.has(value)));
}

function mergeAlternatives(left, right) {
  const types = intersectDeclared(left.types, right.types);
  const formats = intersectDeclared(left.formats, right.formats);
  return {
    types,
    formats,
    invalid: left.invalid || right.invalid || types?.size === 0 || formats?.size === 0,
  };
}

function mergeAlternativeSets(left, right) {
  if (left.length === 0 || right.length === 0) return [{ invalid: true }];
  if (left.length > Math.floor(MAX_COMPOSED_ALTERNATIVES / right.length)) return [{ invalid: true }];
  return left.flatMap((base) => right.map((candidate) => mergeAlternatives(base, candidate)));
}

function alternativesSatisfy(alternatives, predicate) {
  const nonNull = alternatives.filter(({ types }) => !(types?.size === 1 && types.has('null')));
  return nonNull.length > 0 && nonNull.every((alternative) => !alternative.invalid && predicate(alternative));
}
