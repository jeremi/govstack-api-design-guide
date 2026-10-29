---
description: "Rules governing AsyncAPI channel addressing, payload structure, message headers, protocol bindings, and examples for brokered and event-stream surfaces."
---

# 17. AsyncAPI channel documentation rules

{% hint style="info" %}
**Intent.** AsyncAPI documents brokered CloudEvents channels and event streams other than HTTP push webhooks. It does not replace CloudEvents or turn broker operations into a universal abstraction. It makes the portable contract complete enough that an integrator can see what a BB publishes or consumes, on which channels, under which security model, and which transport behaviours are safe to rely on.

**Applies to:** AsyncAPI surface. If a BB exposes no brokered or event-stream surface (only synchronous REST and/or HTTP push webhooks), [§3](../part-a/3-asyncapi-document-standards.md) and [§17](../part-d/17-asyncapi-channel-rules.md) do not apply.
{% endhint %}

## 17.1 Send and receive perspective <a href="#171-send-and-receive-perspective" id="171-send-and-receive-perspective"></a>

<!-- rule-class: M+R -->

Each AsyncAPI document **MUST** define the BB's perspective. An operation with `action: send` means the BB publishes that message to the channel. An operation with `action: receive` means the BB consumes that message from the channel.

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

The linter checks that every operation sets `action` to `send` or `receive`. A reviewer checks that the direction matches the BB's own role as publisher or consumer.
<!-- verification:end -->

## 17.2 Stable logical channel IDs and native addresses <a href="#172-stable-logical-channel-ids-and-native-addresses" id="172-stable-logical-channel-ids-and-native-addresses"></a>

<!-- rule-class: M+R -->

Each entry under AsyncAPI `channels` **MUST** use a stable logical ID and document its mapping to the protocol-native address. The Channel Object `address` **MUST** use the chosen protocol's native destination syntax, such as an MQTT topic, AMQP routing key, Kafka topic, or WebSocket/SSE path, and **MUST NOT** be forced into reverse-DNS form when that would change protocol semantics.

New GovStack channel IDs **SHOULD** use `global.govstack.{bb-code}.v{major}.{resource}.{event}`, with the registered code from [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when a logical channel ID (the key under `channels`) does not follow the GovStack dotted pattern with the BB code and major version. A reviewer checks that IDs are stable and that each maps to its native address.
<!-- verification:end -->

## 17.3 No personal data in channels <a href="#173-no-personal-data-in-channels" id="173-no-personal-data-in-channels"></a>

<!-- rule-class: R -->

Logical channel IDs, native addresses, topic names, queue names, routing keys, and channel parameters **MUST NOT** contain personal data, secrets, access tokens, phone numbers, email addresses, national identifiers, names, dates of birth, exact addresses, or other directly identifying attributes. Use opaque IDs or claim-protected payload fields instead.

<!-- verification:start -->
**Verification:** Heuristic check in the optional strict profile.

The linter warns when a channel address or parameter name contains words such as phone, email, national ID, name or date of birth. It cannot see queue names outside the document, and a reviewer checks what values actually flow.
<!-- verification:end -->

## 17.4 Declared channel parameters <a href="#174-declared-channel-parameters" id="174-declared-channel-parameters"></a>

<!-- rule-class: M+R -->

Each parameter **MUST** be declared under the AsyncAPI channel `parameters` object with a non-empty `description` stating its routing semantics. The AsyncAPI 3 Parameter Object carries no `schema` field: a parameter whose permitted values form a closed set **MUST** declare them with `enum`.

Channel parameters **MAY** be used for non-personal routing values such as tenant, ministry, service, region, resource type, or shard. A parameter whose values are open **SHOULD** carry `examples`.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that each `{parameter}` in a channel address is declared under `parameters` with a non-empty `description`. A reviewer checks that closed value sets use `enum` and open ones carry `examples`; the linter does not.
<!-- verification:end -->

## 17.5 No environment names in addresses <a href="#175-no-environment-names-in-addresses" id="175-no-environment-names-in-addresses"></a>

<!-- rule-class: M+R -->

Environment names (`dev`, `test`, `prod`), broker implementation names, and deployment-specific prefixes **SHOULD NOT** appear in channel addresses. They belong in `servers`, server variables, broker configuration, or deployment routing unless a protocol profile explicitly requires them.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter reports, as an information-level finding, a channel address that contains a segment such as dev, test, prod, staging or a broker name like kafka or mqtt. A reviewer checks other deployment-specific prefixes and legitimate uses.
<!-- verification:end -->

## 17.6 Structured CloudEvents JSON payloads <a href="#176-structured-cloudevents-json-payloads" id="176-structured-cloudevents-json-payloads"></a>

<!-- rule-class: M -->

AsyncAPI Message Objects for GovStack domain events **MUST** use `contentType: application/cloudevents+json` and structured CloudEvents JSON: the message payload is the complete CloudEvent, and any GovStack-owned domain data **MUST** live under the CloudEvents `data` field. The base envelope does not require `data` or constrain its JSON shape; each local Message Object makes that decision for its event. This provides one portable, schema-validatable event shape across brokered transports.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

For messages that look like CloudEvents, the linter checks `contentType` is `application/cloudevents+json` and the payload requires and declares `specversion` (fixed to 1.0), `id`, `source` and `type`. It does not check that domain data sits under `data`; a reviewer does.
<!-- verification:end -->

## 17.7 Shared CloudEvents envelope schema <a href="#177-shared-cloudevents-envelope-schema" id="177-shared-cloudevents-envelope-schema"></a>

<!-- rule-class: M -->

Each BB **MUST** define its Message Objects locally. A domain-event message payload **MUST** use a CloudEvents-conforming envelope with a local schema that specialises the event `type` and, when present, `data`. A rejection message **MUST** either reference the shared `GovStackAsyncError` schema directly or use it as CloudEvent `data`. Operation message references **MUST** point to the relevant message entries under the operation's referenced channel, per AsyncAPI 3. Security schemes, headers, examples, correlation, and protocol bindings remain local because they require BB- or transport-specific values.

The payload **SHOULD** compose `#/components/schemas/CloudEventEnvelope` from the pinned, vendored `govstack-asyncapi-common.yaml` when its constraints fit the BB contract. A BB **MAY** define a local envelope for another stable event-type namespace permitted by [§16.3](16-cloudevents-and-webhooks.md#163-reverse-dns-event-types); the shared envelope constrains `type` to the `global.govstack` namespace. Both choices follow [§17.6](#176-structured-cloudevents-json-payloads). Bare `GovStackAsyncError` messages use `application/json`; CloudEvents wrapping that error under `data` use `application/cloudevents+json`, as described in [§11.6](../part-c/11-errors.md#116-transport-neutral-asynchronous-errors).

**Example (informative).** A local Message Object using the shared envelope:

```yaml
components:
  messages:
    recordCreated:
      contentType: application/cloudevents+json
      payload:
        allOf:
          - $ref: './common/govstack-asyncapi-common.yaml#/components/schemas/CloudEventEnvelope'
          - type: object
            description: Registry-specific event type and domain payload.
            required: [data]
            properties:
              type:
                description: Stable semantic event type.
                const: global.govstack.registry.record.created
              data:
                $ref: '#/components/schemas/RecordCreatedData'
```

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter checks that a payload recognisable as an asynchronous error, or one that references the shared envelope, points at the vendored common schema file. A reviewer checks local message definitions, locally renamed error schemas and whether a message is a rejection.
<!-- verification:end -->

## 17.8 Message headers and idempotency metadata <a href="#178-message-headers-and-idempotency-metadata" id="178-message-headers-and-idempotency-metadata"></a>

<!-- rule-class: M+R -->

GovStack-owned transport/application message headers **MUST NOT** use the `X-` prefix. Structured CloudEvents messages that participate in a distributed trace **MUST** carry the standard CloudEvents distributed-tracing extension attribute `traceparent`. If optional signing is adopted, signature metadata **MUST** follow [§16.6](../part-d/16-cloudevents-and-webhooks.md#166-signature-metadata-when-used). Command-like messages that create resources, move value, or trigger non-idempotent processing **MUST** carry an idempotency key: structured CloudEvents commands **MUST** use `idempotencykey`.

GovStack-owned transport/application message headers **SHOULD** use camelCase. Structured CloudEvents messages that participate in a distributed trace **MAY** also carry `tracestate`; workflow metadata **MAY** use the extension attributes `correlationid` and `causationid`. CloudEvents extension names are lowercase. Transport headers **MAY** mirror these values where broker tooling requires it, but the CloudEvent remains normative. Non-CloudEvents commands **SHOULD** use `idempotencyKey`.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when a header name under a component message's `headers` is not camelCase, which also catches hyphenated `X-` names. A reviewer checks the `traceparent` and idempotency key attributes, signature metadata and which messages are commands.
<!-- verification:end -->

## 17.9 Message localisation headers <a href="#179-message-localisation-headers" id="179-message-localisation-headers"></a>

<!-- rule-class: M+R -->

Message headers used for localisation **MUST** be `acceptLanguage` on inbound command/request messages and `contentLanguage` on outbound localised messages. Stable fields such as identifiers, enum values, timestamps, currency codes, and error codes **MUST NOT** be translated.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when a component message header is a near miss for the localisation names, such as `Accept-Language`, `locale` or `lang`. It does not check direction or that stable fields are left untranslated; a reviewer checks both.
<!-- verification:end -->

## 17.10 Security schemes cover every operation <a href="#1710-security-schemes-cover-every-operation" id="1710-security-schemes-cover-every-operation"></a>

<!-- rule-class: M+R -->

AsyncAPI security schemes **MUST** be declared under `components.securitySchemes` and applied on `servers`, `operations`, or both so every operation is covered. Optional message signing ([§16.5](../part-d/16-cloudevents-and-webhooks.md#165-optional-signed-event-delivery)) is message-level integrity and **MUST NOT** be treated as a substitute for broker, server, or operation authentication.

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

The linter checks that `components.securitySchemes` is non-empty and that every operation has its own `security` or sits only on servers that declare `security`. A reviewer checks that the schemes are appropriate and that signing is not the only protection.
<!-- verification:end -->

## 17.11 Duplicate delivery contract <a href="#1711-duplicate-delivery-contract" id="1711-duplicate-delivery-contract"></a>

<!-- rule-class: R -->

When the selected protocol or deployment can redeliver a message and consumers need to handle duplicates, the operation **SHOULD** document the duplicate-handling contract. For CloudEvents, the default duplicate identity is the pair `source` plus `id`. Protocol QoS, acknowledgement, and redelivery fields **SHOULD** use the applicable AsyncAPI binding when available. Specifications **SHOULD NOT** claim `effectivelyOnce` as a portable transport guarantee.

Specifications **MAY** document application-level idempotency or de-duplication instead of a transport guarantee.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that duplicate handling is documented where the protocol can redeliver, and that `effectivelyOnce` is not claimed as a portable guarantee.
<!-- verification:end -->

## 17.12 Ordering only when promised <a href="#1712-ordering-only-when-promised" id="1712-ordering-only-when-promised"></a>

<!-- rule-class: R -->

Ordering **SHOULD** be documented only when consumers are allowed to rely on it. When ordering is promised, the applicable protocol binding or operation description **SHOULD** identify its scope and key, such as a Kafka partition key or an ordered queue. A specification with no ordering promise does not need a placeholder declaration.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that ordering is described only where consumers may rely on it, and that its scope and key are identified.
<!-- verification:end -->

## 17.13 Public delivery-management capabilities <a href="#1713-public-delivery-management-capabilities" id="1713-public-delivery-management-capabilities"></a>

<!-- rule-class: R -->

Redelivery, dead-letter handling, retention, and replay **SHOULD** be documented when they are part of the public contract available to a consumer. The specification **SHOULD** use the applicable protocol binding, channel configuration, or a linked protocol profile where one exists.

Capabilities that are deployment-internal or unavailable to consumers **MAY** be omitted.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that redelivery, dead-letter handling, retention and replay are documented when consumers can use them.
<!-- verification:end -->

## 17.14 Implementation values in protocol profiles <a href="#1714-implementation-values-in-protocol-profiles" id="1714-implementation-values-in-protocol-profiles"></a>

<!-- rule-class: R -->

Concrete retry counts, backoff intervals, retention periods, replay windows, and dead-letter store settings **SHOULD** live in protocol or implementation profiles unless a value is a stable promise to every conforming consumer. The core cross-BB specification **SHOULD NOT** imply that a broker-specific setting is portable across protocols.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer decides which retry, retention and replay values are stable promises and which belong in a protocol or implementation profile.
<!-- verification:end -->

## 17.15 No universal delivery extensions <a href="#1715-no-universal-delivery-extensions" id="1715-no-universal-delivery-extensions"></a>

<!-- rule-class: R -->

`govstack-asyncapi-common.yaml` does not define universal delivery, ordering, redelivery, dead-letter, retention, or replay extensions. A specification **SHOULD** use standard AsyncAPI bindings first and **SHOULD** state any remaining consumer-visible promise in `description` or a linked protocol profile. The presence of a custom extension alone **SHOULD NOT** be treated as an interoperable delivery contract.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that standard bindings come first and that custom extensions are not presented as an interoperable delivery contract.
<!-- verification:end -->

## 17.16 Async rejection error messages <a href="#1716-async-rejection-error-messages" id="1716-async-rejection-error-messages"></a>

<!-- rule-class: M+R -->

Command-like messages that can be rejected asynchronously **MUST** define a rejection or failure message using `GovStackAsyncError` from [§11.6](../part-c/11-errors.md#116-transport-neutral-asynchronous-errors), not an artificial RFC 9457 HTTP `status`. The error message **MUST** be correlated to the original message using [§17.8](#178-message-headers-and-idempotency-metadata) or an equivalent protocol binding.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when the document has operations but no component message that uses the asynchronous error schema, or when none of those error messages carries a correlation identifier. A reviewer checks which commands can be rejected and that the correlation points at the original message.
<!-- verification:end -->

## 17.17 Declared request-reply correlation <a href="#1717-declared-request-reply-correlation" id="1717-declared-request-reply-correlation"></a>

<!-- rule-class: M+R -->

When request-reply over messaging is used, the AsyncAPI operation **MUST** declare the reply channel or reply address pattern and the correlation mechanism. Fire-and-forget event publication **MUST NOT** pretend to be request-reply.

Request-reply over messaging **MAY** be used where the protocol and use case support it.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

For an operation that declares `reply`, the linter checks it names a reply channel or address and a correlation mechanism (a message `correlationId` or a reply address `location`). A reviewer checks that event publication is not dressed up as request-reply.
<!-- verification:end -->

## 17.18 Correlated completion signals <a href="#1718-correlated-completion-signals" id="1718-correlated-completion-signals"></a>

<!-- rule-class: M+R -->

Long-running asynchronous work triggered by a message **SHOULD** expose completion through either an operation-status message based on the [§15](../part-d/15-asynchronous-operations.md) Operation resource or an operation-completed domain event. The spec **SHOULD** document how clients correlate the completion signal to the initiating message.

<!-- verification:start -->
**Verification:** Review or evidence assessment required. Semantic review is also required.

The linter does not check this rule. A reviewer identifies long-running work triggered by a message and checks that a completion signal exists and that clients can correlate it to the initiating message.
<!-- verification:end -->

## 17.19 Protocol bindings where relevant <a href="#1719-protocol-bindings-where-relevant" id="1719-protocol-bindings-where-relevant"></a>

<!-- rule-class: M+R -->

Protocol bindings **MUST** be present where protocol-specific fields affect interoperability.

At minimum, Kafka-like bindings **SHOULD** declare topic and key semantics; MQTT bindings **SHOULD** declare QoS and retained-message policy; AMQP bindings **SHOULD** declare exchange, queue, and routing-key semantics; WebSocket and SSE bindings **SHOULD** declare connection and message framing. Detailed broker operations remain out of scope ([§1.2](../1-introduction.md#12-scope)).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when a server declares a protocol that uses bindings (for example Kafka, MQTT, AMQP or WebSocket) and a channel has no binding for it. It does not check the fields inside the binding; a reviewer checks topic, key, QoS and similar semantics.
<!-- verification:end -->

## 17.20 Representative message examples <a href="#1720-representative-message-examples" id="1720-representative-message-examples"></a>

<!-- rule-class: M+R -->

AsyncAPI documents **SHOULD** define representative message examples, including headers plus payload where the interaction is not obvious from the schema. Examples for command, event, error, and operation-completion families are especially useful, but filler examples are not required.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when a message under `components.messages` has no `examples`. A reviewer checks that examples show headers and payload where needed and cover the command, event, error and completion families.
<!-- verification:end -->
