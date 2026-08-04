// Direct unit tests of the shared custom functions. These import the ESM
// default exports and call them with crafted inputs — no Spectral runtime — so
// they pin each function's contract, cycle-safety and bad-input behaviour.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import valuePattern from '../functions/valuePattern.js';
import schemaPropertyNames from '../functions/schemaPropertyNames.js';
import schemaDescriptions from '../functions/schemaDescriptions.js';
import responseHeaderRequired from '../functions/responseHeaderRequired.js';
import operationResponses from '../functions/operationResponses.js';
import pathSegments from '../functions/pathSegments.js';
import envelopeShape from '../functions/envelopeShape.js';
import securityCoverage from '../functions/securityCoverage.js';
import schemaFieldFormat from '../functions/schemaFieldFormat.js';
import extensionShape from '../functions/extensionShape.js';
import mediaTypeExpected from '../functions/mediaTypeExpected.js';
import successResponseSchema from '../functions/s07-successResponseSchema.js';
import creationResponses from '../functions/s07-creationResponses.js';
import baselineResponses from '../functions/s07-baselineResponses.js';
import { walkSchema } from '../functions/lib/schemaWalk.js';

const count = (r) => (r === undefined ? 0 : r.length);

// Every function must tolerate junk input and return undefined, never throw.
const ALL = {
  valuePattern,
  schemaPropertyNames,
  schemaDescriptions,
  responseHeaderRequired,
  operationResponses,
  pathSegments,
  envelopeShape,
  securityCoverage,
  schemaFieldFormat,
  extensionShape,
  mediaTypeExpected,
  successResponseSchema,
  creationResponses,
  baselineResponses,
};
test('all functions return undefined on bad input, never throw', () => {
  for (const [name, fn] of Object.entries(ALL)) {
    for (const junk of [undefined, null, 42, 'str', [], true]) {
      assert.equal(fn(junk, {}, { path: [] }), undefined, `${name}(${JSON.stringify(junk)})`);
    }
  }
});

test('valuePattern: match / notMatch / forbidPattern', () => {
  assert.equal(count(valuePattern('1.2.3', { match: '^\\d+\\.\\d+\\.\\d+$' })), 0);
  assert.equal(count(valuePattern('v1', { match: '^\\d+\\.\\d+\\.\\d+$' })), 1);
  assert.equal(count(valuePattern('http://localhost/x', { forbidPattern: 'localhost' })), 1);
  assert.equal(count(valuePattern('https://gw/x', { notMatch: 'localhost' })), 0);
  assert.equal(valuePattern(123, { match: 'x' }), undefined);
});

test('schemaPropertyNames: casing + forbidPattern + cycle safety', () => {
  const schema = {
    type: 'object',
    properties: {
      goodName: { type: 'string' },
      Bad_Name: { type: 'string' },
      nested: { type: 'object', properties: { alsoBad: { type: 'string' }, 'has space': {} } },
    },
  };
  const camel = schemaPropertyNames(schema, { casing: 'camel' }, { path: ['x'] });
  // Bad_Name and 'has space' violate camel; nested/alsoBad is fine.
  assert.equal(count(camel), 2);
  assert.ok(camel[0].path[0] === 'x', 'context.path is prefixed onto finding path');

  const spaces = schemaPropertyNames(schema, { forbidPattern: '\\s' });
  assert.equal(count(spaces), 1); // only 'has space'

  // circular schema must terminate
  const cyc = { type: 'object', properties: { Bad: { type: 'string' } } };
  cyc.properties.self = cyc;
  const res = schemaPropertyNames(cyc, { casing: 'camel' });
  assert.equal(count(res), 1); // 'Bad'; 'self' is fine; walk terminates
});

test('schemaDescriptions: properties vs all mode', () => {
  const schema = {
    type: 'object',
    description: 'root',
    properties: { a: { type: 'string', description: 'A' }, b: { type: 'string' } },
  };
  assert.equal(count(schemaDescriptions(schema, {})), 1); // b lacks description
  assert.equal(count(schemaDescriptions(schema, { mode: 'all' })), 1); // b node
  const noRoot = { type: 'object', properties: { a: { type: 'string', description: 'A' } } };
  assert.equal(count(schemaDescriptions(noRoot, { includeRoot: true })), 1); // root
});

test('responseHeaderRequired: header presence + companion status', () => {
  const responses = {
    '201': { description: 'created' },
    '200': { description: 'ok', headers: { Location: {} } },
  };
  assert.equal(count(responseHeaderRequired(responses, { status: '201', headers: ['Location'] })), 1);
  assert.equal(count(responseHeaderRequired(responses, { status: '200', headers: ['location'] })), 0); // case-insensitive
  assert.equal(
    count(responseHeaderRequired(responses, { status: '2xx', headers: ['ETag'], alsoRequireStatus: '304' })),
    3, // 201 + 200 lack ETag, and no 304 present
  );
  assert.equal(count(responseHeaderRequired({}, { status: '201', headers: ['Location'], requireStatus: true })), 1);
});

test('operationResponses: require / forbid / counts', () => {
  const op = { responses: { '200': {}, '404': {} } };
  assert.equal(count(operationResponses(op, { require: ['500'] })), 1);
  assert.equal(count(operationResponses(op, { require: ['2xx', '4xx'] })), 0);
  assert.equal(count(operationResponses({ responses: { '200': {}, '201': {} } }, { forbid: ['201'] })), 1);
  assert.equal(count(operationResponses({ responses: { '200': {} } }, { minNonSuccess: 1 })), 1);
  assert.equal(count(operationResponses({ responses: { '200': {} } }, { minCount: 2 })), 1);
  assert.equal(count(operationResponses({}, { require: ['500'] })), 1); // no responses object
});

test('pathSegments: version prefix / casing / depth', () => {
  const paths = {
    '/v1/account-holders': {},
    '/accounts': {},
    '/v1/Bad_Segment': {},
    // 3 raw segments but only 2 NON-PARAM levels (accounts, transactions):
    // `{param}` segments do not count, so this must NOT fire 5.4.
    '/v1/accounts/{id}/transactions/{txId}': {},
    // 3 non-param levels (accounts, transactions, lines): must fire 5.4.
    '/v1/accounts/{id}/transactions/{txId}/lines': {},
  };
  assert.equal(count(pathSegments(paths, { check: 'versionPrefix' })), 1); // /accounts
  assert.equal(count(pathSegments(paths, { check: 'versionPrefix', exemptPaths: ['/accounts'] })), 0); // 5.9 exemption
  assert.equal(count(pathSegments(paths, { check: 'segmentCasing', casing: 'kebab' })), 1); // Bad_Segment
  assert.equal(count(pathSegments(paths, { check: 'maxDepthAfterVersion', max: 2 })), 1); // only the 3-non-param-level path
});

test('envelopeShape: required / nested / const / enum / allOf', () => {
  const page = {
    type: 'object',
    required: ['items', 'pageInfo'],
    properties: {
      items: { type: 'array' },
      pageInfo: { type: 'object', required: ['nextCursor', 'hasMore'], properties: { nextCursor: {}, hasMore: {} } },
    },
  };
  assert.equal(
    count(envelopeShape(page, { requiredProperties: ['items', 'pageInfo'], properties: { pageInfo: { requiredProperties: ['nextCursor', 'hasMore'] } } })),
    0,
  );
  const bad = { type: 'object', required: ['items'], properties: { items: { type: 'array' } } };
  assert.ok(count(envelopeShape(bad, { requiredProperties: ['items', 'pageInfo'] })) >= 1);

  const event = { type: 'object', properties: { specversion: { const: '1.0' }, type: { const: 'x' } } };
  assert.equal(count(envelopeShape(event, { properties: { specversion: { const: '1.0' } } })), 0);
  assert.equal(count(envelopeShape(event, { properties: { specversion: { const: '2.0' } } })), 1);

  const status = { type: 'string', enum: ['PENDING', 'DONE'] };
  assert.equal(count(envelopeShape(status, { enum: ['PENDING', 'DONE'] })), 0);
  assert.equal(count(envelopeShape(status, { enum: ['PENDING', 'DONE', 'FAILED'] })), 1);

  const composed = { allOf: [{ required: ['a'], properties: { a: {} } }, { required: ['b'], properties: { b: {} } }] };
  assert.equal(count(envelopeShape(composed, { requiredProperties: ['a', 'b'] })), 0);
});

test('securityCoverage: covered vs none mode', () => {
  const doc = {
    security: [{ oauth: [] }],
    components: { securitySchemes: { oauth: {} } },
    paths: { '/v1/x': { get: {}, post: { security: [] } } },
  };
  assert.equal(count(securityCoverage(doc, {})), 0); // both covered (root + explicit override)

  const uncovered = { paths: { '/v1/x': { get: {} } } };
  assert.equal(count(securityCoverage(uncovered, {})), 1);
  assert.equal(count(securityCoverage(uncovered, { requireSchemes: true })), 2); // + missing schemes

  assert.equal(count(securityCoverage({ security: [{ a: [] }] }, { mode: 'none' })), 1);
  assert.equal(count(securityCoverage({ security: [] }, { mode: 'none' })), 0);
});

test('schemaFieldFormat: format / forbidType / mustDeclare', () => {
  const schema = {
    type: 'object',
    properties: {
      createdAt: { type: 'string' },
      updatedAt: { type: 'string', format: 'date-time' },
      amount: { type: 'number' },
      photo: { type: 'string' },
    },
  };
  assert.equal(count(schemaFieldFormat(schema, { namePattern: 'At$', require: { format: 'date-time' } })), 1); // createdAt
  assert.equal(count(schemaFieldFormat(schema, { namePattern: '^amount$', require: { forbidType: 'number' } })), 1);
  assert.equal(
    count(schemaFieldFormat(schema, { namePattern: '^photo$', require: { contentEncoding: 'base64', mustDeclare: ['maxLength'] } })),
    2,
  );
});

test('extensionShape: presence / enum / object shape / semver', () => {
  assert.equal(count(extensionShape({}, { extension: 'x-govstack-delivery' })), 1); // required, absent
  assert.equal(count(extensionShape({ 'x-govstack-delivery': 'atLeastOnce' }, { extension: 'x-govstack-delivery', enum: ['atMostOnce', 'atLeastOnce', 'effectivelyOnce'] })), 0);
  assert.equal(count(extensionShape({ 'x-govstack-delivery': 'sometimes' }, { extension: 'x-govstack-delivery', enum: ['atMostOnce', 'atLeastOnce'] })), 1);

  const good = { 'x-govstack-api-guide': { version: '0.2.0' } };
  assert.equal(count(extensionShape(good, { extension: 'x-govstack-api-guide', valueType: 'object', requiredKeys: ['version'], semverKeys: ['version'] })), 0);
  const bad = { 'x-govstack-api-guide': { version: 'draft' } };
  assert.equal(count(extensionShape(bad, { extension: 'x-govstack-api-guide', valueType: 'object', requiredKeys: ['version'], semverKeys: ['version'] })), 1);
});

test('mediaTypeExpected: require / requireOneOf / forbid', () => {
  const content = { 'application/json': {}, 'application/problem+json': {} };
  assert.equal(count(mediaTypeExpected(content, { require: ['application/problem\\+json'] })), 0);
  assert.equal(count(mediaTypeExpected(content, { require: ['application/merge-patch\\+json'] })), 1);
  assert.equal(count(mediaTypeExpected(content, { requireOneOf: ['application/merge-patch\\+json', 'application/json'] })), 0);
  assert.equal(count(mediaTypeExpected({ 'text/plain': {} }, { forbid: ['text/plain'] })), 1);
});

test('successResponseSchema: declared success content requires schemas', () => {
  const bad = {
    paths: {
      '/v1/things': {
        get: { responses: { 200: { content: { 'application/json': {} } }, 204: {} } },
      },
    },
  };
  assert.equal(count(successResponseSchema(bad)), 1);
  bad.paths['/v1/things'].get.responses[200].content['application/json'].schema = { type: 'object' };
  assert.equal(count(successResponseSchema(bad)), 0);
});

test('creationResponses and baselineResponses use visible operation shape', () => {
  const doc = {
    security: [{ oauth: [] }],
    paths: {
      '/v1/things/{thingId}': {
        post: {
          operationId: 'createThing',
          requestBody: { content: {} },
          responses: { 200: {} },
        },
      },
    },
  };
  assert.equal(count(creationResponses(doc)), 1);
  assert.equal(count(baselineResponses(doc)), 3);
  doc.paths['/v1/things/{thingId}'].post.responses = { 201: {}, 400: {}, 401: {}, 404: {} };
  assert.equal(count(creationResponses(doc)), 0);
  assert.equal(count(baselineResponses(doc)), 0);
});

test('walkSchema: visits combinators and is cycle-safe', () => {
  const seen = [];
  const schema = {
    type: 'object',
    properties: { a: { type: 'string' } },
    allOf: [{ type: 'object', properties: { b: {} } }],
    items: { type: 'number' },
  };
  walkSchema(schema, (_node, path) => seen.push(path.join('/')));
  assert.ok(seen.includes('')); // root
  assert.ok(seen.includes('properties/a'));
  assert.ok(seen.includes('allOf/0'));
  assert.ok(seen.includes('items'));

  const cyc = { type: 'object' };
  cyc.items = cyc;
  let visits = 0;
  walkSchema(cyc, () => (visits += 1));
  assert.equal(visits, 1); // visited once, no infinite loop
});
