---
description: "Rules governing URL path structure, resource naming, and version placement in the API surface."
---

# 5. URL structure and versioning

{% hint style="info" %}
**Intent.** Paths identify resources consistently, versions are visible, and custom operations have distinct routes.

**Applies to:** OpenAPI surface only (HTTP/REST).
{% endhint %}

## 5.1 Major version in the path <a href="#51-major-version-in-the-path" id="51-major-version-in-the-path"></a>

<!-- rule-class: M -->

A versioned HTTP surface **MUST** expose its major contract version unambiguously. The major version applies to the API contract; independently exposed API surfaces can version separately under [§2.2](../part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint). A recognised protocol standard may use its own version-negotiation mechanism. The standard unversioned endpoints of [§5.10](#510-standard-unversioned-endpoints) do not carry the API major version.

New GovStack resource APIs **SHOULD** place it before the resource hierarchy as `/v{N}/...` (for example, `/v1/policies`). A stable deployment routing prefix can precede this path, as described in [§2.6](../part-a/2-openapi-document-standards.md#26-meaningful-servers-block).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter flags any path that does not start with `/v{N}/`, except the standard unversioned endpoints. A reviewer checks that a surface using another declared version mechanism still exposes its major version unambiguously.
<!-- verification:end -->

## 5.2 Plural noun resources <a href="#52-plural-noun-resources" id="52-plural-noun-resources"></a>

<!-- rule-class: M+R -->

Resource paths **SHOULD** use plural nouns (`/policies`, not `/policy`).

One API can expose several collections, each with its documented resource scope and schemas. HTTP methods can offer different operations on the same resource URI. API families and tags group capabilities without requiring matching URL prefixes; resource names are coordinated within the API's shared path namespace.

<!-- verification:start -->
**Verification:** Heuristic check in the optional strict profile. Semantic review is also required.

The linter flags literal path segments whose last word does not end in "s", skipping the standard unversioned endpoints and the `search` and `lookup` leaves. It misjudges some words, so a reviewer decides whether names are plural nouns.
<!-- verification:end -->

## 5.3 Kebab-case path segments <a href="#53-kebab-case-path-segments" id="53-kebab-case-path-segments"></a>

<!-- rule-class: M -->

Multi-word literal path segments **SHOULD** use kebab-case (`/event-subscriptions`). A surface governed by an external standard keeps that standard's spelling, including the `.well-known` prefix that RFC 8615 fixes.

<!-- verification:start -->
**Verification:** Automated specification check.

The linter flags literal path segments that are not lower-case kebab-case, and flags colon custom methods such as `events:search`. Path parameters, `/v{N}` segments and the standard unversioned endpoints are skipped.
<!-- verification:end -->

## 5.4 Shallow path nesting <a href="#54-shallow-path-nesting" id="54-shallow-path-nesting"></a>

<!-- rule-class: M -->

Path hierarchy **SHOULD** be shallow, with at most two levels of nesting after `/v{N}/`. Deep nesting makes paths hard to read and discourages addressable sub-resources.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter counts literal path segments after `/v{N}/` and flags paths with more than two. Path parameters do not count, nor does a fixed identifier backed by matching Digital Registries collection metadata; a reviewer checks any other literal identifier.
<!-- verification:end -->

## 5.5 Identifiers as path parameters <a href="#55-identifiers-as-path-parameters" id="55-identifiers-as-path-parameters"></a>

<!-- rule-class: M+R -->

Resource identifiers **MUST** be path parameters, not query parameters. (`DELETE /v1/events/{eventId}`, not `DELETE /v1/event?event_id=...`.)

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags query parameters on `GET` and `DELETE` operations named `id` or ending in `Id` or `_id`, so a legitimate filter such as `programId` is also flagged. A reviewer checks that identifiers are path parameters everywhere else.
<!-- verification:end -->

## 5.6 Query parameter naming <a href="#56-query-parameter-naming" id="56-query-parameter-naming"></a>

<!-- rule-class: M -->

Query parameter names **SHOULD** follow the JSON naming convention defined in [§9](../part-c/9-json-conventions-and-naming.md).

<!-- verification:start -->
**Verification:** Automated specification check.

The linter flags query parameter names that are not lower camelCase, on both operations and path items. A reviewer checks any further requirements of the JSON naming chapter beyond casing.
<!-- verification:end -->

## 5.7 No verbs in CRUD paths <a href="#57-no-verbs-in-crud-paths" id="57-no-verbs-in-crud-paths"></a>

<!-- rule-class: M+R -->

Verbs **SHOULD NOT** appear in paths for CRUD operations. (`POST /v1/events`, not `POST /v1/event/new`.)

<!-- verification:start -->
**Verification:** Heuristic check in the optional strict profile. Semantic review is also required.

The linter flags a path whose final segment contains a CRUD-like word such as `create`, `update`, `delete` or `list`. A reviewer decides whether the action is really CRUD or a domain action.
<!-- verification:end -->

## 5.8 Custom operations <a href="#58-actions-as-sub-resources" id="58-actions-as-sub-resources"></a>

<!-- rule-class: R -->

An operation that does not fit a standard CRUD method **MUST** be expressed as an action sub-resource and **MUST NOT** use a colon custom method (a `:verb` suffix on a path segment): `POST /v1/events/{eventId}/cancel` acts on one resource, and `POST /v1/events/search` or `POST /v1/events/lookup` acts on a collection. An action name used on a collection, such as `search` or `lookup`, **MUST NOT** be a valid identifier in that collection: the identifier's documented format excludes it (for example a UUID format, or a schema pattern that rejects the reserved names), or the specification states that the name is reserved.

OpenAPI path templating matches a concrete path before a templated one, so `/v1/events/search` always routes to the action, never to an event whose identifier is `search`. Reserving the action name keeps every event addressable.

Each operation retains the HTTP semantics of [§6](6-http-methods.md). A body-based lookup or search follows [§6.6](6-http-methods.md#66-post-search-for-complex-queries); an action sub-resource does not imply a mutation.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter flags colon custom methods (a `:verb` suffix on a path segment). A reviewer checks that other custom operations are action sub-resources and that action names such as `search` are excluded from the collection's identifier format or declared reserved.
<!-- verification:end -->

## 5.9 Health requirements (CFR reference) <a href="#59-unversioned-health-endpoint" id="59-unversioned-health-endpoint"></a>

For health check requirements, see the Cross-Functional Requirements, [Architecture requirement 15, Observability and monitoring](https://github.com/GovStackWorkingGroup/cfr-architecture/blob/development/spec/6-cross-functional-requirements/6.3-architecture.md#15-observability-and-monitoring-functionality-is-implemented-recommended-extensible-observable), identified as `govstack-cfr-architecture#req-15`. This section is an informative reference.

<!-- verification:start -->
**Verification:** Informative; no conformance check.

This entry points to the Cross-Functional Requirements for health checks and adds no requirement of its own.
<!-- verification:end -->

## 5.10 Standard unversioned endpoints <a href="#510-standard-unversioned-endpoints" id="510-standard-unversioned-endpoints"></a>

<!-- rule-class: M -->

A closed set of endpoints sits outside the versioned business surface, because their location or spelling is fixed by something other than the guide. That set is: well-known URIs under `/.well-known/`, whose location RFC 8615 roots at that exact prefix (for example the RFC 9727 API catalog at `/.well-known/api-catalog`); the operational endpoints `/health` and `/ready` where a BB exposes them (health requirements belong to CFR, see [§5.9](#59-unversioned-health-endpoint)); and a runtime specification-discovery endpoint where a BB serves one, conventionally `/openapi.json` or `/asyncapi.json`. These endpoints are exempt from [§5.1](#51-major-version-in-the-path), [§5.2](#52-plural-noun-resources), [§5.3](#53-kebab-case-path-segments), and the collection rules of [§12](../part-c/12-pagination-filtering-sorting.md), and they satisfy [§13.1](../part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) with an explicit empty security requirement (`security: []`) where they are unauthenticated. A BB **MUST NOT** place a business resource under one of these paths in order to escape the rules above: they are read-only and **MUST NOT** declare `POST`, `PUT`, `PATCH`, or `DELETE`.

No other endpoint **MAY** claim this exemption. A static document that a well-known URI links to, such as a metadata document or a linkset, is published content rather than an operation of the business surface; it **MAY** be served from any stable HTTPS location and does not need to appear in the OpenAPI document.

<!-- verification:start -->
**Verification:** Automated specification check.

The linter flags `POST`, `PUT`, `PATCH` or `DELETE` on the standard unversioned paths, and exempts those paths from the version-prefix and kebab-case checks. A reviewer checks that no business resource is exposed there through `GET`.
<!-- verification:end -->
