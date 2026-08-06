---
description: "Where the canonical copy of this guide lives, how to edit a rule without breaking its anchor, and how to regenerate the machine-readable index."
---

# Maintaining this guide

## Where the canonical copy lives

The canonical copy of this guide lives in the GovStack `bb-template` repository, in the `/api-design-guide` folder. A BB repository instantiated from the template inherits a snapshot copy of that folder at the time of instantiation, and may delete it entirely if it does not want the guide tracked locally. Edits belong upstream, in `bb-template`, not in an individual BB's copy: a fix made directly to a BB's inherited copy will be silently overwritten the next time that BB pulls a template update, and it never flows back to `bb-template` on its own. If a BB editor finds an error while working locally, the fix has to be raised or applied against `bb-template` directly.

## Editing a rule

Edit the rule's body in place, on its page. Do not renumber existing rules, and do not change an existing heading's anchor id (the `<a href="#..." id="...">` tag on that heading), even if the heading's visible text is reworded. External links, cross-references elsewhere in this book, and `rules.yaml` all depend on those anchors staying stable; changing one silently breaks every inbound reference. New rules within a section are appended at the end of that section's rule list, taking the next unused number.

## Regenerating the machine layer

Two scripts derive machine-readable artifacts from the page content and must be re-run whenever a page changes:

```bash
python3 tools/build_rules_index.py
```

Rewrites `rules.yaml` and `all-rules.md` from the current state of the pages. Run this after editing, adding, or reordering any rule.

```bash
python3 tools/build_rules_index.py --check
```

Verifies that `rules.yaml` and `all-rules.md` are still in sync with the pages, without rewriting them. Run this after any page edit; it is also the natural check to add to CI once this folder gets a CI hook (the template's CircleCI config does not run it today).

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

## Adding an open question

Append a row to [Appendix B](../appendix/b-open-questions.md) using an ID of the form `OPEN-{section}-{letter}`, keyed to the current section numbering. Once the guide is published, an assigned identifier remains stable.

## Versioning the guide itself

This guide is versioned with SemVer, per [§1.10](../1-introduction.md#110-applicability-and-transition), and its current exact identifier is `0.1.0-draft`. A patch release may correct prose or tooling without changing conformance. A minor release may add optional guidance, deprecate a rule, or relax a requirement. Adding or strengthening a mandatory rule, removing a permitted behaviour, or otherwise making a previously conforming specification non-conforming requires a major release. A ruleset release is separately versioned and every canonical spec pins both exact versions under [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version). Release notes begin with the first published version.
