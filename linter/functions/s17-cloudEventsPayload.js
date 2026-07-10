import { isObject, asArray } from './lib/util.js';

const CE_REQUIRED = ['specversion', 'id', 'source', 'type', 'data'];

/**
 * s17-cloudEventsPayload — §17.6 structured CloudEvents JSON payloads.
 *
 * Given: a single AsyncAPI 3.0 message object (`$.components.messages[*]`).
 *
 * For domain-event messages, asserts the payload declares the structured
 * CloudEvents shape: `specversion` (const "1.0"), `id`, `source`, `type`, and
 * `data` (the GovStack-owned domain data). One level of top-level `allOf` is
 * merged so a message that composes the shared CloudEvents schema with a
 * specialised `data` still satisfies the check.
 *
 * Bare §11 error/rejection envelopes (payload declares problem fields
 * `title`+`status`, or `code`+`traceId`, and no `specversion`) are OUT of scope
 * here — they are governed by §17.16 — so they are skipped to avoid false
 * positives.
 *
 * options: none.
 * @param {unknown} targetVal - a message object.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17CloudEventsPayload(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const payload = targetVal.payload;
  if (!isObject(payload)) return; // no inline payload schema to inspect
  const base = context && Array.isArray(context.path) ? context.path : [];
  const { required, properties } = effective(payload);
  const declared = (n) => required.has(n) || properties[n] !== undefined;

  // Skip bare §11 error envelopes: they are not CloudEvents-shaped.
  const looksLikeError =
    !declared('specversion') &&
    ((declared('title') && declared('status')) ||
      (declared('code') && (declared('traceId') || declared('traceid'))));
  if (looksLikeError) return;

  const results = [];
  const at = [...base, 'payload'];
  for (const name of CE_REQUIRED) {
    if (!required.has(name)) {
      results.push({ message: `CloudEvents payload must list "${name}" in required`, path: [...at, 'required'] });
    }
  }
  const sv = properties.specversion;
  if (isObject(sv) && 'const' in sv && sv.const !== '1.0') {
    results.push({
      message: 'CloudEvents payload "specversion" must be declared with const "1.0"',
      path: [...at, 'properties', 'specversion', 'const'],
    });
  }
  return results.length ? results : undefined;
}

/** Merge a schema's own required/properties with one level of allOf branches. */
function effective(schema) {
  const required = new Set(asArray(schema.required).filter((s) => typeof s === 'string'));
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  for (const branch of asArray(schema.allOf)) {
    if (!isObject(branch)) continue;
    for (const r of asArray(branch.required)) if (typeof r === 'string') required.add(r);
    if (isObject(branch.properties)) {
      for (const [k, v] of Object.entries(branch.properties)) if (!(k in properties)) properties[k] = v;
    }
  }
  return { required, properties };
}
