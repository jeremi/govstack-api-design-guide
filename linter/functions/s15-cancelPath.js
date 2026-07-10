import { isObject } from './lib/util.js';

const CANONICAL = /^\/v\d+\/operations\/\{[^}]+\}\/cancel$/;

/**
 * cancelPath — §15.5. Cancellation of an asynchronous Operation, when
 * supported, MUST be `POST /v{N}/operations/{operationId}/cancel`.
 *
 * Scope: only Operation-cancellation paths are checked — a path whose last
 * segment is `cancel` and that contains an `operations` segment. Domain-level
 * cancel actions (e.g. `/v1/orders/{id}/cancel`) are not Operation
 * cancellations and are out of scope. A matching path must be the canonical
 * shape and must declare a `post` operation.
 *
 * Given: the paths object ($.paths).
 *
 * @param {unknown} targetVal - the paths object.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function cancelPath(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  for (const [key, item] of Object.entries(targetVal)) {
    if (typeof key !== 'string') continue;
    const segments = key.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last !== 'cancel' || !segments.includes('operations')) continue;

    if (!CANONICAL.test(key)) {
      results.push({
        message: `cancellation path "${key}" must be POST /v{N}/operations/{operationId}/cancel`,
        path: [...base, key],
      });
      continue;
    }
    if (!isObject(item) || !isObject(item.post)) {
      results.push({
        message: `cancellation at "${key}" must be declared as a POST operation`,
        path: [...base, key],
      });
    }
  }
  return results.length ? results : undefined;
}
