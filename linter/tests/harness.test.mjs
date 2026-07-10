// Sanity checks for the plumbing: the shipped bundle loads, and Spectral's
// format detection classifies minimal AsyncAPI 3.0.0 / OpenAPI 3.1.0 documents
// as we rely on in the fragments. The format probe rules below are built inline
// for the test and are NOT part of the shipped ruleset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import corePkg from '@stoplight/spectral-core';
const { Spectral, Document } = corePkg;
import SpectralFunctions from '@stoplight/spectral-functions';
import SpectralFormats from '@stoplight/spectral-formats';
import Parsers from '@stoplight/spectral-parsers';
import { loadRuleset, STRICT_PATH } from './_lint-helper.mjs';

const { truthy } = SpectralFunctions;
const { aas3, oas3_1 } = SpectralFormats;

test('shipped strict bundle loads and includes the §2 proof-of-concept rules', async () => {
  const ruleset = await loadRuleset(STRICT_PATH);
  const names = Object.keys(ruleset.rules);
  assert.ok(names.length > 0, 'bundle has no rules');
  for (const expected of ['govstack-2.1', 'govstack-2.5', 'govstack-2.5-semver', 'govstack-2.6', 'govstack-2.7']) {
    assert.ok(names.includes(expected), `bundle missing ${expected}`);
  }
});

// A probe rule that fires whenever its `formats` gate lets it run.
function probeSpectral(formatFn) {
  const s = new Spectral();
  s.setRuleset({
    rules: {
      probe: {
        given: '$',
        severity: 'error',
        formats: [formatFn],
        then: { field: '__format_probe_absent__', function: truthy },
      },
    },
  });
  return s;
}
const run = (spectral, obj) => spectral.run(new Document(JSON.stringify(obj), Parsers.Json, 'probe.json'));

const ASYNC_DOC = {
  asyncapi: '3.0.0',
  info: { title: 'x', version: '1.0.0' },
  channels: {},
  operations: {},
};
const OPENAPI_DOC = {
  openapi: '3.1.0',
  info: { title: 'x', version: '1.0.0' },
  paths: {},
};

test('minimal AsyncAPI 3.0.0 document is detected as aas3', async () => {
  const spectral = probeSpectral(aas3);
  const onAsync = (await run(spectral, ASYNC_DOC)).filter((r) => r.code === 'probe');
  const onOpenapi = (await run(spectral, OPENAPI_DOC)).filter((r) => r.code === 'probe');
  assert.equal(onAsync.length, 1, 'aas3 probe should fire on the AsyncAPI document');
  assert.equal(onOpenapi.length, 0, 'aas3 probe must not fire on the OpenAPI document');
});

test('minimal OpenAPI 3.1.0 document is detected as oas3_1', async () => {
  const spectral = probeSpectral(oas3_1);
  const onOpenapi = (await run(spectral, OPENAPI_DOC)).filter((r) => r.code === 'probe');
  const onAsync = (await run(spectral, ASYNC_DOC)).filter((r) => r.code === 'probe');
  assert.equal(onOpenapi.length, 1, 'oas3_1 probe should fire on the OpenAPI document');
  assert.equal(onAsync.length, 0, 'oas3_1 probe must not fire on the AsyncAPI document');
});
