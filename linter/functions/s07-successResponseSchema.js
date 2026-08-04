import { isObject } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** Enforce the deterministic successful-response schema clauses of guide 7.21. */
export default function successResponseSchema(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  for (const branch of ['paths', 'webhooks']) {
    const pathItems = targetVal[branch];
    if (!isObject(pathItems)) continue;
    for (const [pathKey, pathItem] of Object.entries(pathItems)) {
      if (!isObject(pathItem)) continue;
      for (const method of METHODS) {
        const operation = pathItem[method];
        if (!isObject(operation) || !isObject(operation.responses)) continue;
        for (const [status, response] of Object.entries(operation.responses)) {
          if (!/^2\d\d$/.test(status) || !isObject(response) || response.content === undefined) continue;
          const responsePath = [...base, branch, pathKey, method, 'responses', status, 'content'];
          if (status === '204') {
            results.push({
              message: `${method.toUpperCase()} ${pathKey} response 204 must not declare content`,
              path: responsePath,
            });
            continue;
          }
          if (!isObject(response.content) || Object.keys(response.content).length === 0) {
            results.push({
              message: `${method.toUpperCase()} ${pathKey} response ${status} content must declare at least one media type schema`,
              path: responsePath,
            });
            continue;
          }
          for (const [mediaType, media] of Object.entries(response.content)) {
            if (!isObject(media) || !isObject(media.schema) || Object.keys(media.schema).length === 0) {
              results.push({
                message: `${method.toUpperCase()} ${pathKey} response ${status} media type ${mediaType} must declare a non-empty schema`,
                path: [...responsePath, mediaType],
              });
            }
          }
        }
      }
    }
  }
  return results.length ? results : undefined;
}
