import { isObject } from './lib/util.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * securityCoverage — check that operations are authenticated (or explicitly
 * opted out).
 *
 * Two modes:
 *
 * mode "covered" (default) — `given` is the document root (`$`). Every operation
 *   must be covered by a security requirement: either a non-empty root-level
 *   `security`, or an operation-level `security`. An operation-level
 *   `security: []` counts as an explicit, allowed opt-out. Optionally requires
 *   `components.securitySchemes` to be present.
 *   options: { requireSchemes?: boolean }
 *
 * mode "none" — `given` is a single operation (e.g. the /health GET). The
 *   operation MUST declare `security: []` (explicitly unauthenticated).
 *   options: { mode: "none" }
 *
 * @param {unknown} targetVal
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function securityCoverage(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];

  if (opts.mode === 'none') {
    const sec = targetVal.security;
    if (!Array.isArray(sec) || sec.length !== 0) {
      return [{ message: 'operation must be unauthenticated (declare security: [])', path: [...base] }];
    }
    return;
  }

  // mode "covered": targetVal is the document root.
  const results = [];
  const rootSecurity = Array.isArray(targetVal.security) && targetVal.security.length > 0;
  const components = isObject(targetVal.components) ? targetVal.components : {};
  const schemes = isObject(components.securitySchemes) ? Object.keys(components.securitySchemes) : [];

  if (opts.requireSchemes === true && schemes.length === 0) {
    results.push({ message: 'components.securitySchemes must declare at least one scheme', path: [...base, 'components', 'securitySchemes'] });
  }

  const paths = isObject(targetVal.paths) ? targetVal.paths : {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!isObject(op)) continue;
      const opSecurity = op.security;
      const covered = Array.isArray(opSecurity) || rootSecurity;
      if (!covered) {
        results.push({
          message: `operation ${method.toUpperCase()} ${pathKey} is not covered by any security requirement`,
          path: [...base, 'paths', pathKey, method],
        });
      }
    }
  }

  return results.length ? results : undefined;
}
