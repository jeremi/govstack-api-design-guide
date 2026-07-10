import { isObject } from './lib/util.js';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * duplicateOperationDescriptions — STRICT-ONLY heuristic proxy for guide 4.4
 * ("operation `description` MUST describe what the operation actually
 * does"). Flags operation `description` strings that are byte-identical
 * (after trimming) across two or more distinct operations: a strong signal
 * of copy-paste that was never edited to match the operation it landed in
 * (the guide cites this exact failure mode). Does NOT verify that a
 * non-duplicated description is actually accurate for its operation - that
 * requires reading and understanding the operation's real behaviour.
 *
 * `given` should be `$` (the root document); both OpenAPI `paths` operations
 * and AsyncAPI `operations` are scanned so one rule covers either surface.
 *
 * @param {unknown} targetVal - the root document.
 * @param {object} options - unused.
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function duplicateOperationDescriptions(targetVal, options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const seen = new Map(); // trimmed description text -> [{ path, label }]

  const record = (description, path, label) => {
    if (typeof description !== 'string' || description.trim().length === 0) return;
    const key = description.trim();
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push({ path, label });
  };

  if (isObject(targetVal.paths)) {
    for (const [pathKey, pathItem] of Object.entries(targetVal.paths)) {
      if (!isObject(pathItem)) continue;
      for (const method of HTTP_METHODS) {
        const op = pathItem[method];
        if (isObject(op)) {
          record(op.description, [...base, 'paths', pathKey, method, 'description'], `${method.toUpperCase()} ${pathKey}`);
        }
      }
    }
  }

  if (isObject(targetVal.operations)) {
    for (const [opKey, op] of Object.entries(targetVal.operations)) {
      if (isObject(op)) record(op.description, [...base, 'operations', opKey, 'description'], opKey);
    }
  }

  const results = [];
  for (const [text, occurrences] of seen) {
    if (occurrences.length < 2) continue;
    for (const occ of occurrences) {
      const others = occurrences
        .filter((o) => o !== occ)
        .map((o) => o.label)
        .join(', ');
      const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
      results.push({
        message: `operation description is identical (copy-paste?) to ${others}: "${preview}"`,
        path: occ.path,
      });
    }
  }

  return results.length ? results : undefined;
}
