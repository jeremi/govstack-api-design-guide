---
description: "Rules governing SemVer versioning, backward-compatible and breaking changes, deprecation signalling, and lifecycle transitions across OpenAPI and AsyncAPI artifacts."
---

# 18. Compatibility and lifecycle

{% hint style="info" %}
**Intent.** Specs change without breaking implementers.

**Applies to:** Universal. SemVer and breaking-change classification apply to both artifacts; URL path versioning in [18.2](#182-major-version-in-path-or-channel) is OpenAPI-specific, channel/version metadata in [18.2](#182-major-version-in-path-or-channel) is AsyncAPI-specific, and the `Deprecation` and `Sunset` *headers* in [18.5](#185-deprecation-and-sunset-headers) are HTTP-specific. AsyncAPI deprecation is declared through AsyncAPI metadata and message/channel/operation descriptions until a stronger ecosystem convention is selected.
{% endhint %}

## 18.1 SemVer versioning <a href="#181-semver-versioning" id="181-semver-versioning"></a>

**[M]** `info.version` **MUST** follow SemVer. As a GovStack convention, it is the version of that surface's published API contract and its canonical description together; the major component **MUST** match the major version exposed under [§18.2](#182-major-version-in-path-or-channel).

## 18.2 Major version in path or channel <a href="#182-major-version-in-path-or-channel" id="182-major-version-in-path-or-channel"></a>

**[M]** A major version increment **MUST** be reflected in every OpenAPI path key (`/v2/`) and **MUST NOT** be duplicated in the OpenAPI `servers` URL. On AsyncAPI, the major version **MUST** appear in the logical channel ID defined by [§17.2](../part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses) or in an equivalent machine-readable version field defined by `govstack-asyncapi-common.yaml`; protocol-native channel addresses **MUST NOT** be rewritten solely to carry it.

## 18.3 Backward-compatible minor changes <a href="#183-backward-compatible-minor-changes" id="183-backward-compatible-minor-changes"></a>

**[M+R]** Compatibility **MUST** be evaluated as an existing client communicating with a newer server, separately for input and output. A patch increment **MUST** be limited to a backward-compatible correction that does not add public functionality. A minor increment **MAY** add an endpoint; add an optional request field whose absence preserves the old behaviour; broaden values accepted in a request; or add a response field that conforming clients ignore under [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas). A response enum value **MAY** be added only when the field was declared extensibly under [§9.9](../part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets). For messaging, the same test **MUST** be applied from publisher to existing consumer for sent messages and from existing publisher to consumer for received messages. Additive syntax **MUST NOT** be called compatible when it changes defaults, pagination boundaries, ordering, authorization, delivery guarantees, or other observable semantics.

## 18.4 Breaking changes bump major version <a href="#184-breaking-changes-bump-major-version" id="184-breaking-changes-bump-major-version"></a>

**[M+R]** A breaking change **MUST** be released as a new major version. Breaking changes include removing or renaming an endpoint, operation, message, field, or enum value; adding a required request field; rejecting a previously accepted request; widening the type, length, format, or closed-enum values a server may emit beyond the old response schema; ceasing to emit a required response field; changing a success status, media type, default, identifier construction, field presence, pagination or sort behaviour, error-code meaning, idempotency behaviour, security requirement or scope, event meaning, delivery guarantee, or ordering guarantee. Moving a contract component in a way that breaks generated-client references **MUST** also be treated as breaking even when the serialized wire shape is unchanged.

## 18.5 Deprecation and Sunset headers <a href="#185-deprecation-and-sunset-headers" id="185-deprecation-and-sunset-headers"></a>

**[M+R]** Deprecated HTTP endpoints **MUST** return a `Deprecation` header per RFC 9745 (a Structured Field date carrying the deprecation timestamp, for example `Deprecation: @1735689600`) and a `Link` with relation `deprecation` pointing to migration documentation. When removal is planned, they **MUST** additionally return a `Sunset` header per RFC 8594; its timestamp **MUST NOT** precede the deprecation timestamp. The minimum deprecation window and maximum concurrent major versions remain policy for the Lifecycle & Governance companion.

## 18.6 Clients ignore unknown fields <a href="#186-clients-ignore-unknown-fields" id="186-clients-ignore-unknown-fields"></a>

(informative) Conforming clients are expected to ignore unknown JSON fields and unknown enum values. This is what makes the additive changes in [18.3](#183-backward-compatible-minor-changes) non-breaking; the design constraint that enables it is in [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas).

## 18.7 AsyncAPI deprecation metadata <a href="#187-asyncapi-deprecation-metadata" id="187-asyncapi-deprecation-metadata"></a>

**[M+R]** AsyncAPI channels, operations, and messages **MUST** declare deprecation in their `description` and, where supported by tooling, with a specification extension `x-govstack-deprecated` containing `since`, `sunset`, `replacement`, and `reason`. [`[OPEN-16-A]`](../appendix/b-open-questions.md)

## Note on retrofitting <a href="#note-on-retrofitting" id="note-on-retrofitting"></a>

Bringing an existing BB into conformance with the JSON conventions ([§9.2](../part-c/9-json-conventions-and-naming.md#92-camelcase-field-names), [§10.x](../part-c/10-data-types-and-formats.md)) or the opaque-identifier rule ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)) changes the wire contract and is therefore a breaking change under [§18.4](#184-breaking-changes-bump-major-version): it **MUST** be released as a new major version. The transition schedule for existing BBs is governance, not design (Lifecycle & Governance companion).
