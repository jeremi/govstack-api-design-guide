import { isObject, asArray } from './lib/util.js';

const MUTATING_METHODS = ['put', 'patch', 'delete'];

/**
 * bulkMutationSelection — guide 6.7 (proxy): a collection-targeted PUT,
 * PATCH, or DELETE (a path with no parameter or colon custom method) MUST require at least
 * one explicit selection parameter. PROXY: only checks that >=1 `query`
 * parameter is declared (path-item-level or operation-level); it cannot
 * verify the parameter actually scopes/limits which records are mutated, nor
 * does it check the append-only-resource carve-out (that needs external
 * knowledge of which resources are designated append-only).
 *
 * `given` should select path-item objects already filtered to collection-only
 * keys, e.g. `$.paths[?(!@property.includes('{') && !@property.includes(':'))]`.
 *
 * @param {unknown} targetVal - a path-item object.
 * @param {object} options - unused.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function bulkMutationSelection(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  // A custom method may target a collection without being a bulk CRUD
  // mutation. Its request semantics are a separate review decision.
  const pathKey = base.at(-1);
  if (typeof pathKey === 'string' && pathKey.includes(':')) return;
  const pathItemParams = asArray(targetVal.parameters);
  const results = [];

  for (const method of MUTATING_METHODS) {
    const op = targetVal[method];
    if (!isObject(op)) continue;
    const params = [...pathItemParams, ...asArray(op.parameters)];
    const hasQueryParam = params.some((p) => isObject(p) && p.in === 'query');
    if (!hasQueryParam) {
      results.push({
        message: `bulk ${method.toUpperCase()} on a collection must declare at least one query parameter for explicit selection`,
        path: [...base, method],
      });
    }
  }

  return results.length ? results : undefined;
}
