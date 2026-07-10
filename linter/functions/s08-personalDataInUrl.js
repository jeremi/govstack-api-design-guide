import { isObject } from './lib/util.js';

const OPS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

// Heuristic dictionary of personal-data term fragments. Deliberately broad
// (STRICT-ONLY): flags plausible personal-data parameter names, not a
// definitive determination.
const PERSONAL_DATA_TERMS =
  /national[-_]?id|\bssn\b|social[-_]?security|passport|phone|mobile|e[-_]?mail|full[-_]?name|first[-_]?name|last[-_]?name|surname|date[-_]?of[-_]?birth|\bdob\b|birth[-_]?date|home[-_]?address|street[-_]?address/i;

/**
 * s08 personalDataInUrl — STRICT-ONLY heuristic for guide 8.6: personal data
 * MUST NOT appear in path segments, query parameters, or header values;
 * opaque server-generated IDs MUST be used to refer to citizen records in
 * URLs.
 *
 * Flags path/query/header parameters whose NAME matches a dictionary of
 * personal-data term fragments (e.g. `email`, `phone`, `nationalId`,
 * `dateOfBirth`). Deliberately noisy: a parameter literally named `email`
 * trips it even when it is e.g. an admin lookup field, hence STRICT-ONLY.
 *
 * Does NOT verify: header or query VALUES (only names are visible
 * statically), synonyms outside the dictionary, or whether an ID is
 * actually opaque/server-generated vs. a natural key that happens not to
 * match the dictionary.
 *
 * `given` should be the document root (`$`).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function personalDataInUrl(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const scanParams = (params, path) => {
    if (!Array.isArray(params)) return;
    params.forEach((p, idx) => {
      if (!isObject(p)) return;
      if (
        (p.in === 'path' || p.in === 'query' || p.in === 'header') &&
        typeof p.name === 'string' &&
        PERSONAL_DATA_TERMS.test(p.name)
      ) {
        results.push({
          message: `parameter "${p.name}" (in: ${p.in}) looks like personal data; use an opaque server-generated identifier instead`,
          path: [...path, idx, 'name'],
        });
      }
    });
  };

  const paths = targetVal.paths;
  if (isObject(paths)) {
    for (const [route, pathItem] of Object.entries(paths)) {
      if (!isObject(pathItem)) continue;
      scanParams(pathItem.parameters, [...base, 'paths', route, 'parameters']);
      for (const op of OPS) {
        const operation = pathItem[op];
        if (isObject(operation)) scanParams(operation.parameters, [...base, 'paths', route, op, 'parameters']);
      }
    }
  }

  return results.length ? results : undefined;
}
