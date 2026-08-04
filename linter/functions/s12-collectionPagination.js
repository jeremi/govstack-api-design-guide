import { isObject, asArray } from './lib/util.js';
import { isStandardUnversionedPath } from './lib/standardEndpoints.js';
import envelopeShape from './envelopeShape.js';

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
 * Two carve-outs apply to every mode, so that the whole of §12's collection
 * surface answers them the same way:
 *   - the guide §5.10 standard unversioned endpoints are not collections;
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
 *                       envelope `{ items, pageInfo: { nextCursor, hasMore } }`.
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
/**
 * Guide §12.1 lets a collection go unpaginated when the specification itself
 * fixes its size and says so with `maxItems`. Every array the response returns
 * must carry that bound: one unbounded array is enough to make the response
 * unbounded.
 *
 * @param {unknown} schema - the 200 response body schema.
 * @returns {boolean} true when the response declares its own bound.
 */
function hasDeclaredBound(schema) {
  if (!isObject(schema)) return false;
  const arrays = [];
  if (schema.type === 'array') arrays.push(schema);
  if (isObject(schema.properties)) {
    for (const prop of Object.values(schema.properties)) {
      if (isObject(prop) && prop.type === 'array') arrays.push(prop);
    }
  }
  if (arrays.length === 0) return false;
  return arrays.every((a) => Number.isInteger(a.maxItems));
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

  // Guide §12.1: a collection bounded by its own schema may skip pagination,
  // and with it the pagination parameters and envelopes of §12.2–§12.4.
  if (hasDeclaredBound(responseSchema)) return undefined;

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
    return envelopeShape(
      schema,
      {
        requiredProperties: ['items', 'pageInfo'],
        properties: {
          items: { type: 'array' },
          pageInfo: { requiredProperties: ['nextCursor', 'hasMore'] },
        },
      },
      { path: schemaPath },
    );
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
