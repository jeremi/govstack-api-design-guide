---
description: "Rules for the Idempotency-Key header contract that lets clients safely retry non-idempotent POST requests."
---

# 14. Idempotency

{% hint style="info" %}
**Intent.** Safe retries. A shared idempotency contract is what lets a client retry a payment, registration, or message submission without risk of duplicates.

**Applies to:** Universal. On the AsyncAPI surface the same idempotency concept applies using the message metadata rules in [§17.8](../part-d/17-asyncapi-channel-rules.md#178-message-headers-and-idempotency-metadata).

**Layer ([§1.8](../1-introduction.md#18-layering-what-this-guide-constrains)).** [§14.1](#141-idempotency-key-on-non-idempotent-posts) and [§14.3](#143-documented-replay-window) constrain the specification: declare the header and document the replay-window contract. [§14.2](#142-opaque-client-generated-keys) and [§14.4](#144-replay-returns-original-response)–[§14.6](#146-naturally-idempotent-designs) are behavioural-contract rules: they bind a conforming implementation at run time and are verified by the conformance test pack, not by spec linting. Concrete replay-window values, key-store retention, and the maximum accepted key length are deployment values for implementation profiles; replay enforcement and key storage are operational concerns for the Security & Operations companion ([§1.2](../1-introduction.md#12-scope)).
{% endhint %}

## 14.1 Idempotency-Key on non-idempotent POSTs <a href="#141-idempotency-key-on-non-idempotent-posts" id="141-idempotency-key-on-non-idempotent-posts"></a>

**[M+R]** Except where [§14.6](#146-naturally-idempotent-designs) applies, POST endpoints that create resources, move value, submit irreversible requests, send messages, create subscriptions, start long-running jobs, or trigger other non-idempotent processing **MUST** require and accept an `Idempotency-Key` header. Other mutating POST actions **SHOULD** support it unless their naturally idempotent contract documents duplicate handling. Read-like POSTs such as search **MAY** support it. GovStack pins the header syntax and error semantics from `draft-ietf-httpapi-idempotency-key-header-07`; this guide is the stable GovStack profile if that work-in-progress draft changes or expires.

## 14.2 Opaque client-generated keys <a href="#142-opaque-client-generated-keys" id="142-opaque-client-generated-keys"></a>

**[R]** The key **MUST** be an opaque, client-generated, high-entropy value and **SHOULD** be a UUID. On the wire it **MUST** use the Structured Field String syntax pinned from draft revision 07, including the required quotation marks. The specification **MUST** document the accepted syntax and maximum length, and the server **MUST** reject a malformed, missing-required, or oversized key with `400 Bad Request` before processing the operation.

## 14.3 Documented replay window <a href="#143-documented-replay-window" id="143-documented-replay-window"></a>

**[R]** The spec **MUST** document the idempotency replay-window contract, the required minimum replay window or controlling configuration parameter, and what happens after expiry. Within the documented window the key **MUST** retain the semantics in [§14.4](#144-replay-returns-original-response) and [§14.5](#145-key-reuse-and-fingerprint-mismatch); after expiry the server **MAY** process the same key as a new request only if that behaviour is stated explicitly. Concrete retention values belong in implementation profiles.

## 14.4 Replay returns original response <a href="#144-replay-returns-original-response" id="144-replay-returns-original-response"></a>

**[R]** A completed repeated request with the same lookup scope, key, and fingerprint within the documented window **MUST** return the original operation result: the same status, body, and result-defining representation headers such as `Content-Type` and `Location`. Per-attempt, temporal, security, tracing, rate-limit, retry, and hop-by-hop headers **MUST** be regenerated or omitted rather than replayed; this includes `Date`, `traceparent`, `tracestate`, `RateLimit`, `Retry-After`, and `Set-Cookie`.

## 14.5 Key reuse and fingerprint mismatch <a href="#145-key-reuse-and-fingerprint-mismatch" id="145-key-reuse-and-fingerprint-mismatch"></a>

**[R]** The server's idempotency lookup scope **MUST** include the effective HTTP method, canonical target URI, key, and, for authenticated operations, the authenticated client and tenant or equivalent authorization partition. The request fingerprint **MUST** include the method, canonical target URI, request content type, canonicalised body, and every documented header that changes operation semantics. Reusing a key in the same lookup scope with a different fingerprint **MUST** return `422 Unprocessable Content`; a matching retry received while the original remains in flight **MUST** return `409 Conflict`. These are GovStack **MUST** requirements even though draft revision 07 expresses the status-code choices as **SHOULD**.

## 14.6 Naturally idempotent designs <a href="#146-naturally-idempotent-designs" id="146-naturally-idempotent-designs"></a>

**[R]** Naturally idempotent designs **MAY** satisfy this section without an `Idempotency-Key` header when idempotency is already guaranteed by the resource contract, for example `PUT /v1/resources/{clientProvidedId}` or creation with a documented unique business key that returns the existing resource or a stable conflict on duplicate submission. The spec **MUST** document that duplicate-handling behaviour per operation. Because [§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers) makes BB-generated identifiers server-assigned by default, `PUT`-with-client-id creation is available only where the resource is keyed by a client-supplied or statutory identifier ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)).
