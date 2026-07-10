// Data-driven fixture runner.
//
// Every directory under tests/fixtures/ is named after a Spectral rule and
// contains fail.yaml (a minimal doc where that rule MUST fire) and pass.yaml
// (the corrected doc where that rule MUST be silent). Optional meta.yaml with
// `expect_fail_count: N` pins the number of findings in fail.yaml.
//
// The full strict bundle (ruleset.yaml + strict.yaml) is loaded once; findings
// are filtered by `code === <dir name>` so unrelated rules firing on a fixture
// are ignored (expected and fine).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { makeSpectral, lintFile } from './_lint-helper.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

const spectral = await makeSpectral(); // strict bundle, once

const dirs = existsSync(FIXTURES)
  ? readdirSync(FIXTURES, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [];

const fmt = (findings) =>
  JSON.stringify(findings.map((f) => ({ message: f.message, path: f.path.join('/') })), null, 2);

for (const name of dirs) {
  test(`fixture ${name}`, async () => {
    const dir = join(FIXTURES, name);
    const failPath = join(dir, 'fail.yaml');
    const passPath = join(dir, 'pass.yaml');
    assert.ok(existsSync(failPath), `${name}: missing fail.yaml`);
    assert.ok(existsSync(passPath), `${name}: missing pass.yaml`);

    let expectExact = null;
    const metaPath = join(dir, 'meta.yaml');
    if (existsSync(metaPath)) {
      const meta = YAML.parse(readFileSync(metaPath, 'utf8')) || {};
      if (Number.isInteger(meta.expect_fail_count)) expectExact = meta.expect_fail_count;
    }

    const fail = (await lintFile(spectral, failPath)).filter((f) => f.code === name);
    const pass = (await lintFile(spectral, passPath)).filter((f) => f.code === name);

    if (expectExact === null) {
      assert.ok(
        fail.length >= 1,
        `${name}/fail.yaml: expected >=1 finding of "${name}", got ${fail.length}.`,
      );
    } else {
      assert.equal(
        fail.length,
        expectExact,
        `${name}/fail.yaml: expected exactly ${expectExact} findings of "${name}" ` +
          `(meta.yaml), got ${fail.length}:\n${fmt(fail)}`,
      );
    }

    assert.equal(
      pass.length,
      0,
      `${name}/pass.yaml: expected 0 findings of "${name}", got ${pass.length}:\n${fmt(pass)}`,
    );
  });
}

test('fixtures directory is non-empty', () => {
  assert.ok(dirs.length > 0, 'no fixture directories found under tests/fixtures/');
});
