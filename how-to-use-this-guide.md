---
description: "Entry points by audience, how to review the draft, and the v0.1 to v0.2 section mapping."
---

# How to use this guide

The guide is written for lookup, not end-to-end reading ([§1.4](1-introduction.md#14-audience)). Every rule has its own heading and a stable deep link, an identifier like **9.2**, an enforcement badge (**[M]** machine-checkable, **[R]** review, **[M+R]** both; see [§1.9](1-introduction.md#19-rule-enforcement-classes)), and RFC 2119 keywords in the body.

## Find your path

- **BB spec editors** (primary audience): start from the [spec editor checklist](guides/spec-editor-checklist.md), jump to rules via [Rules at a glance](all-rules.md), and run the commands in [Validating your spec](guides/validating-your-spec.md) before submitting for review.
- **Implementers** building against a BB spec: read [§1.8](1-introduction.md#18-layering-what-this-guide-constrains) first to see which promises live in the spec, the implementation profile, or the deployment; then the sections for the surfaces you consume (errors [§11](part-c/11-errors.md), pagination [§12](part-c/12-pagination-filtering-sorting.md), idempotency [§14](part-d/14-idempotency.md), events [§16](part-d/16-cloudevents-and-webhooks.md)).
- **Country teams** adopting BBs: the [Introduction](1-introduction.md) and [§18 Compatibility and lifecycle](part-d/18-compatibility-and-lifecycle.md) describe what consistency you can rely on across the catalogue; concrete deployment values live in implementation profiles, not here.
- **AI coding agents and tooling**: `rules.yaml` at the folder root is the machine-readable index of every rule; [Using this guide with AI agents](guides/using-with-ai-agents.md) explains it and provides a paste-ready instruction block.

## How to review this draft

This is a strawman of a normative cross-BB API design guide. It is not yet ratified. At this stage, committee feedback should focus on:

1. **Scope of harmonisation** (see [§1.2](1-introduction.md#12-scope)).
2. **Structure and depth.** 20 numbered sections ([§1](1-introduction.md)–[§20](part-e/20-conformance-and-validation.md)). The final v1.0 will expand rules with positive/negative examples and link machine-checkable rules to Spectral rule IDs.
3. **Prescriptiveness.** RFC 2119 keywords and linter-backed conformance (see [§1.5](1-introduction.md#15-language) and [§20](part-e/20-conformance-and-validation.md)).
4. **The open questions.** [Appendix B](appendix/b-open-questions.md) consolidates every deliberate design call; the **Blocks v1.0?** column marks the ones that need a committee decision before ratification.

Companion documents (governance, security/operations, common YAML, Spectral ruleset, conformance pack) are referenced where relevant; their scope is in [Appendix A](appendix/a-companion-documents.md).

## Section renumbering from v0.1

v0.2 eliminates the lettered sections (old §2A and §15A) in favour of a continuous 1–20 numbering. If you are cross-checking against the circulated v0.1 document:

| v0.1 section | v0.2 section |
|---|---|
| 1 Introduction | [1](1-introduction.md) |
| 2 OpenAPI document standards | [2](part-a/2-openapi-document-standards.md) |
| 2A AsyncAPI document standards | [3](part-a/3-asyncapi-document-standards.md) |
| 3 Documentation requirements | [4](part-a/4-documentation-requirements.md) |
| 4 URL structure and versioning | [5](part-b/5-url-structure-and-versioning.md) |
| 5 HTTP methods | [6](part-b/6-http-methods.md) |
| 6 HTTP status codes | [7](part-b/7-http-status-codes.md) |
| 7 Headers | [8](part-b/8-headers.md) |
| 8 JSON conventions and naming | [9](part-c/9-json-conventions-and-naming.md) |
| 9 Data types and formats | [10](part-c/10-data-types-and-formats.md) |
| 10 Errors | [11](part-c/11-errors.md) |
| 11 Pagination, filtering, sorting | [12](part-c/12-pagination-filtering-sorting.md) |
| 12 Authentication and authorisation | [13](part-d/13-authentication-and-authorisation.md) |
| 13 Idempotency | [14](part-d/14-idempotency.md) |
| 14 Asynchronous operations | [15](part-d/15-asynchronous-operations.md) |
| 15 CloudEvents and webhooks | [16](part-d/16-cloudevents-and-webhooks.md) |
| 15A AsyncAPI channel documentation rules | [17](part-d/17-asyncapi-channel-rules.md) |
| 16 Compatibility and lifecycle | [18](part-d/18-compatibility-and-lifecycle.md) |
| 17 Localisation | [19](part-e/19-localisation.md) |
| 18 Conformance and validation | [20](part-e/20-conformance-and-validation.md) |

Rule numbers moved with their sections (v0.1 rule 8.2 is now 9.2). The `OPEN-N-X` identifiers in [Appendix B](appendix/b-open-questions.md) are deliberately **not** re-keyed: they are frozen labels from v0.1, so feedback threads that cite them stay valid.

## About the rule titles <a href="#about-the-rule-titles" id="about-the-rule-titles"></a>

The short titles on rule headings (for example "9.2 camelCase field names") were added in v0.2 as navigation aids. They are **non-normative**: only the rule body defines the requirement. If a title and its body ever seem to disagree, the body wins, and please report it.
