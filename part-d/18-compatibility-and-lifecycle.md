---
description: "Rules governing SemVer versioning, backward-compatible and breaking changes, deprecation signalling, and lifecycle transitions across OpenAPI and AsyncAPI artifacts."
---

# 18. Compatibility and lifecycle

{% hint style="info" %}
**Intent.** Specs change without breaking implementers.

**Applies to:** Universal. SemVer and breaking-change classification apply to both artifacts; URL path versioning in [18.2](#182-major-version-in-path-or-channel) is OpenAPI-specific, channel/version metadata in [18.2](#182-major-version-in-path-or-channel) is AsyncAPI-specific, and the `Deprecation` and `Sunset` *headers* in [18.5](#185-deprecation-and-sunset-headers) are HTTP-specific. AsyncAPI deprecation is declared through AsyncAPI metadata and message/channel/operation descriptions until a stronger ecosystem convention is selected.
{% endhint %}

## 18.1 SemVer versioning <a href="#181-semver-versioning" id="181-semver-versioning"></a>

**[M]** `info.version` **MUST** follow SemVer and identify the version of that surface's published contract, not the implementation version. When a surface also exposes a major version in a path, channel, or protocol field, the two **MUST** agree. An implementation may therefore be at `0.16.3` while the contract it serves is at `1.4.0`.

## 18.2 Major version in path or channel <a href="#182-major-version-in-path-or-channel" id="182-major-version-in-path-or-channel"></a>

**[M]** A major version increment **MUST** be visible in the canonical contract through the surface's declared versioning mechanism. Protocol-native addresses **MUST NOT** be rewritten solely to carry a guide-specific version shape.

New GovStack OpenAPI surfaces **SHOULD** carry the major version in each versioned path key (`/v2/`) rather than duplicating it in `servers`. New AsyncAPI surfaces **SHOULD** carry it in the logical channel ID defined by [§17.2](../part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses).

## 18.3 Backward-compatible minor changes <a href="#183-backward-compatible-minor-changes" id="183-backward-compatible-minor-changes"></a>

**[M+R]** Compatibility **MUST** be evaluated as an existing client communicating with a newer server, separately for input and output. A patch increment **MUST** be limited to a backward-compatible correction that does not add public functionality. For messaging, the same test **MUST** be applied from publisher to existing consumer for sent messages and from existing publisher to consumer for received messages. Additive syntax **MUST NOT** be called compatible when it changes defaults, pagination boundaries, ordering, authorization, delivery guarantees, or other observable semantics.

A minor increment **MAY** add an endpoint; add an optional request field whose absence preserves the old behaviour; broaden values accepted in a request; or add a response field that conforming clients ignore under [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas). A response enum value **MAY** be added only when the field was declared extensibly under [§9.9](../part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets).

## 18.4 Breaking changes bump major version <a href="#184-breaking-changes-bump-major-version" id="184-breaking-changes-bump-major-version"></a>

**[M+R]** A breaking change **MUST** be released as a new major version. Breaking changes include removing or renaming an endpoint, operation, message, field, or enum value; adding a required request field; rejecting a previously accepted request; widening the type, length, format, or closed-enum values a server may emit beyond the old response schema; ceasing to emit a required response field; changing a success status, media type, default, identifier construction, field presence, pagination or sort behaviour, error-code meaning, idempotency behaviour, security requirement or scope, event meaning, delivery guarantee, or ordering guarantee. Moving a contract component in a way that breaks generated-client references **MUST** also be treated as breaking even when the serialized wire shape is unchanged.

## 18.5 Deprecation and Sunset headers <a href="#185-deprecation-and-sunset-headers" id="185-deprecation-and-sunset-headers"></a>

**[M+R]** Deprecated HTTP endpoints **MUST** return a `Deprecation` header per RFC 9745 (a Structured Field date carrying the deprecation timestamp, for example `Deprecation: @1735689600`) and a `Link` with relation `deprecation` pointing to migration documentation. When removal is planned, they **MUST** additionally return a `Sunset` header per RFC 8594; its timestamp **MUST NOT** precede the deprecation timestamp. The GovStack governance process owns the minimum deprecation window and maximum number of concurrent major versions.

## 18.6 Clients ignore unknown fields <a href="#186-clients-ignore-unknown-fields" id="186-clients-ignore-unknown-fields"></a>

(informative) Conforming clients are expected to ignore unknown JSON fields and unknown enum values. This is what makes the additive changes in [18.3](#183-backward-compatible-minor-changes) non-breaking; the design constraint that enables it is in [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas).

## 18.7 AsyncAPI deprecation metadata <a href="#187-asyncapi-deprecation-metadata" id="187-asyncapi-deprecation-metadata"></a>

**[M+R]** Deprecated AsyncAPI channels, operations, and messages **MUST** declare consumer-visible deprecation and replacement guidance in their `description`.

They **MAY** also use the experimental `x-govstack-deprecated` extension with `since`, `sunset`, `replacement`, and `reason` where supported by tooling.

## Note on retrofitting <a href="#note-on-retrofitting" id="note-on-retrofitting"></a>

Bringing an existing BB into conformance with the JSON conventions ([§9.2](../part-c/9-json-conventions-and-naming.md#92-camelcase-field-names), [§10.x](../part-c/10-data-types-and-formats.md)) or the opaque-identifier rule ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)) changes the wire contract and is therefore a breaking change under [§18.4](#184-breaking-changes-bump-major-version): it **MUST** be released as a new major version. The transition schedule for existing BBs is governance, not design.
