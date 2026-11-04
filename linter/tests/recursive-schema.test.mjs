import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, '..', 'cli.mjs');
const FIXTURE = path.join(HERE, 'recursive-schema-fixtures');

function copyComplexFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'govstack-recursive-schema-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(path.join(FIXTURE, 'complex'), dir, { recursive: true });
  return dir;
}

function runFixture(fixture) {
  return spawnSync(process.execPath, [
    CLI,
    '--repo-root', fixture,
    '--openapi', 'root.openapi.yaml',
    '--ruleset', path.join(fixture, 'ruleset.yaml'),
    '--mode', 'advisory',
    '--skip-validators',
    '--fail-on', 'warn',
    '--format', 'json',
  ], { encoding: 'utf8', timeout: 60000 });
}

test('CLI lints mutually recursive external schemas without an operational error', () => {
  const result = spawnSync(
    process.execPath,
    [
      CLI,
      '--repo-root',
      FIXTURE,
      '--openapi',
      'root.openapi.yaml',
      '--ruleset',
      path.join(FIXTURE, 'ruleset.yaml'),
      '--mode',
      'advisory',
      '--skip-validators',
      '--format',
      'json',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
  const report = JSON.parse(result.stdout);
  const findings = report.files.flatMap((file) => file.findings);
  assert.ok(
    findings.some((finding) => finding.code === 'govstack-4.1-property-description'),
    JSON.stringify(report, null, 2),
  );
});

test('CLI reports external findings through shared recursive fragments without changing source files', () => {
  const fixture = path.join(FIXTURE, 'complex');
  const source = path.join(fixture, 'write-examples.schema.json');
  const before = fs.readFileSync(source);
  const result = runFixture(fixture);

  assert.equal(result.status, 1, `${result.error ?? ''}\n${result.stderr}\n${result.stdout}`);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.errors, 0);
  assert.ok(report.notices.includes(
    'Resolved recursive references in root.openapi.yaml without reusing reference runners.',
  ));
  assert.ok(report.files.some((file) =>
    file.path === 'write-examples.schema.json'
      && file.findings.some((finding) => finding.code === 'govstack-4.1-property-description')
  ), 'The external schema must retain its documentation findings.');
  assert.deepEqual(fs.readFileSync(source), before);
});

test('recursive reference recovery preserves approved external exceptions', (t) => {
  const fixture = copyComplexFixture(t);
  const source = path.join(fixture, 'root.openapi.yaml');
  const root = YAML.parse(fs.readFileSync(source, 'utf8'));
  root.info['x-govstack-api-guide'].exceptions = [{
    rule: '4.1',
    scope: '/components/schemas/PublicSchemaChangeRequest',
    rationale: 'Temporary exception for the missing title on this fixture schema.',
    record: 'https://example.org/exceptions/recursive-schema',
    reviewedBy: 'Fixture maintainers',
    reviewedAt: '2026-07-10',
    expiresAt: '2099-12-31',
  }];
  fs.writeFileSync(source, YAML.stringify(root));
  fs.writeFileSync(path.join(fixture, 'ruleset.yaml'), `rules:
  govstack-4.1-fixture-title:
    given: "$.components.schemas.PublicSchemaChangeRequest"
    severity: warn
    then:
      field: title
      function: truthy
`);

  const result = runFixture(fixture);
  assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stderr}\n${result.stdout}`);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.errors, 0);
  assert.equal(report.summary.warnings, 0);
  assert.equal(report.summary.suppressed, 1);
  assert.ok(report.notices.some((notice) => notice.includes('without reusing reference runners')));
  const suppressed = report.files.flatMap((file) => file.suppressed);
  assert.equal(suppressed[0].exceptionRecord, 'https://example.org/exceptions/recursive-schema');
});

test('recursive reference recovery still reports a missing external reference', (t) => {
  const fixture = copyComplexFixture(t);
  const source = path.join(fixture, 'root.openapi.yaml');
  const root = YAML.parse(fs.readFileSync(source, 'utf8'));
  root.components.schemas.Missing = { $ref: './missing.schema.json' };
  fs.writeFileSync(source, YAML.stringify(root));

  const result = runFixture(fixture);
  assert.equal(result.status, 1, `${result.error ?? ''}\n${result.stderr}\n${result.stdout}`);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.ok(report.summary.errors > 0);
  assert.ok(report.files.some((file) => file.findings.some((finding) => finding.code === 'invalid-ref')));
  assert.ok(report.notices.some((notice) => notice.includes('without reusing reference runners')));
});
