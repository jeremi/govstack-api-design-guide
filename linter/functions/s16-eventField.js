import { isObject, toRegExp } from './lib/util.js';

/**
 * s16-eventField — inspect a named property of a CloudEvents envelope schema
 * and assert its *pinned literal value(s)* satisfy / violate a pattern.
 *
 * Drives the §16 event-type (16.3) and stable-source (16.4) checks. The event
 * `type` and `source` are ordinarily pinned on the envelope schema via `const`,
 * `enum`, `default`, `example` or `examples`; this function locates the named
 * property (merging one level of top-level `allOf`, the same limitation as
 * envelopeShape), gathers those pinned string values, and tests each one.
 *
 * A free-form property (no pinned value) cannot be checked here and is left
 * clean — presence of the property itself is enforced by §16.2 (envelopeShape).
 *
 * `given` should select the envelope schema, e.g.
 *   $.webhooks[*][post].requestBody.content[*].schema
 *
 * Options:
 *   property {string}       (required) property name to inspect ("type", "source").
 *   match {string}          regex string; every pinned value MUST match it.
 *   forbidPattern {string}  regex string; no pinned value may match it.
 *   forbidSegments {string} regex string; no dot-separated segment may match it
 *                           (used to reject a version segment in an event type).
 *   sources {string[]}      value keywords to gather (default ["const","enum"]).
 *   flags {string}          regex flags applied to match/forbid patterns.
 *   name {string}           label used in messages (default = property).
 *   expected {string}       human description of the expected/forbidden state.
 *
 * @param {unknown} targetVal - a JSON Schema (the envelope schema).
 * @param {object} options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function eventField(targetVal, options, context) {
  if (!isObject(targetVal) || !isObject(options)) return;
  const property = options.property;
  if (typeof property !== 'string' || property.length === 0) return;

  const base = context && Array.isArray(context.path) ? context.path : [];
  const name = typeof options.name === 'string' ? options.name : property;
  const expected = typeof options.expected === 'string' ? options.expected : undefined;

  const prop = findProperty(targetVal, property);
  if (!isObject(prop)) return; // property not declared — §16.2 covers presence

  const values = gatherValues(prop, options.sources);
  if (values.length === 0) return; // no pinned value to check

  const matchRe = toRegExp(options.match, options.flags);
  const forbidRe = toRegExp(options.forbidPattern, options.flags);
  const forbidSegRe = toRegExp(options.forbidSegments, options.flags);

  const path = [...base, 'properties', property];
  const results = [];
  for (const value of values) {
    if (matchRe && !matchRe.test(value)) {
      results.push({
        message: `${name} "${value}" is not valid; expected ${expected || `it to match ${options.match}`}.`,
        path,
      });
    }
    if (forbidRe && forbidRe.test(value)) {
      results.push({
        message: `${name} "${value}" is not stable; ${expected || 'it must not contain a forbidden token'}.`,
        path,
      });
    }
    if (forbidSegRe) {
      for (const seg of value.split('.')) {
        if (forbidSegRe.test(seg)) {
          results.push({
            message: `${name} "${value}" must not contain a version segment ("${seg}"); ${expected || 'the version belongs in the channel address, not the event type'}.`,
            path,
          });
          break;
        }
      }
    }
  }
  return results.length ? results : undefined;
}

/** Locate a property in a schema, merging one level of top-level allOf. */
function findProperty(schema, name) {
  if (isObject(schema.properties) && isObject(schema.properties[name])) {
    return schema.properties[name];
  }
  if (Array.isArray(schema.allOf)) {
    for (const branch of schema.allOf) {
      if (isObject(branch) && isObject(branch.properties) && isObject(branch.properties[name])) {
        return branch.properties[name];
      }
    }
  }
  return undefined;
}

/** Collect pinned string values from a property schema's value keywords. */
function gatherValues(prop, sources) {
  const keys = Array.isArray(sources) && sources.length ? sources : ['const', 'enum'];
  const out = [];
  for (const key of keys) {
    const v = prop[key];
    if (v === undefined) continue;
    if (key === 'enum' || key === 'examples') {
      if (Array.isArray(v)) for (const item of v) if (typeof item === 'string') out.push(item);
    } else if (typeof v === 'string') {
      out.push(v);
    }
  }
  return out;
}
