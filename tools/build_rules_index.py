#!/usr/bin/env python3
"""Build the machine-readable rules index for the GovStack Cross-BB API Design Guide.

This script is part of the guide's machine layer. It scans every rule page under
`part-*/` and regenerates two artifacts at the book root:

  * `rules.yaml`       - one structured entry per rule (id, class, level, kinds,
                         surface, page, anchor, and rule text).
  * `all-rules.md`     - a human-facing "rules at a glance" page with one GFM
                         table per section.
  * `rules-by-kind.md` - the same rules grouped by the kind of API they apply
                         to (read, write, events) plus the deployment profile.

Rule bodies follow one convention: hidden rule-class metadata and the first
paragraph carry the requirement, and that paragraph uses keywords of exactly
one level family (MUST/MUST NOT, SHOULD/SHOULD NOT, or MAY). Later paragraphs
may only use weaker keywords. The level of the first paragraph is the rule's
`level`. API kinds come from `tools/rule-kinds.json` (section defaults plus
per-rule overrides).

Each rule's generated verification block is presentation metadata sourced from
`linter/coverage.yaml`. It is retained for the human indexes but excluded from
the normative rule text and level calculation. Historical visible class badges
remain readable so older fixtures and branches can still be checked.

Both artifacts are GENERATED. Do not hand-edit them; edit the section pages and
re-run this script instead. Output is byte-reproducible: no timestamps, no
machine-specific paths, stable ordering.

Modes:
  (default)   regenerate both files on disk and report what changed.
  --check     regenerate in memory and diff against disk; exit 1 if either file
              is stale (a missing file counts as stale), 0 otherwise.

The script fails loudly (non-zero exit, message on stderr) on any malformed
page: an anchor id that does not equal the expected stable anchor, an href that does not
equal its id, a duplicate rule id, a rule id whose section does not match its
page filename, an unrecognised surface, a first paragraph that mixes levels, a
later paragraph stronger than the first, or a rule without an API kind.
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

from anchors import expected_anchor

GUIDE_NAME = "GovStack Cross-BB API Design Guide"
GUIDE_VERSION = "0.3.0-draft"

# Regex for a heading line carrying an explicit anchor tag, e.g.
#   ## 2.1 OpenAPI 3.1.0 required <a href="#21-openapi-310-required" id="21-openapi-310-required"></a>
ANCHORED_HEADING_RE = re.compile(
    r'^## (?P<text>.+?) <a href="#(?P<href>[^"]*)" id="(?P<id>[^"]*)"></a>\s*$'
)
# A rule heading's leading text is "<section>.<index> <short title>".
RULE_TEXT_RE = re.compile(r"^(?P<id>\d+\.\d+) (?P<title>.+)$")
# A line that looks like the start of a rule heading (used to detect a rule
# heading whose anchor is missing or malformed).
LOOKS_LIKE_RULE_RE = re.compile(r"^## \d+\.\d+(\s|$)")
# Enforcement-class badge at the very start of a rule body.
BADGE_RE = re.compile(r"^\*\*\[(?P<cls>M\+R|M|R)\]\*\* ")
# Hidden enforcement-class metadata used by badge-free source pages.
RULE_CLASS_RE = re.compile(r"^<!-- rule-class: (?P<cls>M\+R|M|R) -->$")
VERIFICATION_START = "<!-- verification:start -->"
VERIFICATION_END = "<!-- verification:end -->"
VERIFICATION_SUMMARY_RE = re.compile(r"^\*\*Verification:\*\* (?P<summary>\S.*)$")
# RFC 2119 strength keywords, in output order. Longer forms are listed before
# their prefixes so "MUST NOT" is considered before "MUST".
STRENGTH_TOKENS = [
    ("MUST NOT", "**MUST NOT**"),
    ("MUST", "**MUST**"),
    ("SHOULD NOT", "**SHOULD NOT**"),
    ("SHOULD", "**SHOULD**"),
    ("MAY", "**MAY**"),
]
# Each keyword belongs to one level family; the family is the rule's level.
LEVEL_OF = {
    "MUST NOT": "MUST",
    "MUST": "MUST",
    "SHOULD NOT": "SHOULD",
    "SHOULD": "SHOULD",
    "MAY": "MAY",
}
LEVEL_RANK = {None: 0, "MAY": 1, "SHOULD": 2, "MUST": 3}
# Kinds of API a rule applies to. `deployment` marks runtime obligations;
# mixed rules also carry the API kinds for their specification declarations.
KINDS = ("read", "write", "events", "deployment")
KIND_LABELS = {
    "read": "Read-only HTTP APIs",
    "write": "HTTP APIs with mutations (in addition to the read-only rules)",
    "events": "Event and webhook surfaces",
    "deployment": "Deployment profile (runtime obligations)",
}
RULE_KINDS_FILE = "rule-kinds.json"

class BuildError(Exception):
    """Raised when a page violates the format contract."""


def unwrap_links(text):
    """Replace every markdown link `[text](target)` with its link text.

    The scanner tracks bracket and paren depth so link text that itself contains
    nested brackets is handled correctly.
    """
    result = []
    i = 0
    n = len(text)
    while i < n:
        if text[i] == "[":
            depth = 0
            j = i
            close = -1
            while j < n:
                if text[j] == "[":
                    depth += 1
                elif text[j] == "]":
                    depth -= 1
                    if depth == 0:
                        close = j
                        break
                j += 1
            if close != -1 and close + 1 < n and text[close + 1] == "(":
                k = close + 2
                pdepth = 1
                while k < n:
                    if text[k] == "(":
                        pdepth += 1
                    elif text[k] == ")":
                        pdepth -= 1
                        if pdepth == 0:
                            break
                    k += 1
                if k < n and pdepth == 0:
                    link_text = text[i + 1 : close]
                    result.append(unwrap_links(link_text))
                    i = k + 1
                    continue
            result.append(text[i])
            i += 1
        else:
            result.append(text[i])
            i += 1
    return "".join(result)


def strip_example_blocks(body_lines):
    """Drop each informative Example block: from a line starting with
    `**Example (informative).**` through the end of its fenced code block."""
    kept = []
    in_example = False
    fence_open = False
    for line in body_lines:
        if not in_example:
            if line.startswith("**Example (informative).**"):
                in_example = True
                fence_open = False
                continue
            kept.append(line)
        else:
            if line.lstrip().startswith("```"):
                if not fence_open:
                    fence_open = True
                else:
                    in_example = False
                    fence_open = False
            # every line inside the example is dropped
    return kept


def group_paragraphs(lines):
    """Collapse soft-wrapped lines into paragraphs; blank lines separate them."""
    paragraphs = []
    current = []
    for line in lines:
        if line.strip() == "":
            if current:
                paragraphs.append(" ".join(current))
                current = []
        else:
            current.append(line.strip())
    if current:
        paragraphs.append(" ".join(current))
    return paragraphs


def extract_strengths(text):
    """RFC 2119 keywords present in the rule text, deduplicated, in fixed order."""
    strengths = []
    for label, token in STRENGTH_TOKENS:
        if token in text:
            strengths.append(label)
    return strengths


def level_families(text):
    """The level families whose keywords appear in `text`."""
    return sorted({LEVEL_OF[s] for s in extract_strengths(text)}, key=LEVEL_RANK.get)


def rule_level(paragraphs):
    """The level of the first paragraph; later paragraphs must be weaker."""
    if not paragraphs:
        return None
    families = level_families(paragraphs[0])
    if len(families) > 1:
        raise BuildError(
            f"first paragraph mixes levels {families}; keep one level per requirement "
            "paragraph and move weaker statements to a following paragraph"
        )
    level = families[0] if families else None
    for paragraph in paragraphs[1:]:
        for family in level_families(paragraph):
            if LEVEL_RANK[family] > LEVEL_RANK[level]:
                raise BuildError(
                    f"a later paragraph uses {family} but the requirement paragraph "
                    f"is {level or 'informative'}; move it into the requirement paragraph"
                )
    return level


def strip_verification_block(body_lines):
    """Remove and return one well-formed, trailing verification block."""
    lines = list(body_lines)
    starts = []
    ends = []
    for index, line in enumerate(lines):
        stripped = line.strip()
        marker = stripped.lower()
        if (
            stripped.startswith("<!--")
            and "verification:start" in marker
            and stripped != VERIFICATION_START
        ):
            raise BuildError(f"malformed verification marker: {stripped!r}")
        if (
            stripped.startswith("<!--")
            and "verification:end" in marker
            and stripped != VERIFICATION_END
        ):
            raise BuildError(f"malformed verification marker: {stripped!r}")
        if stripped == VERIFICATION_START:
            starts.append(index)
        if stripped == VERIFICATION_END:
            ends.append(index)

    if not starts and not ends:
        return lines, None, None
    if len(starts) != 1 or len(ends) != 1 or starts[0] >= ends[0]:
        raise BuildError(
            "verification block must have exactly one ordered start and end marker"
        )

    start = starts[0]
    end = ends[0]
    if any(line.strip() for line in lines[end + 1 :]):
        raise BuildError("verification block must be the final content in the rule body")

    block = lines[start + 1 : end]
    if len(block) < 3:
        raise BuildError("verification block is missing its summary, blank line, or detail")
    summary_match = VERIFICATION_SUMMARY_RE.fullmatch(block[0].strip())
    if not summary_match:
        raise BuildError(
            "verification block summary must start with '**Verification:** '"
        )
    if block[1].strip():
        raise BuildError("verification block requires a blank line after its summary")
    detail_paragraphs = group_paragraphs(block[2:])
    if len(detail_paragraphs) != 1:
        raise BuildError("verification block must contain exactly one coverage-note paragraph")

    return (
        lines[:start],
        summary_match.group("summary"),
        detail_paragraphs[0],
    )


def strip_rule_class_metadata(body_lines):
    """Remove hidden rule-class metadata and return its class, when present."""
    lines = list(body_lines)
    matches = []
    for index, line in enumerate(lines):
        stripped = line.strip()
        match = RULE_CLASS_RE.fullmatch(stripped)
        if match:
            matches.append((index, match.group("cls")))
        elif stripped.startswith("<!--") and "rule-class" in stripped.lower():
            raise BuildError(f"malformed rule-class metadata: {stripped!r}")

    if not matches:
        return lines, None
    if len(matches) != 1:
        classes = sorted({rule_class for _index, rule_class in matches})
        if len(classes) > 1:
            raise BuildError(f"conflicting rule-class metadata: {classes}")
        raise BuildError("rule body contains duplicate rule-class metadata")

    metadata_index, rule_class = matches[0]
    first_content = next(
        (index for index, line in enumerate(lines) if line.strip()),
        None,
    )
    if metadata_index != first_content:
        raise BuildError(
            "rule-class metadata must directly precede the requirement paragraph"
        )
    if not any(line.strip() for line in lines[metadata_index + 1 :]):
        raise BuildError(
            "rule-class metadata must directly precede the requirement paragraph"
        )

    return lines[:metadata_index] + lines[metadata_index + 1 :], rule_class


def parse_body_details(body_lines):
    """Return class, level, text, and generated verification presentation data."""
    without_verification, verification_summary, verification_detail = (
        strip_verification_block(body_lines)
    )
    without_metadata, hidden_class = strip_rule_class_metadata(without_verification)
    kept = strip_example_blocks(without_metadata)
    paragraphs = [unwrap_links(p) for p in group_paragraphs(kept)]
    visible_class = None
    if paragraphs:
        match = BADGE_RE.match(paragraphs[0])
        if match:
            visible_class = match.group("cls")
            paragraphs[0] = paragraphs[0][match.end() :]
    if hidden_class and visible_class and hidden_class != visible_class:
        raise BuildError(
            f"conflicting rule classes: hidden {hidden_class}, visible {visible_class}"
        )
    if hidden_class and verification_summary is None:
        raise BuildError(
            "hidden rule-class metadata requires a generated verification block"
        )
    rule_class = hidden_class or visible_class or "informative"
    text = "\n".join(paragraphs)
    return (
        rule_class,
        rule_level(paragraphs),
        text,
        verification_summary,
        verification_detail,
    )


def parse_body(body_lines):
    """Return (class, level, text) for one rule body.

    The three-value interface is retained for callers that only need the
    machine-index fields. `collect_page` also keeps generated verification
    presentation data for the human indexes.
    """
    rule_class, level, text, _summary, _detail = parse_body_details(body_lines)
    return rule_class, level, text


def load_rule_kinds(book_root):
    """Read the hand-maintained kinds table (section defaults and rule overrides)."""
    path = book_root / "tools" / RULE_KINDS_FILE
    table = json.loads(path.read_text(encoding="utf-8"))
    for key in ("sections", "rules"):
        if not isinstance(table.get(key), dict):
            raise BuildError(f"{path.name}: missing '{key}' table")
    return table


def rule_kinds(rule_id, table):
    """The kinds a rule applies to: its override, else its section default."""
    section = rule_id.split(".")[0]
    kinds = table["rules"].get(rule_id, table["sections"].get(section))
    if not kinds:
        raise BuildError(f"{RULE_KINDS_FILE}: no API kinds for rule {rule_id} (section {section})")
    for kind in kinds:
        if kind not in KINDS:
            raise BuildError(f"{RULE_KINDS_FILE}: unknown kind {kind!r} for rule {rule_id}")
    return list(kinds)


def check_kind_overrides(table, rule_ids):
    """Every per-rule override must name a rule that exists."""
    stale = sorted(set(table["rules"]) - set(rule_ids))
    if stale:
        raise BuildError(f"{RULE_KINDS_FILE}: overrides for unknown rules: {', '.join(stale)}")


def parse_section_number(filename):
    match = re.match(r"^(\d+)-", filename)
    if not match:
        raise BuildError(f"cannot parse a section number from filename: {filename}")
    return int(match.group(1))


def extract_h1(lines, page_rel):
    for line in lines:
        match = re.match(r"^# (.+)$", line)
        if match:
            title = match.group(1).strip()
            return re.sub(r"\s*<a href.*</a>\s*$", "", title)
    raise BuildError(f"{page_rel}: no H1 heading found")


def compute_surface(lines, page_rel):
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("**Applies to:**"):
            rest = stripped[len("**Applies to:**") :].strip()
            if rest.startswith("OpenAPI surface"):
                return "OpenAPI"
            if rest.startswith("AsyncAPI surface"):
                return "AsyncAPI"
            if rest.startswith("Event-driven"):
                return "Event-driven"
            if rest.startswith("Universal"):
                return "Universal"
            raise BuildError(
                f"{page_rel}: unrecognised surface in 'Applies to:' line: {rest!r}"
            )
    raise BuildError(f"{page_rel}: no '**Applies to:**' line found in hint block")


def discover_rule_pages(book_root):
    pages = list(book_root.glob("part-*/*.md"))
    return sorted(pages, key=lambda p: (parse_section_number(p.name), p.name))


def heading_indices(lines):
    return [i for i, line in enumerate(lines) if line.startswith("## ")]


def collect_page(book_root, page, seen_ids, kinds_table, errors=None):
    """Parse one rule page into a page-info dict with its ordered rule list.

    Level violations are appended to `errors` when a list is given, so a build
    can report every offending rule at once; otherwise they raise."""
    page_rel = page.relative_to(book_root).as_posix()
    section_num = parse_section_number(page.name)
    lines = page.read_text(encoding="utf-8").split("\n")
    h1_title = extract_h1(lines, page_rel)
    surface = compute_surface(lines, page_rel)
    all_heads = heading_indices(lines)

    rules = []
    for idx, line in enumerate(lines):
        if not line.startswith("## "):
            continue
        match = ANCHORED_HEADING_RE.match(line)
        if not match:
            if LOOKS_LIKE_RULE_RE.match(line):
                raise BuildError(
                    f"{page_rel}:{idx + 1}: rule heading is missing a valid anchor tag: {line.strip()!r}"
                )
            # A non-rule heading without an anchor: nothing to validate here.
            continue

        heading_text = match.group("text")
        href = match.group("href")
        anchor_id = match.group("id")
        expected = expected_anchor(heading_text)
        if anchor_id != expected:
            raise BuildError(
                f"{page_rel}:{idx + 1}: anchor id {anchor_id!r} != expected anchor {expected!r} "
                f"for heading {heading_text!r}"
            )
        if href != anchor_id:
            raise BuildError(
                f"{page_rel}:{idx + 1}: href '#{href}' != id '{anchor_id}'"
            )

        rule_match = RULE_TEXT_RE.match(heading_text)
        if not rule_match:
            # A validated non-rule anchored heading (for example a "Note on ..."
            # heading). It is not part of the rules index.
            continue

        rule_id = rule_match.group("id")
        rule_title = rule_match.group("title").strip()
        if rule_id in seen_ids:
            raise BuildError(f"{page_rel}:{idx + 1}: duplicate rule id {rule_id!r}")
        seen_ids.add(rule_id)
        if int(rule_id.split(".")[0]) != section_num:
            raise BuildError(
                f"{page_rel}:{idx + 1}: rule id {rule_id!r} does not match page "
                f"section number {section_num}"
            )

        # Body runs from after this heading to the next '## ' heading or EOF.
        next_heads = [h for h in all_heads if h > idx]
        end = next_heads[0] if next_heads else len(lines)
        body_lines = lines[idx + 1 : end]
        try:
            rule_class, level, text, verification_summary, verification_detail = (
                parse_body_details(body_lines)
            )
        except BuildError as exc:
            if errors is None:
                raise
            errors.append(f"{page_rel}:{idx + 1}: rule {rule_id}: {exc}")
            continue

        rules.append(
            {
                "id": rule_id,
                "title": rule_title,
                "class": rule_class,
                "level": level,
                "kinds": rule_kinds(rule_id, kinds_table),
                "surface": surface,
                "page": page_rel,
                "anchor": anchor_id,
                "text": text,
                "verification_summary": verification_summary,
                "verification_detail": verification_detail,
            }
        )
    return {"page": page_rel, "h1_title": h1_title, "rules": rules}


def collect(book_root):
    seen_ids = set()
    page_infos = []
    errors = []
    kinds_table = load_rule_kinds(book_root)
    for page in discover_rule_pages(book_root):
        page_infos.append(collect_page(book_root, page, seen_ids, kinds_table, errors))
    if errors:
        raise BuildError(f"{len(errors)} rule bodies break the level convention:\n  " + "\n  ".join(errors))
    check_kind_overrides(kinds_table, seen_ids)
    rules = [rule for info in page_infos for rule in info["rules"]]
    return rules, page_infos


def js(value):
    """A JSON string literal, which is also a valid YAML double-quoted scalar."""
    return json.dumps(value, ensure_ascii=False)


def inline_list(items):
    if not items:
        return "[]"
    return "[" + ", ".join(js(item) for item in items) + "]"


def render_rules_yaml(rules):
    lines = [
        "# GENERATED FILE. DO NOT HAND-EDIT.",
        "# Regenerate with: python3 tools/build_rules_index.py",
        "#",
        "# Invariant: for each rule, `page` + `anchor` locate it in the book.",
        "# The same `#anchor` fragment resolves on both GitHub and GitBook.",
        f"guide: {GUIDE_NAME}",
        f"version: {GUIDE_VERSION}",
        f"rule_count: {len(rules)}",
        "rules:",
    ]
    for rule in rules:
        lines.append(f"- id: {js(rule['id'])}")
        lines.append(f"  title: {js(rule['title'])}")
        lines.append(f"  class: {rule['class']}")
        lines.append(f"  level: {rule['level'] or 'null'}")
        lines.append(f"  kinds: {inline_list(rule['kinds'])}")
        lines.append(f"  surface: {rule['surface']}")
        lines.append(f"  page: {rule['page']}")
        lines.append(f"  anchor: {rule['anchor']}")
        lines.append(f"  text: {js(rule['text'])}")
    return "\n".join(lines) + "\n"


def escape_cell(text):
    return text.replace("\\", "\\\\").replace("|", "\\|")


def render_all_rules_md(page_infos):
    lines = [
        "---",
        'description: "Every rule in the guide: verification approach, level, '
        'API kinds, surface, and a link."',
        "---",
        "",
        "# Rules at a glance",
        "",
        "This page is generated from the section pages by `tools/build_rules_index.py`; "
        "do not edit it by hand. Verification summaries come from "
        "[`linter/coverage.yaml`](linter/coverage.yaml). The coverage check, "
        "`node linter/scripts/generate-verification.mjs --check`, keeps the source "
        "details aligned with that manifest; see "
        "[§1.9](1-introduction.md#19-rule-enforcement-classes).",
        "",
    ]
    for info in page_infos:
        if not info["rules"]:
            continue
        lines.append(f"## {info['h1_title']}")
        lines.append("")
        lines.append("| Rule | Verification | Level | Applies to | Surface | Title |")
        lines.append("| --- | --- | --- | --- | --- | --- |")
        for rule in info["rules"]:
            rule_cell = f"[{rule['id']}]({rule['page']}#{rule['anchor']})"
            verification_cell = escape_cell(rule.get("verification_summary") or "—")
            level_cell = rule["level"] or "—"
            kinds_cell = ", ".join(rule["kinds"])
            surface_cell = rule["surface"]
            title_cell = escape_cell(rule["title"])
            lines.append(
                f"| {rule_cell} | {verification_cell} | {level_cell} | "
                f"{kinds_cell} | {surface_cell} | {title_cell} |"
            )
        lines.append("")
    return "\n".join(lines).rstrip("\n") + "\n"


def render_rules_by_kind_md(rules):
    lines = [
        "---",
        'description: "The rules that apply to each kind of API: read-only, read-write, events, and the deployment profile."',
        "---",
        "",
        "# Rules by API kind",
        "",
        "This page is generated from the section pages and `tools/rule-kinds.json` by "
        "`tools/build_rules_index.py`; do not edit it by hand. A read-write HTTP API "
        "follows the read-only list plus the mutations list. Rules apply where their "
        "stated conditions hold. A rule listed for both an API kind and deployment "
        "has specification declarations and runtime obligations assessed separately. "
        "Verification summaries come from [`linter/coverage.yaml`](linter/coverage.yaml); "
        "the coverage check, `node linter/scripts/generate-verification.mjs --check`, "
        "keeps the generated source details aligned with that manifest. Level is the requirement "
        "level of the rule's first paragraph; see "
        "[§1.11](1-introduction.md#111-which-rules-apply-to-your-api).",
        "",
    ]
    for kind in KINDS:
        selected = [rule for rule in rules if kind in rule["kinds"]]
        lines.append(f"## {KIND_LABELS[kind]}")
        lines.append("")
        lines.append(f"{len(selected)} rule{'s' if len(selected) != 1 else ''}.")
        lines.append("")
        lines.append("| Rule | Level | Verification | Title |")
        lines.append("| --- | --- | --- | --- |")
        for rule in selected:
            rule_cell = f"[{rule['id']}]({rule['page']}#{rule['anchor']})"
            verification_cell = escape_cell(rule.get("verification_summary") or "—")
            lines.append(
                f"| {rule_cell} | {rule['level'] or '—'} | {verification_cell} | "
                f"{escape_cell(rule['title'])} |"
            )
        lines.append("")
    return "\n".join(lines).rstrip("\n") + "\n"


def write_lf(path, content):
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(content)


def run_check(targets, rule_count):
    mismatch = False
    for path, content in targets:
        if not path.exists():
            print(
                f"{path.name}: MISSING (run: python3 tools/build_rules_index.py)",
                file=sys.stderr,
            )
            mismatch = True
            continue
        disk = path.read_text(encoding="utf-8")
        if disk != content:
            mismatch = True
            diff = difflib.unified_diff(
                disk.splitlines(),
                content.splitlines(),
                fromfile=f"{path.name} (on disk)",
                tofile=f"{path.name} (regenerated)",
                lineterm="",
            )
            print("\n".join(diff), file=sys.stderr)
    if mismatch:
        print(
            "check failed: generated artifacts are stale; run python3 tools/build_rules_index.py",
            file=sys.stderr,
        )
        return 1
    print(f"check passed: generated rule pages are up to date ({rule_count} rules)")
    return 0


def run_write(targets, page_infos, rule_count):
    for path, content in targets:
        if not path.exists():
            status = "created"
        elif path.read_text(encoding="utf-8") != content:
            status = "updated"
        else:
            status = "unchanged"
        write_lf(path, content)
        print(f"{status}: {path.name}")
    page_count = len([info for info in page_infos if info["rules"]])
    print(f"wrote {rule_count} rules across {page_count} pages")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check",
        action="store_true",
        help="regenerate in memory and fail (exit 1) if the on-disk files differ",
    )
    args = parser.parse_args(argv)

    book_root = Path(__file__).resolve().parent.parent
    try:
        rules, page_infos = collect(book_root)
    except BuildError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    targets = [
        (book_root / "rules.yaml", render_rules_yaml(rules)),
        (book_root / "all-rules.md", render_all_rules_md(page_infos)),
        (book_root / "rules-by-kind.md", render_rules_by_kind_md(rules)),
    ]

    if args.check:
        return run_check(targets, len(rules))
    return run_write(targets, page_infos, len(rules))


if __name__ == "__main__":
    sys.exit(main())
