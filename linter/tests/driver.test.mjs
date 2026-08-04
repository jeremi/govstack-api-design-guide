// End-to-end tests for the repository-level conformance driver.

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
const GUIDE_VERSION = '0.2.0-draft';
const ADVISORY = ['--mode', 'advisory', '--skip-validators'];

function makeRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'govstack-driver-'));
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'api'), { recursive: true });
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents);
  }
  if (files['api/coverage.yaml'] && !files['spec/requirements.md']) {
    const ids = [
      ...files['api/coverage.yaml'].matchAll(/\bid:\s*["']?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)/g),
    ].map((match) => match[1]);
    if (ids.length) {
      const requirements = [...new Set(ids)]
        .map((id) => `- **${id}** **REQUIRED**: Test requirement ${id}.`)
        .join('\n');
      const abs = path.join(dir, 'spec', 'requirements.md');
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${requirements}\n`);
    }
  }
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runCli(args, { env } = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: env ?? process.env,
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function runCliJson(args, opts) {
  const r = runCli(['--format', 'json', ...args], opts);
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // Assertions report stdout/stderr where JSON is expected.
  }
  return { ...r, json };
}

function fakeOpenapiValidator(dir) {
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const validator = path.join(bin, 'openapi-spec-validator');
  fs.writeFileSync(validator, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(validator, 0o755);
  return bin;
}

const VALID_COVERAGE = `version: 1
requirements:
  - id: REQ-TEST-001
    disposition: external
    reference: https://example.org/requirements/test
`;

const NO_API_INDEX = `version: 1
noApi: true
reason: This building block exposes no API surface.
`;

const apiGuide = (version = GUIDE_VERSION, exceptions = '') => `
  x-govstack-api-guide:
    version: ${version}
    rulesetVersion: ${version}${exceptions}`;

const cleanOpenapi = (version = GUIDE_VERSION) => `openapi: 3.1.0
info:
  title: Demo
  version: 1.0.0
  description: A demo API
  contact:
    name: Team${apiGuide(version)}
paths:
  /v1/things:
    get:
      operationId: listThings
      responses:
        '200': { description: ok }
`;

const openapiMissingContact = (exceptions = '', version = GUIDE_VERSION) => `openapi: 3.1.0
info:
  title: Demo
  version: 1.0.0
  description: A demo API${apiGuide(version, exceptions)}
paths: {}
`;

const cleanAsyncapi = (operation = 'receiveThing', message = 'ThingReceived') => `asyncapi: 3.0.0
info:
  title: Events
  version: 1.0.0
  description: Event API
  contact:
    name: Team${apiGuide()}
channels:
  things:
    address: things
    messages:
      ${message}:
        $ref: '#/components/messages/${message}'
operations:
  ${operation}:
    action: receive
    channel: { $ref: '#/channels/things' }
components:
  messages:
    ${message}:
      payload: { type: object }
`;

function codes(report) {
  return report.files.flatMap((file) => file.findings.map((finding) => finding.code));
}

test('conformance requires an API declaration or explicit noApi', () => {
  const missing = makeRepo({});
  const explicit = makeRepo({ 'api/index.yaml': NO_API_INDEX });
  try {
    const fail = runCliJson(['--repo-root', missing, '--ruleset', MINI_RULESET]);
    assert.equal(fail.status, 1, fail.stderr);
    assert.ok(codes(fail.json).includes('api-declaration-required'));

    const pass = runCliJson(['--repo-root', explicit, '--ruleset', MINI_RULESET]);
    assert.equal(pass.status, 0, pass.stderr);
    assert.equal(pass.json.summary.filesLinted, 0);
    assert.match(pass.json.notices.join('\n'), /explicitly declares/);
  } finally {
    cleanup(missing);
    cleanup(explicit);
  }
});

test('advisory mode permits discovery work without an API declaration', () => {
  const dir = makeRepo({});
  try {
    const r = runCli(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /No API declaration found/);
  } finally {
    cleanup(dir);
  }
});

test('api/index.yaml supports multiple declared OpenAPI and AsyncAPI surfaces', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - type: openapi
    path: api/public.yaml
  - type: asyncapi
    path: api/events.yaml
`,
    'api/public.yaml': cleanOpenapi(),
    'api/events.yaml': cleanAsyncapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: REQ-API-001
    disposition: operation
    operations: [listThings, receiveThing]
  - id: REQ-API-002
    disposition: message
    messages: [ThingReceived]
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    assert.equal(r.json.summary.filesLinted, 2);
  } finally {
    cleanup(dir);
  }
});

test('missing and empty index-declared specs fail', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - { type: openapi, path: api/missing.yaml }
  - { type: asyncapi, path: api/empty.yaml }
`,
    'api/empty.yaml': '   \n',
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('declared-spec-missing'));
    assert.ok(codes(r.json).includes('declared-spec-empty'));
  } finally {
    cleanup(dir);
  }
});

test('legacy swagger files fail whether populated or empty', () => {
  const dir = makeRepo({
    'api/index.yaml': NO_API_INDEX,
    'api/swagger.yaml': '',
    'api/swagger.json': '{"openapi":"3.1.0"}',
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 1);
    assert.equal(codes(r.json).filter((code) => code === 'file-canonical-name').length, 2);
  } finally {
    cleanup(dir);
  }
});

test('undeclared parsed specs in api/ and spec assets are blocking duplicates', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/copy.yaml': cleanOpenapi(),
    'spec/.gitbook/assets/copy.json': '{"asyncapi":"3.0.0","info":{"title":"copy"}}',
    'examples/ignored.yaml': cleanOpenapi(),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    const paths = r.json.files
      .filter((file) => file.findings.some((finding) => finding.code === 'file-undeclared-spec'))
      .map((file) => file.path)
      .sort();
    assert.deepEqual(paths, ['api/copy.yaml', 'spec/.gitbook/assets/copy.json']);
  } finally {
    cleanup(dir);
  }
});

test('operation-free component libraries under api/common are not API surfaces', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/common/openapi-components.yaml': `openapi: 3.1.0
info: { title: Common OpenAPI components, version: 1.0.0 }
paths: {}
components:
  schemas:
    Identifier: { type: string }
`,
    'api/common/asyncapi-components.yaml': `asyncapi: 3.0.0
info: { title: Common AsyncAPI components, version: 1.0.0 }
channels: {}
operations: {}
components:
  schemas:
    Identifier: { type: string }
`,
    'api/common/hidden-surface.yaml': cleanOpenapi(),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    const paths = r.json.files
      .filter((file) => file.findings.some((finding) => finding.code === 'file-undeclared-spec'))
      .map((file) => file.path);
    assert.deepEqual(paths, ['api/common/hidden-surface.yaml']);
  } finally {
    cleanup(dir);
  }
});

test('coverage requires stable unique IDs and valid dispositions', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - { id: bad, disposition: operation, operations: [missingOperation] }
  - { id: bad, disposition: planned }
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('coverage-invalid'));
    assert.ok(codes(r.json).includes('coverage-missing-reference'));
  } finally {
    cleanup(dir);
  }
});

test('coverage rejects ambiguous operation and message names across surfaces', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - { type: asyncapi, path: api/a.yaml }
  - { type: asyncapi, path: api/b.yaml }
`,
    'api/a.yaml': cleanAsyncapi('sameOperation', 'SameMessage'),
    'api/b.yaml': cleanAsyncapi('sameOperation', 'SameMessage'),
    'api/coverage.yaml': `version: 1
requirements:
  - { id: REQ-API-001, disposition: operation, operations: [sameOperation] }
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.equal(codes(r.json).filter((code) => code === 'coverage-ambiguous-reference').length, 2);
  } finally {
    cleanup(dir);
  }
});

test('coverage is an exact projection of keyed Markdown requirements and flags legacy lines', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - { id: REQ-SPEC-001, disposition: external, reference: https://example.org/one }
  - { id: REQ-EXTRA-001, disposition: external, reference: https://example.org/extra }
`,
    'spec/requirements.md': `# Requirements

- **REQ-SPEC-001** **REQUIRED**: The API exposes the first contract.
- **REQ-SPEC-002** **RECOMMENDED**: The API exposes the second contract.
- Old prose requirement (REQUIRED)
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('coverage-unknown-requirement'));
    assert.ok(codes(r.json).includes('coverage-missing-requirement'));
    assert.ok(codes(r.json).includes('requirements-unkeyed'));
  } finally {
    cleanup(dir);
  }
});

test('planned coverage is blocking in conformance and advisory-only in advisory mode', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: REQ-PLAN-001
    disposition: planned
    issue: https://example.org/issues/123
`,
  });
  try {
    const bin = fakeOpenapiValidator(dir);
    const conform = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET], {
      env: { ...process.env, PATH: bin },
    });
    assert.equal(conform.status, 1);
    const conformanceFinding = conform.json.files
      .flatMap((file) => file.findings)
      .find((finding) => finding.code === 'coverage-planned');
    assert.equal(conformanceFinding.severity, 'error');

    const advisory = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(advisory.status, 0, `${advisory.stderr}\n${advisory.stdout}`);
    const advisoryFinding = advisory.json.files
      .flatMap((file) => file.findings)
      .find((finding) => finding.code === 'coverage-planned');
    assert.equal(advisoryFinding.severity, 'warn');
  } finally {
    cleanup(dir);
  }
});

test('coverage rejects disposition-incompatible extra fields', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: REQ-EXTERNAL-001
    disposition: external
    reference: https://example.org/requirement
    operations: [listThings]
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('coverage-invalid'));
  } finally {
    cleanup(dir);
  }
});

test('coverage cannot mark a REQUIRED requirement not-applicable', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: REQ-NA-001
    disposition: not-applicable
    rationale: This is incorrectly excluded.
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('coverage-required-not-applicable'));
  } finally {
    cleanup(dir);
  }
});

test('valid reviewed, unexpired exception suppresses only its known guide rule', () => {
  const exception = `
    exceptions:
      - rule: "2.5"
        scope: "/info"
        rationale: "Temporary compatibility with the approved legacy owner."
        record: "https://example.org/exceptions/EXC-001"
        reviewedBy: "API Working Group"
        reviewedAt: "2026-07-10"
        expiresAt: "2099-12-31"`;
  const dir = makeRepo({
    'api/openapi.yaml': openapiMissingContact(exception),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    assert.ok(!codes(r.json).includes('govstack-2.5-contact'));
    const suppressed = r.json.files.flatMap((file) => file.suppressed);
    assert.equal(suppressed[0].exceptionRecord, 'https://example.org/exceptions/EXC-001');
  } finally {
    cleanup(dir);
  }
});

test('bare, unknown, or expired exceptions never suppress findings', () => {
  const exception = `
    exceptions:
      - "2.5"
      - rule: "999.1"
        scope: "/info"
        rationale: "This rule does not exist and cannot be excepted."
        record: "https://example.org/exceptions/EXC-002"
        reviewedBy: "API Working Group"
        reviewedAt: "2020-01-01"
        expiresAt: "2020-12-31"`;
  const dir = makeRepo({
    'api/openapi.yaml': openapiMissingContact(exception),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('guide-exception'));
    assert.ok(codes(r.json).includes('govstack-2.5-contact'));
    assert.equal(r.json.summary.suppressed, 0);
  } finally {
    cleanup(dir);
  }
});

test('exception scope must contain the finding path; root scope contains all descendants', () => {
  const exception = (scope) => `
    exceptions:
      - rule: "2.5"
        scope: ${JSON.stringify(scope)}
        rationale: "Temporary compatibility with the approved legacy owner."
        record: "https://example.org/exceptions/EXC-SCOPE"
        reviewedBy: "API Working Group"
        reviewedAt: "2026-07-10"
        expiresAt: "2099-12-31"`;
  const wrong = makeRepo({
    'api/openapi.yaml': openapiMissingContact(exception('/paths')),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  const root = makeRepo({
    'api/openapi.yaml': openapiMissingContact(exception('')),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const wrongResult = runCliJson(['--repo-root', wrong, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(wrongResult.status, 1);
    assert.ok(codes(wrongResult.json).includes('govstack-2.5-contact'));

    const rootResult = runCliJson(['--repo-root', root, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(rootResult.status, 0, `${rootResult.stderr}\n${rootResult.stdout}`);
    assert.equal(rootResult.json.summary.suppressed, 1);
  } finally {
    cleanup(wrong);
    cleanup(root);
  }
});

test('HTTP exception records and missing rulesetVersion fail conformance', () => {
  const insecureException = `
    exceptions:
      - rule: "2.5"
        scope: "/info"
        rationale: "Temporary compatibility with the approved legacy owner."
        record: "http://example.org/exceptions/EXC-HTTP"
        reviewedBy: "API Working Group"
        reviewedAt: "2026-07-10"
        expiresAt: "2099-12-31"`;
  const insecure = makeRepo({
    'api/openapi.yaml': openapiMissingContact(insecureException),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  const missingRuleset = makeRepo({
    'api/openapi.yaml': `openapi: 3.1.0
info:
  title: Demo
  version: 1.0.0
  description: Demo
  contact: { name: Team }
  x-govstack-api-guide:
    version: ${GUIDE_VERSION}
paths: {}
`,
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const insecureResult = runCliJson(['--repo-root', insecure, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(insecureResult.status, 1);
    assert.ok(codes(insecureResult.json).includes('guide-exception'));
    assert.ok(codes(insecureResult.json).includes('govstack-2.5-contact'));

    const bin = fakeOpenapiValidator(missingRuleset);
    const versionResult = runCliJson(['--repo-root', missingRuleset, '--ruleset', MINI_RULESET], {
      env: { ...process.env, PATH: bin },
    });
    assert.equal(versionResult.status, 1);
    assert.ok(codes(versionResult.json).includes('guide-version'));
  } finally {
    cleanup(insecure);
    cleanup(missingRuleset);
  }
});

test('conformance fails an unsupported guide version and accepts the exact draft version', () => {
  const mismatch = makeRepo({
    'api/openapi.yaml': cleanOpenapi('0.2.0'),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  const exact = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const mismatchBin = fakeOpenapiValidator(mismatch);
    const exactBin = fakeOpenapiValidator(exact);
    const fail = runCliJson(['--repo-root', mismatch, '--ruleset', MINI_RULESET], {
      env: { ...process.env, PATH: mismatchBin },
    });
    assert.equal(fail.status, 1, fail.stderr);
    assert.ok(codes(fail.json).includes('guide-version'));

    const pass = runCliJson(['--repo-root', exact, '--ruleset', MINI_RULESET], {
      env: { ...process.env, PATH: exactBin },
    });
    assert.equal(pass.status, 0, `${pass.stderr}\n${pass.stdout}`);
  } finally {
    cleanup(mismatch);
    cleanup(exact);
  }
});

test('missing base validator fails conformance but is an advisory notice', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const conform = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET], {
      env: { ...process.env, PATH: '' },
    });
    assert.equal(conform.status, 1, conform.stderr);
    assert.ok(codes(conform.json).includes('base-validator-unavailable'));

    const advisory = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, '--mode', 'advisory'], {
      env: { ...process.env, PATH: '' },
    });
    assert.equal(advisory.status, 0, advisory.stderr);
    assert.match(advisory.json.notices.join('\n'), /openapi-spec-validator not found/);
  } finally {
    cleanup(dir);
  }
});

test('conformance rejects --skip-validators', () => {
  const dir = makeRepo({});
  try {
    const r = runCli(['--repo-root', dir, '--ruleset', MINI_RULESET, '--skip-validators']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /only available with --mode advisory/);
  } finally {
    cleanup(dir);
  }
});

test('--format json includes mode and stable report fields', () => {
  const dir = makeRepo({
    'api/openapi.yaml': openapiMissingContact(),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.ok(r.json, `${r.stderr}\n${r.stdout}`);
    assert.deepEqual(
      Object.keys(r.json).sort(),
      ['failOn', 'failed', 'files', 'mode', 'notices', 'summary'],
    );
    assert.equal(r.json.mode, 'advisory');
    assert.equal(r.json.failOn, 'error');
  } finally {
    cleanup(dir);
  }
});

test('--fail-on never reports deterministic findings without failing', () => {
  const dir = makeRepo({
    'api/openapi.yaml': openapiMissingContact(),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY, '--fail-on', 'never',
    ]);
    assert.equal(r.status, 0);
    assert.equal(r.json.failed, false);
    assert.ok(r.json.summary.errors >= 1);
  } finally {
    cleanup(dir);
  }
});

test('unparseable declared spec is an operational error naming the file', () => {
  const dir = makeRepo({
    'api/openapi.yaml': 'openapi: 3.1.0\ninfo: {title: [oops\n',
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCli(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Cannot parse spec file api\/openapi\.yaml/);
  } finally {
    cleanup(dir);
  }
});

test('bad flag and missing ruleset are operational errors', () => {
  const empty = makeRepo({});
  const spec = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const bad = runCli(['--repo-root', empty, '--mode', 'bogus']);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /Invalid --mode/);

    const missing = runCli([
      '--repo-root', spec, '--ruleset', path.join(spec, 'missing.yaml'), ...ADVISORY,
    ]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /Ruleset not found/);
  } finally {
    cleanup(empty);
    cleanup(spec);
  }
});
