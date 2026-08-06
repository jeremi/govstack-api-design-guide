---
description: "Consolidated list of open committee questions referenced inline throughout the guide."
---

# Appendix B. Open questions (consolidated)

The questions below are genuine committee decisions. Each appears inline as `[OPEN-N-X]` next to the relevant rule.

The **Blocks v1.0?** column marks the questions whose answers shape the baseline shared schemas or every BB's URL surface; these need a committee decision before v1.0 ratification. The rest can be settled during the v1.0 drafting cycle without blocking pilot work.

| ID | Topic | Default | Section | Blocks v1.0? |
|---|---|---|---|---|
| OPEN-5-A | BB code in URL path | No (rely on `servers` URL or mediator routing) | [§5](../part-b/5-url-structure-and-versioning.md) | Yes |
| OPEN-5-B | Path nesting depth: soft cap of two levels under `/v{N}/` | Keep as SHOULD with the soft cap | [§5.4](../part-b/5-url-structure-and-versioning.md#54-shallow-path-nesting) | No |
| OPEN-7-A | 400 vs 422 boundary | Keep both (400 unparseable, 422 semantic) | [§7](../part-b/7-http-status-codes.md) | No |
| OPEN-13-A | OAuth scope syntax: `bb:{bb-code}:{resource}:{action}` vs reverse-DNS vs `resource.action` | `bb:` prefix for namespacing; reverse-DNS is the alternative | [§13.4](../part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | Yes |
| OPEN-16-A | Event `type` naming convention | `global.govstack.{bb-code}.{resource}.{action}` | [§16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types) | No |
| OPEN-17-A | CloudEvents binding style for AsyncAPI | Structured CloudEvents JSON payload | [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) | No |
| OPEN-17-B | AsyncAPI protocol-binding depth | Require bindings where they affect interoperability; future profiles may add deeper broker-specific rules | [§17.19](../part-d/17-asyncapi-channel-rules.md#1719-protocol-bindings-where-relevant) | No |
| OPEN-18-A | AsyncAPI deprecation metadata | `x-govstack-deprecated` with `since`, `sunset`, `replacement`, `reason` | [§18.7](../part-d/18-compatibility-and-lifecycle.md#187-asyncapi-deprecation-metadata) | No |
| OPEN-19-A | Mandated language coverage | Per BB | [§19](../part-e/19-localisation.md) | No |
| OPEN-9-A | BB-code register: where the canonical register of BB codes lives and who assigns them | Propose in the Lifecycle & Governance companion; until then, agree codes through the API Working Group | [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | No |

Governance-side open questions (ratification process, enforcement actor, exception lifecycle, deviation board) are proposed for the **GovStack API Lifecycle & Governance** companion document, not here.
