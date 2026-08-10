#!/usr/bin/env python3
"""Build the machine-readable rules index for the GovStack Cross-BB API Design Guide.

This script is part of the guide's machine layer. It scans every rule page under
`part-*/` and regenerates two artifacts at the book root:

  * `rules.yaml`     - one structured entry per rule (id, class, strengths,
                       surface, page, anchor, and rule text).
  * `all-rules.md`   - a human-facing "rules at a glance" page with one GFM
                       table per section.

Both artifacts are GENERATED. Do not hand-edit them; edit the section pages and
re-run this script instead. Output is byte-reproducible: no timestamps, no
machine-specific paths, stable ordering.

Modes:
  (default)   regenerate both files on disk and report what changed.
  --check     regenerate in memory and diff against disk; exit 1 if either file
              is stale (a missing file counts as stale), 0 otherwise.

The script fails loudly (non-zero exit, message on stderr) on any malformed
page: an anchor id that does not equal the computed slug, an href that does not
equal its id, a duplicate rule id, a rule id whose section does not match its
page filename, or an unrecognised surface.
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

GUIDE_NAME = "GovStack Cross-BB API Design Guide"
GUIDE_VERSION = "0.1.0-draft"

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
# RFC 2119 strength keywords, in output order. Longer forms are listed before
# their prefixes so "MUST NOT" is considered before "MUST".
STRENGTH_TOKENS = [
    ("MUST NOT", "**MUST NOT**"),
    ("MUST", "**MUST**"),
    ("SHOULD NOT", "**SHOULD NOT**"),
    ("SHOULD", "**SHOULD**"),
    ("MAY", "**MAY**"),
]

SLUG_KEEP = set("abcdefghijklmnopqrstuvwxyz0123456789-")


class BuildError(Exception):
    """Raised when a page violates the format contract."""


def slugify(heading_text):
    """GitHub-style slug shared with check_links.py; the two MUST be identical.

    Lowercase the text, keep ASCII letters, digits and existing hyphens, turn
    spaces into hyphens, drop every other character. Consecutive hyphens are NOT
    collapsed. The caller passes the heading text without its trailing `<a>` tag
    and with the trailing space before that tag already stripped.
    """
    out = []
    for ch in heading_text.lower():
        if ch in SLUG_KEEP:
            out.append(ch)
        elif ch == " ":
            out.append("-")
        # every other character is dropped
    return "".join(out)


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


def strongest_strength(strengths):
    """The single strongest keyword for the summary table."""
    if "MUST NOT" in strengths or "MUST" in strengths:
        return "MUST"
    if "SHOULD NOT" in strengths or "SHOULD" in strengths:
        return "SHOULD"
    if "MAY" in strengths:
        return "MAY"
    return "—"  # em dash placeholder rendered as a single character


def parse_body(body_lines):
    """Return (class, strengths, text) for one rule body."""
    kept = strip_example_blocks(body_lines)
    paragraphs = [unwrap_links(p) for p in group_paragraphs(kept)]
    rule_class = "informative"
    if paragraphs:
        match = BADGE_RE.match(paragraphs[0])
        if match:
            rule_class = match.group("cls")
            paragraphs[0] = paragraphs[0][match.end() :]
    text = "\n".join(paragraphs)
    return rule_class, extract_strengths(text), text


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


def collect_page(book_root, page, seen_ids):
    """Parse one rule page into a page-info dict with its ordered rule list."""
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
        expected = slugify(heading_text)
        if anchor_id != expected:
            raise BuildError(
                f"{page_rel}:{idx + 1}: anchor id {anchor_id!r} != computed slug {expected!r} "
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
        rule_class, strengths, text = parse_body(body_lines)

        rules.append(
            {
                "id": rule_id,
                "title": rule_title,
                "class": rule_class,
                "strengths": strengths,
                "surface": surface,
                "page": page_rel,
                "anchor": anchor_id,
                "text": text,
            }
        )
    return {"page": page_rel, "h1_title": h1_title, "rules": rules}


def collect(book_root):
    seen_ids = set()
    page_infos = []
    for page in discover_rule_pages(book_root):
        page_infos.append(collect_page(book_root, page, seen_ids))
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
        lines.append(f"  strengths: {inline_list(rule['strengths'])}")
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
        'description: "Every rule in the guide: enforcement class, RFC 2119 strength, surface, and a link."',
        "---",
        "",
        "# Rules at a glance",
        "",
        "This page is generated from the section pages by `tools/build_rules_index.py`; "
        "do not edit it by hand. Class legend: `[M]` machine-checkable, `[R]` review, "
        "`[M+R]` both; see [§1.9](1-introduction.md#19-rule-enforcement-classes).",
        "",
    ]
    for info in page_infos:
        if not info["rules"]:
            continue
        lines.append(f"## {info['h1_title']}")
        lines.append("")
        lines.append("| Rule | Class | Strength | Surface | Title |")
        lines.append("| --- | --- | --- | --- | --- |")
        for rule in info["rules"]:
            rule_cell = f"[{rule['id']}]({rule['page']}#{rule['anchor']})"
            class_cell = "—" if rule["class"] == "informative" else rule["class"]
            strength_cell = strongest_strength(rule["strengths"])
            surface_cell = rule["surface"]
            title_cell = escape_cell(rule["title"])
            lines.append(
                f"| {rule_cell} | {class_cell} | {strength_cell} | {surface_cell} | {title_cell} |"
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
    print(f"check passed: rules.yaml and all-rules.md are up to date ({rule_count} rules)")
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
    ]

    if args.check:
        return run_check(targets, len(rules))
    return run_write(targets, page_infos, len(rules))


if __name__ == "__main__":
    sys.exit(main())
