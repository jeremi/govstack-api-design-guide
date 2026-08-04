# GovStack API lint

The GovStack Spectral ruleset and lint tooling for the
[Cross-BB API Design Guide](../README.md). This is the mechanical enforcement
behind rule [20.2](../part-e/20-conformance-and-validation.md) (draft; the
formal companion publication is tracked in
[Appendix A](../appendix/a-companion-documents.md)). It implements guide
version **0.2.0-draft** (`guide_version` in [coverage.yaml](coverage.yaml)).

## Quick start

```bash
cd api-design-guide/linter
npm ci
node cli.mjs --repo-root ../..          # lints api/openapi.yaml + api/asyncapi.yaml
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
```

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
   divergent spec copies (guide 2.2/2.3/3.2/3.3).
2. **Requirement coverage** — every keyed requirement marker under
   `spec/**/*.md` must have one disposition in `api/coverage.yaml`, and mapped
   operation/message identifiers must exist and be unambiguous.
3. **Base validators** (20.1) — `openapi-spec-validator` and
   `@asyncapi/cli validate` are mandatory in conformance mode.
4. **The Spectral ruleset** — rules across both surfaces (OpenAPI 3.1,
   AsyncAPI 3.0). Spectral auto-detects the document type.
5. **Declared exceptions** (20.3) — approved, unexpired exceptions suppress a
   matching rule only at or below their RFC 6901 JSON Pointer scope. Driver
   findings cannot be suppressed.

Flags: `--openapi <path>`, `--asyncapi <path>`, `--ruleset <file>`, `--strict`,
`--mode conformance|advisory`, `--fail-on error|warn|info|never` (default
`error`), `--format text|json`, and `--skip-validators`. Conformance mode is
the default and rejects missing or skipped base validators. Advisory mode can
use `--skip-validators` for local ruleset review. Exit codes: `0` clean or
below threshold, `1` findings at or above `--fail-on`, `2` operational error.

Every spec must declare the exact guide and ruleset version. Exceptions use
the following shape. `record` must be HTTPS, dates use `YYYY-MM-DD`, and
`scope` must be an RFC 6901 JSON Pointer (the empty string means the root).

```yaml
info:
  x-govstack-api-guide:
    version: 0.2.0-draft
    rulesetVersion: 0.2.0-draft
    exceptions:
      - rule: "9.5"
        scope: /components/schemas/LegacyRecord
        rationale: Existing clients depend on this wire name.
        record: https://example.gov/decisions/API-42
        reviewedBy: GovStack API review group
        reviewedAt: "2026-07-01"
        expiresAt: "2026-10-01"
```

You can also run Spectral directly:

```bash
npx spectral lint -r ruleset.yaml api/openapi.yaml
npx spectral lint -r strict.yaml api/openapi.yaml    # opt-in noisy heuristics
```

## Rule naming and severities

Spectral rules are named `govstack-<guide-rule-id>` (suffixed when one guide
rule needs several checks, e.g. `govstack-5.9-status-enum`). Every message
starts with `[<id>][<class>]` and every rule carries a `documentationUrl`
pointing at the rule's section of the guide.

Severity policy (mechanical, no judgment):

- Fully checkable rules inherit their RFC 2119 strength: MUST → `error`,
  SHOULD → `warn`, MAY → `info`.
- Proxy checks (the linter verifies an automatable stand-in, not the whole
  rule) run one notch lower, so an imperfect heuristic never blocks at
  `error`. Each fragment comments on what its proxies do *not* verify.
- Noisy heuristics (pluralization, verb detection, personal-data term scans,
  copy-paste detection) ship only in `strict.yaml` (8 rules, opt-in, `warn`).

Two deliberate overlaps to be aware of: `govstack-8.3` and `govstack-14.1`
both require an `Idempotency-Key` header on creating POSTs (each cites its own
guide rule), and the §10 field-format rules can report a `$ref`'d schema once
per reference path. Fixing the schema clears all copies.

## Coverage

[coverage.yaml](coverage.yaml) maps every guide rule to its
enforcement status — it is the scope contract, machine-checked by
`tests/coverage.test.mjs` in both directions:

| status | meaning |
| --- | --- |
| `implemented` | fully checked by the listed Spectral rules |
| `partial-proxy` | an automated proxy is checked; the note says what is not |
| `driver` | checked by `cli.mjs`, not Spectral |
| `strict-only` | noisy heuristic, ships only in `strict.yaml` |
| `needs-context` | needs an external registry, common artifact, or comparison input |
| `runtime` | constrains wire behaviour; test-harness territory |
| `human` | review or governance judgment |
| `informative` | non-normative guide entry |

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
- uses: actions/checkout@v4
- uses: ./api-design-guide/linter
  with:
    fail-on: error
```

The template's own workflow (`.github/workflows/api-spec-lint.yml`) runs both
the linter's test suite and the repository conformance check. Empty legacy
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
