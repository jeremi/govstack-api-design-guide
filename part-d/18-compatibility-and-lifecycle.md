---
description: "Rules governing SemVer versioning, backward-compatible and breaking changes, deprecation signalling, and lifecycle transitions across OpenAPI and AsyncAPI artifacts."
---

# 18. Compatibility and lifecycle

{% hint style="info" %}
**Intent.** Specs change without breaking implementers.

**Applies to:** Universal. SemVer and breaking-change classification apply to both artifacts; URL path versioning in [18.2](#182-major-version-in-path-or-channel) is OpenAPI-specific, channel/version metadata in [18.2](#182-major-version-in-path-or-channel) is AsyncAPI-specific, and the `Deprecation` and `Sunset` *headers* in [18.5](#185-deprecation-and-sunset-headers) are HTTP-specific. AsyncAPI deprecation is declared through AsyncAPI metadata and message/channel/operation descriptions until a stronger ecosystem convention is selected.
{% endhint %}

## 18.1 SemVer versioning <a href="#181-semver-versioning" id="181-semver-versioning"></a>

**[M]** `info.version` **MUST** follow SemVer.

## 18.2 Major version in path or channel <a href="#182-major-version-in-path-or-channel" id="182-major-version-in-path-or-channel"></a>

**[M]** Major version increments **MUST** be reflected in the OpenAPI URL path (`/v2/`). AsyncAPI channels **MUST** include the major version in the channel address or an equivalent machine-readable version field documented in `govstack-asyncapi-common.yaml`.

## 18.3 Backward-compatible minor changes <a href="#183-backward-compatible-minor-changes" id="183-backward-compatible-minor-changes"></a>

**[M+R]** Minor and patch increments **MUST** be backward-compatible. Adding optional fields, adding endpoints, adding enum values (for fields declared extensibly per [§9.9](../part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets)), and relaxing constraints are non-breaking.

## 18.4 Breaking changes bump major version <a href="#184-breaking-changes-bump-major-version" id="184-breaking-changes-bump-major-version"></a>

**[M+R]** Breaking changes (removing endpoints, removing fields, narrowing types, narrowing enums, tightening required, changing semantic meaning) **MUST** be released as a new major version.

## 18.5 Deprecation and Sunset headers <a href="#185-deprecation-and-sunset-headers" id="185-deprecation-and-sunset-headers"></a>

**[M+R]** Deprecated endpoints **MUST** return a `Deprecation` header per RFC 9745 (a structured-field date carrying the deprecation timestamp, e.g. `Deprecation: @1735689600`) and a `Sunset` header per RFC 8594 indicating planned removal. The minimum deprecation window between announcement and sunset, and the maximum number of concurrent major versions a BB can keep in production, are operational policy and are proposed for the Lifecycle & Governance companion, not here.

## 18.6 Clients ignore unknown fields <a href="#186-clients-ignore-unknown-fields" id="186-clients-ignore-unknown-fields"></a>

(informative) Conforming clients are expected to ignore unknown JSON fields and unknown enum values. This is what makes the additive changes in [18.3](#183-backward-compatible-minor-changes) non-breaking; the design constraint that enables it is in [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas).

## 18.7 AsyncAPI deprecation metadata <a href="#187-asyncapi-deprecation-metadata" id="187-asyncapi-deprecation-metadata"></a>

**[M+R]** AsyncAPI channels, operations, and messages **MUST** declare deprecation in their `description` and, where supported by tooling, with a specification extension `x-govstack-deprecated` containing `since`, `sunset`, `replacement`, and `reason`. [`[OPEN-16-A]`](../appendix/b-open-questions.md)

## Note on retrofitting <a href="#note-on-retrofitting" id="note-on-retrofitting"></a>

Bringing an existing BB into conformance with the JSON conventions ([§9.2](../part-c/9-json-conventions-and-naming.md#92-camelcase-field-names), [§10.x](../part-c/10-data-types-and-formats.md)) or the opaque-identifier rule ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)) changes the wire contract and is therefore a breaking change under [§18.4](#184-breaking-changes-bump-major-version): it **MUST** be released as a new major version. The transition schedule for existing BBs is governance, not design (Lifecycle & Governance companion).
