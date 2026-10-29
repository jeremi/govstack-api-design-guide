import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSpectral, lintFile, lintString } from './_lint-helper.mjs';

const spectral = await makeSpectral();
const HERE = dirname(fileURLToPath(import.meta.url));

const eventSchema = (source) => ({
  type: 'object',
  required: ['specversion', 'id', 'source', 'type', 'data'],
  properties: {
    specversion: { const: '1.0' },
    id: { type: 'string' },
    source: { type: 'string', const: source },
    type: { type: 'string', const: 'global.govstack.registry.record.created' },
    data: { type: 'object' },
  },
});

const openApiDocument = (source) => ({
  openapi: '3.1.0',
  info: { title: 'Registry events', version: '1.0.0' },
  webhooks: {
    recordCreated: {
      post: {
        requestBody: {
          content: {
            'application/cloudevents+json': { schema: eventSchema(source) },
          },
        },
        responses: { 200: { description: 'Acknowledged' } },
      },
    },
  },
});

const asyncApiDocument = (source) => ({
  asyncapi: '3.0.0',
  info: { title: 'Registry events', version: '1.0.0' },
  channels: {
    records: {
      address: 'records/events',
      messages: { created: { $ref: '#/components/messages/RecordCreated' } },
    },
  },
  operations: {
    publish: {
      action: 'send',
      channel: { $ref: '#/channels/records' },
      messages: [{ $ref: '#/channels/records/messages/created' }],
    },
  },
  components: {
    messages: {
      RecordCreated: {
        contentType: 'application/cloudevents+json',
        payload: eventSchema(source),
      },
    },
  },
});

const sourceFindings = async (document) => (await lintString(
  spectral,
  JSON.stringify(document),
)).filter(({ code }) => code === 'govstack-16.4' || code === 'govstack-16.4-async');

test('stable authority, tenant, environment, host, IP, and port source identities are accepted', async () => {
  const sources = [
    'urn:govstack:country:ke:agency:social-protection:tenant:42:environment:prod',
    'https://events.social-protection.go.ke/tenants/42/environments/production',
    'https://events.staging.agency.gov.example/tenant/test',
    'https://203.0.113.42:8443/ke/social-protection/tenant/42/prod',
    '/countries/ke/agencies/social-protection/tenants/tenant%2042/environments/prod',
  ];

  for (const source of sources) {
    assert.deepEqual(await sourceFindings(openApiDocument(source)), [], source);
    assert.deepEqual(await sourceFindings(asyncApiDocument(source)), [], source);
  }
});

test('pinned source values must be non-empty URI-references on both event surfaces', async () => {
  for (const source of ['', 'https://agency.gov.example/source with space', 'urn:govstack:tenant:%zz']) {
    assert.equal((await sourceFindings(openApiDocument(source))).length, 1, source);
    assert.equal((await sourceFindings(asyncApiDocument(source))).length, 1, source);
  }
});

test('inline AsyncAPI channel message payloads enforce source URI-reference shape', async () => {
  const document = asyncApiDocument('not a URI reference');
  document.channels.records.messages.created = document.components.messages.RecordCreated;
  delete document.components.messages.RecordCreated;

  const findings = await sourceFindings(document);
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].path, [
    'channels',
    'records',
    'messages',
    'created',
    'payload',
    'properties',
    'source',
  ]);
});

test('a referenced AsyncAPI component message reports one source finding', async () => {
  const findings = await sourceFindings(asyncApiDocument('not a URI reference'));
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0].path, [
    'components',
    'messages',
    'RecordCreated',
    'payload',
    'properties',
    'source',
  ]);
});

test('a locally referenced AsyncAPI payload schema reports one source finding', async () => {
  const document = asyncApiDocument('urn:govstack:registry');
  document.components.schemas = { Event: eventSchema('not a URI reference') };
  document.components.messages.RecordCreated.payload = { $ref: '#/components/schemas/Event' };

  const findings = await sourceFindings(document);
  assert.equal(findings.length, 1);
});

test('an externally referenced AsyncAPI payload schema enforces source URI-reference shape', async () => {
  const findings = (await lintFile(
    spectral,
    join(HERE, 'source-identity-fixtures/asyncapi-external.yaml'),
  )).filter(({ code }) => code === 'govstack-16.4-async');
  assert.equal(findings.length, 1);
});

test('existing envelope rules reject a missing source declaration', async () => {
  const openapi = openApiDocument('urn:govstack:registry');
  openapi.webhooks.recordCreated.post.requestBody.content['application/cloudevents+json'].schema.required = [
    'specversion',
    'id',
    'type',
    'data',
  ];
  const openapiFindings = await lintString(spectral, JSON.stringify(openapi));
  assert.ok(openapiFindings.some(({ code }) => code === 'govstack-16.2'));

  const asyncapi = asyncApiDocument('urn:govstack:registry');
  asyncapi.components.messages.RecordCreated.payload.required = ['specversion', 'id', 'type', 'data'];
  const asyncapiFindings = await lintString(spectral, JSON.stringify(asyncapi));
  assert.ok(asyncapiFindings.some(({ code }) => code === 'govstack-17.6'));
});
