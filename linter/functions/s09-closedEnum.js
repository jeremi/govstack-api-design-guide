import { walkSchema } from './lib/schemaWalk.js';
import { isObject } from './lib/util.js';

/**
 * s09-closedEnum — PROXY for §9.9 (no closed enums for growing sets). Flags
 * every closed string `enum` that offers no forward-compatibility escape hatch,
 * i.e. that has neither an `x-extensible-enum` annotation nor a catch-all
 * fallback member (UNKNOWN / OTHER / UNSPECIFIED).
 *
 * It CANNOT tell whether a value set is "expected to grow", so it also flags
 * truly-fixed enums (ISO codes, etc.) that §9.9 explicitly permits — hence this
 * is an info-level proxy the reviewer must judge, not a hard error.
 *
 * `given` should select a schema (e.g. `$.components.schemas[*]`). Cycle-safe.
 *
 * options:
 *   fallbackMembers {string[]} enum members that count as a fallback
 *                              (default UNKNOWN/OTHER/UNSPECIFIED, case-insensitive).
 *   extensionKey    {string}   annotation that opts an enum out (default
 *                              "x-extensible-enum").
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const DEFAULT_FALLBACKS = ['UNKNOWN', 'OTHER', 'UNSPECIFIED'];

export default function s09ClosedEnum(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const fallbacks = new Set(
    (Array.isArray(opts.fallbackMembers) ? opts.fallbackMembers : DEFAULT_FALLBACKS).map((s) =>
      String(s).toLowerCase(),
    ),
  );
  const extKey = typeof opts.extensionKey === 'string' ? opts.extensionKey : 'x-extensible-enum';
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  walkSchema(targetVal, (node, path) => {
    if (!Array.isArray(node.enum) || node.enum.length === 0) return;
    if (!node.enum.every((v) => typeof v === 'string')) return; // only string enums grow
    if (node[extKey] !== undefined) return; // annotated open enum
    if (node.enum.some((v) => fallbacks.has(v.toLowerCase()))) return; // has a fallback member
    results.push({
      message:
        `closed enum ${JSON.stringify(node.enum)} has no x-extensible-enum annotation and no ` +
        `UNKNOWN/OTHER fallback member; if this value set may grow, open it (§9.9). Truly-fixed sets may ignore.`,
      path: [...base, ...path, 'enum'],
    });
  });

  return results.length ? results : undefined;
}
