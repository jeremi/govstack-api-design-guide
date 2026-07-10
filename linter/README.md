# GovStack API lint

The GovStack Spectral ruleset and lint tooling for the
[Cross-BB API Design Guide](../README.md). This is the mechanical enforcement
behind rule [20.2](../part-e/20-conformance-and-validation.md) (draft; the
formal companion publication is tracked in
[Appendix A](../appendix/a-companion-documents.md)). It implements guide
version **0.2.0** (`guide_version` in [coverage.yaml](coverage.yaml)).

## Quick start

```bash
cd api-design-guide/linter
npm ci
node cli.mjs --repo-root ../..          # lints api/openapi.yaml + api/asyncapi.yaml
```

The driver runs everything rule 20 asks for:

1. **File-tree checks** — canonical entrypoints `api/openapi.yaml` /
   `api/asyncapi.yaml`, legacy `swagger.*` names, divergent spec copies
   (guide 2.2/2.3/3.2/3.3).
2. **Base validators** (20.1) — `openapi-spec-validator` and
   `@asyncapi/cli validate`, when installed (`--skip-validators` to skip).
3. **The Spectral ruleset** — 125 rules across both surfaces (OpenAPI 3.1,
   AsyncAPI 3.0). Spectral auto-detects the document type.
4. **Declared exceptions** (20.3) — findings for rule ids listed in
   `info.x-govstack-api-guide.exceptions` are reported as suppressed, not
   dropped. File-tree findings cannot be suppressed.

Flags: `--openapi <path>`, `--asyncapi <path>`, `--ruleset <file>`, `--strict`,
`--fail-on error|warn|info|never` (default `error`), `--format text|json`,
`--skip-validators`. Exit codes: `0` clean or below threshold, `1` findings at
or above `--fail-on`, `2` operational error.

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

[coverage.yaml](coverage.yaml) maps **all 166 guide rules** to their
enforcement status — it is the scope contract, machine-checked by
`tests/coverage.test.mjs` in both directions (set `COVERAGE_ENFORCE=1`):

| status | count | meaning |
| --- | --- | --- |
| `implemented` | 58 | fully checked by the listed Spectral rules |
| `partial-proxy` | 53 | an automated proxy is checked; the note says what is not |
| `driver` | 7 | checked by `cli.mjs` (file tree, base validators), not Spectral |
| `strict-only` | 8 | noisy heuristic, ships only in `strict.yaml` |
| `needs-context` | 7 | needs input that does not exist yet (common components YAML, BB-code registry) |
| `runtime` | 10 | constrains wire behaviour; test-harness territory |
| `human` | 20 | review/governance judgment |
| `informative` | 3 | non-normative guide entries |

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

The template's own workflow (`.github/workflows/api-spec-lint.yml`) skips
cleanly while `api/` contains only empty placeholders.

## Development

```bash
npm test                                    # fixtures, functions, driver, golden, harness
COVERAGE_ENFORCE=1 node --test tests/coverage.test.mjs   # coverage drift checks
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
