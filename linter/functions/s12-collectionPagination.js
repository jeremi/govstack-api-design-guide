import { isObject, asArray } from './lib/util.js';
import { isStandardUnversionedPath } from './lib/standardEndpoints.js';
import envelopeShape from './envelopeShape.js';
import { collectionShape } from './lib/collectionShape.js';

/**
 * s12-collectionPagination — pagination checks for a "collection" GET
 * operation that need to branch on whether the operation opted into
 * offset-based pagination (guide §12.6) instead of the cursor-based default
 * (guide §12.2/§12.3). Reuses `envelopeShape` for the actual shape check so
 * the envelope rules (cursor vs. flat/offset) stay in one place. A POST
 * search (guide §12.9) selects the same envelope checks through its request
 * body.
 *
 * `given` should select the operation object itself, e.g.
 * `$.paths[?(!@property.match(/\/\{[^}]+\}$/))][get]` (a "collection" path:
 * one that does not end in a `{param}` segment).
 *
 * An operation is considered to have opted into offset pagination when its
 * `parameters` array declares a parameter named `offset`, or its JSON request
 * body schema declares an `offset` property (a §12.9 body-based search).
 *
 * Three carve-outs apply to every mode, so that the whole of §12's collection
 * surface answers them the same way:
 *   - the guide §5.10 standard unversioned endpoints are not collections;
 *   - a GET whose response explicitly declares one object is not a collection,
 *     unless the operation itself declares pagination controls;
 *   - a collection whose 200 response declares its own bound with `maxItems`
 *     may be returned unpaginated (guide §12.1).
 *
 * options:
 *   mode {'pageParam'|'cursorParams'|'cursorEnvelope'|'pageSizeBounds'|'offsetEnvelope'|'searchBody'} (required)
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
 *                       flat envelope `{ items, offset, limit, total? }`;
 *                       `total` is optional and, when declared, an integer.
 *                       No-op when the operation does NOT have an `offset`
 *                       parameter (nothing to check: it isn't using offset
 *                       pagination).
 *     - searchBody:     the request body schema MUST declare the controls of
 *                       one pagination contract: `offset` and `limit` when it
 *                       declares `offset`, otherwise `pageSize` and `cursor`
 *                       (guide §12.9). No-op without a request body schema.
 *   mediaType {string} content-type key to inspect on the 200 response,
 *                       default "application/json".
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
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

/** True when a conjunctive schema declaration explicitly identifies one object. */
function declaresObject(schema) {
  if (!isObject(schema)) return false;
  const pending = [schema];
  const seen = new WeakSet();
  while (pending.length) {
    const node = pending.pop();
    if (!isObject(node) || seen.has(node)) continue;
    seen.add(node);
    const types = asArray(node.type);
    if (types.includes('object') && types.every((type) => type === 'object' || type === 'null')) return true;
    pending.push(...asArray(node.allOf));
  }
  return false;
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

  const shape = collectionShape(responseSchema);
  const params = asArray(targetVal.parameters).filter(isObject);
  const paginationNames = new Set(['pageSize', 'cursor', 'offset', 'limit']);
  const declaresPagination = params.some((parameter) => paginationNames.has(parameter.name));

  // The path selector is only a collection proxy. An explicit object response
  // is stronger evidence that the operation returns one resource, even when
  // that resource embeds an array. Keep checking operations that declare
  // pagination, because an object there may instead be a malformed envelope.
  if (
    base.at(-1) === 'get' &&
    declaresObject(responseSchema) &&
    !shape.isCollection &&
    !declaresPagination
  ) return undefined;

  // Guide §12.1: a collection bounded by its own schema may skip pagination,
  // and with it the pagination parameters and envelopes of §12.2–§12.4.
  if (shape.bounded) return undefined;

  const bodySchema = targetVal.requestBody?.content?.[mediaType]?.schema;
  const bodyProperties = isObject(bodySchema) ? effective(bodySchema).properties : {};
  const offsetMode = params.some((p) => p.name === 'offset') || 'offset' in bodyProperties;

  if (opts.mode === 'searchBody') {
    if (!isObject(bodySchema)) return undefined;
    const wanted = offsetMode ? ['offset', 'limit'] : ['pageSize', 'cursor'];
    const missing = wanted.filter((name) => !(name in bodyProperties));
    if (missing.length === 0) return undefined;
    return [{
      message: offsetMode
        ? `search request body declares "offset" and must also declare ${missing.map((n) => `"${n}"`).join(' and ')} (guide 12.9, 12.6)`
        : `search request body must declare ${missing.map((n) => `"${n}"`).join(' and ')} for cursor pagination, or "offset" and "limit" for offset pagination (guide 12.9)`,
      path: [...base, 'requestBody', 'content', mediaType, 'schema'],
    }];
  }

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
      requiredProperties: ['items', 'offset', 'limit'],
      properties: { items: { type: 'array' } },
      optionalProperties: { total: { type: 'integer' } },
    },
    { path: schemaPath },
  );
}
