"""Heading anchors shared by the rule index and link checker.

Rule headings can be renamed while their existing public anchors stay stable.
Register those anchors here so both tools continue to reject accidental changes.
"""

import re

PRESERVED_RULE_ANCHORS = {
    "3.1": "31-asyncapi-300-required",
    "5.8": "58-actions-as-sub-resources",
}

SLUG_KEEP = set("abcdefghijklmnopqrstuvwxyz0123456789-")


def expected_anchor(heading_text):
    """Return a rule's preserved anchor, otherwise its GitHub-style slug."""
    rule = re.match(r"^(\d+\.\d+) ", heading_text)
    if rule and rule.group(1) in PRESERVED_RULE_ANCHORS:
        return PRESERVED_RULE_ANCHORS[rule.group(1)]
    return "".join(
        ch if ch in SLUG_KEEP else "-" if ch == " " else ""
        for ch in heading_text.lower()
    )
