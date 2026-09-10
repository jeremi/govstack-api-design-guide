import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { LINTER_DIR, makeSpectral, lintString } from './_lint-helper.mjs';

const spectral = await makeSpectral();
const envelope = () => ({
  type: 'object',
  required: ['specversion', 'id', 'source', 'type'],
  properties: {
    specversion: { const: '1.0' },
    id: { type: 'string' },
    source: { type: 'string' },
    type: { const: 'org.example.registry.record.created' },
  },
});
const document = (payload, version = '3.0.0', schemas = {}, contentType = 'application/cloudevents+json') => ({
  asyncapi: version,
  info: { title: 'Registry events', version: '1.0.0' },
  channels: {
    records: { address: 'records/native/events', messages: { created: { $ref: '#/components/messages/RecordCreated' } } },
  },
  operations: {
    publish: { action: 'send', channel: { $ref: '#/channels/records' }, messages: [{ $ref: '#/channels/records/messages/created' }] },
  },
  components: { messages: { RecordCreated: { contentType, payload } }, schemas },
});
const eventFindings = async (doc) => (await lintString(
  spectral, JSON.stringify(doc), resolve(LINTER_DIR, '../../api/asyncapi.yaml'),
)).filter(({ code }) => ['govstack-17.6', 'govstack-17.7', 'invalid-ref'].includes(code));

for (const version of ['3.0.0', '3.1.0']) {
  test(`local CloudEvents envelopes are accepted in AsyncAPI ${version}`, async () => {
    for (const payload of [envelope(), { $ref: '#/components/schemas/LocalEvent' }, { allOf: [{ allOf: [envelope()] }] }]) {
      assert.deepEqual(await eventFindings(document(payload, version, { LocalEvent: envelope() })), []);
    }
  });

  test(`invalid local event payloads remain rejected by 17.6 in AsyncAPI ${version}`, async () => {
    const invalid = { type: 'object', properties: { recordId: { type: 'string' } } };
    for (const payload of [invalid, { $ref: '#/components/schemas/CloudEventEnvelope' }, { allOf: [{ $ref: '#/components/schemas/CloudEventEnvelope' }] }]) {
      const findings = await eventFindings(document(payload, version, { CloudEventEnvelope: invalid }));
      assert.ok(findings.some(({ code }) => code === 'govstack-17.6'));
      assert.ok(findings.every(({ code }) => code === 'govstack-17.6'));
    }
  });
}

const sharedError = { $ref: './common/govstack-asyncapi-common.yaml#/components/schemas/GovStackAsyncError' };
const inlineError = { type: 'object', required: ['code', 'traceId'], properties: { code: { type: 'string' }, traceId: { type: 'string' } } };
const wrapped = (error) => ({ allOf: [envelope(), { properties: { data: error } }] });

test('bare and CloudEvents-wrapped errors can reuse the vendored error schema', async () => {
  assert.deepEqual(await eventFindings(document(sharedError, '3.0.0', {}, 'application/json')), []);
  assert.deepEqual(await eventFindings(document(wrapped(sharedError))), []);
});

test('bare and CloudEvents-wrapped inline errors still require shared error reuse', async () => {
  for (const doc of [document(inlineError, '3.0.0', {}, 'application/json'), document(wrapped(inlineError))]) {
    const findings = await eventFindings(doc);
    assert.deepEqual(findings.map(({ code }) => code), ['govstack-17.7']);
  }
});

test('explicit common envelope reuse remains vendored', async () => {
  const shared = { allOf: [{ $ref: './common/govstack-asyncapi-common.yaml#/components/schemas/CloudEventEnvelope' }] };
  assert.deepEqual(await eventFindings(document(shared)), []);
});

test('subscription CRUD checks apply to exposed subscription management', async () => {
  const doc = { openapi: '3.1.0', info: { title: 'Publisher', version: '1.0.0' }, paths: {} };
  const findings = async () => (await lintString(spectral, JSON.stringify(doc))).filter(({ code }) => code === 'govstack-16.11');
  assert.deepEqual(await findings(), []);
  doc.paths['/v1/subscriptions'] = { get: { responses: { 200: { description: 'Subscriptions' } } } };
  assert.equal((await findings()).length, 1);
});

test('local envelope schemas declare required fields and restrict specversion to 1.0', async () => {
  for (const specversion of [undefined, {}, { type: 'string' }, { const: '0.3' }, { enum: ['1.0', '0.3'] }]) {
    const payload = envelope();
    payload.properties.specversion = specversion;
    const findings = await eventFindings(document(payload));
    assert.ok(findings.some(({ code }) => code === 'govstack-17.6'), JSON.stringify(specversion));
  }
  for (const name of ['id', 'source', 'type']) {
    const payload = envelope();
    delete payload.properties[name];
    assert.ok((await eventFindings(document(payload))).some(({ code }) => code === 'govstack-17.6'), name);
  }
});

test('singleton enum and split conjunction constraints preserve valid local envelopes', async () => {
  for (const specversion of [{ enum: ['1.0'] }, { allOf: [{ type: 'string' }, { allOf: [{ enum: ['1.0'] }] }] }]) {
    const payload = envelope();
    payload.properties.specversion = specversion;
    assert.deepEqual(await eventFindings(document(payload)), []);
  }
  const base = envelope();
  base.properties.specversion = { type: 'string' };
  for (const allOf of [[base, { properties: { specversion: { const: '1.0' } } }], [{ properties: { specversion: { enum: ['1.0'] } } }, base]]) {
    assert.deepEqual(await eventFindings(document({ allOf: [{ allOf }] })), []);
  }
  const contradictory = { allOf: [envelope(), { properties: { specversion: { const: '0.3' } } }] };
  assert.ok((await eventFindings(document(contradictory))).some(({ code }) => code === 'govstack-17.6'));
});
