---
description: "Rules governing standard, custom, and rate-limit HTTP headers used across the API surface."
---

# 8. Headers

{% hint style="info" %}
**Intent.** Standard headers are reused. Custom headers are namespaced. No essential data lives in the URL.

**Applies to:** OpenAPI surface only (HTTP/REST). The [§8.6](#86-no-personal-data-in-addressable-locations) principle (no personal data in addressable locations) is universal; its AsyncAPI restatement for channel names, topics, routing keys, and message headers is in [§17](../part-d/17-asyncapi-channel-rules.md).
{% endhint %}

## 8.1 Credentials in Authorization header <a href="#81-credentials-in-authorization-header" id="81-credentials-in-authorization-header"></a>

**[M+R]** Authentication credentials **MUST** travel in the `Authorization` header. They **MUST NOT** appear in query parameters, fragments, or URL paths.

## 8.2 Accept-Language and Content-Language <a href="#82-accept-language-and-content-language" id="82-accept-language-and-content-language"></a>

**[M+R]** Localisation requests **MUST** use `Accept-Language`; responses **MUST** echo via `Content-Language`.

## 8.3 Idempotency-Key header accepted <a href="#83-idempotency-key-header-accepted" id="83-idempotency-key-header-accepted"></a>

**[M+R]** POST endpoints that require idempotency under [§14](../part-d/14-idempotency.md) **MUST** accept an `Idempotency-Key` header, unless [§14.6](../part-d/14-idempotency.md#146-naturally-idempotent-designs) applies.

## 8.4 X-Request-Id correlation <a href="#84-x-request-id-correlation" id="84-x-request-id-correlation"></a>

**[M+R]** Every request **SHOULD** carry an `X-Request-Id` header for correlation. The server **MUST** echo this header in the response (or generate one if absent). This correlation identifier is distinct from the error-envelope `traceId` ([§11.3](../part-c/11-errors.md#113-govstack-error-extension-fields)); a BB **MAY** reuse the same value but is not required to, and any propagation between them is operational and out of scope ([§1.2](../1-introduction.md#12-scope)).

## 8.5 No new X- prefixed headers <a href="#85-no-new-x--prefixed-headers" id="85-no-new-x--prefixed-headers"></a>

**[M]** New custom headers introduced by this guide or by BBs **MUST NOT** use the `X-` prefix (per RFC 6648), except for the legacy correlation header explicitly allowed in [§8.4](#84-x-request-id-correlation) pending [`[OPEN-7-A]`](../appendix/b-open-questions.md).

## 8.6 No personal data in addressable locations <a href="#86-no-personal-data-in-addressable-locations" id="86-no-personal-data-in-addressable-locations"></a>

**[R]** Personal data (national identifier, phone, email, name, date of birth, exact address) **MUST NOT** appear in path segments, query parameters, or header values other than purpose-specific signed assertions (e.g., an OIDC ID token). Opaque server-generated IDs ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)) **MUST** be used to refer to citizen records in URLs.

## 8.7 Rate-limit headers declared <a href="#87-rate-limit-headers-declared" id="87-rate-limit-headers-declared"></a>

**[M+R]** Endpoints rate-limited by the BB itself **MUST** declare rate-limit response headers per `draft-ietf-httpapi-ratelimit-headers` (an active, still-evolving Internet-Draft, not yet an RFC); where rate limiting is delegated to an API gateway or interoperability mediator, the spec **MUST** state that, rather than declaring headers the BB does not emit. The default v0.1 form is the three-header variant: `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`, chosen deliberately for its current deployment ubiquity over the draft's newer structured-field form. `429` responses **MUST** additionally declare `Retry-After`. [`[OPEN-7-B]`](../appendix/b-open-questions.md)
