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
    note: "informative reference only"
  - id: "7.2"
    class: "M+R"
    status: partial-proxy
    spectral_rules: [govstack-7.2]
    note: "checks Location; operation semantics require review"
  - id: "10.2"
    class: "M"
    status: partial-proxy
    spectral_rules: [govstack-10.2]
    note: "checks declared formats; serialized values remain runtime obligations"
  - id: "14.4"
    class: "R"
    status: runtime
    spectral_rules: []
    note: "replay behaviour is runtime"
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
  const coverage = parseCoverage('rules:\n  - id: "1.1"\n    class: "M"\n    status: implemented\n    note: "checks the declaration"\n');
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
  const coverage = parseCoverage('rules:\n  - id: "1.1"\n    class: "M"\n    status: implemented\n    note: "checks the declaration"\n');
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
    () => parseCoverage(`${COVERAGE}\n  - id: "10.2"\n    class: "M"\n    status: implemented\n    note: "duplicate"\n`),
    /duplicate coverage entry.*10\.2/i,
  );
});

test('rejects unknown coverage statuses', () => {
  assert.throws(
    () => parseCoverage('rules:\n  - id: "1.1"\n    class: "M"\n    status: magic\n    note: "unknown"\n'),
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
    () => transformGuideFiles(new Map([['fixture.md', SOURCE]]), parseCoverage(`${COVERAGE}\n  - id: "20.9"\n    class: "M"\n    status: human\n    note: "not in the source"\n`)),
    /coverage entry.*20\.9.*no matching source rule/i,
  );
});

test('rejects coverage class drift', () => {
  const coverage = parseCoverage('rules:\n  - id: "1.1"\n    class: "R"\n    status: human\n    note: "review"\n');
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
  await writeFile(join(linterDir, 'coverage.yaml'), 'rules:\n  - id: "1.1"\n    class: "M"\n    status: implemented\n    note: "checks the declaration"\n');
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

test('the checked-in guide matches coverage-derived verification details', async () => {
  assert.deepEqual(await generateVerificationDetails({ guideDir: GUIDE_DIR, check: true }), []);
});
