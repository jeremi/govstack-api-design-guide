---
description: "Rules governing mechanical conformance verification of BB API specs: schema validation, the GovStack Spectral ruleset, and declared guide-version conformance."
---

# 20. Conformance and validation

{% hint style="info" %}
**Intent.** The contract is mechanically verified.

**Applies to:** Universal. AsyncAPI artifacts have parallel validators (`asyncapi/parser` or AsyncAPI CLI) and Spectral support.
{% endhint %}

## 20.1 Every file passes validation <a href="#201-every-file-passes-validation" id="201-every-file-passes-validation"></a>

**[M]** Every BB OpenAPI file **MUST** pass `openapi-spec-validator`. Every BB AsyncAPI file **MUST** pass an equivalent AsyncAPI parser/validator (e.g., `asyncapi/parser`).

## 20.2 Passes the GovStack Spectral ruleset <a href="#202-passes-the-govstack-spectral-ruleset" id="202-passes-the-govstack-spectral-ruleset"></a>

**[M]** Every BB API spec **MUST** pass the GovStack Spectral ruleset for the machine-checkable rules applicable to its surface. The machine-checkable rules are those tagged `[M]`, together with the mechanical portion of rules tagged `[M+R]` ([§1.9](../1-introduction.md#19-rule-enforcement-classes)). The v0.1 ruleset **MUST** include the OpenAPI rules, CloudEvents event rules, and AsyncAPI documentation rules from [§3](../part-a/3-asyncapi-document-standards.md), [§16](../part-d/16-cloudevents-and-webhooks.md), and [§17](../part-d/17-asyncapi-channel-rules.md). Future protocol profiles may add deeper Kafka, MQTT, AMQP, WebSocket, or SSE rules.

## 20.3 Declared guide conformance version <a href="#203-declared-guide-conformance-version" id="203-declared-guide-conformance-version"></a>

**[M]** Each canonical specification file **MUST** declare the guide version it conforms to via the `info`-level extension `x-govstack-api-guide`: an object with `version` (the guide version targeted, SemVer) and optional `exceptions` (a list of rule IDs, each with a reference to its approved exception record per [§1.6](../1-introduction.md#16-exception-process)). Validation tooling ([§20.2](#202-passes-the-govstack-spectral-ruleset)) selects the matching ruleset version from this declaration. [`[OPEN-20-A]`](../appendix/b-open-questions.md)

## Note on governance <a href="#note-on-governance" id="note-on-governance"></a>

Publication gates, conformance levels, exception handling, transition timelines, and CI implementation are governance questions, proposed for the **GovStack API Lifecycle & Governance** companion document.
