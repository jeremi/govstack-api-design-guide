import { isObject, asArray } from './lib/util.js';

const TYPE_RE = /^https:\/\/govstack\.global\/problems\/[a-z][a-z0-9-]{1,30}\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Validate literal RFC 9457 type values supplied with a problem response.
 * The shared schema carries the same pattern for runtime instance validation;
 * this function catches author-provided examples during normal Spectral lint.
 */
export default function s11ProblemType(targetVal, _options, context) {
  if (!isObject(targetVal)) return;
  const base = context && Array.isArray(context.path) ? context.path : [];
  const results = [];

  const check = (value, path) => {
    if (typeof value !== 'string' || !TYPE_RE.test(value)) {
      results.push({
        message:
          'problem type must match https://govstack.global/problems/{bb-code}/{kebab-problem-slug}',
        path,
      });
    }
  };

  if (isObject(targetVal.example) && 'type' in targetVal.example) {
    check(targetVal.example.type, [...base, 'example', 'type']);
  }
  if (isObject(targetVal.examples)) {
    for (const [name, example] of Object.entries(targetVal.examples)) {
      const value = isObject(example) && 'value' in example ? example.value : example;
      if (isObject(value) && 'type' in value) {
        check(value.type, [...base, 'examples', name, ...(isObject(example) && 'value' in example ? ['value'] : []), 'type']);
      }
    }
  }

  const schemas = [targetVal.schema, ...asArray(targetVal.schema?.allOf)].filter(isObject);
  for (const schema of schemas) {
    if (isObject(schema.example) && 'type' in schema.example) {
      check(schema.example.type, [...base, 'schema', 'example', 'type']);
    }
    for (const [index, example] of asArray(schema.examples).entries()) {
      if (isObject(example) && 'type' in example) {
        check(example.type, [...base, 'schema', 'examples', index, 'type']);
      }
    }
    const typeSchema = schema.properties?.type;
    if (isObject(typeSchema)) {
      if ('const' in typeSchema) check(typeSchema.const, [...base, 'schema', 'properties', 'type', 'const']);
      for (const [index, value] of asArray(typeSchema.enum).entries()) {
        check(value, [...base, 'schema', 'properties', 'type', 'enum', index]);
      }
      if ('example' in typeSchema) check(typeSchema.example, [...base, 'schema', 'properties', 'type', 'example']);
    }
  }

  return results.length ? results : undefined;
}
