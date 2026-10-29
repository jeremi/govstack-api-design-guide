---
description: "Where the canonical copy of this guide lives, how to edit a rule without breaking its anchor, and how to regenerate the machine-readable index."
---

# Maintaining this guide

## Where the canonical copy lives

The canonical copy of this guide lives in the standalone `jeremi/govstack-api-design-guide` repository. A BB repository that vendors a snapshot of it holds a copy that goes stale: edits belong upstream, in `jeremi/govstack-api-design-guide`, not in an individual BB's copy, and a fix made directly to a vendored copy never flows back on its own. If a BB editor finds an error while working locally, the fix has to be raised or applied against `jeremi/govstack-api-design-guide` directly.

## Editing a rule

Edit the rule's body in place, on its page. Do not renumber existing rules, and do not change an existing heading's anchor id (the `<a href="#..." id="...">` tag on that heading), even if the heading's visible text is reworded. External links, cross-references elsewhere in this book, and `rules.yaml` all depend on those anchors staying stable; changing one silently breaks every inbound reference. New rules within a section are appended at the end of that section's rule list, taking the next unused number. Keep the level convention of [§1.5](../1-introduction.md#15-language): the first paragraph of a rule body uses keywords from one RFC 2119 family, and later paragraphs only weaker ones.

When renaming a rule heading, register its original anchor in `PRESERVED_RULE_ANCHORS` in `tools/anchors.py`. The index builder and link checker share this mapping, preserving existing links while still catching accidental anchor changes.

Run `python3 tools/test_anchors.py` when changing anchor handling.

Keep the hidden `rule-class` comment as compatibility metadata. The visible Verification blocks are generated from `linter/coverage.yaml`; update that manifest when the available checks or their limits change, then regenerate the blocks. Do not edit the generated blocks by hand. They describe verification coverage, not requirement strength or test results.

## Regenerating the machine layer

Regenerate verification details before building the indexes. The verification generator uses the linter's existing Node dependencies; install them once with `npm --prefix linter ci`.

```bash
node linter/scripts/generate-verification.mjs
```

This updates each rule's Verification block from the coverage manifest while preserving the requirement text, identifiers, anchors, and hidden compatibility class. The index builder excludes these generated notes from the normative text in `rules.yaml` and uses their summaries in the reader indexes.

```bash
python3 tools/build_rules_index.py
```

Rewrites `rules.yaml`, `all-rules.md`, and `rules-by-kind.md` from the current state of the pages. Run this after editing, adding, or reordering any rule. The builder fails when a rule body breaks the level convention. It reads the API kinds of each rule from `tools/rule-kinds.json`, which holds a default kind set per section and per-rule overrides; a new rule inherits its section default, and an override naming a rule that no longer exists fails the build. Run `python3 tools/test_build_rules_index.py` after changing the builder.

```bash
node linter/scripts/generate-verification.mjs --check
python3 tools/build_rules_index.py --check
```

Verifies that the source Verification blocks match the coverage manifest and that `rules.yaml`, `all-rules.md`, and `rules-by-kind.md` are still in sync with the pages, without rewriting them. Run these after any page or coverage edit; this repository's `.github/workflows/checks.yml` runs them on every push to `main` and every pull request. The linter test suite also checks verification-block freshness.

```bash
python3 tools/check_links.py
```

Validates every internal link and anchor reference in the book, including `SUMMARY.md`. Run this alongside the index check whenever a page's headings or cross-references change.

## Keeping the linter in step

The [GovStack Spectral ruleset](../linter/README.md) enforces this guide mechanically, so a rule edit is not finished until the linter agrees with it. Adding, removing, or substantively rewording a rule usually means updating the matching Spectral rule in `linter/rulesets/`, its fixture pair in `linter/tests/fixtures/`, and the rule's entry in `linter/coverage.yaml` (which records how, or why not, every rule is covered). Two checks make forgetting this loud:

```bash
cd linter && npm ci && npm test
COVERAGE_ENFORCE=1 node --test tests/coverage.test.mjs
```

The second command fails if `rules.yaml` and `coverage.yaml` disagree about the set of rule ids, or if `coverage.yaml` and the shipped rulesets disagree about which Spectral rules exist. A new guide rule that was never triaged for linting is therefore a test failure, not a silent gap. Rule `documentationUrl`s in the ruleset embed each rule's page and anchor, which is one more reason anchors must stay frozen.

## Versioning the guide itself

This guide is versioned with SemVer, per [§1.10](../1-introduction.md#110-applicability-and-transition), and its current exact identifier is `0.3.0-draft`. A patch release may correct prose or tooling without changing conformance. A minor release may add optional guidance, deprecate a rule, or relax a requirement. During the `0.x` drafting series a minor release may also add or strengthen a mandatory rule, provided the [draft change record](../draft-changes.md) lists the change with its rationale and the affected rule ids. From `1.0.0` onward, adding or strengthening a mandatory rule, removing a permitted behaviour, or otherwise making a previously conforming specification non-conforming requires a major release. A ruleset release is separately versioned and every canonical spec pins both exact versions under [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version). The [draft change record](../draft-changes.md) explains version changes before publication; release notes begin with the first published version. Shared schema artifacts retain their own version and provenance unless their content changes.
