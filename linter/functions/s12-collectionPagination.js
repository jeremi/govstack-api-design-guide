import { isObject, asArray } from './lib/util.js';
import { isStandardUnversionedPath } from './lib/standardEndpoints.js';
import envelopeShape from './envelopeShape.js';
import { resourcePath } from './lib/resourcePaths.js';

/**
 * s12-collectionPagination — pagination checks for a "collection" GET
 * operation that need to branch on whether the operation opted into
 * offset-based pagination (guide §12.6) instead of the cursor-based default
 * (guide §12.2/§12.3). Reuses `envelopeShape` for the actual shape check so
 * the envelope rules (cursor vs. flat/offset) stay in one place.
 *
 * `given` should select the operation object itself, e.g.
 * `$.paths[?(!@property.match(/\/\{[^}]+\}$/))][get]` (a "collection" path:
 * one that does not end in a `{param}` segment).
 *
 * An operation is considered to have opted into offset pagination when its
 * `parameters` array declares a parameter named `offset`.
 *
 * Three carve-outs apply to every mode, so that the whole of §12's collection
 * surface answers them the same way:
 *   - the guide §5.10 standard unversioned endpoints are not collections;
 *   - GET custom methods need a declared array/items response to be classified
 *     as collections; their resource target alone does not imply a list;
 *   - a collection whose 200 response declares its own bound with `maxItems`
 *     may be returned unpaginated (guide §12.1).
 *
 * options:
 *   mode {'pageParam'|'cursorParams'|'cursorEnvelope'|'pageSizeBounds'|'offsetEnvelope'} (required)
 *     - pageParam:      operation MUST declare some page-size-like query
 *                       parameter (`pageSize` or `offset`).
 *     - cursorParams:   operation MUST declare both `pageSize` and `cursor`
 *                       query parameters. No-op when the operation has an
 *                       `offset` parameter (that operation is covered by the
 *                       `offsetEnvelope` mode / §12.6 instead).
 *     - cursorEnvelope: the 200 response body schema MUST declare the §12.3
 *                       envelope `{ items, pageInfo: { nextCursor } }`, with a
 *                       nullable non-empty cursor and no declared `hasMore`
 *                       member.
 *                       No-op when the operation has an `offset` parameter.
 *     - pageSizeBounds: the `pageSize` parameter MUST exist and declare both a
 *                       `default` and a `maximum` (guide §12.4).
 *     - offsetEnvelope: the 200 response body schema MUST declare the §12.6
 *                       flat envelope `{ items, offset, limit, total }`.
 *                       No-op when the operation does NOT have an `offset`
 *                       parameter (nothing to check: it isn't using offset
 *                       pagination).
 *   mediaType {string} content-type key to inspect on the 200 response,
 *                       default "application/json".
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
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
function collectionShape(schema) {
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

/** Merge a schema's direct shape with one level of allOf composition. */
function effective(schema) {
  if (!isObject(schema)) return { required: new Set(), properties: {} };
  const required = new Set(asArray(schema.required).filter((name) => typeof name === 'string'));
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  for (const branch of asArray(schema.allOf)) {
    if (!isObject(branch)) continue;
    for (const name of asArray(branch.required)) {
      if (typeof name === 'string') required.add(name);
    }
    if (isObject(branch.properties)) Object.assign(properties, branch.properties);
  }
  return { required, properties };
}

function nullableNonEmptyString(schema) {
  if (!isObject(schema)) return false;
  const directTypes = asArray(schema.type);
  const directTypeSet = new Set(directTypes);
  if (
    directTypes.length === 2 &&
    directTypeSet.size === 2 &&
    directTypeSet.has('string') &&
    directTypeSet.has('null')
  ) {
    return Number.isInteger(schema.minLength) && schema.minLength >= 1;
  }

  const oneOf = asArray(schema.oneOf);
  const anyOf = asArray(schema.anyOf);
  if ((oneOf.length > 0) === (anyOf.length > 0)) return false;
  const branches = oneOf.length > 0 ? oneOf : anyOf;
  if (branches.length !== 2 || !branches.every(isObject)) return false;
  const stringBranch = branches.find((branch) => branch.type === 'string');
  const nullBranch = branches.find((branch) => branch.type === 'null');
  return Boolean(
    stringBranch &&
      nullBranch &&
      Number.isInteger(stringBranch.minLength) &&
      stringBranch.minLength >= 1,
  );
}

export default function collectionPagination(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const mediaType = typeof opts.mediaType === 'string' ? opts.mediaType : 'application/json';
  const responseSchema = targetVal.responses?.['200']?.content?.[mediaType]?.schema;

  // Guide §12 covers "endpoints returning collections". The guide §5.10
  // standard unversioned endpoints are not collections, so exempt them by path
  // key. `given` selects the GET operation, so context.path is
  // ['paths', '<pathKey>', 'get'] — the key sits before 'get'.
  const pathKey = base.length >= 2 ? base[base.length - 2] : undefined;
  if (isStandardUnversionedPath(pathKey)) return undefined;

  // A GET custom method need not return a collection. Only apply the list
  // proxy when its response explicitly declares an array or an items array.
  // POST search is selected separately by §12.9 and retains its envelope check.
  const shape = collectionShape(responseSchema);
  if (base.at(-1) === 'get' && resourcePath(pathKey).customMethod !== undefined) {
    if (!shape.isCollection) return undefined;
  }

  // Guide §12.1: a collection bounded by its own schema may skip pagination,
  // and with it the pagination parameters and envelopes of §12.2–§12.4.
  if (shape.bounded) return undefined;

  const params = asArray(targetVal.parameters).filter(isObject);
  const offsetMode = params.some((p) => p.name === 'offset');

  if (opts.mode === 'pageParam') {
    const names = new Set(params.map((p) => p.name));
    if (names.has('pageSize') || names.has('offset')) return undefined;
    return [{
      message: 'collection endpoint must paginate: declare a "pageSize" (or, for offset pagination, "offset") query parameter, or bound the response with maxItems (guide 12.1)',
      path: [...base, 'parameters'],
    }];
  }

  if (opts.mode === 'pageSizeBounds') {
    const pageSize = params.find((p) => p.name === 'pageSize');
    if (!pageSize) {
      return [{
        message: 'collection endpoint must declare a "pageSize" query parameter with a documented default and maximum (guide 12.4)',
        path: [...base, 'parameters'],
      }];
    }
    const schema = isObject(pageSize.schema) ? pageSize.schema : {};
    const missing = ['default', 'maximum'].filter((k) => schema[k] === undefined);
    if (missing.length === 0) return undefined;
    return [{
      message: `"pageSize" parameter schema must declare ${missing.join(' and ')} (guide 12.4)`,
      path: [...base, 'parameters', params.indexOf(pageSize)],
    }];
  }

  if (opts.mode === 'cursorParams') {
    if (offsetMode) return undefined;
    const names = new Set(params.map((p) => p.name));
    const results = [];
    if (!names.has('pageSize')) {
      results.push({
        message: 'collection endpoint must declare a "pageSize" query parameter (guide 12.2)',
        path: [...base, 'parameters'],
      });
    }
    if (!names.has('cursor')) {
      results.push({
        message: 'collection endpoint must declare a "cursor" query parameter; default pagination is cursor-based (guide 12.2)',
        path: [...base, 'parameters'],
      });
    }
    return results.length ? results : undefined;
  }

  if (opts.mode !== 'cursorEnvelope' && opts.mode !== 'offsetEnvelope') return undefined;

  const schema = responseSchema;
  if (!isObject(schema)) return undefined;
  const schemaPath = [...base, 'responses', '200', 'content', mediaType, 'schema'];

  if (opts.mode === 'cursorEnvelope') {
    if (offsetMode) return undefined;
    const findings = envelopeShape(
      schema,
      {
        requiredProperties: ['items', 'pageInfo'],
        properties: {
          items: { type: 'array' },
          pageInfo: {
            requiredProperties: ['nextCursor'],
            forbiddenProperties: ['hasMore'],
          },
        },
      },
      { path: schemaPath },
    ) ?? [];

    const pageInfo = effective(schema).properties.pageInfo;
    if (isObject(pageInfo)) {
      const nextCursor = effective(pageInfo).properties.nextCursor;
      if (!nullableNonEmptyString(nextCursor)) {
        findings.push({
          message: 'pageInfo.nextCursor must be an explicitly nullable, non-empty string',
          path: [...schemaPath, 'properties', 'pageInfo', 'properties', 'nextCursor'],
        });
      }
    }
    return findings.length ? findings : undefined;
  }

  // mode === 'offsetEnvelope'
  if (!offsetMode) return undefined;
  return envelopeShape(
    schema,
    {
      requiredProperties: ['items', 'offset', 'limit', 'total'],
      properties: { items: { type: 'array' } },
    },
    { path: schemaPath },
  );
}
