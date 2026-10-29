#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GUIDE_DIR = resolve(HERE, '..', '..');
const RULE_HEADING_LINE = /^## (\d+\.\d+) .+ <a href="#([^"]+)" id="\2"><\/a>[ \t]*$/;
const NUMBERED_H2_LINE = /^## \d+\.\d+ /;
const VISIBLE_CLASS_LINE = /^\*\*\[(M\+R|M|R)\]\*\*[ \t]+/;
const CLASS_COMMENT_LINE = /^<!-- rule-class: (M\+R|M|R) -->[ \t]*$/;
const VALID_CLASSES = new Set(['M', 'R', 'M+R', 'informative']);

export const STATUS_SUMMARIES = Object.freeze({
  implemented: 'Automated specification check.',
  driver: 'Automated repository or validator checks.',
  'partial-proxy': 'Partial linter check. Remaining clauses need separate verification.',
  'strict-only': 'Heuristic check in the optional strict profile.',
  'needs-context': 'Additional context required for verification.',
  runtime: 'Runtime verification required; outside the specification linter.',
  human: 'Review or evidence assessment required.',
  informative: 'Informative; no conformance check.',
});

function linesOutsideFences(source) {
  const lines = [];
  let offset = 0;
  let fence = null;

  while (offset < source.length) {
    const newline = source.indexOf('\n', offset);
    const end = newline === -1 ? source.length : newline;
    const text = source.slice(offset, end);
    const opening = text.match(/^[ \t]{0,3}(`{3,}|~{3,})/);

    if (fence) {
      const closing = new RegExp(`^[ \\t]{0,3}${fence.character}{${fence.length},}[ \\t]*$`);
      if (closing.test(text)) fence = null;
    } else if (opening) {
      fence = { character: opening[1][0], length: opening[1].length };
    } else {
      lines.push({ text, index: offset });
    }
    offset = newline === -1 ? source.length : newline + 1;
  }
  return lines;
}

function topLevelHeadings(source, sourceName) {
  const headings = [];
  for (const line of linesOutsideFences(source)) {
    if (!line.text.startsWith('## ')) continue;
    const rule = line.text.match(RULE_HEADING_LINE);
    if (!rule && NUMBERED_H2_LINE.test(line.text)) {
      throw new Error(`malformed numbered rule heading in ${sourceName}: ${line.text}`);
    }
    headings.push({ ...line, id: rule?.[1] ?? null });
  }
  return headings;
}

function removeGeneratedVerificationBlocks(source, sourceName) {
  const lines = linesOutsideFences(source);
  const starts = lines.filter((line) => line.text === '<!-- verification:start -->');
  const ends = lines.filter((line) => line.text === '<!-- verification:end -->');
  if (starts.length !== ends.length) {
    throw new Error(`malformed verification details in ${sourceName}`);
  }

  const edits = [];
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = ends[index];
    if (end.index < start.index || starts[index + 1]?.index < end.index) {
      throw new Error(`malformed verification details in ${sourceName}`);
    }
    const editStart = start.index >= 2 && source.slice(start.index - 2, start.index) === '\n\n'
      ? start.index - 2
      : start.index;
    let editEnd = end.index + end.text.length;
    while (source[editEnd] === '\n') editEnd += 1;
    edits.push({ start: editStart, end: editEnd, replacement: source.slice(end.index + end.text.length, editEnd) });
  }

  let result = source;
  for (let index = edits.length - 1; index >= 0; index -= 1) {
    const edit = edits[index];
    result = `${result.slice(0, edit.start)}${edit.replacement}${result.slice(edit.end)}`;
  }
  return result;
}

// Reader-facing detail text must not leak maintainer vocabulary, and must stay
// one paragraph because tools/build_rules_index.py requires exactly one.
const DETAIL_RULES = [
  [/\u2014/, 'must not contain an em dash'],
  [/\bproxy:|partial-proxy/i, 'must not contain maintainer proxy shorthand ("proxy:" or "partial-proxy")'],
  [/\bgovstack-\d+\.\d+\b/, 'must not contain a Spectral rule name'],
  [/(?<!\bNode)\.m?js\b/, 'must not contain a JavaScript file name'],
  [/functions\//, 'must not mention functions/'],
  [/\n[ \t]*\n/, 'must not contain a blank line (exactly one paragraph is allowed)'],
];

function detailRejection(detail) {
  return DETAIL_RULES.find(([pattern]) => pattern.test(detail.trim()))?.[1] ?? null;
}

export function parseCoverage(source) {
  const document = YAML.parse(source);
  if (!document || !Array.isArray(document.rules)) {
    throw new Error('coverage manifest must contain a rules array');
  }

  const coverage = new Map();
  for (const entry of document.rules) {
    const id = String(entry?.id ?? '');
    if (!id) throw new Error('coverage entry is missing an id');
    if (coverage.has(id)) throw new Error(`duplicate coverage entry for rule ${id}`);
    if (!VALID_CLASSES.has(entry.class)) {
      throw new Error(`unknown coverage class ${JSON.stringify(entry.class)} for rule ${id}`);
    }
    if (!Object.hasOwn(STATUS_SUMMARIES, entry.status)) {
      throw new Error(`unknown coverage status ${JSON.stringify(entry.status)} for rule ${id}`);
    }
    if (typeof entry.note !== 'string' || entry.note.length === 0) {
      throw new Error(`coverage entry ${id} must have a non-empty note`);
    }
    if (typeof entry.detail !== 'string' || entry.detail.trim().length === 0) {
      throw new Error(`coverage entry ${id} must have a non-empty detail`);
    }
    const rejection = detailRejection(entry.detail);
    if (rejection) throw new Error(`coverage entry ${id} detail ${rejection}`);
    coverage.set(id, { ...entry, id });
  }
  return coverage;
}

function verificationSummary(entry) {
  if (entry.class === 'informative') return STATUS_SUMMARIES.informative;
  const summary = STATUS_SUMMARIES[entry.status];
  if (entry.class === 'M+R') return `${summary} Semantic review is also required.`;
  return summary;
}

function verificationBlock(entry) {
  return [
    '<!-- verification:start -->',
    `**Verification:** ${verificationSummary(entry)}`,
    '',
    entry.detail.trim(),
    '<!-- verification:end -->',
  ].join('\n');
}

function transformRuleSection(section, id, entry, sourceName, trailingNewlines) {
  const visibleClasses = [];
  const classComments = [];
  for (const line of linesOutsideFences(section)) {
    const visible = line.text.match(VISIBLE_CLASS_LINE);
    if (visible) visibleClasses.push({ ...line, value: visible[1], length: visible[0].length });
    const comment = line.text.match(CLASS_COMMENT_LINE);
    if (comment) classComments.push({ ...line, value: comment[1] });
  }

  if (visibleClasses.length > 1 || classComments.length > 1 || (visibleClasses.length && classComments.length)) {
    throw new Error(`rule ${id} in ${sourceName} has duplicate class metadata`);
  }

  const sourceClass = classComments[0]?.value ?? visibleClasses[0]?.value ?? 'informative';
  if (sourceClass !== entry.class) {
    throw new Error(`class mismatch for rule ${id} in ${sourceName}: source ${sourceClass}, coverage ${entry.class}`);
  }

  let transformed = section;
  if (visibleClasses.length === 1) {
    const visible = visibleClasses[0];
    transformed = `${transformed.slice(0, visible.index)}<!-- rule-class: ${sourceClass} -->\n\n${transformed.slice(visible.index + visible.length)}`;
  }

  transformed = transformed.replace(/\n+$/, '');
  return `${transformed}\n\n${verificationBlock(entry)}${trailingNewlines}`;
}

function transformGuideFileWithIds(source, coverage, sourceName) {
  const cleaned = removeGeneratedVerificationBlocks(source, sourceName);
  const headings = topLevelHeadings(cleaned, sourceName);
  const ids = [];
  const seen = new Set();
  let result = cleaned;

  for (const heading of headings) {
    if (!heading.id) continue;
    const id = heading.id;
    if (seen.has(id)) throw new Error(`duplicate source rule ${id} in ${sourceName}`);
    seen.add(id);
    ids.push(id);
  }

  for (let index = headings.length - 1; index >= 0; index -= 1) {
    const heading = headings[index];
    if (!heading.id) continue;
    const id = heading.id;
    const entry = coverage.get(id);
    if (!entry) throw new Error(`missing coverage entry for rule ${id} in ${sourceName}`);
    const start = heading.index;
    const end = index + 1 < headings.length ? headings[index + 1].index : cleaned.length;
    const section = cleaned.slice(start, end);
    const trailingNewlines = index + 1 < headings.length ? '\n\n' : '\n';
    result = `${result.slice(0, start)}${transformRuleSection(section, id, entry, sourceName, trailingNewlines)}${result.slice(end)}`;
  }

  return { content: result, ids };
}

export function transformGuideFile(source, coverage, sourceName = '<source>') {
  return transformGuideFileWithIds(source, coverage, sourceName).content;
}

export function transformGuideFiles(files, coverage) {
  const transformed = new Map();
  const sourceIds = new Map();

  for (const [sourceName, source] of files) {
    const result = transformGuideFileWithIds(source, coverage, sourceName);
    transformed.set(sourceName, result.content);
    for (const id of result.ids) {
      if (sourceIds.has(id)) {
        throw new Error(`duplicate source rule ${id} in ${sourceIds.get(id)} and ${sourceName}`);
      }
      sourceIds.set(id, sourceName);
    }
  }

  for (const id of coverage.keys()) {
    if (!sourceIds.has(id)) throw new Error(`coverage entry ${id} has no matching source rule`);
  }
  return transformed;
}

async function readGuideFiles(guideDir) {
  const files = new Map();
  const entries = await readdir(guideDir, { withFileTypes: true });
  const partDirs = entries
    .filter((entry) => entry.isDirectory() && /^part-[a-e]$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  for (const partDir of partDirs) {
    const directory = join(guideDir, partDir);
    const names = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort();
    for (const name of names) {
      const path = join(directory, name);
      files.set(relative(guideDir, path), await readFile(path, 'utf8'));
    }
  }
  return files;
}

export async function generateVerificationDetails({
  guideDir = DEFAULT_GUIDE_DIR,
  coveragePath = join(guideDir, 'linter', 'coverage.yaml'),
  check = false,
} = {}) {
  const coverage = parseCoverage(await readFile(coveragePath, 'utf8'));
  const files = await readGuideFiles(guideDir);
  const transformed = transformGuideFiles(files, coverage);
  const changed = [...files.keys()].filter((name) => files.get(name) !== transformed.get(name));

  if (check && changed.length > 0) {
    throw new Error(`verification details are out of date: ${changed.join(', ')}`);
  }
  if (!check) {
    for (const name of changed) await writeFile(join(guideDir, name), transformed.get(name));
  }
  return changed;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) {
    throw new Error('usage: node scripts/generate-verification.mjs [--check]');
  }
  const check = args.includes('--check');
  const changed = await generateVerificationDetails({ check });
  if (changed.length === 0) {
    console.log('Verification details are current.');
  } else {
    console.log(`Updated verification details in ${changed.length} source file(s).`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
