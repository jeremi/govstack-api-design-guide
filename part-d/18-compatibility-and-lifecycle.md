---
description: "Rules governing SemVer versioning, backward-compatible and breaking changes, deprecation signalling, and lifecycle transitions across OpenAPI and AsyncAPI artifacts."
---

# 18. Compatibility and lifecycle

{% hint style="info" %}
**Intent.** Specs change without breaking implementers.

**Applies to:** Universal. SemVer and breaking-change classification apply to both artifacts; URL path versioning in [18.2](#182-major-version-in-path-or-channel) is OpenAPI-specific, channel/version metadata in [18.2](#182-major-version-in-path-or-channel) is AsyncAPI-specific, and the `Deprecation` and `Sunset` *headers* in [18.5](#185-deprecation-and-sunset-headers) are HTTP-specific. AsyncAPI deprecation is declared through AsyncAPI metadata and message/channel/operation descriptions until a stronger ecosystem convention is selected.
{% endhint %}

## 18.1 SemVer versioning <a href="#181-semver-versioning" id="181-semver-versioning"></a>

<!-- rule-class: M -->

`info.version` **MUST** follow SemVer and identify the version of that surface's published contract, not the implementation version. When a surface also exposes a major version in a path, channel, or protocol field, the two **MUST** agree. An implementation may therefore be at `0.16.3` while the contract it serves is at `1.4.0`.

The GovStack Specification Framework (CFR §5.2.2) versions the specification document that contains a BB's requirements. In the guide, that document version is independent from `info.version`, which versions the API contract. A specification release **SHOULD** record which `info.version` of each surface it ships with, for example in `api/index.yaml` or in the release notes, so that readers can relate the two numbers.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

proxy: info.version matches SemVer; whether it identifies the contract rather than the implementation and agrees with a nonstandard version mechanism requires context
<!-- verification:end -->

## 18.2 Major version in path or channel <a href="#182-major-version-in-path-or-channel" id="182-major-version-in-path-or-channel"></a>

<!-- rule-class: M -->

A major version increment **MUST** be visible in the canonical contract through the surface's declared versioning mechanism. Protocol-native addresses **MUST NOT** be rewritten solely to carry a guide-specific version shape.

New GovStack OpenAPI surfaces **SHOULD** carry the major version in each versioned path key (`/v2/`) rather than duplicating it in `servers`. New AsyncAPI surfaces **SHOULD** carry it in the logical channel ID defined by [§17.2](../part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

advisory proxy: checks recommended OpenAPI path and AsyncAPI channel forms; does not prove that another declared mechanism exposes the major version unambiguously
<!-- verification:end -->

## 18.3 Backward-compatible minor changes <a href="#183-backward-compatible-minor-changes" id="183-backward-compatible-minor-changes"></a>

<!-- rule-class: M+R -->

Compatibility **MUST** be evaluated as an existing client communicating with a newer server, separately for input and output. A patch increment **MUST** be limited to a backward-compatible correction that does not add public functionality. For messaging, the same test **MUST** be applied from publisher to existing consumer for sent messages and from existing publisher to consumer for received messages. Additive syntax **MUST NOT** be called compatible when it changes defaults, pagination boundaries, ordering, authorization, delivery guarantees, or other observable semantics.

A minor increment **MAY** add an endpoint; add an optional request field whose absence preserves the old behaviour; broaden values accepted in a request; or add a response field that conforming clients ignore under [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas). A response enum value **MAY** be added only when the field was declared extensibly under [§9.9](../part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets).

<!-- verification:start -->
**Verification:** Additional context required for verification. Semantic review is also required.

backward-compat of minor bump - needs PREVIOUS spec version (oasdiff, out of scope)
<!-- verification:end -->

## 18.4 Breaking changes bump major version <a href="#184-breaking-changes-bump-major-version" id="184-breaking-changes-bump-major-version"></a>

<!-- rule-class: M+R -->

A breaking change **MUST** be released as a new major version. Breaking changes include removing or renaming an endpoint, operation, message, field, or enum value; adding a required request field; rejecting a previously accepted request; widening the type, length, format, or closed-enum values a server may emit beyond the old response schema; ceasing to emit a required response field; changing a success status, media type, default, identifier construction, field presence, pagination or sort behaviour, error-code meaning, idempotency behaviour, security requirement or scope, event meaning, delivery guarantee, or ordering guarantee. Moving a contract component in a way that breaks generated-client references **MUST** also be treated as breaking even when the serialized wire shape is unchanged.

<!-- verification:start -->
**Verification:** Additional context required for verification. Semantic review is also required.

breaking change => major bump - needs PREVIOUS spec version (oasdiff, out of scope)
<!-- verification:end -->

## 18.5 Deprecation and Sunset headers <a href="#185-deprecation-and-sunset-headers" id="185-deprecation-and-sunset-headers"></a>

<!-- rule-class: M+R -->

Deprecated HTTP endpoints **MUST** return a `Deprecation` header per RFC 9745 (a Structured Field date carrying the deprecation timestamp, for example `Deprecation: @1735689600`) and a `Link` with relation `deprecation` pointing to migration documentation. When removal is planned, they **MUST** additionally return a `Sunset` header per RFC 8594; its timestamp **MUST NOT** precede the deprecation timestamp. The GovStack governance process owns the minimum deprecation window and maximum number of concurrent major versions.

An incompatible security correction still follows [§18.4](#184-breaking-changes-bump-major-version). When continued operation presents an unacceptable security risk, the responsible authority determines whether immediate retirement is justified under GovStack governance; the guide sets no requirement to keep an unsafe endpoint running until a replacement major exists. Retirement calls for direct notification to affected operators and migration guidance, with the headers above where the old endpoint still responds. Those headers do not replace operational communication.

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

deprecated operations declare Deprecation + Sunset response headers
<!-- verification:end -->

## 18.6 Clients ignore unknown fields <a href="#186-clients-ignore-unknown-fields" id="186-clients-ignore-unknown-fields"></a>

(informative) Conforming clients are expected to ignore unknown JSON fields and unknown enum values. This is what makes the additive changes in [18.3](#183-backward-compatible-minor-changes) non-breaking; the design constraint that enables it is in [§9.8](../part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas).

<!-- verification:start -->
**Verification:** Informative; no conformance check.

informative
<!-- verification:end -->

## 18.7 AsyncAPI deprecation metadata <a href="#187-asyncapi-deprecation-metadata" id="187-asyncapi-deprecation-metadata"></a>

<!-- rule-class: M+R -->

Deprecated AsyncAPI channels, operations, and messages **MUST** declare consumer-visible deprecation and replacement guidance in their `description`.

They **MAY** also use the experimental `x-govstack-deprecated` extension with `since`, `sunset`, `replacement`, and `reason` where supported by tooling.

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

validate x-govstack-deprecated shape (since/sunset/replacement/reason) + description
<!-- verification:end -->

## Note on retrofitting <a href="#note-on-retrofitting" id="note-on-retrofitting"></a>

Bringing an existing BB into conformance with the JSON conventions ([§9.2](../part-c/9-json-conventions-and-naming.md#92-camelcase-field-names), [§10.x](../part-c/10-data-types-and-formats.md)) or the opaque-identifier rule ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)) changes the wire contract and is therefore a breaking change under [§18.4](#184-breaking-changes-bump-major-version): it **MUST** be released as a new major version. The transition schedule for existing BBs is governance, not design.
