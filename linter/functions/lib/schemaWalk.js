/**
 * Cycle-safe recursive JSON Schema walker (Draft 2020-12 aware, tolerant of
 * older drafts). Shared internal for the schema-oriented GovStack functions.
 *
 * Not a Spectral function; imported by function modules only.
 *
 * Spectral resolves `$ref`s before a rule runs (unless `resolved: false`), so a
 * recursive schema (`Person.friend -> Person`) becomes a genuine circular JS
 * object. The walker guards against this with a WeakSet keyed on node identity:
 * every distinct schema object is visited at most once, at the first path it is
 * reached by. That also de-duplicates schemas shared across the document.
 */

import { isObject } from './util.js';

// keyword -> single subschema
const SUBSCHEMA_KEYS = [
  'additionalProperties',
  'unevaluatedProperties',
  'additionalItems',
  'unevaluatedItems',
  'contains',
  'not',
  'if',
  'then',
  'else',
  'propertyNames',
];
// keyword -> { name: subschema }
const MAP_KEYS = ['properties', 'patternProperties', 'dependentSchemas', '$defs', 'definitions'];
// keyword -> [ subschema ]
const ARRAY_KEYS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];

/**
 * Visit every subschema of `root`, including `root` itself.
 * @param {unknown} root - a JSON Schema object (anything else is a no-op).
 * @param {(node: object, path: (string|number)[]) => void} visit
 *        Called once per schema node. `path` is relative to `root`.
 * @param {{ maxDepth?: number }} [opts]
 */
export function walkSchema(root, visit, opts = {}) {
  if (!isObject(root) || typeof visit !== 'function') return;
  const seen = new WeakSet();
  const maxDepth = Number.isInteger(opts.maxDepth) ? opts.maxDepth : 200;

  const recur = (node, path, depth) => {
    if (!isObject(node) || seen.has(node) || depth > maxDepth) return;
    seen.add(node);

    visit(node, path);

    for (const key of MAP_KEYS) {
      const m = node[key];
      if (isObject(m)) {
        for (const name of Object.keys(m)) recur(m[name], [...path, key, name], depth + 1);
      }
    }
    for (const key of ARRAY_KEYS) {
      const a = node[key];
      if (Array.isArray(a)) a.forEach((sub, i) => recur(sub, [...path, key, i], depth + 1));
    }
    for (const key of SUBSCHEMA_KEYS) {
      if (isObject(node[key])) recur(node[key], [...path, key], depth + 1);
    }
    const items = node.items;
    if (Array.isArray(items)) {
      items.forEach((sub, i) => recur(sub, [...path, 'items', i], depth + 1));
    } else if (isObject(items)) {
      recur(items, [...path, 'items'], depth + 1);
    }
  };

  recur(root, [], 0);
}

/**
 * Visit every declared property across all subschemas of `root`.
 * @param {unknown} root
 * @param {(name: string, propSchema: unknown, path: (string|number)[]) => void} cb
 *        `path` points at the property schema (…/properties/<name>).
 */
export function forEachProperty(root, cb) {
  if (typeof cb !== 'function') return;
  walkSchema(root, (node, path) => {
    const props = node.properties;
    if (isObject(props)) {
      for (const name of Object.keys(props)) cb(name, props[name], [...path, 'properties', name]);
    }
  });
}
