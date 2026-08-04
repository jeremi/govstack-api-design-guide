import { isObject } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/** Advisory cross-service proxy: effective nonempty security requires traceparent. */
export default function traceContext(targetVal, _options, context) {
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
      const effectiveSecurity = Array.isArray(operation.security) ? operation.security : rootSecurity;
      if (!Array.isArray(effectiveSecurity) || effectiveSecurity.length === 0) continue;
      const parameters = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ];
      const hasTraceparent = parameters.some(
        (parameter) =>
          isObject(parameter) &&
          parameter.in === 'header' &&
          typeof parameter.name === 'string' &&
          parameter.name.toLowerCase() === 'traceparent',
      );
      if (!hasTraceparent) {
        results.push({
          message: `secured operation ${method.toUpperCase()} ${pathKey} should declare the W3C traceparent request header`,
          path: [...base, 'paths', pathKey, method, 'parameters'],
        });
      }
    }
  }
  return results.length ? results : undefined;
}
