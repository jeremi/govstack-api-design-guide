"""Regression checks for stable rule anchors in both maintenance tools."""

import tempfile
import unittest
from pathlib import Path

from build_rules_index import BuildError, collect_page

KINDS = {"sections": {"5": ["read", "write"]}, "rules": {}}
from check_links import Checker


class StableAnchorTests(unittest.TestCase):
    def check_heading(self, heading, anchor, accepted):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / "5-url-structure.md"
            lines = [
                "# 5. URL structure",
                "**Applies to:** OpenAPI surface.",
                f'## {heading} <a href="#{anchor}" id="{anchor}"></a>',
                "**[R]** Custom methods **MAY** use a colon suffix.",
            ]
            page.write_text("\n".join(lines) + "\n", encoding="utf-8")
            checker = Checker(root)
            checker.collect_anchors(page, lines)
            if accepted:
                collect_page(root, page, set(), KINDS)
                self.assertEqual(checker.failures, [])
            else:
                with self.assertRaises(BuildError):
                    collect_page(root, page, set(), KINDS)
                self.assertTrue(checker.failures)

    def test_renamed_rule_retains_original_anchor(self):
        self.check_heading("5.8 Custom operations", "58-actions-as-sub-resources", True)

    def test_renaming_does_not_permit_replacing_a_preserved_anchor(self):
        self.check_heading("5.8 Custom operations", "58-custom-operations", False)

    def test_other_rules_still_require_their_heading_slug(self):
        self.check_heading("5.2 Plural noun resources", "52-plural-noun-resources", True)
        self.check_heading("5.2 Plural noun resources", "52-plural-resources", False)


if __name__ == "__main__":
    unittest.main()
