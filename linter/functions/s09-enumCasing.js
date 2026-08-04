import { walkSchema } from './lib/schemaWalk.js';
import { isObject, toRegExp } from './lib/util.js';

/**
 * s09-enumCasing — PROXY for §9.7 (SCREAMING_SNAKE_CASE enum values). Flags
 * string `enum` members that are not SCREAMING_SNAKE_CASE, minus the carve-outs
 * §9.7 lists for values whose form is fixed by another rule or an external
 * standard:
 *
 *   - BCP 47 language tags, reverse-DNS identifiers (error codes, event types),
 *     and media types, matched by `allowPattern`;
 *   - the GovStack x-govstack-* extension vocabularies and the JOSE/COSE
 *     algorithm and curve names that are not already SCREAMING_SNAKE_CASE,
 *     listed in `allowValues`.
 *
 * Because those exceptions are pattern-based, a lowercase enum that merely looks
 * ISO-like (any 2-3 letter token) is not flagged: the proxy trades a few misses
 * for far fewer false positives. Non-string enum members are ignored.
 *
 * §9.7 exempts "values registered in an IANA registry", which no document linter
 * can decide: registry membership is not visible in the spec. The literal list
 * below covers the JOSE/COSE names the guide names and the neighbours an API is
 * likely to declare beside them; a registered value outside it is a miss, and
 * the fix is to add it here rather than to re-case the value.
 *
 * Known false positive: §12.7 sort keys are field names in lowerCamelCase, which
 * is indistinguishable from a mis-cased state name, so a sort-key enum declared
 * under components.schemas is flagged. Inline sort parameters are not visited.
 *
 * `given` should select a schema (e.g. `$.components.schemas[*]`). Cycle-safe.
 *
 * options:
 *   pattern      {string} regex an enum value MUST match (default SCREAMING_SNAKE).
 *   allowPattern {string} regex of always-allowed values (default ISO-ish codes).
 *   allowValues  {string[]} literal always-allowed values (default: the
 *                           x-govstack-* and JOSE/COSE vocabularies below).
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const SCREAMING = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
// Three shapes §9.7 carves out and that are distinguishable from a mis-cased
// state name: BCP 47 language tags (§10.9), reverse-DNS identifiers built to a
// shape this guide defines (error codes §11.5, event types §16.3), and IANA
// media types.
const DEFAULT_ALLOW_PATTERN =
  '^([a-z]{2,3}([-_][A-Za-z0-9]{2,8})*|[a-z][a-zA-Z0-9]*(\\.[a-zA-Z0-9-]+)+|[a-z]+/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*)$';
const DEFAULT_ALLOW_VALUES = [
  // JOSE/COSE algorithm and curve names (§9.7) that are not already
  // SCREAMING_SNAKE_CASE. The all-caps ones (ES256, RS256, HS256, A128GCM …)
  // satisfy the default pattern and need no entry.
  'EdDSA',
  'Ed25519',
  'Ed448',
  'X25519',
  'X448',
  'P-256',
  'P-384',
  'P-521',
  'secp256k1',
  'ECDH-ES',
  // §17.11 delivery guarantees.
  'atMostOnce',
  'atLeastOnce',
  'effectivelyOnce',
  // §17.13 delivery-management capabilities, and §17.12's explicit "no ordering".
  'supported',
  'unsupported',
  'notApplicable',
  'none',
];

export default function s09EnumCasing(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const pattern = (opts.pattern && toRegExp(opts.pattern)) || SCREAMING;
  const allowRe =
    opts.allowPattern !== undefined ? toRegExp(opts.allowPattern) : toRegExp(DEFAULT_ALLOW_PATTERN);
  const allowValues = new Set(
    (Array.isArray(opts.allowValues) ? opts.allowValues : DEFAULT_ALLOW_VALUES).map(String),
  );
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  walkSchema(targetVal, (node, path) => {
    if (!Array.isArray(node.enum)) return;
    node.enum.forEach((value, i) => {
      if (typeof value !== 'string' || value.length === 0) return;
      if (pattern.test(value)) return;
      if (allowValues.has(value)) return;
      if (allowRe && allowRe.test(value)) return;
      results.push({
        message: `enum value "${value}" must be SCREAMING_SNAKE_CASE (e.g. ACTIVE, PENDING_REVIEW)`,
        path: [...base, ...path, 'enum', i],
      });
    });
  });

  return results.length ? results : undefined;
}
