---
description: "A pre-submission checklist of the rules most often missed, grouped by specification type, each item linked to the rule it enforces."
---

# Spec editor checklist

Run this before submitting a BB specification for review. Each item links to the rule that governs it; read the rule if the phrase alone is not enough to act on.

## Every specification

- [ ] `info` block is complete: SemVer `version`, `title`, `description`, and `contact` are all present. ([2.5](../part-a/2-openapi-document-standards.md#25-complete-info-block), [3.5](../part-a/3-asyncapi-document-standards.md#35-complete-asyncapi-info-block))
- [ ] `servers` is non-empty and meaningful: no `localhost`, no personal machines, no fake production domains; reference specs use parameterised template URLs. ([2.6](../part-a/2-openapi-document-standards.md#26-meaningful-servers-block), [3.6](../part-a/3-asyncapi-document-standards.md#36-servers-channels-operations-and-messages))
- [ ] Every operation has complete metadata: an `operationId` (or AsyncAPI operation key), `summary`, `description`, and at least one `tag`. ([2.7](../part-a/2-openapi-document-standards.md#27-complete-operation-metadata), [3.7](../part-a/3-asyncapi-document-standards.md#37-complete-asyncapi-operation-metadata))
- [ ] Every schema has a `description`. ([4.1](../part-a/4-documentation-requirements.md#41-every-schema-described))
- [ ] Every request and response body has at least one `example`; every `enum` documents what its values mean. ([4.2](../part-a/4-documentation-requirements.md#42-examples-for-bodies-and-enums))
- [ ] No placeholder text anywhere: no `TBD`, no `Lorem ipsum`, no `a, b, c`, no leftover content copied from another BB. ([4.3](../part-a/4-documentation-requirements.md#43-no-placeholder-text))
- [ ] A security scheme is declared and applied to every operation by default, with per-operation overrides explicit. ([13.1](../part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation))
- [ ] The file passes its validator (see [Validating your spec](../guides/validating-your-spec.md)). ([20.1](../part-e/20-conformance-and-validation.md#201-every-file-passes-validation))
- [ ] `info.version` follows SemVer. ([18.1](../part-d/18-compatibility-and-lifecycle.md#181-semver-versioning))
- [ ] JSON field names are `camelCase`, applied consistently; check the [carve-outs](../part-c/9-json-conventions-and-naming.md#carve-out-from-92) before flagging fields imported from an external standard (RFC 9457, CloudEvents) as violations. ([9.2](../part-c/9-json-conventions-and-naming.md#92-camelcase-field-names))
- [ ] Resource identifiers are opaque, server-generated strings; citizen records are never referred to by a personal identifier in a URL. ([10.1](../part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers))

## REST surfaces (OpenAPI 3.1)

- [ ] The file declares `openapi: 3.1.0`. ([2.1](../part-a/2-openapi-document-standards.md#21-openapi-310-required))
- [ ] The canonical entrypoint is at `api/openapi.yaml`, not `api/swagger.yaml` or a JSON copy. ([2.2](../part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint))
- [ ] The major version appears in the URL path (`/v{N}/...`). ([5.1](../part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path))
- [ ] `/health` is unversioned, uses `application/health+json`, and carries no citizen authentication. ([5.9](../part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint))
- [ ] No bulk-mutating or bulk-deleting operation can run against an entire collection with no selection parameter. ([6.7](../part-b/6-http-methods.md#67-bulk-mutation-needs-explicit-selection))
- [ ] Every operation declares every status code it can actually return; no operation declares only `200`. ([7.14](../part-b/7-http-status-codes.md#714-all-status-codes-declared))
- [ ] Error responses use `application/problem+json` (RFC 9457) with `code`, `traceId`, and `timestamp` present alongside the standard fields. ([11.1](../part-c/11-errors.md#111-rfc-9457-problem-details), [11.3](../part-c/11-errors.md#113-govstack-error-extension-fields))
- [ ] Collection endpoints paginate, and cursor pagination (`pageSize`, opaque `cursor`) is the default. ([12.1](../part-c/12-pagination-filtering-sorting.md#121-collections-must-paginate), [12.2](../part-c/12-pagination-filtering-sorting.md#122-cursor-pagination-by-default))
- [ ] Non-idempotent POST endpoints (creation, payment, submission, subscription, job start) accept an `Idempotency-Key` header. ([14.1](../part-d/14-idempotency.md#141-idempotency-key-on-non-idempotent-posts))
- [ ] The major version is visible in the surface contract, and deprecated endpoints return `Deprecation` and `Sunset` headers. ([18.2](../part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel), [18.5](../part-d/18-compatibility-and-lifecycle.md#185-deprecation-and-sunset-headers))

## Event-driven surfaces (CloudEvents / AsyncAPI 3.0)

- [ ] The file declares `asyncapi: 3.0.0` and lives at `api/asyncapi.yaml`. ([3.1](../part-a/3-asyncapi-document-standards.md#31-asyncapi-300-required), [3.2](../part-a/3-asyncapi-document-standards.md#32-one-canonical-asyncapi-entrypoint))
- [ ] Every domain event conforms to the CloudEvents envelope (`specversion`, `id`, `source`, `type`, domain payload under `data`). ([16.2](../part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required))
- [ ] Event `type` values follow the reverse-DNS convention. ([16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types))
- [ ] Channel addresses follow the reverse-DNS convention. ([17.2](../part-d/17-asyncapi-channel-rules.md#172-reverse-dns-channel-addresses))
- [ ] No channel address, topic, queue name, routing key, or channel parameter carries personal data. ([17.3](../part-d/17-asyncapi-channel-rules.md#173-no-personal-data-in-channels))
- [ ] Every operation documents its delivery guarantee, ordering guarantee, and supported delivery-management capabilities. ([17.11](../part-d/17-asyncapi-channel-rules.md#1711-documented-delivery-guarantees)–[17.13](../part-d/17-asyncapi-channel-rules.md#1713-declared-delivery-management-capabilities))
- [ ] Every message has an example. ([17.20](../part-d/17-asyncapi-channel-rules.md#1720-examples-for-every-message))

Ticking every box above is the human half of conformance. See [Validating your spec](../guides/validating-your-spec.md) for the mechanical half.
