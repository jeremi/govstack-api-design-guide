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
const GUIDE_VERSION = '0.3.0-draft';
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
      ...files['api/coverage.yaml'].matchAll(
        /\bid:\s*["']?(govstack-[a-z0-9]+(?:[-.][a-z0-9]+)*#req-([1-9][0-9]*))["']?/g,
      ),
    ].map((match) => ({ id: match[1], number: match[2] }));
    if (ids.length) {
      const requirements = [...new Map(ids.map((item) => [item.id, item])).values()]
        .map(
          ({ id, number }) =>
            `### #${number} Test requirement ${number} (REQUIRED EXTENSIBLE OBSERVABLE)\n\n` +
            `\`${id}\`\n\nTest requirement ${number}.`,
        )
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
  - id: "govstack-bb-test-fr#req-1"
    disposition: external
    reference: https://example.org/requirements/test
`;

const DRAFT_REQUIREMENTS = `# Requirements

### #1 Proposed retrieval (DRAFT EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-1\`

The proposed API retrieves a resource.

### #2 Proposed matching (DRAFT EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-2\`

The proposed API matches resources.
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
  - id: "govstack-bb-test-fr#req-1"
    disposition: operation
    operations: [listThings, receiveThing]
  - id: "govstack-bb-test-fr#req-2"
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

test('api/index.yaml supports a protocol-standard surface without synthetic OpenAPI', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - type: standard
    name: OpenID Connect
    reference: https://openid.net/specs/openid-connect-core-1_0.html
    discovery: /.well-known/openid-configuration
`,
    'api/coverage.yaml': `version: 1
requirements:
  - id: "govstack-bb-test-fr#req-1"
    disposition: external
    reference: https://openid.net/specs/openid-connect-core-1_0.html
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    assert.equal(r.json.summary.filesLinted, 0);
    assert.ok(r.json.notices.some((notice) => notice.includes('Standard-defined API surface')));
  } finally {
    cleanup(dir);
  }
});

test('protocol-standard surfaces remain blocked in conformance until a registry is approved', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - type: standard
    name: Example protocol
    reference: https://example.org/specification
`,
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('standard-surface-unverified'));
  } finally {
    cleanup(dir);
  }
});

test('standard surface inventory requires an HTTPS normative reference', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - type: standard
    name: OpenID Connect
    reference: http://example.org/oidc
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('api-index-invalid'));
  } finally {
    cleanup(dir);
  }
});

test('api/index.yaml rejects a noApi field alongside declared surfaces', () => {
  const dir = makeRepo({
    'api/index.yaml': `version: 1
noApi: false
apis:
  - type: openapi
    path: api/openapi.yaml
`,
    'api/openapi.yaml': cleanOpenapi(),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('api-index-invalid'));
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

test('complete example contracts under api/examples are linted and can fail the run', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/examples/deployment.openapi.yaml': openapiMissingContact(),
    'api/examples/nested/events.asyncapi.yaml': cleanAsyncapi(),
    'api/examples/components.yaml': `openapi: 3.1.0
info: { title: Example components, version: 1.0.0 }
paths: {}
components:
  schemas:
    Identifier: { type: string }
`,
    'api/examples/deployment.schema.json': '{"type":"object"}',
    'api/examples/README.md': 'Illustrative deployment contracts.',
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1, `${r.stderr}\n${r.stdout}`);
    assert.deepEqual(
      r.json.files.map((file) => file.path).sort(),
      ['api/examples/deployment.openapi.yaml', 'api/examples/nested/events.asyncapi.yaml', 'api/openapi.yaml'],
    );
    const byPath = new Map(r.json.files.map((file) => [file.path, file.findings.map((f) => f.code)]));
    assert.deepEqual(byPath.get('api/examples/deployment.openapi.yaml'), ['govstack-2.5-contact']);
    assert.deepEqual(byPath.get('api/examples/nested/events.asyncapi.yaml'), []);
    assert.deepEqual(byPath.get('api/openapi.yaml'), []);
    assert.equal(r.json.summary.filesLinted, 3);
  } finally {
    cleanup(dir);
  }
});

test('example contracts declare the guide version and do not satisfy coverage', () => {
  const exampleOnly = `  /v1/others:
    get:
      operationId: exampleOnly
      responses:
        '200': { description: ok }
`;
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/examples/deployment.openapi.yaml': `${cleanOpenapi('0.1.0')}${exampleOnly}`,
    'api/coverage.yaml': `version: 1
requirements:
  - { id: "govstack-bb-test-fr#req-1", disposition: operation, operations: [listThings] }
  - { id: "govstack-bb-test-fr#req-2", disposition: operation, operations: [exampleOnly] }
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1, `${r.stderr}\n${r.stdout}`);
    const byPath = new Map(r.json.files.map((file) => [file.path, file.findings.map((f) => f.code)]));
    assert.deepEqual(byPath.get('api/coverage.yaml'), ['coverage-missing-reference']);
    // version and rulesetVersion both differ from the supported draft.
    assert.deepEqual(byPath.get('api/examples/deployment.openapi.yaml'), ['guide-version', 'guide-version']);
  } finally {
    cleanup(dir);
  }
});

test('explicit spec flags lint only the named files, not api/examples', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/examples/deployment.openapi.yaml': openapiMissingContact(),
  });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--openapi', 'api/openapi.yaml', '--ruleset', MINI_RULESET, ...ADVISORY,
    ]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    assert.deepEqual(r.json.files.map((file) => file.path), ['api/openapi.yaml']);
  } finally {
    cleanup(dir);
  }
});

test('an example declared in api/index.yaml is linted once', () => {
  const dir = makeRepo({
    'api/index.yaml': 'version: 1\napis:\n  - type: openapi\n    path: api/examples/openapi.yaml\n',
    'api/examples/openapi.yaml': openapiMissingContact(),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1, `${r.stderr}\n${r.stdout}`);
    assert.deepEqual(codes(r.json), ['govstack-2.5-contact']);
    assert.equal(r.json.summary.filesLinted, 1);
  } finally {
    cleanup(dir);
  }
});

test('api/legacy preserves historical contracts without hiding other undeclared specs', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/legacy/README.md': 'Historical contracts only; these are not current API surfaces.',
    'api/legacy/v1/openapi.yaml': cleanOpenapi(),
    'api/legacy/v1/events.json': '{"asyncapi":"3.0.0","info":{"title":"Historical events"}}',
    'api/legacy-current/openapi.yaml': cleanOpenapi(),
    'legacy/openapi.yaml': cleanOpenapi(),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    const paths = r.json.files
      .filter((file) => file.findings.some((finding) => finding.code === 'file-undeclared-spec'))
      .map((file) => file.path)
      .sort();
    assert.deepEqual(paths, ['api/legacy-current/openapi.yaml', 'legacy/openapi.yaml']);
  } finally {
    cleanup(dir);
  }
});

test('a contract explicitly declared under api/legacy still undergoes validation', () => {
  const dir = makeRepo({
    'api/index.yaml': 'version: 1\napis:\n  - type: openapi\n    path: api/legacy/openapi.yaml\n',
    'api/legacy/openapi.yaml': '',
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('declared-spec-empty'));
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
  - { id: "govstack-bb-test-fr#req-1", disposition: operation, operations: [sameOperation] }
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
  - { id: "govstack-bb-test-fr#req-1", disposition: external, reference: https://example.org/one }
  - { id: "govstack-bb-extra-fr#req-1", disposition: external, reference: https://example.org/extra }
`,
    'spec/requirements.md': `# Requirements

### #1 The API exposes the first contract (REQUIRED EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-1\`

The API exposes the first contract.

### #2 The API exposes the second contract (RECOMMENDED EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-2\`

The API exposes the second contract.

- **OLD-FR-003** **OPTIONAL**: Old prose requirement.
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

test('draft, deprecated, and inapplicable requirements are not active coverage obligations', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'spec/requirements.md': `# Requirements

### #1 Active requirement (REQUIRED EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-1\`

Active contract.

### #2 Proposed requirement (DRAFT EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-2\`

Proposed contract.

### #3 Retired requirement (DEPRECATED REPLACEABLE AUDITABLE)

\`govstack-bb-test-fr#req-3\`

Retired contract.

### #4 Inherited exclusion (RECOMMENDED INAPPLICABLE AUDITABLE)

\`govstack-bb-test-cfr#req-4 replaces govstack-cfr-quality#req-4\`

The parent does not apply because this surface uses a protocol-native contract.
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  } finally {
    cleanup(dir);
  }
});

test('planned coverage is blocking in conformance and advisory-only in advisory mode', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: "govstack-bb-test-fr#req-1"
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

test('draft-only contracts validate with empty active coverage and optional draft mappings', () => {
  for (const draftMapping of ['', `draftRequirements:
  - { id: "govstack-bb-test-fr#req-1", disposition: operation, operations: [listThings] }
`]) {
    const dir = makeRepo({
      'api/openapi.yaml': cleanOpenapi(),
      'api/coverage.yaml': `version: 1\nrequirements: []\n${draftMapping}`,
      'spec/requirements.md': DRAFT_REQUIREMENTS,
    });
    try {
      const bin = fakeOpenapiValidator(dir);
      const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET], {
        env: { ...process.env, PATH: bin },
      });
      assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
      assert.ok(r.json.notices.some((notice) => notice.includes('No active REQUIRED or RECOMMENDED')));
      assert.ok(r.json.notices.some((notice) => notice.includes('does not establish requirement maturity')));
      if (draftMapping) assert.ok(r.json.notices.some((notice) => notice.includes('optional design traceability')));
    } finally {
      cleanup(dir);
    }
  }
});

test('draft coverage validates marker maturity, references, and array shape', () => {
  for (const [coverage, expectedCode] of [
    [`requirements: []\ndraftRequirements:\n  - { id: "govstack-bb-test-fr#req-1", disposition: operation, operations: [missingOperation] }\n`, 'coverage-missing-reference'],
    [`requirements: []\ndraftRequirements:\n  - { id: "govstack-bb-test-fr#req-3", disposition: operation, operations: [listThings] }\n`, 'coverage-unknown-requirement'],
    [`requirements:\n  - { id: "govstack-bb-test-fr#req-1", disposition: operation, operations: [listThings] }\n`, 'coverage-unknown-requirement'],
    ['requirements: []\ndraftRequirements: null\n', 'coverage-invalid'],
  ]) {
    const dir = makeRepo({
      'api/openapi.yaml': cleanOpenapi(),
      'api/coverage.yaml': `version: 1\n${coverage}`,
      'spec/requirements.md': DRAFT_REQUIREMENTS,
    });
    try {
      const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
      assert.equal(r.status, 1);
      assert.ok(codes(r.json).includes(expectedCode), r.stdout);
    } finally {
      cleanup(dir);
    }
  }
});

test('draft mappings cannot conceal missing active coverage', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements: []
draftRequirements:
  - { id: "govstack-bb-test-fr#req-1", disposition: operation, operations: [listThings] }
  - { id: "govstack-bb-test-fr#req-2", disposition: operation, operations: [listThings] }
`,
    'spec/requirements.md': DRAFT_REQUIREMENTS.replace('Proposed retrieval (DRAFT', 'Proposed retrieval (REQUIRED'),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1);
    assert.ok(codes(r.json).includes('coverage-unknown-requirement'));
    assert.ok(codes(r.json).includes('coverage-missing-requirement'));
  } finally {
    cleanup(dir);
  }
});

test('planned draft work remains explicit without blocking active artifact validation', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements: []
draftRequirements:
  - { id: "govstack-bb-test-fr#req-1", disposition: planned, issue: https://example.org/issues/123 }
`,
    'spec/requirements.md': DRAFT_REQUIREMENTS,
  });
  try {
    const bin = fakeOpenapiValidator(dir);
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, '--fail-on', 'warn'], {
      env: { ...process.env, PATH: bin },
    });
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    assert.ok(r.json.notices.some((notice) => notice.includes('remains planned draft work and is not implemented')));
    assert.ok(!codes(r.json).includes('coverage-planned'));
  } finally {
    cleanup(dir);
  }
});

test('coverage rejects disposition-incompatible extra fields', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: "govstack-bb-test-fr#req-1"
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

test('coverage can trace a REQUIRED requirement to non-API verification', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: "govstack-bb-test-fr#req-1"
    disposition: non-api
    rationale: This requirement is verified through the BB audit procedure.
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  } finally {
    cleanup(dir);
  }
});

test('coverage accepts version-qualified CFR requirement identifiers', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': `version: 1
requirements:
  - id: "govstack-bb-test-fr-2.3.0#req-7"
    disposition: external
    reference: https://example.org/requirements/7
`,
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  } finally {
    cleanup(dir);
  }
});

test('requirement markers require an exact level-three heading and body text', () => {
  const wrongDepth = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'spec/requirements.md': `## #1 Wrong depth (REQUIRED EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-1\`

This requirement has body text.
`,
  });
  const missingBody = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'spec/requirements.md': `### #1 Empty requirement (REQUIRED EXTENSIBLE OBSERVABLE)

\`govstack-bb-test-fr#req-1\`

### Notes
`,
  });
  try {
    const depthResult = runCliJson(['--repo-root', wrongDepth, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(depthResult.status, 1);
    assert.ok(codes(depthResult.json).includes('requirements-invalid-marker'));

    const bodyResult = runCliJson(['--repo-root', missingBody, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(bodyResult.status, 1);
    assert.ok(codes(bodyResult.json).includes('requirements-invalid-marker'));
  } finally {
    cleanup(wrongDepth);
    cleanup(missingBody);
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

test('missing validators report pinned validator setup commands', () => {
  const cases = [
    ['api/openapi.yaml', cleanOpenapi(), /uv tool install openapi-spec-validator==0\.9\.0/],
    ['api/asyncapi.yaml', cleanAsyncapi(), /npm install --global @asyncapi\/cli@6\.0\.2/],
  ];
  for (const [filename, contents, expected] of cases) {
    const dir = makeRepo({ [filename]: contents, 'api/coverage.yaml': VALID_COVERAGE });
    try {
      const result = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET], {
        env: { ...process.env, PATH: '' },
      });
      assert.equal(result.status, 1, result.stderr);
      const findings = result.json.files.flatMap((file) => file.findings)
        .filter((finding) => finding.code === 'base-validator-unavailable');
      assert.equal(findings.length, 1);
      assert.match(findings[0].message, expected);
    } finally {
      cleanup(dir);
    }
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

test('unparseable example contract is an operational error naming the file', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/examples/broken.openapi.yaml': 'openapi: 3.1.0\ninfo: {title: [oops\n',
  });
  try {
    const r = runCli(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Cannot parse spec file api\/examples\/broken\.openapi\.yaml/);
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

const openapiWithProfile = (profileLine) => cleanOpenapi().replace(
  `rulesetVersion: ${GUIDE_VERSION}`,
  `rulesetVersion: ${GUIDE_VERSION}${profileLine === null ? '' : `\n    profile: ${profileLine}`}`,
);

function profileFindings(report) {
  return report.files.flatMap((file) => file.findings.filter((finding) => finding.code === 'guide-profile'));
}

function withProfileRepo(profileLine, fn) {
  const dir = makeRepo({
    'api/openapi.yaml': openapiWithProfile(profileLine),
    'api/coverage.yaml': VALID_COVERAGE,
  });
  try {
    fn(dir);
  } finally {
    cleanup(dir);
  }
}

test('an invalid declared profile is an error in conformance and a warning in advisory', () => {
  for (const value of ['strict', '42', '[legacy]']) {
    withProfileRepo(value, (dir) => {
      const bin = fakeOpenapiValidator(dir);
      const conform = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET], {
        env: { ...process.env, PATH: bin },
      });
      assert.equal(conform.status, 1, `${conform.stderr}\n${conform.stdout}`);
      const [finding] = profileFindings(conform.json);
      assert.equal(finding?.severity, 'error', value);
      assert.equal(finding.guideRule, '20.3');

      const advisory = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
      assert.equal(advisory.status, 0, advisory.stderr);
      assert.equal(profileFindings(advisory.json)[0]?.severity, 'warn', value);
    });
  }
});

test('a surface declaring profile legacy is told to run with --profile legacy', () => {
  withProfileRepo('legacy', (dir) => {
    for (const extra of [[], ['--profile', 'standard'], ['--profile', 'strict'], ['--strict']]) {
      const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY, ...extra]);
      assert.equal(r.status, 0, r.stderr);
      const findings = profileFindings(r.json);
      assert.equal(findings.length, 1, JSON.stringify(extra));
      assert.equal(findings[0].severity, 'info');
      assert.match(findings[0].message, /surface declares profile legacy; run with --profile legacy/);
    }
  });
});

test('the legacy run profile warns on a surface that does not declare profile legacy', () => {
  for (const value of [null, 'standard']) {
    withProfileRepo(value, (dir) => {
      const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY, '--profile', 'legacy']);
      assert.equal(r.status, 0, r.stderr);
      const findings = profileFindings(r.json);
      assert.equal(findings.length, 1, String(value));
      assert.equal(findings[0].severity, 'warn');
      assert.match(findings[0].message, /legacy profile used for a surface that does not declare profile: legacy/);
    });
  }
});

test('the legacy run profile is silent on a surface declaring profile legacy', () => {
  withProfileRepo('legacy', (dir) => {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY, '--profile', 'legacy']);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(profileFindings(r.json), []);
  });
  withProfileRepo('standard', (dir) => {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.deepEqual(profileFindings(r.json), []);
  });
});

test('--profile rejects unknown values and conflicts with --strict', () => {
  const dir = makeRepo({});
  try {
    const bogus = runCli(['--repo-root', dir, '--profile', 'lenient', ...ADVISORY]);
    assert.equal(bogus.status, 2);
    assert.match(bogus.stderr, /Invalid --profile value "lenient"/);

    const conflict = runCli(['--repo-root', dir, '--strict', '--profile', 'legacy', ...ADVISORY]);
    assert.equal(conflict.status, 2);
    assert.match(conflict.stderr, /--strict .* --profile legacy/);
  } finally {
    cleanup(dir);
  }
});

test('--help prints usage including --profile and exits 0', () => {
  const r = runCli(['--help']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Usage: /);
  assert.match(r.stdout, /--profile <standard\|strict\|legacy>/);
});

const PROPERTY_DESCRIPTION_RULESET = `rules:
  govstack-4.1-property-description:
    description: Every property needs a description
    message: Property description is required
    given: "$.components.schemas.*.properties.*"
    severity: warn
    then:
      field: description
      function: truthy
`;

const externalRefOpenapi = (schemaNames, scopes) => {
  const exceptions = scopes.length === 0 ? '' : `
    exceptions:
${scopes.map((scope, i) => `      - rule: "4.1"
        scope: ${JSON.stringify(scope)}
        rationale: "Temporary exception for external schema occurrence ${i + 1}."
        record: "https://example.org/exceptions/EXTERNAL-${i + 1}"
        reviewedBy: "API Working Group"
        reviewedAt: "2026-07-10"
        expiresAt: "2099-12-31"`).join('\n')}`;
  const base = cleanOpenapi().replace(
    `rulesetVersion: ${GUIDE_VERSION}`,
    `rulesetVersion: ${GUIDE_VERSION}${exceptions}`,
  );
  const schemas = schemaNames
    .map((name) => `    ${name}: { $ref: './schemas/shared.yaml' }`)
    .join('\n');
  return `${base}
components:
  schemas:
${schemas}
`;
};

function runExternalRefExceptionCase(schemaNames, scopes) {
  const dir = makeRepo({
    'api/openapi.yaml': externalRefOpenapi(schemaNames, scopes),
    'api/schemas/shared.yaml': `type: object
properties:
  name:
    type: string
`,
    'api/coverage.yaml': VALID_COVERAGE,
    'property-ruleset.yaml': PROPERTY_DESCRIPTION_RULESET,
  });
  try {
    const args = ['--repo-root', dir, '--ruleset', path.join(dir, 'property-ruleset.yaml'), ...ADVISORY];
    return { ...runCliJson(args), text: runCli(args) };
  } finally {
    cleanup(dir);
  }
}

test('a scoped exception suppresses a finding reached through its external ref', () => {
  const r = runExternalRefExceptionCase(['First'], ['/components/schemas/First']);
  assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  assert.equal(r.json.summary.warnings, 0);
  assert.equal(r.json.summary.suppressed, 1);
  const [suppressed] = r.json.files.find((file) => file.path === 'api/schemas/shared.yaml')?.suppressed ?? [];
  assert.equal(suppressed?.exceptionRecord, 'https://example.org/exceptions/EXTERNAL-1');
  assert.deepEqual(suppressed?.exceptionRecords, ['https://example.org/exceptions/EXTERNAL-1']);
});

test('one scoped exception cannot suppress the same external defect through another ref', () => {
  const r = runExternalRefExceptionCase(
    ['First', 'Second'],
    ['/components/schemas/First'],
  );
  assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  const source = r.json.files.find((file) => file.path === 'api/schemas/shared.yaml');
  assert.equal(source?.findings.length, 1);
  assert.equal(source?.suppressed.length, 0);
  assert.equal(r.json.summary.suppressed, 0);
});

test('scoped exceptions for every external ref suppress the deduplicated defect', () => {
  const r = runExternalRefExceptionCase(
    ['First', 'Second'],
    ['/components/schemas/First', '/components/schemas/Second'],
  );
  assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  assert.equal(r.json.summary.warnings, 0);
  assert.equal(r.json.summary.suppressed, 1);
  const [suppressed] = r.json.files.find((file) => file.path === 'api/schemas/shared.yaml')?.suppressed ?? [];
  assert.equal(suppressed?.exceptionRecord, 'https://example.org/exceptions/EXTERNAL-1');
  assert.deepEqual(suppressed?.exceptionRecords, [
    'https://example.org/exceptions/EXTERNAL-1',
    'https://example.org/exceptions/EXTERNAL-2',
  ]);
  assert.match(
    r.text.stdout,
    /records: https:\/\/example\.org\/exceptions\/EXTERNAL-1, https:\/\/example\.org\/exceptions\/EXTERNAL-2/,
  );
});

test('a root exception suppresses findings reached through external refs', () => {
  const r = runExternalRefExceptionCase(['First', 'Second'], ['']);
  assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
  assert.equal(r.json.summary.warnings, 0);
  assert.equal(r.json.summary.suppressed, 1);
});

function runChainedExternalRefCase(rootSchemas, scopes, sharedSchema) {
  const dir = makeRepo({
    'api/openapi.yaml': externalRefOpenapi(rootSchemas, scopes)
      .replaceAll("'./schemas/shared.yaml'", "'./schemas/wrapper.yaml'"),
    'api/schemas/wrapper.yaml': `type: object
properties:
  nested:
    $ref: './shared.yaml#/$defs/First'
`,
    'api/schemas/shared.yaml': sharedSchema,
    'api/coverage.yaml': VALID_COVERAGE,
    'property-ruleset.yaml': PROPERTY_DESCRIPTION_RULESET,
  });
  try {
    return runCliJson([
      '--repo-root', dir, '--ruleset', path.join(dir, 'property-ruleset.yaml'), ...ADVISORY,
    ]);
  } finally {
    cleanup(dir);
  }
}

const SHARED_SCHEMA_WITH_FRAGMENTS = `$defs:
  First:
    type: object
    properties:
      name: { type: string }
  Second:
    type: object
    properties:
      name: { type: string, description: Already documented }
`;

test('a covered direct ref cannot hide an unexcepted transitive ref to the same source', () => {
  const root = externalRefOpenapi(['Direct', 'Wrapped'], ['/components/schemas/Direct'])
    .replace("Wrapped: { $ref: './schemas/shared.yaml' }", "Wrapped: { $ref: './schemas/wrapper.yaml' }");
  const dir = makeRepo({
    'api/openapi.yaml': root,
    'api/schemas/wrapper.yaml': `type: object
properties:
  nested: { $ref: './shared.yaml' }
`,
    'api/schemas/shared.yaml': `type: object
properties:
  name: { type: string }
`,
    'api/coverage.yaml': VALID_COVERAGE,
    'property-ruleset.yaml': PROPERTY_DESCRIPTION_RULESET,
  });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--ruleset', path.join(dir, 'property-ruleset.yaml'), ...ADVISORY,
    ]);
    const source = r.json.files.find((file) => file.path === 'api/schemas/shared.yaml');
    assert.ok(source?.findings.length > 0, `${r.stderr}\n${r.stdout}`);
    assert.equal(source?.suppressed.length, 0);
  } finally {
    cleanup(dir);
  }
});

test('an exception on an unrelated fragment cannot suppress a transitive source finding', () => {
  const root = externalRefOpenapi(['Wrapped', 'Unrelated'], ['/components/schemas/Unrelated'])
    .replace("Wrapped: { $ref: './schemas/shared.yaml' }", "Wrapped: { $ref: './schemas/wrapper.yaml' }")
    .replace("Unrelated: { $ref: './schemas/shared.yaml' }", "Unrelated: { $ref: './schemas/shared.yaml#/$defs/Second' }");
  const dir = makeRepo({
    'api/openapi.yaml': root,
    'api/schemas/wrapper.yaml': `type: object
properties:
  nested: { $ref: './shared.yaml#/$defs/First' }
`,
    'api/schemas/shared.yaml': SHARED_SCHEMA_WITH_FRAGMENTS,
    'api/coverage.yaml': VALID_COVERAGE,
    'property-ruleset.yaml': PROPERTY_DESCRIPTION_RULESET,
  });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--ruleset', path.join(dir, 'property-ruleset.yaml'), ...ADVISORY,
    ]);
    const source = r.json.files.find((file) => file.path === 'api/schemas/shared.yaml');
    assert.equal(source?.findings.length, 1, `${r.stderr}\n${r.stdout}`);
    assert.equal(source?.suppressed.length, 0);
  } finally {
    cleanup(dir);
  }
});

test('a scope on the single root origin suppresses a chained external finding', () => {
  const r = runChainedExternalRefCase(
    ['Wrapped'],
    ['/components/schemas/Wrapped'],
    SHARED_SCHEMA_WITH_FRAGMENTS,
  );
  assert.equal(r.json.summary.warnings, 0, `${r.stderr}\n${r.stdout}`);
  assert.equal(r.json.summary.suppressed, 1);
});

test('a root exception suppresses a finding when every reference is indirect', () => {
  const r = runChainedExternalRefCase(['Wrapped'], [''], SHARED_SCHEMA_WITH_FRAGMENTS);
  assert.equal(r.json.summary.warnings, 0, `${r.stderr}\n${r.stdout}`);
  assert.equal(r.json.summary.suppressed, 1);
});

test('findings in a multiply referenced external schema use the source file and deduplicate', () => {
  const withSharedSchema = (operationId) => `${cleanOpenapi().replace('listThings', operationId)}
components:
  schemas:
    First: { $ref: './schemas/shared.yaml' }
    Second: { $ref: './schemas/shared.yaml' }
`;
  const dir = makeRepo({
    'api/index.yaml': `version: 1
apis:
  - { type: openapi, path: api/first.yaml }
  - { type: openapi, path: api/second.yaml }
`,
    'api/first.yaml': withSharedSchema('listFirst'),
    'api/second.yaml': withSharedSchema('listSecond'),
    'api/schemas/shared.yaml': `type: object
properties:
  name:
    type: string
`,
    'api/coverage.yaml': VALID_COVERAGE,
    'property-ruleset.yaml': PROPERTY_DESCRIPTION_RULESET,
  });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--ruleset', path.join(dir, 'property-ruleset.yaml'), ...ADVISORY,
    ]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    const external = r.json.files.find((file) => file.path === 'api/schemas/shared.yaml');
    assert.ok(external, JSON.stringify(r.json.files, null, 2));
    assert.equal(external.findings.length, 1);
    assert.equal(external.findings[0].code, 'govstack-4.1-property-description');
    assert.ok(!r.json.files.find((file) => file.path === 'api/first.yaml').findings.length);
    assert.ok(!r.json.files.find((file) => file.path === 'api/second.yaml').findings.length);
  } finally {
    cleanup(dir);
  }
});

test('repository scan reports malformed API candidates but ignores unrelated malformed YAML', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/broken.yaml': 'openapi: 3.1.0\ninfo: [\n',
    'deploy/unrelated.yaml': 'service: [\n',
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    assert.equal(r.status, 1, `${r.stderr}\n${r.stdout}`);
    const malformed = r.json.files.filter((file) =>
      file.findings.some((finding) => finding.code === 'file-unparseable-spec'));
    assert.equal(malformed.length, 1);
    assert.equal(malformed[0].path, 'api/broken.yaml');
    assert.equal(malformed[0].findings[0].guideRule, '4.5');
    assert.ok(!r.json.files.some((file) => file.path === 'deploy/unrelated.yaml'));
  } finally {
    cleanup(dir);
  }
});

test('undeclared OpenAPI findings cite canonical entrypoint and inventory rules', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/copy.yaml': cleanOpenapi(),
  });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    const finding = r.json.files
      .find((file) => file.path === 'api/copy.yaml')
      ?.findings.find((item) => item.code === 'file-undeclared-spec');
    assert.equal(finding?.guideRule, '4.5');
    assert.match(finding?.message ?? '', /guide §2\.2 and §4\.5/);
  } finally {
    cleanup(dir);
  }
});

test('an explicit OpenAPI run does not repeat findings for other repository surfaces', () => {
  const dir = makeRepo({
    'api/openapi.yaml': cleanOpenapi(),
    'api/coverage.yaml': VALID_COVERAGE,
    'api/copy.yaml': cleanOpenapi(),
  });
  try {
    const r = runCliJson([
      '--repo-root', dir, '--openapi', 'api/openapi.yaml', '--ruleset', MINI_RULESET, ...ADVISORY,
    ]);
    assert.equal(r.status, 0, `${r.stderr}\n${r.stdout}`);
    assert.deepEqual(r.json.files.map((file) => file.path), ['api/openapi.yaml']);
  } finally {
    cleanup(dir);
  }
});

test('grouped text preserves property locations and explains truncated locations', () => {
  const properties = Array.from({ length: 7 }, (_, i) => `        property${i + 1}: { type: string }`).join('\n');
  const dir = makeRepo({
    'api/openapi.yaml': `${cleanOpenapi()}
components:
  schemas:
    Example:
      type: object
      properties:
${properties}
`,
    'api/coverage.yaml': VALID_COVERAGE,
    'property-ruleset.yaml': PROPERTY_DESCRIPTION_RULESET,
  });
  try {
    const args = ['--repo-root', dir, '--ruleset', path.join(dir, 'property-ruleset.yaml'), ...ADVISORY];
    const json = runCliJson(args);
    const propertyFindings = json.json.files.flatMap((file) => file.findings)
      .filter((finding) => finding.code === 'govstack-4.1-property-description');
    assert.equal(propertyFindings.length, 7);
    assert.equal(new Set(propertyFindings.map((finding) => finding.range.start.line)).size, 7);

    const text = runCli(args);
    assert.equal(text.status, 0, `${text.stderr}\n${text.stdout}`);
    assert.match(text.stdout, /govstack-4\.1-property-description \(§4\.1\) ×7/);
    assert.match(text.stdout, /at (?:\d+:\d+, ){4}\d+:\d+, 2 more; use `--format json`/);
  } finally {
    cleanup(dir);
  }
});

test('missing coverage cites guide rule 4.6', () => {
  const dir = makeRepo({ 'api/openapi.yaml': cleanOpenapi() });
  try {
    const r = runCliJson(['--repo-root', dir, '--ruleset', MINI_RULESET, ...ADVISORY]);
    const finding = r.json.files
      .flatMap((file) => file.findings)
      .find((item) => item.code === 'coverage-missing');
    assert.equal(finding?.guideRule, '4.6');
  } finally {
    cleanup(dir);
  }
});
