import { isObject } from './lib/util.js';
import { resourcePath, isPathParameter } from './lib/resourcePaths.js';

const VERSION_SEG = /^v\d+$/;
const CRUD_VERBS = [
  'get', 'create', 'new', 'add', 'update', 'edit', 'modify', 'delete', 'remove',
  'fetch', 'retrieve', 'list', 'set',
];

/** Strict-only lexical proxy for §5.7: CRUD verbs belong in HTTP methods.
 * Check both ordinary path leaves and colon custom-method suffixes. Domain
 * actions, including collection search, may use either shape under §5.8.
 * This cannot decide whether a verb describes CRUD or domain-specific work;
 * the fixed dictionary can over- or under-report and requires review.
 * Given: $.paths. Options: verbs {string[]} additional CRUD-like verbs.
 */
export default function actionVerbSegment(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const verbs = new Set([
    ...CRUD_VERBS,
    ...(Array.isArray(opts.verbs) ? opts.verbs.map((v) => String(v).toLowerCase()) : []),
  ]);
  const results = [];
  for (const key of Object.keys(targetVal)) {
    if (!key.startsWith('/')) continue;
    const { segments, customMethod } = resourcePath(key);
    const leaf = customMethod ?? segments.at(-1);
    if (!leaf || isPathParameter(leaf) || VERSION_SEG.test(leaf)) continue;
    const words = leaf.replace(/([a-z0-9])([A-Z])/g, '$1-$2').split('-');
    if (!words.some((word) => verbs.has(word.toLowerCase()))) continue;
    results.push({
      message: `path "${key}" contains CRUD-like verb "${leaf}"; use the HTTP method for CRUD operations`,
      path: [...base, key],
    });
  }
  return results.length ? results : undefined;
}
