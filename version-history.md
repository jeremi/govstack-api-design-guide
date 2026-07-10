---
description: "What changed in each version of the GovStack Cross-BB API Design Guide."
---

# Version history

## v0.2 (DRAFT, 2026-07-10)

This edition supersedes the circulated v0.1 document. It is the same rulebook, restructured for publication as a GitBook and extended with the changes below. No normative wording changed other than what is listed here; a mechanical fidelity check of the v0.2 pages against the v0.1 text backs this list.

**Structure and presentation**

- Published as a GitBook: one page per section, one anchored heading per rule, so every rule is deep-linkable with a stable URL fragment that works on GitBook and GitHub alike.
- The enforcement-class tag (`[M]`, `[R]`, `[M+R]`, see [§1.9](1-introduction.md#19-rule-enforcement-classes)) now appears as a bold badge at the start of each rule body instead of after the rule number; [§1.9](1-introduction.md#19-rule-enforcement-classes)'s first sentence was updated to match.
- Sections renumbered to a continuous 1–20, removing the lettered sections (v0.1 §2A is now §3, §15A is now §17); every cross-reference was updated. The mapping table is on [How to use this guide](how-to-use-this-guide.md). The `OPEN-N-X` identifiers were deliberately **not** re-keyed (see the note in [Appendix B](appendix/b-open-questions.md)).
- Non-normative short titles were added to every rule heading (see [About the rule titles](how-to-use-this-guide.md#about-the-rule-titles)).
- Cross-references are now hyperlinks; each section's Intent / Applies to / Layer preamble is presented as an info callout; the "Rules:" list label was dropped; the note and carve-out paragraphs (casing note and carve-outs in [§9](part-c/9-json-conventions-and-naming.md), consent propagation in [§13](part-d/13-authentication-and-authorisation.md), retrofitting in [§18](part-d/18-compatibility-and-lifecycle.md), governance in [§20](part-e/20-conformance-and-validation.md)) received their own anchored headings, with the carve-outs' "(per §1.7)" qualifier moved to a line under the heading.
- [§13](part-d/13-authentication-and-authorisation.md)'s page title drops the "(spec declarations)" qualifier from the v0.1 heading; the section's scope statement is unchanged.
- The broken table markup in Appendices A and B was repaired.
- The executive summary now says "This draft" instead of "This v0.1 draft", and the Part D group label is spelled "Behaviour", matching the body text.

**New content (normative)**

- New [§1.10 Applicability and transition](1-introduction.md#110-applicability-and-transition): the guide binds new surfaces and new major versions, existing specs are not retroactively non-conformant, and the guide itself is versioned with SemVer.
- New rule [9.11](part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code): every namespace that embeds a `{bb-code}` uses the BB's single registered code, with a required syntax; new open question OPEN-9-A. One-sentence pointers to 9.11 were added to rules [11.5](part-c/11-errors.md#115-namespaced-stable-error-codes), [13.4](part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes), [16.3](part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types), and [17.2](part-d/17-asyncapi-channel-rules.md#172-reverse-dns-channel-addresses).
- New rule [20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version): each canonical spec declares the guide version it targets via the `x-govstack-api-guide` extension; new open question OPEN-20-A. The extension was added to rule [9.10](part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix)'s example list.

**New content (informative)**

- Six examples: a `/health` response ([§5.9](part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint)), an error envelope ([§11](part-c/11-errors.md)), cursor and offset pagination envelopes ([§12](part-c/12-pagination-filtering-sorting.md)), an Operation resource ([§15](part-d/15-asynchronous-operations.md)), and a structured CloudEvent ([§16](part-d/16-cloudevents-and-webhooks.md)).
- Two diagrams: which artifact documents which surface ([§1.2](1-introduction.md#12-scope)) and the layering model ([§1.8](1-introduction.md#18-layering-what-this-guide-constrains)).
- [Appendix B](appendix/b-open-questions.md) gained a **Blocks v1.0?** column marking the decisions that must precede ratification.
- A non-normative [Guides](guides/README.md) group: spec editor checklist, validation commands, AI-agent instructions, and maintenance notes.
- A machine layer: [Rules at a glance](all-rules.md) and `rules.yaml` (both generated from the pages by `tools/build_rules_index.py`), plus `tools/check_links.py` as a consistency guard.
- A draft of the GovStack Spectral ruleset with lint tooling ([`linter/`](linter/README.md)): 125 Spectral rules across both surfaces plus 8 opt-in strict heuristics, a driver that adds the [§20.1](part-e/20-conformance-and-validation.md#201-every-file-passes-validation) base validators, file-layout checks, and [20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) exception handling, per-rule coverage recorded in `linter/coverage.yaml`, and a composite GitHub Action with a template workflow. The formal v1.0 companion publication remains pending ([Appendix A](appendix/a-companion-documents.md)).

## v0.1 (DRAFT, 2026-05-31)

Initial draft circulated to the GovStack committee for feedback: 164 numbered rules in sections 1–18 plus the lettered sections 2A and 15A, with three appendices (companion documents, open questions, normative references). Authored by Jeremi Joslin, drawing on the 2026 cross-BB audit of all 15 Building Blocks.
