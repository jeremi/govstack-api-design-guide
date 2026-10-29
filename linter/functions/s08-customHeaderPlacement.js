import { isObject } from './lib/util.js';

const OPS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

// Header names that look like business identifiers, tenant/organisation ids,
// callback URLs, or personal identifiers (guide 8.8).
const BUSINESS_HEADER =
  /(tenant|org(anisation|anization)?[-_]?id|customer[-_]?id|callback|national[-_]?id|citizen[-_]?id|payer[-_]?fi[-_]?id|biller[-_]?id|program[-_]?id|registering[-_]?institution[-_]?id)/i;

/**
 * s08-customHeaderPlacement: STRICT-only proxy for guide 8.8: business
 * identifiers, tenant or organisation identifiers, callback URLs, and personal
 * data SHOULD NOT travel in custom headers.
 *
 * Flags header names matching a small dictionary in every header-carrying
 * location: operation and path-item parameters with `in: header`,
 * `components.parameters` with `in: header`, and response `headers` maps
 * (inline on operations and under `components.responses`).
 *
 * Does NOT verify: the `GovStack-` prefix on cross-BB headers or plain names
 * on BB-local headers (which headers are cross-BB is not visible in one
 * document), BB codes or version numbers embedded in names, synonyms outside
 * the dictionary, or header values.
 *
 * `given` should be the document root (`$`).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function customHeaderPlacement(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const flagName = (name, path) => {
    if (typeof name === 'string' && BUSINESS_HEADER.test(name)) {
      results.push({
        message: `header "${name}" looks like a business identifier, tenant id, callback URL or personal data; carry it in the path, the body, or token claims`,
        path,
      });
    }
  };
  const scanParams = (params, path) => {
    if (!Array.isArray(params)) return;
    params.forEach((p, index) => {
      if (isObject(p) && p.in === 'header') flagName(p.name, [...path, index, 'name']);
    });
  };
  const scanResponseHeaders = (responses, path) => {
    if (!isObject(responses)) return;
    for (const [key, response] of Object.entries(responses)) {
      if (!isObject(response) || !isObject(response.headers)) continue;
      for (const name of Object.keys(response.headers)) flagName(name, [...path, key, 'headers', name]);
    }
  };

  if (isObject(targetVal.paths)) {
    for (const [route, pathItem] of Object.entries(targetVal.paths)) {
      if (!isObject(pathItem)) continue;
      scanParams(pathItem.parameters, [...base, 'paths', route, 'parameters']);
      for (const op of OPS) {
        const operation = pathItem[op];
        if (!isObject(operation)) continue;
        scanParams(operation.parameters, [...base, 'paths', route, op, 'parameters']);
        scanResponseHeaders(operation.responses, [...base, 'paths', route, op, 'responses']);
      }
    }
  }

  const components = targetVal.components;
  if (isObject(components)) {
    if (isObject(components.parameters)) {
      for (const [key, p] of Object.entries(components.parameters)) {
        if (isObject(p) && p.in === 'header') flagName(p.name, [...base, 'components', 'parameters', key, 'name']);
      }
    }
    scanResponseHeaders(components.responses, [...base, 'components', 'responses']);
  }

  return results.length ? results : undefined;
}
