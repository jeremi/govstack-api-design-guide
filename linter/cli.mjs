#!/usr/bin/env node
// GovStack API lint driver.
//
// Orchestrates three layers of conformance checking for a Building Block repo:
//   1. File-tree checks the Spectral ruleset cannot see (guide §2.2/§2.3/§3.2/§3.3):
//      canonical entrypoint location, legacy swagger.* files, divergent spec copies.
//   2. Base validators (§20.1): openapi-spec-validator and the AsyncAPI CLI.
//   3. The GovStack Spectral ruleset (§20.2), run programmatically.
//
// It also consumes each spec's info.x-govstack-api-guide declaration (§20.3) to compare
// the targeted guide version and to suppress findings covered by approved exceptions.
//
// The ruleset itself (ruleset.yaml / strict.yaml / rulesets/* / functions/*) is authored
// elsewhere; this driver only loads and runs it.

import { parseArgs } from 'node:util';
import * as fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import YAML from 'yaml';
import spectralCore from '@stoplight/spectral-core';
import Parsers from '@stoplight/spectral-parsers';
import bundler from '@stoplight/spectral-ruleset-bundler/with-loader';

const { Spectral, Document } = spectralCore;
const { bundleAndLoadRuleset } = bundler;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SUPPORTED_GUIDE_VERSION = '0.2.0-draft';
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

// Spectral severity numbers -> our names. 0=error 1=warn 2=info 3=hint.
const SEVERITY_NAME = ['error', 'warn', 'info', 'hint'];
const SEVERITY_NUM = { error: 0, warn: 1, info: 2, hint: 3 };
// --fail-on threshold: a finding fails the run when its severity number <= threshold.
const FAIL_ON_THRESHOLD = { error: 0, warn: 1, info: 2, never: -1 };
const MODES = new Set(['conformance', 'advisory']);

// Directories never scanned for divergent spec copies (§2.3/§3.3).
const DIVERGENT_EXCLUDE_DIRS = new Set([
  '.git',
  'node_modules',
  'api-design-guide',
  'test',
  'examples',
]);

// Operational failures (bad flags, unreadable/unparseable spec, ruleset load failure) -> exit 2.
class OperationalError extends Error {}

// --------------------------------------------------------------------------------------
// Argument parsing
// --------------------------------------------------------------------------------------

function parseCliArgs(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        'repo-root': { type: 'string' },
        openapi: { type: 'string' },
        asyncapi: { type: 'string' },
        ruleset: { type: 'string' },
        strict: { type: 'boolean', default: false },
        'fail-on': { type: 'string', default: 'error' },
        format: { type: 'string', default: 'text' },
        mode: { type: 'string', default: 'conformance' },
        'skip-validators': { type: 'boolean', default: false },
      },
      allowPositionals: false,
      strict: true,
    }));
  } catch (err) {
    throw new OperationalError(`Invalid arguments: ${err.message}`);
  }

  const failOn = values['fail-on'];
  if (!Object.prototype.hasOwnProperty.call(FAIL_ON_THRESHOLD, failOn)) {
    throw new OperationalError(
      `Invalid --fail-on value "${failOn}" (expected error|warn|info|never).`,
    );
  }
  const format = values.format;
  if (format !== 'text' && format !== 'json') {
    throw new OperationalError(`Invalid --format value "${format}" (expected text|json).`);
  }
  if (!MODES.has(values.mode)) {
    throw new OperationalError(
      `Invalid --mode value "${values.mode}" (expected conformance|advisory).`,
    );
  }
  if (values.mode === 'conformance' && values['skip-validators']) {
    throw new OperationalError(
      '--skip-validators is only available with --mode advisory; conformance requires base validators.',
    );
  }
  return values;
}

// --------------------------------------------------------------------------------------
// Path resolution
// --------------------------------------------------------------------------------------

// Nearest ancestor of `start` (inclusive) containing a .git entry, else `start`.
function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

function resolveConfig(values) {
  const repoRoot = values['repo-root']
    ? path.resolve(values['repo-root'])
    : findRepoRoot(process.cwd());

  const openapiPath = values.openapi ? path.resolve(repoRoot, values.openapi) : null;
  const asyncapiPath = values.asyncapi ? path.resolve(repoRoot, values.asyncapi) : null;

  let rulesetPath;
  if (values.ruleset) {
    rulesetPath = path.resolve(values.ruleset);
  } else {
    rulesetPath = path.join(HERE, values.strict ? 'strict.yaml' : 'ruleset.yaml');
  }

  return {
    repoRoot,
    openapiPath,
    asyncapiPath,
    rulesetPath,
    failOn: values['fail-on'],
    format: values.format,
    mode: values.mode,
    skipValidators: values['skip-validators'],
  };
}

// --------------------------------------------------------------------------------------
// Spec file loading
// --------------------------------------------------------------------------------------

// Returns { present, empty, content, data }. `present` means the file exists and holds
// more than whitespace. An unreadable-but-existing file, or unparseable YAML, is fatal.
async function loadSpec(absPath, relDisplay) {
  let content;
  try {
    content = await fsp.readFile(absPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { present: false, empty: false };
    throw new OperationalError(`Cannot read spec file ${relDisplay}: ${err.message}`);
  }
  if (content.trim() === '') return { present: false, empty: true };

  let data;
  try {
    data = YAML.parse(content);
  } catch (err) {
    throw new OperationalError(`Cannot parse spec file ${relDisplay}: ${err.message}`);
  }
  return { present: true, empty: false, content, data };
}

function driverFinding(file, code, message, { guideRule = null, severity = 'error' } = {}) {
  return {
    file,
    code,
    guideRule,
    severity,
    message,
    jsonPath: [],
    range: null,
    documentationUrl: null,
  };
}

async function readOptionalText(absPath) {
  try {
    return { exists: true, content: await fsp.readFile(absPath, 'utf8') };
  } catch (err) {
    if (err.code === 'ENOENT') return { exists: false, content: '' };
    throw new OperationalError(`Cannot read ${absPath}: ${err.message}`);
  }
}

function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function parseYamlObject(content, displayPath) {
  try {
    const value = YAML.parse(content);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('document root must be an object');
    }
    return value;
  } catch (err) {
    throw new OperationalError(`Cannot parse ${displayPath}: ${err.message}`);
  }
}

function validateIndexDocument(index, indexRel, repoRoot, findings) {
  const declarations = [];
  const standardSurfaces = [];
  let noApi = false;

  if (index.version !== 1) {
    findings.push(driverFinding(indexRel, 'api-index-invalid', 'api/index.yaml must declare version: 1.'));
  }

  const hasApis = Object.prototype.hasOwnProperty.call(index, 'apis');
  const hasNoApi = Object.prototype.hasOwnProperty.call(index, 'noApi');
  if (hasApis === hasNoApi) {
    findings.push(
      driverFinding(
        indexRel,
        'api-index-invalid',
        'api/index.yaml must declare exactly one of a non-empty apis list or noApi: true.',
      ),
    );
    return { declarations, standardSurfaces, noApi };
  }

  if (hasNoApi) {
    if (index.noApi !== true) {
      findings.push(driverFinding(indexRel, 'api-index-invalid', 'noApi must be true when declared.'));
      return { declarations, standardSurfaces, noApi };
    }
    noApi = true;
    if (typeof index.reason !== 'string' || index.reason.trim().length < 3) {
      findings.push(
        driverFinding(indexRel, 'api-index-invalid', 'noApi: true requires a non-empty reason.'),
      );
    }
    return { declarations, standardSurfaces, noApi };
  }

  if (!Array.isArray(index.apis) || index.apis.length === 0) {
    findings.push(driverFinding(indexRel, 'api-index-invalid', 'apis must be a non-empty array.'));
    return { declarations, standardSurfaces, noApi };
  }

  const seen = new Set();
  for (const [i, entry] of index.apis.entries()) {
    const itemPath = `${indexRel}#apis[${i}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      findings.push(driverFinding(indexRel, 'api-index-invalid', `${itemPath} must be an object.`));
      continue;
    }
    if (entry.type !== 'openapi' && entry.type !== 'asyncapi' && entry.type !== 'standard') {
      findings.push(
        driverFinding(indexRel, 'api-index-invalid', `${itemPath}.type must be openapi, asyncapi, or standard.`),
      );
      continue;
    }
    if (entry.type === 'standard') {
      if (typeof entry.name !== 'string' || !entry.name.trim()) {
        findings.push(driverFinding(indexRel, 'api-index-invalid', `${itemPath}.name is required.`));
        continue;
      }
      if (!isHttpsUrl(entry.reference)) {
        findings.push(
          driverFinding(indexRel, 'api-index-invalid', `${itemPath}.reference must be an absolute HTTPS URL.`),
        );
        continue;
      }
      if (entry.discovery !== undefined && (typeof entry.discovery !== 'string' || !entry.discovery.trim())) {
        findings.push(
          driverFinding(indexRel, 'api-index-invalid', `${itemPath}.discovery must be a non-empty string when present.`),
        );
        continue;
      }
      const key = `standard:${entry.name.trim()}:${entry.reference}`;
      if (seen.has(key)) {
        findings.push(driverFinding(indexRel, 'api-index-invalid', `${itemPath} duplicates a standard surface.`));
        continue;
      }
      seen.add(key);
      standardSurfaces.push({
        kind: 'standard',
        name: entry.name.trim(),
        reference: entry.reference,
        discovery: entry.discovery?.trim() ?? null,
        declaredBy: indexRel,
      });
      continue;
    }
    if (typeof entry.path !== 'string' || !entry.path.trim()) {
      findings.push(driverFinding(indexRel, 'api-index-invalid', `${itemPath}.path is required.`));
      continue;
    }
    const normalized = entry.path.replaceAll('\\', '/').replace(/^\.\//, '');
    const abs = path.resolve(repoRoot, normalized);
    if (!isInside(path.join(repoRoot, 'api'), abs) || !/\.ya?ml$/i.test(normalized)) {
      findings.push(
        driverFinding(
          indexRel,
          'api-index-invalid',
          `${itemPath}.path must be a repo-relative YAML path inside api/.`,
        ),
      );
      continue;
    }
    if (seen.has(abs)) {
      findings.push(driverFinding(indexRel, 'api-index-invalid', `${itemPath}.path is duplicated.`));
      continue;
    }
    seen.add(abs);
    declarations.push({ kind: entry.type, abs, declaredBy: indexRel });
  }
  return { declarations, standardSurfaces, noApi };
}

async function discoverApiDeclarations(cfg, rel, findings, notices) {
  const explicit = [];
  if (cfg.openapiPath) explicit.push({ kind: 'openapi', abs: cfg.openapiPath, declaredBy: 'CLI' });
  if (cfg.asyncapiPath) explicit.push({ kind: 'asyncapi', abs: cfg.asyncapiPath, declaredBy: 'CLI' });
  if (explicit.length) {
    return { declarations: explicit, standardSurfaces: [], noApi: false, indexPresent: false };
  }

  const indexAbs = path.join(cfg.repoRoot, 'api', 'index.yaml');
  const indexRel = rel(indexAbs);
  const indexFile = await readOptionalText(indexAbs);
  if (indexFile.exists) {
    if (!indexFile.content.trim()) {
      findings.push(driverFinding(indexRel, 'api-index-invalid', 'api/index.yaml must not be empty.'));
      return { declarations: [], standardSurfaces: [], noApi: false, indexPresent: true };
    }
    const index = parseYamlObject(indexFile.content, indexRel);
    return { ...validateIndexDocument(index, indexRel, cfg.repoRoot, findings), indexPresent: true };
  }

  const declarations = [];
  for (const [kind, name] of [
    ['openapi', 'openapi.yaml'],
    ['asyncapi', 'asyncapi.yaml'],
  ]) {
    const abs = path.join(cfg.repoRoot, 'api', name);
    const candidate = await readOptionalText(abs);
    if (candidate.exists) declarations.push({ kind, abs, declaredBy: 'canonical-path' });
  }

  if (declarations.length === 0) {
    const message =
      'No API declaration found. Add api/openapi.yaml or api/asyncapi.yaml, declare a standard-defined surface in api/index.yaml, or declare noApi: true with a reason.';
    if (cfg.mode === 'conformance') {
      findings.push(driverFinding('api/index.yaml', 'api-declaration-required', message));
    } else {
      notices.push(message);
    }
  }
  return { declarations, standardSurfaces: [], noApi: false, indexPresent: false };
}

async function loadDeclaredSpecs(declarations, rel, findings) {
  const specs = [];
  for (const declaration of declarations) {
    const relSpec = rel(declaration.abs);
    const loaded = await loadSpec(declaration.abs, relSpec);
    if (!loaded.present) {
      findings.push(
        driverFinding(
          relSpec,
          loaded.empty ? 'declared-spec-empty' : 'declared-spec-missing',
          `Declared ${declaration.kind} specification ${relSpec} ${loaded.empty ? 'is empty' : 'does not exist'}.`,
          { guideRule: declaration.kind === 'openapi' ? '2.2' : '3.2' },
        ),
      );
      continue;
    }
    const actualKind =
      typeof loaded.data?.openapi === 'string'
        ? 'openapi'
        : typeof loaded.data?.asyncapi === 'string'
          ? 'asyncapi'
          : null;
    if (actualKind !== declaration.kind) {
      findings.push(
        driverFinding(
          relSpec,
          'declared-spec-type',
          `Declared ${declaration.kind} specification ${relSpec} does not contain a matching root version field.`,
          { guideRule: declaration.kind === 'openapi' ? '2.1' : '3.1' },
        ),
      );
      continue;
    }
    specs.push({ kind: declaration.kind, abs: declaration.abs, ...loaded });
  }
  return specs;
}

// --------------------------------------------------------------------------------------
// File-tree checks (§2.2 / §2.3 / §3.2 / §3.3)
// --------------------------------------------------------------------------------------

// Legacy api/swagger.{yaml,json} artifacts are always non-conformant, including
// empty placeholders. An explicit no-API declaration lives in api/index.yaml.
async function checkLegacySwagger(repoRoot, rel, findings) {
  let anyPresent = false;
  for (const name of ['swagger.yaml', 'swagger.json']) {
    const abs = path.join(repoRoot, 'api', name);
    let content;
    try {
      content = await fsp.readFile(abs, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw new OperationalError(`Cannot read ${rel(abs)}: ${err.message}`);
    }
    anyPresent = true;
    const qualifier = content.trim() === '' ? 'Empty legacy placeholder' : 'Legacy API specification';
    findings.push(
      driverFinding(
        rel(abs),
        'file-canonical-name',
        `${qualifier} ${rel(abs)} must be removed or migrated to a declared YAML entrypoint under api/ (guide §2.2).`,
        { guideRule: '2.2' },
      ),
    );
  }
  return anyPresent;
}

async function readHead(absPath, n) {
  const fh = await fsp.open(absPath, 'r');
  try {
    const buf = Buffer.alloc(n);
    const { bytesRead } = await fh.read(buf, 0, n, 0);
    return buf.subarray(0, bytesRead).toString('utf8');
  } finally {
    await fh.close();
  }
}

const SNIFF_RE = /(?:^|[\s"'{,])(openapi|asyncapi)["']?\s*:/im;
const SNIFF_BYTES = 2048;
const FULL_PARSE_MAX_BYTES = 5 * 1024 * 1024;

// Cheap top-of-file sniff, then confirm by parse (only if not huge). Returns
// { kind } when the file looks like a top-level OpenAPI/AsyncAPI document, else null.
async function sniffSpec(absPath) {
  let head;
  try {
    head = await readHead(absPath, SNIFF_BYTES);
  } catch {
    return null;
  }
  if (!SNIFF_RE.test(head)) return null;

  let size = 0;
  try {
    size = (await fsp.stat(absPath)).size;
  } catch {
    return null;
  }
  if (size > FULL_PARSE_MAX_BYTES) {
    // Too large to parse cheaply; trust the sniff (heuristic).
    return { kind: 'API', heuristic: true };
  }
  let data;
  try {
    data = YAML.parse(await fsp.readFile(absPath, 'utf8'));
  } catch {
    return null;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const hasEntries = (value) =>
      value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
    const hasComponents = hasEntries(data.components);
    if (typeof data.openapi === 'string') {
      return {
        kind: 'OpenAPI',
        heuristic: false,
        supportOnly: hasComponents && !hasEntries(data.paths) && !hasEntries(data.webhooks),
      };
    }
    if (typeof data.asyncapi === 'string') {
      return {
        kind: 'AsyncAPI',
        heuristic: false,
        supportOnly: hasComponents && !hasEntries(data.channels) && !hasEntries(data.operations),
      };
    }
  }
  return null;
}

// Walk the repo for undeclared top-level specs, including api/ and spec/ assets.
// Parsed documents are deterministic errors; only oversized sniff-only hits stay advisory.
async function scanDivergentCopies(repoRoot, skipAbs, rel, findings) {
  const commonRoot = path.resolve(repoRoot, 'api', 'common');
  const legacyRoot = path.resolve(repoRoot, 'api', 'legacy');

  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (DIVERGENT_EXCLUDE_DIRS.has(entry.name)) continue;
        // Archived contracts are historical material, not undeclared current
        // surfaces. Explicit declarations are loaded and validated separately.
        if (path.resolve(full) === legacyRoot) continue;
        await walk(full);
      } else if (entry.isFile()) {
        if (!/\.(ya?ml|json)$/i.test(entry.name)) continue;
        if (skipAbs.has(path.resolve(full))) continue;
        const hit = await sniffSpec(full);
        if (hit) {
          const insideCommonRoot = path.resolve(full).startsWith(`${commonRoot}${path.sep}`);
          if (insideCommonRoot && hit.supportOnly) continue;
          const guideRule = hit.kind === 'AsyncAPI' ? '3.3' : '2.3';
          findings.push(
            driverFinding(
              rel(full),
              'file-undeclared-spec',
              `${hit.heuristic ? 'Heuristic: ' : ''}${rel(full)} is an undeclared ${hit.kind} document. ` +
                `Every top-level API specification must be canonical or listed in api/index.yaml (guide §${guideRule}).`,
              { guideRule, severity: hit.heuristic ? 'warn' : 'error' },
            ),
          );
        }
      }
    }
  }

  await walk(repoRoot);
}

// --------------------------------------------------------------------------------------
// Requirement-to-contract coverage (api/coverage.yaml)
// --------------------------------------------------------------------------------------

const REQUIREMENT_ID_RE = /^govstack-[a-z0-9]+(?:[-.][a-z0-9]+)*#req-[1-9][0-9]*$/;
const DISPOSITIONS = new Set(['operation', 'message', 'external', 'non-api', 'planned']);
const REQUIREMENT_HEADING_RE =
  /^\s*###\s+#([1-9][0-9]*)\s+(.+?)\s+\((REQUIRED|RECOMMENDED|DRAFT|DEPRECATED)\s+(IMMUTABLE|EXTENSIBLE|REPLACEABLE|INAPPLICABLE)\s+(OBSERVABLE|AUDITABLE)\)\s*$/;
const REQUIREMENT_REFERENCE_RE =
  /^\s*`(govstack-[a-z0-9]+(?:[-.][a-z0-9]+)*#req-([1-9][0-9]*))(?:\s+(extends|replaces)\s+(govstack-[a-z0-9]+(?:[-.][a-z0-9]+)*#req-[1-9][0-9]*))?`\s*$/;
const LEGACY_REQUIREMENT_RE =
  /^\s*-\s+\*\*[^*]+\*\*\s+\*\*(REQUIRED|RECOMMENDED|OPTIONAL|DRAFT|DEPRECATED)\*\*:/;
const LOOKS_LIKE_REQUIREMENT_HEADING_RE = /^\s*#+\s+#\d+\s+/;

function nonEmptyStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim());
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

async function scanRequirementMarkers(repoRoot, rel, findings) {
  const specDir = path.join(repoRoot, 'spec');
  const markers = new Map();
  const draftMarkers = new Map();
  const seenIds = new Map();

  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw new OperationalError(`Cannot scan requirement sources under ${rel(dir)}: ${err.message}`);
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile() || !/\.md$/i.test(entry.name)) continue;
      const lines = (await fsp.readFile(full, 'utf8')).split(/\r?\n/);
      let fenced = false;
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^\s*```/.test(line)) {
          fenced = !fenced;
          continue;
        }
        if (fenced) continue;
        const match = line.match(REQUIREMENT_HEADING_RE);
        if (match) {
          const [, headingNumber, title, level, mutability, verification] = match;
          const headingLocation = `${rel(full)}:${i + 1}`;
          let referenceLine = i + 1;
          while (referenceLine < lines.length && !lines[referenceLine].trim()) referenceLine += 1;
          const reference = lines[referenceLine]?.match(REQUIREMENT_REFERENCE_RE);
          if (!reference) {
            findings.push(
              driverFinding(
                rel(full),
                'requirements-invalid-marker',
                `Requirement at ${headingLocation} must be followed by a canonical ` +
                  '`govstack-...#req-N` identifier, optionally with extends or replaces.',
              ),
            );
            continue;
          }
          const [, id, referenceNumber, relation, parent] = reference;
          const referenceLocation = `${rel(full)}:${referenceLine + 1}`;
          let bodyLine = referenceLine + 1;
          while (bodyLine < lines.length && !lines[bodyLine].trim()) bodyLine += 1;
          while (/^KF:\s+\S/.test(lines[bodyLine]?.trim() ?? '')) {
            bodyLine += 1;
            while (bodyLine < lines.length && !lines[bodyLine].trim()) bodyLine += 1;
          }
          const body = lines[bodyLine]?.trim() ?? '';
          if (!body || /^#{1,6}\s+/.test(body)) {
            findings.push(
              driverFinding(
                rel(full),
                'requirements-invalid-marker',
                `Requirement ${id} at ${headingLocation} must include body text after its canonical identifier and optional KF lines.`,
              ),
            );
            i = referenceLine;
            continue;
          }
          if (headingNumber !== referenceNumber) {
            findings.push(
              driverFinding(
                rel(full),
                'requirements-invalid-marker',
                `Requirement number #${headingNumber} at ${headingLocation} does not match ${id} at ${referenceLocation}.`,
              ),
            );
          }
          if (mutability === 'INAPPLICABLE' && !relation) {
            findings.push(
              driverFinding(
                rel(full),
                'requirements-invalid-marker',
                `INAPPLICABLE requirement ${id} must identify a parent requirement with extends or replaces.`,
              ),
            );
          }
          if (seenIds.has(id)) {
            findings.push(
              driverFinding(
                rel(full),
                'requirements-duplicate-id',
                `Requirement id "${id}" is duplicated at ${seenIds.get(id)} and ${referenceLocation}.`,
              ),
            );
          } else {
            seenIds.set(id, referenceLocation);
            const active = (level === 'REQUIRED' || level === 'RECOMMENDED') && mutability !== 'INAPPLICABLE';
            if (active || (level === 'DRAFT' && mutability !== 'INAPPLICABLE')) {
              (active ? markers : draftMarkers).set(id, {
                id,
                title: title.trim(),
                level,
                mutability,
                verification,
                relation: relation ?? null,
                parent: parent ?? null,
                location: headingLocation,
              });
            }
          }
          i = referenceLine;
          continue;
        }
        if (LEGACY_REQUIREMENT_RE.test(line)) {
          findings.push(
            driverFinding(
              rel(full),
              'requirements-unkeyed',
              `Legacy requirement marker at ${rel(full)}:${i + 1}; use the GovStack requirement heading, classifiers, and canonical identifier.`,
            ),
          );
        } else if (LOOKS_LIKE_REQUIREMENT_HEADING_RE.test(line)) {
          findings.push(
            driverFinding(
              rel(full),
              'requirements-invalid-marker',
              `Invalid GovStack requirement heading at ${rel(full)}:${i + 1}; expected all three CFR classifiers.`,
            ),
          );
        }
      }
    }
  }

  await walk(specDir);
  return { markers, draftMarkers };
}

function collectReferenceInventory(specs, rel, findings, coverageRel) {
  const operationOwners = new Map();
  const messageOwners = new Map();

  const addOwner = (map, id, owner) => {
    if (typeof id !== 'string' || !id.trim()) return;
    const owners = map.get(id) ?? new Set();
    owners.add(owner);
    map.set(id, owners);
  };

  for (const spec of specs) {
    const owner = rel(spec.abs);
    if (spec.kind === 'openapi') {
      const paths = spec.data?.paths;
      if (paths && typeof paths === 'object') {
        for (const item of Object.values(paths)) {
          if (!item || typeof item !== 'object') continue;
          for (const method of HTTP_METHODS) addOwner(operationOwners, item[method]?.operationId, owner);
        }
      }
      const webhooks = spec.data?.webhooks;
      if (webhooks && typeof webhooks === 'object') {
        for (const item of Object.values(webhooks)) {
          if (!item || typeof item !== 'object') continue;
          for (const method of HTTP_METHODS) addOwner(operationOwners, item[method]?.operationId, owner);
        }
      }
    } else {
      for (const id of Object.keys(spec.data?.operations ?? {})) addOwner(operationOwners, id, owner);
      const ownMessages = new Set(Object.keys(spec.data?.components?.messages ?? {}));
      for (const channel of Object.values(spec.data?.channels ?? {})) {
        for (const id of Object.keys(channel?.messages ?? {})) ownMessages.add(id);
      }
      for (const id of ownMessages) addOwner(messageOwners, id, owner);
    }
  }

  for (const [id, owners] of operationOwners) {
    if (owners.size > 1) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-ambiguous-reference',
          `Operation identifier "${id}" is declared by multiple surfaces: ${[...owners].join(', ')}.`,
        ),
      );
    }
  }
  for (const [id, owners] of messageOwners) {
    if (owners.size > 1) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-ambiguous-reference',
          `Message key "${id}" is declared by multiple surfaces: ${[...owners].join(', ')}.`,
        ),
      );
    }
  }

  return { operationOwners, messageOwners };
}

async function validateRequirementCoverage(cfg, specs, hasDeclaredSurface, noApi, rel, findings, notices) {
  const coverageAbs = path.join(cfg.repoRoot, 'api', 'coverage.yaml');
  const coverageRel = rel(coverageAbs);
  const file = await readOptionalText(coverageAbs);

  if (noApi) {
    if (file.exists) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-without-api',
          'api/coverage.yaml must be removed when api/index.yaml declares noApi: true.',
        ),
      );
    }
    return;
  }
  if (!hasDeclaredSurface) return;
  const { markers, draftMarkers } = await scanRequirementMarkers(cfg.repoRoot, rel, findings);
  if (markers.size === 0) {
    notices.push(
      'No active REQUIRED or RECOMMENDED requirements are declared. This run validates API artifacts; ' +
        'it does not establish requirement maturity or Building Block certification.',
    );
  }
  if (!file.exists || !file.content.trim()) {
    findings.push(
      driverFinding(
        coverageRel,
        file.exists ? 'coverage-empty' : 'coverage-missing',
        'Declared API surfaces require api/coverage.yaml with version: 1 and a requirements array.',
      ),
    );
    return;
  }

  const doc = parseYamlObject(file.content, coverageRel);
  const { operationOwners, messageOwners } = collectReferenceInventory(specs, rel, findings, coverageRel);
  if (doc.version !== 1) {
    findings.push(driverFinding(coverageRel, 'coverage-invalid', 'api/coverage.yaml must declare version: 1.'));
  }
  const groups = [
    { name: 'requirements', expectedMarkers: markers, entries: doc.requirements, draft: false },
    { name: 'draftRequirements', expectedMarkers: draftMarkers, entries: doc.draftRequirements === undefined ? [] : doc.draftRequirements, draft: true },
  ];
  for (const group of groups) {
    if (!Array.isArray(group.entries)) {
      findings.push(driverFinding(coverageRel, 'coverage-invalid', `${group.name} must be an array.`));
    }
  }
  const entries = groups.flatMap((group) =>
    Array.isArray(group.entries) ? group.entries.map((entry, i) => ({ ...group, entry, i })) : [],
  );
  if (doc.draftRequirements !== undefined) {
    notices.push(
      'draftRequirements records optional design traceability for DRAFT requirements. ' +
        'These mappings do not satisfy active coverage obligations or establish implementation certification.',
    );
  }

  const seenIds = new Set();
  const activeIds = new Set();
  for (const { name, expectedMarkers, draft, entry, i } of entries) {
    const label = `${name}[${i}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      findings.push(driverFinding(coverageRel, 'coverage-invalid', `${label} must be an object.`));
      continue;
    }
    if (typeof entry.id !== 'string' || !REQUIREMENT_ID_RE.test(entry.id)) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-invalid',
          `${label}.id must match ${REQUIREMENT_ID_RE}.`,
        ),
      );
    } else if (seenIds.has(entry.id)) {
      findings.push(driverFinding(coverageRel, 'coverage-invalid', `Requirement id "${entry.id}" is duplicated.`));
    } else {
      seenIds.add(entry.id);
      if (!expectedMarkers.has(entry.id)) {
        findings.push(
          driverFinding(
            coverageRel,
            'coverage-unknown-requirement',
            `${label} id "${entry.id}" has no matching ${draft ? 'DRAFT' : 'active REQUIRED or RECOMMENDED'} marker under spec/**/*.md.`,
          ),
        );
      } else if (!draft) {
        activeIds.add(entry.id);
      }
    }

    if (!DISPOSITIONS.has(entry.disposition)) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-invalid',
          `${label}.disposition must be one of ${[...DISPOSITIONS].join(', ')}.`,
        ),
      );
      continue;
    }

    const allowedKeys = {
      operation: new Set(['id', 'disposition', 'operations']),
      message: new Set(['id', 'disposition', 'messages']),
      external: new Set(['id', 'disposition', 'reference']),
      'non-api': new Set(['id', 'disposition', 'rationale']),
      planned: new Set(['id', 'disposition', 'issue']),
    }[entry.disposition];
    const extras = Object.keys(entry).filter((key) => !allowedKeys.has(key));
    if (extras.length) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-invalid',
          `${label} has fields incompatible with ${entry.disposition}: ${extras.join(', ')}.`,
        ),
      );
    }

    if (entry.disposition === 'operation') {
      if (!nonEmptyStrings(entry.operations)) {
        findings.push(driverFinding(coverageRel, 'coverage-invalid', `${label}.operations must be a non-empty string array.`));
      } else {
        for (const id of new Set(entry.operations)) {
          if (!operationOwners.has(id)) {
            findings.push(
              driverFinding(coverageRel, 'coverage-missing-reference', `${label} references unknown operation "${id}".`),
            );
          }
        }
      }
    } else if (entry.disposition === 'message') {
      if (!nonEmptyStrings(entry.messages)) {
        findings.push(driverFinding(coverageRel, 'coverage-invalid', `${label}.messages must be a non-empty string array.`));
      } else {
        for (const id of new Set(entry.messages)) {
          if (!messageOwners.has(id)) {
            findings.push(
              driverFinding(coverageRel, 'coverage-missing-reference', `${label} references unknown message "${id}".`),
            );
          }
        }
      }
    } else if (entry.disposition === 'external') {
      if (!isHttpUrl(entry.reference)) {
        findings.push(driverFinding(coverageRel, 'coverage-invalid', `${label}.reference must be an http(s) URL.`));
      }
    } else if (entry.disposition === 'non-api') {
      if (typeof entry.rationale !== 'string' || entry.rationale.trim().length < 3) {
        findings.push(driverFinding(coverageRel, 'coverage-invalid', `${label}.rationale is required.`));
      }
    } else {
      if (!isHttpUrl(entry.issue)) {
        findings.push(driverFinding(coverageRel, 'coverage-invalid', `${label}.issue must be an http(s) URL.`));
      } else if (draft) {
        notices.push(`${label} remains planned draft work and is not implemented: ${entry.issue}.`);
      } else {
        findings.push(
          driverFinding(
            coverageRel,
            'coverage-planned',
            `${label} remains planned and is not implemented: ${entry.issue}.`,
            { severity: cfg.mode === 'conformance' ? 'error' : 'warn' },
          ),
        );
      }
    }
  }

  for (const [id, marker] of markers) {
    if (!activeIds.has(id)) {
      findings.push(
        driverFinding(
          coverageRel,
          'coverage-missing-requirement',
          `Requirement "${id}" at ${marker.location} is not represented in api/coverage.yaml.`,
        ),
      );
    }
  }
}

// --------------------------------------------------------------------------------------
// Base validators (§20.1)
// --------------------------------------------------------------------------------------

function runCommand(cmd, args) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({ code: null, stdout: '', stderr: '', spawnError: err });
      return;
    }
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => resolve({ code: null, stdout, stderr, spawnError: err }));
    child.on('close', (code) => resolve({ code, stdout, stderr, spawnError: null }));
  });
}

function trimOutput(s) {
  const t = s.trim();
  const max = 800;
  return t.length > max ? `${t.slice(0, max)} …[truncated]` : t;
}

// Result shape: { ok } | { notice } | { finding: <message> }.
async function validateOpenapi(absPath) {
  const r = await runCommand('openapi-spec-validator', [absPath]);
  if (r.spawnError) {
    return {
      unavailable:
        `openapi-spec-validator not found; skipping OpenAPI base validation (§20.1). ` +
          `Install with: pip install openapi-spec-validator`,
    };
  }
  if (r.code === 0) return { ok: true };
  return { finding: `openapi-spec-validator: ${trimOutput(`${r.stdout}\n${r.stderr}`)}` };
}

// npx may report a missing package rather than a validation failure; those messages mean
// "fall back to a globally installed asyncapi CLI", not "the spec is invalid".
const NPX_UNAVAILABLE_RE =
  /could not determine executable|npm error|not been installed|could not resolve|E404|command not found|no such file/i;

async function validateAsyncapi(absPath) {
  const npx = await runCommand('npx', ['--no-install', '@asyncapi/cli', 'validate', absPath]);
  if (!npx.spawnError) {
    if (npx.code === 0) return { ok: true };
    const out = `${npx.stdout}\n${npx.stderr}`;
    if (!NPX_UNAVAILABLE_RE.test(out)) {
      return { finding: `@asyncapi/cli: ${trimOutput(out)}` };
    }
    // else: package unavailable via npx -> fall through to a global asyncapi binary.
  }

  const global = await runCommand('asyncapi', ['validate', absPath]);
  if (global.spawnError) {
    return {
      unavailable:
        `AsyncAPI CLI not found; skipping AsyncAPI base validation (§20.1). ` +
          `Install with: npm i -g @asyncapi/cli`,
    };
  }
  if (global.code === 0) return { ok: true };
  return { finding: `asyncapi validate: ${trimOutput(`${global.stdout}\n${global.stderr}`)}` };
}

async function runBaseValidator(kind, absPath, rel, findings, notices, mode) {
  const result =
    kind === 'openapi' ? await validateOpenapi(absPath) : await validateAsyncapi(absPath);
  if (result.unavailable) {
    if (mode === 'conformance') {
      findings.push(
        driverFinding(rel(absPath), 'base-validator-unavailable', result.unavailable, {
          guideRule: '20.1',
        }),
      );
    } else {
      notices.push(result.unavailable);
    }
  } else if (result.finding) {
    findings.push(
      driverFinding(rel(absPath), 'base-validator', result.finding, { guideRule: '20.1' }),
    );
  }
}

// --------------------------------------------------------------------------------------
// Spectral
// --------------------------------------------------------------------------------------

async function loadRuleset(rulesetPath) {
  try {
    await fsp.access(rulesetPath);
  } catch {
    throw new OperationalError(`Ruleset not found: ${rulesetPath}`);
  }
  try {
    return await bundleAndLoadRuleset(rulesetPath, { fs, fetch: globalThis.fetch });
  } catch (err) {
    throw new OperationalError(`Failed to load ruleset ${rulesetPath}: ${err.message}`);
  }
}

// A guide rule id is the Spectral code with the `govstack-` prefix removed and any
// trailing `-suffix` after the numeric id dropped: govstack-2.5-contact -> 2.5.
function guideRuleFromCode(code) {
  const s = String(code).replace(/^govstack-/, '');
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

function mapSpectralResult(r, relPath) {
  const severity = SEVERITY_NAME[r.severity] ?? 'info';
  return {
    file: relPath,
    code: String(r.code),
    guideRule: guideRuleFromCode(r.code),
    severity,
    message: r.message,
    jsonPath: Array.isArray(r.path) ? r.path : [],
    range: r.range ?? null,
    documentationUrl: r.documentationUrl ?? null,
  };
}

// --------------------------------------------------------------------------------------
// Guide-version declaration & exceptions (§20.3)
// --------------------------------------------------------------------------------------

let cachedGuideCatalogue;
function getGuideCatalogue() {
  if (cachedGuideCatalogue) return cachedGuideCatalogue;
  try {
    const coverage = YAML.parse(fs.readFileSync(path.join(HERE, 'coverage.yaml'), 'utf8'));
    const catalogue = YAML.parse(fs.readFileSync(path.join(HERE, '..', 'rules.yaml'), 'utf8'));
    if (coverage?.guide_version !== SUPPORTED_GUIDE_VERSION) {
      throw new Error(
        `coverage.yaml guide_version is ${coverage?.guide_version ?? '(missing)'}, expected ${SUPPORTED_GUIDE_VERSION}`,
      );
    }
    if (catalogue?.version !== SUPPORTED_GUIDE_VERSION) {
      throw new Error(
        `rules.yaml version is ${catalogue?.version ?? '(missing)'}, expected ${SUPPORTED_GUIDE_VERSION}`,
      );
    }
    cachedGuideCatalogue = {
      version: SUPPORTED_GUIDE_VERSION,
      ids: new Set((catalogue.rules ?? []).map((rule) => String(rule.id))),
    };
    return cachedGuideCatalogue;
  } catch (err) {
    throw new OperationalError(`Cannot load the supported guide catalogue: ${err.message}`);
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EXCEPTION_KEYS = new Set([
  'rule',
  'scope',
  'rationale',
  'record',
  'reviewedBy',
  'reviewedAt',
  'expiresAt',
]);
const JSON_POINTER_RE = /^(?:\/(?:[^~]|~[01])*)*$/;

function decodeJsonPointer(pointer) {
  if (pointer === '') return [];
  if (typeof pointer !== 'string' || !JSON_POINTER_RE.test(pointer)) return null;
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function applicableException(exceptions, finding) {
  const candidates = exceptions.get(finding.guideRule) ?? [];
  const findingPath = Array.isArray(finding.jsonPath) ? finding.jsonPath.map(String) : [];
  return candidates.find(
    (candidate) =>
      candidate.decodedScope.length <= findingPath.length &&
      candidate.decodedScope.every((token, i) => token === findingPath[i]),
  );
}

function consumeGuideDeclaration(specData, relPath, findings, mode) {
  const { version, ids } = getGuideCatalogue();
  const decl = specData?.info?.['x-govstack-api-guide'];
  const severity = mode === 'conformance' ? 'error' : 'warn';
  if (!decl || typeof decl !== 'object' || Array.isArray(decl)) {
    findings.push(
      driverFinding(
        relPath,
        'guide-version',
        `Specification must declare info.x-govstack-api-guide.version and rulesetVersion as ${version}.`,
        { guideRule: '20.3', severity },
      ),
    );
    return { exceptions: new Map() };
  }
  if (decl.version !== version) {
    findings.push(
      driverFinding(
        relPath,
        'guide-version',
        `Specification declares guide version ${String(decl.version)}, but this linter supports exactly ${version}.`,
        { guideRule: '20.3', severity },
      ),
    );
  }
  if (decl.rulesetVersion !== version) {
    findings.push(
      driverFinding(
        relPath,
        'guide-version',
        `Specification declares ruleset version ${String(decl.rulesetVersion)}, but this linter supports exactly ${version}.`,
        { guideRule: '20.3', severity },
      ),
    );
  }

  const exceptions = new Map();
  if (decl.exceptions === undefined) return { exceptions };
  if (!Array.isArray(decl.exceptions)) {
    findings.push(
      driverFinding(relPath, 'guide-exception', 'x-govstack-api-guide.exceptions must be an array.', {
        guideRule: '20.3',
      }),
    );
    return { exceptions };
  }

  const today = new Date();
  for (const [i, item] of decl.exceptions.entries()) {
    const label = `x-govstack-api-guide.exceptions[${i}]`;
    const problems = [];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      problems.push('must be an object');
    } else {
      const extra = Object.keys(item).filter((key) => !EXCEPTION_KEYS.has(key));
      if (extra.length) problems.push(`has unsupported fields: ${extra.join(', ')}`);
      if (typeof item.rule !== 'string' || !ids.has(item.rule)) problems.push('must name a known guide rule');
      const decodedScope = decodeJsonPointer(item.scope);
      if (decodedScope === null) problems.push('scope must be a valid RFC 6901 JSON Pointer');
      if (typeof item.rationale !== 'string' || item.rationale.trim().length < 10) {
        problems.push('requires a substantive rationale');
      }
      if (!isHttpsUrl(item.record)) problems.push('record must be an approved HTTPS link');
      if (typeof item.reviewedBy !== 'string' || item.reviewedBy.trim().length < 2) {
        problems.push('reviewedBy is required');
      }
      if (!DATE_RE.test(item.reviewedAt ?? '')) problems.push('reviewedAt must be YYYY-MM-DD');
      if (!DATE_RE.test(item.expiresAt ?? '')) problems.push('expiresAt must be YYYY-MM-DD');
      if (DATE_RE.test(item.reviewedAt ?? '') && DATE_RE.test(item.expiresAt ?? '')) {
        const reviewed = new Date(`${item.reviewedAt}T00:00:00Z`);
        const expires = new Date(`${item.expiresAt}T23:59:59Z`);
        if (reviewed > expires) problems.push('expiresAt must be after reviewedAt');
        if (expires < today) problems.push('exception has expired');
      }
      const duplicate = (exceptions.get(item.rule) ?? []).some(
        (candidate) => candidate.scope === item.scope,
      );
      if (duplicate) problems.push(`duplicates exception for rule ${item.rule} at scope ${item.scope}`);
    }
    if (problems.length) {
      findings.push(
        driverFinding(relPath, 'guide-exception', `${label} ${problems.join('; ')}.`, {
          guideRule: '20.3',
        }),
      );
      continue;
    }
    const candidates = exceptions.get(item.rule) ?? [];
    candidates.push({ ...item, decodedScope: decodeJsonPointer(item.scope) });
    exceptions.set(item.rule, candidates);
  }
  return { exceptions };
}

// --------------------------------------------------------------------------------------
// Reporting
// --------------------------------------------------------------------------------------

function locationOf(finding) {
  if (finding.range && finding.range.start) {
    return `${finding.range.start.line + 1}:${finding.range.start.character + 1}`;
  }
  return null;
}

function groupFindings(findings) {
  const groups = new Map();
  for (const f of findings) {
    let g = groups.get(f.code);
    if (!g) {
      g = {
        code: f.code,
        guideRule: f.guideRule,
        severity: f.severity,
        severityNum: SEVERITY_NUM[f.severity] ?? 2,
        message: f.message,
        documentationUrl: f.documentationUrl,
        locations: [],
        count: 0,
      };
      groups.set(f.code, g);
    }
    g.count += 1;
    const loc = locationOf(f);
    if (loc && g.locations.length < 5) g.locations.push(loc);
  }
  return [...groups.values()].sort(
    (a, b) => a.severityNum - b.severityNum || a.code.localeCompare(b.code),
  );
}

function renderText(report) {
  const { files, notices, suppressed, summary, failOn, mode, failed, noSpecBanner } = report;
  const lines = [];

  if (noSpecBanner) {
    lines.push('════════════════════════════════════════════════════════════════');
    lines.push('  NOTICE: no API spec files found to lint.');
    lines.push('  Expected api/openapi.yaml and/or api/asyncapi.yaml.');
    lines.push('════════════════════════════════════════════════════════════════');
  }

  for (const f of files) {
    if (f.findings.length === 0) continue;
    lines.push('');
    lines.push(f.path);
    for (const g of groupFindings(f.findings)) {
      const rule = g.guideRule ? ` (§${g.guideRule})` : '';
      lines.push(`  [${g.severity}] ${g.code}${rule} ×${g.count}`);
      lines.push(`    ${g.message}`);
      if (g.locations.length) {
        const more = g.count > g.locations.length ? ', …' : '';
        lines.push(`    at ${g.locations.join(', ')}${more}`);
      }
      if (g.documentationUrl) lines.push(`    docs: ${g.documentationUrl}`);
    }
  }

  if (suppressed.length) {
    lines.push('');
    lines.push(`Suppressed (${suppressed.length}) — excepted via info.x-govstack-api-guide:`);
    for (const s of suppressed) {
      const rule = s.guideRule ? ` (§${s.guideRule})` : '';
      const record = s.exceptionRecord ? `record: ${s.exceptionRecord}` : 'record: (none)';
      lines.push(`  [${s.severity}] ${s.code}${rule} — ${s.file} — ${record}`);
    }
  }

  if (notices.length) {
    lines.push('');
    lines.push(`Notices (${notices.length}):`);
    for (const n of notices) lines.push(`  - ${n}`);
  }

  lines.push('');
  lines.push(
    `Summary: ${summary.filesLinted} file(s) linted; ${summary.errors} error(s), ` +
      `${summary.warnings} warning(s), ${summary.info} info; ${summary.suppressed} suppressed.`,
  );
  lines.push(`Result: ${failed ? 'FAIL' : 'PASS'} (mode=${mode}, fail-on=${failOn}).`);
  return lines.join('\n');
}

function renderJson(report) {
  const { files, notices, summary, failOn, mode, failed } = report;
  return JSON.stringify(
    {
      files: files.map((f) => ({
        path: f.path,
        findings: f.findings.map((x) => ({
          code: x.code,
          guideRule: x.guideRule,
          severity: x.severity,
          message: x.message,
          path: x.jsonPath,
          range: x.range,
          documentationUrl: x.documentationUrl,
        })),
        suppressed: f.suppressed.map((x) => ({
          code: x.code,
          guideRule: x.guideRule,
          severity: x.severity,
          message: x.message,
          path: x.jsonPath,
          range: x.range,
          documentationUrl: x.documentationUrl,
          exceptionRecord: x.exceptionRecord,
        })),
      })),
      notices,
      summary,
      failOn,
      mode,
      failed,
    },
    null,
    2,
  );
}

// --------------------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------------------

async function main(argv) {
  const values = parseCliArgs(argv);
  const cfg = resolveConfig(values);
  const rel = (p) => {
    const r = path.relative(cfg.repoRoot, p);
    return r === '' || r.startsWith('..') ? p : r;
  };

  const findings = [];
  const suppressed = [];
  const notices = [];
  getGuideCatalogue();

  // --- Discover and load declared spec files -------------------------------------------
  const discovery = await discoverApiDeclarations(cfg, rel, findings, notices);
  const specs = await loadDeclaredSpecs(discovery.declarations, rel, findings);
  const hasDeclaredSurface = discovery.declarations.length > 0 || discovery.standardSurfaces.length > 0;

  // --- File-tree checks (§2.2/§2.3/§3.2/§3.3) -----------------------------------------
  await checkLegacySwagger(cfg.repoRoot, rel, findings);
  const skipAbs = new Set(discovery.declarations.map((entry) => path.resolve(entry.abs)));
  skipAbs.add(path.join(cfg.repoRoot, 'api', 'swagger.yaml'));
  skipAbs.add(path.join(cfg.repoRoot, 'api', 'swagger.json'));
  await scanDivergentCopies(cfg.repoRoot, skipAbs, rel, findings);
  await validateRequirementCoverage(cfg, specs, hasDeclaredSurface, discovery.noApi, rel, findings, notices);
  if (discovery.noApi) notices.push('api/index.yaml explicitly declares that this BB exposes no API surface.');
  for (const surface of discovery.standardSurfaces) {
    const message =
      `Standard-defined API surface "${surface.name}" is inventoried at ${surface.reference}; ` +
      'its protocol-specific conformance is not evaluated by this OpenAPI/AsyncAPI linter.';
    if (cfg.mode === 'conformance') {
      findings.push(
        driverFinding(
          'api/index.yaml',
          'standard-surface-unverified',
          `${message} Conformance remains blocked until GovStack approves a standard-surface registry or profile.`,
        ),
      );
    } else {
      notices.push(message);
    }
  }

  const noSpec = !hasDeclaredSurface;

  // --- Spectral (§20.2) + base validators (§20.1) + guide declaration (§20.3) ----------
  let spectral;
  for (const spec of specs) {
    const relSpec = rel(spec.abs);

    // §20.3: version comparison + exception set for this spec.
    const { exceptions } = consumeGuideDeclaration(spec.data, relSpec, findings, cfg.mode);

    // §20.1 base validator.
    if (!cfg.skipValidators) {
      await runBaseValidator(spec.kind, spec.abs, rel, findings, notices, cfg.mode);
    }

    // §20.2 Spectral.
    if (!spectral) {
      const ruleset = await loadRuleset(cfg.rulesetPath);
      spectral = new Spectral();
      spectral.setRuleset(ruleset);
    }
    const doc = new Document(spec.content, Parsers.Yaml, spec.abs);
    let results;
    try {
      results = await spectral.run(doc);
    } catch (err) {
      throw new OperationalError(`Spectral failed on ${relSpec}: ${err.message}`);
    }

    for (const r of results) {
      const finding = mapSpectralResult(r, relSpec);
      const exception = finding.guideRule ? applicableException(exceptions, finding) : null;
      if (exception) {
        suppressed.push({ ...finding, exceptionRecord: exception.record });
      } else {
        findings.push(finding);
      }
    }

  }

  // --- Assemble per-file report --------------------------------------------------------
  const fileMap = new Map();
  const ensureFile = (p) => {
    let e = fileMap.get(p);
    if (!e) {
      e = { path: p, findings: [], suppressed: [] };
      fileMap.set(p, e);
    }
    return e;
  };
  // Present specs appear first, in a deterministic order, even when clean.
  for (const spec of specs) ensureFile(rel(spec.abs));
  for (const f of findings) ensureFile(f.file).findings.push(f);
  for (const s of suppressed) ensureFile(s.file).suppressed.push(s);
  const files = [...fileMap.values()];

  // --- Summary + threshold verdict -----------------------------------------------------
  const threshold = FAIL_ON_THRESHOLD[cfg.failOn];
  let errors = 0;
  let warnings = 0;
  let info = 0;
  let failed = false;
  for (const f of findings) {
    const n = SEVERITY_NUM[f.severity] ?? 2;
    if (n === 0) errors += 1;
    else if (n === 1) warnings += 1;
    else if (n === 2) info += 1;
    if (n <= threshold) failed = true;
  }

  const report = {
    files,
    notices,
    suppressed,
    summary: {
      filesLinted: specs.length,
      errors,
      warnings,
      info,
      suppressed: suppressed.length,
    },
    failOn: cfg.failOn,
    mode: cfg.mode,
    failed,
    noSpecBanner: noSpec && !discovery.noApi,
  };

  const output = cfg.format === 'json' ? renderJson(report) : renderText(report);
  process.stdout.write(`${output}\n`);

  return failed ? 1 : 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    if (err instanceof OperationalError) {
      process.stderr.write(`error: ${err.message}\n`);
    } else {
      process.stderr.write(`error: unexpected failure: ${err?.stack ?? err}\n`);
    }
    process.exit(2);
  });
