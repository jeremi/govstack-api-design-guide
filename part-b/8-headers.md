---
description: "Rules governing standard, custom, and rate-limit HTTP headers used across the API surface."
---

# 8. Headers

{% hint style="info" %}
**Intent.** Standard headers are reused. Custom headers follow one naming rule and carry no business data. No essential data lives in the URL.

**Applies to:** OpenAPI surface only (HTTP/REST). The [§8.6](#86-no-personal-data-in-addressable-locations) principle (no personal data in addressable locations) is universal; its AsyncAPI restatement for channel names, topics, routing keys, and message headers is in [§17](../part-d/17-asyncapi-channel-rules.md).
{% endhint %}

## 8.1 Credentials in Authorization header <a href="#81-credentials-in-authorization-header" id="81-credentials-in-authorization-header"></a>

<!-- rule-class: M+R -->

HTTP authentication tokens **MUST** travel in the `Authorization` header. Credentials **MUST NOT** appear in query parameters, fragments, cookies, or URL paths. Mutual TLS authenticates at the transport layer; operational API keys permitted by [§13.6](../part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) use their declared header.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

proxy: no apiKey scheme in query/cookie, no token-like query params
<!-- verification:end -->

## 8.2 Accept-Language and Content-Language <a href="#82-accept-language-and-content-language" id="82-accept-language-and-content-language"></a>

<!-- rule-class: M+R -->

Localisation requests **MUST** use `Accept-Language`; a localised response **MUST** identify the language actually selected using `Content-Language`, which is not necessarily the request's first preference. A cacheable response selected using `Accept-Language` **MUST** declare `Vary: Accept-Language`.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

proxy: ops taking Accept-Language declare Content-Language response header
<!-- verification:end -->

## 8.3 Idempotency-Key header accepted <a href="#83-idempotency-key-header-accepted" id="83-idempotency-key-header-accepted"></a>

<!-- rule-class: M+R -->

POST endpoints that require idempotency under [§14](../part-d/14-idempotency.md) **MUST** accept an `Idempotency-Key` header, unless [§14.6](../part-d/14-idempotency.md#146-naturally-idempotent-designs) applies.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

shared with §14.1: POSTs returning 201 or 202 declare Idempotency-Key; reports once under §14.1
<!-- verification:end -->

## 8.4 W3C Trace Context correlation <a href="#84-w3c-trace-context-correlation" id="84-w3c-trace-context-correlation"></a>

<!-- rule-class: M+R -->

Every cross-service HTTP operation **MUST** declare the W3C Trace Context `traceparent` request header. A conforming implementation **MUST** propagate a valid received trace context on downstream calls and **MUST** create a valid new context when none is present or the received value is invalid. `tracestate` **MUST NOT** contain personal data. The RFC 9457 `traceId` extension in [§11.3](../part-c/11-errors.md#113-trace-identifier) **MUST** equal the 32-hex-digit trace-id component of the request's effective `traceparent`, except when returning a stored Problem under [§14.4](../part-d/14-idempotency.md#144-replay-returns-original-response): that unchanged body retains the original failure's `traceId`. A separate business or support correlation identifier **MUST NOT** replace Trace Context.

The operation **MAY** also declare `tracestate`. A separate business or support correlation identifier **MAY** be defined.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

proxy: operations with effective nonempty security declare W3C traceparent request header; runtime propagation remains review/test
<!-- verification:end -->

## 8.5 No new X- prefixed headers <a href="#85-no-new-x--prefixed-headers" id="85-no-new-x--prefixed-headers"></a>

<!-- rule-class: M -->

New custom headers introduced by this guide or by BBs **MUST NOT** use the `X-` prefix, per RFC 6648. Existing private `X-` headers **MUST NOT** be introduced on a new surface or new major version.

Existing private `X-` headers **MAY** remain only on an unchanged legacy major version.

<!-- verification:start -->
**Verification:** Automated specification check.

no header parameter or response header uses the X- prefix
<!-- verification:end -->

## 8.6 No personal data in addressable locations <a href="#86-no-personal-data-in-addressable-locations" id="86-no-personal-data-in-addressable-locations"></a>

<!-- rule-class: R -->

Personal data (national identifier, phone, email, name, date of birth, exact address) **MUST NOT** appear in path segments, query parameters, or header values other than purpose-specific signed assertions (e.g., an OIDC ID token). Citizen-record references in URLs **MUST** use identifiers satisfying [§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers), including its allowance for stable source-owned IDs; that allowance does not permit personal identifiers in URLs.

<!-- verification:start -->
**Verification:** Heuristic check in the optional strict profile.

proxy: flag param names matching personal-data terms
<!-- verification:end -->

## 8.7 Rate-limit headers declared <a href="#87-rate-limit-headers-declared" id="87-rate-limit-headers-declared"></a>

<!-- rule-class: M+R -->

An endpoint rate-limited by the BB itself **SHOULD** document the quota scope. Where an API gateway or interoperability mediator owns rate limiting, the BB specification **SHOULD** state that fact instead of claiming to emit headers it does not control. A `429` response **SHOULD** declare `Retry-After`; when `Retry-After` and `RateLimit` are both present, clients **SHOULD** treat `Retry-After` as authoritative. A BB that advertises quota-policy details **SHOULD** use `RateLimit-Policy`. The legacy `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` fields **SHOULD NOT** be described as conforming to `draft-ietf-httpapi-ratelimit-headers-11`.

An endpoint rate-limited by the BB itself **MAY** declare the advisory `RateLimit` response header using the Structured Field syntax pinned from `draft-ietf-httpapi-ratelimit-headers-11`. The server **MAY** omit the advisory `RateLimit` and `RateLimit-Policy` headers on individual responses as allowed by the draft.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

proxy: 429 responses declare Retry-After (SHOULD-level rule, proxy at info); structured RateLimit is MAY and unchecked; quota scope and gateway ownership are review-only; deterministic warn flags legacy RateLimit-Limit/Remaining/Reset
<!-- verification:end -->

## 8.8 Custom header naming and placement <a href="#88-custom-header-naming-and-placement" id="88-custom-header-naming-and-placement"></a>

<!-- rule-class: M+R -->

A custom header defined for use across BBs, whether by this guide, by a shared GovStack component, or by an interoperability mediator, **SHOULD** carry the `GovStack-` prefix, for example `GovStack-Client`. A custom header local to one BB **SHOULD** use a plain descriptive name without a vendor prefix ([§8.5](#85-no-new-x--prefixed-headers) already forbids `X-`). A header name **SHOULD NOT** embed a BB code or a version number. Business identifiers (record identifiers, case numbers, tenant or organisation identifiers), callback URLs, and personal data **SHOULD NOT** be carried in custom request headers; they belong in the path ([§5](5-url-structure-and-versioning.md)), the request body, or claims of the presented token. Headers carry transport and cross-cutting concerns such as tracing, idempotency, conditional requests, rate limits, and content negotiation. [§8.6](#86-no-personal-data-in-addressable-locations) separately forbids personal data in header values, and [§15.8](../part-d/15-asynchronous-operations.md#158-per-request-callback-url) governs per-request callback URLs.

A header required by an interoperability mediator, for example the client-identification header defined by the Information Mediator BB, is defined by that mediator's contract; a BB specification references it and does not redefine it.

<!-- verification:start -->
**Verification:** Heuristic check in the optional strict profile. Semantic review is also required.

proxy: flag request and response header names that look like tenant/organisation ids, customer ids, callback URLs or national/citizen ids; GovStack- prefix on cross-BB headers, plain names on BB-local headers and BB codes or versions in names need review
<!-- verification:end -->
