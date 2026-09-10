"""Checks for the rule level and API-kind fields of the rules index."""

import tempfile
import unittest
from pathlib import Path

from build_rules_index import (
    BuildError,
    check_kind_overrides,
    collect_page,
    load_rule_kinds,
    parse_body,
    render_rules_by_kind_md,
    render_rules_yaml,
    rule_kinds,
)

HINT = ["# 7. HTTP status codes", "**Applies to:** OpenAPI surface."]


def heading(rule_id, title):
    slug = f"{rule_id.replace('.', '')}-{title.lower().replace(' ', '-')}"
    return f'## {rule_id} {title} <a href="#{slug}" id="{slug}"></a>'


class RuleLevelTests(unittest.TestCase):
    def test_level_is_the_single_family_of_the_first_paragraph(self):
        body = ["**[M]** Clients **MUST** send it and **MUST NOT** forge it.", "",
                "A server **MAY** log it."]
        rule_class, level, _text = parse_body(body)
        self.assertEqual(rule_class, "M")
        self.assertEqual(level, "MUST")

    def test_should_family_level(self):
        _cls, level, _text = parse_body(["**[R]** Endpoints **SHOULD NOT** do this."])
        self.assertEqual(level, "SHOULD")

    def test_informative_rule_has_no_level(self):
        rule_class, level, _text = parse_body(["Sparse fieldsets are out of scope."])
        self.assertEqual(rule_class, "informative")
        self.assertIsNone(level)

    def test_mixed_first_paragraph_is_rejected(self):
        with self.assertRaises(BuildError):
            parse_body(["**[M]** It **MUST** paginate and **SHOULD** sort."])

    def test_stronger_keyword_after_the_first_paragraph_is_rejected(self):
        with self.assertRaises(BuildError):
            parse_body(["**[M+R]** Reads **SHOULD** advertise `ETag`.", "",
                        "A strong validator **MUST** be used."])

    def test_weaker_keywords_may_follow(self):
        _cls, level, _text = parse_body(["**[M]** It **MUST** paginate.", "",
                                         "It **SHOULD** sort and **MAY** count."])
        self.assertEqual(level, "MUST")

    def test_example_blocks_are_not_checked(self):
        body = ["**[M]** It **SHOULD** paginate.", "",
                "**Example (informative).**", "", "```yaml",
                "description: this MUST not count", "```"]
        _cls, level, _text = parse_body(body)
        self.assertEqual(level, "SHOULD")


class RuleKindTests(unittest.TestCase):
    TABLE = {"sections": {"7": ["read", "write"]}, "rules": {"7.2": ["write"]}}

    def test_specification_declarations_remain_on_author_checklists(self):
        table = load_rule_kinds(Path(__file__).resolve().parents[1])
        for rule_id in ("19.3", "19.4"):
            with self.subTest(rule=rule_id):
                self.assertEqual(set(rule_kinds(rule_id, table)), {"read", "write", "events"})
        self.assertEqual(set(rule_kinds("14.2", table)), {"read", "write", "deployment"})
        for rule_id in ("14.4", "14.5", "19.1", "19.2"):
            with self.subTest(rule=rule_id):
                self.assertEqual(rule_kinds(rule_id, table), ["deployment"])

    def test_section_default_and_rule_override(self):
        self.assertEqual(rule_kinds("7.1", self.TABLE), ["read", "write"])
        self.assertEqual(rule_kinds("7.2", self.TABLE), ["write"])

    def test_unknown_section_is_an_error(self):
        with self.assertRaises(BuildError):
            rule_kinds("8.1", self.TABLE)

    def test_unknown_kind_name_is_an_error(self):
        with self.assertRaises(BuildError):
            rule_kinds("7.1", {"sections": {"7": ["batch"]}, "rules": {}})

    def test_override_for_a_missing_rule_is_an_error(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "tools").mkdir()
            (root / "tools" / "rule-kinds.json").write_text(
                '{"sections": {"7": ["read", "write"]}, "rules": {"7.9": ["write"]}}', encoding="utf-8")
            table = load_rule_kinds(root)
            with self.assertRaises(BuildError):
                check_kind_overrides(table, {"7.1"})

    def test_collect_page_emits_level_and_kinds(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / "7-http-status-codes.md"
            lines = [*HINT, heading("7.1", "Reads"), "**[R]** Reads **MUST** use `200`.", "",
                     heading("7.2", "Created"), "**[M]** Creation **MUST** return `201`."]
            page.write_text("\n".join(lines) + "\n", encoding="utf-8")
            info = collect_page(root, page, set(), self.TABLE)
            self.assertEqual([r["level"] for r in info["rules"]], ["MUST", "MUST"])
            self.assertEqual(info["rules"][1]["kinds"], ["write"])
            rendered = render_rules_yaml(info["rules"])
            self.assertIn('  level: MUST\n', rendered)
            self.assertIn('  kinds: ["write"]\n', rendered)
            self.assertNotIn("strengths", rendered)
            by_kind = render_rules_by_kind_md(info["rules"])
            self.assertIn("## Read-only HTTP APIs\n\n1 rule.", by_kind)
            self.assertIn("| [7.2](7-http-status-codes.md#72-created) | MUST | M | Created |", by_kind)


if __name__ == "__main__":
    unittest.main()
