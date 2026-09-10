---
description: "Rules governing standard, custom, and rate-limit HTTP headers used across the API surface."
---

# 8. Headers

{% hint style="info" %}
**Intent.** Standard headers are reused. Custom headers are namespaced. No essential data lives in the URL.

**Applies to:** OpenAPI surface only (HTTP/REST). The [§8.6](#86-no-personal-data-in-addressable-locations) principle (no personal data in addressable locations) is universal; its AsyncAPI restatement for channel names, topics, routing keys, and message headers is in [§17](../part-d/17-asyncapi-channel-rules.md).
{% endhint %}

## 8.1 Credentials in Authorization header <a href="#81-credentials-in-authorization-header" id="81-credentials-in-authorization-header"></a>

**[M+R]** HTTP authentication tokens **MUST** travel in the `Authorization` header. Credentials **MUST NOT** appear in query parameters, fragments, cookies, or URL paths. Mutual TLS authenticates at the transport layer; operational API keys permitted by [§13.6](../part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) use their declared header.

## 8.2 Accept-Language and Content-Language <a href="#82-accept-language-and-content-language" id="82-accept-language-and-content-language"></a>

**[M+R]** Localisation requests **MUST** use `Accept-Language`; a localised response **MUST** identify the language actually selected using `Content-Language`, which is not necessarily the request's first preference. A cacheable response selected using `Accept-Language` **MUST** declare `Vary: Accept-Language`.

## 8.3 Idempotency-Key header accepted <a href="#83-idempotency-key-header-accepted" id="83-idempotency-key-header-accepted"></a>

**[M+R]** POST endpoints that require idempotency under [§14](../part-d/14-idempotency.md) **MUST** accept an `Idempotency-Key` header, unless [§14.6](../part-d/14-idempotency.md#146-naturally-idempotent-designs) applies.

## 8.4 W3C Trace Context correlation <a href="#84-w3c-trace-context-correlation" id="84-w3c-trace-context-correlation"></a>

**[M+R]** Every cross-service HTTP operation **MUST** declare the W3C Trace Context `traceparent` request header. A conforming implementation **MUST** propagate a valid received trace context on downstream calls and **MUST** create a valid new context when none is present or the received value is invalid. `tracestate` **MUST NOT** contain personal data. The RFC 9457 `traceId` extension in [§11.3](../part-c/11-errors.md#113-trace-identifier) **MUST** equal the 32-hex-digit trace-id component of the request's effective `traceparent`, except when returning a stored Problem under [§14.4](../part-d/14-idempotency.md#144-replay-returns-original-response): that unchanged body retains the original failure's `traceId`. A separate business or support correlation identifier **MUST NOT** replace Trace Context.

The operation **MAY** also declare `tracestate`. A separate business or support correlation identifier **MAY** be defined.

## 8.5 No new X- prefixed headers <a href="#85-no-new-x--prefixed-headers" id="85-no-new-x--prefixed-headers"></a>

**[M]** New custom headers introduced by this guide or by BBs **MUST NOT** use the `X-` prefix, per RFC 6648. Existing private `X-` headers **MUST NOT** be introduced on a new surface or new major version.

Existing private `X-` headers **MAY** remain only on an unchanged legacy major version.

## 8.6 No personal data in addressable locations <a href="#86-no-personal-data-in-addressable-locations" id="86-no-personal-data-in-addressable-locations"></a>

**[R]** Personal data (national identifier, phone, email, name, date of birth, exact address) **MUST NOT** appear in path segments, query parameters, or header values other than purpose-specific signed assertions (e.g., an OIDC ID token). Citizen-record references in URLs **MUST** use identifiers satisfying [§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers), including its allowance for stable source-owned IDs; that allowance does not permit personal identifiers in URLs.

## 8.7 Rate-limit headers declared <a href="#87-rate-limit-headers-declared" id="87-rate-limit-headers-declared"></a>

**[M+R]** An endpoint rate-limited by the BB itself **SHOULD** document the quota scope and **SHOULD** declare the `RateLimit` response header using the Structured Field syntax pinned from `draft-ietf-httpapi-ratelimit-headers-11`. A BB that advertises quota-policy details **SHOULD** use `RateLimit-Policy`. A `429` response **SHOULD** declare `Retry-After`; when `Retry-After` and `RateLimit` are both present, clients **SHOULD** treat `Retry-After` as authoritative. Where an API gateway or interoperability mediator owns rate limiting, the BB specification **SHOULD** state that fact instead of claiming to emit headers it does not control. The legacy `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` fields **SHOULD NOT** be described as conforming to the pinned draft.

The server **MAY** omit the advisory `RateLimit` and `RateLimit-Policy` headers on individual responses as allowed by the draft.
