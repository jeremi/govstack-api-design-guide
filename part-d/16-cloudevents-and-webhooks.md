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

<!-- rule-class: M+R -->

Event-driven APIs **MUST** be documented. HTTP push **MUST** use OpenAPI 3.1 `webhooks`; brokered transports and event streams (MQTT, AMQP, Kafka, WebSockets, SSE) **MUST** use an AsyncAPI 3 version qualified by [§3.1](../part-a/3-asyncapi-document-standards.md#31-asyncapi-300-required).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

proxy: OpenAPI push events live under top-level webhooks. Brokered-transport (AsyncAPI) clause not checked.
<!-- verification:end -->

## 16.2 CloudEvents envelope required <a href="#162-cloudevents-envelope-required" id="162-cloudevents-envelope-required"></a>

<!-- rule-class: M -->

GovStack domain events **MUST** conform to the CloudEvents v1.0.2 specification (CNCF). The event envelope **MUST** include the CloudEvents-required fields `specversion`, `id`, `source`, and `type`; `specversion` **MUST** be the CloudEvents wire value `"1.0"` for CloudEvents v1.0.x; and GovStack-owned domain payload fields **MUST** live under `data`. On the HTTP webhooks surface the event **MUST** be delivered in CloudEvents structured content mode with media type `application/cloudevents+json`; binary content mode **MUST NOT** be used. [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) imposes the same requirement on the AsyncAPI surface.

`time` and `datacontenttype` **SHOULD** be included.

<!-- verification:start -->
**Verification:** Automated specification check.

event payload schema requires specversion(const "1.0")/id/source/type + data, and the webhooks surface must declare application/cloudevents+json rather than a binary-mode application/json body
<!-- verification:end -->

## 16.3 Reverse-DNS event types <a href="#163-reverse-dns-event-types" id="163-reverse-dns-event-types"></a>

<!-- rule-class: M -->

Event `type` names **MUST** be stable, globally collision-resistant, and include the BB's registered code from [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). The event type identifies the semantic event kind and **MUST NOT** include the major API version; transport-contract versioning is carried separately ([§18.2](../part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel)).

New GovStack event types **SHOULD** use the reverse-DNS shape `global.govstack.{bb-code}.{resource}.{action}`.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

split proxy: warns on the reverse-DNS default and errors on a pinned major-version segment; BB-code registry membership, long-term stability, and global collision resistance require context
<!-- verification:end -->

## 16.4 Stable CloudEvents source <a href="#164-stable-cloudevents-source" id="164-stable-cloudevents-source"></a>

<!-- rule-class: M+R -->

The CloudEvents `source` field **MUST** be a stable, non-empty URI-reference identifying the context in which the event happened. A stable logical authority, tenant, deployment, or environment is a valid source context. An ephemeral runtime instance or transport intermediary, such as a replaceable pod replica or delivery queue, **MUST NOT** be used unless it is itself the context whose occurrence the event describes. A hostname, IP address, or port is not by itself evidence that a source is unstable.

An absolute URI, including a URN, **SHOULD** be used. Producers that share one `source` **MUST** coordinate their `id` values so that each distinct event has a unique `source` and `id` pair. Schema checks can validate pinned or example values as non-empty URI-references, but whether an identity is stable and denotes the occurrence context requires human review.

**Example (informative).** A structured CloudEvents JSON event with a GovStack trace extension attribute:

```json
{
  "specversion": "1.0",
  "id": "5e0c63c2-2b8a-4d3f-9a51-7c6b0d9e8f21",
  "source": "urn:govstack:country:ke:agency:civil-registration:tenant:national:environment:prod",
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

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

OpenAPI and AsyncAPI proxies check pinned/example source values for non-empty URI-reference lexical shape and valid percent escapes; stable authority, tenant, deployment, environment, host, IP and port identities are permitted. Full URI semantics, stability, occurrence context, and source+id uniqueness require review or runtime evidence
<!-- verification:end -->

## 16.5 Optional signed event delivery <a href="#165-optional-signed-event-delivery" id="165-optional-signed-event-delivery"></a>

<!-- rule-class: R -->

Event delivery **MAY** use message-level signing when the BB's threat model requires authenticity or integrity beyond authenticated transport. Signing is not part of the baseline GovStack event contract. Requirements for an explicitly adopted profile are in [§16.6](#166-signature-metadata-when-used)–[§16.8](#168-separate-experimental-signing-profile).

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

conditional opt-in signing choice and profile documentation require threat-model context
<!-- verification:end -->

## 16.6 Signature metadata when used <a href="#166-signature-metadata-when-used" id="166-signature-metadata-when-used"></a>

<!-- rule-class: R -->

When the optional profile uses GovStack-owned metadata, an OpenAPI webhook signature **MUST** travel in `GovStack-Signature` and an AsyncAPI transport/application metadata field **MUST** be named `govstackSignature`. When a protocol binding defines a standard signature field, its mapping **MUST** be documented. A surface that does not adopt signing **MUST NOT** require signature metadata.

When a protocol binding defines a standard signature field, that field **SHOULD** be used.

<!-- verification:start -->
**Verification:** Additional context required for verification.

signature metadata naming applies only when a surface opts into signing
<!-- verification:end -->

## 16.7 Replay-detectable signed material <a href="#167-replay-detectable-signed-material" id="167-replay-detectable-signed-material"></a>

<!-- rule-class: R -->

When signing is adopted, the signed material **MUST** include the event body, the event `id`, and either the CloudEvents `time` value or a signature timestamp, so receivers have the inputs needed to detect replays.

<!-- verification:start -->
**Verification:** Runtime verification required; outside the specification linter.

conditional signed-material contents are verified at runtime when signing is adopted
<!-- verification:end -->

## 16.8 Separate experimental signing profile <a href="#168-separate-experimental-signing-profile" id="168-separate-experimental-signing-profile"></a>

<!-- rule-class: R -->

Event signing belongs in the separate optional `experimental/govstack-openapi-signing-profile.yaml` artifact, not in either baseline common schema artifact. A BB that adopts this profile **MUST** pin the profile version and **MUST** document its key discovery, key rotation, replay policy, protocol mapping, and conformance tests. The profile remains incomplete pending a shared key-discovery and replay-policy contract and **MUST NOT** be presented as an ecosystem-wide baseline.

A BB **MAY** adopt this profile explicitly.

<!-- verification:start -->
**Verification:** Additional context required for verification.

experimental OpenAPI profile and adopter-supplied key/replay contract need common-file and implementation context
<!-- verification:end -->

## 16.9 Readiness for a shared signature profile <a href="#169-readiness-for-a-shared-signature-profile" id="169-readiness-for-a-shared-signature-profile"></a>

(informative) A shared signature profile is outside the baseline. It should be considered only after key discovery, key rotation, replay-window enforcement, protocol mappings, conformance test vectors, and interoperable implementations in at least two commonly used GovStack implementation languages exist. Operational signing controls remain outside this guide ([§1.2](../1-introduction.md#12-scope)).

<!-- verification:start -->
**Verification:** Informative; no conformance check.

readiness criteria for a future shared profile (informative)
<!-- verification:end -->

## 16.10 Documented delivery-failure contract <a href="#1610-documented-delivery-failure-contract" id="1610-documented-delivery-failure-contract"></a>

<!-- rule-class: R -->

HTTP webhook delivery-failure behaviour **SHOULD** be documented per subscription. A reference specification **SHOULD** define the portable contract fields: whether redelivery is attempted, whether failed deliveries are stored, and how a subscriber can identify or recover failed deliveries. Concrete retry counts, backoff intervals, and failure-store retention values belong in implementation profiles. Failed deliveries **SHOULD** end in a dead-letter queue or equivalent failure store accessible to the subscription owner.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

"document delivery-failure contract" prose
<!-- verification:end -->

## 16.11 Subscription management interfaces <a href="#1611-subscription-management-interfaces" id="1611-subscription-management-interfaces"></a>

<!-- rule-class: M+R -->

When a BB manages subscriptions as part of its public API, it **MUST** expose documented interfaces to create, list, and delete a subscription. If the subscription adopts message signing, it **MUST** also expose or document how to rotate or redistribute the verification material used by the selected profile.

HTTP subscription management uses OpenAPI endpoints; brokered or stream-based subscription management **MAY** use message-based commands documented in AsyncAPI if that is the BB's chosen control plane.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

proxy: exposed BB subscription paths provide create/list/delete; absent subscription APIs are not flagged; conditional signing-key rotation is not checked
<!-- verification:end -->
