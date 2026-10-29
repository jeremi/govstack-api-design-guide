import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import schemaFieldFormat from '../functions/schemaFieldFormat.js';
import { makeSpectral, lintFile, RULESET_PATH } from './_lint-helper.mjs';

const spectral = await makeSpectral(RULESET_PATH);
const FIXTURES = join(import.meta.dirname, 'temporal-format-fixtures');
const temporalRequirement = {
  namePattern: 'At$',
  composed: true,
  require: { type: 'string', formatOneOf: ['date', 'date-time'] },
};

const findingsFor = (schema) => schemaFieldFormat(
  { type: 'object', properties: { effectiveAt: schema } },
  temporalRequirement,
) ?? [];

test('10.2 accepts every valid date/date-time branch in composed At schemas', () => {
  const schemas = [
    { type: 'string', format: 'date' },
    { type: ['string', 'null'], format: 'date' },
    {
      type: 'string',
      anyOf: [{ format: 'date' }, { format: 'date-time' }],
    },
    {
      oneOf: [
        { type: 'string', format: 'date' },
        { type: 'string', format: 'date-time' },
      ],
    },
    {
      allOf: [{ type: 'string' }, { anyOf: [{ format: 'date' }, { format: 'date-time' }] }],
    },
    {
      anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
    },
  ];

  for (const schema of schemas) {
    assert.deepEqual(findingsFor(schema), [], JSON.stringify(schema));
  }
});

test('10.2 does not hide malformed non-null union branches', () => {
  const schemas = [
    { type: ['string', 'number'], format: 'date' },
    { anyOf: [{ type: 'string', format: 'date' }, { type: 'string' }] },
    { anyOf: [{ type: 'string', format: 'date' }, { type: ['string', 'number'], format: 'date-time' }] },
    { oneOf: [{ type: 'string', format: 'date-time' }, {}] },
    { type: 'string', anyOf: [{ format: 'date' }, { format: 'email' }] },
  ];

  for (const schema of schemas) {
    assert.ok(findingsFor(schema).length > 0, JSON.stringify(schema));
  }
});

test('composed schema checks fail closed when alternative expansion exceeds its bound', () => {
  const repeatedUnion = {
    anyOf: [
      { type: 'string', format: 'date' },
      { type: 'string', format: 'date' },
    ],
  };
  const schema = { allOf: Array.from({ length: 9 }, () => repeatedUnion) };

  assert.ok(findingsFor(schema).length > 0);
});

test('composed schema checks remain cycle-safe', () => {
  const recursive = { type: 'string', format: 'date' };
  recursive.allOf = [recursive];

  assert.deepEqual(findingsFor(recursive), []);
});

test('10.2 follows local and external refs and keeps Timestamp fields instant-only', async () => {
  const findings = (await lintFile(
    spectral,
    join(FIXTURES, 'root.openapi.yaml'),
  )).filter(({ code }) => code === 'govstack-10.2');

  assert.deepEqual(
    findings.map(({ path }) => path.at(-1)).sort(),
    ['eventTimestamp', 'malformedAt', 'unknownAt', 'unknownTimestamp'],
    JSON.stringify(findings, null, 2),
  );
});
