/**
 * Casing predicates shared by the GovStack Spectral functions.
 *
 * Not a Spectral function; imported by function modules only.
 */

const PATTERNS = {
  // getThing, listUsers, pageSize (lower camel; digits allowed after first char)
  camel: /^[a-z][a-zA-Z0-9]*$/,
  // GetThing, ProblemDetails
  pascal: /^[A-Z][a-zA-Z0-9]*$/,
  // account-holders, merge-patch (lower kebab; digits allowed)
  kebab: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  // account_holder
  snake: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
  // ACCOUNT_CLOSED, PENDING
  screamingSnake: /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/,
  // alllowercase
  flat: /^[a-z][a-z0-9]*$/,
};

/** The casing type names this module understands. */
export const CASING_TYPES = Object.keys(PATTERNS);

/**
 * Does `name` conform to the given casing type?
 * Unknown types return false (fail closed); non-string input returns false.
 * @param {string} name
 * @param {keyof typeof PATTERNS} type
 * @returns {boolean}
 */
export function matchesCasing(name, type) {
  if (typeof name !== 'string') return false;
  const re = PATTERNS[type];
  return re ? re.test(name) : false;
}
