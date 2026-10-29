// The legacy profile (legacy.yaml) reports wire-contract rules at info and
// leaves documentation rules at their ruleset.yaml severity. These checks load
// legacy.yaml through the same bundler as every other test, so a rule added to
// a fragment without regenerating legacy.yaml fails here.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import YAML from 'yaml';
import { loadRuleset, LINTER_DIR, RULESET_PATH } from './_lint-helper.mjs';
import { classify } from '../scripts/gen-legacy-profile.mjs';

const LEGACY_PATH = resolve(LINTER_DIR, 'legacy.yaml');
const standard = (await loadRuleset(RULESET_PATH)).rules;
const legacy = (await loadRuleset(LEGACY_PATH)).rules;
const listed = Object.keys(YAML.parse(readFileSync(LEGACY_PATH, 'utf8')).rules ?? {});

// spectral-core severities: 0 error, 1 warn, 2 info, 3 hint.
const INFO = 2;

test('classify sorts guide rule ids into wire and documentation', () => {
  for (const name of ['govstack-2.1', 'govstack-2.6', 'govstack-3.5-semver', 'govstack-4.7', 'govstack-7.13',
    'govstack-7.14-creation-status', 'govstack-7.21', 'govstack-13.1', 'govstack-18.1', 'govstack-20.3']) {
    assert.equal(classify(name), 'documentation', name);
  }
  for (const name of ['govstack-2.6-version', 'govstack-5.1', 'govstack-7.2', 'govstack-7.141', 'govstack-12.7-name', 'govstack-13.2',
    'govstack-13.7', 'govstack-15.8-callbacks', 'govstack-18.2', 'govstack-19.1']) {
    assert.equal(classify(name), 'wire', name);
  }
  assert.throws(() => classify('govstack-1.1'));
  assert.throws(() => classify('not-a-govstack-rule'));
});

test('legacy.yaml carries every rule in ruleset.yaml', () => {
  const missing = Object.keys(standard).filter((name) => !(name in legacy));
  assert.deepEqual(missing, []);
});

test('legacy.yaml lists no unknown rule name and only wire rules', () => {
  const unknown = listed.filter((name) => !(name in standard));
  assert.deepEqual(unknown, []);
  const documentation = listed.filter((name) => classify(name) !== 'wire');
  assert.deepEqual(documentation, []);
});

test('legacy.yaml reports every wire rule at info', () => {
  const wrong = Object.keys(standard)
    .filter((name) => classify(name) === 'wire')
    .filter((name) => legacy[name].severity !== INFO)
    .map((name) => `${name}: ${legacy[name].severity}`);
  assert.deepEqual(wrong, []);
});

test('legacy.yaml keeps documentation rules at their ruleset.yaml severity', () => {
  const doc = Object.keys(standard).filter((name) => classify(name) === 'documentation');
  assert.ok(doc.length > 0);
  const changed = doc
    .filter((name) => legacy[name].severity !== standard[name].severity)
    .map((name) => `${name}: ${standard[name].severity} -> ${legacy[name].severity}`);
  assert.deepEqual(changed, []);
});
