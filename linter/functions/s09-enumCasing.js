import { walkSchema } from './lib/schemaWalk.js';
import { isObject, toRegExp } from './lib/util.js';

/**
 * s09-enumCasing — PROXY for §9.7 (SCREAMING_SNAKE_CASE enum values). Flags
 * string `enum` members that are not SCREAMING_SNAKE_CASE, minus the carve-outs
 * §9.7 lists for values whose form is fixed by another rule or an external
 * standard:
 *
 *   - BCP 47 language tags and reverse-DNS identifiers (error codes, event
 *     types), matched by `allowPattern`;
 *   - the health-status vocabulary and the GovStack x-govstack-* extension
 *     vocabularies, listed in `allowValues`.
 *
 * Because those exceptions are pattern-based, a lowercase enum that merely looks
 * ISO-like (any 2-3 letter token) is not flagged: the proxy trades a few misses
 * for far fewer false positives. Non-string enum members are ignored.
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
 *   allowValues  {string[]} literal always-allowed values (default health vocab).
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const SCREAMING = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
// Two shapes §9.7 carves out and that are distinguishable from a mis-cased
// state name: BCP 47 language tags (§10.9) and reverse-DNS identifiers built to
// a shape this guide defines (error codes §11.5, event types §16.3).
const DEFAULT_ALLOW_PATTERN =
  '^([a-z]{2,3}([-_][A-Za-z0-9]{2,8})*|[a-z][a-zA-Z0-9]*(\\.[a-zA-Z0-9-]+)+)$';
const DEFAULT_ALLOW_VALUES = [
  // §5.9 health-status vocabulary and the operational synonyms around it.
  'pass',
  'fail',
  'warn',
  'ok',
  'up',
  'down',
  'healthy',
  'unhealthy',
  'degraded',
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
