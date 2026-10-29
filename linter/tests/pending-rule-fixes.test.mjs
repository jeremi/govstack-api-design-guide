import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSpectral, lintString, RULESET_PATH } from './_lint-helper.mjs';

const standard = await makeSpectral(RULESET_PATH);
const strict = await makeSpectral();

const openapi = (overrides = {}) => JSON.stringify({
  openapi: '3.1.0',
  info: {
    title: 'Pending rule fixes',
    version: '1.0.0',
    description: 'Focused regression cases for pending linter fixes.',
  },
  servers: [{ url: 'https://api.example.org' }],
  paths: {},
  ...overrides,
});

const selected = (findings, codes) => findings.filter(({ code }) => codes.includes(code));

test('2.1 unsupported-version diagnostic explains the OpenAPI 3.1 check prerequisite', async () => {
  const findings = selected(await lintString(standard, openapi({ openapi: '3.0.3' })), ['govstack-2.1']);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /most guide checks require an OpenAPI 3\.1 document/i);
});

test('14.1 alone reports missing Idempotency-Key for POST 201 and 202 responses', async () => {
  const post = (status, parameters) => ({
    operationId: `submit${status}`,
    description: 'Submit work.',
    ...(parameters ? { parameters } : {}),
    responses: { [status]: { description: 'Accepted.' } },
  });
  const missing = openapi({
    paths: {
      '/v1/created': { post: post('201') },
      '/v1/accepted': { post: post('202') },
      '/v1/read': { post: post('200') },
    },
  });
  const findings = selected(await lintString(standard, missing), ['govstack-8.3', 'govstack-14.1']);
  assert.deepEqual(findings.map(({ code }) => code), ['govstack-14.1', 'govstack-14.1']);
  assert.deepEqual(findings.map(({ path }) => path), [
    ['paths', '/v1/created', 'post'],
    ['paths', '/v1/accepted', 'post'],
  ]);

  const header = [{ name: 'Idempotency-Key', in: 'header', schema: { type: 'string' } }];
  const covered = openapi({
    paths: {
      '/v1/created': { parameters: header, post: post('201') },
      '/v1/accepted': { post: post('202', header) },
    },
  });
  assert.deepEqual(selected(await lintString(standard, covered), ['govstack-8.3', 'govstack-14.1']), []);
});

test('10.3 checks true date fields without treating amount due-date qualifiers as dates', async () => {
  const findings = selected(await lintString(standard, openapi({
    components: {
      schemas: {
        Payment: {
          type: 'object',
          properties: {
            dueDate: { type: 'string' },
            amountAfterDueDate: { type: 'string' },
            amountonDueDate: { type: 'string' },
          },
        },
      },
    },
  })), ['govstack-10.3']);
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].path.slice(-2), ['properties', 'dueDate']);
});

test('strict identifier checks recognise the reviewed payment names', async () => {
  const headerNames = [
    'X-PayerFI-Id',
    'X-billerId',
    'X-Program-Id',
    'X-Registering-Institution-Id',
    'registeringInstitutionId',
  ];
  const parameters = [
    ...headerNames.map((name) => ({ name, in: 'header', schema: { type: 'string' } })),
    { name: 'payeeIdentity', in: 'query', schema: { type: 'string' } },
  ];
  const findings = selected(await lintString(strict, openapi({
    paths: {
      '/v1/payments': {
        get: {
          operationId: 'listPayments',
          description: 'List payments.',
          parameters,
          responses: { 200: { description: 'OK.' } },
        },
      },
    },
  })), ['govstack-8.6', 'govstack-8.8']);
  assert.equal(findings.filter(({ code }) => code === 'govstack-8.6').length, 1);
  assert.equal(findings.filter(({ code }) => code === 'govstack-8.8').length, headerNames.length);
});

test('4.2 describes missing body examples with SHOULD wording', async () => {
  const findings = selected(await lintString(standard, openapi({
    paths: {
      '/v1/payments': {
        post: {
          operationId: 'createPayment',
          description: 'Create a payment.',
          requestBody: {
            content: {
              'application/json': { schema: { type: 'object', description: 'A payment.' } },
            },
          },
          responses: { 200: { description: 'OK.' } },
        },
      },
    },
  })), ['govstack-4.2']);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /should have at least one example/i);
  assert.doesNotMatch(findings[0].message, /must have/i);
});

test('2.6 rejects a server URL version only when path keys carry the same version', async () => {
  const lint = async (path, serverUrl = 'https://api.example.org/v1') => selected(await lintString(standard, openapi({
    servers: [{ url: serverUrl }],
    paths: {
      [path]: {
        get: {
          operationId: 'listThings',
          description: 'List things.',
          responses: { 200: { description: 'OK.' } },
        },
      },
    },
  })), ['govstack-2.6-version']);
  assert.deepEqual(await lint('/things'), []);
  assert.deepEqual(await lint('/v1/things', 'https://api.example.org/v2'), []);
  const duplicated = await lint('/v1/things');
  assert.equal(duplicated.length, 1);
  assert.deepEqual(duplicated[0].path, ['servers', '0', 'url']);
});

test('11.1 requires problem+json content for explicit and default errors but exempts HEAD', async () => {
  const missing = openapi({
    paths: {
      '/v1/things': {
        get: {
          operationId: 'listThings',
          description: 'List things.',
          responses: {
            400: { description: 'Bad request.' },
            '4XX': { description: 'Other client error.' },
            500: { description: 'Failure.', content: { 'application/json': {} } },
            default: { description: 'Other error.' },
          },
        },
        head: {
          operationId: 'checkThings',
          description: 'Check things.',
          responses: {
            400: { description: 'Bad request.' },
            default: { description: 'Other error.', content: { 'application/problem+json': {} } },
          },
        },
      },
    },
  });
  const findings = selected(await lintString(standard, missing), ['govstack-11.1']);
  assert.deepEqual(findings.map(({ path }) => path), [
    ['paths', '/v1/things', 'get', 'responses', '400'],
    ['paths', '/v1/things', 'get', 'responses', '500', 'content'],
    ['paths', '/v1/things', 'get', 'responses', '4XX'],
    ['paths', '/v1/things', 'get', 'responses', 'default'],
    ['paths', '/v1/things', 'head', 'responses', 'default', 'content'],
  ]);

  const problem = {
    description: 'Problem.',
    content: { 'application/problem+json': { schema: { type: 'object' } } },
  };
  const covered = openapi({
    paths: {
      '/v1/things': {
        get: {
          operationId: 'listThings',
          description: 'List things.',
          responses: { 400: problem, '4XX': problem, 500: problem, default: problem },
        },
        head: {
          operationId: 'checkThings',
          description: 'Check things.',
          responses: {
            400: { description: 'Bad request.' },
            default: { description: 'Other error.' },
          },
        },
      },
    },
  });
  assert.deepEqual(selected(await lintString(standard, covered), ['govstack-11.1']), []);
});

test('default problem responses receive the envelope and traceId checks', async () => {
  const lintDefault = async (schema, mediaType = 'application/problem+json') => selected(await lintString(standard, openapi({
    paths: {
      '/v1/things': {
        get: {
          operationId: 'listThings',
          description: 'List things.',
          responses: {
            default: {
              description: 'Other error.',
              content: { [mediaType]: { schema } },
            },
          },
        },
      },
    },
  })), ['govstack-11.2', 'govstack-11.3']);

  const noSchema = selected(await lintString(standard, openapi({
    paths: {
      '/v1/things': {
        get: {
          operationId: 'listThings',
          description: 'List things.',
          responses: {
            default: {
              description: 'Other error.',
              content: { 'application/problem+json': {} },
            },
          },
        },
      },
    },
  })), ['govstack-11.1']);
  assert.equal(noSchema.length, 1);
  assert.match(noSchema[0].message, /must declare a schema/i);

  const malformed = await lintDefault({ type: 'object' });
  assert.ok(malformed.some(({ code }) => code === 'govstack-11.2'));
  assert.ok(malformed.some(({ code }) => code === 'govstack-11.3'));

  const malformedParameterized = await lintDefault(
    { type: 'object' },
    'application/problem+json; charset=utf-8',
  );
  assert.ok(malformedParameterized.some(({ code }) => code === 'govstack-11.2'));
  assert.ok(malformedParameterized.some(({ code }) => code === 'govstack-11.3'));

  const valid = {
    type: 'object',
    required: ['type', 'title', 'status', 'traceId'],
    properties: {
      type: { type: 'string' },
      title: { type: 'string' },
      status: { type: 'integer' },
      traceId: { type: 'string' },
    },
  };
  assert.deepEqual(await lintDefault(valid), []);
  assert.deepEqual(await lintDefault(valid, 'application/problem+json; charset=utf-8'), []);
});
