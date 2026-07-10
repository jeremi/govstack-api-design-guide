import { isObject, asArray } from './lib/util.js';
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
 * The operational liveness endpoints `/health` and `/ready` (guide §5.9) are
 * NOT collections and are exempted by exact path-key match (see EXEMPT_PATHS).
 *
 * options:
 *   mode {'cursorParams'|'cursorEnvelope'|'offsetEnvelope'} (required)
 *     - cursorParams:   operation MUST declare both `pageSize` and `cursor`
 *                       query parameters. No-op when the operation has an
 *                       `offset` parameter (that operation is covered by the
 *                       `offsetEnvelope` mode / §12.6 instead).
 *     - cursorEnvelope: the 200 response body schema MUST declare the §12.3
 *                       envelope `{ items, pageInfo: { nextCursor, hasMore } }`.
 *                       No-op when the operation has an `offset` parameter.
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
const EXEMPT_PATHS = new Set(['/health', '/ready']);

export default function collectionPagination(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const mediaType = typeof opts.mediaType === 'string' ? opts.mediaType : 'application/json';

  // Guide §12.1 covers "endpoints returning collections". The operational
  // liveness probes /health and /ready (guide §5.9) are not collections, so
  // exempt them by exact path-key match. `given` selects the GET operation, so
  // context.path is ['paths', '<pathKey>', 'get'] — the key sits before 'get'.
  const pathKey = base.length >= 2 ? base[base.length - 2] : undefined;
  if (typeof pathKey === 'string' && EXEMPT_PATHS.has(pathKey)) return undefined;

  const params = asArray(targetVal.parameters).filter(isObject);
  const offsetMode = params.some((p) => p.name === 'offset');

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

  const schema = targetVal.responses?.['200']?.content?.[mediaType]?.schema;
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
