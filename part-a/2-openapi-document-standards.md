---
description: "Rules governing the canonical OpenAPI document: version, location, validation, metadata, and conditional schema reuse."
---

# 2. OpenAPI document standards

{% hint style="info" %}
**Intent.** Every OpenAPI surface has exactly one canonical, machine-validatable artifact in a known location or registry. Implementers must not have to choose between divergent copies.

**Applies to:** OpenAPI surface. AsyncAPI document-level rules are in [§3](../part-a/3-asyncapi-document-standards.md).
{% endhint %}

## 2.1 OpenAPI 3.1 required <a href="#21-openapi-31-required" id="21-openapi-31-required"></a>

**[M]** The spec **MUST** declare an explicit, published OpenAPI 3.1 patch version qualified by the pinned GovStack ruleset. Guide and ruleset version `0.1.0-draft` qualify `openapi: 3.1.0`, `3.1.1`, and `3.1.2`; tooling **MUST** treat those patches as the same OAS 3.1 feature set. OpenAPI 3.0 and earlier **MUST NOT** be used. A later OpenAPI minor version, including 3.2, **MUST NOT** be used until a GovStack guide and ruleset version explicitly qualifies it.

## 2.2 One canonical OpenAPI entrypoint <a href="#22-one-canonical-openapi-entrypoint" id="22-one-canonical-openapi-entrypoint"></a>

**[M+R]** In the absence of `api/index.yaml`, the canonical OpenAPI entrypoint **MUST** be located at `api/openapi.yaml`, in YAML. It **MAY** `$ref`-compose other repository files provided every reference resolves. A BB with a custom canonical path or multiple independently versioned API surfaces **MUST** enumerate every surface in `api/index.yaml` using [§4.5](../part-a/4-documentation-requirements.md#45-api-surface-inventory). Either discovery form **MUST** identify exactly one canonical artifact per surface. The legacy `api/swagger.yaml` and `api/swagger.json` names still used by some BBs are not canonical under this guide.

## 2.3 No divergent OpenAPI copies <a href="#23-no-divergent-openapi-copies" id="23-no-divergent-openapi-copies"></a>

**[R]** Other locations (`spec/.gitbook/assets/`, alternative filenames, JSON copies) **MUST NOT** contain divergent copies. OpenAPI snippets in markdown documentation **MUST** load by reference from a canonical file, not duplicate it.

An operation-free shared component library under `api/common/` is referenced support material, not a canonical API surface or a divergent copy.

## 2.4 Passes openapi-spec-validator <a href="#24-passes-openapi-spec-validator" id="24-passes-openapi-spec-validator"></a>

**[M]** The canonical entrypoint **MUST** pass `openapi-spec-validator` for its declared OpenAPI 3.1 patch version, with every local reference resolved. Referenced JSON Schema fragments **MUST** validate against their declared dialect but are not required to be standalone OpenAPI documents.

## 2.5 Complete info block <a href="#25-complete-info-block" id="25-complete-info-block"></a>

**[M]** The `info` block of each canonical file **MUST** include `title`, `version` (SemVer), and a useful `description`. It **SHOULD** include `contact`; repository governance may supply the maintainer contact when it does not belong in the API contract. Where a BB ships per-surface canonical files ([2.2](#22-one-canonical-openapi-entrypoint)), each surface carries its own `info.version` and versions independently.

## 2.6 Meaningful servers block <a href="#26-meaningful-servers-block" id="26-meaningful-servers-block"></a>

**[M+R]** The `servers` block **MUST** be non-empty and **MUST** describe the intended deployment base URL pattern for the API. Every non-local server URL **MUST** use `https`. Reference specifications that are not tied to a live implementation **SHOULD** use parameterised template URLs with documented variables (for example, `https://{gatewayHost}/{bbCode}`). Because [§5.1](../part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path) places `/v{N}` in each OpenAPI path key, a server URL **MUST NOT** repeat that version segment. Server URLs **MUST NOT** point to `localhost`, personal developer machines, undocumented placeholders, or fake production domains. Reserved documentation domains (for example, `example.org`) **MAY** be used only as variable defaults or examples and **MUST** be labelled as non-production.

## 2.7 Complete operation metadata <a href="#27-complete-operation-metadata" id="27-complete-operation-metadata"></a>

**[M+R]** Every operation **MUST** include a stable, non-empty `operationId` and an accurate `description`. An `operationId` **SHOULD** use a readable camelCase verb-noun form. A concise `summary` and at least one useful `tag` **SHOULD** be present when they improve navigation or generated documentation.

## 2.8 Conditional vendored OpenAPI schemas <a href="#28-conditional-vendored-openapi-schemas" id="28-conditional-vendored-openapi-schemas"></a>

**[M+R]** A BB **MAY** reuse the schema-only `govstack-openapi-common.yaml` artifact for `Problem`, `ValidationProblem`, `FieldError`, and `PageInfo`. If it does, the file **MUST** be vendored locally at `api/common/govstack-openapi-common.yaml`, its version **MUST** be pinned explicitly, and the BB **MUST** reference the named schemas rather than copy them. A BB that does not reuse the artifact **MUST** define equivalent schemas locally that satisfy [§11](../part-c/11-errors.md) and [§12](../part-c/12-pagination-filtering-sorting.md).

Security schemes, parameters, headers, Response Objects, examples, and Operation resources **MUST** be defined locally because their values and semantics belong to the BB contract. They are not part of the shared OpenAPI artifact.

Vendoring is required when reuse is chosen because GovStack BBs are deployed in air-gapped or limited-connectivity environments where remote `$ref` resolution is unreliable.
