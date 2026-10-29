import { isObject, isNonEmptyString } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const USE_CASE = 'x-govstack-use-case';
const PII = 'x-govstack-pii';

/**
 * s04-operationMetadata: guide 4.7 operation metadata extensions.
 *
 * options:
 *   mode {'shape'|'piiApiKey'} (required)
 *     - shape:     `given` selects an OpenAPI operation or an AsyncAPI
 *                  operation/message. When present, `x-govstack-use-case`
 *                  must be a non-empty string or a non-empty array of
 *                  non-empty strings, and `x-govstack-pii` must be a boolean.
 *                  Absent extensions are fine (declaring them is a MAY).
 *     - piiApiKey: `given` is the OpenAPI document root. An operation marked
 *                  `x-govstack-pii: true` must not have any applicable
 *                  security requirement (operation `security`, else the
 *                  document `security`) that references an `apiKey` scheme
 *                  (aligned with §13.6).
 *
 * Does NOT verify: that use-case identifiers exist in a GovStack catalogue,
 * or that `x-govstack-pii` is truthful (whether the payload carries personal
 * data needs review).
 *
 * @param {unknown} targetVal
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function operationMetadata(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const mode = isObject(options) ? options.mode : undefined;
  const base = context && Array.isArray(context.path) ? context.path : [];
  if (mode === 'shape') return shape(targetVal, base);
  if (mode === 'piiApiKey') return piiApiKey(targetVal, base);
  return undefined;
}

function shape(node, base) {
  const results = [];
  if (USE_CASE in node) {
    const value = node[USE_CASE];
    const ok = isNonEmptyString(value) ||
      (Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString));
    if (!ok) {
      results.push({
        message: `${USE_CASE} must be a non-empty string or a non-empty array of non-empty strings`,
        path: [...base, USE_CASE],
      });
    }
  }
  if (PII in node && typeof node[PII] !== 'boolean') {
    results.push({ message: `${PII} must be a boolean`, path: [...base, PII] });
  }
  return results.length ? results : undefined;
}

function piiApiKey(doc, base) {
  const schemes = isObject(doc.components?.securitySchemes) ? doc.components.securitySchemes : {};
  const apiKeys = new Set(
    Object.entries(schemes)
      .filter(([, scheme]) => isObject(scheme) && scheme.type === 'apiKey')
      .map(([name]) => name),
  );
  if (apiKeys.size === 0) return undefined;

  const results = [];
  const paths = isObject(doc.paths) ? doc.paths : {};
  for (const [route, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) continue;
    for (const method of METHODS) {
      const operation = pathItem[method];
      if (!isObject(operation) || operation[PII] !== true) continue;
      const security = operation.security !== undefined ? operation.security : doc.security;
      if (!Array.isArray(security)) continue;
      const used = security
        .filter(isObject)
        .flatMap((requirement) => Object.keys(requirement))
        .filter((name) => apiKeys.has(name));
      if (used.length === 0) continue;
      results.push({
        message:
          `${method.toUpperCase()} ${route} is marked ${PII}: true but its security requirements ` +
          `reference the apiKey scheme ${[...new Set(used)].map((n) => `"${n}"`).join(', ')}; API keys must not protect personal data (guide 13.6)`,
        path: [...base, 'paths', route, method],
      });
    }
  }
  return results.length ? results : undefined;
}
