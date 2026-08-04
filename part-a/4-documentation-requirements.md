---
description: "Documentation requirements for schemas, examples, and operation descriptions across OpenAPI and AsyncAPI surfaces."
---

# 4. Documentation requirements

{% hint style="info" %}
**Intent.** The spec is read by implementers, not only by tools. Operations and schemas need human-readable prose.

**Applies to:** Universal (OpenAPI and AsyncAPI surfaces).
{% endhint %}

## 4.1 Every schema described <a href="#41-every-schema-described" id="41-every-schema-described"></a>

**[M]** Every schema **MUST** have a `description`.

## 4.2 Examples for bodies and enums <a href="#42-examples-for-bodies-and-enums" id="42-examples-for-bodies-and-enums"></a>

**[M+R]** Every request body and response body **MUST** have at least one `example`. Every `enum` **MUST** document what its values mean (an `example` alone is insufficient when the values are not self-explanatory).

## 4.3 No placeholder text <a href="#43-no-placeholder-text" id="43-no-placeholder-text"></a>

**[M+R]** The spec **MUST NOT** contain placeholder text: `TBD`, `Lorem ipsum`, `a, b, c`, content from other BBs with the original BB name still present, or test plans with literal placeholder steps.

## 4.4 Accurate operation descriptions <a href="#44-accurate-operation-descriptions" id="44-accurate-operation-descriptions"></a>

**[R]** Operation `description` **MUST** describe what the operation actually does. (Copy-pasted descriptions that document a different endpoint than the one they sit on are a recurring problem in existing BB specifications.)

## 4.5 API surface inventory <a href="#45-api-surface-inventory" id="45-api-surface-inventory"></a>

**[M+R]** A BB that uses only `api/openapi.yaml`, only `api/asyncapi.yaml`, or both default canonical paths **MAY** omit `api/index.yaml`. If neither default file exists, the BB **MUST** provide `api/index.yaml`. The index **MUST** contain `version: 1` and exactly one of: a non-empty `apis` list, or `noApi: true` together with a non-empty `reason`. Each `apis` entry **MUST** contain only the discovery fields needed here: `type` (`openapi` or `asyncapi`) and `path` (a unique, repository-relative YAML path inside `api/`). Every listed path **MUST** resolve to a canonical specification of the declared type. `apis` and `noApi` **MUST NOT** coexist. A repository with neither a discoverable canonical specification nor an explicit `noApi` declaration is non-conformant.

**Example (informative).** A BB with two independently versioned surfaces:

```yaml
version: 1
apis:
  - type: openapi
    path: api/citizen/openapi.yaml
  - type: asyncapi
    path: api/events/asyncapi.yaml
```

## 4.6 Functional-requirement traceability <a href="#46-functional-requirement-traceability" id="46-functional-requirement-traceability"></a>

**[M+R]** Every normative functional requirement in `spec/**/*.md` **MUST** use the exact list-item marker `- **<stable-ID>** **REQUIRED|RECOMMENDED|OPTIONAL**: <text>`, with a stable ID unique across the BB. Every BB that declares at least one API **MUST** provide `api/coverage.yaml` with `version: 1`, and its requirement entries **MUST** match that marker-derived ID set exactly: no missing or extra IDs. A repository that uses `noApi: true` under [§4.5](#45-api-surface-inventory) **MUST NOT** contain `api/coverage.yaml`.

Each coverage entry **MUST** select exactly one disposition and only its compatible companion field: `operation` with a non-empty `operations` list; `message` with a non-empty `messages` list; `external` with an HTTP(S) `reference`; `not-applicable` with a non-empty `rationale`; or `planned` with an HTTP(S) `issue`. A disposition-incompatible companion field **MUST NOT** be present. Values in `operations` and `messages` **MUST** be bare operation or message IDs, and those IDs **MUST** be unique across all canonical surfaces declared by the BB. A `planned` disposition records an API gap and **MUST NOT** be interpreted as coverage; the presence of any `planned` entry **MUST** make full conformance fail until the requirement is implemented and its disposition is updated.

A requirement marked **REQUIRED** **MUST NOT** use the `not-applicable` disposition. If it does not belong in the BB contract, the specification **MUST** change its requirement strength or scope through the normal specification review process instead of bypassing it in the coverage file.

**Example (informative).**

```yaml
version: 1
requirements:
  - id: REG-FR-001
    disposition: operation
    operations:
      - createApplication
  - id: REG-FR-002
    disposition: planned
    issue: https://github.com/GovStackWorkingGroup/example/issues/42
```
