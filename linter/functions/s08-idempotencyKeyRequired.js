import { isObject } from './lib/util.js';

/**
 * s08 idempotencyKeyRequired — proxy for guide 8.3: POST endpoints that
 * require idempotency under §14 MUST accept an Idempotency-Key header,
 * unless §14.6 applies.
 *
 * Proxy signal: a POST operation that declares a 201 response is treated as
 * a "create" endpoint that requires idempotency. Does NOT verify the actual
 * §14 idempotency-requirement determination, and does NOT check the §14.6
 * opt-out.
 *
 * `given` should select POST operations, e.g. `$.paths[*].post`.
 *
 * @param {unknown} targetVal - a POST operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function idempotencyKeyRequired(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const responses = targetVal.responses;
  if (!isObject(responses) || !('201' in responses)) return;

  const params = Array.isArray(targetVal.parameters) ? targetVal.parameters : [];
  const hasHeader = params.some(
    (p) => isObject(p) && p.in === 'header' && typeof p.name === 'string' && p.name.toLowerCase() === 'idempotency-key',
  );
  if (hasHeader) return;

  const base = context && Array.isArray(context.path) ? context.path : [];
  return [
    {
      message: 'POST operation returning 201 must accept an Idempotency-Key header parameter (unless §14.6 applies)',
      path: [...base, 'parameters'],
    },
  ];
}
