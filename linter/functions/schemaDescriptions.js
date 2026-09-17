import { walkSchema, forEachProperty } from './lib/schemaWalk.js';
import { isObject, isNonEmptyString } from './lib/util.js';

// Nodes whose ONLY keywords are structural combinators carry no domain meaning
// of their own. A `required`-only assertion below `not` is likewise just a
// prohibition such as `not: { required: [legacyField] }`, not a schema editors
// need to describe.
const COMBINATOR_ONLY = new Set([
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else', '$ref', 'description', 'title',
]);
const ASSERTION_ONLY = new Set(['required', 'description', 'title']);

function isCombinatorWrapper(node) {
  const keys = Object.keys(node);
  return keys.length > 0 && keys.every((k) => COMBINATOR_ONLY.has(k));
}

function isNegatedRequiredAssertion(node, path) {
  const keys = Object.keys(node);
  return path.includes('not') && keys.length > 0 && keys.every((key) => ASSERTION_ONLY.has(key));
}

// A branch property such as `oneOf: [{ properties: { kind: { const: a } } }]`
// narrows a property the enclosing object already declares. When that
// declaration is described, the narrowing needs no description of its own.
const INDEXED_BRANCHES = new Set(['allOf', 'anyOf', 'oneOf']);
const SINGLE_BRANCHES = new Set(['not', 'if', 'then', 'else']);

function nodeAt(root, path) {
  let node = root;
  for (const key of path) {
    if (node === null || typeof node !== 'object') return undefined;
    node = node[key];
  }
  return node;
}

function isDescribedPropertyNarrowing(root, path) {
  const n = path.length;
  if (n < 3 || path[n - 2] !== 'properties') return false;
  let branchStart;
  if (SINGLE_BRANCHES.has(path[n - 3])) {
    branchStart = n - 3;
  } else if (n >= 4 && Number.isInteger(path[n - 3]) && INDEXED_BRANCHES.has(path[n - 4])) {
    branchStart = n - 4;
  } else {
    return false;
  }
  const enclosing = nodeAt(root, path.slice(0, branchStart));
  if (!isObject(enclosing) || !isObject(enclosing.properties)) return false;
  const declared = enclosing.properties[path[n - 1]];
  return isObject(declared) && isNonEmptyString(declared.description);
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
 *                    wrappers (a node whose only keywords are allOf/anyOf/…),
 *                    required-only assertions nested under `not`, and branch
 *                    properties that narrow a described property of the
 *                    enclosing object.
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
      if (
        isCombinatorWrapper(node) ||
        isNegatedRequiredAssertion(node, path) ||
        isDescribedPropertyNarrowing(targetVal, path)
      ) {
        return;
      }
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
