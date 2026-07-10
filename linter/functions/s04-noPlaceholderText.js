import { isObject } from './lib/util.js';

// guide 4.3: "TBD", "Lorem ipsum", and the literal placeholder list "a, b, c"
// are the three mechanically-scannable forms of placeholder text. Cross-BB
// name leakage and placeholder test-plan steps are NOT scanned: they need an
// external list of BB names / test-plan conventions this function doesn't have.
const DEFAULT_PATTERNS = [
  { name: 'TBD', regex: /\bTBD\b/ },
  { name: 'Lorem ipsum', regex: /lorem\s+ipsum/i },
  { name: 'placeholder list "a, b, c"', regex: /\ba\s*,\s*b\s*,\s*c\b/i },
];

/**
 * noPlaceholderText — guide 4.3 (proxy): recursively scans every string value
 * in the given node for placeholder text (TBD / Lorem ipsum / "a, b, c").
 * Does NOT check for content copy-pasted from another BB with that BB's name
 * still present, or test plans with literal placeholder steps - both need
 * context this function doesn't have access to.
 *
 * `given` should be `$` (the whole document): placeholder text can appear in
 * any string (descriptions, summaries, examples, titles, ...), not just
 * schemas, so this walks generically rather than via the schema-keyword-aware
 * walker.
 *
 * @param {unknown} targetVal - any value; the root document in practice.
 * @param {object} options - unused.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function noPlaceholderText(targetVal, options, context) {
  if (targetVal === undefined || targetVal === null) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];
  const seen = new WeakSet();

  const visit = (node, path) => {
    if (typeof node === 'string') {
      for (const { name, regex } of DEFAULT_PATTERNS) {
        if (regex.test(node)) {
          results.push({
            message: `placeholder text (${name}) found: remove or replace with real content`,
            path: [...base, ...path],
          });
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      if (seen.has(node)) return;
      seen.add(node);
      node.forEach((child, i) => visit(child, [...path, i]));
      return;
    }
    if (isObject(node)) {
      if (seen.has(node)) return;
      seen.add(node);
      for (const key of Object.keys(node)) visit(node[key], [...path, key]);
    }
  };

  visit(targetVal, []);
  return results.length ? results : undefined;
}
