// Golden reference specs — conformance test.
//
// Lints the two GOLDEN reference documents (tests/golden/*.yaml) with the DEFAULT
// bundled ruleset (ruleset.yaml, all formats). The goldens are hand-built to
// satisfy every default check simultaneously and double as reference examples for
// BB spec editors.
//
// BOTH goldens MUST lint to ZERO findings of any severity under the default
// ruleset. The ruleset exempts the guide §5.9 operational endpoints (/health,
// /ready) from the resource-oriented rules that do not apply to a liveness probe
// (§5.1 version prefix, §12.x pagination, §7.16 ETag), scopes the §5.9 health+json
// media type / status enum to the SUCCESS response so the §11.1 problem+json error
// response is satisfiable, and counts only non-param path segments toward §5.4 max
// nesting depth so the §15.5/§16.11 mandated action sub-resource paths stay in
// bounds. Any finding is therefore a genuine regression; the test prints the full
// finding list on failure for debugging.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSpectral, lintFile, RULESET_PATH } from './_lint-helper.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, 'golden');
const OPENAPI_GOLDEN = resolve(GOLDEN, 'openapi-golden.yaml');
const ASYNCAPI_GOLDEN = resolve(GOLDEN, 'asyncapi-golden.yaml');

// The DEFAULT ruleset (not the strict profile), matching CI gating.
const spectral = await makeSpectral(RULESET_PATH);

/** A stable, sorted, human-readable dump of findings for assertion messages. */
const dump = (findings) =>
  JSON.stringify(
    findings
      .map((f) => ({ code: f.code, severity: f.severity, path: f.path.join('/'), message: f.message }))
      .sort((a, b) => (a.code + a.path).localeCompare(b.code + b.path)),
    null,
    2,
  );

test('asyncapi-golden.yaml lints clean under the default ruleset (zero findings)', async () => {
  const findings = await lintFile(spectral, ASYNCAPI_GOLDEN);
  assert.equal(
    findings.length,
    0,
    `Expected zero findings for the AsyncAPI golden, got ${findings.length}:\n${dump(findings)}`,
  );
});

test('openapi-golden.yaml lints clean under the default ruleset (zero findings)', async () => {
  const findings = await lintFile(spectral, OPENAPI_GOLDEN);
  assert.equal(
    findings.length,
    0,
    `Expected zero findings for the OpenAPI golden, got ${findings.length}:\n${dump(findings)}`,
  );
});
