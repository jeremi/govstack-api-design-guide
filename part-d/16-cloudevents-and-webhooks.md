---
description: "Rules governing the CloudEvents envelope, event-type and source naming, optional signing, and subscription management for webhooks, brokered channels, and event streams."
---

# 16. CloudEvents and webhooks

{% hint style="info" %}
**Intent.** A small event contract across BBs. The shared baseline is the CloudEvents envelope and the type/source convention. Transport security, optional message signing, and delivery-failure behaviour are documented only where the selected surface needs them.

**Applies to:** Event-driven. CloudEvents rules apply to HTTP webhooks, brokered event channels, and event streams. OpenAPI and AsyncAPI are documentation formats for those surfaces, not alternative event-envelope standards.

**Layer ([§1.8](../1-introduction.md#18-layering-what-this-guide-constrains)).** [§16.1](#161-event-surfaces-documented)–[§16.4](#164-stable-cloudevents-source), [§16.10](#1610-documented-delivery-failure-contract), and [§16.11](#1611-subscription-management-interfaces) constrain the specification. [§16.5](#165-optional-signed-event-delivery)–[§16.9](#169-readiness-for-a-shared-signature-profile) apply only when a BB opts into event signing.
{% endhint %}

## 16.1 Event surfaces documented <a href="#161-event-surfaces-documented" id="161-event-surfaces-documented"></a>

**[M+R]** Event-driven APIs **MUST** be documented. HTTP push **MUST** use OpenAPI 3.1 `webhooks`; brokered transports and event streams (MQTT, AMQP, Kafka, WebSockets, SSE) **MUST** use AsyncAPI 3.0.

## 16.2 CloudEvents envelope required <a href="#162-cloudevents-envelope-required" id="162-cloudevents-envelope-required"></a>

**[M]** GovStack domain events **MUST** conform to the CloudEvents v1.0.2 specification (CNCF). The event envelope **MUST** include the CloudEvents-required fields `specversion`, `id`, `source`, and `type`; `specversion` **MUST** be the CloudEvents wire value `"1.0"` for CloudEvents v1.0.x; `time` and `datacontenttype` **SHOULD** be included; and GovStack-owned domain payload fields **MUST** live under `data`. On the HTTP webhooks surface the event **MUST** be delivered in CloudEvents structured content mode with media type `application/cloudevents+json`; binary content mode **MUST NOT** be used. [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) imposes the same requirement on the AsyncAPI surface.

## 16.3 Reverse-DNS event types <a href="#163-reverse-dns-event-types" id="163-reverse-dns-event-types"></a>

**[M]** Event `type` names **MUST** be stable, globally collision-resistant, and include the BB's registered code from [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). New GovStack event types **SHOULD** use the reverse-DNS shape `global.govstack.{bb-code}.{resource}.{action}`. The event type identifies the semantic event kind and **MUST NOT** include the major API version; transport-contract versioning is carried separately ([§18.2](../part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel)).

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

## 16.5 Optional signed event delivery <a href="#165-optional-signed-event-delivery" id="165-optional-signed-event-delivery"></a>

**[R]** Event delivery **MAY** use message-level signing when the BB's threat model requires authenticity or integrity beyond authenticated transport. Signing is not part of the baseline GovStack event contract. Requirements for an explicitly adopted profile are in [§16.6](#166-signature-metadata-when-used)–[§16.8](#168-separate-experimental-signing-profile).

## 16.6 Signature metadata when used <a href="#166-signature-metadata-when-used" id="166-signature-metadata-when-used"></a>

**[R]** When the optional profile uses GovStack-owned metadata, an OpenAPI webhook signature **MUST** travel in `GovStack-Signature` and an AsyncAPI transport/application metadata field **MUST** be named `govstackSignature`. When a protocol binding defines a standard signature field, that field **SHOULD** be used and its mapping **MUST** be documented. A surface that does not adopt signing **MUST NOT** require signature metadata.

## 16.7 Replay-detectable signed material <a href="#167-replay-detectable-signed-material" id="167-replay-detectable-signed-material"></a>

**[R]** When signing is adopted, the signed material **MUST** include the event body, the event `id`, and either the CloudEvents `time` value or a signature timestamp, so receivers have the inputs needed to detect replays.

## 16.8 Separate experimental signing profile <a href="#168-separate-experimental-signing-profile" id="168-separate-experimental-signing-profile"></a>

**[R]** Event signing belongs in the separate optional `experimental/govstack-openapi-signing-profile.yaml` artifact, not in either baseline common schema artifact. A BB **MAY** adopt this profile explicitly, but it **MUST** pin the profile version and **MUST** document its key discovery, key rotation, replay policy, protocol mapping, and conformance tests. The profile remains incomplete pending a shared key-discovery and replay-policy contract and **MUST NOT** be presented as an ecosystem-wide baseline.

## 16.9 Readiness for a shared signature profile <a href="#169-readiness-for-a-shared-signature-profile" id="169-readiness-for-a-shared-signature-profile"></a>

A shared signature profile is outside the baseline. It should be considered only after key discovery, key rotation, replay-window enforcement, protocol mappings, conformance test vectors, and interoperable implementations in at least two commonly used GovStack implementation languages exist. Operational signing controls remain outside this guide ([§1.2](../1-introduction.md#12-scope)).

## 16.10 Documented delivery-failure contract <a href="#1610-documented-delivery-failure-contract" id="1610-documented-delivery-failure-contract"></a>

**[R]** HTTP webhook delivery-failure behaviour **MUST** be documented per subscription. A reference specification **MUST** define the portable contract fields: whether redelivery is attempted, whether failed deliveries are stored, and how a subscriber can identify or recover failed deliveries. Concrete retry counts, backoff intervals, and failure-store retention values belong in implementation profiles. Failed deliveries **SHOULD** end in a dead-letter queue or equivalent failure store accessible to the subscription owner.

## 16.11 Subscription management interfaces <a href="#1611-subscription-management-interfaces" id="1611-subscription-management-interfaces"></a>

**[M+R]** Subscription management **MUST** expose documented interfaces to create, list, and delete a subscription. If the subscription adopts message signing, it **MUST** also expose or document how to rotate or redistribute the verification material used by the selected profile. HTTP subscription management uses OpenAPI endpoints; brokered or stream-based subscription management **MAY** use message-based commands documented in AsyncAPI if that is the BB's chosen control plane.
