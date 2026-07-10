import { isObject, asArray } from './lib/util.js';

/**
 * s12-sortParam — for an operation that declares a `sort` query parameter,
 * assert its schema is a string carrying a `pattern` (guide 12.7's
 * `field` / `-field`, comma-separated grammar). A no-op when the operation
 * declares no `sort` parameter at all: sorting support is optional per
 * operation, only its shape is mandated once offered.
 *
 * Does NOT verify that the declared `pattern` actually encodes the exact
 * field/-field/comma grammar, only that a pattern is present; validating an
 * arbitrary author-supplied regex's semantics is not mechanically decidable.
 *
 * `given` should select an operation object, e.g. `$.paths[*][get]`.
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options - unused, present for signature consistency.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function sortParamShape(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const params = asArray(targetVal.parameters).filter(isObject);
  const idx = params.findIndex((p) => p.name === 'sort');
  if (idx === -1) return undefined;

  const param = params[idx];
  const schema = isObject(param.schema) ? param.schema : {};
  const path = [...base, 'parameters', idx, 'schema'];
  const results = [];

  if (schema.type !== 'string') {
    results.push({ message: '"sort" parameter schema must declare type "string"', path });
  }
  if (typeof schema.pattern !== 'string' || schema.pattern.length === 0) {
    results.push({
      message: '"sort" parameter schema must declare a "pattern" encoding the field/-field, comma-separated grammar (guide 12.7)',
      path,
    });
  }

  return results.length ? results : undefined;
}
