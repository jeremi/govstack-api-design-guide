---
description: "Rules governing the CloudEvents envelope, event-type and source naming, signed and replay-detectable delivery, and subscription management for webhooks, brokered channels, and event streams."
---

# 16. CloudEvents and webhooks

{% hint style="info" %}
**Intent.** A single event contract across BBs. Many BBs need event notifications; a shared CloudEvents envelope, type/source convention, signing contract, and delivery-failure contract is what makes them composable, regardless of transport.

**Applies to:** Event-driven. CloudEvents rules apply to HTTP webhooks, brokered event channels, and event streams. OpenAPI and AsyncAPI are documentation formats for those surfaces, not alternative event-envelope standards.

**Layer ([§1.8](../1-introduction.md#18-layering-what-this-guide-constrains)).** [§16.1](#161-event-surfaces-documented), [§16.3](#163-reverse-dns-event-types), [§16.4](#164-stable-cloudevents-source), [§16.6](#166-govstack-signature-header), [§16.10](#1610-documented-delivery-failure-contract), and [§16.11](#1611-subscription-management-interfaces) constrain the specification (documentation and declaration). [§16.5](#165-signed-event-delivery) and [§16.7](#167-replay-detectable-signed-material) are behavioural-contract rules, verified by the conformance test pack once the event-signature profile ([§16.8](#168-pinned-signature-profile), [`[OPEN-15-A]`](../appendix/b-open-questions.md)) exists; that profile is a v1.0 prerequisite. [§16.9](#169-operational-signing-concerns-out-of-scope) keeps replay enforcement and signing-key rotation in the Security & Operations companion.
{% endhint %}

## 16.1 Event surfaces documented <a href="#161-event-surfaces-documented" id="161-event-surfaces-documented"></a>

**[M+R]** Event-driven APIs **MUST** be documented. HTTP push **MUST** use OpenAPI 3.1 `webhooks`; brokered transports and event streams (MQTT, AMQP, Kafka, WebSockets, SSE) **MUST** use AsyncAPI 3.0.

## 16.2 CloudEvents envelope required <a href="#162-cloudevents-envelope-required" id="162-cloudevents-envelope-required"></a>

**[M]** GovStack domain events **MUST** conform to the CloudEvents v1.0.2 specification (CNCF). The event envelope **MUST** include the CloudEvents-required fields `specversion`, `id`, `source`, and `type`; `specversion` **MUST** be the CloudEvents wire value `"1.0"` for CloudEvents v1.0.x; `time` and `datacontenttype` **SHOULD** be included; and GovStack-owned domain payload fields **MUST** live under `data`.

## 16.3 Reverse-DNS event types <a href="#163-reverse-dns-event-types" id="163-reverse-dns-event-types"></a>

**[M]** Event `type` names **MUST** follow a single ecosystem-wide convention. The default shape is reverse-DNS: `org.govstack.{bb-code}.{resource}.{action}`. The `{bb-code}` segment is the BB's single registered code per [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). The event type identifies the semantic event kind and does not include the major version; the versioned transport contract is carried in the channel address or equivalent AsyncAPI version metadata ([§18.2](../part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel)). [`[OPEN-15-B]`](../appendix/b-open-questions.md)

## 16.4 Stable CloudEvents source <a href="#164-stable-cloudevents-source" id="164-stable-cloudevents-source"></a>

**[M+R]** The CloudEvents `source` field **MUST** identify the publishing BB or BB surface in a stable way. It **MUST NOT** identify a specific deployment host, pod, broker, queue, or environment.

**Example (informative).** A structured CloudEvents JSON event with a GovStack trace extension attribute:

```json
{
  "specversion": "1.0",
  "id": "5e0c63c2-2b8a-4d3f-9a51-7c6b0d9e8f21",
  "source": "org.govstack.registration",
  "type": "org.govstack.registration.application.approved",
  "time": "2026-07-10T08:30:00Z",
  "datacontenttype": "application/json",
  "traceid": "6f1c3f0e2a9b4c8d",
  "data": {
    "applicationId": "3f6c0e63-9f7e-4d51-a3ce-58b2c7d0f3a1",
    "approvedAt": "2026-07-10T08:29:58Z"
  }
}
```

## 16.5 Signed event delivery <a href="#165-signed-event-delivery" id="165-signed-event-delivery"></a>

**[R]** Event delivery **MUST** be signed using the GovStack event-signature profile defined in `govstack-openapi-common.yaml` and `govstack-asyncapi-common.yaml`. [`[OPEN-15-A]`](../appendix/b-open-questions.md)

## 16.6 GovStack-Signature header <a href="#166-govstack-signature-header" id="166-govstack-signature-header"></a>

**[M+R]** On the OpenAPI/webhooks surface the signature **MUST** travel in a single ecosystem-wide HTTP header named `GovStack-Signature` (modelled on Stripe's `Stripe-Signature` and GitHub's `X-Hub-Signature-256`). On the AsyncAPI surface the signature **MUST** travel in the transport's message-metadata channel under the same field name unless the chosen protocol binding defines a more precise field. [`[OPEN-15-C]`](../appendix/b-open-questions.md)

## 16.7 Replay-detectable signed material <a href="#167-replay-detectable-signed-material" id="167-replay-detectable-signed-material"></a>

**[R]** The signed material **MUST** include the event body, the event `id`, and either the CloudEvents `time` value or a signature timestamp, so receivers can detect replays.

## 16.8 Pinned signature profile <a href="#168-pinned-signature-profile" id="168-pinned-signature-profile"></a>

**[R]** `govstack-openapi-common.yaml` and `govstack-asyncapi-common.yaml` **MUST** pin the exact bytes that are signed (the canonicalisation: which fields, in which order, with which serialisation), the signing algorithm and its identifier, and the signature verification inputs, so that two independently-built BBs can verify each other's signatures. The default signature scheme is detached JWS over a canonicalised structured CloudEvents JSON payload. HMAC-SHA256 **MAY** be used only where shared-key distribution is explicitly governed. The event-signature profile is required for v1.0 publication because [§16.5](#165-signed-event-delivery) is not mechanically enforceable without it. [`[OPEN-15-A]`](../appendix/b-open-questions.md)

## 16.9 Operational signing concerns out of scope <a href="#169-operational-signing-concerns-out-of-scope" id="169-operational-signing-concerns-out-of-scope"></a>

Operational concerns such as replay-window enforcement and signing-key rotation are out of scope here and live in the Security & Operations companion ([§1.2](../1-introduction.md#12-scope)).

## 16.10 Documented delivery-failure contract <a href="#1610-documented-delivery-failure-contract" id="1610-documented-delivery-failure-contract"></a>

**[R]** HTTP webhook delivery-failure behaviour **MUST** be documented per subscription. A reference specification **MUST** define the portable contract fields: whether redelivery is attempted, whether failed deliveries are stored, and how a subscriber can identify or recover failed deliveries. Concrete retry counts, backoff intervals, and failure-store retention values belong in implementation profiles. Failed deliveries **SHOULD** end in a dead-letter queue or equivalent failure store accessible to the subscription owner.

## 16.11 Subscription management interfaces <a href="#1611-subscription-management-interfaces" id="1611-subscription-management-interfaces"></a>

**[M+R]** Subscription management **MUST** expose documented interfaces to create, list, rotate the signing secret, and delete a subscription. HTTP subscription management uses OpenAPI endpoints; brokered or stream-based subscription management **MAY** use message-based commands documented in AsyncAPI if that is the BB's chosen control plane.
