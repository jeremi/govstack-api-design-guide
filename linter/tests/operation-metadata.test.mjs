// Guide 4.7 applies to AsyncAPI operations and messages as well as OpenAPI
// operations. The fixture runner covers the OpenAPI side; this pins the
// AsyncAPI side through the shipping ruleset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSpectral, lintString, RULESET_PATH } from './_lint-helper.mjs';

const spectral = await makeSpectral(RULESET_PATH);

const asyncDoc = ({ operation = {}, message = {} } = {}) => ({
  asyncapi: '3.0.0',
  info: { title: 'Registry events', version: '1.0.0', description: 'Events.' },
  channels: {
    records: { address: 'records', messages: { created: { $ref: '#/components/messages/RecordCreated' } } },
  },
  operations: {
    receiveRecord: { action: 'receive', channel: { $ref: '#/channels/records' }, ...operation },
  },
  components: { messages: { RecordCreated: { payload: { type: 'object' }, ...message } } },
});

const findings47 = async (doc) =>
  (await lintString(spectral, JSON.stringify(doc), 'events.asyncapi.json')).filter(
    (f) => f.code === 'govstack-4.7',
  );

test('4.7 accepts well-formed metadata on AsyncAPI operations and messages', async () => {
  const doc = asyncDoc({
    operation: { 'x-govstack-use-case': 'UC-C-PIC-A-001', 'x-govstack-pii': true },
    message: { 'x-govstack-use-case': ['UC-C-PIC-A-001'], 'x-govstack-pii': false },
  });
  assert.deepEqual(await findings47(doc), []);
});

test('4.7 rejects malformed metadata on AsyncAPI operations and messages', async () => {
  const doc = asyncDoc({
    operation: { 'x-govstack-use-case': [] },
    message: { 'x-govstack-pii': 'true' },
  });
  const findings = await findings47(doc);
  const paths = findings.map((f) => f.path.join('/')).sort();
  assert.ok(paths.some((p) => p.startsWith('operations/receiveRecord')), JSON.stringify(paths));
  assert.ok(paths.some((p) => p.startsWith('components/messages/RecordCreated')), JSON.stringify(paths));
});
