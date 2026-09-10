---
description: "Entry points by audience and guidance for reviewing the draft."
---

# How to use this guide

The guide is written for lookup, not end-to-end reading ([§1.4](1-introduction.md#14-audience)). Every rule has its own heading and a stable deep link, an identifier like **9.2**, an enforcement badge (**[M]** machine-checkable, **[R]** review, **[M+R]** both; see [§1.9](1-introduction.md#19-rule-enforcement-classes)), and RFC 2119 keywords in the body.

## What a BB publishes <a href="#what-a-bb-publishes" id="what-a-bb-publishes"></a>

Conformance to this guide comes down to a short list of artifacts in the BB repository:

1. A canonical `api/openapi.yaml` for each HTTP surface and `api/asyncapi.yaml` for each event surface, at the default paths or listed in `api/index.yaml` ([§2.2](part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint), [§3.2](part-a/3-asyncapi-document-standards.md#32-one-canonical-asyncapi-entrypoint), [§4.5](part-a/4-documentation-requirements.md#45-api-surface-inventory)).
2. `api/coverage.yaml`, tracing each active functional requirement to an operation, message, external contract, rationale, or tracked plan ([§4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability)).
3. An `info.x-govstack-api-guide` block in each canonical file pinning the exact guide and ruleset versions ([§20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version)).
4. A clean run of the linter ([§20.2](part-e/20-conformance-and-validation.md#202-passes-the-govstack-spectral-ruleset)):

```bash
cd api-design-guide/linter && npm ci && node cli.mjs --repo-root ../..
```

The `api/` folder of the `bb-template` repository is the scaffold for these files: it ships `api/index.yaml` and the shared schemas under `api/common/`. [Rules by API kind](rules-by-kind.md) says which rules apply to a read-only API, an API with mutations, an event surface, and the deployment ([§1.11](1-introduction.md#111-which-rules-apply-to-your-api)).

## Find your path

- **BB spec editors** (primary audience): publish the artifacts above, read the rules for your API kind in [Rules by API kind](rules-by-kind.md), run the [spec editor checklist](guides/spec-editor-checklist.md), jump to any rule via [Rules at a glance](all-rules.md), and run the commands in [Validating your spec](guides/validating-your-spec.md) before submitting for review.
- **Implementers** building against a BB spec: read [§1.8](1-introduction.md#18-layering-what-this-guide-constrains) first to see which promises live in the spec, the implementation profile, or the deployment; then the sections for the surfaces you consume (errors [§11](part-c/11-errors.md), pagination [§12](part-c/12-pagination-filtering-sorting.md), idempotency [§14](part-d/14-idempotency.md), events [§16](part-d/16-cloudevents-and-webhooks.md)).
- **Country teams** adopting BBs: the [Introduction](1-introduction.md) and [§18 Compatibility and lifecycle](part-d/18-compatibility-and-lifecycle.md) describe what consistency you can rely on across the catalogue; concrete deployment values live in implementation profiles, not here.
- **AI coding agents and tooling**: `rules.yaml` at the folder root is the machine-readable index of every rule, with its level and API kinds; [Using this guide with AI agents](guides/using-with-ai-agents.md) explains it and provides a paste-ready instruction block.

## How to review this draft

This is a strawman of a normative cross-BB API design guide. It is not yet ratified. At this stage, committee feedback should focus on:

1. **Scope of harmonisation** (see [§1.2](1-introduction.md#12-scope)).
2. **Structure and depth.** 20 numbered sections ([§1](1-introduction.md)–[§20](part-e/20-conformance-and-validation.md)), supported by examples and rule-specific linter coverage where mechanical enforcement is practical.
3. **Prescriptiveness.** RFC 2119 keywords and linter-backed conformance (see [§1.5](1-introduction.md#15-language) and [§20](part-e/20-conformance-and-validation.md)).
4. **CFR compatibility.** Confirm that the proposed parent relationships and pending CFR changes in [§1.3](1-introduction.md#13-relationship-to-existing-govstack-documents) are correct.

Review comments should challenge the draft's proposed rules directly through issues or pull-request feedback rather than relying on embedded drafting questions.

## About the rule titles <a href="#about-the-rule-titles" id="about-the-rule-titles"></a>

The short titles on rule headings (for example "9.2 camelCase field names") are navigation aids. They are **non-normative**: only the rule body defines the requirement. If a title and its body ever seem to disagree, the body wins, and please report it.
