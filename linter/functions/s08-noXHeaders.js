import { isObject } from './lib/util.js';

const OPS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];
const ALLOWED_X_HEADER = 'x-request-id';

/**
 * s08 noXHeaders — guide 8.5: new custom headers MUST NOT use the `X-`
 * prefix (RFC 6648), except the legacy X-Request-Id correlation header
 * (§8.4, pending [OPEN-7-A]).
 *
 * Scans every header-carrying location in the document: operation and
 * path-item parameters with `in: header`, response `headers` maps (inline
 * on operations and under `components.responses`), and
 * `components.parameters` entries with `in: header`.
 *
 * `given` should be the document root (`$`).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function noXHeaders(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const flagName = (name, path) => {
    if (typeof name !== 'string') return;
    if (/^x-/i.test(name) && name.toLowerCase() !== ALLOWED_X_HEADER) {
      results.push({
        message: `header "${name}" uses the reserved "X-" prefix (RFC 6648); rename without the X- prefix`,
        path,
      });
    }
  };

  const scanParams = (params, path) => {
    if (!Array.isArray(params)) return;
    params.forEach((p, idx) => {
      if (isObject(p) && p.in === 'header') flagName(p.name, [...path, idx, 'name']);
    });
  };

  const scanResponses = (responses, path) => {
    if (!isObject(responses)) return;
    for (const [status, response] of Object.entries(responses)) {
      if (!isObject(response) || !isObject(response.headers)) continue;
      for (const headerName of Object.keys(response.headers)) {
        flagName(headerName, [...path, status, 'headers', headerName]);
      }
    }
  };

  const paths = targetVal.paths;
  if (isObject(paths)) {
    for (const [route, pathItem] of Object.entries(paths)) {
      if (!isObject(pathItem)) continue;
      scanParams(pathItem.parameters, [...base, 'paths', route, 'parameters']);
      for (const op of OPS) {
        const operation = pathItem[op];
        if (!isObject(operation)) continue;
        scanParams(operation.parameters, [...base, 'paths', route, op, 'parameters']);
        scanResponses(operation.responses, [...base, 'paths', route, op, 'responses']);
      }
    }
  }

  const components = targetVal.components;
  if (isObject(components)) {
    const compParams = components.parameters;
    if (isObject(compParams)) {
      for (const [key, p] of Object.entries(compParams)) {
        if (isObject(p) && p.in === 'header') flagName(p.name, [...base, 'components', 'parameters', key, 'name']);
      }
    }
    const compResponses = components.responses;
    if (isObject(compResponses)) {
      for (const [key, response] of Object.entries(compResponses)) {
        if (!isObject(response) || !isObject(response.headers)) continue;
        for (const headerName of Object.keys(response.headers)) {
          flagName(headerName, [...base, 'components', 'responses', key, 'headers', headerName]);
        }
      }
    }
  }

  return results.length ? results : undefined;
}
