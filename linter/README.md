# GovStack API lint

The GovStack Spectral ruleset and lint tooling for the
[Cross-BB API Design Guide](../README.md). This is the mechanical enforcement
behind draft rule [20.2](../part-e/20-conformance-and-validation.md). It implements guide
version **0.3.0-draft** (`guide_version` in [coverage.yaml](coverage.yaml)).

## Quick start

Requires Node.js 20 or newer and npm. Install the base validator for each API
surface you declare: Python and uv provide the OpenAPI validator; the AsyncAPI
validator is a Node.js CLI. Their executable directories must be on `PATH`.
The first two commands are one-time setup for the applicable surfaces;
`npm ci` alone does not install the base validators.

The commands below assume a checkout of `jeremi/govstack-api-design-guide` placed
at `api-design-guide/` inside the BB repository; in CI, use the action reference
under [CI](#ci) instead.

```bash
uv tool install openapi-spec-validator==0.9.0  # OpenAPI surfaces
npm install --global @asyncapi/cli@6.0.2       # AsyncAPI surfaces
cd api-design-guide/linter
npm ci
node cli.mjs --repo-root ../..          # follows the repository's api/index.yaml declaration
```

For multiple API surfaces, declare every document explicitly in
`api/index.yaml`:

```yaml
version: 1
apis:
  - type: openapi
    path: api/public-openapi.yaml
  - type: asyncapi
    path: api/events-asyncapi.yaml
  - type: standard
    name: OpenID Connect
    reference: https://openid.net/specs/openid-connect-core-1_0.html
    discovery: /.well-known/openid-configuration
```

The `standard` form is provisional. It is useful in advisory mode, but blocks
conformance until GovStack approves a recognised-standard registry or profile;
an HTTPS reference alone is not treated as conformance evidence.

A BB with no API surface must say so explicitly instead of keeping empty spec
placeholders:

```yaml
version: 1
noApi: true
reason: This BB publishes reusable components only.
```

The driver runs everything rule 20 asks for:

1. **File-tree checks** — `api/index.yaml` or canonical entrypoints,
   declaration/type consistency, legacy `swagger.*` names, and undeclared or
   divergent spec copies (guide 2.2/2.3/3.2/3.3). Clearly documented historical
   contracts under `api/legacy/` are excluded from current-surface discovery;
   explicit declarations and canonical references still undergo validation.
2. **Requirement coverage** — every active CFR-formatted REQUIRED or
   RECOMMENDED requirement under `spec/**/*.md` must have one disposition in
   `api/coverage.yaml`. DRAFT, DEPRECATED, and INAPPLICABLE requirements are
   not active coverage obligations. `requirements: []` is valid when there are
   no active requirements. An optional `draftRequirements` array maps only
   applicable DRAFT requirements using the same disposition shapes; it does
   not replace active coverage. Mapped operation/message identifiers must
   exist and be unambiguous in either list. Draft-only runs and draft mappings
   carry explicit notices: passing checks validates API artifacts, not
   requirement maturity, deployed implementation conformance, or certification.
3. **Base validators** (20.1) — `openapi-spec-validator` and
   `@asyncapi/cli validate` are mandatory in conformance mode.
4. **The Spectral ruleset** — rules across both surfaces (OpenAPI 3.1,
   AsyncAPI 3). Spectral auto-detects the document type.
5. **Declared exceptions** (20.3) — approved, unexpired exceptions suppress a
   matching rule only at or below their RFC 6901 JSON Pointer scope. Driver
   findings cannot be suppressed.

Complete OpenAPI and AsyncAPI example contracts under `api/examples/` go
through steps 3 to 5 and count toward `--fail-on` like canonical files. They
are not API surfaces: they are excluded from divergent-copy discovery and do not
satisfy requirement coverage. Operation-free component libraries there are
skipped. With `--openapi` or `--asyncapi`, the driver lints only the named files.

Flags: `--openapi <path>`, `--asyncapi <path>`,
`--profile standard|strict|legacy` (default `standard`; see
[Profiles](#profiles)), `--strict` (alias of `--profile strict`; combining it
with another `--profile` is an operational error), `--ruleset <file>`
(overrides the profile's ruleset file), `--mode conformance|advisory`, `--fail-on error|warn|info|never` (default
`error`), `--format text|json`, and `--skip-validators`; `--help` prints the usage. Conformance mode is
the default and rejects missing or skipped base validators. Advisory mode can
use `--skip-validators` for local ruleset review. Exit codes: `0` clean or
below threshold, `1` findings at or above `--fail-on`, `2` operational error.

Suppressed JSON findings include every supporting approval URI in
`exceptionRecords`. The existing `exceptionRecord` field retains the first
URI for compatibility. Text output also lists all records when a deduplicated
finding requires more than one scoped exception.

Every spec must declare the exact guide and ruleset version. Exceptions use
the following shape. `record` must be HTTPS, dates use `YYYY-MM-DD`, and
`scope` must be an RFC 6901 JSON Pointer (the empty string means the root).

```yaml
info:
  x-govstack-api-guide:
    version: 0.3.0-draft
    rulesetVersion: 0.3.0-draft
    profile: standard            # optional: standard (default) or legacy
    exceptions:
      - rule: "9.5"
        scope: /components/schemas/LegacyRecord
        rationale: Existing clients depend on this wire name.
        record: https://example.gov/decisions/API-42
        reviewedBy: GovStack API review group
        reviewedAt: "2026-07-01"
        expiresAt: "2026-10-01"
```

The optional `profile` member accepts `standard` or `legacy`; any other value
is a §20.3 driver finding (error in conformance, warn in advisory). The driver
compares it with the run profile: a surface declaring `legacy` linted without
`--profile legacy` gets an info finding suggesting it, and a `--profile legacy`
run on a surface that does not declare `profile: legacy` gets a warning.

You can also run Spectral directly:

```bash
npx spectral lint -r ruleset.yaml api/openapi.yaml
npx spectral lint -r strict.yaml api/openapi.yaml    # opt-in noisy heuristics
npx spectral lint -r legacy.yaml api/openapi.yaml    # wire-contract rules at info
```

## Profiles

| profile | ruleset | use |
| --- | --- | --- |
| `standard` | `ruleset.yaml` | default; CI gating |
| `strict` | `strict.yaml` | `ruleset.yaml` plus the opt-in noisy heuristics |
| `legacy` | `legacy.yaml` | a surface published before its BB pinned the guide |

`legacy.yaml` extends `ruleset.yaml` and lowers every **wire-contract** rule
to `info`: rules whose remedy would change the public wire contract (sections
5 to 19, except 7.13, 7.14, 7.21, 13.1 and 18.1, plus `govstack-2.6-version`
for duplicated URL version segments). **Documentation** rules
(sections 2, 3, 4 and 20, except `govstack-2.6-version`, plus 7.13, 7.14, 7.21, 13.1 and 18.1) keep their
normal severity. The classification applies per Spectral rule name, suffixed
variants included. A legacy surface declares `profile: legacy` under §20.3 and
stays on its current major version (§1.10). Its wire findings are reported but
do not fail the run. `legacy.yaml` is generated: after adding or removing a
rule, run `node scripts/gen-legacy-profile.mjs`. `tests/profiles.test.mjs`
fails until you do.

## Rule naming and severities

Spectral rules are named `govstack-<guide-rule-id>` (suffixed when one guide
rule needs several checks, e.g. `govstack-7.14-baseline-errors`). Every message
starts with `[<id>][<class>]` and every rule carries a `documentationUrl`
pointing at the rule's section of the guide.

Severity policy (mechanical, no judgment):

- Fully checkable rules inherit their RFC 2119 strength: MUST → `error`,
  SHOULD → `warn`, MAY → `info`.
- Proxy checks (the linter verifies an automatable stand-in, not the whole
  rule) run one notch lower, so an imperfect heuristic never blocks at
  `error`. Each fragment comments on what its proxies do *not* verify.
  The §5.4 depth check retains `warn` for the shallow-path SHOULD; its partial
  coverage concerns identifying fixed literal IDs, and genuine depth deviations
  remain warnings.
- Noisy heuristics (pluralization, verb detection, personal-data and
  business-identifier header scans, copy-paste detection) ship only in
  `strict.yaml` (8 rules, opt-in, `warn`).
- The legacy profile overrides these severities for wire-contract rules only
  (see [Profiles](#profiles)).

Examples of how the policy applies:

- `govstack-12.10` (`fields` parameter shape and its `400` response),
  `govstack-15.8-callbacks` (a request body `callbackUrl` needs a `callbacks`
  object), `govstack-4.7` (shape of `x-govstack-use-case` and
  `x-govstack-pii`) and `govstack-4.7-pii-apikey` (no apiKey scheme on an
  operation marked `x-govstack-pii: true`) are exact MUST checks at `error`.
- `govstack-15.8` (no header or query parameter named like `callback`) and
  `govstack-15.8-format` (`callbackUrl` declares `format: uri`, a stand-in for
  the https MUST) are proxies at `warn`.
- `govstack-8.8` (business identifiers, tenant ids, callback URLs and personal
  identifiers in header names) is a strict-only `warn`.

The `govstack-14.1` check also covers the §8.3 header obligation, so a missing
idempotency key produces one finding. Deliberate overlaps to be aware of:
a callback header fires both `govstack-15.8` and the strict
`govstack-8.8`; `govstack-4.7-pii-apikey` and `govstack-13.6` can both flag an
apiKey-protected data operation.

## Scope and known limits

Each rule's selectors determine its scope. Rules targeting
`components.schemas` inspect unreferenced schemas too; checks rooted in
operations do not apply operation context to unused reusable parameters,
request bodies, or responses merely because those components exist.

The §9.7 selector exemption recognises actual `sort` and `fields` query
parameters and request-body properties, including resolved file references.
A selector reached under another name can still receive a casing finding.
The §9.9 exemption applies only when that selector enum is never emitted in
a response, callback, webhook, or event. The §12.10 parameter check does not
recognise a `fields` parameter reached through an external-file `$ref`.
These are proxy limits, not additional restrictions on valid API designs.

The §20.1 schema-type check supplements the mandatory base validators. It
checks the standard JSON Schema 2020-12 and OpenAPI 3.1 base dialects;
an explicitly declared custom dialect remains the responsibility of its own
validator. Passing this type check alone is not full schema validation.

The §7.2 creation rule requires semantic review: arbitrary operation names do
not prove whether a request creates a resource or starts asynchronous work.
The linter checks declared `201` headers and `202` content and headers, but a
clean run cannot establish that the chosen status matches the operation's
meaning. The coverage manifest records these rules as partial coverage.

## Coverage

[coverage.yaml](coverage.yaml) maps every guide rule to its
enforcement status — it is the scope contract, machine-checked by
`tests/coverage.test.mjs` in both directions:

| status | meaning |
| --- | --- |
| `implemented` | fully checked by the listed Spectral rules |
| `partial-proxy` | an automated proxy is checked; the detail says what is not |
| `driver` | checked by `cli.mjs`, not Spectral |
| `strict-only` | noisy heuristic, ships only in `strict.yaml` |
| `needs-context` | needs an external registry, common artifact, or comparison input |
| `runtime` | constrains wire behaviour; test-harness territory |
| `human` | review or governance judgment |
| `informative` | non-normative guide entry |

Each entry has two text fields. `note` is maintainer evidence and is never
rendered. `detail` is the reader text that `scripts/generate-verification.mjs`
writes under each rule's Verification line in the chapter pages; it is one
paragraph and is rejected if it contains an em dash, the word "proxy", a
Spectral rule name, a JavaScript file name, `functions/`, or a blank line.

Cross-version breaking-change rules (18.3/18.4) are diff territory, not lint
territory: run [oasdiff](https://github.com/oasdiff/oasdiff) against the
previously published OpenAPI version.

## Reference examples

`tests/golden/openapi-golden.yaml` and `tests/golden/asyncapi-golden.yaml` are
complete specs that pass the entire default ruleset. When a rule's requirement
is unclear, they show a shape that satisfies it.

## CI

`action.yml` is a composite GitHub Action wrapping the driver. Minimal usage
in a BB repo:

```yaml
- uses: actions/checkout@v7
- uses: jeremi/govstack-api-design-guide/linter@<ref>
  with:
    fail-on: error
```

This repository's own workflow (`.github/workflows/checks.yml`) runs the
linter's test suite, the golden-file validation, and the guide's index and link
checks. Empty legacy
placeholders are not conformant.

## Development

```bash
npm test   # fixtures, functions, driver, coverage, golden, and harness
```

Every Spectral rule has `tests/fixtures/<rule-name>/{fail,pass}.yaml`: the
runner lints both with the full bundled ruleset and asserts the rule fires on
`fail.yaml` and not on `pass.yaml`. When a guide rule changes, update the rule,
its fixtures, and its `coverage.yaml` entry together — the drift checks fail
otherwise. Shared custom functions live in `functions/` (API reference in
[functions/README.md](functions/README.md)); section-specific ones are
prefixed `sNN-`.

The ruleset is plain Spectral format, so it also runs under
[vacuum](https://github.com/daveshanley/vacuum) (v0.29+) for a faster CI
alternative; the driver only shells out to Spectral.
