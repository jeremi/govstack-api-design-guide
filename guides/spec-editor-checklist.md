---
description: "A pre-submission checklist of the rules most often missed, grouped by specification type, each item linked to the rule it enforces."
---

# Spec editor checklist

Run this before submitting a BB specification for review. Each item links to the rule that governs it; read the rule if the phrase alone is not enough to act on.

## Every specification

- [ ] `info` has a SemVer `version`, `title`, and useful `description`; add `contact` when the contract is the right place for maintainer metadata. ([2.5](../part-a/2-openapi-document-standards.md#25-complete-info-block), [3.5](../part-a/3-asyncapi-document-standards.md#35-complete-asyncapi-info-block))
- [ ] `servers` is non-empty and meaningful: no `localhost`, no personal machines, no fake production domains; reference specs use parameterised template URLs. ([2.6](../part-a/2-openapi-document-standards.md#26-meaningful-servers-block), [3.6](../part-a/3-asyncapi-document-standards.md#36-servers-channels-operations-and-messages))
- [ ] Every operation has a stable `operationId` (or AsyncAPI operation key), its required contract references, and an accurate `description`; add `summary` and tags when useful for navigation. ([2.7](../part-a/2-openapi-document-standards.md#27-complete-operation-metadata), [3.7](../part-a/3-asyncapi-document-standards.md#37-complete-asyncapi-operation-metadata))
- [ ] Add useful schema descriptions where names and structure do not make semantics clear. ([4.1](../part-a/4-documentation-requirements.md#41-useful-schema-descriptions))
- [ ] Add representative request and response examples where useful; document enum values that are not self-explanatory. ([4.2](../part-a/4-documentation-requirements.md#42-examples-for-bodies-and-enums))
- [ ] No placeholder text anywhere: no `TBD`, no `Lorem ipsum`, no `a, b, c`, no leftover content copied from another BB. ([4.3](../part-a/4-documentation-requirements.md#43-no-placeholder-text))
- [ ] Canonical surfaces are discoverable at the default paths or through a valid `api/index.yaml`; `api/coverage.yaml` exactly traces every marked functional requirement to an operation, message, external contract, rationale, or tracked plan. ([4.5](../part-a/4-documentation-requirements.md#45-api-surface-inventory), [4.6](../part-a/4-documentation-requirements.md#46-functional-requirement-traceability))
- [ ] A security scheme is declared and applied to every operation by default, with per-operation overrides explicit. ([13.1](../part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation))
- [ ] `info.x-govstack-api-guide` pins exact guide and ruleset versions (`0.1.0-draft`) and every exception has all seven §20.3 fields: `rule`, `scope`, `rationale`, `record`, `reviewedBy`, `reviewedAt`, and `expiresAt`. ([20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version))
- [ ] The file passes its validator (see [Validating your spec](../guides/validating-your-spec.md)). ([20.1](../part-e/20-conformance-and-validation.md#201-every-file-passes-validation))
- [ ] `info.version` follows SemVer. ([18.1](../part-d/18-compatibility-and-lifecycle.md#181-semver-versioning))
- [ ] GovStack-owned JSON field names use the recommended `camelCase` convention consistently; fields imported from an external standard retain their standard spelling. ([9.2](../part-c/9-json-conventions-and-naming.md#92-camelcase-field-names))
- [ ] Resource identifiers are opaque, server-generated strings; citizen records are never referred to by a personal identifier in a URL. ([10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers))

## REST surfaces (OpenAPI 3.1)

- [ ] The file declares a qualified OpenAPI 3.1 patch (`3.1.0`, `3.1.1`, or `3.1.2` for guide/ruleset `0.1.0-draft`). ([2.1](../part-a/2-openapi-document-standards.md#21-openapi-31-required))
- [ ] The canonical entrypoint is at the default `api/openapi.yaml` path or is listed in `api/index.yaml`; no legacy `api/swagger.yaml` or JSON copy is treated as canonical. ([2.2](../part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint))
- [ ] Security schemes, parameters, headers, responses, examples, and Operation resources are local. If the four shared OpenAPI schemas are reused, the common file is vendored and version-pinned. ([2.8](../part-a/2-openapi-document-standards.md#28-conditional-vendored-openapi-schemas))
- [ ] Every non-local server and webhook URL uses HTTPS, and OAuth declarations follow the RFC 9700 baseline: authorization code plus PKCE, no password or implicit grant, access tokens rather than ID Tokens. ([13.2](../part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations), [13.7](../part-d/13-authentication-and-authorisation.md#137-protected-transport))
- [ ] The major version appears in the URL path (`/v{N}/...`). ([5.1](../part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path))
- [ ] `/health` is unversioned, declares both `200` and `503`, returns `application/json` on `200`, and carries no citizen authentication. ([5.9](../part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint))
- [ ] Only the standard unversioned endpoints sit outside `/v{N}/`, and none of them declares a mutating method. ([5.10](../part-b/5-url-structure-and-versioning.md#510-standard-unversioned-endpoints))
- [ ] No bulk-mutating or bulk-deleting operation can run against an entire collection with no selection parameter. ([6.7](../part-b/6-http-methods.md#67-bulk-mutation-needs-explicit-selection))
- [ ] Every operation declares every status code it can actually return; no operation declares only `200`. ([7.14](../part-b/7-http-status-codes.md#714-all-status-codes-declared))
- [ ] Input operations declare `400`; secured operations declare applicable `401`/`403`; resource operations declare `404`; conflict-capable operations declare `409`; every operation declares `500`. Creation completed now is `201`, while accepted work is `202` plus an Operation. ([7.2](../part-b/7-http-status-codes.md#72-201-created-with-location)–[7.14](../part-b/7-http-status-codes.md#714-all-status-codes-declared))
- [ ] Every successful response body declares a concrete media type and schema; `204` declares no content. ([7.21](../part-b/7-http-status-codes.md#721-schemas-for-successful-response-bodies))
- [ ] Cross-service operations declare W3C `traceparent` and optional `tracestate`; error `traceId` maps to the W3C trace-id. ([8.4](../part-b/8-headers.md#84-w3c-trace-context-correlation))
- [ ] Error responses use `application/problem+json` (RFC 9457), use `https://govstack.global/problems/{bb-code}/{problem-slug}` as the sole machine identifier, and include `traceId`. They do not add `code` or `timestamp`. ([11.1](../part-c/11-errors.md#111-rfc-9457-problem-details)–[11.3](../part-c/11-errors.md#113-trace-identifier))
- [ ] Collection endpoints paginate, cursor pagination (`pageSize`, opaque `cursor`) is the default, and `pageInfo.nextCursor` alone indicates whether another page exists. ([12.1](../part-c/12-pagination-filtering-sorting.md#121-collections-must-paginate)–[12.3](../part-c/12-pagination-filtering-sorting.md#123-cursor-pagination-envelope))
- [ ] Every `202` response returns an Operation using a local schema with an opaque string ID and documented terminal, non-terminal, result, error, polling, and cancellation semantics. ([15.1](../part-d/15-asynchronous-operations.md#151-202-with-operation-location)–[15.3](../part-d/15-asynchronous-operations.md#153-documented-operation-lifecycle))
- [ ] Non-idempotent POST endpoints (creation, payment, submission, subscription, job start) accept an `Idempotency-Key` header. ([14.1](../part-d/14-idempotency.md#141-idempotency-key-on-non-idempotent-posts))
- [ ] The major version is visible in the surface contract, and deprecated endpoints return `Deprecation` and `Sunset` headers. ([18.2](../part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel), [18.5](../part-d/18-compatibility-and-lifecycle.md#185-deprecation-and-sunset-headers))

## Event-driven surfaces (CloudEvents / AsyncAPI 3.0)

- [ ] The file declares `asyncapi: 3.0.0` and lives at the default `api/asyncapi.yaml` path or is listed in `api/index.yaml`. ([3.1](../part-a/3-asyncapi-document-standards.md#31-asyncapi-300-required), [3.2](../part-a/3-asyncapi-document-standards.md#32-one-canonical-asyncapi-entrypoint))
- [ ] Every domain event conforms to the CloudEvents envelope (`specversion`, `id`, `source`, `type`, domain payload under `data`). ([16.2](../part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required))
- [ ] Event `type` values follow the reverse-DNS convention. ([16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types))
- [ ] Logical channel IDs follow the versioned reverse-DNS convention, while Channel Object addresses use protocol-native syntax and bindings document the mapping. ([17.2](../part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses))
- [ ] No logical channel ID, native address, topic, queue name, routing key, or channel parameter carries personal data. ([17.3](../part-d/17-asyncapi-channel-rules.md#173-no-personal-data-in-channels))
- [ ] Delivery, duplicate-handling, ordering, retention, and replay behaviour is documented only where consumers may rely on it, using standard protocol bindings where available. ([17.11](../part-d/17-asyncapi-channel-rules.md#1711-duplicate-delivery-contract)–[17.15](../part-d/17-asyncapi-channel-rules.md#1715-no-universal-delivery-extensions))
- [ ] Add representative message examples where the schema alone does not make the interaction clear. ([17.20](../part-d/17-asyncapi-channel-rules.md#1720-representative-message-examples))

Ticking every box above is the human half of conformance. See [Validating your spec](../guides/validating-your-spec.md) for the mechanical half.
