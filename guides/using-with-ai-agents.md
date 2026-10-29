---
description: "How rules.yaml, the published GitBook site, and a BB repository's AGENTS.md fit together for agent-assisted spec work."
---

# Using this guide with AI agents

This guide is written to be read by people and by coding agents working inside a BB repository. Three things make that practical.

## In the repository

`rules.yaml` at the root of this book (`api-design-guide/rules.yaml`) is the machine-readable index of every rule: its ID, legacy compatibility class, level (`MUST`, `SHOULD`, `MAY`, or null for an informative entry, derived from the rule's first paragraph as [§1.5](../1-introduction.md#15-language) explains), the API kinds it applies to (`read`, `write`, `events`, `deployment`; see [§1.11](../1-introduction.md#111-which-rules-apply-to-your-api)), applicable surface, verbatim rule text, and the page and anchor it lives on. An agent working on an OpenAPI or AsyncAPI file should treat `rules.yaml` as the lookup table, not the whole guide, and follow the page and anchor for each rule it needs to reason about, so it gets the full intent, examples, and carve-outs rather than a one-line summary.

## On the published site

Once this book is published as a GitBook space, the platform serves several agent-friendly surfaces automatically, with no extra authoring: an `llms.txt` and `llms-full.txt` at the site root summarising the space for LLM consumption, raw markdown for any page by appending `.md` to its URL, and a read-only MCP server at `{site-url}/~gitbook/mcp` that lets an agent query the space directly. These become available once GovStack wires the space to its final site URL; nothing about them needs to be built here.

## Wiring a BB repository

Paste something like this into the BB repository's `AGENTS.md` or `CLAUDE.md`:

```markdown
This repository's API specifications must conform to the GovStack Cross-BB API Design Guide in /api-design-guide.

Before writing or reviewing OpenAPI/AsyncAPI content:
- Read api-design-guide/rules.yaml, keep the rules whose `kinds` match the surfaces this
  repository exposes (api-design-guide/rules-by-kind.md lists them), and treat every rule
  with `level: MUST` as blocking.
- Require each canonical spec to pin guide and ruleset version `0.3.0-draft`; do not substitute a newer version.
- Validate api/index.yaml discovery and api/coverage.yaml requirement traceability before editing an API surface.
- Cite rule IDs (for example 9.2, 11.1) when flagging or fixing violations.
- Install the base validator for each declared surface before linting: `uv tool install openapi-spec-validator==0.9.0` for OpenAPI, `npm install --global @asyncapi/cli@6.0.2` for AsyncAPI. Their executables must be on PATH; `npm ci` alone does not install them.
- Lint the spec: `cd api-design-guide/linter && npm ci && node cli.mjs --repo-root ../..`
  Every finding is prefixed with the guide rule id it enforces. Fix findings in the
  spec; never edit the ruleset to silence them.
- Run the validators in api-design-guide/guides/validating-your-spec.md before declaring spec work done.
- Consult api-design-guide/guides/spec-editor-checklist.md for the review pass.

Read each applicable rule's Verification details and api-design-guide/linter/coverage.yaml. Perform the stated review or implementation verification for clauses the linter does not establish; a clean validator run does not cover them.
```
