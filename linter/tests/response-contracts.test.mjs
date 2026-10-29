import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSpectral, lintString, RULESET_PATH } from './_lint-helper.mjs';
import { walkHttpOperations } from '../functions/lib/httpOperations.js';

const spectral = await makeSpectral(RULESET_PATH);

const accepted = (overrides = {}) => ({
  description: 'Accepted.',
  headers: { Location: { schema: { type: 'string', format: 'uri' } } },
  ...overrides,
});

const operation = (responses) => ({
  operationId: 'startWork',
  description: 'Start asynchronous work.',
  responses,
});

const document = (overrides = {}) => ({
  openapi: '3.1.0',
  info: {
    title: 'Response contract checks',
    version: '1.0.0',
    description: 'Focused regression cases for response contracts.',
  },
  servers: [{ url: 'https://api.example.org' }],
  paths: {},
  ...overrides,
});

const lintResponseContracts = async (source) =>
  (await lintString(spectral, JSON.stringify(source)))
    .filter(({ code }) => code === 'govstack-15.1');

test('shared HTTP operation traversal is cycle-safe and preserves distinct use sites', () => {
  const pathItem = {};
  pathItem.post = operation({ 200: { description: 'OK.' } });
  pathItem.post.callbacks = { recursive: { callback: pathItem } };
  const paths = [];

  walkHttpOperations({ paths: { '/v1/a': pathItem, '/v1/b': pathItem } }, (_operation, entry) => {
    paths.push(entry.path);
  });

  assert.deepEqual(paths, [
    ['paths', '/v1/a', 'post'],
    ['paths', '/v1/b', 'post'],
  ]);
});

test('15.1 rejects every incomplete 202 response body contract exactly once', async () => {
  const findings = await lintResponseContracts(document({
    paths: {
      '/v1/no-content': { post: operation({ 202: accepted() }) },
      '/v1/empty-content': { post: operation({ 202: accepted({ content: {} }) }) },
      '/v1/missing-schema': {
        post: operation({ 202: accepted({ content: { 'application/json': {} } }) }),
      },
      '/v1/empty-schema': {
        post: operation({
          202: accepted({ content: { 'application/json': { schema: {} } } }),
        }),
      },
    },
  }));

  assert.equal(findings.length, 4, JSON.stringify(findings));
  assert.deepEqual(findings.map(({ path }) => path), [
    ['paths', '/v1/no-content', 'post', 'responses', '202'],
    ['paths', '/v1/empty-content', 'post', 'responses', '202', 'content'],
    ['paths', '/v1/missing-schema', 'post', 'responses', '202', 'content', 'application/json'],
    ['paths', '/v1/empty-schema', 'post', 'responses', '202', 'content', 'application/json', 'schema'],
  ]);
  assert.ok(findings.every(({ message }) => /202 response must declare content/i.test(message)));
});

test('15.1 exclusively owns malformed 202 body diagnostics shared with 7.21', async () => {
  const source = document({
    paths: {
      '/v1/no-content': { post: operation({ 202: accepted() }) },
      '/v1/empty-content': { post: operation({ 202: accepted({ content: {} }) }) },
      '/v1/missing-schema': {
        post: operation({ 202: accepted({ content: { 'application/json': {} } }) }),
      },
      '/v1/empty-schema': {
        post: operation({
          202: accepted({ content: { 'application/json': { schema: {} } } }),
        }),
      },
    },
  });
  const findings = (await lintString(spectral, JSON.stringify(source)))
    .filter(({ code }) => code === 'govstack-7.21' || code === 'govstack-15.1');

  assert.equal(findings.length, 4, JSON.stringify(findings));
  assert.ok(findings.every(({ code }) => code === 'govstack-15.1'));
});

test('15.1 accepts concrete inline and reference-resolved 202 response schemas', async () => {
  const findings = await lintResponseContracts(document({
    paths: {
      '/v1/inline': {
        post: operation({
          202: accepted({
            content: { 'application/json': { schema: { type: 'object' } } },
          }),
        }),
      },
      '/v1/referenced': {
        post: operation({ 202: { $ref: '#/components/responses/AcceptedOperation' } }),
      },
    },
    components: {
      schemas: {
        Operation: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      },
      responses: {
        AcceptedOperation: accepted({
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Operation' } },
          },
        }),
      },
    },
  }));

  assert.deepEqual(findings, []);
});

test('15.1 rejects an incomplete response reached through a local reference', async () => {
  const findings = await lintResponseContracts(document({
    paths: {
      '/v1/referenced': {
        post: operation({ 202: { $ref: '#/components/responses/AcceptedOperation' } }),
      },
    },
    components: {
      responses: { AcceptedOperation: accepted() },
    },
  }));

  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.deepEqual(findings[0].path, ['components', 'responses', 'AcceptedOperation']);
});

test('7.3 and 15.1 report their separate Location and body defects without overlap', async () => {
  const source = document({
    paths: {
      '/v1/missing-body': { post: operation({ 202: accepted() }) },
      '/v1/missing-location': {
        post: operation({
          202: {
            description: 'Accepted.',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        }),
      },
    },
  });
  const findings = (await lintString(spectral, JSON.stringify(source)))
    .filter(({ code }) => code === 'govstack-7.3' || code === 'govstack-15.1');
  const codesByPath = new Map();
  for (const { code, path } of findings) {
    codesByPath.set(path[1], [...(codesByPath.get(path[1]) || []), code]);
  }

  assert.deepEqual(codesByPath.get('/v1/missing-body'), ['govstack-15.1']);
  assert.deepEqual(codesByPath.get('/v1/missing-location'), ['govstack-7.3']);
});

test('15.1 preserves HEAD no-body semantics for 202 responses', async () => {
  const findings = await lintResponseContracts(document({
    paths: {
      '/v1/bodyless': { head: operation({ 202: accepted() }) },
      '/v1/with-content': {
        head: operation({
          202: accepted({
            content: { 'application/json': { schema: { type: 'object' } } },
          }),
        }),
      },
    },
  }));

  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.deepEqual(findings[0].path, [
    'paths',
    '/v1/with-content',
    'head',
    'responses',
    '202',
    'content',
  ]);
  assert.match(findings[0].message, /HEAD 202 response must not declare content/i);
});

test('15.1 checks 202 response contracts in callback and webhook operations', async () => {
  const findings = await lintResponseContracts(document({
    paths: {
      '/v1/jobs': {
        post: {
          ...operation({ 200: { description: 'Started.' } }),
          callbacks: {
            completion: {
              '{$request.body#/callbackUrl}': {
                post: operation({ 202: accepted() }),
              },
            },
          },
        },
      },
    },
    webhooks: {
      jobQueued: {
        post: operation({ 202: accepted({ content: { 'application/json': {} } }) }),
      },
      jobCompleted: {
        post: operation({
          202: accepted({
            content: { 'application/json': { schema: { type: 'object' } } },
          }),
        }),
      },
    },
  }));

  assert.deepEqual(findings.map(({ path }) => path), [
    [
      'paths',
      '/v1/jobs',
      'post',
      'callbacks',
      'completion',
      '{$request.body#/callbackUrl}',
      'post',
      'responses',
      '202',
    ],
    ['webhooks', 'jobQueued', 'post', 'responses', '202', 'content', 'application/json'],
  ]);
});

test('7.21 checks callback schemas and forbids successful bodies on HEAD and 205', async () => {
  const body = { content: { 'application/json': { schema: { type: 'object' } } } };
  const source = document({
    paths: {
      '/v1/jobs': {
        post: {
          ...operation({ 200: { description: 'Started.' } }),
          callbacks: {
            completion: {
              '{$request.body#/callbackUrl}': {
                post: operation({
                  200: { description: 'Acknowledged.', content: { 'application/json': {} } },
                }),
              },
            },
          },
        },
      },
      '/v1/head': {
        head: operation({ 200: { description: 'Metadata.', ...body } }),
      },
      '/v1/reset': {
        post: operation({ 205: { description: 'Reset.', ...body } }),
      },
    },
  });
  const findings = (await lintString(spectral, JSON.stringify(source)))
    .filter(({ code }) => code === 'govstack-7.21' || code === 'govstack-15.1');

  assert.equal(findings.length, 3, JSON.stringify(findings));
  assert.ok(findings.every(({ code }) => code === 'govstack-7.21'));
  assert.deepEqual(findings.map(({ path }) => path), [
    [
      'paths',
      '/v1/jobs',
      'post',
      'callbacks',
      'completion',
      '{$request.body#/callbackUrl}',
      'post',
      'responses',
      '200',
      'content',
      'application/json',
    ],
    ['paths', '/v1/head', 'head', 'responses', '200', 'content'],
    ['paths', '/v1/reset', 'post', 'responses', '205', 'content'],
  ]);
});

test('7.2 and 7.3 require Location across callbacks and webhooks without 15.1 overlap', async () => {
  const validBody = { content: { 'application/json': { schema: { type: 'object' } } } };
  const source = document({
    paths: {
      '/v1/jobs': {
        post: {
          ...operation({ 200: { description: 'Started.' } }),
          callbacks: {
            completion: {
              '{$request.body#/callbackUrl}': {
                post: operation({
                  201: { description: 'Created.', ...validBody },
                  202: { description: 'Accepted.', ...validBody },
                }),
              },
            },
          },
        },
      },
    },
    webhooks: {
      workAccepted: {
        post: operation({ 202: { description: 'Accepted.', ...validBody } }),
      },
    },
  });
  const findings = (await lintString(spectral, JSON.stringify(source)))
    .filter(({ code }) => ['govstack-7.2', 'govstack-7.3', 'govstack-15.1'].includes(code));

  assert.equal(findings.length, 3, JSON.stringify(findings));
  assert.deepEqual(findings.map(({ code }) => code).sort(), [
    'govstack-7.2',
    'govstack-7.3',
    'govstack-7.3',
  ]);
  assert.ok(findings.every(({ message }) => /Location/.test(message)));
});

test('response checks preserve valid 200, 201, 202, HEAD, and 205 contracts', async () => {
  const schemaContent = { 'application/json': { schema: { type: 'object' } } };
  const location = { Location: { schema: { type: 'string', format: 'uri' } } };
  const source = document({
    paths: {
      '/v1/jobs': {
        post: {
          ...operation({ 200: { description: 'Started.', content: schemaContent } }),
          callbacks: {
            completion: {
              '{$request.body#/callbackUrl}': {
                post: operation({
                  200: { description: 'Acknowledged.', content: schemaContent },
                  201: { description: 'Created.', headers: location, content: schemaContent },
                  202: { description: 'Accepted.', headers: location, content: schemaContent },
                  205: { description: 'Reset.' },
                }),
                head: operation({ 200: { description: 'Metadata.' } }),
              },
            },
          },
        },
      },
    },
  });
  const findings = (await lintString(spectral, JSON.stringify(source)))
    .filter(({ code }) => ['govstack-7.2', 'govstack-7.3', 'govstack-7.21', 'govstack-15.1'].includes(code));

  assert.deepEqual(findings, []);
});

