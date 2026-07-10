/**
 * Small shared helpers for the GovStack Spectral custom functions.
 *
 * These live in functions/lib/ and are NOT Spectral functions themselves.
 * Spectral only loads the modules named in a ruleset's `functions:` array, so
 * files in lib/ are safe to keep next to the function modules: they are only
 * ever pulled in via relative `import` from a function module, and the bundler
 * resolves them.
 */

/** True for a plain (non-null, non-array) object. */
export function isObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** True for a non-empty string. */
export function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

/** Coerce to array: array stays, undefined/null -> [], scalar -> [scalar]. */
export function asArray(v) {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  return [v];
}

/**
 * Build a RegExp from a string pattern (or return an existing RegExp).
 * Returns undefined on invalid input rather than throwing, so callers can
 * bail defensively.
 * @param {string|RegExp} pattern
 * @param {string} [flags]
 * @returns {RegExp|undefined}
 */
export function toRegExp(pattern, flags) {
  if (pattern instanceof RegExp) return pattern;
  if (typeof pattern !== 'string' || pattern.length === 0) return undefined;
  try {
    return new RegExp(pattern, flags);
  } catch {
    return undefined;
  }
}

/**
 * Expand an HTTP status matcher into a predicate over status-code keys.
 * Accepts:
 *   - "2xx" / "4XX" / "1xx"      -> class match on the leading digit
 *   - "default"                  -> matches the literal "default" response key
 *   - an exact code "201"        -> exact match
 *   - any other string           -> treated as an anchored regex
 * @param {string} matcher
 * @returns {(statusKey: string) => boolean}
 */
export function statusMatcher(matcher) {
  if (typeof matcher !== 'string' || matcher.length === 0) return () => false;
  const m = matcher.toLowerCase();
  if (/^[1-5]xx$/.test(m)) {
    const cls = m[0];
    return (key) => typeof key === 'string' && key[0] === cls && /^\d{3}$/.test(key);
  }
  if (m === 'default') return (key) => key === 'default';
  if (/^\d{3}$/.test(m)) return (key) => key === m;
  const re = toRegExp(`^(?:${matcher})$`);
  return re ? (key) => typeof key === 'string' && re.test(key) : () => false;
}

/** SemVer 2.0.0 core + optional pre-release/build, as used across the guide. */
export const SEMVER_PATTERN =
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
  '(?:-((?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*))*))?' +
  '(?:\\+([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?$';
