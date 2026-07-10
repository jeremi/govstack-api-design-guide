import { isObject, asArray } from './lib/util.js';

/**
 * envelopeShape — assert that a JSON Schema *declares* a required shape:
 * required properties, nested object/array shapes, and const/enum/type on
 * leaves. It inspects the schema (properties/required/const/…), it does NOT
 * validate a data instance. Reused for pagination envelopes, problem+json,
 * CloudEvents payloads and the Operation resource.
 *
 * `given` should select the schema, e.g. a `200` response schema or
 * `$.components.schemas.PageEnvelope`.
 *
 * The options object is a "spec" node. A spec node may contain:
 *   requiredProperties {string[]} names that must appear in schema.required.
 *   properties {object}  map of name -> child spec node; each named property
 *                        must be declared, and is validated by its child spec.
 *   type   {string}      schema.type must equal this (array-typed `type` ok).
 *   const  {any}         schema.const must deep-equal this.
 *   enum   {any[]}       schema.enum must equal this as a set.
 *   items  {object}      for arrays: schema.items validated by this child spec.
 *
 * One level of top-level `allOf` composition is merged when reading
 * required/properties (documented limitation: deeper allOf nesting is not).
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} options - the root spec node.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function envelopeShape(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(options)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];
  matchNode(targetVal, options, base, results, 0);
  return results.length ? results : undefined;
}

/** Merge a schema's own required/properties with one level of allOf branches. */
function effective(schema) {
  const required = new Set(asArray(schema.required).filter((s) => typeof s === 'string'));
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) {
      if (!isObject(branch)) continue;
      for (const r of asArray(branch.required)) if (typeof r === 'string') required.add(r);
      if (isObject(branch.properties)) {
        for (const [k, v] of Object.entries(branch.properties)) if (!(k in properties)) properties[k] = v;
      }
    }
  }
  return { required, properties };
}

function typeMatches(schemaType, wanted) {
  if (Array.isArray(schemaType)) return schemaType.includes(wanted);
  return schemaType === wanted;
}

function matchNode(schema, spec, path, results, depth) {
  if (depth > 50 || !isObject(schema) || !isObject(spec)) return;

  if (spec.type !== undefined && !typeMatches(schema.type, spec.type)) {
    results.push({ message: `schema must declare type "${spec.type}"`, path });
  }
  if ('const' in spec && JSON.stringify(schema.const) !== JSON.stringify(spec.const)) {
    results.push({ message: `schema must declare const ${JSON.stringify(spec.const)}`, path });
  }
  if (spec.enum !== undefined) {
    const have = new Set(asArray(schema.enum).map((v) => JSON.stringify(v)));
    const want = new Set(asArray(spec.enum).map((v) => JSON.stringify(v)));
    const equal = have.size === want.size && [...want].every((v) => have.has(v));
    if (!equal) {
      results.push({ message: `schema enum must be exactly ${JSON.stringify(spec.enum)}`, path });
    }
  }

  const eff = effective(schema);

  for (const name of asArray(spec.requiredProperties)) {
    if (!eff.required.has(name)) {
      results.push({ message: `schema must list "${name}" in required`, path: [...path, 'required'] });
    }
  }

  if (isObject(spec.properties)) {
    for (const [name, childSpec] of Object.entries(spec.properties)) {
      const child = eff.properties[name];
      if (!isObject(child)) {
        results.push({ message: `schema must declare property "${name}"`, path: [...path, 'properties'] });
        continue;
      }
      if (isObject(childSpec)) matchNode(child, childSpec, [...path, 'properties', name], results, depth + 1);
    }
  }

  if (isObject(spec.items)) {
    if (!isObject(schema.items)) {
      results.push({ message: 'schema must declare items', path: [...path, 'items'] });
    } else {
      matchNode(schema.items, spec.items, [...path, 'items'], results, depth + 1);
    }
  }
}
