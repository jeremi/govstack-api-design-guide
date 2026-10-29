import { isObject } from './lib/util.js';
import { pathSegmentsOf, isPathParameter as isParam } from './lib/resourcePaths.js';
import { isStandardUnversionedPath } from './lib/standardEndpoints.js';

const VERSION_SEG = /^v\d+$/;

/**
 * pluralSegment — STRICT-ONLY heuristic: every non-version, non-parameter
 * path segment should "look plural" (guide 5.2). Purely lexical: a segment
 * looks plural if its last kebab-case word ends in "s", or the whole segment
 * is listed in `irregularPlurals`. `exceptions` allow-lists literal segment
 * names that other guide rules already sanction as singular (e.g.
 * "health"/"ready" per 5.10) so callers can quiet expected non-noise.
 * `actionLeaves` names action sub-resources (5.8) that are accepted only as
 * the final segment of a path, so `/v1/events/search` passes while
 * `/v1/search/events` is still checked. Other action leaves (for example
 * `cancel`) are reported unless configured. The guide 5.10 standard
 * unversioned endpoints (for example `/.well-known/api-catalog`) are skipped:
 * their spelling is fixed elsewhere.
 *
 * This has no morphological understanding of English: it accepts non-plural
 * words that happen to end in "s" (e.g. "status") and flags legitimate
 * singular segments not covered by `exceptions`/`irregularPlurals`.
 *
 * Given: $.paths
 * Options:
 *   exceptions {string[]} literal segment names (case-insensitive) allowed
 *     to stay singular.
 *   irregularPlurals {string[]} extra accepted plural forms not ending in
 *     "s" (e.g. "children", "people").
 *   actionLeaves {string[]} action sub-resource names (case-insensitive)
 *     allowed as the final path segment only.
 *
 * @param {unknown} targetVal - the paths object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function pluralSegment(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = options && typeof options === 'object' ? options : {};
  const base = context && Array.isArray(context.path) ? context.path : [];
  const exceptions = new Set(
    (Array.isArray(opts.exceptions) ? opts.exceptions : []).map((s) => String(s).toLowerCase()),
  );
  const irregular = new Set(
    (Array.isArray(opts.irregularPlurals) ? opts.irregularPlurals : []).map((s) => String(s).toLowerCase()),
  );
  const actionLeaves = new Set(
    (Array.isArray(opts.actionLeaves) ? opts.actionLeaves : []).map((s) => String(s).toLowerCase()),
  );
  const results = [];

  for (const key of Object.keys(targetVal)) {
    if (typeof key !== 'string' || !key.startsWith('/')) continue;
    if (isStandardUnversionedPath(key)) continue;
    const segs = pathSegmentsOf(key);
    for (const [index, seg] of segs.entries()) {
      if (isParam(seg) || VERSION_SEG.test(seg)) continue;
      const lower = seg.toLowerCase();
      if (exceptions.has(lower) || irregular.has(lower)) continue;
      if (index === segs.length - 1 && actionLeaves.has(lower)) continue;
      const words = seg.split('-');
      const lastWord = words[words.length - 1];
      if (!lastWord.toLowerCase().endsWith('s')) {
        results.push({
          message: `path "${key}" segment "${seg}" should be a plural noun`,
          path: [...base, key],
        });
      }
    }
  }

  return results.length ? results : undefined;
}
