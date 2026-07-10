import { isObject } from './lib/util.js';

/**
 * s09-bbCode — PROXY for §9.11 (single registered BB code), IN-DOCUMENT scope
 * only. Extracts BB-code segments from the identifier namespaces the guide
 * defines and checks two things within one document:
 *
 *   1. every extracted BB code matches `^[a-z][a-z0-9-]{1,30}$`;
 *   2. all extracted BB codes are identical (the same BB uses one code across
 *      OAuth scopes, error codes, event types and channel addresses).
 *
 * Extraction runs over every object key and string value (skipping free-text
 * prose keys) using the two documented shapes:
 *   - OAuth scope:   `bb:{bb-code}:{resource}:{action}`
 *   - reverse-DNS:   `org.govstack.{bb-code}....` (error codes, event types,
 *                    channel addresses, problem-type URIs)
 * The segment `common` is reserved (§11.7) and excluded from the identity check.
 *
 * It does NOT verify ecosystem-wide uniqueness of the BB code — that needs the
 * cross-repo BB-code register (Appendix A), which is out of scope here.
 *
 * `given` should be `$` (the whole document). Cycle-safe.
 *
 * options:
 *   skipKeys {string[]} object keys whose string values are prose and skipped
 *                       (default description/summary/title/externalDocs).
 *
 * @param {unknown} targetVal - the document root.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const SCOPE_RE = /^bb:([^:\s]+):/;
const RDNS_RE = /org\.govstack\.([^.\s]+)\./gi;
const BB_CODE_RE = /^[a-z][a-z0-9-]{1,30}$/;
const RESERVED = 'common';
const DEFAULT_SKIP_KEYS = ['description', 'summary', 'title', 'externalDocs'];

function truncate(s) {
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

export default function s09BbCode(targetVal, options, context) {
  if (!isObject(targetVal) && !Array.isArray(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const skipKeys = new Set(
    Array.isArray(opts.skipKeys) ? opts.skipKeys.map(String) : DEFAULT_SKIP_KEYS,
  );
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];
  const seen = new WeakSet();
  const codes = new Map(); // valid, non-reserved code -> first path seen

  const consider = (str, path) => {
    if (typeof str !== 'string' || str.length === 0) return;
    const raw = [];
    const scope = SCOPE_RE.exec(str);
    if (scope) raw.push(scope[1]);
    RDNS_RE.lastIndex = 0;
    let m;
    while ((m = RDNS_RE.exec(str)) !== null) raw.push(m[1]);

    for (const code of raw) {
      if (!BB_CODE_RE.test(code)) {
        results.push({
          message: `BB code "${code}" in "${truncate(str)}" must match ^[a-z][a-z0-9-]{1,30}$ (§9.11)`,
          path,
        });
        continue;
      }
      if (code === RESERVED) continue;
      if (!codes.has(code)) codes.set(code, path);
    }
  };

  const walk = (node, path) => {
    if (typeof node === 'string') {
      consider(node, path);
      return;
    }
    if (Array.isArray(node)) {
      if (seen.has(node)) return;
      seen.add(node);
      node.forEach((item, i) => walk(item, [...path, i]));
      return;
    }
    if (!isObject(node) || seen.has(node)) return;
    seen.add(node);
    for (const key of Object.keys(node)) {
      consider(key, [...path, key]); // scope strings / addresses can be map keys
      if (skipKeys.has(key)) continue; // skip prose values
      walk(node[key], [...path, key]);
    }
  };

  walk(targetVal, base);

  if (codes.size > 1) {
    const list = [...codes.keys()];
    results.push({
      message:
        `document uses ${codes.size} distinct BB codes (${list.join(', ')}); a BB must use its single ` +
        `registered code identically across error codes, scopes, event types and channel addresses (§9.11)`,
      path: base,
    });
  }

  return results.length ? results : undefined;
}
