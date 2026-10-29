import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  generateVerificationDetails,
  parseCoverage,
  transformGuideFile,
  transformGuideFiles,
} from '../scripts/generate-verification.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUIDE_DIR = resolve(HERE, '..', '..');

const COVERAGE = `
guide_version: "test"
rules:
  - id: "5.9"
    class: "informative"
    status: human
    spectral_rules: []
    note: "maintainer evidence: informative reference only"
    detail: "informative reference only"
  - id: "7.2"
    class: "M+R"
    status: partial-proxy
    spectral_rules: [govstack-7.2]
    note: "maintainer evidence: checks Location; operation semantics require review"
    detail: "checks Location; operation semantics require review"
  - id: "10.2"
    class: "M"
    status: partial-proxy
    spectral_rules: [govstack-10.2]
    note: "maintainer evidence: checks declared formats; serialized values remain runtime obligations"
    detail: "checks declared formats; serialized values remain runtime obligations"
  - id: "14.4"
    class: "R"
    status: runtime
    spectral_rules: []
    note: "maintainer evidence: replay behaviour is runtime"
    detail: "replay behaviour is runtime"
`;

const SOURCE = `# Fixture

## 5.9 Health endpoint reference <a href="#59-health-endpoint-reference" id="59-health-endpoint-reference"></a>

This section is informative.

## 7.2 Resource creation <a href="#72-resource-creation" id="72-resource-creation"></a>

**[M+R]** A creation response **MUST** use the correct status.

Supporting prose stays with the rule.

## 10.2 RFC 3339 timestamps <a href="#102-rfc-3339-timestamps" id="102-rfc-3339-timestamps"></a>

**[M]** Timestamps **MUST** be UTC.

## 14.4 Replay returns the original response <a href="#144-replay-returns-original-response" id="144-replay-returns-original-response"></a>

**[R]** A replay **MUST** return the original response.
`;

test('renders partial, runtime, semantic-review, and informative verification details', () => {
  const result = transformGuideFile(SOURCE, parseCoverage(COVERAGE), 'fixture.md');

  assert.match(result, /<!-- rule-class: M -->\n\nTimestamps \*\*MUST\*\* be UTC\./);
  assert.match(
    result,
    /\*\*Verification:\*\* Partial linter check\. Remaining clauses need separate verification\.\n\nchecks declared formats; serialized values remain runtime obligations/,
  );
  assert.match(
    result,
    /<!-- rule-class: R -->\n\nA replay[\s\S]*?\*\*Verification:\*\* Runtime verification required; outside the specification linter\./,
  );
  assert.match(
    result,
    /<!-- rule-class: M\+R -->\n\nA creation response[\s\S]*?\*\*Verification:\*\* Partial linter check\. Remaining clauses need separate verification\. Semantic review is also required\./,
  );

  const informativeSection = result.slice(result.indexOf('## 5.9'), result.indexOf('## 7.2'));
  assert.doesNotMatch(informativeSection, /rule-class:/);
  assert.match(informativeSection, /\*\*Verification:\*\* Informative; no conformance check\./);
  assert.match(informativeSection, /informative reference only/);
});

test('preserves normative text after replacing a visible class badge', () => {
  const result = transformGuideFile(SOURCE, parseCoverage(COVERAGE), 'fixture.md');
  assert.match(result, /<!-- rule-class: M\+R -->\n\nA creation response \*\*MUST\*\* use the correct status\./);
  assert.doesNotMatch(result, /^\*\*\[(?:M|R|M\+R)\]\*\*/m);

  const withoutGeneratedMetadata = result
    .replace(/^<!-- rule-class: (M\+R|M|R) -->\n\n/gm, '**[$1]** ')
    .replace(/\n*<!-- verification:start -->\n[\s\S]*?\n<!-- verification:end -->/g, '');
  assert.equal(withoutGeneratedMetadata, SOURCE);
});

test('generation is idempotent', () => {
  const coverage = parseCoverage(COVERAGE);
  const once = transformGuideFile(SOURCE, coverage, 'fixture.md');
  assert.equal(transformGuideFile(once, coverage, 'fixture.md'), once);
});

test('places rule verification before the next non-rule H2 heading', () => {
  const coverage = parseCoverage('rules:\n  - id: "1.1"\n    class: "M"\n    status: implemented\n    note: "maintainer evidence: checks the declaration"\n    detail: "checks the declaration"\n');
  const source = `## 1.1 Rule <a href="#11-rule" id="11-rule"></a>

**[M]** Normative text.

## Note on the rule <a href="#note-on-the-rule" id="note-on-the-rule"></a>

This non-rule note must remain outside the rule.
`;
  const result = transformGuideFile(source, coverage, 'fixture.md');

  assert.ok(result.indexOf('<!-- verification:start -->') < result.indexOf('## Note on the rule'));
  assert.match(result, /<!-- verification:end -->\n\n## Note on the rule/);
  assert.match(result, /## Note on the rule[\s\S]*This non-rule note must remain outside the rule\.\n$/);
});

test('ignores numbered headings and visible badge samples inside fenced Markdown', () => {
  const coverage = parseCoverage('rules:\n  - id: "1.1"\n    class: "M"\n    status: implemented\n    note: "maintainer evidence: checks the declaration"\n    detail: "checks the declaration"\n');
  const fencedExample = `\`\`\`markdown
## 9.9 Example rule <a href="#99-example-rule" id="99-example-rule"></a>

**[M]** Example requirement text.
\`\`\``;
  const source = `## 1.1 Rule <a href="#11-rule" id="11-rule"></a>

**[M]** Normative text.

${fencedExample}
`;
  const result = transformGuideFile(source, coverage, 'fixture.md');

  assert.equal(result.match(/^## \d+\.\d+ /gm)?.length, 2);
  assert.equal(result.match(/^<!-- rule-class:/gm)?.length, 1);
  assert.match(result, new RegExp(fencedExample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('rejects duplicate coverage ids', () => {
  assert.throws(
    () => parseCoverage(`${COVERAGE}\n  - id: "10.2"\n    class: "M"\n    status: implemented\n    note: "maintainer evidence: duplicate"\n    detail: "duplicate"\n`),
    /duplicate coverage entry.*10\.2/i,
  );
});

test('rejects unknown coverage statuses', () => {
  assert.throws(
    () => parseCoverage('rules:\n  - id: "1.1"\n    class: "M"\n    status: magic\n    note: "maintainer evidence: unknown"\n    detail: "unknown"\n'),
    /unknown coverage status.*magic/i,
  );
});

test('rejects a rule without coverage', () => {
  assert.throws(
    () => transformGuideFile('## 1.1 Rule <a href="#11-rule" id="11-rule"></a>\n\n**[M]** Text.\n', new Map(), 'fixture.md'),
    /missing coverage entry.*1\.1/i,
  );
});

test('rejects a coverage entry without a source rule', () => {
  assert.throws(
    () => transformGuideFiles(new Map([['fixture.md', SOURCE]]), parseCoverage(`${COVERAGE}\n  - id: "20.9"\n    class: "M"\n    status: human\n    note: "maintainer evidence: not in the source"\n    detail: "not in the source"\n`)),
    /coverage entry.*20\.9.*no matching source rule/i,
  );
});

test('rejects coverage class drift', () => {
  const coverage = parseCoverage('rules:\n  - id: "1.1"\n    class: "R"\n    status: human\n    note: "maintainer evidence: review"\n    detail: "review"\n');
  assert.throws(
    () => transformGuideFile('## 1.1 Rule <a href="#11-rule" id="11-rule"></a>\n\n**[M]** Text.\n', coverage, 'fixture.md'),
    /class mismatch.*1\.1.*source M.*coverage R/i,
  );
});

test('--check reports drift, while write mode converges and then passes', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'govstack-verification-details-test-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const linterDir = join(root, 'linter');
  const partDir = join(root, 'part-a');
  await mkdir(linterDir, { recursive: true });
  await mkdir(partDir, { recursive: true });
  await writeFile(join(linterDir, 'coverage.yaml'), 'rules:\n  - id: "1.1"\n    class: "M"\n    status: implemented\n    note: "maintainer evidence: checks the declaration"\n    detail: "checks the declaration"\n');
  await writeFile(join(partDir, '1-fixture.md'), '## 1.1 Rule <a href="#11-rule" id="11-rule"></a>\n\n**[M]** Text.\n');

  await assert.rejects(
    generateVerificationDetails({ guideDir: root, check: true }),
    /verification details are out of date.*part-a\/1-fixture\.md/i,
  );
  const changed = await generateVerificationDetails({ guideDir: root });
  assert.deepEqual(changed, ['part-a/1-fixture.md']);
  assert.deepEqual(await generateVerificationDetails({ guideDir: root, check: true }), []);
  assert.match(await readFile(join(partDir, '1-fixture.md'), 'utf8'), /Automated specification check\./);
});

function entryWith(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `    ${key}: ${JSON.stringify(value)}`);
  return `rules:\n  - id: "3.4"\n    class: "M"\n    status: implemented\n${lines.join('\n')}\n`;
}

test('renders detail and never the maintainer note', () => {
  const coverage = parseCoverage(entryWith({ note: 'maintainer shorthand: govstack-3.4 proxy', detail: 'reader text' }));
  const result = transformGuideFile(
    '## 3.4 Rule <a href="#34-rule" id="34-rule"></a>\n\n**[M]** Text.\n',
    coverage,
    'fixture.md',
  );

  assert.match(result, /\*\*Verification:\*\* Automated specification check\.\n\nreader text\n<!-- verification:end -->/);
  assert.doesNotMatch(result, /maintainer shorthand/);
});

test('rejects a missing detail', () => {
  assert.throws(
    () => parseCoverage(entryWith({ note: 'evidence' })),
    /coverage entry 3\.4 must have a non-empty detail/i,
  );
});

test('rejects an empty or blank detail', () => {
  for (const detail of ['', '   ']) {
    assert.throws(
      () => parseCoverage(entryWith({ note: 'evidence', detail })),
      /coverage entry 3\.4 must have a non-empty detail/i,
    );
  }
});

test('rejects a non-string detail', () => {
  assert.throws(
    () => parseCoverage(entryWith({ note: 'evidence', detail: 42 })),
    /coverage entry 3\.4 must have a non-empty detail/i,
  );
});

const FORBIDDEN_DETAILS = [
  ['an em dash', 'checks the field — not the value', /em dash/i],
  ['the maintainer shorthand "proxy:"', 'proxy: x', /proxy/i],
  ['the status name partial-proxy', 'status is partial-proxy today', /proxy/i],
  ['a Spectral rule name', 'covered by govstack-3.4 today', /Spectral rule name/i],
  ['a JavaScript file name', 'implemented in check-thing.mjs', /JavaScript file name/i],
  ['a plain JavaScript file name', 'implemented in check-thing.js', /JavaScript file name/i],
  ['a functions path', 'see functions/check-thing for details', /functions\//i],
  ['a blank line', 'first paragraph\n\nsecond paragraph', /blank line|exactly one/i],
  ['a whitespace-only blank line', 'a\n  \nb', /blank line|exactly one/i],
];

for (const [label, detail, reason] of FORBIDDEN_DETAILS) {
  test(`rejects a detail containing ${label}`, () => {
    assert.throws(
      () => parseCoverage(entryWith({ note: 'evidence', detail })),
      (error) => /coverage entry 3\.4/.test(error.message) && reason.test(error.message),
    );
  });
}

test('accepts a multi-line detail without a blank line and a hyphenated rule reference', () => {
  const detail = 'first line\nsecond line, see rule 3.4, govstack-cfr-data#req-1 and the JSON Schema file.';
  const coverage = parseCoverage(entryWith({ note: 'evidence', detail }));
  assert.equal(coverage.get('3.4').detail, detail);
});

for (const [label, detail] of [
  ['a reverse proxy', 'The linter does not see a reverse proxy in front of the service.'],
  ['a Proxy-Authenticate header', 'A `407` response lists a `Proxy-Authenticate` header.'],
  ['Node.js', 'A test run under Node.js checks the payload.'],
]) {
  test(`accepts a detail mentioning ${label}`, () => {
    assert.equal(parseCoverage(entryWith({ note: 'evidence', detail })).get('3.4').detail, detail);
  });
}

test('the checked-in guide matches coverage-derived verification details', async () => {
  assert.deepEqual(await generateVerificationDetails({ guideDir: GUIDE_DIR, check: true }), []);
});
