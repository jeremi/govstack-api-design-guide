---
description: "Rules governing the canonical AsyncAPI document: version, location, validation, metadata, and vendored shared components."
---

# 3. AsyncAPI document standards

{% hint style="info" %}
**Intent.** Event-driven BB surfaces other than HTTP push webhooks have the same level of discoverability and mechanical validity as REST surfaces. Implementers must be able to identify each canonical AsyncAPI artifact, validate it, and understand which CloudEvents messages the BB sends or receives.

**Applies to:** AsyncAPI surface.
{% endhint %}

## 3.1 AsyncAPI 3.0.0 required <a href="#31-asyncapi-300-required" id="31-asyncapi-300-required"></a>

**[M]** An event-driven BB surface other than HTTP push webhooks **MUST** be documented in AsyncAPI 3 and **MUST** declare an explicit, published AsyncAPI 3 version qualified by the pinned GovStack ruleset. Guide and ruleset version `0.1.0-draft` qualify `asyncapi: 3.0.0` and `asyncapi: 3.1.0`; every rule in this guide applies identically to both. AsyncAPI 2.x and earlier **MUST NOT** be used for new GovStack event-driven surfaces. A later AsyncAPI version **MUST NOT** be used until a GovStack guide and ruleset version explicitly qualifies it.

## 3.2 One canonical AsyncAPI entrypoint <a href="#32-one-canonical-asyncapi-entrypoint" id="32-one-canonical-asyncapi-entrypoint"></a>

**[M+R]** In the absence of `api/index.yaml`, the canonical AsyncAPI entrypoint **MUST** be located at `api/asyncapi.yaml`, in YAML. It **MAY** `$ref`-compose other repository files provided every reference resolves. A BB with a custom canonical path or multiple independently versioned event-driven surfaces **MUST** enumerate every surface in `api/index.yaml` using [§4.5](../part-a/4-documentation-requirements.md#45-api-surface-inventory). Either discovery form **MUST** identify exactly one canonical artifact per surface.

## 3.3 No divergent AsyncAPI copies <a href="#33-no-divergent-asyncapi-copies" id="33-no-divergent-asyncapi-copies"></a>

**[R]** Other locations (`spec/.gitbook/assets/`, alternative filenames, JSON copies) **MUST NOT** contain divergent AsyncAPI copies. Event snippets in markdown documentation **MUST** load by reference from a canonical file, not duplicate it.

An operation-free shared component library under `api/common/` is referenced support material, not a canonical API surface or a divergent copy.

## 3.4 Passes an AsyncAPI validator <a href="#34-passes-an-asyncapi-validator" id="34-passes-an-asyncapi-validator"></a>

**[M]** The file **MUST** pass an AsyncAPI 3.0 parser/validator (for example, `@asyncapi/parser` or the AsyncAPI CLI).

## 3.5 Complete AsyncAPI info block <a href="#35-complete-asyncapi-info-block" id="35-complete-asyncapi-info-block"></a>

**[M]** The `info` block of each canonical AsyncAPI file **MUST** include `title`, `version` (SemVer), `description`, and `contact`.

## 3.6 Servers channels operations and messages <a href="#36-servers-channels-operations-and-messages" id="36-servers-channels-operations-and-messages"></a>

**[M+R]** The file **MUST** declare non-empty `servers`, `channels`, `operations`, and `components.messages`. A document with only schemas and no operations is not an API contract. AsyncAPI `servers` **MUST** describe the intended broker or transport endpoint pattern using AsyncAPI 3.0 server fields (`host`, `protocol`, optional `pathname`, variables, security, and protocol bindings). Reference specifications that are not tied to a live broker **SHOULD** use parameterised server hosts and variables (for example, `host: "{brokerHost}"` with `protocol: mqtt`, `protocol: amqp`, `protocol: kafka`, or `protocol: wss`). Server definitions **MUST NOT** point to `localhost`, personal developer machines, undocumented placeholders, or fake production brokers. Reserved documentation domains **MAY** be used only as variable defaults or examples, and **MUST** be labelled as non-production.

## 3.7 Complete AsyncAPI operation metadata <a href="#37-complete-asyncapi-operation-metadata" id="37-complete-asyncapi-operation-metadata"></a>

**[M+R]** Every AsyncAPI operation **MUST** include an operation identifier (the key under `operations`), `action` (`send` or `receive`), `summary`, `description`, at least one `tag`, a referenced `channel`, and at least one referenced message. In AsyncAPI 3.0, root-level operation `messages` **MUST** reference message entries defined on the operation's referenced channel. Channel message entries **MAY** in turn reference reusable message definitions under `components.messages`. [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads)–[§17.7](../part-d/17-asyncapi-channel-rules.md#177-shared-cloudevents-envelope-schema) define which domain messages use CloudEvents and how asynchronous rejection messages reuse the common error schema.

## 3.8 Pinned vendored AsyncAPI components <a href="#38-pinned-vendored-asyncapi-components" id="38-pinned-vendored-asyncapi-components"></a>

**[M]** A BB that documents GovStack domain events **MUST** reference `CloudEventEnvelope` from a pinned version of `govstack-asyncapi-common.yaml`. A BB that documents asynchronous rejections **MUST** reference `GovStackAsyncError`, and **MUST** reuse `AsyncFieldError` when it exposes field-level errors. The common file **MUST** be vendored locally at `api/common/govstack-asyncapi-common.yaml`, and the pinned version **MUST** be explicit. BB specifications own their Message Objects, security schemes, headers, examples, and protocol bindings because those objects require BB- and transport-specific values.

## 3.9 JSON Schema payload conventions <a href="#39-json-schema-payload-conventions" id="39-json-schema-payload-conventions"></a>

**[M]** AsyncAPI documents **MUST** use JSON Schema compatible with AsyncAPI 3.0 for payload schemas and **MUST** follow the JSON conventions in [§9](../part-c/9-json-conventions-and-naming.md) and [§10](../part-c/10-data-types-and-formats.md) for GovStack-owned payload fields.
