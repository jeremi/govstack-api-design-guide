import { isObject } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** Deterministic baseline errors whose applicability is visible in OAS. */
export default function baselineResponses(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const rootSecurity = Array.isArray(targetVal.security) ? targetVal.security : null;
  const paths = isObject(targetVal.paths) ? targetVal.paths : {};
  const results = [];

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation)) continue;
      const responses = isObject(operation.responses) ? operation.responses : {};
      const required = new Set();
      const effectiveSecurity = Array.isArray(operation.security) ? operation.security : rootSecurity;
      if (Array.isArray(effectiveSecurity) && effectiveSecurity.length > 0) {
        required.add('401');
        const hasScopes = effectiveSecurity.some(
          (requirement) =>
            isObject(requirement) &&
            Object.values(requirement).some((scopes) => Array.isArray(scopes) && scopes.length > 0),
        );
        if (hasScopes) required.add('403');
      }
      if (isObject(operation.requestBody)) required.add('400');
      const parameters = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ];
      if (parameters.some((parameter) => isObject(parameter) && ['path', 'query'].includes(parameter.in))) {
        required.add('400');
      }
      if (/\{[^}]+\}/.test(pathKey)) required.add('404');
      for (const status of required) {
        if (!Object.prototype.hasOwnProperty.call(responses, status)) {
          results.push({
            message: `${method.toUpperCase()} ${pathKey} should declare applicable baseline response ${status}`,
            path: [...base, 'paths', pathKey, method, 'responses'],
          });
        }
      }
    }
  }
  return results.length ? results : undefined;
}
