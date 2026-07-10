---
description: "Rules governing the canonical OpenAPI document: version, location, validation, metadata, and vendored shared components."
---

# 2. OpenAPI document standards

{% hint style="info" %}
**Intent.** Every OpenAPI surface has exactly one canonical, machine-validatable artifact in a known location or registry. Implementers must not have to choose between divergent copies.

**Applies to:** OpenAPI surface. AsyncAPI document-level rules are in [§3](../part-a/3-asyncapi-document-standards.md).
{% endhint %}

## 2.1 OpenAPI 3.1.0 required <a href="#21-openapi-310-required" id="21-openapi-310-required"></a>

**[M]** The spec **MUST** declare `openapi: 3.1.0`. Earlier versions **MUST NOT** be used.

## 2.2 One canonical OpenAPI entrypoint <a href="#22-one-canonical-openapi-entrypoint" id="22-one-canonical-openapi-entrypoint"></a>

**[M+R]** The canonical OpenAPI entrypoint **MUST** be located at `api/openapi.yaml`, in YAML. (The audit found these files predominantly at `api/swagger.yaml`/`api/swagger.json`; renaming to `api/openapi.yaml` is part of conformance.) It **MAY** `$ref`-compose other files in the repository, provided every reference resolves and there is exactly one entrypoint. A BB with genuinely independent API surfaces that version on independent cadences **MAY** instead ship one canonical file per surface, each at a documented path and all enumerated in `api/index.yaml` (which then serves as the single registry of canonical files). Either way there **MUST** be exactly one canonical artifact per surface and no divergent copies.

## 2.3 No divergent OpenAPI copies <a href="#23-no-divergent-openapi-copies" id="23-no-divergent-openapi-copies"></a>

**[R]** Other locations (`spec/.gitbook/assets/`, alternative filenames, JSON copies) **MUST NOT** contain divergent copies. OpenAPI snippets in markdown documentation **MUST** load by reference from a canonical file, not duplicate it.

## 2.4 Passes openapi-spec-validator <a href="#24-passes-openapi-spec-validator" id="24-passes-openapi-spec-validator"></a>

**[M]** The file **MUST** pass `openapi-spec-validator` against the 3.1.0 schema.

## 2.5 Complete info block <a href="#25-complete-info-block" id="25-complete-info-block"></a>

**[M]** The `info` block of each canonical file **MUST** include `title`, `version` (SemVer), `description`, and `contact`. Where a BB ships per-surface canonical files ([2.2](#22-one-canonical-openapi-entrypoint)), each surface carries its own `info.version` and versions independently.

## 2.6 Meaningful servers block <a href="#26-meaningful-servers-block" id="26-meaningful-servers-block"></a>

**[M+R]** The `servers` block **MUST** be non-empty and **MUST** describe the intended deployment base URL pattern for the API. Reference specifications that are not tied to a live implementation **SHOULD** use parameterised template URLs with documented variables (for example, `https://{gatewayHost}/{bbCode}/v1`). Server URLs **MUST NOT** point to `localhost`, personal developer machines, undocumented placeholders, or fake production domains. Reserved documentation domains (for example, `example.org`) **MAY** be used only as variable defaults or examples, and **MUST** be labelled as non-production.

## 2.7 Complete operation metadata <a href="#27-complete-operation-metadata" id="27-complete-operation-metadata"></a>

**[M+R]** Every operation **MUST** include `operationId` (camelCase, verb-noun), `summary`, `description`, and at least one `tag`.

## 2.8 Pinned vendored common components <a href="#28-pinned-vendored-common-components" id="28-pinned-vendored-common-components"></a>

**[M]** Shared components (security scheme, error schema, pagination, common headers, Operation resource) **MUST** be referenced from a pinned version of `govstack-openapi-common.yaml`. The file **MUST** be vendored locally in each BB repository at the pinned version, and the pinned version **MUST** be explicit.

Vendoring is required because GovStack BBs are deployed in air-gapped or limited-connectivity environments where remote `$ref` resolution is unreliable.
