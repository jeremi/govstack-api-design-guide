import { isObject, isNonEmptyString } from './lib/util.js';

/**
 * s17-channelParameters — §17.4 declared channel parameters.
 *
 * Given: a single AsyncAPI 3.0 channel object (`$.channels[*]`).
 *
 * For every `{param}` token that appears in the channel `address`, asserts:
 *   - the parameter is declared under the channel `parameters` object, and
 *   - the declared parameter documents its routing semantics via a non-empty
 *     `description`.
 *
 * Note on "schema": the AsyncAPI 3.0 Parameter Object has no `schema` field
 * (unlike AsyncAPI 2.x); a parameter's allowed values are expressed with `enum`.
 * The guide's "its schema ... MUST be documented" is therefore proxied here by
 * requiring a non-empty `description`; the value grammar is not further checked.
 *
 * options: none.
 * @param {unknown} targetVal - a channel object.
 * @param {object} _options
 * @param {{path?: (string|number)[]}} [context]
 * @returns {{message:string, path:(string|number)[]}[]|undefined}
 */
export default function s17ChannelParameters(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const address = targetVal.address;
  if (!isNonEmptyString(address)) return; // no address to parse
  const base = context && Array.isArray(context.path) ? context.path : [];
  const params = isObject(targetVal.parameters) ? targetVal.parameters : undefined;
  const results = [];

  const seen = new Set();
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(address)) !== null) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);

    if (!params || !Object.prototype.hasOwnProperty.call(params, name)) {
      results.push({
        message: `channel parameter "${name}" used in address "${address}" must be declared under the channel "parameters" object`,
        path: [...base, 'parameters'],
      });
      continue;
    }
    const def = params[name];
    if (!isObject(def) || !isNonEmptyString(def.description)) {
      results.push({
        message: `channel parameter "${name}" must document its schema and routing semantics via a non-empty "description"`,
        path: [...base, 'parameters', name],
      });
    }
  }

  return results.length ? results : undefined;
}
