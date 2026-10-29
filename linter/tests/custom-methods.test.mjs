import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSpectral, lintString } from './_lint-helper.mjs';

const spectral = await makeSpectral();
const doc = (paths) => JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Collection operations', version: '1.0.0', description: 'Typed read operations.' },
  paths,
});
const response = (schema) => ({ description: 'Read result.', content: { 'application/json': { schema } } });
const page = {
  type: 'object', required: ['items', 'pageInfo'], properties: {
    items: { type: 'array', items: { type: 'object' } },
    pageInfo: { type: 'object', required: ['nextCursor'], properties: { nextCursor: { type: ['string', 'null'], minLength: 1 } } },
  },
};
const search = () => ({
  operationId: 'searchRecords',
  requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { pageSize: { type: 'integer' }, cursor: { type: 'string' } } } } } },
  responses: { 200: response(page) },
});
const selected = (findings, codes) => findings.filter((finding) => codes.includes(finding.code));
const searchRules = ['govstack-6.6', 'govstack-12.9-body', 'govstack-12.9-response'];

test('action sub-resource search receives status and pagination checks', async () => {
  const path = '/v1/households/search';
  assert.deepEqual(selected(await lintString(spectral, doc({ [path]: { post: search() } })), searchRules), []);
  const invalid = search();
  invalid.responses = { 201: response(page), 200: response({ type: 'object' }) };
  invalid.requestBody.content['application/json'].schema = { type: 'object' };
  const findings = selected(await lintString(spectral, doc({ [path]: { post: invalid } })), searchRules);
  assert.deepEqual(new Set(findings.map((finding) => finding.code)), new Set(searchRules));
});

const offsetPage = {
  type: 'object', required: ['items', 'offset', 'limit'], properties: {
    items: { type: 'array', items: { type: 'object' } },
    offset: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' },
  },
};
const searchWith = (body, schema) => {
  const operation = search();
  operation.requestBody.content['application/json'].schema = { type: 'object', properties: body };
  operation.responses = { 200: response(schema) };
  return operation;
};
const cursorBody = { pageSize: { type: 'integer' }, cursor: { type: 'string' } };
const offsetBody = { offset: { type: 'integer' }, limit: { type: 'integer' } };
const searchFindings = async (operation) => selected(
  await lintString(spectral, doc({ '/v1/households/search': { post: operation } })),
  ['govstack-12.9-body', 'govstack-12.9-response'],
);

test('search accepts the offset pagination contract of §12.6', async () => {
  assert.deepEqual(await searchFindings(searchWith(offsetBody, offsetPage)), []);
  const composed = searchWith({}, offsetPage);
  composed.requestBody.content['application/json'].schema = { allOf: [{ properties: { criteria: { type: 'object' } } }, { properties: offsetBody }] };
  assert.deepEqual(await searchFindings(composed), []);
});

test('search flags an incomplete body contract and a body/envelope mismatch', async () => {
  const codes = async (operation) => (await searchFindings(operation)).map((finding) => finding.code).sort();
  assert.deepEqual(await codes(searchWith({ offset: { type: 'integer' } }, offsetPage)), ['govstack-12.9-body']);
  assert.deepEqual(await codes(searchWith({ pageSize: { type: 'integer' } }, page)), ['govstack-12.9-body']);
  const neither = await searchFindings(searchWith({}, page));
  assert.equal(neither.length, 1);
  assert.match(neither[0].message, /offset/);
  assert.ok((await codes(searchWith(offsetBody, page))).includes('govstack-12.9-response'));
  assert.ok((await codes(searchWith(cursorBody, offsetPage))).includes('govstack-12.9-response'));
});

test('exact lookup sub-resource receives status checks without collection pagination', async () => {
  const lookup = { post: { operationId: 'lookupRecord', responses: { 200: response({ type: 'object' }) } } };
  const relevant = [...searchRules, 'govstack-12.1', 'govstack-12.2', 'govstack-12.3', 'govstack-12.4'];
  assert.deepEqual(selected(await lintString(spectral, doc({ '/v1/households/lookup': lookup })), relevant), []);
  lookup.post.responses = { 201: response({ type: 'object' }) };
  assert.ok(selected(await lintString(spectral, doc({ '/v1/households/lookup': lookup })), ['govstack-6.6']).length > 0);
});

const pathRules = ['govstack-5.2', 'govstack-5.3', 'govstack-5.4', 'govstack-5.7'];

test('search and lookup action sub-resources pass the bundled path rules', async () => {
  const good = await lintString(spectral, doc({
    '/v1/households/search': { post: search() },
    '/v1/households/lookup': { post: { responses: { 200: response({ type: 'object' }) } } },
  }));
  assert.deepEqual(selected(good, pathRules), []);
  const bad = await lintString(spectral, doc({
    '/v1/household/create': { post: { responses: { 201: response({ type: 'object' }) } } },
    '/v1/birthRegistrations/search': { post: search() },
  }));
  assert.deepEqual(new Set(selected(bad, pathRules).map((finding) => finding.code)), new Set(['govstack-5.2', 'govstack-5.3', 'govstack-5.7']));
});

test('colon custom methods are rejected with a pointer to action sub-resources', async () => {
  for (const path of ['/v1/households:search', '/v1/households:lookup', '/v1/events/{eventId}:cancel']) {
    const findings = selected(await lintString(spectral, doc({ [path]: { post: search() } })), ['govstack-5.3']);
    assert.equal(findings.length, 1, path);
    assert.match(findings[0].message, /action sub-resource/, path);
    assert.match(findings[0].message, /5\.8/, path);
  }
});

const paginationRules = ['govstack-12.1', 'govstack-12.2', 'govstack-12.3', 'govstack-12.4', 'govstack-12.6'];
const array = { type: 'array', items: { type: 'object' } };
const collectionFindings = async (schema, path = '/v1/households/{recordId}/members') => selected(
  await lintString(spectral, doc({ [path]: { get: { responses: { 200: response(schema) } } } })),
  paginationRules,
);

test('sub-resource GETs enforce pagination on direct and composed unbounded arrays', async () => {
  const schemas = [
    array,
    { allOf: [array] },
    { allOf: [{ allOf: [array] }] },
    { type: 'object', properties: { items: array } },
    { type: 'object', properties: { items: { allOf: [{ allOf: [array] }] } } },
    { allOf: [{ allOf: [{ properties: { items: { allOf: [array] } } }] }] },
  ];
  for (const schema of schemas) {
    const findings = await collectionFindings(schema);
    assert.deepEqual(
      new Set(findings.map((finding) => finding.code)),
      new Set(paginationRules.filter((code) => code !== 'govstack-12.6')),
      JSON.stringify(schema),
    );
  }
});

test('bounded collections retain their exemption through nested and split allOf declarations', async () => {
  for (const maxItems of [0, 40]) {
    const schemas = [
      { ...array, maxItems },
      { allOf: [{ allOf: [array] }, { maxItems }] },
      { type: 'object', properties: { items: { ...array, maxItems } } },
      { type: 'object', properties: { items: { allOf: [{ allOf: [array] }, { maxItems }] } } },
      { allOf: [
        { properties: { items: { allOf: [array] } } },
        { allOf: [{ properties: { items: { maxItems } } }] },
      ] },
    ];
    for (const schema of schemas) {
      for (const path of ['/v1/households/{recordId}/members', '/v1/households']) {
        assert.deepEqual(await collectionFindings(schema, path), [], JSON.stringify({ schema, path }));
      }
    }
  }
});

test('invalid bounds and additional unbounded arrays do not exempt a composed collection', async () => {
  const schemas = [-1, 1.5, '40', null].flatMap((maxItems) => [
    { ...array, maxItems },
    { allOf: [array, { maxItems }] },
    { properties: { items: { allOf: [array, { maxItems }] } } },
  ]);
  schemas.push({ allOf: [
    { properties: { items: { ...array, maxItems: 40 } } },
    { properties: { extras: { allOf: [array] } } },
  ] });
  for (const schema of schemas) {
    assert.ok((await collectionFindings(schema)).some((finding) => finding.code === 'govstack-12.1'), JSON.stringify(schema));
  }
});
