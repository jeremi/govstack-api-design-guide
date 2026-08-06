import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const goldenPath = path.join(here, 'golden/openapi-golden.yaml');
const commonPath = path.resolve(here, '../../../api/common/govstack-openapi-common.yaml');
const golden = YAML.parse(await readFile(goldenPath, 'utf8'));
const common = YAML.parse(await readFile(commonPath, 'utf8'));
const documents = new Map([
  [goldenPath, golden],
  [commonPath, common],
]);

const EXPECTED_COMMON_REFS = new Set(
  ['Problem', 'ValidationProblem', 'FieldError', 'PageInfo'].map(
    (name) => `../../../../api/common/govstack-openapi-common.yaml#/components/schemas/${name}`,
  ),
);

function atPointer(root, fragment) {
  if (fragment === '' || fragment === '#') return root;
  assert.match(fragment, /^#\//, `Only local JSON Pointer fragments are supported: ${fragment}`);
  return fragment
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], root);
}

function dereference(value, sourcePath, stack = new Set()) {
  if (Array.isArray(value)) return value.map((item) => dereference(item, sourcePath, stack));
  if (value === null || typeof value !== 'object') return value;

  if (typeof value.$ref === 'string') {
    const hash = value.$ref.indexOf('#');
    const file = hash === -1 ? value.$ref : value.$ref.slice(0, hash);
    const fragment = hash === -1 ? '' : value.$ref.slice(hash);
    const targetPath = file ? path.resolve(path.dirname(sourcePath), file) : sourcePath;
    const targetRoot = documents.get(targetPath);
    assert.ok(targetRoot, `Unresolved document in OpenAPI example test: ${value.$ref}`);
    const target = atPointer(targetRoot, fragment);
    assert.notEqual(target, undefined, `Unresolved JSON Pointer in OpenAPI example test: ${value.$ref}`);

    const key = `${targetPath}${fragment}`;
    assert.ok(!stack.has(key), `Cyclic schema reference is not supported by this example test: ${key}`);
    const nextStack = new Set(stack).add(key);
    const resolved = dereference(target, targetPath, nextStack);
    const siblings = Object.fromEntries(Object.entries(value).filter(([name]) => name !== '$ref'));
    if (Object.keys(siblings).length === 0) return resolved;
    return { allOf: [resolved, dereference(siblings, sourcePath, stack)] };
  }

  return Object.fromEntries(
    Object.entries(value).map(([name, child]) => [name, dereference(child, sourcePath, stack)]),
  );
}

function collectRefs(value, refs = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs);
    return refs;
  }
  if (value === null || typeof value !== 'object') return refs;
  if (typeof value.$ref === 'string') refs.push(value.$ref);
  for (const child of Object.values(value)) collectRefs(child, refs);
  return refs;
}

function makeAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

function assertValid(validate, value, label) {
  assert.equal(
    validate(value),
    true,
    `${label} does not satisfy its schema:\n${JSON.stringify(validate.errors, null, 2)}`,
  );
}

function assertInvalid(validate, value, label) {
  assert.equal(validate(value), false, `${label} unexpectedly satisfied its schema`);
}

test('OpenAPI golden consumes only the four approved common schemas', () => {
  const commonRefs = collectRefs(golden).filter((ref) => ref.includes('govstack-openapi-common.yaml'));
  assert.deepEqual(new Set(commonRefs), EXPECTED_COMMON_REFS);
  assert.equal(commonRefs.length, EXPECTED_COMMON_REFS.size, 'each common schema should be aliased once');

  for (const name of ['Problem', 'ValidationProblem', 'FieldError', 'PageInfo']) {
    assert.equal(
      golden.components.schemas[name].$ref,
      `../../../../api/common/govstack-openapi-common.yaml#/components/schemas/${name}`,
    );
  }
  assert.equal(golden.components.schemas.Operation.$ref, undefined, 'Operation must remain BB-owned');
});

test('common OpenAPI schemas validate their contract while remaining open to undeclared members', () => {
  const ajv = makeAjv();
  const compile = (name) => ajv.compile(dereference(common.components.schemas[name], commonPath));
  const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';

  const problem = compile('Problem');
  const validProblem = {
    type: 'https://govstack.global/problems/registry/record-not-found',
    title: 'Record not found',
    status: 404,
    traceId,
  };
  assertValid(problem, validProblem, 'Problem positive control');
  assertInvalid(problem, { ...validProblem, type: 'https://docs.example.gov/problems/not-found' }, 'Problem old type URI');
  assertInvalid(problem, { ...validProblem, type: 'https://govstack.global/problems/registry/recordNotFound' }, 'Problem non-kebab slug');
  assertValid(problem, { ...validProblem, code: 'consumer-extension' }, 'Problem undeclared member control');
  assertValid(problem, { ...validProblem, timestamp: '2026-07-10T12:34:56Z' }, 'Problem timestamp extension control');
  const missingTrace = { ...validProblem };
  delete missingTrace.traceId;
  assertInvalid(problem, missingTrace, 'Problem missing traceId');

  const fieldError = compile('FieldError');
  assertValid(fieldError, { pointer: '/emailAddress', message: 'Must be a valid email.' }, 'FieldError positive control');
  assertInvalid(fieldError, { pointer: 'emailAddress', message: 'Must be a valid email.' }, 'FieldError invalid JSON Pointer');
  assertInvalid(fieldError, { pointer: '/emailAddress' }, 'FieldError missing message');
  assertValid(
    fieldError,
    { pointer: '/emailAddress', code: 'consumer-extension', message: 'Must be a valid email.' },
    'FieldError undeclared member control',
  );

  const validation = compile('ValidationProblem');
  const validValidation = {
    type: 'https://govstack.global/problems/registry/invalid-field',
    title: 'Validation failed',
    status: 422,
    traceId,
    errors: [{ pointer: '/emailAddress', message: 'Must be a valid email.' }],
  };
  assertValid(validation, validValidation, 'ValidationProblem positive control');
  assertInvalid(validation, { ...validValidation, errors: [] }, 'ValidationProblem empty errors');
  assertInvalid(
    validation,
    { ...validValidation, errors: [{ pointer: '/emailAddress' }] },
    'ValidationProblem field error missing message',
  );

  const pageInfo = compile('PageInfo');
  assertValid(pageInfo, { nextCursor: null }, 'PageInfo final-page control');
  assertValid(pageInfo, { nextCursor: 'opaque-cursor', total: 12 }, 'PageInfo continuation control');
  assertValid(pageInfo, { nextCursor: null, hasMore: false }, 'PageInfo undeclared member control');
  assertInvalid(pageInfo, {}, 'PageInfo missing nextCursor');
  assertInvalid(pageInfo, { nextCursor: '' }, 'PageInfo empty cursor');
});

test('every OpenAPI golden example satisfies its resolved schema', () => {
  const ajv = makeAjv();
  let checked = 0;

  const validateExamples = (schema, examples, label) => {
    const validate = ajv.compile(dereference(schema, goldenPath));
    for (const [index, example] of examples.entries()) {
      assertValid(validate, example, `${label} example ${index + 1}`);
      checked += 1;
    }
  };

  for (const [name, schema] of Object.entries(golden.components.schemas)) {
    const examples = Array.isArray(schema.examples)
      ? schema.examples
      : Object.prototype.hasOwnProperty.call(schema, 'example')
        ? [schema.example]
        : [];
    if (examples.length > 0) validateExamples(schema, examples, `components.schemas.${name}`);
  }

  const walk = (value, label) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${label}[${index}]`));
      return;
    }
    if (value === null || typeof value !== 'object') return;
    if (value.schema && Object.prototype.hasOwnProperty.call(value, 'example')) {
      validateExamples(value.schema, [value.example], label);
    }
    if (value.schema && value.examples && !Array.isArray(value.examples)) {
      const examples = Object.values(value.examples)
        .filter((example) => !example?.$ref)
        .map((example) => (example && typeof example === 'object' && 'value' in example ? example.value : example));
      validateExamples(value.schema, examples, label);
    }
    for (const [name, child] of Object.entries(value)) walk(child, `${label}.${name}`);
  };
  walk({ paths: golden.paths, webhooks: golden.webhooks, responses: golden.components.responses }, 'openapi');

  assert.ok(checked > 0, 'golden must contain schema-bound examples');
});
