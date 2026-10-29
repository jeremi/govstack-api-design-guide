import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSpectral, lintFile, lintString, RULESET_PATH } from './_lint-helper.mjs';
import s09ClosedEnum from '../functions/s09-closedEnum.js';

const spectral = await makeSpectral(RULESET_PATH);
const ENUM_RULES = new Set(['govstack-9.7', 'govstack-9.9']);
const HERE = dirname(fileURLToPath(import.meta.url));

const lintEnums = async (document) =>
  (await lintString(spectral, JSON.stringify(document))).filter((finding) => ENUM_RULES.has(finding.code));

const response = (schema = { type: 'object' }) => ({
  description: 'OK.',
  content: { 'application/json': { schema } },
});

const baseDocument = (schemas, operation) => ({
  openapi: '3.1.0',
  info: { title: 'Selector enum checks', version: '1.0.0', description: 'Selector contracts.' },
  paths: {
    '/v1/policies': { get: operation },
  },
  components: { schemas },
});

test('request-only query and body selector enums are exempt from 9.7 and 9.9', async () => {
  const document = baseDocument(
    {
      QueryFields: { type: 'array', items: { type: 'string', enum: ['policyName', 'effectiveDate'] } },
      QuerySort: { oneOf: [{ type: 'string', enum: ['effectiveDate', '-effectiveDate'] }] },
      BodyFields: { type: 'string', enum: ['policyName', 'effectiveDate'] },
      SearchRequest: {
        type: 'object',
        properties: {
          fields: { $ref: '#/components/schemas/BodyFields' },
          sort: { type: 'array', items: { type: 'string', enum: ['policyName', '-policyName'] } },
        },
      },
    },
    {
      operationId: 'listPolicies',
      parameters: [
        { name: 'fields', in: 'query', schema: { $ref: '#/components/schemas/QueryFields' } },
        { name: 'sort', in: 'query', schema: { $ref: '#/components/schemas/QuerySort' } },
      ],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SearchRequest' } } },
      },
      responses: { 200: response() },
    },
  );
  document.components.parameters = {
    PolicyFields: {
      name: 'fields',
      in: 'query',
      schema: { $ref: '#/components/schemas/QueryFields' },
    },
  };
  document.paths['/v1/policies'].get.parameters[0] = {
    $ref: '#/components/parameters/PolicyFields',
  };

  assert.deepEqual(await lintEnums(document), []);
});

test('a selector schema also emitted in a response is not request-only', async () => {
  const document = baseDocument(
    {
      SharedFields: { type: 'array', items: { type: 'string', enum: ['policyName'] } },
      SharedSearch: {
        type: 'object',
        properties: {
          sort: { type: 'string', enum: ['effectiveDate'] },
        },
      },
      Envelope: {
        type: 'object',
        properties: {
          fields: { $ref: '#/components/schemas/SharedFields' },
          search: { $ref: '#/components/schemas/SharedSearch' },
        },
      },
    },
    {
      operationId: 'listPolicies',
      parameters: [
        { name: 'fields', in: 'query', schema: { $ref: '#/components/schemas/SharedFields' } },
      ],
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SharedSearch' } } },
      },
      responses: {
        200: response({ $ref: '#/components/schemas/Envelope' }),
      },
    },
  );
  document.components.responses = {
    SharedEnvelope: response({ $ref: '#/components/schemas/Envelope' }),
  };
  document.paths['/v1/policies'].get.responses[200] = {
    $ref: '#/components/responses/SharedEnvelope',
  };

  const findings = await lintEnums(document);
  for (const component of ['SharedFields', 'SharedSearch']) {
    const componentFindings = findings.filter((finding) => finding.path[2] === component);
    assert.deepEqual(
      new Set(componentFindings.map((finding) => finding.code)),
      new Set(['govstack-9.9']),
      `${component}: ${JSON.stringify(componentFindings)}`,
    );
  }
});

test('a selector schema emitted in an outbound callback is not request-only', async () => {
  const document = baseDocument(
    { CallbackFields: { type: 'string', enum: ['policyName'] } },
    {
      operationId: 'listPolicies',
      parameters: [
        { name: 'fields', in: 'query', schema: { $ref: '#/components/schemas/CallbackFields' } },
      ],
      responses: { 200: response() },
      callbacks: {
        result: {
          '{$request.body#/callbackUrl}': {
            post: {
              requestBody: {
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/CallbackFields' } },
                },
              },
              responses: { 204: { description: 'Accepted.' } },
            },
          },
        },
      },
    },
  );

  const findings = await lintEnums(document);
  assert.deepEqual(new Set(findings.map((finding) => finding.code)), new Set(['govstack-9.9']));
});

test('a selector schema emitted in an outbound webhook is not request-only', async () => {
  const document = baseDocument(
    { WebhookFields: { type: 'string', enum: ['policyName'] } },
    {
      operationId: 'listPolicies',
      parameters: [
        { name: 'fields', in: 'query', schema: { $ref: '#/components/schemas/WebhookFields' } },
      ],
      responses: { 200: response() },
    },
  );
  document.webhooks = {
    policyChanged: {
      post: {
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/WebhookFields' } },
          },
        },
        responses: { 204: { description: 'Accepted.' } },
      },
    },
  };

  const findings = await lintEnums(document);
  assert.deepEqual(new Set(findings.map((finding) => finding.code)), new Set(['govstack-9.9']));
});

test('selector recognition does not mask state vocabularies or unused name lookalikes', async () => {
  const document = baseDocument(
    {
      SearchRequest: {
        type: 'object',
        properties: {
          fields: { type: 'array', items: { type: 'string', enum: ['policyName'] } },
          state: { type: 'string', enum: ['pendingReview'] },
          criteria: {
            type: 'object',
            properties: {
              fields: {
                type: 'object',
                properties: {
                  state: { type: 'string', enum: ['pendingReview'] },
                },
              },
            },
          },
        },
      },
      UnusedFields: { type: 'string', enum: ['policyName'] },
    },
    {
      operationId: 'searchPolicies',
      requestBody: {
        content: { 'application/json': { schema: { $ref: '#/components/schemas/SearchRequest' } } },
      },
      responses: { 200: response() },
    },
  );

  const findings = await lintEnums(document);
  const searchFindings = findings.filter((finding) => finding.path[2] === 'SearchRequest');
  assert.deepEqual(new Set(searchFindings.map((finding) => finding.code)), ENUM_RULES);
  assert.equal(searchFindings.length, 4, JSON.stringify(searchFindings));
  assert.ok(searchFindings.every((finding) => !finding.path.includes('items')), JSON.stringify(searchFindings));

  const unusedFindings = findings.filter((finding) => finding.path[2] === 'UnusedFields');
  assert.deepEqual(new Set(unusedFindings.map((finding) => finding.code)), ENUM_RULES);
});

test('9.7 casing findings use info severity for the SHOULD rule', async () => {
  const document = baseDocument(
    { Status: { type: 'string', enum: ['pendingReview'] } },
    { operationId: 'listPolicies', responses: { 200: response() } },
  );

  const findings = (await lintEnums(document)).filter((finding) => finding.code === 'govstack-9.7');
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].severity, 2);
  assert.match(findings[0].message, /should use SCREAMING_SNAKE_CASE/);
  assert.doesNotMatch(findings[0].message, /must/i);
});

test('an enum emitted in an AsyncAPI message is never request-only', () => {
  const payload = { type: 'string', enum: ['policyName'] };
  const data = {
    asyncapi: '3.0.0',
    components: {
      messages: {
        PolicyEvent: { payload },
      },
    },
  };
  const findings = s09ClosedEnum(
    payload,
    {},
    {
      path: ['components', 'messages', 'PolicyEvent', 'payload'],
      document: { data },
      documentInventory: { resolved: data },
    },
  );

  assert.equal(findings?.length, 1);
});

test('external selector schemas preserve request-only and emitted distinctions', async () => {
  const findings = (await lintFile(
    spectral,
    join(HERE, 'selector-enum-fixtures', 'external.openapi.yaml'),
  )).filter((finding) => ENUM_RULES.has(finding.code));

  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].code, 'govstack-9.9');
  assert.deepEqual(findings[0].path.slice(0, 2), ['$defs', 'SharedSort']);
});
