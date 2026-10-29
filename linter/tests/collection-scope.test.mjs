import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSpectral, lintString } from './_lint-helper.mjs';

const spectral = await makeSpectral();
const paginationRules = new Set([
  'govstack-12.1',
  'govstack-12.2',
  'govstack-12.3',
  'govstack-12.4',
  'govstack-12.6',
]);
const response = (schema) => ({
  description: 'Read result.',
  content: { 'application/json': { schema } },
});
const document = (operation) => JSON.stringify({
  openapi: '3.1.0',
  info: {
    title: 'Collection scope probe',
    version: '1.0.0',
    description: 'Regression probes for collection response classification.',
  },
  paths: { '/beneficiary/': { get: operation } },
});
const findingsFor = async (operation) => (
  await lintString(spectral, document(operation))
).filter((finding) => paginationRules.has(finding.code));

test('a single result with an embedded array is not treated as a collection', async () => {
  const operation = {
    parameters: [
      { name: 'payeeIdentity', in: 'query', required: true, schema: { type: 'string' } },
      { name: 'requestId', in: 'query', required: true, schema: { type: 'string' } },
    ],
    responses: {
      200: response({
        type: 'object',
        properties: {
          requestId: { type: 'string' },
          paymentModalityList: {
            type: 'array',
            items: { type: 'object' },
          },
        },
      }),
    },
  };

  assert.deepEqual(await findingsFor(operation), []);
});

test('declared pagination controls still require a collection envelope', async () => {
  const operation = {
    parameters: [
      {
        name: 'pageSize',
        in: 'query',
        schema: { type: 'integer', default: 20, maximum: 100 },
      },
      { name: 'cursor', in: 'query', schema: { type: 'string' } },
    ],
    responses: { 200: response({ type: 'object', properties: { result: { type: 'string' } } }) },
  };

  const findings = await findingsFor(operation);
  assert.deepEqual(new Set(findings.map((finding) => finding.code)), new Set(['govstack-12.3']));
});

test('bare arrays and items envelopes retain collection pagination checks', async () => {
  const schemas = [
    { type: 'array', items: { type: 'object' } },
    {
      type: 'object',
      properties: { items: { type: 'array', items: { type: 'object' } } },
    },
  ];
  const expected = new Set(['govstack-12.1', 'govstack-12.2', 'govstack-12.3', 'govstack-12.4']);

  for (const schema of schemas) {
    const findings = await findingsFor({ responses: { 200: response(schema) } });
    assert.deepEqual(new Set(findings.map((finding) => finding.code)), expected, JSON.stringify(schema));
  }
});

test('a response that can be an array is not proven to be a single object', async () => {
  const findings = await findingsFor({
    responses: {
      200: response({ type: ['object', 'array'], items: { type: 'object' } }),
    },
  });
  assert.ok(findings.some((finding) => finding.code === 'govstack-12.1'));
  assert.ok(findings.some((finding) => finding.code === 'govstack-12.3'));
});
