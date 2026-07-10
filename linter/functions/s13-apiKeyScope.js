import { isObject } from './lib/util.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

// Path segments that identify an operational (health-like) endpoint per §5.9.
const OPERATIONAL = new Set([
  'health', 'healthz', 'live', 'livez', 'ready', 'readyz',
  'metrics', 'ping', 'status', 'startup', 'startupz',
]);

/**
 * apiKeyScope — proxy for §13.6. API keys may protect operational endpoints
 * (`/health` and similar) but MUST NOT protect operations that read or write
 * personal data. This flags every operation that applies an `apiKey` security
 * scheme yet is not an operational endpoint.
 *
 * It is a proxy: it cannot decide "reads or writes personal data", so it uses a
 * path heuristic (§5.9 operational names) and flags apiKey use on everything
 * else. It also cannot see credentials applied outside declared security
 * requirements.
 *
 * Given: the document root ($).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function apiKeyScope(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];

  const components = isObject(targetVal.components) ? targetVal.components : {};
  const schemes = isObject(components.securitySchemes) ? components.securitySchemes : {};
  const apiKeyNames = new Set(
    Object.entries(schemes)
      .filter(([, v]) => isObject(v) && v.type === 'apiKey')
      .map(([k]) => k),
  );
  if (apiKeyNames.size === 0) return;

  const rootSecurity = Array.isArray(targetVal.security) ? targetVal.security : undefined;

  const usesApiKey = (requirements) =>
    Array.isArray(requirements) &&
    requirements.some((req) => isObject(req) && Object.keys(req).some((n) => apiKeyNames.has(n)));

  const isOperational = (pathKey) =>
    pathKey
      .split('/')
      .filter((seg) => seg && !seg.startsWith('{'))
      .some((seg) => OPERATIONAL.has(seg.toLowerCase()));

  const results = [];
  const paths = isObject(targetVal.paths) ? targetVal.paths : {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!isObject(op)) continue;
      const effective = op.security !== undefined ? op.security : rootSecurity;
      if (usesApiKey(effective) && !isOperational(pathKey)) {
        results.push({
          message:
            `operation ${method.toUpperCase()} ${pathKey} applies an apiKey scheme but is not an ` +
            `operational (health-like) endpoint; API keys must not protect data operations`,
          path: [...base, 'paths', pathKey, method],
        });
      }
    }
  }
  return results.length ? results : undefined;
}
