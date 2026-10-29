"""Checks for the rule level and API-kind fields of the rules index."""

import tempfile
import unittest
from pathlib import Path

from build_rules_index import (
    BuildError,
    check_kind_overrides,
    collect,
    collect_page,
    load_rule_kinds,
    parse_body,
    render_all_rules_md,
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

    def test_hidden_class_and_verification_block_are_not_rule_text(self):
        body = [
            "<!-- rule-class: M -->",
            "",
            "Clients **MUST** send it.",
            "",
            "<!-- verification:start -->",
            "**Verification:** Automated check",
            "",
            "The coverage note says what reviewers **MUST NOT** assume.",
            "<!-- verification:end -->",
        ]
        rule_class, level, text = parse_body(body)
        self.assertEqual(rule_class, "M")
        self.assertEqual(level, "MUST")
        self.assertEqual(text, "Clients **MUST** send it.")

    def test_hidden_and_visible_classes_must_not_conflict(self):
        with self.assertRaisesRegex(BuildError, "conflicting rule classes"):
            parse_body([
                "<!-- rule-class: R -->",
                "**[M]** Clients **MUST** send it.",
            ])

    def test_conflicting_hidden_classes_are_rejected(self):
        with self.assertRaisesRegex(BuildError, "conflicting rule-class metadata"):
            parse_body([
                "<!-- rule-class: M -->",
                "<!-- rule-class: R -->",
                "Clients **MUST** send it.",
            ])

    def test_malformed_hidden_class_is_rejected(self):
        with self.assertRaisesRegex(BuildError, "malformed rule-class metadata"):
            parse_body([
                "<!-- rule-class: machine -->",
                "Clients **MUST** send it.",
            ])

    def test_hidden_class_must_directly_precede_requirement(self):
        with self.assertRaisesRegex(BuildError, "directly precede"):
            parse_body([
                "Introductory prose.",
                "",
                "<!-- rule-class: M -->",
                "",
                "Clients **MUST** send it.",
            ])

    def test_hidden_class_requires_generated_verification(self):
        with self.assertRaisesRegex(BuildError, "requires a generated verification block"):
            parse_body([
                "<!-- rule-class: M -->",
                "",
                "Clients **MUST** send it.",
            ])

    def test_unclosed_verification_block_is_rejected(self):
        with self.assertRaisesRegex(BuildError, "verification block"):
            parse_body([
                "<!-- rule-class: M -->",
                "Clients **MUST** send it.",
                "",
                "<!-- verification:start -->",
                "**Verification:** Automated check",
                "",
                "A coverage note.",
            ])

    def test_malformed_verification_marker_is_rejected(self):
        with self.assertRaisesRegex(BuildError, "malformed verification marker"):
            parse_body([
                "<!-- rule-class: M -->",
                "Clients **MUST** send it.",
                "",
                "<!-- verification:start-->",
                "**Verification:** Automated check",
                "",
                "A coverage note.",
                "<!-- verification:end -->",
            ])


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

    def test_every_book_rule_has_generated_verification_details(self):
        root = Path(__file__).resolve().parents[1]
        rules, _page_infos = collect(root)
        self.assertEqual(len(rules), 174)
        for rule in rules:
            with self.subTest(rule=rule["id"]):
                self.assertTrue(rule["verification_summary"])
                self.assertTrue(rule["verification_detail"])

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
            self.assertIn(
                "| [7.2](7-http-status-codes.md#72-created) | MUST | — | Created |",
                by_kind,
            )

    def test_collect_page_retains_verification_details_for_human_indexes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / "7-http-status-codes.md"
            lines = [
                *HINT,
                heading("7.1", "Reads"),
                "<!-- rule-class: R -->",
                "Reads **MUST** use `200`.",
                "",
                "<!-- verification:start -->",
                "**Verification:** Human review",
                "",
                "Confirm the status matches the operation semantics.",
                "<!-- verification:end -->",
            ]
            page.write_text("\n".join(lines) + "\n", encoding="utf-8")
            info = collect_page(root, page, set(), self.TABLE)
            rule = info["rules"][0]
            self.assertEqual(rule["verification_summary"], "Human review")
            self.assertEqual(
                rule["verification_detail"],
                "Confirm the status matches the operation semantics.",
            )
            all_rules = render_all_rules_md([info])
            self.assertIn(
                "| Rule | Verification | Level | Applies to | Surface | Title |",
                all_rules,
            )
            self.assertIn("| [7.1](7-http-status-codes.md#71-reads) | Human review |", all_rules)
            self.assertNotIn("Class legend", all_rules)
            self.assertNotIn("| Class |", all_rules)
            self.assertIn("`linter/coverage.yaml`", all_rules)
            self.assertIn("coverage check", all_rules)
            by_kind = render_rules_by_kind_md(info["rules"])
            self.assertIn("| Rule | Level | Verification | Title |", by_kind)
            self.assertNotIn("| Class |", by_kind)

    def test_verification_metadata_does_not_change_rules_yaml(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            page = root / "7-http-status-codes.md"
            legacy_lines = [
                *HINT,
                heading("7.1", "Reads"),
                "**[R]** Reads **MUST** use `200`.",
            ]
            page.write_text("\n".join(legacy_lines) + "\n", encoding="utf-8")
            legacy = collect_page(root, page, set(), self.TABLE)["rules"]

            hidden_lines = [
                *HINT,
                heading("7.1", "Reads"),
                "<!-- rule-class: R -->",
                "Reads **MUST** use `200`.",
                "",
                "<!-- verification:start -->",
                "**Verification:** Human review",
                "",
                "The note includes **MUST NOT** but is not normative rule text.",
                "<!-- verification:end -->",
            ]
            page.write_text("\n".join(hidden_lines) + "\n", encoding="utf-8")
            hidden = collect_page(root, page, set(), self.TABLE)["rules"]

            self.assertEqual(render_rules_yaml(hidden), render_rules_yaml(legacy))


if __name__ == "__main__":
    unittest.main()
