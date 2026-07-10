// Coverage drift checks. Opt-in: only runs under COVERAGE_ENFORCE=1, otherwise
// every check is skipped (with a message). Reconciles three artefacts:
//   ../rules.yaml       — the 166-rule catalogue (source of truth)
//   ./coverage.yaml     — the coverage contract (rule -> status -> spectral rules)
//   ruleset.yaml/strict.yaml bundles — the rules actually shipped
//
// It NEVER edits coverage.yaml; it only asserts they agree.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { loadRuleset, LINTER_DIR, RULESET_PATH, STRICT_PATH } from './_lint-helper.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'fixtures');

const enforce = process.env.COVERAGE_ENFORCE === '1';
const opts = enforce ? {} : { skip: 'set COVERAGE_ENFORCE=1 to run coverage drift checks' };

const IMPLEMENTED = new Set(['implemented', 'partial-proxy']);

// ---- load artefacts (guarded so the skipped case never throws at import) ----
function loadCatalogueIds() {
  const doc = YAML.parse(readFileSync(resolve(LINTER_DIR, '..', 'rules.yaml'), 'utf8'));
  return (doc.rules || []).map((r) => String(r.id));
}
function loadCoverage() {
  const doc = YAML.parse(readFileSync(join(LINTER_DIR, 'coverage.yaml'), 'utf8'));
  return doc.rules || [];
}
function unionSpectralRules(coverage, statusFilter) {
  const set = new Set();
  for (const e of coverage) {
    if (statusFilter(e.status)) for (const r of e.spectral_rules || []) set.add(r);
  }
  return set;
}
function diff(a, b) {
  return [...a].filter((x) => !b.has(x));
}
function assertSameSet(actual, expected, label) {
  const missing = diff(expected, actual); // in contract, not shipped
  const extra = diff(actual, expected); // shipped, not in contract
  assert.ok(
    missing.length === 0 && extra.length === 0,
    `${label}\n  in contract but not shipped: ${JSON.stringify(missing)}\n` +
      `  shipped but not in contract: ${JSON.stringify(extra)}`,
  );
}

test('(a) rules.yaml and coverage.yaml list exactly the same rule ids, once each', opts, () => {
  const catalogue = loadCatalogueIds();
  const coverage = loadCoverage();
  const covIds = coverage.map((e) => String(e.id));

  const dupes = covIds.filter((id, i) => covIds.indexOf(id) !== i);
  assert.equal(dupes.length, 0, `coverage.yaml has duplicate ids: ${JSON.stringify([...new Set(dupes)])}`);

  assertSameSet(new Set(covIds), new Set(catalogue), 'rule id mismatch between rules.yaml and coverage.yaml:');
});

test('(b) implemented/partial-proxy spectral_rules == rules shipped in ruleset.yaml', opts, async () => {
  const coverage = loadCoverage();
  const contract = unionSpectralRules(coverage, (s) => IMPLEMENTED.has(s));
  const bundle = new Set(Object.keys((await loadRuleset(RULESET_PATH)).rules));
  assertSameSet(bundle, contract, 'ruleset.yaml bundle vs coverage implemented/partial-proxy:');
});

test('(c) strict-only spectral_rules == the extra rules strict.yaml adds', opts, async () => {
  const coverage = loadCoverage();
  const contract = unionSpectralRules(coverage, (s) => s === 'strict-only');
  const main = new Set(Object.keys((await loadRuleset(RULESET_PATH)).rules));
  const strict = new Set(Object.keys((await loadRuleset(STRICT_PATH)).rules));
  const strictExtra = new Set(diff(strict, main));
  assertSameSet(strictExtra, contract, 'strict.yaml extra rules vs coverage strict-only:');
});

test('(d) every implemented/partial-proxy/strict-only rule has pass+fail fixtures', opts, () => {
  const coverage = loadCoverage();
  const names = unionSpectralRules(coverage, (s) => IMPLEMENTED.has(s) || s === 'strict-only');
  const missing = [];
  for (const name of names) {
    const dir = join(FIXTURES, name);
    if (!existsSync(join(dir, 'pass.yaml')) || !existsSync(join(dir, 'fail.yaml'))) missing.push(name);
  }
  assert.equal(missing.length, 0, `spectral rules without pass+fail fixtures: ${JSON.stringify(missing.sort())}`);
});
