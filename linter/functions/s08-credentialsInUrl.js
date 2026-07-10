import { isObject } from './lib/util.js';

const OPS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

// Names that look like a credential travelling somewhere other than the
// Authorization header (query/path parameters, or an apiKey security scheme
// placed in query/cookie).
const SUSPECT_NAME = /(access[_-]?)?token|api[_-]?key|apikey|secret|passwd|password|credential|auth(?:orization)?$/i;

/**
 * s08 credentialsInUrl — proxy for guide 8.1: credentials must travel in the
 * Authorization header, never in query parameters, fragments, or URL paths.
 *
 * Checks two mechanically-visible signals:
 *   - no `apiKey` security scheme is placed `in: query` or `in: cookie`
 *   - no path/query parameter has a credential-looking name (token, apiKey,
 *     secret, password, credential, ...)
 *
 * Does NOT verify: that credentials actually travel via the Authorization
 * header at runtime, arbitrary/synonym parameter names, URL fragments (not
 * representable in OpenAPI), or header VALUES that might embed a credential.
 *
 * `given` should be the document root (`$`).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function credentialsInUrl(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const schemes = isObject(targetVal.components) ? targetVal.components.securitySchemes : undefined;
  if (isObject(schemes)) {
    for (const [name, scheme] of Object.entries(schemes)) {
      if (!isObject(scheme)) continue;
      if (scheme.type === 'apiKey' && (scheme.in === 'query' || scheme.in === 'cookie')) {
        results.push({
          message: `securityScheme "${name}" is apiKey in "${scheme.in}"; credentials must travel in the Authorization header, not query/cookie`,
          path: [...base, 'components', 'securitySchemes', name],
        });
      }
    }
  }

  const scanParams = (params, path) => {
    if (!Array.isArray(params)) return;
    params.forEach((p, idx) => {
      if (!isObject(p)) return;
      if ((p.in === 'query' || p.in === 'path') && typeof p.name === 'string' && SUSPECT_NAME.test(p.name)) {
        results.push({
          message: `parameter "${p.name}" (in: ${p.in}) looks like a credential; credentials must travel in the Authorization header, not query/path`,
          path: [...path, idx, 'name'],
        });
      }
    });
  };

  const paths = targetVal.paths;
  if (isObject(paths)) {
    for (const [route, pathItem] of Object.entries(paths)) {
      if (!isObject(pathItem)) continue;
      scanParams(pathItem.parameters, [...base, 'paths', route, 'parameters']);
      for (const op of OPS) {
        const operation = pathItem[op];
        if (isObject(operation)) scanParams(operation.parameters, [...base, 'paths', route, op, 'parameters']);
      }
    }
  }

  return results.length ? results : undefined;
}
