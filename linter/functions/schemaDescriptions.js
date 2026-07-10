import { walkSchema, forEachProperty } from './lib/schemaWalk.js';
import { isObject, isNonEmptyString } from './lib/util.js';

// Nodes whose ONLY keywords are structural combinators carry no description of
// their own; requiring one there produces noise. They are skipped in mode "all".
const COMBINATOR_ONLY = new Set([
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else', '$ref', 'description', 'title',
]);

function isCombinatorWrapper(node) {
  const keys = Object.keys(node);
  return keys.length > 0 && keys.every((k) => COMBINATOR_ONLY.has(k));
}

/**
 * schemaDescriptions — assert schema nodes carry a non-empty `description`.
 *
 * `given` should select a schema. The walk is cycle-safe.
 *
 * options:
 *   mode {"properties"|"all"} default "properties".
 *     "properties" — every declared property schema (recursively) needs a
 *                    non-empty description. Good default: documents each field.
 *     "all"        — every subschema node needs one, except pure combinator
 *                    wrappers (a node whose only keywords are allOf/anyOf/…).
 *   includeRoot {boolean} in "properties" mode, also require the root schema to
 *               have a description. Default false.
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function schemaDescriptions(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const mode = opts.mode === 'all' ? 'all' : 'properties';
  const results = [];

  if (mode === 'all') {
    walkSchema(targetVal, (node, path) => {
      if (isCombinatorWrapper(node)) return;
      if (!isNonEmptyString(node.description)) {
        results.push({
          message:
            path.length === 0
              ? 'schema must have a non-empty description'
              : `schema at ${path.join('/')} must have a non-empty description`,
          path: [...base, ...path],
        });
      }
    });
  } else {
    if (opts.includeRoot === true && !isNonEmptyString(targetVal.description)) {
      results.push({ message: 'schema must have a non-empty description', path: [...base] });
    }
    forEachProperty(targetVal, (name, schema, path) => {
      const desc = isObject(schema) ? schema.description : undefined;
      if (!isNonEmptyString(desc)) {
        results.push({
          message: `property "${name}" must have a non-empty description`,
          path: [...base, ...path],
        });
      }
    });
  }

  return results.length ? results : undefined;
}
