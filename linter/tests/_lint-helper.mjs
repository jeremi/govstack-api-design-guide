// Shared helpers for the test suite. Not a test file (the leading underscore
// keeps `node --test` from treating it as one). Bundles a YAML ruleset the same
// way the Spectral CLI does — via the ruleset bundler + loader — and lints
// documents with spectral-core, so tests exercise the exact shipping config.

import pkg from '@stoplight/spectral-core';
const { Spectral, Document } = pkg;
import { bundleAndLoadRuleset } from '@stoplight/spectral-ruleset-bundler/with-loader';
import Parsers from '@stoplight/spectral-parsers';
import runtime from '@stoplight/spectral-runtime';
const { fetch } = runtime;
import * as fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LINTER_DIR = resolve(HERE, '..');
export const STRICT_PATH = resolve(LINTER_DIR, 'strict.yaml');
export const RULESET_PATH = resolve(LINTER_DIR, 'ruleset.yaml');

/** Bundle + load a YAML ruleset file into a spectral-core Ruleset. */
export async function loadRuleset(rulesetFile) {
  return bundleAndLoadRuleset(resolve(rulesetFile), { fs, fetch });
}

/** A Spectral instance with the given ruleset (default: the strict bundle). */
export async function makeSpectral(rulesetFile = STRICT_PATH) {
  const ruleset = await loadRuleset(rulesetFile);
  const spectral = new Spectral();
  spectral.setRuleset(ruleset);
  return spectral;
}

/** Lint a file on disk. Returns spectral-core findings. */
export async function lintFile(spectral, filePath) {
  const abs = resolve(filePath);
  const doc = new Document(fs.readFileSync(abs, 'utf8'), Parsers.Yaml, abs);
  return spectral.run(doc);
}

/** Lint an in-memory YAML string. */
export async function lintString(spectral, source, uri = 'inline.yaml') {
  return spectral.run(new Document(source, Parsers.Yaml, uri));
}
