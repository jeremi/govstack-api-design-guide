import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { makeSpectral, lintFile, lintString, RULESET_PATH } from './_lint-helper.mjs';

const spectral = await makeSpectral(RULESET_PATH);

const baseDocument = (overrides = {}) => ({
  openapi: '3.1.0',
  info: { title: 'Schema type checks', version: '1.0.0' },
  paths: {},
  ...overrides,
});

const findings201 = async (document) =>
  (await lintString(spectral, JSON.stringify(document), 'schema-types.openapi.json')).filter(
    (finding) => finding.code === 'govstack-20.1-schema-types',
  );

test('20.1 rejects invalid type keywords in component schemas without treating domain type fields as keywords', async () => {
  const findings = await findings201(baseDocument({
    components: {
      schemas: {
        Record: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            amount: { type: 'float' },
            metadata: {
              type: 'object',
              example: { type: 'float' },
            },
          },
        },
      },
    },
  }));

  assert.deepEqual(
    findings.map((finding) => finding.path.join('/')),
    ['components/schemas/Record/properties/amount/type'],
  );
  assert.match(findings[0].message, /float/);
});

test('20.1 checks inline request, response, and parameter schemas', async () => {
  const findings = await findings201(baseDocument({
    paths: {
      '/records/{id}': {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'uuid' } },
        ],
        post: {
          parameters: [
            { name: 'limit', in: 'query', schema: { type: ['integer', 'float'] } },
          ],
          requestBody: {
            content: {
              'application/json': { schema: { type: 'record' } },
            },
          },
          responses: {
            200: {
              description: 'Record',
              content: {
                'application/json': { schema: { type: 'map' } },
              },
            },
          },
        },
      },
    },
  }));

  assert.deepEqual(
    findings.map((finding) => finding.path.join('/')).sort(),
    [
      'paths//records/{id}/parameters/0/schema/type',
      'paths//records/{id}/post/parameters/0/schema/type/1',
      'paths//records/{id}/post/requestBody/content/application/json/schema/type',
      'paths//records/{id}/post/responses/200/content/application/json/schema/type',
    ],
  );
});

test('20.1 accepts boolean schemas, primitive types, and valid nullable type arrays', async () => {
  const primitiveTypes = ['null', 'boolean', 'object', 'array', 'number', 'string', 'integer'];
  const properties = Object.fromEntries(
    primitiveTypes.map((type) => [`as${type}`, { type }]),
  );
  properties.always = true;
  properties.never = false;
  properties.nullableString = { type: ['string', 'null'] };

  assert.deepEqual(await findings201(baseDocument({
    components: {
      schemas: {
        ValidTypes: { type: 'object', properties },
      },
    },
  })), []);
});

test('20.1 rejects malformed type values and invalid type-array members', async () => {
  const findings = await findings201(baseDocument({
    components: {
      schemas: {
        InvalidArrays: {
          type: 'object',
          properties: {
            empty: { type: [] },
            duplicate: { type: ['string', 'string'] },
            nonString: { type: ['string', null] },
            unknown: { type: ['string', 'float'] },
            wrongShape: { type: 42 },
          },
        },
      },
    },
  }));

  assert.deepEqual(
    findings.map((finding) => finding.path.join('/')).sort(),
    [
      'components/schemas/InvalidArrays/properties/duplicate/type',
      'components/schemas/InvalidArrays/properties/empty/type',
      'components/schemas/InvalidArrays/properties/nonString/type/1',
      'components/schemas/InvalidArrays/properties/unknown/type/1',
      'components/schemas/InvalidArrays/properties/wrongShape/type',
    ],
  );
});

test('20.1 defers schemas that declare an unsupported custom dialect', async () => {
  const findings = await findings201(baseDocument({
    components: {
      schemas: {
        Custom: {
          $schema: 'https://schemas.example.test/custom',
          type: 'float',
          properties: { nested: { type: 'float' } },
        },
        Standard: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'float',
        },
      },
    },
  }));

  assert.deepEqual(
    findings.map((finding) => finding.path.join('/')),
    ['components/schemas/Standard/type'],
  );

  assert.deepEqual(await findings201(baseDocument({
    jsonSchemaDialect: 'https://schemas.example.test/custom',
    components: { schemas: { Custom: { type: 'float' } } },
  })), []);
});

test('20.1 checks schemas reached through resolved external references', async () => {
  const fixture = resolve(
    import.meta.dirname,
    'schema-types-fixtures',
    'external-root.yaml',
  );
  const findings = (await lintFile(spectral, fixture)).filter(
    (finding) => finding.code === 'govstack-20.1-schema-types',
  );

  assert.equal(findings.length, 1, JSON.stringify(findings, null, 2));
  assert.match(findings[0].message, /float/);
  // Spectral reports a resolved external finding against the source fragment,
  // not the referring path in the root document.
  assert.deepEqual(findings[0].path, [
    '$defs', 'Record', 'properties', 'amount', 'type',
  ]);
});
