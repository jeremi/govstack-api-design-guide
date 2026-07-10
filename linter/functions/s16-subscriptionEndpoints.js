import { isObject } from './lib/util.js';

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

/**
 * s16-subscriptionEndpoints — guide 16.11 (proxy): subscription management MUST
 * expose interfaces to create, list, rotate the signing secret, and delete a
 * subscription. This is a proxy: it can only reason about paths that are
 * *named* as subscription resources. When a document exposes any subscription
 * path, the four capabilities are required; a document with no subscription
 * path is left clean (absence of a subscription surface cannot be judged here,
 * nor can the AsyncAPI message-command control plane the guide also permits).
 *
 * Capabilities are inferred from path shape and HTTP method:
 *   create        POST on a collection path ending in `/subscriptions`
 *   list          GET  on that collection path
 *   delete        DELETE on an item path `/subscriptions/{id}`
 *   rotate-secret POST/PUT on a path whose last segment mentions rotate/secret
 *
 * `given` should be `$.paths`.
 *
 * @param {unknown} targetVal - the OpenAPI `paths` object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function subscriptionEndpoints(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];

  const collection = new Set();
  const item = new Set();
  const rotate = new Set();
  let sawSubscription = false;

  for (const [route, pathItem] of Object.entries(targetVal)) {
    if (!isObject(pathItem)) continue;
    const segments = route.split('/').filter((s) => s.length > 0);
    if (!segments.some((s) => /^subscriptions?$/i.test(s))) continue;
    sawSubscription = true;

    const methods = METHODS.filter((m) => isObject(pathItem[m]));
    const last = segments[segments.length - 1] || '';

    if (/rotate|secret/i.test(last)) {
      methods.forEach((m) => rotate.add(m));
    } else if (/^subscriptions?$/i.test(last)) {
      methods.forEach((m) => collection.add(m));
    } else if (/^\{.+\}$/.test(last)) {
      methods.forEach((m) => item.add(m));
    }
  }

  if (!sawSubscription) return; // no subscription surface to judge

  const missing = [];
  if (!collection.has('post')) missing.push('create (POST /…/subscriptions)');
  if (!collection.has('get')) missing.push('list (GET /…/subscriptions)');
  if (!(rotate.has('post') || rotate.has('put'))) {
    missing.push('rotate-secret (POST /…/subscriptions/{id}/rotate-secret)');
  }
  if (!item.has('delete')) missing.push('delete (DELETE /…/subscriptions/{id})');

  if (missing.length === 0) return;

  return [
    {
      message: `subscription management is exposed but missing: ${missing.join(', ')}. §16.11 requires create, list, rotate-secret, and delete interfaces.`,
      path: base,
    },
  ];
}
