import { forEachProperty } from './lib/schemaWalk.js';
import { isObject } from './lib/util.js';

/**
 * s09-abbreviations — STRICT proxy for §9.6 (avoid abbreviations). Splits each
 * declared property name into words (camelCase / snake / kebab boundaries) and
 * flags any word that appears in an abbreviation dictionary, suggesting the
 * expansion. Deliberately noisy — ships only in the strict profile.
 *
 * `given` should select a schema (e.g. `$.components.schemas[*]`). Cycle-safe.
 *
 * options:
 *   abbreviations {object} map of abbreviation -> preferred word (lowercase
 *                          keys). Replaces the default dictionary when given.
 *
 * @param {unknown} targetVal - a JSON Schema.
 * @param {object} [options]
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
const DEFAULT_ABBREVIATIONS = {
  qty: 'quantity',
  amt: 'amount',
  num: 'number',
  nbr: 'number',
  addr: 'address',
  msg: 'message',
  desc: 'description',
  cfg: 'configuration',
  dob: 'dateOfBirth',
  tmp: 'temporary',
  txn: 'transaction',
  acct: 'account',
  cust: 'customer',
  dept: 'department',
  mgr: 'manager',
  pwd: 'password',
  usr: 'user',
  cnt: 'count',
  idx: 'index',
  fname: 'firstName',
  lname: 'lastName',
  pct: 'percent',
  attr: 'attribute',
  err: 'error',
};

function splitWords(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean);
}

export default function s09Abbreviations(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const opts = isObject(options) ? options : {};
  const dict = isObject(opts.abbreviations) ? opts.abbreviations : DEFAULT_ABBREVIATIONS;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  forEachProperty(targetVal, (name, _schema, path) => {
    for (const word of splitWords(name)) {
      const preferred = dict[word.toLowerCase()];
      if (preferred) {
        results.push({
          message: `field "${name}" uses abbreviation "${word}"; prefer "${preferred}" (§9.6)`,
          path: [...base, ...path],
        });
      }
    }
  });

  return results.length ? results : undefined;
}
