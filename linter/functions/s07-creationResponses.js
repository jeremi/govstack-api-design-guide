import { isObject } from './lib/util.js';

const CREATE_OPERATION_RE = /^(create|register|add|submit|start|initiate)[A-Z0-9_]/;

/** Advisory proxy: operationIds that clearly describe creation should expose
 * either synchronous 201 or asynchronous 202 semantics. */
export default function creationResponses(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const paths = isObject(targetVal.paths) ? targetVal.paths : {};
  const results = [];
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    const operation = isObject(pathItem) ? pathItem.post : null;
    if (!isObject(operation) || typeof operation.operationId !== 'string') continue;
    if (!CREATE_OPERATION_RE.test(operation.operationId)) continue;
    const responses = isObject(operation.responses) ? operation.responses : {};
    if (!Object.prototype.hasOwnProperty.call(responses, '201') && !Object.prototype.hasOwnProperty.call(responses, '202')) {
      results.push({
        message: `creation-like POST ${pathKey} (${operation.operationId}) should declare a 201 or 202 response`,
        path: [...base, 'paths', pathKey, 'post', 'responses'],
      });
    }
  }
  return results.length ? results : undefined;
}
