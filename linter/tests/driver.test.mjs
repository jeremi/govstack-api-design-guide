// End-to-end tests for the lint driver (cli.mjs). Each test builds a crafted temp repo
// under os.tmpdir() and runs the CLI as a child process. Tests always pass
// --skip-validators (external validators may be absent) except the one that deliberately
// exercises the validator-missing NOTICE path, and use a tiny self-contained mini-ruleset
// so they do not depend on the real ruleset being finished.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, '..', 'cli.mjs');
const MINI_RULESET = path.join(HERE, 'driver-fixtures', 'mini-ruleset.yaml');

// Build a temp repo from a { relativePath: contents } map. Returns the repo dir.
function makeRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'govstack-driver-'));
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'api'), { recursive: true });
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents);
  }
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Run the CLI. `extraArgs` are appended; `env` overrides process env when provided.
function runCli(args, { env } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: env ?? process.env,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function runCliJson(args, opts) {
  const r = runCli(['--format', 'json', ...args], opts);
  let json;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    json = null;
  }
  return { ...r, json };
}

const CLEAN_OPENAPI = `openapi: 3.1.0
info:
  title: Demo
  version: 1.0.0
  description: A demo API
  contact:
    name: Team
paths: {}
`;

const OPENAPI_MISSING_CONTACT = (guideVersion, extraGuide = '') => `openapi: 3.1.0
info:
  title: Demo
  version: ${guideVersion}
  description: A demo API
  x-govstack-api-guide:
    version: ${guideVersion}${extraGuide}
paths: {}
`;

test('no spec files at all -> prominent notice, exit 0', () => {
  const dir = makeRepo({});
  try {
    const r = runCli(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /no API spec files found to lint/i);
  } finally {
    cleanup(dir);
  }
});

test('non-empty legacy swagger.yaml -> file-canonical-name error, exit 1', () => {
  const dir = makeRepo({ 'api/swagger.yaml': 'openapi: 3.1.0\ninfo: {title: X}\n' });
  try {
    const r = runCliJson(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 1);
    const codes = r.json.files.flatMap((f) => f.findings.map((x) => x.code));
    assert.ok(codes.includes('file-canonical-name'));
    const finding = r.json.files
      .flatMap((f) => f.findings)
      .find((x) => x.code === 'file-canonical-name');
    assert.equal(finding.guideRule, '2.2');
    assert.equal(finding.severity, 'error');
    assert.equal(r.json.failed, true);
  } finally {
    cleanup(dir);
  }
});

test('empty legacy placeholder -> notice only, exit 0', () => {
  const dir = makeRepo({ 'api/swagger.yaml': '   \n', 'api/swagger.json': '' });
  try {
    const r = runCli(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Empty legacy placeholder api\/swagger\.yaml/);
    assert.match(r.stdout, /Empty legacy placeholder api\/swagger\.json/);
    assert.doesNotMatch(r.stdout, /file-canonical-name/);
  } finally {
    cleanup(dir);
  }
});

test('divergent copy detection honours the exclusion list', () => {
  const dir = makeRepo({
    'api/openapi.yaml': CLEAN_OPENAPI,
    'docs/copy.yaml': 'openapi: 3.1.0\ninfo: {title: dup}\n',
    'other.json': 'asyncapi: 3.0.0\ninfo: {title: ev}\n',
    'random.yaml': 'name: ci\njobs: {}\n',
    // Excluded directories: must NOT be flagged.
    'spec/excluded.yaml': 'openapi: 3.1.0\ninfo: {t: x}\n',
    'examples/excluded.yaml': 'openapi: 3.1.0\ninfo: {t: x}\n',
    'test/excluded.yaml': 'openapi: 3.1.0\ninfo: {t: x}\n',
    'node_modules/foo/excluded.yaml': 'openapi: 3.1.0\ninfo: {t: x}\n',
    'api-design-guide/fixtures/excluded.yaml': 'openapi: 3.1.0\ninfo: {t: x}\n',
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    // Warn-level findings do not fail the default (fail-on error) run.
    assert.equal(r.status, 0);
    const divergent = r.json.files
      .flatMap((f) => f.findings)
      .filter((x) => x.code === 'file-divergent-copies');
    const flaggedPaths = r.json.files
      .filter((f) => f.findings.some((x) => x.code === 'file-divergent-copies'))
      .map((f) => f.path)
      .sort();
    assert.deepEqual(flaggedPaths, ['docs/copy.yaml', 'other.json']);
    // The AsyncAPI copy maps to guide rule 3.3, the OpenAPI copy to 2.3.
    const byPath = Object.fromEntries(
      r.json.files.map((f) => [f.path, f.findings.find((x) => x.code === 'file-divergent-copies')]),
    );
    assert.equal(byPath['docs/copy.yaml'].guideRule, '2.3');
    assert.equal(byPath['other.json'].guideRule, '3.3');
    assert.ok(divergent.every((x) => x.severity === 'warn'));
  } finally {
    cleanup(dir);
  }
});

test('exceptions suppress a firing rule end-to-end (object form), exit 0', () => {
  const dir = makeRepo({
    'api/openapi.yaml': OPENAPI_MISSING_CONTACT(
      '0.2.0',
      '\n    exceptions:\n      - rule: "2.5"\n        record: "EXC-2024-001"',
    ),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 0);
    const active = r.json.files.flatMap((f) => f.findings);
    assert.ok(!active.some((x) => x.code === 'govstack-2.5-contact'));
    const suppressed = r.json.files.flatMap((f) => f.suppressed);
    const s = suppressed.find((x) => x.code === 'govstack-2.5-contact');
    assert.ok(s, 'contact finding should be suppressed');
    assert.equal(s.guideRule, '2.5');
    assert.equal(s.exceptionRecord, 'EXC-2024-001');
    assert.equal(r.json.summary.suppressed, 1);
  } finally {
    cleanup(dir);
  }
});

test('exceptions accept the plain-string form', () => {
  const dir = makeRepo({
    'api/openapi.yaml': OPENAPI_MISSING_CONTACT('0.2.0', '\n    exceptions:\n      - "2.5"'),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 0);
    const suppressed = r.json.files.flatMap((f) => f.suppressed);
    const s = suppressed.find((x) => x.code === 'govstack-2.5-contact');
    assert.ok(s, 'contact finding should be suppressed via string exception');
    assert.equal(s.exceptionRecord, null);
  } finally {
    cleanup(dir);
  }
});

test('guide version major.minor mismatch emits a notice; matching version does not', () => {
  const mismatchDir = makeRepo({ 'api/openapi.yaml': OPENAPI_MISSING_CONTACT('0.1.0') });
  const matchDir = makeRepo({ 'api/openapi.yaml': OPENAPI_MISSING_CONTACT('0.2.5') });
  try {
    const mm = runCliJson([
      '--repo-root', mismatchDir, '--skip-validators', '--ruleset', MINI_RULESET,
    ]);
    assert.ok(mm.json.notices.some((n) => /major\.minor mismatch/.test(n)));

    const ok = runCliJson([
      '--repo-root', matchDir, '--skip-validators', '--ruleset', MINI_RULESET,
    ]);
    assert.ok(!ok.json.notices.some((n) => /major\.minor mismatch/.test(n)));
  } finally {
    cleanup(mismatchDir);
    cleanup(matchDir);
  }
});

test('--format json has the documented shape', () => {
  const dir = makeRepo({ 'api/openapi.yaml': OPENAPI_MISSING_CONTACT('0.2.0') });
  try {
    const r = runCliJson(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.ok(r.json, 'stdout must be valid JSON');
    assert.deepEqual(
      Object.keys(r.json).sort(),
      ['failOn', 'failed', 'files', 'notices', 'summary'],
    );
    assert.ok(Array.isArray(r.json.files));
    const file = r.json.files[0];
    assert.deepEqual(Object.keys(file).sort(), ['findings', 'path', 'suppressed']);
    const finding = file.findings[0];
    assert.deepEqual(
      Object.keys(finding).sort(),
      ['code', 'documentationUrl', 'guideRule', 'message', 'path', 'range', 'severity'],
    );
    assert.deepEqual(
      Object.keys(r.json.summary).sort(),
      ['errors', 'filesLinted', 'info', 'suppressed', 'warnings'],
    );
    assert.equal(r.json.failOn, 'error');
    assert.equal(typeof r.json.failed, 'boolean');
  } finally {
    cleanup(dir);
  }
});

test('--fail-on never exits 0 even with error findings', () => {
  const dir = makeRepo({ 'api/openapi.yaml': OPENAPI_MISSING_CONTACT('0.2.0') });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET, '--fail-on', 'never',
    ]);
    assert.equal(r.status, 0);
    assert.equal(r.json.failed, false);
    // The error finding is still reported, just not fatal.
    assert.ok(r.json.summary.errors >= 1);
  } finally {
    cleanup(dir);
  }
});

test('unparseable spec -> exit 2 naming the file', () => {
  const dir = makeRepo({ 'api/openapi.yaml': 'openapi: 3.1.0\ninfo: {title: [oops\n  bad: : :\n' });
  try {
    const r = runCli(['--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Cannot parse spec file .*api\/openapi\.yaml/);
  } finally {
    cleanup(dir);
  }
});

test('bad flag value -> exit 2', () => {
  const dir = makeRepo({});
  try {
    const r = runCli([
      '--repo-root', dir, '--skip-validators', '--ruleset', MINI_RULESET, '--fail-on', 'bogus',
    ]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Invalid --fail-on/);
  } finally {
    cleanup(dir);
  }
});

test('missing ruleset -> exit 2 when there is a spec to lint', () => {
  const dir = makeRepo({ 'api/openapi.yaml': CLEAN_OPENAPI });
  try {
    const r = runCli([
      '--repo-root', dir, '--skip-validators', '--ruleset', path.join(dir, 'does-not-exist.yaml'),
    ]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Ruleset not found/);
  } finally {
    cleanup(dir);
  }
});

test('validator-missing NOTICE path (empty PATH) does not crash, exit 0', () => {
  const dir = makeRepo({
    'api/openapi.yaml': CLEAN_OPENAPI,
    'api/asyncapi.yaml': `asyncapi: 3.0.0
info:
  title: Ev
  version: 1.0.0
  description: events
  contact:
    name: Team
operations: {}
`,
  });
  try {
    // Empty PATH so spawned validators (openapi-spec-validator, npx/asyncapi) ENOENT.
    // node itself is invoked by absolute path, so the CLI still runs.
    const r = runCli(['--repo-root', dir, '--ruleset', MINI_RULESET], {
      env: { ...process.env, PATH: '' },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /openapi-spec-validator not found/);
    assert.match(r.stdout, /AsyncAPI CLI not found/);
    assert.match(r.stdout, /pip install openapi-spec-validator/);
    assert.match(r.stdout, /npm i -g @asyncapi\/cli/);
  } finally {
    cleanup(dir);
  }
});
