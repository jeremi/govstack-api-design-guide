---
description: "Documentation requirements for schemas, examples, and operation descriptions across OpenAPI and AsyncAPI surfaces."
---

# 4. Documentation requirements

{% hint style="info" %}
**Intent.** The spec is read by implementers, not only by tools. Operations and schemas need human-readable prose.

**Applies to:** Universal (OpenAPI and AsyncAPI surfaces).
{% endhint %}

## 4.1 Useful schema descriptions <a href="#41-useful-schema-descriptions" id="41-useful-schema-descriptions"></a>

<!-- rule-class: M -->

A schema **MUST** have a `description` when its name and structure do not make its semantics clear.

Other schemas **SHOULD** have concise descriptions. Filler text added only to satisfy a universal presence check is not useful documentation.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter warns about every schema without a description, in component schemas, request and response bodies and message payloads, except wrappers made only of combinators. A reviewer judges which schemas really need one and whether the text is useful.
<!-- verification:end -->

## 4.2 Examples for bodies and enums <a href="#42-examples-for-bodies-and-enums" id="42-examples-for-bodies-and-enums"></a>

<!-- rule-class: M+R -->

Every `enum` whose values are not self-explanatory **MUST** document what its values mean; an example alone is insufficient.

Request and response bodies **SHOULD** have representative examples, especially when conditional fields or multi-step behavior are involved.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns about request and response bodies and AsyncAPI messages without an example, and about enums without a description. A reviewer checks that the description explains what each value means, and judges whether the values are self-explanatory.
<!-- verification:end -->

## 4.3 No placeholder text <a href="#43-no-placeholder-text" id="43-no-placeholder-text"></a>

<!-- rule-class: M+R -->

The spec **MUST NOT** contain placeholder text: `TBD`, `Lorem ipsum`, `a, b, c`, content from other BBs with the original BB name still present, or test plans with literal placeholder steps.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when any text in the document contains `TBD`, `Lorem ipsum` or the list `a, b, c`. A reviewer checks for content copied from another BB and for test plans with placeholder steps.
<!-- verification:end -->

## 4.4 Accurate operation descriptions <a href="#44-accurate-operation-descriptions" id="44-accurate-operation-descriptions"></a>

<!-- rule-class: R -->

Operation `description` **MUST** describe what the operation actually does. (Copy-pasted descriptions that document a different endpoint than the one they sit on are a recurring problem in existing BB specifications.)

<!-- verification:start -->
**Verification:** Heuristic check in the optional strict profile.

The linter warns when two operations share an identical description. A reviewer checks that each description matches what its operation does.
<!-- verification:end -->

## 4.5 API surface inventory <a href="#45-api-surface-inventory" id="45-api-surface-inventory"></a>

<!-- rule-class: M+R -->

If neither default file exists, the BB **MUST** provide `api/index.yaml`. The index **MUST** contain `version: 1` and exactly one of: a non-empty `apis` list, or `noApi: true` together with a non-empty `reason`.

A BB that uses only `api/openapi.yaml`, only `api/asyncapi.yaml`, or both default canonical paths **MAY** omit `api/index.yaml`.

An OpenAPI or AsyncAPI entry **MUST** contain `type` (`openapi` or `asyncapi`) and `path` (a unique, repository-relative YAML path inside `api/`), and every listed path **MUST** resolve to a canonical specification of the declared type. A surface governed directly by a recognised protocol standard **MAY** instead use `type: standard` with a non-empty `name`, an absolute HTTPS `reference` to its normative specification or profile, and an optional `discovery` value naming its standard discovery endpoint. For example, an OpenID Connect provider can point to the OIDC specification and `/.well-known/openid-configuration`; it does not need a synthetic OpenAPI description of standard protocol endpoints.

The `standard` inventory form is provisional while CFR issue [#7](https://github.com/GovStackWorkingGroup/cfr-architecture/issues/7) is under review. Until GovStack approves a registry or profile for recognised standards and their evidence, these entries **MAY** be used during advisory review but **MUST NOT** produce a passing conformance result. An arbitrary HTTPS reference is not proof that a surface implements the named standard.

`apis` and `noApi` **MUST NOT** coexist. `noApi: true` means that the BB exposes no service interface at all; it **MUST NOT** be used to mean only that no OpenAPI or AsyncAPI file exists. A repository with neither a discoverable contract nor an explicit `noApi` declaration is non-conformant.

**Example (informative).** A BB with two independently versioned surfaces:

```yaml
version: 1
apis:
  - type: openapi
    path: api/citizen/openapi.yaml
  - type: asyncapi
    path: api/events/asyncapi.yaml
```

**Example (informative).** A standards-defined interface:

```yaml
version: 1
apis:
  - type: standard
    name: OpenID Connect
    reference: https://openid.net/specs/openid-connect-core-1_0.html
    discovery: /.well-known/openid-configuration
```

<!-- verification:start -->
**Verification:** Automated repository or validator checks. Semantic review is also required.

The linter checks `api/index.yaml` for `version: 1`, exactly one of `apis` or `noApi: true` with a reason, valid entries with unique YAML paths under `api/` that resolve to the declared type, and fails conformance for `standard` entries. It reports a missing declaration in conformance mode.
<!-- verification:end -->

## 4.6 Functional-requirement traceability <a href="#46-functional-requirement-traceability" id="46-functional-requirement-traceability"></a>

<!-- rule-class: M+R -->

Every GovStack requirement in `spec/**/*.md` **MUST** follow the GovStack Requirements Model. Its heading **MUST** use `### #<number> <title> (<level> <mutability> <verification>)`, where level is `REQUIRED`, `RECOMMENDED`, `DRAFT`, or `DEPRECATED`; mutability is `IMMUTABLE`, `EXTENSIBLE`, `REPLACEABLE`, or `INAPPLICABLE`; and verification is `OBSERVABLE` or `AUDITABLE`. The next non-empty line **MUST** contain its canonical `govstack-...#req-<number>` identifier, the two numbers **MUST** match, and body text **MUST** follow any optional `KF:` metadata lines. A child requirement that changes a parent **MUST** identify the parent with `extends` or `replaces` as defined by the GovStack Specification Framework.

Every BB that declares at least one API **MUST** provide `api/coverage.yaml` with `version: 1`. Its `requirements` array **MUST** match the active REQUIRED and RECOMMENDED requirement IDs exactly: no missing or extra IDs. This array is empty when there are no active requirements; validating an API contract does not require promoting DRAFT requirements. DRAFT is a level, not a strength, so a DRAFT requirement's body states the level it is intended to take when promoted and readers treat its RFC 2119 keywords as that intended obligation. DRAFT and DEPRECATED requirements, and requirements classified INAPPLICABLE, are not active coverage obligations. A repository that uses `noApi: true` under [§4.5](#45-api-surface-inventory) **MUST NOT** contain `api/coverage.yaml`.

A BB **MAY** include a separate `draftRequirements` array for design traceability. Its entries use the same disposition and reference rules below, with IDs drawn only from applicable DRAFT requirements. This draft list can cover a subset of the draft requirements and does not satisfy an active coverage obligation. Validation reports that these are draft mappings; a successful artifact check does not establish requirement maturity, deployed implementation conformance, or Building Block certification.

Each coverage entry **MUST** select exactly one disposition and only its compatible companion field: `operation` with a non-empty `operations` list; `message` with a non-empty `messages` list; `external` with an HTTP(S) `reference`; `non-api` with a non-empty `rationale`; or `planned` with an HTTP(S) `issue`. `non-api` means the requirement is verified outside the service-interface contract; it is not the Requirements Model's formal `INAPPLICABLE` classifier. A disposition-incompatible companion field **MUST NOT** be present. Values in `operations` and `messages` **MUST** be bare operation or message IDs, and those IDs **MUST** be unique across all canonical surfaces declared by the BB. A `planned` disposition records an API gap and **MUST NOT** be interpreted as coverage; the presence of any `planned` entry in the active `requirements` array **MUST** make full conformance fail until the requirement is implemented and its disposition is updated. Planned work in `draftRequirements` is reported as a draft gap and does not block validation of the current API artifacts.

A REQUIRED requirement **MAY** use `non-api` when it remains applicable but its evidence lives outside the service-interface contract, for example in an audit procedure or policy artifact. The rationale **MUST** identify that verification boundary. `non-api` is traceability, not a waiver and not an `INAPPLICABLE` classification.

**Example (informative).**

```yaml
version: 1
requirements:
  - id: "govstack-bb-registration-fr#req-1"
    disposition: operation
    operations:
      - createApplication
  - id: "govstack-bb-registration-fr#req-2"
    disposition: planned
    issue: https://github.com/GovStackWorkingGroup/example/issues/42
```

**Example (informative).** A specification whose requirements remain DRAFT:

```yaml
version: 1
requirements: []
draftRequirements:
  - id: "govstack-bb-registration-fr#req-1"
    disposition: operation
    operations:
      - retrieveApplication
```

<!-- verification:start -->
**Verification:** Automated repository or validator checks. Semantic review is also required.

The linter checks requirement headings and identifiers under `spec/`, then that `api/coverage.yaml` lists each active requirement once with a valid disposition and existing operation or message IDs, and flags planned entries. A reviewer checks the dispositions are truthful and `non-api` rationales name the verification boundary.
<!-- verification:end -->

## 4.7 Operation metadata extensions <a href="#47-operation-metadata-extensions" id="47-operation-metadata-extensions"></a>

<!-- rule-class: M+R -->

When present on an OpenAPI operation or an AsyncAPI operation or message, `x-govstack-use-case` **MUST** be a string or a non-empty array of strings, each a GovStack use-case or requirement identifier (for example `UC-C-PIC-A-001`, or a `govstack-...#req-<number>` identifier as used in [§4.6](#46-functional-requirement-traceability)), and `x-govstack-pii` **MUST** be a boolean whose value `true` states that the operation's request or response carries personal data as defined in [§8.6](../part-b/8-headers.md#86-no-personal-data-in-addressable-locations). An operation marked `x-govstack-pii: true` **MUST NOT** declare an API key security scheme ([§13.6](../part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints)).

An operation **MAY** declare either extension. For new surfaces, these names replace the ad hoc extensions seen in existing BB specifications (`x-specification-usecase`, `x-specification-scenario`, `x-specification-pii-or-sensitive`). The linter uses `x-govstack-pii` to sharpen its [§13.6](../part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) check. The `x-govstack-` prefix is governed by [§9.10](../part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix).

**Example (informative).**

```yaml
paths:
  /v1/applications/{applicationId}:
    get:
      operationId: retrieveApplication
      x-govstack-use-case:
        - UC-C-PIC-A-001
        - "govstack-bb-registration-fr#req-2"
      x-govstack-pii: true
      security:
        - oauth2: [bb:registration:application:read]
```

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

The linter flags an `x-govstack-use-case` that is not a non-empty string or array of non-empty strings, an `x-govstack-pii` that is not a boolean, and an OpenAPI operation marked personal data that uses an API key. A reviewer checks the identifiers and the pii marker.
<!-- verification:end -->
