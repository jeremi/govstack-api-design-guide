import { isObject, asArray } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const CALLBACK_NAME = /callback/i;

/**
 * s15-callbackUrl: guide 15.8: a per-request callback URL travels in the
 * request body as `callbackUrl`, never in a header or query parameter, and an
 * operation accepting it describes the callback with an OpenAPI `callbacks`
 * object.
 *
 * Request bodies on §16 subscription paths (any `subscription`/`subscriptions`
 * segment) are exempt from the `callbacks` and `format` modes: there
 * `callbackUrl` is the subscription-managed webhook target of §16, not a
 * per-request callback.
 *
 * options:
 *   mode {'placement'|'callbacks'|'format'} (required)
 *     - placement: header or query parameter (operation, path-item, or
 *                  `components.parameters`) whose name matches /callback/i.
 *     - callbacks: an operation whose request body schema declares a
 *                  `callbackUrl` property but has no `callbacks` object.
 *     - format:    a request body `callbackUrl` property without
 *                  `format: uri`.
 *
 * `given` should be the document root (`$`).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function callbackUrl(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const mode = isObject(options) ? options.mode : undefined;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const scanParams = (params, path) => {
    asArray(params).forEach((p, index) => {
      if (!isObject(p) || (p.in !== 'header' && p.in !== 'query')) return;
      if (typeof p.name === 'string' && CALLBACK_NAME.test(p.name)) {
        results.push({
          message: `${p.in} parameter "${p.name}" looks like a callback URL; carry it in the request body as "callbackUrl"`,
          path: [...path, index, 'name'],
        });
      }
    });
  };

  const paths = isObject(targetVal.paths) ? targetVal.paths : {};
  for (const [route, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    if (mode === 'placement') scanParams(pathItem.parameters, [...base, 'paths', route, 'parameters']);
    const subscription = route.split('/').some((segment) => /^subscriptions?$/i.test(segment));
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation)) continue;
      const opPath = [...base, 'paths', route, method];
      if (mode === 'placement') {
        scanParams(operation.parameters, [...opPath, 'parameters']);
        continue;
      }
      if (subscription) continue;
      const declared = bodyCallbackUrls(operation, opPath);
      if (declared.length === 0) continue;
      if (mode === 'callbacks' && !(isObject(operation.callbacks) && Object.keys(operation.callbacks).length > 0)) {
        results.push({
          message: `${method.toUpperCase()} ${route} accepts "callbackUrl" and must describe the callback with an OpenAPI "callbacks" object`,
          path: opPath,
        });
      }
      if (mode === 'format') {
        for (const { schema, path } of declared) {
          if (schema.format !== 'uri') {
            results.push({ message: '"callbackUrl" must declare format: uri (an https URL)', path });
          }
        }
      }
    }
  }

  if (mode === 'placement' && isObject(targetVal.components?.parameters)) {
    for (const [key, p] of Object.entries(targetVal.components.parameters)) {
      if (!isObject(p) || (p.in !== 'header' && p.in !== 'query')) continue;
      if (typeof p.name === 'string' && CALLBACK_NAME.test(p.name)) {
        results.push({
          message: `${p.in} parameter "${p.name}" looks like a callback URL; carry it in the request body as "callbackUrl"`,
          path: [...base, 'components', 'parameters', key, 'name'],
        });
      }
    }
  }

  return results.length ? results : undefined;
}

/** `callbackUrl` property schemas declared by an operation's request bodies (one level of allOf). */
function bodyCallbackUrls(operation, opPath) {
  const found = [];
  const content = operation.requestBody?.content;
  if (!isObject(content)) return found;
  for (const [mediaType, media] of Object.entries(content)) {
    const schema = isObject(media) ? media.schema : undefined;
    if (!isObject(schema)) continue;
    const schemaPath = [...opPath, 'requestBody', 'content', mediaType, 'schema'];
    if (isObject(schema.properties?.callbackUrl)) {
      found.push({ schema: schema.properties.callbackUrl, path: [...schemaPath, 'properties', 'callbackUrl'] });
      continue;
    }
    for (const [index, branch] of asArray(schema.allOf).entries()) {
      if (isObject(branch) && isObject(branch.properties?.callbackUrl)) {
        found.push({
          schema: branch.properties.callbackUrl,
          path: [...schemaPath, 'allOf', index, 'properties', 'callbackUrl'],
        });
        break;
      }
    }
  }
  return found;
}
