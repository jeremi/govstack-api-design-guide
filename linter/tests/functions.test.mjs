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
import pluralSegment from '../functions/s05-pluralNoun.js';
import actionVerbSegment from '../functions/s05-actionVerbs.js';
import bulkMutationSelection from '../functions/s06-bulkMutationSelection.js';
import envelopeShape from '../functions/envelopeShape.js';
import securityCoverage from '../functions/securityCoverage.js';
import schemaFieldFormat from '../functions/schemaFieldFormat.js';
import extensionShape from '../functions/extensionShape.js';
import mediaTypeExpected from '../functions/mediaTypeExpected.js';
import successResponseSchema from '../functions/s07-successResponseSchema.js';
import creationResponses from '../functions/s07-creationResponses.js';
import baselineResponses from '../functions/s07-baselineResponses.js';
import etagValidator from '../functions/s07-etagValidator.js';
import rateLimitHeaders from '../functions/s08-rateLimitHeaders.js';
import bbCode from '../functions/s09-bbCode.js';
import fieldErrors from '../functions/s11-fieldErrors.js';
import problemType from '../functions/s11-problemType.js';
import collectionPagination from '../functions/s12-collectionPagination.js';
import fieldsParam from '../functions/s12-fieldsParam.js';
import callbackUrl from '../functions/s15-callbackUrl.js';
import operationMetadata from '../functions/s04-operationMetadata.js';
import customHeaderPlacement from '../functions/s08-customHeaderPlacement.js';
import schemeExists from '../functions/s13-schemeExists.js';
import cloudEventsPayload from '../functions/s17-cloudEventsPayload.js';
import bodyExamplesAndEnums from '../functions/s04-bodyExamplesEnums.js';
import s09EnumCasing from '../functions/s09-enumCasing.js';
import s09ClosedEnum from '../functions/s09-closedEnum.js';
import { walkSchema } from '../functions/lib/schemaWalk.js';
import { isStandardUnversionedPath } from '../functions/lib/standardEndpoints.js';

const count = (r) => (r === undefined ? 0 : r.length);

// Every function must tolerate junk input and return undefined, never throw.
const ALL = {
  valuePattern,
  schemaPropertyNames,
  schemaDescriptions,
  responseHeaderRequired,
  operationResponses,
  pathSegments,
  pluralSegment,
  actionVerbSegment,
  bulkMutationSelection,
  envelopeShape,
  securityCoverage,
  schemaFieldFormat,
  extensionShape,
  mediaTypeExpected,
  successResponseSchema,
  creationResponses,
  baselineResponses,
  etagValidator,
  rateLimitHeaders,
  bbCode,
  fieldErrors,
  problemType,
  collectionPagination,
  fieldsParam,
  callbackUrl,
  operationMetadata,
  customHeaderPlacement,
  schemeExists,
  cloudEventsPayload,
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

  const assertion = {
    type: 'object',
    description: 'A schema that rejects a prohibited property.',
    not: { required: ['prohibitedField'] },
  };
  assert.equal(count(schemaDescriptions(assertion, { mode: 'all' })), 0);
});

test('schemaDescriptions: branches narrowing a described property inherit its description', () => {
  const selector = {
    type: 'object',
    description: 'A typed selector.',
    properties: {
      kind: { type: 'string', description: 'Selector name.' },
      values: { type: 'object', description: 'Selector values.' },
    },
    oneOf: [
      { description: 'By number.', properties: { kind: { const: 'byNumber' } } },
      { description: 'By name.', properties: { kind: { const: 'byName' } } },
    ],
    if: { description: 'Number selector.', properties: { kind: { const: 'byNumber' } } },
  };
  assert.equal(count(schemaDescriptions(selector, { mode: 'all' })), 0);

  const nested = {
    type: 'object',
    description: 'Wrapper.',
    properties: { inner: selector },
  };
  assert.equal(count(schemaDescriptions(nested, { mode: 'all' })), 0);

  // A branch-only property, or a narrowing of an undescribed property, still
  // needs its own description.
  const undocumented = {
    type: 'object',
    description: 'A typed selector.',
    properties: { kind: { type: 'string' } },
    anyOf: [{ description: 'Extra.', properties: { kind: { const: 'a' }, extra: { type: 'string' } } }],
  };
  const findings = schemaDescriptions(undocumented, { mode: 'all' }, { path: ['s'] });
  assert.deepEqual(
    findings.map((finding) => finding.path),
    [['s', 'properties', 'kind'], ['s', 'anyOf', 0, 'properties', 'kind'], ['s', 'anyOf', 0, 'properties', 'extra']],
  );
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

test('etagValidator: single-resource GETs declare ETag and 304; collections are exempt', () => {
  const ctx = { path: ['paths', '/v1/things/{thingId}', 'get'] };
  const json = (schema) => ({ content: { 'application/json': { schema } } });
  const thing = { type: 'object', properties: { thingId: { type: 'string' } } };

  const bare = etagValidator({ responses: { '200': json(thing) } }, {}, ctx);
  assert.deepEqual(
    bare.map((finding) => finding.path),
    [
      ['paths', '/v1/things/{thingId}', 'get', 'responses', '200'],
      ['paths', '/v1/things/{thingId}', 'get', 'responses'],
    ],
  );
  const conditional = {
    responses: { '200': { headers: { ETag: {} }, ...json(thing) }, '304': { description: 'unchanged' } },
  };
  assert.equal(count(etagValidator(conditional, {}, ctx)), 0);
  assert.equal(count(etagValidator({ responses: { '200': { description: 'no body' } } }, {}, ctx)), 2);

  const page = { type: 'object', properties: { items: { type: 'array' }, pageInfo: { type: 'object' } } };
  const composedPage = { allOf: [{ properties: { items: { type: 'array' } } }, { required: ['items'] }] };
  for (const schema of [page, composedPage, { type: 'array', items: thing }]) {
    assert.equal(count(etagValidator({ responses: { '200': json(schema) } }, {}, ctx)), 0);
  }
  const ldPage = { responses: { '200': { content: { 'application/ld+json': { schema: page } } } } };
  assert.equal(count(etagValidator(ldPage, {}, ctx)), 0);
});

test('rateLimitHeaders: 429 declares Retry-After; RateLimit is optional; legacy names flagged', () => {
  assert.equal(count(rateLimitHeaders({ '200': {}, '429': { headers: { 'Retry-After': {} } } }, {})), 0);
  assert.deepEqual(
    rateLimitHeaders({ '200': {}, '429': {} }, {}, { path: ['r'] }),
    [{ message: '429 response must declare a "Retry-After" header', path: ['r', '429'] }],
  );
  assert.equal(count(rateLimitHeaders({ '200': {} }, {})), 0);
  const legacy = { '200': { headers: { 'RateLimit-Limit': {}, RateLimit: {} } } };
  assert.equal(count(rateLimitHeaders(legacy, { forbidLegacy: true })), 1);
  assert.equal(count(rateLimitHeaders(legacy, {})), 0);
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
  assert.equal(count(pathSegments(paths, { check: 'versionPrefix', exemptPaths: ['/accounts'] })), 0); // explicit path override
  assert.equal(count(pathSegments(paths, { check: 'segmentCasing', casing: 'kebab' })), 1); // Bad_Segment
  assert.equal(count(pathSegments(paths, { check: 'maxDepthAfterVersion', max: 2 })), 1); // only the 3-non-param-level path
});

test('isStandardUnversionedPath: the 5.10 closed set', () => {
  for (const p of ['/health', '/ready', '/openapi.json', '/asyncapi.json', '/.well-known/oauth-protected-resource']) {
    assert.equal(isStandardUnversionedPath(p), true, p);
  }
  for (const p of ['/v1/health', '/healthz', '/well-known/jwks.json', '/', '', 42, undefined]) {
    assert.equal(isStandardUnversionedPath(p), false, String(p));
  }
});

test('pathSegments: standard unversioned endpoints are exempt (5.10) and read-only', () => {
  const paths = {
    '/health': { get: {}, delete: {} },
    '/.well-known/oauth-protected-resource': { get: {}, post: {} },
    '/v1/things': { get: {}, post: {} },
  };
  // The 5.10 set sits outside /v{N}/ by design, and `.well-known` is not kebab.
  assert.equal(count(pathSegments(paths, { check: 'versionPrefix' })), 0);
  assert.equal(count(pathSegments(paths, { check: 'segmentCasing', casing: 'kebab' })), 0);
  // They are read-only: a mutating method there is a business resource in hiding.
  const readOnly = pathSegments(paths, { check: 'standardEndpointsReadOnly' });
  assert.deepEqual(readOnly.map((r) => r.path.join(' ')).sort(), [
    '/.well-known/oauth-protected-resource post',
    '/health delete',
  ]);
});

test('s12-collectionPagination: 5.10 and maxItems carve-outs, pageParam, pageSizeBounds', () => {
  const ctx = (pathKey) => ({ path: ['paths', pathKey, 'get'] });
  const withSchema = (schema, parameters) => ({
    ...(parameters ? { parameters } : {}),
    responses: { 200: { content: { 'application/json': { schema } } } },
  });
  const unbounded = withSchema({ type: 'object', properties: { items: { type: 'array' } } });

  // An unpaginated, unbounded collection fires both 12.1 and 12.4...
  assert.equal(count(collectionPagination(unbounded, { mode: 'pageParam' }, ctx('/v1/things'))), 1);
  assert.equal(count(collectionPagination(unbounded, { mode: 'pageSizeBounds' }, ctx('/v1/things'))), 1);
  // ...unless the path is a standard unversioned endpoint, which is not a collection...
  assert.equal(count(collectionPagination(unbounded, { mode: 'pageParam' }, ctx('/health'))), 0);
  assert.equal(count(collectionPagination(unbounded, { mode: 'pageSizeBounds' }, ctx('/health'))), 0);
  // ...or the response bounds every array it returns with maxItems (12.1).
  const bounded = withSchema({ type: 'object', properties: { items: { type: 'array', maxItems: 40 } } });
  assert.equal(count(collectionPagination(bounded, { mode: 'pageParam' }, ctx('/v1/locales'))), 0);
  // One unbounded array is enough to make the whole response unbounded.
  const halfBounded = withSchema({
    type: 'object',
    properties: { items: { type: 'array', maxItems: 40 }, extras: { type: 'array' } },
  });
  assert.equal(count(collectionPagination(halfBounded, { mode: 'pageParam' }, ctx('/v1/locales'))), 1);

  // 12.1 is satisfied by either cursor or offset pagination (12.6).
  const offset = withSchema({ type: 'object' }, [{ name: 'offset' }, { name: 'limit' }]);
  assert.equal(count(collectionPagination(offset, { mode: 'pageParam' }, ctx('/v1/things'))), 0);
  // 12.4 wants both bounds on pageSize, not just its presence.
  const noMaximum = withSchema({ type: 'object' }, [{ name: 'pageSize', schema: { default: 20 } }]);
  assert.equal(count(collectionPagination(noMaximum, { mode: 'pageSizeBounds' }, ctx('/v1/things'))), 1);
  const bothBounds = withSchema({ type: 'object' }, [{ name: 'pageSize', schema: { default: 20, maximum: 100 } }]);
  assert.equal(count(collectionPagination(bothBounds, { mode: 'pageSizeBounds' }, ctx('/v1/things'))), 0);

  const cursorParams = [{ name: 'pageSize' }, { name: 'cursor' }];
  const cursorEnvelope = withSchema({
    type: 'object',
    required: ['items', 'pageInfo'],
    properties: {
      items: { type: 'array' },
      pageInfo: {
        type: 'object',
        required: ['nextCursor'],
        properties: {
          nextCursor: { type: ['string', 'null'], minLength: 1 },
        },
      },
    },
  }, cursorParams);
  assert.equal(count(collectionPagination(cursorEnvelope, { mode: 'cursorEnvelope' }, ctx('/v1/things'))), 0);

  const nonNullable = structuredClone(cursorEnvelope);
  nonNullable.responses[200].content['application/json'].schema.properties.pageInfo.properties.nextCursor = {
    type: 'string',
    minLength: 1,
  };
  assert.equal(count(collectionPagination(nonNullable, { mode: 'cursorEnvelope' }, ctx('/v1/things'))), 1);

  const permitsIntegerCursor = structuredClone(cursorEnvelope);
  permitsIntegerCursor.responses[200].content['application/json'].schema.properties.pageInfo.properties.nextCursor = {
    type: ['string', 'null', 'integer'],
    minLength: 1,
  };
  assert.equal(count(collectionPagination(permitsIntegerCursor, { mode: 'cursorEnvelope' }, ctx('/v1/things'))), 1);

  const permitsIntegerBranch = structuredClone(cursorEnvelope);
  permitsIntegerBranch.responses[200].content['application/json'].schema.properties.pageInfo.properties.nextCursor = {
    anyOf: [
      { type: 'string', minLength: 1 },
      { type: 'null' },
      { type: 'integer' },
    ],
  };
  assert.equal(count(collectionPagination(permitsIntegerBranch, { mode: 'cursorEnvelope' }, ctx('/v1/things'))), 1);

  const declaresHasMore = structuredClone(cursorEnvelope);
  declaresHasMore.responses[200].content['application/json'].schema.properties.pageInfo.properties.hasMore = {
    type: 'boolean',
  };
  assert.equal(count(collectionPagination(declaresHasMore, { mode: 'cursorEnvelope' }, ctx('/v1/things'))), 1);
});

test('s09-bbCode: canonical problem-type URIs participate in the single-code check', () => {
  const consistent = {
    security: [{ oauth: ['bb:registry:records:read'] }],
    example: { type: 'https://govstack.global/problems/registry/record-not-found' },
  };
  assert.equal(count(bbCode(consistent)), 0);

  const inconsistent = structuredClone(consistent);
  inconsistent.example.type = 'https://govstack.global/problems/payments/record-not-found';
  assert.equal(count(bbCode(inconsistent)), 1);

  const malformed = {
    example: { type: 'https://govstack.global/problems/Registry/record-not-found' },
  };
  assert.equal(count(bbCode(malformed)), 1);
});

test('s11-fieldErrors: non-field problems are ignored and opted-in errors require pointer/message', () => {
  const ordinaryProblem = {
    type: 'object',
    required: ['type', 'title', 'status', 'traceId'],
    properties: { type: {}, title: {}, status: {}, traceId: {} },
  };
  assert.equal(fieldErrors(ordinaryProblem), undefined);

  const valid = {
    allOf: [
      ordinaryProblem,
      {
        required: ['errors'],
        properties: {
          errors: {
            type: 'array',
            items: {
              required: ['pointer', 'message'],
              properties: { pointer: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
    ],
  };
  assert.equal(count(fieldErrors(valid)), 0);

  const invalid = structuredClone(valid);
  invalid.allOf[1].properties.errors.items.required = ['pointer'];
  delete invalid.allOf[1].properties.errors.items.properties.message;
  assert.equal(count(fieldErrors(invalid)), 2);
});

test('s11-problemType: validates literal media-type examples only when present', () => {
  const good = {
    example: {
      type: 'https://govstack.global/problems/registry/record-not-found',
      title: 'Not found',
    },
  };
  assert.equal(count(problemType(good)), 0);
  good.example.type = 'https://docs.example.gov/problems/not-found';
  assert.equal(count(problemType(good)), 1);
  assert.equal(problemType({ schema: { type: 'object' } }), undefined);
});

test('s13-schemeExists: types / oauthFlows / httpBearerFormats', () => {
  const doc = (schemes) => ({ components: { securitySchemes: schemes } });
  const citizen = { types: ['openIdConnect', 'oauth2'], httpBearerFormats: ['JWT'] };
  assert.equal(count(schemeExists(doc({ a: { type: 'openIdConnect' } }), citizen)), 0);
  // A resource server that only validates tokens issued elsewhere declares
  // http bearer + JWT rather than misdescribing itself with an oauth2 flow.
  assert.equal(count(schemeExists(doc({ a: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }), citizen)), 0);
  // An opaque bearer token or basic auth is not that profile.
  assert.equal(count(schemeExists(doc({ a: { type: 'http', scheme: 'bearer' } }), citizen)), 1);
  assert.equal(count(schemeExists(doc({ a: { type: 'http', scheme: 'basic' } }), citizen)), 1);

  const service = { types: ['mutualTLS'], oauthFlows: ['clientCredentials'] };
  assert.equal(count(schemeExists(doc({ a: { type: 'mutualTLS' } }), service)), 0);
  assert.equal(count(schemeExists(doc({ a: { type: 'oauth2', flows: { clientCredentials: {} } } }), service)), 0);
  assert.equal(count(schemeExists(doc({ a: { type: 'oauth2', flows: { authorizationCode: {} } } }), service)), 1);
  assert.equal(count(schemeExists(doc({}), service)), 1);
});

test('envelopeShape: required / nested / const / enum / allOf', () => {
  const page = {
    type: 'object',
    required: ['items', 'pageInfo'],
    properties: {
      items: { type: 'array' },
      pageInfo: { type: 'object', required: ['nextCursor'], properties: { nextCursor: {} } },
    },
  };
  assert.equal(
    count(envelopeShape(page, { requiredProperties: ['items', 'pageInfo'], properties: { pageInfo: { requiredProperties: ['nextCursor'] } } })),
    0,
  );
  const bad = { type: 'object', required: ['items'], properties: { items: { type: 'array' } } };
  assert.ok(count(envelopeShape(bad, { requiredProperties: ['items', 'pageInfo'] })) >= 1);
  assert.equal(count(envelopeShape(bad, { forbiddenProperties: ['items'] })), 1);

  const event = { type: 'object', properties: { specversion: { const: '1.0' }, type: { const: 'x' } } };
  assert.equal(count(envelopeShape(event, { properties: { specversion: { const: '1.0' } } })), 0);
  assert.equal(count(envelopeShape(event, { properties: { specversion: { const: '2.0' } } })), 1);

  const status = { type: 'string', enum: ['PENDING', 'DONE'] };
  assert.equal(count(envelopeShape(status, { enum: ['PENDING', 'DONE'] })), 0);
  assert.equal(count(envelopeShape(status, { enum: ['PENDING', 'DONE', 'FAILED'] })), 1);

  const composed = { allOf: [{ required: ['a'], properties: { a: {} } }, { required: ['b'], properties: { b: {} } }] };
  assert.equal(count(envelopeShape(composed, { requiredProperties: ['a', 'b'] })), 0);
});

test('envelopeShape: optionalProperties are validated only when declared', () => {
  const spec = { optionalProperties: { total: { type: 'integer' } } };
  assert.equal(count(envelopeShape({ type: 'object', properties: {} }, spec)), 0);
  assert.equal(count(envelopeShape({ type: 'object', properties: { total: { type: 'integer' } } }, spec)), 0);
  assert.equal(count(envelopeShape({ type: 'object', properties: { total: { type: 'string' } } }, spec)), 1);
  const composed = { allOf: [{ properties: { total: { type: 'number' } } }] };
  assert.equal(count(envelopeShape(composed, spec)), 1);
});

test('collectionPagination offsetEnvelope: total optional, integer when declared', () => {
  const op = (schema) => ({
    parameters: [{ name: 'offset', in: 'query' }],
    responses: { 200: { content: { 'application/json': { schema } } } },
  });
  const ctx = { path: ['paths', '/v1/foos', 'get'] };
  const envelope = (extra = {}, required = ['items', 'offset', 'limit']) => ({
    type: 'object',
    required,
    properties: { items: { type: 'array' }, offset: { type: 'integer' }, limit: { type: 'integer' }, ...extra },
  });
  assert.equal(count(collectionPagination(op(envelope()), { mode: 'offsetEnvelope' }, ctx)), 0);
  assert.equal(count(collectionPagination(op(envelope({ total: { type: 'integer' } })), { mode: 'offsetEnvelope' }, ctx)), 0);
  assert.equal(count(collectionPagination(op(envelope({ total: { type: 'string' } })), { mode: 'offsetEnvelope' }, ctx)), 1);
  assert.equal(count(collectionPagination(op(envelope({}, ['items', 'offset'])), { mode: 'offsetEnvelope' }, ctx)), 1);
});

test('fieldsParam: reserved fields query parameter shape and 400 response', () => {
  const op = (param, responses = { 200: {}, 400: {} }) => ({ parameters: param ? [param] : [], responses });
  const good = { name: 'fields', in: 'query', schema: { type: 'string' } };
  const paths = (operation, pathParams) => ({ '/v1/foos': { ...(pathParams ? { parameters: pathParams } : {}), get: operation } });
  const run = (p) => count(fieldsParam(p, {}, { path: ['paths'] }));
  assert.equal(run(paths(op(null, { 200: {} }))), 0); // no-op without fields
  assert.equal(run(paths(op(good))), 0);
  assert.equal(run(paths(op({ name: 'fields', in: 'header', schema: { type: 'integer' } }))), 0); // only query
  assert.equal(run(paths(op({ ...good, schema: { type: 'array', items: { type: 'string' } } }))), 1);
  assert.equal(run(paths(op({ ...good, schema: { type: 'string', enum: ['summary', 'full'] } }))), 1);
  assert.equal(run(paths(op({ ...good, required: true }))), 1);
  assert.equal(run(paths(op(good, { 200: {} }))), 1);
  assert.equal(run(paths(op(good, { 200: {}, '4XX': {} }))), 0);
  assert.equal(run(paths(op(null, { 200: {} }), [good])), 1); // path-level parameter applies
});

test('fieldsParam: array form serialised as a single comma-separated value', () => {
  const op = (param) => ({ parameters: [param], responses: { 200: {}, 400: {} } });
  const run = (param) => count(fieldsParam({ '/v1/foos': { get: op(param) } }, {}, { path: ['paths'] }));
  const arr = (items, extra = {}) => ({ name: 'fields', in: 'query', explode: false, schema: { type: 'array', items }, ...extra });
  assert.equal(run(arr({ type: 'string' })), 0);
  assert.equal(run(arr({ type: 'string', enum: ['name', 'status'] }, { style: 'form' })), 0); // enum on items allowed
  assert.equal(run(arr({ type: 'string' }, { explode: true })), 1);
  assert.equal(run(arr({ type: 'string' }, { explode: undefined })), 1); // form style explodes by default
  assert.equal(run(arr({ type: 'string' }, { style: 'pipeDelimited' })), 1);
  assert.equal(run(arr({ type: 'integer' })), 1);
  assert.equal(run(arr(undefined)), 1); // items must be declared strings
  assert.equal(run(arr({ type: 'string' }, { required: true })), 1);
  // allOf composition (a shared selection schema narrowed per deployment)
  const composed = {
    name: 'fields',
    in: 'query',
    explode: false,
    schema: {
      allOf: [
        { type: 'array', minItems: 1, items: { type: 'string' } },
        { type: 'array', items: { type: 'string', enum: ['legalName'] } },
      ],
    },
  };
  assert.equal(run(composed), 0);
  assert.equal(run({ ...composed, schema: { allOf: [...composed.schema.allOf, { type: 'string' }] } }), 1);
  // explode does not affect the string form
  assert.equal(run({ name: 'fields', in: 'query', explode: true, schema: { type: 'string' } }), 0);
});

test('callbackUrl: placement, callbacks, and format modes', () => {
  const body = (props) => ({
    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: props } } } },
  });
  const doc = (route, operation) => ({ paths: { [route]: { post: operation } } });
  const run = (d, mode) => count(callbackUrl(d, { mode }, { path: [] }));

  const inQuery = doc('/v1/exports', { parameters: [{ name: 'callbackUrl', in: 'query' }, { name: 'Callback-URL', in: 'header' }] });
  assert.equal(run(inQuery, 'placement'), 2);
  assert.equal(run(doc('/v1/exports', { parameters: [{ name: 'callback', in: 'path' }] }), 'placement'), 0);
  assert.equal(run({ components: { parameters: { Cb: { name: 'replyCallback', in: 'header' } } } }, 'placement'), 1);

  const uri = { callbackUrl: { type: 'string', format: 'uri' } };
  assert.equal(run(doc('/v1/exports', body(uri)), 'callbacks'), 1);
  assert.equal(run(doc('/v1/exports', { ...body(uri), callbacks: { done: {} } }), 'callbacks'), 0);
  assert.equal(run(doc('/v1/subscriptions', body(uri)), 'callbacks'), 0); // §16 subscriptions exempt
  assert.equal(run(doc('/v1/exports', body({ format: { type: 'string' } })), 'callbacks'), 0);

  assert.equal(run(doc('/v1/exports', body(uri)), 'format'), 0);
  assert.equal(run(doc('/v1/exports', body({ callbackUrl: { type: 'string' } })), 'format'), 1);
  assert.equal(run(doc('/v1/subscriptions', body({ callbackUrl: { type: 'string' } })), 'format'), 0);
});

test('operationMetadata: shape mode', () => {
  const run = (op) => count(operationMetadata(op, { mode: 'shape' }, { path: [] }));
  assert.equal(run({}), 0);
  assert.equal(run({ 'x-govstack-use-case': 'UC-C-PIC-A-001', 'x-govstack-pii': true }), 0);
  assert.equal(run({ 'x-govstack-use-case': ['UC-1', 'govstack-bb-x-fr#req-2'], 'x-govstack-pii': false }), 0);
  assert.equal(run({ 'x-govstack-use-case': '' }), 1);
  assert.equal(run({ 'x-govstack-use-case': [] }), 1);
  assert.equal(run({ 'x-govstack-use-case': ['ok', ''] }), 1);
  assert.equal(run({ 'x-govstack-use-case': 42 }), 1);
  assert.equal(run({ 'x-govstack-pii': 'yes' }), 1);
});

test('operationMetadata: piiApiKey mode', () => {
  const schemes = { key: { type: 'apiKey', in: 'header', name: 'Api-Key' }, oauth: { type: 'oauth2', flows: {} } };
  const doc = (op, security) => ({
    ...(security ? { security } : {}),
    components: { securitySchemes: schemes },
    paths: { '/v1/people': { get: op } },
  });
  const run = (d) => count(operationMetadata(d, { mode: 'piiApiKey' }, { path: [] }));
  assert.equal(run(doc({ 'x-govstack-pii': true }, [{ key: [] }])), 1);
  assert.equal(run(doc({ 'x-govstack-pii': true, security: [{ key: [] }] }, [{ oauth: [] }])), 1);
  assert.equal(run(doc({ 'x-govstack-pii': true, security: [{ oauth: [] }, { key: [] }] })), 1);
  assert.equal(run(doc({ 'x-govstack-pii': true, security: [{ oauth: [], key: [] }] })), 1);
  assert.equal(run(doc({ 'x-govstack-pii': true, security: [{ oauth: [] }] }, [{ key: [] }])), 0);
  assert.equal(run(doc({ 'x-govstack-pii': false }, [{ key: [] }])), 0);
  assert.equal(run(doc({}, [{ key: [] }])), 0);
});

test('customHeaderPlacement: flags business identifiers and callbacks in headers', () => {
  const doc = {
    paths: {
      '/v1/x': {
        parameters: [{ name: 'Tenant-Id', in: 'header' }],
        get: {
          parameters: [
            { name: 'GovStack-Client', in: 'header' },
            { name: 'OrgId', in: 'header' },
            { name: 'tenantId', in: 'query' },
          ],
          responses: { 200: { headers: { 'Customer-ID': {}, ETag: {} } } },
        },
      },
    },
    components: {
      parameters: { Cb: { name: 'Callback-Url', in: 'header' }, Nat: { name: 'National-Id', in: 'header' } },
      responses: { Ok: { headers: { 'Citizen_Id': {}, 'Retry-After': {} } } },
    },
  };
  assert.equal(count(customHeaderPlacement(doc, {}, { path: [] })), 6);
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
  assert.equal(count(extensionShape({}, { extension: 'x-example-mode' })), 1); // required, absent
  assert.equal(count(extensionShape({ 'x-example-mode': 'active' }, { extension: 'x-example-mode', enum: ['active', 'inactive'] })), 0);
  assert.equal(count(extensionShape({ 'x-example-mode': 'unknown' }, { extension: 'x-example-mode', enum: ['active', 'inactive'] })), 1);

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

test('walkSchema: skipKeys leaves those subtrees unvisited', () => {
  const shared = { type: 'string', enum: ['lookup'] };
  // Walk order reaches root.not before root.items, so a skipped subtree must
  // not claim a node that is also reachable elsewhere.
  const schema = { type: 'array', not: shared, items: { type: 'object', properties: { x: shared } } };
  const seen = [];
  walkSchema(schema, (_node, path) => seen.push(path.join('/')), { skipKeys: ['not'] });
  assert.ok(seen.includes('items/properties/x'));
  assert.ok(!seen.some((p) => p.split('/').includes('not')));

  const all = [];
  walkSchema(schema, (_node, path) => all.push(path.join('/')));
  assert.ok(all.includes('not')); // default walk still visits `not`
});

// A reserved-value exclusion such as `not: { enum: [lookup, search] }` is a
// prohibition explained by the enclosing schema, not a vocabulary.
const reservedId = {
  type: 'string',
  description: 'Opaque identifier. The values lookup and search are reserved for collection actions.',
  not: { enum: ['lookup', 'search'] },
};

test('schemaDescriptions: `not` subtrees are prohibitions, not described schemas', () => {
  assert.equal(count(schemaDescriptions(reservedId, { mode: 'all' })), 0);
  const constBranches = { ...reservedId, not: { anyOf: [{ const: 'lookup' }, { const: 'search' }] } };
  assert.equal(count(schemaDescriptions(constBranches, { mode: 'all' })), 0);
  const { description: _omit, ...undescribed } = reservedId;
  assert.equal(count(schemaDescriptions(undescribed, { mode: 'all' })), 1); // the root itself
});

test('s04-bodyExamplesEnums: an enum under `not` is not a vocabulary to document', () => {
  const doc = (idSchema) => ({
    paths: {
      '/v1/records/{recordId}': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: { type: 'object', description: 'A record.', properties: { id: idSchema } },
                  example: { id: 'r_42' },
                },
              },
            },
          },
        },
      },
    },
  });
  assert.equal(count(bodyExamplesAndEnums(doc(reservedId))), 0);
  assert.equal(count(bodyExamplesAndEnums(doc({ type: 'string', enum: ['A', 'B'] }))), 1);
});

test('s09-enumCasing and s09-closedEnum: an enum under `not` is not a vocabulary', () => {
  const schema = { type: 'object', description: 'A record.', properties: { id: reservedId } };
  assert.equal(count(s09EnumCasing(schema, {}, { path: [] })), 0);
  assert.equal(count(s09ClosedEnum(schema, {}, { path: [] })), 0);
  const open = { type: 'object', properties: { kind: { type: 'string', enum: ['lookup'] } } };
  assert.equal(count(s09EnumCasing(open, {}, { path: [] })), 1);
  assert.equal(count(s09ClosedEnum(open, {}, { path: [] })), 1);
});

test('s17-cloudEventsPayload: scopes non-CloudEvents and requires a local vendored ref', () => {
  const localJson = {
    contentType: 'application/json',
    payload: { type: 'object', properties: { command: { type: 'string' } } },
  };
  assert.equal(cloudEventsPayload(localJson, {}, { path: [] }), undefined);

  const localEnvelope = {
    contentType: 'application/cloudevents+json',
    payload: {
      allOf: [
        { $ref: '../../../../api/common/govstack-asyncapi-common.yaml#/components/schemas/CloudEventEnvelope' },
      ],
    },
  };
  assert.equal(
    cloudEventsPayload(localEnvelope, { requireSharedReference: true }, { path: [] }),
    undefined,
  );

  const remoteEnvelope = structuredClone(localEnvelope);
  remoteEnvelope.payload.allOf[0].$ref =
    'https://example.org/api/common/govstack-asyncapi-common.yaml#/components/schemas/CloudEventEnvelope';
  assert.equal(
    count(cloudEventsPayload(remoteEnvelope, { requireSharedReference: true }, { path: [] })),
    1,
  );
});


test('action sub-resources: casing, depth and verb checks treat them as path segments', () => {
  const valid = {
    '/v1/households/lookup': {},
    '/v1/birth-registrations/search': {},
    '/v1/households/{recordId}/rotate-secret': {},
    '/v1/events/{eventId}/cancel': {},
  };
  assert.equal(count(pathSegments(valid, { check: 'segmentCasing' })), 0);
  assert.equal(count(pathSegments(valid, { check: 'maxDepthAfterVersion', max: 2 })), 0);
  assert.equal(count(actionVerbSegment(valid, {})), 0);
  // An action sub-resource is a level of nesting like any other segment.
  assert.equal(count(pathSegments({
    '/v1/households/{id}/memberships/{memberId}/search': {},
  }, { check: 'maxDepthAfterVersion', max: 2 })), 1);
  const bad = actionVerbSegment({
    '/v1/households/new': {},
    '/v1/households/{recordId}/delete': {},
    '/v1/households/create-household': {},
  }, {});
  assert.equal(count(bad), 3);
});

test('colon custom methods are rejected by segment casing with a pointer to §5.8', () => {
  for (const route of [
    '/v1/households:search',
    '/v1/households/{recordId}:rotateSecret',
    '/v1/households:search/results',
    '/v1/:search',
  ]) {
    const findings = pathSegments({ [route]: {} }, { check: 'segmentCasing' });
    assert.equal(count(findings), 1, route);
    assert.match(findings[0].message, /colon custom method/, route);
    assert.match(findings[0].message, /action sub-resource/, route);
    assert.match(findings[0].message, /5\.8/, route);
  }
  assert.ok(count(pathSegments({ '/v1/households/{record:Id}': {} }, { check: 'segmentCasing' })) > 0);
});

test('pluralSegment accepts configured action leaves only as the terminal segment', () => {
  const opts = { actionLeaves: ['search', 'lookup'] };
  assert.equal(count(pluralSegment({
    '/v1/events/search': {},
    '/v1/events/lookup': {},
    '/v1/households/{recordId}/search': {},
  }, opts)), 0);
  assert.equal(count(pluralSegment({ '/v1/search/events': {} }, opts)), 1);
  assert.equal(count(pluralSegment({ '/v1/events/search': {} }, {})), 1);
  assert.equal(count(pluralSegment({ '/v1/events/{eventId}/cancel': {} }, opts)), 1);
});

test('collection targets: bulk mutation and POST search pagination', () => {
  assert.equal(count(bulkMutationSelection({ patch: {} }, {}, { path: ['paths', '/v1/households'] })), 1);
  const operation = (schema) => ({ responses: { 200: { content: { 'application/json': { schema } } } } });
  const record = operation({ type: 'object', properties: { recordId: { type: 'string' } } });
  const ctx = { path: ['paths', '/v1/households/search', 'post'] };
  assert.ok(count(collectionPagination(record, { mode: 'cursorEnvelope' }, ctx)) > 0);
  const offsetSearch = { ...record, requestBody: { content: { 'application/json': { schema: { properties: { offset: {}, limit: {} } } } } } };
  assert.equal(count(collectionPagination(offsetSearch, { mode: 'cursorEnvelope' }, ctx)), 0);
  assert.ok(count(collectionPagination(offsetSearch, { mode: 'offsetEnvelope' }, ctx)) > 0);
  assert.equal(count(collectionPagination(offsetSearch, { mode: 'searchBody' }, ctx)), 0);
  assert.equal(count(collectionPagination(record, { mode: 'searchBody' }, ctx)), 0);
});

test('custom GET pagination follows recursive allOf declarations without looping', () => {
  const schema = { allOf: [{ properties: { items: { type: 'array' } } }] };
  schema.allOf.push(schema);
  const items = schema.allOf[0].properties.items;
  items.allOf = [items];
  const operation = { responses: { 200: { content: { 'application/json': { schema } } } } };
  const context = { path: ['paths', '/v1/households/{recordId}/members', 'get'] };
  assert.equal(count(collectionPagination(operation, { mode: 'pageParam' }, context)), 1);
  items.allOf.push({ maxItems: 0 });
  assert.equal(count(collectionPagination(operation, { mode: 'pageParam' }, context)), 0);
});
