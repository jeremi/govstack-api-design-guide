import { isObject } from './lib/util.js';

/**
 * s09-extensionPrefix — STRICT proxy for §9.10 (GovStack extension prefix).
 * Walks the whole document and flags specification extensions (`x-*` keys) that
 * look GovStack-defined but are not prefixed exactly `x-govstack-`:
 *
 *   1. an `x-<token>` whose token is a known GovStack extension concept
 *      (delivery, ordering, replay, deprecated, api-guide) -> should be
 *      `x-govstack-<token>`;
 *   2. any `x-*` key that mentions "govstack" but is not prefixed
 *      `x-govstack-` (typos / wrong casing / wrong separator).
 *
 * It is weak: it cannot know the full set of GovStack-defined extensions, so it
 * misses GovStack extensions with unknown names, and cannot tell a legitimate
 * third-party `x-` extension from a GovStack one. Ships only in strict.
 *
 * `given` should be `$` (the whole document). Cycle-safe.
 *
 * options:
 *   knownExtensions {string[]} known GovStack extension tokens (suffix after
 *                              `x-govstack-`), replacing the default list.
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const DEFAULT_KNOWN = ['delivery', 'ordering', 'replay', 'deprecated', 'api-guide'];

export default function s09ExtensionPrefix(targetVal, options, context) {
  if (!isObject(targetVal) && !Array.isArray(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const known = new Set(
    (Array.isArray(opts.knownExtensions) ? opts.knownExtensions : DEFAULT_KNOWN).map(String),
  );
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];
  const seen = new WeakSet();

  const walk = (node, path) => {
    if (Array.isArray(node)) {
      if (seen.has(node)) return;
      seen.add(node);
      node.forEach((item, i) => {
        if (isObject(item) || Array.isArray(item)) walk(item, [...path, i]);
      });
      return;
    }
    if (!isObject(node) || seen.has(node)) return;
    seen.add(node);
    for (const key of Object.keys(node)) {
      if (key.startsWith('x-')) {
        const isGovstack = /^x-govstack-/.test(key);
        const token = key.slice(2); // strip leading "x-"
        if (!isGovstack && known.has(token)) {
          results.push({
            message: `extension "${key}" names a GovStack-defined concept but lacks the prefix; use "x-govstack-${token}"`,
            path: [...base, ...path, key],
          });
        } else if (!isGovstack && /govstack/i.test(key)) {
          results.push({
            message: `extension "${key}" references GovStack but is not prefixed exactly "x-govstack-"`,
            path: [...base, ...path, key],
          });
        }
      }
      const child = node[key];
      if (isObject(child) || Array.isArray(child)) walk(child, [...path, key]);
    }
  };

  walk(targetVal, []);
  return results.length ? results : undefined;
}
