/**
 * Collection response shapes shared by the pagination (guide §12) and
 * conditional-request (guide §7.16) checks.
 *
 * Not a Spectral function; imported by function modules only.
 */

import { isObject, asArray } from './util.js';

/** Collect conjunctive declarations only; do not infer shapes from alternatives.
 * Spectral may resolve recursive references, so visit each schema only once. */
function allOfSchemas(schemas) {
  const pending = [...schemas];
  const seen = new WeakSet();
  const nodes = [];
  while (pending.length) {
    const schema = pending.pop();
    if (!isObject(schema) || seen.has(schema)) continue;
    seen.add(schema);
    nodes.push(schema);
    pending.push(...asArray(schema.allOf));
  }
  return nodes;
}

function arrayShape(nodes) {
  const bounds = nodes.filter((node) => node.maxItems !== undefined).map((node) => node.maxItems);
  return {
    isArray: nodes.some((node) => node.type === 'array'),
    bounded: bounds.length > 0 && bounds.every((bound) => Number.isInteger(bound) && bound >= 0),
  };
}

/** Inspect the root and its immediate properties through nested allOf.
 * A type and its maxItems bound can be declared in separate branches, including
 * repeated declarations of the same property. Every declared array needs a
 * valid bound for §12.1's exemption; nested object contents need review. */
export function collectionShape(schema) {
  const nodes = allOfSchemas([schema]);
  const root = arrayShape(nodes);
  const properties = new Map();
  for (const node of nodes) {
    for (const [name, property] of Object.entries(isObject(node.properties) ? node.properties : {})) {
      const declarations = properties.get(name) ?? [];
      declarations.push(property);
      properties.set(name, declarations);
    }
  }
  const propertyShapes = new Map(
    [...properties].map(([name, declarations]) => [name, arrayShape(allOfSchemas(declarations))]),
  );
  const arrays = [root, ...propertyShapes.values()].filter((shape) => shape.isArray);
  return {
    isCollection: root.isArray || propertyShapes.get('items')?.isArray === true,
    bounded: arrays.length > 0 && arrays.every((shape) => shape.bounded),
  };
}
