import { isObject, asArray } from './lib/util.js';

/**
 * s11-fieldErrors — validate the shape of a field-level `errors` extension
 * only when a problem schema actually declares that extension.
 *
 * This deliberately does not infer that every 400 response is a validation
 * problem. Whether a failure is attributable to request fields is semantic;
 * the linter only verifies the declared shape once a schema opts in.
 *
 * One level of `allOf` composition is inspected, matching envelopeShape's
 * resolved-schema behaviour. Spectral resolves external references before
 * invoking the function.
 */
function effective(schema) {
  const required = new Set(asArray(schema.required).filter((name) => typeof name === 'string'));
  const properties = isObject(schema.properties) ? { ...schema.properties } : {};
  for (const branch of asArray(schema.allOf)) {
    if (!isObject(branch)) continue;
    for (const name of asArray(branch.required)) {
      if (typeof name === 'string') required.add(name);
    }
    if (isObject(branch.properties)) Object.assign(properties, branch.properties);
  }
  return { required, properties };
}

export default function s11FieldErrors(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const problem = effective(targetVal);
  const errors = problem.properties.errors;
  if (!isObject(errors)) return;

  const results = [];
  if (!problem.required.has('errors')) {
    results.push({
      message: 'a declared field-level errors array must be required',
      path: [...base, 'required'],
    });
  }
  if (errors.type !== 'array') {
    results.push({
      message: 'field-level errors must be an array',
      path: [...base, 'properties', 'errors', 'type'],
    });
    return results;
  }
  if (!isObject(errors.items)) {
    results.push({
      message: 'field-level errors must declare an item schema',
      path: [...base, 'properties', 'errors', 'items'],
    });
    return results;
  }

  const item = effective(errors.items);
  if (Object.prototype.hasOwnProperty.call(item.properties, 'code')) {
    results.push({
      message: 'field-error items must not declare "code"',
      path: [...base, 'properties', 'errors', 'items', 'properties', 'code'],
    });
  }
  for (const name of ['pointer', 'message']) {
    if (!item.required.has(name)) {
      results.push({
        message: `field-error items must require "${name}"`,
        path: [...base, 'properties', 'errors', 'items', 'required'],
      });
    }
    if (!isObject(item.properties[name])) {
      results.push({
        message: `field-error items must declare "${name}"`,
        path: [...base, 'properties', 'errors', 'items', 'properties'],
      });
    }
  }
  return results.length ? results : undefined;
}
