/**
 * The guide §5.10 closed set of standard unversioned endpoints: paths whose
 * location or spelling is fixed by something other than this guide, and which
 * are therefore exempt from §5.1 (version prefix), §5.3 (kebab-case segments),
 * and the §12 collection rules.
 *
 * Kept in one place because four rulesets need the same answer; changing the
 * set means changing guide §5.10 first.
 */

// Exact path keys: the §5.9 operational endpoints and the conventional runtime
// specification-discovery endpoints.
const EXACT = new Set(['/health', '/ready', '/openapi.json', '/asyncapi.json']);

// RFC 8615 roots every well-known URI at this exact prefix, so a well-known
// path cannot be moved under /v{N}/ without ceasing to be one.
const WELL_KNOWN_PREFIX = '/.well-known/';

/**
 * @param {unknown} pathKey - an OpenAPI `paths` key.
 * @returns {boolean} true when the path is in the guide §5.10 set.
 */
export function isStandardUnversionedPath(pathKey) {
  if (typeof pathKey !== 'string') return false;
  return EXACT.has(pathKey) || pathKey.startsWith(WELL_KNOWN_PREFIX);
}
