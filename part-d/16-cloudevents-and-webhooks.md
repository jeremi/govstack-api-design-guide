---
description: "Rules governing the CloudEvents envelope, event-type and source naming, signed and replay-detectable delivery, and subscription management for webhooks, brokered channels, and event streams."
---

# 16. CloudEvents and webhooks

{% hint style="info" %}
**Intent.** A single event contract across BBs. Many BBs need event notifications; a shared CloudEvents envelope, type/source convention, signing contract, and delivery-failure contract is what makes them composable, regardless of transport.

**Applies to:** Event-driven. CloudEvents rules apply to HTTP webhooks, brokered event channels, and event streams. OpenAPI and AsyncAPI are documentation formats for those surfaces, not alternative event-envelope standards.

**Layer ([§1.8](../1-introduction.md#18-layering-what-this-guide-constrains)).** [§16.1](#161-event-surfaces-documented), [§16.3](#163-reverse-dns-event-types), [§16.4](#164-stable-cloudevents-source), [§16.6](#166-govstack-signature-header), [§16.10](#1610-documented-delivery-failure-contract), and [§16.11](#1611-subscription-management-interfaces) constrain the specification (documentation and declaration). [§16.5](#165-signed-event-delivery) and [§16.7](#167-replay-detectable-signed-material) are behavioural-contract rules verified by the conformance test pack against the event-signature profile in [§16.8](#168-pinned-signature-profile). [§16.9](#169-operational-signing-concerns-out-of-scope) keeps replay enforcement and signing-key rotation in the Security & Operations companion.
{% endhint %}

## 16.1 Event surfaces documented <a href="#161-event-surfaces-documented" id="161-event-surfaces-documented"></a>

**[M+R]** Event-driven APIs **MUST** be documented. HTTP push **MUST** use OpenAPI 3.1 `webhooks`; brokered transports and event streams (MQTT, AMQP, Kafka, WebSockets, SSE) **MUST** use AsyncAPI 3.0.

## 16.2 CloudEvents envelope required <a href="#162-cloudevents-envelope-required" id="162-cloudevents-envelope-required"></a>

**[M]** GovStack domain events **MUST** conform to the CloudEvents v1.0.2 specification (CNCF). The event envelope **MUST** include the CloudEvents-required fields `specversion`, `id`, `source`, and `type`; `specversion` **MUST** be the CloudEvents wire value `"1.0"` for CloudEvents v1.0.x; `time` and `datacontenttype` **SHOULD** be included; and GovStack-owned domain payload fields **MUST** live under `data`.

## 16.3 Reverse-DNS event types <a href="#163-reverse-dns-event-types" id="163-reverse-dns-event-types"></a>

**[M]** Event `type` names **MUST** follow a single ecosystem-wide convention. The default shape is reverse-DNS: `global.govstack.{bb-code}.{resource}.{action}`. The `{bb-code}` segment is the BB's single registered code per [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). The event type identifies the semantic event kind and **MUST NOT** include the major API version; the versioned transport contract is carried by the AsyncAPI logical channel ID or equivalent version metadata ([§18.2](../part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel)). [`[OPEN-15-B]`](../appendix/b-open-questions.md)

## 16.4 Stable CloudEvents source <a href="#164-stable-cloudevents-source" id="164-stable-cloudevents-source"></a>

**[M+R]** The CloudEvents `source` field **MUST** be a stable, non-empty URI-reference identifying the publishing BB or BB surface; an absolute URI or URN **SHOULD** be used. It **MUST NOT** identify a specific deployment host, pod, broker, queue, or environment.

**Example (informative).** A structured CloudEvents JSON event with a GovStack trace extension attribute:

```json
{
  "specversion": "1.0",
  "id": "5e0c63c2-2b8a-4d3f-9a51-7c6b0d9e8f21",
  "source": "urn:govstack:bb:registration",
  "type": "global.govstack.registration.application.approved",
  "time": "2026-07-10T08:30:00Z",
  "datacontenttype": "application/json",
  "traceparent": "00-6f1c3f0e2a9b4c8d7e6f5a4b3c2d1e0f-5b1e4d7ca8f01e2d-01",
  "data": {
    "applicationId": "3f6c0e63-9f7e-4d51-a3ce-58b2c7d0f3a1",
    "approvedAt": "2026-07-10T08:29:58Z"
  }
}
```

## 16.5 Signed event delivery <a href="#165-signed-event-delivery" id="165-signed-event-delivery"></a>

**[R]** Event delivery **MUST** be signed using the GovStack event-signature profile defined in `govstack-openapi-common.yaml` and `govstack-asyncapi-common.yaml`.

## 16.6 GovStack-Signature header <a href="#166-govstack-signature-header" id="166-govstack-signature-header"></a>

**[M+R]** On the OpenAPI/webhooks surface the signature **MUST** travel in the ecosystem-wide HTTP header `GovStack-Signature`. On the AsyncAPI surface, a GovStack-owned transport/application metadata field **MUST** be named `govstackSignature` so it satisfies [§17.8](../part-d/17-asyncapi-channel-rules.md#178-message-headers-and-idempotency-metadata); when a protocol binding defines a standard signature field, that field **SHOULD** be used and the mapping **MUST** be documented.

## 16.7 Replay-detectable signed material <a href="#167-replay-detectable-signed-material" id="167-replay-detectable-signed-material"></a>

**[R]** The signed material **MUST** include the event body, the event `id`, and either the CloudEvents `time` value or a signature timestamp, so receivers can detect replays.

## 16.8 Pinned signature profile <a href="#168-pinned-signature-profile" id="168-pinned-signature-profile"></a>

**[R]** `govstack-openapi-common.yaml` and `govstack-asyncapi-common.yaml` **MUST** declare the GovStack event-signature profile as detached JWS using `ES256`. The JWS payload **MUST** be the UTF-8 bytes of the complete structured CloudEvent JSON object after JSON Canonicalization Scheme processing defined by RFC 8785. The serialized JWS **MUST** omit its payload using the detached-content procedure in RFC 7515 Appendix F; verifiers **MUST** reconstruct that payload from the received, RFC 8785-canonicalized event body. The protected JWS `kid` **MUST** select the publisher's verification key. Implementations **MUST NOT** use RFC 7797 unencoded-payload JWS unless a future guide version explicitly adopts it.

## 16.9 Operational signing concerns out of scope <a href="#169-operational-signing-concerns-out-of-scope" id="169-operational-signing-concerns-out-of-scope"></a>

Operational concerns such as replay-window enforcement and signing-key rotation are out of scope here and live in the Security & Operations companion ([§1.2](../1-introduction.md#12-scope)).

## 16.10 Documented delivery-failure contract <a href="#1610-documented-delivery-failure-contract" id="1610-documented-delivery-failure-contract"></a>

**[R]** HTTP webhook delivery-failure behaviour **MUST** be documented per subscription. A reference specification **MUST** define the portable contract fields: whether redelivery is attempted, whether failed deliveries are stored, and how a subscriber can identify or recover failed deliveries. Concrete retry counts, backoff intervals, and failure-store retention values belong in implementation profiles. Failed deliveries **SHOULD** end in a dead-letter queue or equivalent failure store accessible to the subscription owner.

## 16.11 Subscription management interfaces <a href="#1611-subscription-management-interfaces" id="1611-subscription-management-interfaces"></a>

**[M+R]** Subscription management **MUST** expose documented interfaces to create, list, rotate the signing secret or verification key material used by the selected profile, and delete a subscription. HTTP subscription management uses OpenAPI endpoints; brokered or stream-based subscription management **MAY** use message-based commands documented in AsyncAPI if that is the BB's chosen control plane.
