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

**[M+R]** Except where [§14.6](#146-naturally-idempotent-designs) applies (a naturally idempotent design), POST endpoints that create resources, move value, submit irreversible requests, send messages, create subscriptions, start long-running jobs, or trigger other non-idempotent processing **MUST** accept an `Idempotency-Key` header. Other mutating POST actions **SHOULD** support idempotency unless the operation is naturally idempotent by contract and documents its duplicate-handling semantics. Read-like POSTs, such as complex search endpoints, **MAY** support idempotency but are not required to. The header follows the convention established by Stripe and is being standardized in the IETF httpapi working group as `draft-ietf-httpapi-idempotency-key-header` (an Internet-Draft, not yet an RFC).

## 14.2 Opaque client-generated keys <a href="#142-opaque-client-generated-keys" id="142-opaque-client-generated-keys"></a>

**[R]** The key **MUST** be an opaque, client-generated string and **SHOULD** be a UUID. (The cited draft RECOMMENDS a UUID rather than requiring one; per [§1.7](../1-introduction.md#17-precedence-of-external-standards) the guide does not specify past the adopted standard by mandating a particular UUID version.)

## 14.3 Documented replay window <a href="#143-documented-replay-window" id="143-documented-replay-window"></a>

**[R]** The spec **MUST** document the idempotency replay-window contract. A reference specification **SHOULD** state the required minimum replay window or the configuration parameter that controls it. Concrete replay-window values belong in implementation profiles.

## 14.4 Replay returns original response <a href="#144-replay-returns-original-response" id="144-replay-returns-original-response"></a>

**[R]** A repeated request with the same key within the documented window **MUST** return the original response (status, body, headers).

## 14.5 Key reuse and fingerprint mismatch <a href="#145-key-reuse-and-fingerprint-mismatch" id="145-key-reuse-and-fingerprint-mismatch"></a>

**[R]** A repeated request reusing the same key with a *different* request body **MUST** return `422 Unprocessable Content` (the request fingerprint does not match the original), per the cited draft. A repeated request that arrives while the original is still being processed (a concurrent in-flight retry) **MUST** return `409 Conflict`. The request fingerprint **MUST** be computed over at least the canonicalised request body; a BB **MAY** additionally include the method and target. The spec **MUST** document a maximum accepted key length so oversized keys are rejected deterministically.

## 14.6 Naturally idempotent designs <a href="#146-naturally-idempotent-designs" id="146-naturally-idempotent-designs"></a>

**[R]** Naturally idempotent designs **MAY** satisfy this section without an `Idempotency-Key` header when idempotency is already guaranteed by the resource contract, for example `PUT /v1/resources/{clientProvidedId}` or creation with a documented unique business key that returns the existing resource or a stable conflict on duplicate submission. The spec **MUST** document that duplicate-handling behaviour per operation. Because [§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers) makes BB-generated identifiers server-assigned by default, `PUT`-with-client-id creation is available only where the resource is keyed by a client-supplied or statutory identifier ([§10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers)).
