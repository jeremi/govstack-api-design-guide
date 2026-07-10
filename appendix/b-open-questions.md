---
description: "Consolidated list of open committee questions referenced inline throughout the guide."
---

# Appendix B. Open questions (consolidated)

The questions below are genuine committee decisions. Each appears inline as `[OPEN-N-X]` next to the relevant rule.

The **Blocks v1.0?** column marks the questions whose answers shape the shared `govstack-openapi-common.yaml` / `govstack-asyncapi-common.yaml` artifacts or every BB's URL surface; these need a committee decision before v1.0 ratification. The rest can be settled during the v1.0 drafting cycle without blocking pilot work.

| ID | Topic | Default | Section | Blocks v1.0? |
|---|---|---|---|---|
| OPEN-4-A | BB code in URL path | No (rely on `servers` URL or mediator routing) | [§5](../part-b/5-url-structure-and-versioning.md) | Yes |
| OPEN-4-B | Health endpoint shape: align with `draft-inadarei-api-health-check`, or use a simpler local shape | Align with the draft | [§5.9](../part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint) | No |
| OPEN-4-C | Path nesting depth: soft cap of two levels under `/v{N}/` | Keep as SHOULD with the soft cap | [§5.4](../part-b/5-url-structure-and-versioning.md#54-shallow-path-nesting) | No |
| OPEN-6-A | 400 vs 422 boundary | Keep both (400 unparseable, 422 semantic) | [§7](../part-b/7-http-status-codes.md) | No |
| OPEN-7-A | RFC 6648 migration of `X-Request-Id` | Retain `X-Request-Id`; strict 6648 rename is the alternative | [§8.4](../part-b/8-headers.md#84-x-request-id-correlation)–[8.5](../part-b/8-headers.md#85-no-new-x--prefixed-headers) | No |
| OPEN-7-B | RateLimit header form: three-header variant vs structured-field form from current IETF draft | Three-header variant in v0.1; re-pick in v1.0 once the draft stabilises | [§8.7](../part-b/8-headers.md#87-rate-limit-headers-declared) | No |
| OPEN-10-A | Error code shape: reverse-DNS named code vs reverse-DNS numeric code vs shorter BB-prefixed code | Reverse-DNS named code: `org.govstack.{bb-code}.{error-name}` | [§11.5](../part-c/11-errors.md#115-namespaced-stable-error-codes) | Yes |
| OPEN-10-B | Common error catalogue: which canonical errors to include | The `google.rpc.Code` set mapped to reverse-DNS GovStack codes | [§11.7](../part-c/11-errors.md#117-common-error-catalogue) | Yes |
| OPEN-12-A | OAuth scope syntax: `bb:{bb-code}:{resource}:{action}` vs reverse-DNS vs `resource.action` | `bb:` prefix for namespacing; reverse-DNS is the alternative | [§13.4](../part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | Yes |
| OPEN-14-A | Operation resource: GovStack-local shape vs strict Google AIP-151 mirror | AIP-151-aligned hybrid; strict AIP-151 is the alternative | [§15.2](../part-d/15-asynchronous-operations.md#152-shared-operation-resource-shape)–[15.3](../part-d/15-asynchronous-operations.md#153-fixed-operation-status-enum) | Yes |
| OPEN-15-A | Event signature scheme: detached JWS over canonicalised structured CloudEvents JSON vs HMAC-SHA256 | Detached JWS, with HMAC allowed only as a governed deployment fallback | [§16.5](../part-d/16-cloudevents-and-webhooks.md#165-signed-event-delivery), [§16.8](../part-d/16-cloudevents-and-webhooks.md#168-pinned-signature-profile) | Yes |
| OPEN-15-B | Event `type` naming convention | `org.govstack.{bb-code}.{resource}.{action}` | [§16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types) | No |
| OPEN-15-C | Event signature metadata name: `GovStack-Signature` vs other | `GovStack-Signature` (RFC 6648 compliant, namespaced) | [§16.6](../part-d/16-cloudevents-and-webhooks.md#166-govstack-signature-header) | No |
| OPEN-15-D | AsyncAPI channel naming | `org.govstack.{bb-code}.v{major}.{resource}.{event}` | [§17.2](../part-d/17-asyncapi-channel-rules.md#172-reverse-dns-channel-addresses) | No |
| OPEN-15-E | CloudEvents binding style for AsyncAPI | Structured CloudEvents JSON payload | [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) | No |
| OPEN-15-F | AsyncAPI protocol-binding depth | Require bindings where they affect interoperability; future profiles may add deeper broker-specific rules | [§17.19](../part-d/17-asyncapi-channel-rules.md#1719-protocol-bindings-where-relevant) | No |
| OPEN-15-G | GovStack AsyncAPI extension names and schemas | Define in `govstack-asyncapi-common.yaml` | [§17.15](../part-d/17-asyncapi-channel-rules.md#1715-machine-readable-delivery-extensions) | No |
| OPEN-16-A | AsyncAPI deprecation metadata | `x-govstack-deprecated` with `since`, `sunset`, `replacement`, `reason` | [§18.7](../part-d/18-compatibility-and-lifecycle.md#187-asyncapi-deprecation-metadata) | No |
| OPEN-17-A | Mandated language coverage | Per BB | [§19](../part-e/19-localisation.md) | No |
| OPEN-9-A | BB-code register: where the canonical register of BB codes lives and who assigns them | Propose in the Lifecycle & Governance companion; until then, agree codes through the API Working Group | [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | No |
| OPEN-20-A | Guide-version declaration: shape of the `x-govstack-api-guide` extension and its exception-record references | As drafted in §20.3 | [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) | No |

**A note on identifiers.** The `OPEN-N-X` identifiers are frozen from the circulated v0.1 draft and predate the v0.2 section renumbering: the `N` in an identifier refers to the v0.1 section number and is treated as an opaque label, so existing feedback threads stay valid. The Section column shows current section numbers. Questions added in v0.2 or later use current numbering (`OPEN-9-A`, `OPEN-20-A`). The old-to-new section mapping is on [How to use this guide](../how-to-use-this-guide.md).

Governance-side open questions (ratification process, enforcement actor, exception lifecycle, deviation board) are proposed for the **GovStack API Lifecycle & Governance** companion document, not here.
