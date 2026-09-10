---
description: "Rules governing URL path structure, resource naming, and version placement in the API surface."
---

# 5. URL structure and versioning

{% hint style="info" %}
**Intent.** Paths identify resources consistently, versions are visible, and custom operations have distinct routes.

**Applies to:** OpenAPI surface only (HTTP/REST).
{% endhint %}

## 5.1 Major version in the path <a href="#51-major-version-in-the-path" id="51-major-version-in-the-path"></a>

**[M]** A versioned HTTP surface **MUST** expose its major contract version unambiguously. The major version applies to the API contract; independently exposed API surfaces can version separately under [§2.2](../part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint). A recognised protocol standard may use its own version-negotiation mechanism. The standard unversioned endpoints of [§5.10](#510-standard-unversioned-endpoints) do not carry the API major version.

New GovStack resource APIs **SHOULD** place it before the resource hierarchy as `/v{N}/...` (for example, `/v1/policies`). A stable deployment routing prefix can precede this path, as described in [§2.6](../part-a/2-openapi-document-standards.md#26-meaningful-servers-block).

## 5.2 Plural noun resources <a href="#52-plural-noun-resources" id="52-plural-noun-resources"></a>

**[M+R]** Resource paths **SHOULD** use plural nouns (`/policies`, not `/policy`).

One API can expose several collections, each with its documented resource scope and schemas. HTTP methods can offer different operations on the same resource URI. API families and tags group capabilities without requiring matching URL prefixes; resource names are coordinated within the API's shared path namespace.

## 5.3 Kebab-case path segments <a href="#53-kebab-case-path-segments" id="53-kebab-case-path-segments"></a>

**[M]** Multi-word literal path segments **SHOULD** use kebab-case (`/event-subscriptions`). A colon custom-method suffix under [§5.8](#58-actions-as-sub-resources) **SHOULD** use camelCase, for example `/event-subscriptions/{subscriptionId}:rotateSecret`. A surface governed by an external standard keeps that standard's spelling, including the `.well-known` prefix that RFC 8615 fixes.

## 5.4 Shallow path nesting <a href="#54-shallow-path-nesting" id="54-shallow-path-nesting"></a>

**[M]** Path hierarchy **SHOULD** be shallow, with at most two levels of nesting after `/v{N}/`. Deep nesting makes paths hard to read and discourages addressable sub-resources.

A colon custom-method suffix names an operation on the preceding resource or collection and adds no hierarchy level.

## 5.5 Identifiers as path parameters <a href="#55-identifiers-as-path-parameters" id="55-identifiers-as-path-parameters"></a>

**[M+R]** Resource identifiers **MUST** be path parameters, not query parameters. (`DELETE /v1/events/{eventId}`, not `DELETE /v1/event?event_id=...`.)

## 5.6 Query parameter naming <a href="#56-query-parameter-naming" id="56-query-parameter-naming"></a>

**[M]** Query parameter names **SHOULD** follow the JSON naming convention defined in [§9](../part-c/9-json-conventions-and-naming.md).

## 5.7 No verbs in CRUD paths <a href="#57-no-verbs-in-crud-paths" id="57-no-verbs-in-crud-paths"></a>

**[M+R]** Verbs **SHOULD NOT** appear in paths for CRUD operations. (`POST /v1/events`, not `POST /v1/event/new`.)

## 5.8 Custom operations <a href="#58-actions-as-sub-resources" id="58-actions-as-sub-resources"></a>

**[R]** A BB specification **SHOULD** choose a consistent convention and keep custom-operation routes distinct from valid resource paths.

Operations that do not fit standard CRUD methods **MAY** use an action sub-resource, such as `POST /v1/events/{eventId}/cancel`, or a colon custom method, such as `POST /v1/events/{eventId}:cancel` or `POST /v1/events:search`. The colon convention follows [Google AIP-136](https://google.aip.dev/136); it separates the custom method name from the resource name. For example, `/v1/events:search` can coexist with `/v1/events/{eventId}` when an event's identifier is `search`.

Each operation retains the HTTP semantics of [§6](6-http-methods.md). A body-based lookup or search follows [§6.6](6-http-methods.md#66-post-search-for-complex-queries); using a custom method does not imply a mutation.

## 5.9 Unversioned health endpoint <a href="#59-unversioned-health-endpoint" id="59-unversioned-health-endpoint"></a>

**[M+R]** Each BB **MUST** expose an unversioned operational liveness endpoint at `/health`. Health is carried by the HTTP status: `200` when the service is healthy and able to accept work, `503` when it is temporarily unable to. A consumer **MUST** determine health from the status code; response body fields are informational and **MUST NOT** be required for that determination. The `200` response **MUST** use media type `application/json`; the `503` is an error response and carries the problem envelope of [§11.1](../part-c/11-errors.md#111-rfc-9457-problem-details) like any other. The endpoint **MUST** be cheap and bounded, **MUST NOT** carry citizen authentication, and **MUST NOT** expose system-internal detail such as hostnames, versions, stack traces, or dependency topology. It **MUST NOT** probe an external dependency unless that dependency genuinely determines whether the service can accept work.

The `200` response **SHOULD** be minimal. A separate `/ready` endpoint **MAY** be exposed where readiness and liveness semantics differ, under the same rules.

**Example (informative).** A `/health` response:

```json
{
  "description": "health of the registration BB"
}
```

## 5.10 Standard unversioned endpoints <a href="#510-standard-unversioned-endpoints" id="510-standard-unversioned-endpoints"></a>

**[M]** A closed set of endpoints sits outside the versioned business surface, because their location or spelling is fixed by something other than this guide. That set is: well-known URIs under `/.well-known/`, whose location RFC 8615 roots at that exact prefix (for example the RFC 9727 API catalog at `/.well-known/api-catalog`); the operational endpoints of [§5.9](#59-unversioned-health-endpoint); and a runtime specification-discovery endpoint where a BB serves one, conventionally `/openapi.json` or `/asyncapi.json`. These endpoints are exempt from [§5.1](#51-major-version-in-the-path), [§5.3](#53-kebab-case-path-segments), and the collection rules of [§12](../part-c/12-pagination-filtering-sorting.md), and they satisfy [§13.1](../part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) with an explicit empty security requirement (`security: []`) where they are unauthenticated. A BB **MUST NOT** place a business resource under one of these paths in order to escape the rules above: they are read-only and **MUST NOT** declare `POST`, `PUT`, `PATCH`, or `DELETE`.

No other endpoint **MAY** claim this exemption. A static document that a well-known URI links to, such as a metadata document or a linkset, is published content rather than an operation of the business surface; it **MAY** be served from any stable HTTPS location and does not need to appear in the OpenAPI document.
