---
description: "How rules.yaml, the published GitBook site, and a BB repository's AGENTS.md fit together for agent-assisted spec work."
---

# Using this guide with AI agents

This guide is written to be read by people and by coding agents working inside a BB repository. Three things make that practical.

## In the repository

`rules.yaml` at the root of this book (`api-design-guide/rules.yaml`) is the machine-readable index of every rule: its ID, enforcement class (`[M]`, `[R]`, `[M+R]`), RFC 2119 strength, applicable surface, verbatim rule text, and the page and anchor it lives on. An agent working on an OpenAPI or AsyncAPI file should treat `rules.yaml` as the lookup table, not the whole guide, and follow the page and anchor for each rule it needs to reason about, so it gets the full intent, examples, and carve-outs rather than a one-line summary.

## On the published site

Once this book is published as a GitBook space, the platform serves several agent-friendly surfaces automatically, with no extra authoring: an `llms.txt` and `llms-full.txt` at the site root summarising the space for LLM consumption, raw markdown for any page by appending `.md` to its URL, and a read-only MCP server at `{site-url}/~gitbook/mcp` that lets an agent query the space directly. These become available once GovStack wires the space to its final site URL; nothing about them needs to be built here.

## Wiring a BB repository

Paste something like this into the BB repository's `AGENTS.md` or `CLAUDE.md`:

```markdown
This repository's API specifications must conform to the GovStack Cross-BB API Design Guide in /api-design-guide.

Before writing or reviewing OpenAPI/AsyncAPI content:
- Read api-design-guide/rules.yaml and treat every MUST rule as blocking.
- Require each canonical spec to pin guide and ruleset version `0.1.0-draft`; do not substitute a newer version.
- Validate api/index.yaml discovery and api/coverage.yaml requirement traceability before editing an API surface.
- Cite rule IDs (for example 9.2, 11.1) when flagging or fixing violations.
- Lint the spec: `cd api-design-guide/linter && npm ci && node cli.mjs --repo-root ../..`
  Every finding is prefixed with the guide rule id it enforces. Fix findings in the
  spec; never edit the ruleset to silence them.
- Run the validators in api-design-guide/guides/validating-your-spec.md before declaring spec work done.
- Consult api-design-guide/guides/spec-editor-checklist.md for the review pass.

MUST rules with enforcement class [R] cannot be machine-checked; reason about them explicitly rather than assuming a clean validator run covers them.
```
