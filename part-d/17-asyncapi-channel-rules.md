---
description: "Rules governing AsyncAPI channel addressing, payload structure, message headers, delivery and ordering guarantees, and examples for brokered and event-stream surfaces."
---

# 17. AsyncAPI channel documentation rules

{% hint style="info" %}
**Intent.** AsyncAPI documents brokered CloudEvents channels and event streams other than HTTP push webhooks. It does not replace CloudEvents and does not solve every broker's operational playbook in this guide. It makes the portable contract complete enough that an integrator can see what a BB publishes or consumes, on which channels, under which security model, and with which delivery guarantees.

**Applies to:** AsyncAPI surface. If a BB exposes no brokered or event-stream surface (only synchronous REST and/or HTTP push webhooks), [§3](../part-a/3-asyncapi-document-standards.md) and [§17](../part-d/17-asyncapi-channel-rules.md) do not apply.
{% endhint %}

## 17.1 Send and receive perspective <a href="#171-send-and-receive-perspective" id="171-send-and-receive-perspective"></a>

**[M+R]** Each AsyncAPI document **MUST** define the BB's perspective. An operation with `action: send` means the BB publishes that message to the channel. An operation with `action: receive` means the BB consumes that message from the channel.

## 17.2 Stable logical channel IDs and native addresses <a href="#172-stable-logical-channel-ids-and-native-addresses" id="172-stable-logical-channel-ids-and-native-addresses"></a>

**[M+R]** Each entry under AsyncAPI `channels` **MUST** use a stable logical channel ID with reverse-DNS shape `global.govstack.{bb-code}.v{major}.{resource}.{event}`. The `{bb-code}` segment **MUST** be the registered code from [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). The Channel Object `address` **MUST** use the chosen protocol's native destination syntax, such as an MQTT topic, AMQP routing key, Kafka topic, or WebSocket/SSE path, and **MUST NOT** be forced into reverse-DNS form when that would change protocol semantics. Protocol bindings **MUST** document the mapping from logical ID to native address.

## 17.3 No personal data in channels <a href="#173-no-personal-data-in-channels" id="173-no-personal-data-in-channels"></a>

**[R]** Logical channel IDs, native addresses, topic names, queue names, routing keys, and channel parameters **MUST NOT** contain personal data, secrets, access tokens, phone numbers, email addresses, national identifiers, names, dates of birth, exact addresses, or other directly identifying attributes. Use opaque IDs or claim-protected payload fields instead.

## 17.4 Declared channel parameters <a href="#174-declared-channel-parameters" id="174-declared-channel-parameters"></a>

**[M+R]** Channel parameters **MAY** be used for non-personal routing values such as tenant, ministry, service, region, resource type, or shard. Each parameter **MUST** be declared under the AsyncAPI channel `parameters` object, and its schema and routing semantics **MUST** be documented.

## 17.5 No environment names in addresses <a href="#175-no-environment-names-in-addresses" id="175-no-environment-names-in-addresses"></a>

**[M+R]** Environment names (`dev`, `test`, `prod`), broker implementation names, and deployment-specific prefixes **SHOULD NOT** appear in channel addresses. They belong in `servers`, server variables, broker configuration, or deployment routing unless a protocol profile explicitly requires them.

## 17.6 Structured CloudEvents JSON payloads <a href="#176-structured-cloudevents-json-payloads" id="176-structured-cloudevents-json-payloads"></a>

**[M]** AsyncAPI message payloads for GovStack domain events **MUST** use structured CloudEvents JSON: the message payload is the complete CloudEvent, and GovStack-owned domain data lives under the CloudEvents `data` field. This provides one portable, schema-validatable event shape across brokered transports. [`[OPEN-15-E]`](../appendix/b-open-questions.md)

## 17.7 Shared CloudEvents message schema <a href="#177-shared-cloudevents-message-schema" id="177-shared-cloudevents-message-schema"></a>

**[M]** AsyncAPI channel message entries **MUST** reference the shared CloudEvents message schema from `govstack-asyncapi-common.yaml` and specialise only the `data` schema for the BB-specific event payload. Operation message references **MUST** point to the relevant message entries under the operation's referenced channel, per AsyncAPI 3.0.

## 17.8 Message headers and idempotency metadata <a href="#178-message-headers-and-idempotency-metadata" id="178-message-headers-and-idempotency-metadata"></a>

**[M+R]** GovStack-owned transport/application message headers **MUST** use camelCase and **MUST NOT** use the `X-` prefix. Structured CloudEvents messages that participate in a distributed trace **MUST** carry the standard CloudEvents distributed-tracing extension attribute `traceparent` and **MAY** carry `tracestate`; workflow metadata **MAY** use the extension attributes `correlationid` and `causationid`. CloudEvents extension names are lowercase; equivalent GovStack-owned transport/application headers are camelCase. Transport headers **MAY** mirror these values where broker tooling requires it, but the CloudEvent remains normative. The event-signature metadata name **MUST** follow [§16.6](../part-d/16-cloudevents-and-webhooks.md#166-govstack-signature-header). Command-like messages that create resources, move value, or trigger non-idempotent processing **MUST** carry an idempotency key: structured CloudEvents commands **MUST** use `idempotencykey`, while non-CloudEvents commands **MUST** use `idempotencyKey`.

## 17.9 Message localisation headers <a href="#179-message-localisation-headers" id="179-message-localisation-headers"></a>

**[M+R]** Message headers used for localisation **MUST** be `acceptLanguage` on inbound command/request messages and `contentLanguage` on outbound localised messages. Stable fields such as identifiers, enum values, timestamps, currency codes, and error codes **MUST NOT** be translated.

## 17.10 Security schemes cover every operation <a href="#1710-security-schemes-cover-every-operation" id="1710-security-schemes-cover-every-operation"></a>

**[M+R]** AsyncAPI security schemes **MUST** be declared under `components.securitySchemes` and applied on `servers`, `operations`, or both so every operation is covered. Message signing ([§16.5](../part-d/16-cloudevents-and-webhooks.md#165-signed-event-delivery)) is message-level integrity and **MUST NOT** be treated as a substitute for broker, server, or operation authentication.

## 17.11 Documented delivery guarantees <a href="#1711-documented-delivery-guarantees" id="1711-documented-delivery-guarantees"></a>

**[M+R]** Each operation **MUST** document its delivery guarantee: `atMostOnce`, `atLeastOnce`, or `effectivelyOnce`. `effectivelyOnce` **MUST** be backed by an idempotency contract, duplicate detection, or a documented resource-state invariant; it **MUST NOT** imply the transport literally delivers a message exactly once.

## 17.12 Documented ordering guarantees <a href="#1712-documented-ordering-guarantees" id="1712-documented-ordering-guarantees"></a>

**[M+R]** Each operation **MUST** document ordering guarantees, if any. If ordering is partitioned, keyed, or scoped, the key or scope **MUST** be declared. If no ordering is guaranteed, the spec **MUST** state that explicitly.

## 17.13 Declared delivery-management capabilities <a href="#1713-declared-delivery-management-capabilities" id="1713-declared-delivery-management-capabilities"></a>

**[M+R]** Each operation **MUST** declare which delivery-management capabilities the chosen transport contract exposes: redelivery, dead-letter handling, retention, and replay. The declaration **MUST** state whether each capability is supported, unsupported, or not applicable.

## 17.14 Portable capability contract <a href="#1714-portable-capability-contract" id="1714-portable-capability-contract"></a>

**[R]** A reference specification **MUST** define the portable contract shape, defaults, and allowed bounds for supported delivery-management capabilities. Concrete retry counts, backoff intervals, retention periods, replay windows, and dead-letter store settings belong in implementation profiles.

## 17.15 Machine-readable delivery extensions <a href="#1715-machine-readable-delivery-extensions" id="1715-machine-readable-delivery-extensions"></a>

**[M+R]** Delivery, ordering, and delivery-management capability declarations **MUST** be machine-readable using GovStack specification extensions declared in `govstack-asyncapi-common.yaml` (for example, `x-govstack-delivery`, `x-govstack-ordering`, and `x-govstack-replay`) as well as human-readable in `description`. [`[OPEN-15-G]`](../appendix/b-open-questions.md)

## 17.16 Async rejection error messages <a href="#1716-async-rejection-error-messages" id="1716-async-rejection-error-messages"></a>

**[M+R]** Command-like messages that can be rejected asynchronously **MUST** define a rejection or failure message using `GovStackAsyncError` from [§11.8](../part-c/11-errors.md#118-transport-neutral-asynchronous-errors), not an artificial RFC 9457 HTTP `status`. The error message **MUST** be correlated to the original message using [§17.8](#178-message-headers-and-idempotency-metadata) or an equivalent protocol binding.

## 17.17 Declared request-reply correlation <a href="#1717-declared-request-reply-correlation" id="1717-declared-request-reply-correlation"></a>

**[M+R]** Request-reply over messaging **MAY** be used where the protocol and use case support it. When used, the AsyncAPI operation **MUST** declare the reply channel or reply address pattern and the correlation mechanism. Fire-and-forget event publication **MUST NOT** pretend to be request-reply.

## 17.18 Correlated completion signals <a href="#1718-correlated-completion-signals" id="1718-correlated-completion-signals"></a>

**[M+R]** Long-running asynchronous work triggered by a message **MUST** expose completion through either an operation-status message based on the [§15](../part-d/15-asynchronous-operations.md) Operation resource or an operation-completed domain event. The spec **MUST** document how clients correlate the completion signal to the initiating message.

## 17.19 Protocol bindings where relevant <a href="#1719-protocol-bindings-where-relevant" id="1719-protocol-bindings-where-relevant"></a>

**[M+R]** Protocol bindings **MUST** be present where protocol-specific fields affect interoperability. At minimum, Kafka-like bindings **SHOULD** declare topic and key semantics; MQTT bindings **SHOULD** declare QoS and retained-message policy; AMQP bindings **SHOULD** declare exchange, queue, and routing-key semantics; WebSocket and SSE bindings **SHOULD** declare connection and message framing. Detailed broker operations remain out of scope for this guide. [`[OPEN-15-F]`](../appendix/b-open-questions.md)

## 17.20 Examples for every message <a href="#1720-examples-for-every-message" id="1720-examples-for-every-message"></a>

**[M+R]** AsyncAPI documents **MUST** define examples for every message and **SHOULD** include at least one example showing headers plus payload for each common message family: command, event, error, and operation-completion where applicable.
