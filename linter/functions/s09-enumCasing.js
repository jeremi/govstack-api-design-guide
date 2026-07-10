import { walkSchema } from './lib/schemaWalk.js';
import { isObject, toRegExp } from './lib/util.js';

/**
 * s09-enumCasing — PROXY for §9.7 (SCREAMING_SNAKE_CASE enum values). Flags
 * string `enum` members that are not SCREAMING_SNAKE_CASE, with documented
 * exceptions for values that idiomatically stay lowercase:
 *
 *   - ISO-style short codes / locales (language `en`, `fra`, locale `en-US`),
 *     matched by `allowPattern`;
 *   - health / status vocab (`pass`, `fail`, `warn`, `up`, `down`, ...), listed
 *     in `allowValues`.
 *
 * Because those exceptions are pattern-based, a lowercase enum that merely looks
 * ISO-like (any 2-3 letter token) is not flagged: the proxy trades a few misses
 * for far fewer false positives. Non-string enum members are ignored.
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
const DEFAULT_ALLOW_PATTERN = '^[a-z]{2,3}([-_][A-Za-z0-9]{2,4})?$';
const DEFAULT_ALLOW_VALUES = [
  'pass',
  'fail',
  'warn',
  'ok',
  'up',
  'down',
  'healthy',
  'unhealthy',
  'degraded',
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
