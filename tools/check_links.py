#!/usr/bin/env python3
"""Validate the cross-reference integrity of the GovStack Cross-BB API Design Guide.

This script is part of the guide's machine layer. It reads every `.md` file
under the book root (including `guides/`, `appendix/`, `SUMMARY.md` and
`README.md`, but excluding `linter/`, which is tooling rather than book
content) and enforces the book's internal-consistency contract:

  1. Every relative markdown link resolves to a file that exists.
  2. Every link fragment `#x` matches an explicit anchor id in the target file.
  3. Every explicit `<a href="#x" id="x"></a>` anchor has href == id, id equal to
     the slug of its heading, and no duplicate id within a page.
  4. SUMMARY.md lists every page exactly once (README.md first) and nothing that
     is missing.
  5. No page is an orphan (unreachable from SUMMARY.md).
  6. Every OPEN-N-X id referenced in the book is defined exactly once as a row in
     appendix/b-open-questions.md.
  7. Every page opens with `---`, carries a double-quoted `description:` line, and
     closes its frontmatter.

Exit status is 0 with a one-line summary when everything passes, or 1 with every
failure listed on stderr. There are no silent skips: if a check cannot run (for
example the open-questions appendix is missing) that itself is a failure.
"""

import argparse
import os
import re
import sys
from pathlib import Path

# Explicit anchor tag as emitted on heading lines.
ANCHOR_RE = re.compile(r'<a href="#(?P<href>[^"]*)" id="(?P<id>[^"]*)"></a>')
OPEN_QUESTION_RE = re.compile(r"OPEN-\d+-[A-Z]")
OPEN_QUESTION_EXACT_RE = re.compile(r"^OPEN-\d+-[A-Z]$")
DESCRIPTION_RE = re.compile(r'^description:\s*".*"\s*$')

SKIP_LINK_PREFIXES = ("http://", "https://", "mailto:")
SLUG_KEEP = set("abcdefghijklmnopqrstuvwxyz0123456789-")

APPENDIX_OPEN_QUESTIONS = "appendix/b-open-questions.md"


def slugify(heading_text):
    """GitHub-style slug shared with build_rules_index.py; the two MUST be identical.

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


def iter_markdown_links(line):
    """Yield (target, column) for every `[text](target)` link on a line.

    A bracket/paren depth scanner is used so link text that contains brackets
    (for example ``[`[OPEN-4-B]`](...)``) is parsed correctly.
    """
    i = 0
    n = len(line)
    while i < n:
        if line[i] == "[":
            depth = 0
            j = i
            close = -1
            while j < n:
                if line[j] == "[":
                    depth += 1
                elif line[j] == "]":
                    depth -= 1
                    if depth == 0:
                        close = j
                        break
                j += 1
            if close != -1 and close + 1 < n and line[close + 1] == "(":
                k = close + 2
                pdepth = 1
                while k < n:
                    if line[k] == "(":
                        pdepth += 1
                    elif line[k] == ")":
                        pdepth -= 1
                        if pdepth == 0:
                            break
                    k += 1
                if k < n and pdepth == 0:
                    yield line[close + 2 : k].strip(), i
                    i = k + 1
                    continue
            i += 1
        else:
            i += 1


class Checker:
    def __init__(self, book_root):
        self.book_root = book_root
        self.failures = []
        # linter/ is lint tooling, not book content: its markdown (own READMEs,
        # node_modules) is not pages. Links from pages into linter/ still get
        # their existence checked like any other target.
        self.md_files = sorted(
            p
            for p in book_root.rglob("*.md")
            if p.relative_to(book_root).parts[0] != "linter"
        )
        # Per-file data keyed by absolute Path.
        self.anchors = {}  # path -> set of anchor ids
        self.links = []  # (path, lineno, target)
        self.open_mentions = []  # (path, lineno, open_id)
        self.link_count = 0
        self.anchor_count = 0

    def rel(self, path):
        return path.relative_to(self.book_root).as_posix()

    def fail(self, path, lineno, message):
        location = self.rel(path)
        if lineno is not None:
            location += f":{lineno}"
        self.failures.append(f"{location}: {message}")

    # -- pass 1: read each file, validate anchors and frontmatter -------------

    def scan_files(self):
        for path in self.md_files:
            lines = path.read_text(encoding="utf-8").split("\n")
            is_summary = self.rel(path) == "SUMMARY.md"
            if not is_summary:
                self.check_frontmatter(path, lines)
            self.collect_anchors(path, lines)
            self.collect_links_and_mentions(path, lines)

    def check_frontmatter(self, path, lines):
        if not lines or lines[0].strip() != "---":
            self.fail(path, 1, "page does not start with '---' frontmatter")
            return
        close_idx = None
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                close_idx = i
                break
        if close_idx is None:
            self.fail(path, 1, "frontmatter is never closed with '---'")
            return
        for i in range(1, close_idx):
            if DESCRIPTION_RE.match(lines[i]):
                return
        self.fail(
            path,
            1,
            'frontmatter has no double-quoted description: line (description: "...")',
        )

    def collect_anchors(self, path, lines):
        ids = set()
        for lineno, line in enumerate(lines, start=1):
            for match in ANCHOR_RE.finditer(line):
                self.anchor_count += 1
                href = match.group("href")
                anchor_id = match.group("id")
                pre = line[: match.start()]
                heading_text = pre.lstrip("#").strip()
                expected = slugify(heading_text)
                if href != anchor_id:
                    self.fail(
                        path,
                        lineno,
                        f"anchor href '#{href}' != id '{anchor_id}'",
                    )
                if anchor_id != expected:
                    self.fail(
                        path,
                        lineno,
                        f"anchor id '{anchor_id}' != slug '{expected}' of heading "
                        f"{heading_text!r}",
                    )
                if anchor_id in ids:
                    self.fail(path, lineno, f"duplicate anchor id '{anchor_id}'")
                ids.add(anchor_id)
        self.anchors[path] = ids

    def collect_links_and_mentions(self, path, lines):
        for lineno, line in enumerate(lines, start=1):
            for target, _col in iter_markdown_links(line):
                self.links.append((path, lineno, target))
            for match in OPEN_QUESTION_RE.finditer(line):
                self.open_mentions.append((path, lineno, match.group(0)))

    # -- pass 2: validate links and fragments ---------------------------------

    def validate_links(self):
        for path, lineno, target in self.links:
            # Skip external links and empty targets. Bare "#fragment" self-links
            # never match these and fall through to the fragment check below.
            if target == "" or any(target.startswith(p) for p in SKIP_LINK_PREFIXES):
                continue
            self.link_count += 1
            if target.startswith("#"):
                self.validate_fragment(path, lineno, path, target[1:])
                continue
            path_part, _, fragment = target.partition("#")
            if path_part == "":
                self.validate_fragment(path, lineno, path, fragment)
                continue
            resolved = Path(os.path.normpath(path.parent / path_part))
            if not resolved.exists():
                self.fail(
                    path,
                    lineno,
                    f"link target does not exist: {target}",
                )
                continue
            if fragment:
                self.validate_fragment(path, lineno, resolved, fragment)

    def validate_fragment(self, path, lineno, target_file, fragment):
        if fragment == "":
            return
        if target_file.suffix != ".md":
            self.fail(
                path,
                lineno,
                f"fragment '#{fragment}' points at a non-markdown file "
                f"{self.rel(target_file)}",
            )
            return
        ids = self.anchors.get(target_file)
        if ids is None:
            self.fail(
                path,
                lineno,
                f"fragment '#{fragment}' points at an unreadable file "
                f"{self.rel(target_file)}",
            )
            return
        if fragment not in ids:
            self.fail(
                path,
                lineno,
                f"fragment '#{fragment}' has no matching anchor in "
                f"{self.rel(target_file)}",
            )

    # -- SUMMARY.md, orphans --------------------------------------------------

    def check_summary(self):
        summary = self.book_root / "SUMMARY.md"
        if not summary.exists():
            self.failures.append("SUMMARY.md: file is missing (checks 4 and 5 cannot run)")
            return
        summary_targets = []  # ordered list of resolved absolute Paths
        for lineno, line in enumerate(summary.read_text(encoding="utf-8").split("\n"), 1):
            for target, _col in iter_markdown_links(line):
                if any(target.startswith(p) for p in SKIP_LINK_PREFIXES):
                    continue
                path_part = target.partition("#")[0]
                if not path_part.endswith(".md"):
                    continue
                resolved = Path(os.path.normpath(summary.parent / path_part))
                summary_targets.append((resolved, lineno))

        # README.md must be the first listed page.
        readme = Path(os.path.normpath(self.book_root / "README.md"))
        if not summary_targets:
            self.failures.append("SUMMARY.md: lists no pages")
        elif summary_targets[0][0] != readme:
            self.fail(
                summary,
                summary_targets[0][1],
                f"first listed page must be README.md, found "
                f"{self.rel(summary_targets[0][0])}",
            )

        # Missing files and duplicate listings.
        seen = {}
        for resolved, lineno in summary_targets:
            if not resolved.exists():
                self.fail(summary, lineno, f"lists a missing file: {self.rel(resolved)}")
            if resolved in seen:
                self.fail(
                    summary,
                    lineno,
                    f"lists {self.rel(resolved)} more than once "
                    f"(first at line {seen[resolved]})",
                )
            else:
                seen[resolved] = lineno

        # Every page (except SUMMARY.md itself) must be listed exactly once.
        universe = {p for p in self.md_files if self.rel(p) != "SUMMARY.md"}
        listed = set(seen)
        for page in sorted(universe - listed):
            self.fail(page, None, "page is not listed in SUMMARY.md (orphan)")
        for resolved in sorted(listed - universe):
            # Already reported as missing above if it does not exist; otherwise it
            # is a listed file outside the discovered .md set (should not happen).
            if resolved.exists():
                self.fail(
                    self.book_root / "SUMMARY.md",
                    None,
                    f"lists a file outside the book's page set: {self.rel(resolved)}",
                )

    # -- OPEN-question integrity ---------------------------------------------

    def check_open_questions(self):
        appendix = self.book_root / APPENDIX_OPEN_QUESTIONS
        if not appendix.exists():
            self.failures.append(
                f"{APPENDIX_OPEN_QUESTIONS}: file is missing (check 6 cannot run)"
            )
            return
        defined = {}  # open_id -> first defining line number
        for lineno, line in enumerate(appendix.read_text(encoding="utf-8").split("\n"), 1):
            stripped = line.strip()
            if not stripped.startswith("|"):
                continue
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if not cells:
                continue
            first = cells[0]
            match = OPEN_QUESTION_RE.search(first)
            if not match:
                continue
            open_id = match.group(0)
            if open_id in defined:
                self.fail(
                    appendix,
                    lineno,
                    f"duplicate OPEN id definition '{open_id}' "
                    f"(first at line {defined[open_id]})",
                )
            else:
                defined[open_id] = lineno

        for path, lineno, open_id in self.open_mentions:
            if open_id not in defined:
                self.fail(
                    path,
                    lineno,
                    f"references undefined open question '{open_id}' "
                    f"(no row in {APPENDIX_OPEN_QUESTIONS})",
                )

    # -- driver ---------------------------------------------------------------

    def run(self):
        if not self.md_files:
            self.failures.append(f"no markdown files found under {self.book_root}")
            return 1
        self.scan_files()
        self.validate_links()
        self.check_summary()
        self.check_open_questions()

        if self.failures:
            print(
                f"check_links: {len(self.failures)} failure(s):",
                file=sys.stderr,
            )
            for failure in self.failures:
                print(f"  {failure}", file=sys.stderr)
            return 1

        print(
            f"check_links: OK - {len(self.md_files)} files, {self.link_count} links, "
            f"{self.anchor_count} anchors checked"
        )
        return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.parse_args(argv)

    book_root = Path(__file__).resolve().parent.parent
    if not book_root.is_dir():
        print(f"error: book root is not a directory: {book_root}", file=sys.stderr)
        return 2
    return Checker(book_root).run()


if __name__ == "__main__":
    sys.exit(main())
