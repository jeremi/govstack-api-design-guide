---
description: "What the Guides group is for, how it relates to the numbered rules, and what it will grow into at v1.0."
---

# About these guides

The pages in this section are non-normative. They exist to make the numbered rules in §1–§20 faster to apply day to day: a checklist to run before review, commands to validate a spec, and notes on how to point an AI coding agent at this guide. Where anything here appears to conflict with a numbered section, the numbered section wins; these guides describe how to comply, not what compliance means.

Four guides live here today:

- [Spec editor checklist](../guides/spec-editor-checklist.md): a pre-submission checklist of the rules most often missed, grouped by specification type, each item linked to the rule it enforces.
- [Validating your spec](../guides/validating-your-spec.md): the actual commands to run against an OpenAPI or AsyncAPI file, and an honest account of what those commands do and do not catch.
- [Using this guide with AI agents](../guides/using-with-ai-agents.md): how `rules.yaml`, the published GitBook site, and a BB repository's `AGENTS.md`/`CLAUDE.md` fit together for agent-assisted spec work.
- [Maintaining this guide](../guides/maintaining-this-guide.md): where the canonical copy lives, how to edit a rule without breaking its anchor, and how to regenerate the machine-readable index.

{% hint style="info" %}
This book is exact draft version `0.2.0-draft` and is not yet ratified. The matching draft Spectral ruleset ships in this repository; the common OpenAPI/AsyncAPI component files and conformance test pack remain publication prerequisites (see [Appendix A](../appendix/a-companion-documents.md)).
{% endhint %}

Before ratification, this section is expected to gain worked positive and negative examples for every numbered rule and a conformance walkthrough that takes one reference BB specification from a blank file to a passing run.
