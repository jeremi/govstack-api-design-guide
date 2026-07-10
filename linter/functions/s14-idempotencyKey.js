import { isObject, asArray, statusMatcher } from './lib/util.js';

/**
 * idempotencyKey — proxy for §14.1. A POST that creates a resource (declares a
 * 201 response) MUST accept an `Idempotency-Key` request header. This checks the
 * create-POST case only.
 *
 * It is a proxy: it cannot decide the other MUST triggers (moves value, submits
 * an irreversible request, sends a message, starts a long-running job, etc.) nor
 * the SHOULD/MAY tiers, so it keys off the mechanically visible signal of a POST
 * declaring a 201 response.
 *
 * Given: a path item (`$.paths[*]`). Reads its `post` operation plus both
 * path-level and operation-level `parameters`.
 *
 * options:
 *   header {string} required header name (default "Idempotency-Key").
 *   status {string} status matcher marking a create (default "201").
 *   method {string} operation key to inspect (default "post").
 *
 * @param {unknown} targetVal - a path item object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function idempotencyKey(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const header = typeof opts.header === 'string' ? opts.header : 'Idempotency-Key';
  const method = typeof opts.method === 'string' ? opts.method : 'post';
  const matchStatus = statusMatcher(typeof opts.status === 'string' ? opts.status : '201');

  const op = targetVal[method];
  if (!isObject(op) || !isObject(op.responses)) return;

  const created = Object.keys(op.responses).filter(matchStatus);
  if (created.length === 0) return;

  const params = [...asArray(targetVal.parameters), ...asArray(op.parameters)];
  const hasHeader = params.some(
    (p) =>
      isObject(p) &&
      p.in === 'header' &&
      typeof p.name === 'string' &&
      p.name.toLowerCase() === header.toLowerCase(),
  );
  if (hasHeader) return;

  const pathKey = base.length ? base[base.length - 1] : '';
  return [{
    message:
      `${method.toUpperCase()} ${pathKey} declares a ${created[0]} response (a create) but does not ` +
      `accept an "${header}" request header`,
    path: [...base, method],
  }];
}
