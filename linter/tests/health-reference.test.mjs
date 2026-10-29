import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuleset, makeSpectral, lintFile, lintString, RULESET_PATH, STRICT_PATH, LINTER_DIR } from './_lint-helper.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FORMER_RULES = ['presence', 'media-type', 'status-codes', 'no-auth'];

test('5.9 is a CFR reference with no health-specific rules in any profile', async () => {
  for (const profile of [RULESET_PATH, STRICT_PATH, join(LINTER_DIR, 'legacy.yaml')]) {
    const ruleset = await loadRuleset(profile);
    assert.deepEqual(Object.keys(ruleset.rules).filter((name) => name.startsWith('govstack-5.9')), [], profile);
  }
});

test('former 5.9 fixture variants impose no guide-specific health contract', async () => {
  const spectral = await makeSpectral(RULESET_PATH);
  // Preserve both historical variants as regressions: absence, media type,
  // response codes and authentication are no longer prescribed by section 5.9.
  for (const suffix of FORMER_RULES) {
    for (const variant of ['pass', 'fail']) {
      const path = join(HERE, 'health-reference-fixtures', `govstack-5.9-${suffix}`, `${variant}.yaml`);
      const findings = await lintFile(spectral, path);
      assert.deepEqual(findings.filter((finding) => finding.code.startsWith('govstack-5.9')), [], path);
    }
  }
});

test('optional health paths retain 5.10 exemptions and its business-resource prohibition', async () => {
  const spectral = await makeSpectral(RULESET_PATH);
  const findings = await lintString(spectral, JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'Health reference', version: '1.0.0' },
    paths: {
      '/health': { get: { security: [], responses: { 200: { description: 'Operational status' } } } },
      '/ready': { post: { responses: { 200: { description: 'Business operation' } } } },
    },
  }));
  assert.deepEqual(findings.filter((finding) => ['govstack-5.1', 'govstack-5.2', 'govstack-5.3'].includes(finding.code)), []);
  const prohibited = findings.filter((finding) => finding.code === 'govstack-5.10');
  assert.equal(prohibited.length, 1);
  assert.deepEqual(prohibited[0].path, ['paths', '/ready', 'post']);
});
