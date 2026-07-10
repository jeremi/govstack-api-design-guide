import { isObject, isNonEmptyString } from './lib/util.js';

/**
 * s17-opExtensions — presence (and optional enum) of the machine-readable
 * GovStack delivery-semantics extensions on an AsyncAPI operation, plus an
 * optional human-readable `description` requirement.
 *
 * Drives:
 *   §17.13 — the four delivery-management capabilities, each stated as
 *            supported / unsupported / notApplicable:
 *            require: [x-govstack-redelivery, x-govstack-dead-letter,
 *                      x-govstack-retention, x-govstack-replay]
 *            enumEach: [supported, unsupported, notApplicable]
 *   §17.15 — the headline machine-readable extensions plus a description:
 *            require: [x-govstack-delivery, x-govstack-ordering, x-govstack-replay]
 *            requireDescription: true
 *
 * Given: a single AsyncAPI 3.0 operation object (`$.operations[*]`).
 *
 * A required extension's value satisfies `enumEach` when it is a string in the
 * enum, or an object whose `status` (or `support`) field is in the enum — so the
 * exact common-file value shape (bare string vs `{status: ...}`) is tolerated.
 *
 * options:
 *   require {string[]} extension keys that must be present. (required)
 *   enumEach {any[]}   allowed value/status for each required extension.
 *   requireDescription {boolean} operation must carry a non-empty `description`.
 *
 * @param {unknown} targetVal - an operation object.
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17OpExtensions(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(options)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const require = Array.isArray(options.require) ? options.require : [];
  const enumEach = Array.isArray(options.enumEach) ? options.enumEach : undefined;
  const results = [];

  for (const key of require) {
    if (typeof key !== 'string' || !key) continue;
    if (!Object.prototype.hasOwnProperty.call(targetVal, key)) {
      results.push({ message: `operation must declare "${key}"`, path: [...base] });
      continue;
    }
    if (enumEach) {
      const raw = targetVal[key];
      const effective = isObject(raw) ? (raw.status !== undefined ? raw.status : raw.support) : raw;
      if (!enumEach.includes(effective)) {
        results.push({
          message: `operation "${key}" must be one of ${JSON.stringify(enumEach)}`,
          path: [...base, key],
        });
      }
    }
  }

  if (options.requireDescription === true && !isNonEmptyString(targetVal.description)) {
    results.push({
      message: 'operation must also document delivery/ordering/replay semantics in a non-empty "description"',
      path: [...base, 'description'],
    });
  }

  return results.length ? results : undefined;
}
