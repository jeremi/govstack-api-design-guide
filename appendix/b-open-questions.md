---
description: "Consolidated list of open committee questions referenced inline throughout the guide."
---

# Appendix B. Open questions (consolidated)

The questions below are genuine committee decisions. Each appears inline as `[OPEN-N-X]` next to the relevant rule.

The **Blocks v1.0?** column marks the questions whose answers shape the shared `govstack-openapi-common.yaml` / `govstack-asyncapi-common.yaml` artifacts or every BB's URL surface; these need a committee decision before v1.0 ratification. The rest can be settled during the v1.0 drafting cycle without blocking pilot work.

| ID | Topic | Default | Section | Blocks v1.0? |
|---|---|---|---|---|
| OPEN-4-A | BB code in URL path | No (rely on `servers` URL or mediator routing) | [§5](../part-b/5-url-structure-and-versioning.md) | Yes |
| OPEN-4-C | Path nesting depth: soft cap of two levels under `/v{N}/` | Keep as SHOULD with the soft cap | [§5.4](../part-b/5-url-structure-and-versioning.md#54-shallow-path-nesting) | No |
| OPEN-6-A | 400 vs 422 boundary | Keep both (400 unparseable, 422 semantic) | [§7](../part-b/7-http-status-codes.md) | No |
| OPEN-10-A | Error code shape: reverse-DNS named code vs reverse-DNS numeric code vs shorter BB-prefixed code | Reverse-DNS named code: `global.govstack.{bb-code}.{error-name}` | [§11.5](../part-c/11-errors.md#115-namespaced-stable-error-codes) | Yes |
| OPEN-10-B | Common error catalogue: which canonical errors to include | The `google.rpc.Code` set mapped to reverse-DNS GovStack codes | [§11.7](../part-c/11-errors.md#117-common-error-catalogue) | Yes |
| OPEN-12-A | OAuth scope syntax: `bb:{bb-code}:{resource}:{action}` vs reverse-DNS vs `resource.action` | `bb:` prefix for namespacing; reverse-DNS is the alternative | [§13.4](../part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | Yes |
| OPEN-14-A | Operation resource: GovStack-local shape vs strict Google AIP-151 mirror | AIP-151-aligned hybrid; strict AIP-151 is the alternative | [§15.2](../part-d/15-asynchronous-operations.md#152-shared-operation-resource-shape)–[15.3](../part-d/15-asynchronous-operations.md#153-fixed-operation-status-enum) | Yes |
| OPEN-15-B | Event `type` naming convention | `global.govstack.{bb-code}.{resource}.{action}` | [§16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types) | No |
| OPEN-15-H | Event-signature verification inputs the guide does not yet supply: how a subscriber discovers the verification key that the JWS `kid` selects on transports with no subscription control plane, and what replay window a receiver enforces | Per-subscription key exchange via [§16.11](../part-d/16-cloudevents-and-webhooks.md#1611-subscription-management-interfaces) where a control plane exists, plus a published key set for brokered and stream transports; a single default replay window stated in the guide rather than per BB | [§16.8](../part-d/16-cloudevents-and-webhooks.md#168-pinned-signature-profile), [§16.9](../part-d/16-cloudevents-and-webhooks.md#169-operational-signing-concerns-out-of-scope) | Yes |
| OPEN-15-E | CloudEvents binding style for AsyncAPI | Structured CloudEvents JSON payload | [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) | No |
| OPEN-15-F | AsyncAPI protocol-binding depth | Require bindings where they affect interoperability; future profiles may add deeper broker-specific rules | [§17.19](../part-d/17-asyncapi-channel-rules.md#1719-protocol-bindings-where-relevant) | No |
| OPEN-15-G | GovStack AsyncAPI extension names and schemas | Define in `govstack-asyncapi-common.yaml` | [§17.15](../part-d/17-asyncapi-channel-rules.md#1715-machine-readable-delivery-extensions) | No |
| OPEN-16-A | AsyncAPI deprecation metadata | `x-govstack-deprecated` with `since`, `sunset`, `replacement`, `reason` | [§18.7](../part-d/18-compatibility-and-lifecycle.md#187-asyncapi-deprecation-metadata) | No |
| OPEN-17-A | Mandated language coverage | Per BB | [§19](../part-e/19-localisation.md) | No |
| OPEN-9-A | BB-code register: where the canonical register of BB codes lives and who assigns them | Propose in the Lifecycle & Governance companion; until then, agree codes through the API Working Group | [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | No |

## Resolved in `0.2.0-draft`

The identifiers below remain frozen for discussion-history links, but they are no longer open design choices.

| ID | Resolution | Section |
|---|---|---|
| OPEN-4-B | Use the simpler local shape, not `draft-inadarei-api-health-check` (an expired Internet-Draft that never became an RFC). Health is carried by the status code, `200` or `503`; the `200` body is `application/json`, minimal, and informational. | [§5.9](../part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint) |
| OPEN-7-A | Use W3C `traceparent` / `tracestate`; do not introduce `X-Request-Id` as the cross-BB standard. | [§8.4–8.5](../part-b/8-headers.md#84-w3c-trace-context-correlation) |
| OPEN-7-B | Pin the Structured Field `RateLimit` / `RateLimit-Policy` form from draft revision 11; the legacy three-field form is not draft-conformant. | [§8.7](../part-b/8-headers.md#87-rate-limit-headers-declared) |
| OPEN-15-C | Use HTTP `GovStack-Signature` and camelCase AsyncAPI metadata `govstackSignature`, unless a protocol binding supplies a standard field. | [§16.6](../part-d/16-cloudevents-and-webhooks.md#166-govstack-signature-header) |
| OPEN-15-D | Put the reverse-DNS GovStack name and major version in the logical AsyncAPI channel ID; keep `address` protocol-native. | [§17.2](../part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses) |
| OPEN-15-A | Use detached JWS with `ES256` over the RFC 8785-canonicalized structured CloudEvent, using RFC 7515 detached-content semantics rather than RFC 7797 unencoded payloads. This drops the v0.1 option of an HMAC fallback for constrained deployments. This item was marked **Blocks v1.0? Yes**, so this resolution in particular needs explicit committee ratification. | [§16.5](../part-d/16-cloudevents-and-webhooks.md#165-signed-event-delivery), [§16.8](../part-d/16-cloudevents-and-webhooks.md#168-pinned-signature-profile) |
| OPEN-20-A | Pin exact `version` and `rulesetVersion`; exceptions carry scoped rationale, HTTPS evidence, approving authority, review date, and expiry using the exact fields in §20.3. | [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) |

**A note on identifiers.** The `OPEN-N-X` identifiers are frozen from the circulated v0.1 draft and predate the v0.2 section renumbering: the `N` in an identifier refers to the v0.1 section number and is treated as an opaque label, so existing feedback threads stay valid. The Section column shows current section numbers. Questions added in v0.2 or later use current numbering (`OPEN-9-A`, `OPEN-20-A`). The old-to-new section mapping is on [How to use this guide](../how-to-use-this-guide.md).

Governance-side open questions (ratification process, enforcement actor, exception lifecycle, deviation board) are proposed for the **GovStack API Lifecycle & Governance** companion document, not here.
