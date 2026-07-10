---
description: "The commands to run against a BB's OpenAPI or AsyncAPI file, and an honest account of what each one does and does not catch."
---

# Validating your spec

## OpenAPI

Install the validator and run it against the canonical entrypoint:

```bash
pip install openapi-spec-validator
openapi-spec-validator api/openapi.yaml
```

This checks that the file is a structurally valid OpenAPI 3.1.0 document. It is the mechanical check behind [2.4](../part-a/2-openapi-document-standards.md#24-passes-openapi-spec-validator) and [20.1](../part-e/20-conformance-and-validation.md#201-every-file-passes-validation).

## AsyncAPI

```bash
npx @asyncapi/cli validate api/asyncapi.yaml
```

This checks that the file is a structurally valid AsyncAPI 3.0 document. It is the mechanical check behind [3.4](../part-a/3-asyncapi-document-standards.md#34-passes-an-asyncapi-validator).

## The GovStack Spectral ruleset

The ruleset that encodes this guide's `[M]` rules ([20.2](../part-e/20-conformance-and-validation.md#202-passes-the-govstack-spectral-ruleset)) ships in this repository at [`linter/`](../linter/README.md), as a draft of the v1.0 companion artifact tracked in [Appendix A](../appendix/a-companion-documents.md). The recommended entrypoint is the driver, which also runs the base validators above, the file-layout checks, and the [20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) exception handling:

```bash
cd api-design-guide/linter && npm ci
node cli.mjs --repo-root ../..
```

Or run Spectral directly against the ruleset:

```bash
npx @stoplight/spectral-cli lint -r api-design-guide/linter/ruleset.yaml api/openapi.yaml
```

Every finding is prefixed with the guide rule id it enforces (for example `[7.13][M]`) and links to the rule's section. Findings for rule ids declared in `info.x-govstack-api-guide.exceptions` are reported as suppressed rather than counted. An opt-in `strict.yaml` adds noisier heuristics; [`linter/coverage.yaml`](../linter/coverage.yaml) records, for every rule in this guide, whether and how the linter covers it. In CI, the same checks run via the composite GitHub Action in `linter/action.yml`.

Running `npx @stoplight/spectral-cli lint api/openapi.yaml` *without* `-r` applies only Spectral's generic built-in rules: useful as a quick structural check, but it knows nothing about this guide.

## The book's own machine layer

Two scripts keep this book itself internally consistent rather than checking a BB's spec: `python3 tools/check_links.py` and `python3 tools/build_rules_index.py --check`. See [Maintaining this guide](../guides/maintaining-this-guide.md) for when and why to run them.

## What "passing" actually means

Each rule in this guide carries an enforcement-class tag explained in [§1.9](../1-introduction.md#19-rule-enforcement-classes): `[M]` (machine-checkable), `[R]` (requires human review), or `[M+R]` (a linter can check the structural part, a reviewer must confirm the semantic part). The validators above, and the GovStack Spectral ruleset, cover the `[M]` rules and the mechanical half of the `[M+R]` rules (to the extent recorded in [`linter/coverage.yaml`](../linter/coverage.yaml)). Everything else, including every `[R]` rule and the judgement half of every `[M+R]` rule, is verified through specification review, not a command line. A clean validator run is necessary for conformance; it is not sufficient.
