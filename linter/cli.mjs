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

// Spectral severity numbers -> our names. 0=error 1=warn 2=info 3=hint.
const SEVERITY_NAME = ['error', 'warn', 'info', 'hint'];
const SEVERITY_NUM = { error: 0, warn: 1, info: 2, hint: 3 };
// --fail-on threshold: a finding fails the run when its severity number <= threshold.
const FAIL_ON_THRESHOLD = { error: 0, warn: 1, info: 2, never: -1 };

// Directories never scanned for divergent spec copies (§2.3/§3.3).
const DIVERGENT_EXCLUDE_DIRS = new Set([
  '.git',
  'node_modules',
  'api-design-guide',
  'test',
  'examples',
  'spec',
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

  const openapiPath = path.resolve(
    repoRoot,
    values.openapi ?? path.join('api', 'openapi.yaml'),
  );
  const asyncapiPath = path.resolve(
    repoRoot,
    values.asyncapi ?? path.join('api', 'asyncapi.yaml'),
  );

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

// --------------------------------------------------------------------------------------
// File-tree checks (§2.2 / §2.3 / §3.2 / §3.3)
// --------------------------------------------------------------------------------------

// Legacy api/swagger.{yaml,json}. Non-empty -> file-canonical-name finding (§2.2, error).
// Empty placeholder -> notice only (the bb-template ships empty placeholders).
async function checkLegacySwagger(repoRoot, rel, findings, notices) {
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
    if (content.trim() === '') {
      notices.push(
        `Empty legacy placeholder ${rel(abs)}; no OpenAPI surface to lint. ` +
          `Rename to api/openapi.yaml when you add one (guide §2.2).`,
      );
    } else {
      findings.push({
        file: rel(abs),
        code: 'file-canonical-name',
        guideRule: '2.2',
        severity: 'error',
        message:
          `Legacy ${rel(abs)} must be renamed/converted to api/openapi.yaml; ` +
          `the canonical OpenAPI entrypoint is api/openapi.yaml (guide §2.2).`,
        jsonPath: [],
        range: null,
        documentationUrl: null,
      });
    }
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
    return { kind: 'API' };
  }
  let data;
  try {
    data = YAML.parse(await fsp.readFile(absPath, 'utf8'));
  } catch {
    return null;
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (typeof data.openapi === 'string') return { kind: 'OpenAPI' };
    if (typeof data.asyncapi === 'string') return { kind: 'AsyncAPI' };
  }
  return null;
}

// Walk the repo tree for spec documents outside api/, excluding the dirs the guide's own
// fixtures and vendor trees live in. Heuristic; findings say so (§2.3/§3.3, warn).
async function scanDivergentCopies(repoRoot, skipAbs, rel, findings) {
  const apiDir = path.resolve(repoRoot, 'api');

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
        if (path.resolve(full) === apiDir) continue;
        await walk(full);
      } else if (entry.isFile()) {
        if (!/\.(ya?ml|json)$/i.test(entry.name)) continue;
        if (skipAbs.has(path.resolve(full))) continue;
        const hit = await sniffSpec(full);
        if (hit) {
          const guideRule = hit.kind === 'AsyncAPI' ? '3.3' : '2.3';
          findings.push({
            file: rel(full),
            code: 'file-divergent-copies',
            guideRule,
            severity: 'warn',
            message:
              `Heuristic: ${rel(full)} looks like an ${hit.kind} document outside api/. ` +
              `Canonical specs must live under api/ with no divergent copies (guide §${guideRule}); ` +
              `markdown snippets must $ref the canonical file. Verify this is not a stray copy.`,
            jsonPath: [],
            range: null,
            documentationUrl: null,
          });
        }
      }
    }
  }

  await walk(repoRoot);
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
      notice:
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
      notice:
        `AsyncAPI CLI not found; skipping AsyncAPI base validation (§20.1). ` +
        `Install with: npm i -g @asyncapi/cli`,
    };
  }
  if (global.code === 0) return { ok: true };
  return { finding: `asyncapi validate: ${trimOutput(`${global.stdout}\n${global.stderr}`)}` };
}

async function runBaseValidator(kind, absPath, rel, findings, notices) {
  const result =
    kind === 'openapi' ? await validateOpenapi(absPath) : await validateAsyncapi(absPath);
  if (result.notice) {
    notices.push(result.notice);
  } else if (result.finding) {
    findings.push({
      file: rel(absPath),
      code: 'base-validator',
      guideRule: '20.1',
      severity: 'error',
      message: result.finding,
      jsonPath: [],
      range: null,
      documentationUrl: null,
    });
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

// exceptions entries may be strings ("9.2") or objects ({rule, record}). Normalize to a
// Map of guideRuleId -> record (string|null).
function normalizeExceptions(raw) {
  const map = new Map();
  if (!Array.isArray(raw)) return map;
  for (const item of raw) {
    if (typeof item === 'string') {
      map.set(item.trim(), null);
    } else if (item && typeof item === 'object') {
      const rule = item.rule ?? item.id ?? item.ruleId;
      if (typeof rule === 'string') {
        map.set(rule.trim(), item.record ?? item.reference ?? item.ref ?? null);
      }
    }
  }
  return map;
}

function majorMinor(version) {
  const m = String(version).match(/^(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}` : null;
}

let cachedGuideVersion;
function getGuideVersion() {
  if (cachedGuideVersion !== undefined) return cachedGuideVersion;
  cachedGuideVersion = null;
  try {
    const raw = fs.readFileSync(path.join(HERE, 'coverage.yaml'), 'utf8');
    const parsed = YAML.parse(raw);
    if (parsed && typeof parsed.guide_version === 'string') {
      cachedGuideVersion = parsed.guide_version;
    }
  } catch {
    // coverage.yaml missing/unparseable: skip version comparison silently (it ships beside
    // this CLI; its absence is not a spec error).
  }
  return cachedGuideVersion;
}

// Reads info.x-govstack-api-guide. Returns { exceptions: Map }. Emits a version-mismatch
// notice when the declared major.minor differs from the linter's target guide version.
function consumeGuideDeclaration(specData, relPath, notices) {
  const decl = specData?.info?.['x-govstack-api-guide'];
  if (!decl || typeof decl !== 'object') return { exceptions: new Map() };

  const guideVersion = getGuideVersion();
  if (typeof decl.version === 'string' && guideVersion) {
    const declMM = majorMinor(decl.version);
    const targetMM = majorMinor(guideVersion);
    if (declMM && targetMM && declMM !== targetMM) {
      notices.push(
        `${relPath} declares guide version ${decl.version}, but this linter targets ` +
          `${guideVersion} (major.minor mismatch); applied rules may differ (guide §20.3).`,
      );
    }
  }
  return { exceptions: normalizeExceptions(decl.exceptions) };
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
  const { files, notices, suppressed, summary, failOn, failed, noSpecBanner } = report;
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
  lines.push(`Result: ${failed ? 'FAIL' : 'PASS'} (fail-on=${failOn}).`);
  return lines.join('\n');
}

function renderJson(report) {
  const { files, notices, summary, failOn, failed } = report;
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

  // --- Load candidate spec files -------------------------------------------------------
  const openapi = await loadSpec(cfg.openapiPath, rel(cfg.openapiPath));
  const asyncapi = await loadSpec(cfg.asyncapiPath, rel(cfg.asyncapiPath));

  const specs = [];
  if (openapi.present) specs.push({ kind: 'openapi', abs: cfg.openapiPath, ...openapi });
  if (asyncapi.present) specs.push({ kind: 'asyncapi', abs: cfg.asyncapiPath, ...asyncapi });

  // --- File-tree checks (§2.2/§2.3/§3.2/§3.3) -----------------------------------------
  const legacyPresent = await checkLegacySwagger(cfg.repoRoot, rel, findings, notices);
  const skipAbs = new Set([cfg.openapiPath, cfg.asyncapiPath].map((p) => path.resolve(p)));
  await scanDivergentCopies(cfg.repoRoot, skipAbs, rel, findings);

  const noSpec = specs.length === 0;
  if (noSpec && !legacyPresent) {
    notices.push(
      `No API spec files found (looked for ${rel(cfg.openapiPath)} and ${rel(cfg.asyncapiPath)}). ` +
        `An API surface is optional; nothing to lint.`,
    );
  }

  // --- Spectral (§20.2) + base validators (§20.1) + guide declaration (§20.3) ----------
  let spectral;
  for (const spec of specs) {
    const relSpec = rel(spec.abs);

    // §20.3: version comparison + exception set for this spec.
    const { exceptions } = consumeGuideDeclaration(spec.data, relSpec, notices);

    // §20.1 base validator.
    if (!cfg.skipValidators) {
      await runBaseValidator(spec.kind, spec.abs, rel, findings, notices);
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
      if (finding.guideRule && exceptions.has(finding.guideRule)) {
        suppressed.push({ ...finding, exceptionRecord: exceptions.get(finding.guideRule) });
      } else {
        findings.push(finding);
      }
    }

    // §20.1/§20.3: base-validator findings for this spec are also subject to its exceptions.
    for (let i = findings.length - 1; i >= 0; i -= 1) {
      const f = findings[i];
      if (f.code === 'base-validator' && f.file === relSpec && exceptions.has(f.guideRule)) {
        findings.splice(i, 1);
        suppressed.push({ ...f, exceptionRecord: exceptions.get(f.guideRule) });
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
    failed,
    noSpecBanner: noSpec && !legacyPresent,
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
