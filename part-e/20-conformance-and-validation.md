---
description: "Rules governing mechanical conformance verification of BB API specs: schema validation, the GovStack Spectral ruleset, and declared guide-version conformance."
---

# 20. Conformance and validation

{% hint style="info" %}
**Intent.** The contract is mechanically verified.

**Applies to:** Universal. AsyncAPI artifacts have parallel validators (`asyncapi/parser` or AsyncAPI CLI) and Spectral support.
{% endhint %}

## 20.1 Every file passes validation <a href="#201-every-file-passes-validation" id="201-every-file-passes-validation"></a>

**[M]** Every canonical OpenAPI entrypoint **MUST** pass `openapi-spec-validator` for its declared qualified 3.1 patch, with local references resolved. Every canonical AsyncAPI entrypoint **MUST** pass an AsyncAPI 3 parser/validator such as `@asyncapi/parser`. A referenced schema fragment **MUST** validate against its own declared schema dialect and **MUST NOT** be rejected merely because it is not a standalone OpenAPI or AsyncAPI document.

## 20.2 Passes the GovStack Spectral ruleset <a href="#202-passes-the-govstack-spectral-ruleset" id="202-passes-the-govstack-spectral-ruleset"></a>

**[M]** Every BB API spec **MUST** pass the exact GovStack Spectral ruleset version declared under [§20.3](#203-declared-guide-conformance-version) for the machine-checkable rules applicable to its surface. The machine-checkable rules are those tagged `[M]`, together with the mechanical portion of `[M+R]` rules ([§1.9](../1-introduction.md#19-rule-enforcement-classes)). Ruleset `0.2.0-draft` **MUST** cover the OpenAPI, CloudEvents, and AsyncAPI documentation rules recorded in its coverage manifest. Validation **MUST** fail when the declared ruleset artifact is unavailable or differs from the exact declared version; tooling **MUST NOT** select “latest” or fall back by major/minor compatibility.

The ruleset and `rules.yaml` are the reference expressions of the rules ([§1.5](../1-introduction.md#15-language)). A finding that appears to contradict a page is a defect in the guide: report it so that the page or the ruleset is corrected by erratum, rather than editing the ruleset locally.

## 20.3 Declared guide conformance version <a href="#203-declared-guide-conformance-version" id="203-declared-guide-conformance-version"></a>

**[M]** Each canonical specification file **MUST** declare the exact guide and ruleset versions it targets in the `info`-level `x-govstack-api-guide` object using `version` and `rulesetVersion`, each an exact SemVer value rather than a range. For this draft both values **MUST** be `0.2.0-draft`. An optional `exceptions` array **MUST** contain objects with exactly these fields: `rule` (guide rule ID), `scope` (RFC 6901 JSON Pointer into this canonical document), `rationale` (non-empty explanation), `record` (absolute HTTPS URI for the approved public record), `reviewedBy` (non-empty approving authority), `reviewedAt` (calendar date `YYYY-MM-DD`), and `expiresAt` (calendar date `YYYY-MM-DD`). An exception **MUST** suppress only its named rule at or below its declared scope. An expired entry, invalid field, or exception not approved under [§1.6](../1-introduction.md#16-exception-process) **MUST** fail validation rather than suppress the rule. Offline validation **MUST NOT** require dereferencing the record URI.

**Example (informative).**

```yaml
info:
  x-govstack-api-guide:
    version: 0.2.0-draft
    rulesetVersion: 0.2.0-draft
    exceptions:
      - rule: "5.2"
        scope: /paths/~1v1~1status/get
        rationale: Legacy statutory endpoint name cannot change before v2.
        record: https://docs.govstack.global/api-exceptions/registration-2026-004
        reviewedBy: GovStack API Working Group
        reviewedAt: "2026-07-10"
        expiresAt: "2027-01-31"
```

## Note on governance <a href="#note-on-governance" id="note-on-governance"></a>

Publication gates, conformance levels, exception handling, transition timelines, and CI implementation are owned by the GovStack governance process and are outside this guide.
