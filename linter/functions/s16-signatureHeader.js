import { isObject } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

/**
 * s16-signatureHeader — guide 16.6 (OpenAPI/webhooks surface): the event
 * signature MUST travel in a single ecosystem-wide HTTP header named
 * `GovStack-Signature`. Every webhook delivery therefore has to declare that
 * header as a request parameter.
 *
 * `given` should select each webhook path-item object, i.e. `$.webhooks[*]`.
 * Header parameters may be declared at the path-item level (shared) or on the
 * individual operations; this function accepts the header found at either
 * level. Matching is case-insensitive because HTTP header names are.
 *
 * Options:
 *   field {string}  header name to require (default "GovStack-Signature").
 *
 * @param {unknown} targetVal - a webhook Path Item Object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function signatureHeader(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const field = (isObject(options) && typeof options.field === 'string' ? options.field : 'GovStack-Signature');
  const wanted = field.toLowerCase();
  const base = context && Array.isArray(context.path) ? context.path : [];
  const label = base.length ? String(base[base.length - 1]) : 'webhook';

  const hasHeader = (params) =>
    Array.isArray(params) &&
    params.some(
      (p) => isObject(p) && p.in === 'header' && typeof p.name === 'string' && p.name.toLowerCase() === wanted,
    );

  if (hasHeader(targetVal.parameters)) return;
  for (const method of METHODS) {
    const op = targetVal[method];
    if (isObject(op) && hasHeader(op.parameters)) return;
  }

  return [
    {
      message: `webhook "${label}" must declare a "${field}" header parameter so receivers can verify the event signature (§16.6).`,
      path: base,
    },
  ];
}
