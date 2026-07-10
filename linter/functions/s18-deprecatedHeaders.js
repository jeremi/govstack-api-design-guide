import { isObject } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];
const SUCCESS_STATUS = /^2\d{2}$/;

/**
 * s18-deprecatedHeaders — guide 18.5: operations marked `deprecated: true`
 * MUST return a Deprecation header (RFC 9745) and a Sunset header (RFC 8594)
 * on their 2xx responses.
 *
 * `given` should be `$.paths`. Walks operations directly (rather than
 * filtering via a `given` JSONPath filter chained after a bracketed method
 * list) because that chained-filter form does not select reliably in this
 * Spectral/nimma version - see the comment on govstack-18.5 in s18.yaml.
 *
 * Only checks header PRESENCE; the RFC 9745/8594 structured-field VALUE
 * syntax is not checkable from a static header declaration.
 *
 * @param {unknown} targetVal - the paths object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function deprecatedHeaders(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  for (const [pathKey, pathItem] of Object.entries(targetVal)) {
    if (!isObject(pathItem)) continue;
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation) || operation.deprecated !== true) continue;
      const responses = operation.responses;
      if (!isObject(responses)) continue;
      for (const [status, response] of Object.entries(responses)) {
        if (!SUCCESS_STATUS.test(status) || !isObject(response)) continue;
        const headers = isObject(response.headers)
          ? Object.keys(response.headers).map((h) => h.toLowerCase())
          : [];
        const here = [...base, pathKey, method, 'responses', status];
        if (!headers.includes('deprecation')) {
          results.push({
            message: `${status} response of deprecated operation "${method.toUpperCase()} ${pathKey}" must declare a "Deprecation" header`,
            path: here,
          });
        }
        if (!headers.includes('sunset')) {
          results.push({
            message: `${status} response of deprecated operation "${method.toUpperCase()} ${pathKey}" must declare a "Sunset" header`,
            path: here,
          });
        }
      }
    }
  }

  return results.length ? results : undefined;
}
