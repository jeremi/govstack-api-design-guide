---
description: "Documentation requirements for schemas, examples, and operation descriptions across OpenAPI and AsyncAPI surfaces."
---

# 4. Documentation requirements

{% hint style="info" %}
**Intent.** The spec is read by implementers, not only by tools. Operations and schemas need human-readable prose.

**Applies to:** Universal (OpenAPI and AsyncAPI surfaces).
{% endhint %}

## 4.1 Useful schema descriptions <a href="#41-useful-schema-descriptions" id="41-useful-schema-descriptions"></a>

**[M]** A schema **MUST** have a `description` when its name and structure do not make its semantics clear. Other schemas **SHOULD** have concise descriptions. Filler text added only to satisfy a universal presence check is not useful documentation.

## 4.2 Examples for bodies and enums <a href="#42-examples-for-bodies-and-enums" id="42-examples-for-bodies-and-enums"></a>

**[M+R]** Request and response bodies **SHOULD** have representative examples, especially when conditional fields or multi-step behavior are involved. Every `enum` whose values are not self-explanatory **MUST** document what its values mean; an example alone is insufficient.

## 4.3 No placeholder text <a href="#43-no-placeholder-text" id="43-no-placeholder-text"></a>

**[M+R]** The spec **MUST NOT** contain placeholder text: `TBD`, `Lorem ipsum`, `a, b, c`, content from other BBs with the original BB name still present, or test plans with literal placeholder steps.

## 4.4 Accurate operation descriptions <a href="#44-accurate-operation-descriptions" id="44-accurate-operation-descriptions"></a>

**[R]** Operation `description` **MUST** describe what the operation actually does. (Copy-pasted descriptions that document a different endpoint than the one they sit on are a recurring problem in existing BB specifications.)

## 4.5 API surface inventory <a href="#45-api-surface-inventory" id="45-api-surface-inventory"></a>

**[M+R]** A BB that uses only `api/openapi.yaml`, only `api/asyncapi.yaml`, or both default canonical paths **MAY** omit `api/index.yaml`. If neither default file exists, the BB **MUST** provide `api/index.yaml`. The index **MUST** contain `version: 1` and exactly one of: a non-empty `apis` list, or `noApi: true` together with a non-empty `reason`.

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

## 4.6 Functional-requirement traceability <a href="#46-functional-requirement-traceability" id="46-functional-requirement-traceability"></a>

**[M+R]** Every GovStack requirement in `spec/**/*.md` **MUST** follow the GovStack Requirements Model. Its heading **MUST** use `### #<number> <title> (<level> <mutability> <verification>)`, where level is `REQUIRED`, `RECOMMENDED`, `DRAFT`, or `DEPRECATED`; mutability is `IMMUTABLE`, `EXTENSIBLE`, `REPLACEABLE`, or `INAPPLICABLE`; and verification is `OBSERVABLE` or `AUDITABLE`. The next non-empty line **MUST** contain its canonical `govstack-...#req-<number>` identifier, the two numbers **MUST** match, and body text **MUST** follow any optional `KF:` metadata lines. A child requirement that changes a parent **MUST** identify the parent with `extends` or `replaces` as defined by the GovStack Specification Framework.

Every BB that declares at least one API **MUST** provide `api/coverage.yaml` with `version: 1`. Its requirement entries **MUST** match the active REQUIRED and RECOMMENDED requirement IDs exactly: no missing or extra IDs. DRAFT and DEPRECATED requirements, and requirements classified INAPPLICABLE, are not active coverage obligations. A repository that uses `noApi: true` under [§4.5](#45-api-surface-inventory) **MUST NOT** contain `api/coverage.yaml`.

Each coverage entry **MUST** select exactly one disposition and only its compatible companion field: `operation` with a non-empty `operations` list; `message` with a non-empty `messages` list; `external` with an HTTP(S) `reference`; `non-api` with a non-empty `rationale`; or `planned` with an HTTP(S) `issue`. `non-api` means the active requirement is verified outside the service-interface contract; it is not the Requirements Model's formal `INAPPLICABLE` classifier. A disposition-incompatible companion field **MUST NOT** be present. Values in `operations` and `messages` **MUST** be bare operation or message IDs, and those IDs **MUST** be unique across all canonical surfaces declared by the BB. A `planned` disposition records an API gap and **MUST NOT** be interpreted as coverage; the presence of any `planned` entry **MUST** make full conformance fail until the requirement is implemented and its disposition is updated.

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
