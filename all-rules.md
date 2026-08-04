---
description: "Every rule in the guide: enforcement class, RFC 2119 strength, surface, and a link."
---

# Rules at a glance

This page is generated from the section pages by `tools/build_rules_index.py`; do not edit it by hand. Class legend: `[M]` machine-checkable, `[R]` review, `[M+R]` both; see [§1.9](1-introduction.md#19-rule-enforcement-classes).

## 2. OpenAPI document standards

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [2.1](part-a/2-openapi-document-standards.md#21-openapi-31-required) | M | MUST | OpenAPI | OpenAPI 3.1 required |
| [2.2](part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint) | M+R | MUST | OpenAPI | One canonical OpenAPI entrypoint |
| [2.3](part-a/2-openapi-document-standards.md#23-no-divergent-openapi-copies) | R | MUST | OpenAPI | No divergent OpenAPI copies |
| [2.4](part-a/2-openapi-document-standards.md#24-passes-openapi-spec-validator) | M | MUST | OpenAPI | Passes openapi-spec-validator |
| [2.5](part-a/2-openapi-document-standards.md#25-complete-info-block) | M | MUST | OpenAPI | Complete info block |
| [2.6](part-a/2-openapi-document-standards.md#26-meaningful-servers-block) | M+R | MUST | OpenAPI | Meaningful servers block |
| [2.7](part-a/2-openapi-document-standards.md#27-complete-operation-metadata) | M+R | MUST | OpenAPI | Complete operation metadata |
| [2.8](part-a/2-openapi-document-standards.md#28-pinned-vendored-common-components) | M | MUST | OpenAPI | Pinned vendored common components |

## 3. AsyncAPI document standards

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [3.1](part-a/3-asyncapi-document-standards.md#31-asyncapi-300-required) | M | MUST | AsyncAPI | AsyncAPI 3.0.0 required |
| [3.2](part-a/3-asyncapi-document-standards.md#32-one-canonical-asyncapi-entrypoint) | M+R | MUST | AsyncAPI | One canonical AsyncAPI entrypoint |
| [3.3](part-a/3-asyncapi-document-standards.md#33-no-divergent-asyncapi-copies) | R | MUST | AsyncAPI | No divergent AsyncAPI copies |
| [3.4](part-a/3-asyncapi-document-standards.md#34-passes-an-asyncapi-validator) | M | MUST | AsyncAPI | Passes an AsyncAPI validator |
| [3.5](part-a/3-asyncapi-document-standards.md#35-complete-asyncapi-info-block) | M | MUST | AsyncAPI | Complete AsyncAPI info block |
| [3.6](part-a/3-asyncapi-document-standards.md#36-servers-channels-operations-and-messages) | M+R | MUST | AsyncAPI | Servers channels operations and messages |
| [3.7](part-a/3-asyncapi-document-standards.md#37-complete-asyncapi-operation-metadata) | M+R | MUST | AsyncAPI | Complete AsyncAPI operation metadata |
| [3.8](part-a/3-asyncapi-document-standards.md#38-pinned-vendored-asyncapi-components) | M | MUST | AsyncAPI | Pinned vendored AsyncAPI components |
| [3.9](part-a/3-asyncapi-document-standards.md#39-json-schema-payload-conventions) | M | MUST | AsyncAPI | JSON Schema payload conventions |

## 4. Documentation requirements

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [4.1](part-a/4-documentation-requirements.md#41-every-schema-described) | M | MUST | Universal | Every schema described |
| [4.2](part-a/4-documentation-requirements.md#42-examples-for-bodies-and-enums) | M+R | MUST | Universal | Examples for bodies and enums |
| [4.3](part-a/4-documentation-requirements.md#43-no-placeholder-text) | M+R | MUST | Universal | No placeholder text |
| [4.4](part-a/4-documentation-requirements.md#44-accurate-operation-descriptions) | R | MUST | Universal | Accurate operation descriptions |
| [4.5](part-a/4-documentation-requirements.md#45-api-surface-inventory) | M+R | MUST | Universal | API surface inventory |
| [4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability) | M+R | MUST | Universal | Functional-requirement traceability |

## 5. URL structure and versioning

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [5.1](part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path) | M | MUST | OpenAPI | Major version in the path |
| [5.2](part-b/5-url-structure-and-versioning.md#52-plural-noun-resources) | M+R | MUST | OpenAPI | Plural noun resources |
| [5.3](part-b/5-url-structure-and-versioning.md#53-kebab-case-path-segments) | M | MUST | OpenAPI | Kebab-case path segments |
| [5.4](part-b/5-url-structure-and-versioning.md#54-shallow-path-nesting) | M | SHOULD | OpenAPI | Shallow path nesting |
| [5.5](part-b/5-url-structure-and-versioning.md#55-identifiers-as-path-parameters) | M+R | MUST | OpenAPI | Identifiers as path parameters |
| [5.6](part-b/5-url-structure-and-versioning.md#56-query-parameter-naming) | M | MUST | OpenAPI | Query parameter naming |
| [5.7](part-b/5-url-structure-and-versioning.md#57-no-verbs-in-crud-paths) | M+R | MUST | OpenAPI | No verbs in CRUD paths |
| [5.8](part-b/5-url-structure-and-versioning.md#58-actions-as-sub-resources) | R | MUST | OpenAPI | Actions as sub-resources |
| [5.9](part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint) | M+R | MUST | OpenAPI | Unversioned health endpoint |

## 6. HTTP methods

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [6.1](part-b/6-http-methods.md#61-get-is-safe-and-idempotent) | M+R | MUST | OpenAPI | GET is safe and idempotent |
| [6.2](part-b/6-http-methods.md#62-post-creates-or-performs-actions) | R | MUST | OpenAPI | POST creates or performs actions |
| [6.3](part-b/6-http-methods.md#63-put-replaces-the-entire-resource) | R | MUST | OpenAPI | PUT replaces the entire resource |
| [6.4](part-b/6-http-methods.md#64-patch-uses-json-merge-patch) | M+R | MUST | OpenAPI | PATCH uses JSON Merge Patch |
| [6.5](part-b/6-http-methods.md#65-delete-response-semantics) | M+R | MUST | OpenAPI | DELETE response semantics |
| [6.6](part-b/6-http-methods.md#66-post-search-for-complex-queries) | M+R | MUST | OpenAPI | POST search for complex queries |
| [6.7](part-b/6-http-methods.md#67-bulk-mutation-needs-explicit-selection) | M+R | MUST | OpenAPI | Bulk mutation needs explicit selection |

## 7. HTTP status codes

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [7.1](part-b/7-http-status-codes.md#71-200-for-successful-reads) | R | MUST | OpenAPI | 200 for successful reads |
| [7.2](part-b/7-http-status-codes.md#72-201-created-with-location) | M | MUST | OpenAPI | 201 Created with Location |
| [7.3](part-b/7-http-status-codes.md#73-202-accepted-for-async-operations) | M+R | MUST | OpenAPI | 202 Accepted for async operations |
| [7.4](part-b/7-http-status-codes.md#74-204-for-void-responses) | R | MUST | OpenAPI | 204 for void responses |
| [7.5](part-b/7-http-status-codes.md#75-400-for-malformed-requests) | R | MUST | OpenAPI | 400 for malformed requests |
| [7.6](part-b/7-http-status-codes.md#76-401-with-www-authenticate) | M+R | MUST | OpenAPI | 401 with WWW-Authenticate |
| [7.7](part-b/7-http-status-codes.md#77-403-when-not-authorised) | R | MUST | OpenAPI | 403 when not authorised |
| [7.8](part-b/7-http-status-codes.md#78-404-for-missing-resources) | R | MUST | OpenAPI | 404 for missing resources |
| [7.9](part-b/7-http-status-codes.md#79-409-for-state-conflicts) | R | MUST | OpenAPI | 409 for state conflicts |
| [7.10](part-b/7-http-status-codes.md#710-410-for-permanent-removal) | R | MUST | OpenAPI | 410 for permanent removal |
| [7.11](part-b/7-http-status-codes.md#711-422-for-semantic-errors) | R | MUST | OpenAPI | 422 for semantic errors |
| [7.12](part-b/7-http-status-codes.md#712-429-for-rate-limits) | R | MUST | OpenAPI | 429 for rate limits |
| [7.13](part-b/7-http-status-codes.md#713-server-errors-documented) | M | MUST | OpenAPI | Server errors documented |
| [7.14](part-b/7-http-status-codes.md#714-all-status-codes-declared) | M | MUST | OpenAPI | All status codes declared |
| [7.15](part-b/7-http-status-codes.md#715-412-for-failed-preconditions) | R | MUST | OpenAPI | 412 for failed preconditions |
| [7.16](part-b/7-http-status-codes.md#716-etag-and-if-none-match) | M+R | MUST | OpenAPI | ETag and If-None-Match |
| [7.17](part-b/7-http-status-codes.md#717-optimistic-concurrency-with-if-match) | M+R | MUST | OpenAPI | Optimistic concurrency with If-Match |
| [7.18](part-b/7-http-status-codes.md#718-405-with-allow-header) | M | MUST | OpenAPI | 405 with Allow header |
| [7.19](part-b/7-http-status-codes.md#719-415-for-unsupported-media-types) | M+R | MUST | OpenAPI | 415 for unsupported media types |
| [7.20](part-b/7-http-status-codes.md#720-no-store-on-error-responses) | M | SHOULD | OpenAPI | No-store on error responses |
| [7.21](part-b/7-http-status-codes.md#721-schemas-for-successful-response-bodies) | M | MUST | OpenAPI | Schemas for successful response bodies |

## 8. Headers

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [8.1](part-b/8-headers.md#81-credentials-in-authorization-header) | M+R | MUST | OpenAPI | Credentials in Authorization header |
| [8.2](part-b/8-headers.md#82-accept-language-and-content-language) | M+R | MUST | OpenAPI | Accept-Language and Content-Language |
| [8.3](part-b/8-headers.md#83-idempotency-key-header-accepted) | M+R | MUST | OpenAPI | Idempotency-Key header accepted |
| [8.4](part-b/8-headers.md#84-w3c-trace-context-correlation) | M+R | MUST | OpenAPI | W3C Trace Context correlation |
| [8.5](part-b/8-headers.md#85-no-new-x--prefixed-headers) | M | MUST | OpenAPI | No new X- prefixed headers |
| [8.6](part-b/8-headers.md#86-no-personal-data-in-addressable-locations) | R | MUST | OpenAPI | No personal data in addressable locations |
| [8.7](part-b/8-headers.md#87-rate-limit-headers-declared) | M+R | MUST | OpenAPI | Rate-limit headers declared |

## 9. JSON conventions and naming

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [9.1](part-c/9-json-conventions-and-naming.md#91-json-as-default-media-type) | M+R | MUST | Universal | JSON as default media type |
| [9.2](part-c/9-json-conventions-and-naming.md#92-camelcase-field-names) | M | MUST | Universal | camelCase field names |
| [9.3](part-c/9-json-conventions-and-naming.md#93-real-json-booleans) | M | MUST | Universal | Real JSON booleans |
| [9.4](part-c/9-json-conventions-and-naming.md#94-explicit-nullability) | M | MUST | Universal | Explicit nullability |
| [9.5](part-c/9-json-conventions-and-naming.md#95-no-spaces-or-non-ascii-names) | M | MUST | Universal | No spaces or non-ASCII names |
| [9.6](part-c/9-json-conventions-and-naming.md#96-avoid-abbreviations) | R | SHOULD | Universal | Avoid abbreviations |
| [9.7](part-c/9-json-conventions-and-naming.md#97-screaming-snake-case-enum-values) | M | MUST | Universal | Screaming snake case enum values |
| [9.8](part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas) | M | MUST | Universal | Forward-compatible schemas |
| [9.9](part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets) | R | MUST | Universal | No closed enums for growing sets |
| [9.10](part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix) | M+R | MUST | Universal | GovStack extension prefix |
| [9.11](part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | M+R | MUST | Universal | Single registered BB code |

## 10. Data types and formats

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [10.1](part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers) | M+R | MUST | Universal | Opaque server-generated identifiers |
| [10.2](part-c/10-data-types-and-formats.md#102-rfc-3339-timestamps) | M | MUST | Universal | RFC 3339 timestamps |
| [10.3](part-c/10-data-types-and-formats.md#103-rfc-3339-calendar-dates) | M | MUST | Universal | RFC 3339 calendar dates |
| [10.4](part-c/10-data-types-and-formats.md#104-decimal-string-monetary-amounts) | M+R | MUST | Universal | Decimal-string monetary amounts |
| [10.5](part-c/10-data-types-and-formats.md#105-e164-phone-numbers) | M+R | MUST | Universal | E.164 phone numbers |
| [10.6](part-c/10-data-types-and-formats.md#106-rfc-5322-email-addresses) | M+R | MUST | Universal | RFC 5322 email addresses |
| [10.7](part-c/10-data-types-and-formats.md#107-binary-uploads-and-base64-payloads) | M+R | MUST | Universal | Binary uploads and base64 payloads |
| [10.8](part-c/10-data-types-and-formats.md#108-iso-3166-1-country-codes) | M+R | MUST | Universal | ISO 3166-1 country codes |
| [10.9](part-c/10-data-types-and-formats.md#109-bcp-47-language-codes) | M+R | MUST | Universal | BCP 47 language codes |
| [10.10](part-c/10-data-types-and-formats.md#1010-iso-4217-currency-codes) | M+R | MUST | Universal | ISO 4217 currency codes |
| [10.11](part-c/10-data-types-and-formats.md#1011-utf-8-text-encoding) | M | MUST | Universal | UTF-8 text encoding |

## 11. Errors

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [11.1](part-c/11-errors.md#111-rfc-9457-problem-details) | M | MUST | Universal | RFC 9457 problem details |
| [11.2](part-c/11-errors.md#112-standard-problem-fields-present) | M+R | MUST | Universal | Standard problem fields present |
| [11.3](part-c/11-errors.md#113-govstack-error-extension-fields) | M | MUST | Universal | GovStack error extension fields |
| [11.4](part-c/11-errors.md#114-field-level-errors-array) | M+R | MUST | Universal | Field-level errors array |
| [11.5](part-c/11-errors.md#115-namespaced-stable-error-codes) | M+R | MUST | Universal | Namespaced stable error codes |
| [11.6](part-c/11-errors.md#116-stable-codes-across-languages) | R | MUST | Universal | Stable codes across languages |
| [11.7](part-c/11-errors.md#117-common-error-catalogue) | M+R | MUST | Universal | Common error catalogue |
| [11.8](part-c/11-errors.md#118-transport-neutral-asynchronous-errors) | M+R | MUST | Universal | Transport-neutral asynchronous errors |

## 12. Pagination, filtering, sorting

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [12.1](part-c/12-pagination-filtering-sorting.md#121-collections-must-paginate) | M+R | MUST | OpenAPI | Collections must paginate |
| [12.2](part-c/12-pagination-filtering-sorting.md#122-cursor-pagination-by-default) | M+R | MUST | OpenAPI | Cursor pagination by default |
| [12.3](part-c/12-pagination-filtering-sorting.md#123-cursor-pagination-envelope) | M | MUST | OpenAPI | Cursor pagination envelope |
| [12.4](part-c/12-pagination-filtering-sorting.md#124-documented-pagesize-bounds) | M+R | MUST | OpenAPI | Documented pageSize bounds |
| [12.5](part-c/12-pagination-filtering-sorting.md#125-optional-total-count) | R | MAY | OpenAPI | Optional total count |
| [12.6](part-c/12-pagination-filtering-sorting.md#126-offset-pagination-envelope) | M+R | MUST | OpenAPI | Offset pagination envelope |
| [12.7](part-c/12-pagination-filtering-sorting.md#127-sort-parameter-convention) | M | MUST | OpenAPI | Sort parameter convention |
| [12.8](part-c/12-pagination-filtering-sorting.md#128-simple-equality-filtering) | M+R | MUST | OpenAPI | Simple equality filtering |
| [12.9](part-c/12-pagination-filtering-sorting.md#129-complex-filtering-via-search) | M+R | MUST | OpenAPI | Complex filtering via search |
| [12.10](part-c/12-pagination-filtering-sorting.md#1210-sparse-fieldsets-out-of-scope) | — | — | OpenAPI | Sparse fieldsets out of scope |

## 13. Authentication and authorisation

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [13.1](part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) | M | MUST | Universal | Default security on every operation |
| [13.2](part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations) | M+R | MUST | Universal | OAuth and OIDC for citizen operations |
| [13.3](part-d/13-authentication-and-authorisation.md#133-distinct-scheme-for-bb-to-bb-calls) | M+R | MUST | Universal | Distinct scheme for BB-to-BB calls |
| [13.4](part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | M | MUST | Universal | Namespaced OAuth scopes |
| [13.5](part-d/13-authentication-and-authorisation.md#135-authorization-is-the-credential-channel) | M+R | MUST | Universal | Authorization is the credential channel |
| [13.6](part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) | R | MUST | Universal | API keys only for operational endpoints |
| [13.7](part-d/13-authentication-and-authorisation.md#137-protected-transport) | M+R | MUST | Universal | Protected transport |

## 14. Idempotency

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [14.1](part-d/14-idempotency.md#141-idempotency-key-on-non-idempotent-posts) | M+R | MUST | Universal | Idempotency-Key on non-idempotent POSTs |
| [14.2](part-d/14-idempotency.md#142-opaque-client-generated-keys) | R | MUST | Universal | Opaque client-generated keys |
| [14.3](part-d/14-idempotency.md#143-documented-replay-window) | R | MUST | Universal | Documented replay window |
| [14.4](part-d/14-idempotency.md#144-replay-returns-original-response) | R | MUST | Universal | Replay returns original response |
| [14.5](part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch) | R | MUST | Universal | Key reuse and fingerprint mismatch |
| [14.6](part-d/14-idempotency.md#146-naturally-idempotent-designs) | R | MUST | Universal | Naturally idempotent designs |

## 15. Asynchronous operations

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [15.1](part-d/15-asynchronous-operations.md#151-202-with-operation-location) | M+R | MUST | OpenAPI | 202 with Operation Location |
| [15.2](part-d/15-asynchronous-operations.md#152-shared-operation-resource-shape) | M | MUST | OpenAPI | Shared Operation resource shape |
| [15.3](part-d/15-asynchronous-operations.md#153-fixed-operation-status-enum) | M | MUST | OpenAPI | Fixed Operation status enum |
| [15.4](part-d/15-asynchronous-operations.md#154-polling-the-operation-resource) | M+R | MUST | OpenAPI | Polling the Operation resource |
| [15.5](part-d/15-asynchronous-operations.md#155-cancellation-via-cancel-sub-resource) | M+R | MUST | OpenAPI | Cancellation via cancel sub-resource |
| [15.6](part-d/15-asynchronous-operations.md#156-webhook-completion-notification) | R | SHOULD | OpenAPI | Webhook completion notification |
| [15.7](part-d/15-asynchronous-operations.md#157-documented-result-retention) | R | MUST | OpenAPI | Documented result retention |

## 16. CloudEvents and webhooks

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [16.1](part-d/16-cloudevents-and-webhooks.md#161-event-surfaces-documented) | M+R | MUST | Event-driven | Event surfaces documented |
| [16.2](part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required) | M | MUST | Event-driven | CloudEvents envelope required |
| [16.3](part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types) | M | MUST | Event-driven | Reverse-DNS event types |
| [16.4](part-d/16-cloudevents-and-webhooks.md#164-stable-cloudevents-source) | M+R | MUST | Event-driven | Stable CloudEvents source |
| [16.5](part-d/16-cloudevents-and-webhooks.md#165-signed-event-delivery) | R | MUST | Event-driven | Signed event delivery |
| [16.6](part-d/16-cloudevents-and-webhooks.md#166-govstack-signature-header) | M+R | MUST | Event-driven | GovStack-Signature header |
| [16.7](part-d/16-cloudevents-and-webhooks.md#167-replay-detectable-signed-material) | R | MUST | Event-driven | Replay-detectable signed material |
| [16.8](part-d/16-cloudevents-and-webhooks.md#168-pinned-signature-profile) | R | MUST | Event-driven | Pinned signature profile |
| [16.9](part-d/16-cloudevents-and-webhooks.md#169-operational-signing-concerns-out-of-scope) | — | — | Event-driven | Operational signing concerns out of scope |
| [16.10](part-d/16-cloudevents-and-webhooks.md#1610-documented-delivery-failure-contract) | R | MUST | Event-driven | Documented delivery-failure contract |
| [16.11](part-d/16-cloudevents-and-webhooks.md#1611-subscription-management-interfaces) | M+R | MUST | Event-driven | Subscription management interfaces |

## 17. AsyncAPI channel documentation rules

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [17.1](part-d/17-asyncapi-channel-rules.md#171-send-and-receive-perspective) | M+R | MUST | AsyncAPI | Send and receive perspective |
| [17.2](part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses) | M+R | MUST | AsyncAPI | Stable logical channel IDs and native addresses |
| [17.3](part-d/17-asyncapi-channel-rules.md#173-no-personal-data-in-channels) | R | MUST | AsyncAPI | No personal data in channels |
| [17.4](part-d/17-asyncapi-channel-rules.md#174-declared-channel-parameters) | M+R | MUST | AsyncAPI | Declared channel parameters |
| [17.5](part-d/17-asyncapi-channel-rules.md#175-no-environment-names-in-addresses) | M+R | SHOULD | AsyncAPI | No environment names in addresses |
| [17.6](part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) | M | MUST | AsyncAPI | Structured CloudEvents JSON payloads |
| [17.7](part-d/17-asyncapi-channel-rules.md#177-shared-cloudevents-message-schema) | M | MUST | AsyncAPI | Shared CloudEvents message schema |
| [17.8](part-d/17-asyncapi-channel-rules.md#178-message-headers-and-idempotency-metadata) | M+R | MUST | AsyncAPI | Message headers and idempotency metadata |
| [17.9](part-d/17-asyncapi-channel-rules.md#179-message-localisation-headers) | M+R | MUST | AsyncAPI | Message localisation headers |
| [17.10](part-d/17-asyncapi-channel-rules.md#1710-security-schemes-cover-every-operation) | M+R | MUST | AsyncAPI | Security schemes cover every operation |
| [17.11](part-d/17-asyncapi-channel-rules.md#1711-documented-delivery-guarantees) | M+R | MUST | AsyncAPI | Documented delivery guarantees |
| [17.12](part-d/17-asyncapi-channel-rules.md#1712-documented-ordering-guarantees) | M+R | MUST | AsyncAPI | Documented ordering guarantees |
| [17.13](part-d/17-asyncapi-channel-rules.md#1713-declared-delivery-management-capabilities) | M+R | MUST | AsyncAPI | Declared delivery-management capabilities |
| [17.14](part-d/17-asyncapi-channel-rules.md#1714-portable-capability-contract) | R | MUST | AsyncAPI | Portable capability contract |
| [17.15](part-d/17-asyncapi-channel-rules.md#1715-machine-readable-delivery-extensions) | M+R | MUST | AsyncAPI | Machine-readable delivery extensions |
| [17.16](part-d/17-asyncapi-channel-rules.md#1716-async-rejection-error-messages) | M+R | MUST | AsyncAPI | Async rejection error messages |
| [17.17](part-d/17-asyncapi-channel-rules.md#1717-declared-request-reply-correlation) | M+R | MUST | AsyncAPI | Declared request-reply correlation |
| [17.18](part-d/17-asyncapi-channel-rules.md#1718-correlated-completion-signals) | M+R | MUST | AsyncAPI | Correlated completion signals |
| [17.19](part-d/17-asyncapi-channel-rules.md#1719-protocol-bindings-where-relevant) | M+R | MUST | AsyncAPI | Protocol bindings where relevant |
| [17.20](part-d/17-asyncapi-channel-rules.md#1720-examples-for-every-message) | M+R | MUST | AsyncAPI | Examples for every message |

## 18. Compatibility and lifecycle

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [18.1](part-d/18-compatibility-and-lifecycle.md#181-semver-versioning) | M | MUST | Universal | SemVer versioning |
| [18.2](part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel) | M | MUST | Universal | Major version in path or channel |
| [18.3](part-d/18-compatibility-and-lifecycle.md#183-backward-compatible-minor-changes) | M+R | MUST | Universal | Backward-compatible minor changes |
| [18.4](part-d/18-compatibility-and-lifecycle.md#184-breaking-changes-bump-major-version) | M+R | MUST | Universal | Breaking changes bump major version |
| [18.5](part-d/18-compatibility-and-lifecycle.md#185-deprecation-and-sunset-headers) | M+R | MUST | Universal | Deprecation and Sunset headers |
| [18.6](part-d/18-compatibility-and-lifecycle.md#186-clients-ignore-unknown-fields) | — | — | Universal | Clients ignore unknown fields |
| [18.7](part-d/18-compatibility-and-lifecycle.md#187-asyncapi-deprecation-metadata) | M+R | MUST | Universal | AsyncAPI deprecation metadata |

## 19. Localisation

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [19.1](part-e/19-localisation.md#191-honour-the-request-language) | R | MUST | Universal | Honour the request language |
| [19.2](part-e/19-localisation.md#192-never-translate-stable-content) | R | MUST | Universal | Never translate stable content |
| [19.3](part-e/19-localisation.md#193-english-as-default-language) | R | MUST | Universal | English as default language |
| [19.4](part-e/19-localisation.md#194-declare-the-response-language) | M+R | MUST | Universal | Declare the response language |

## 20. Conformance and validation

| Rule | Class | Strength | Surface | Title |
| --- | --- | --- | --- | --- |
| [20.1](part-e/20-conformance-and-validation.md#201-every-file-passes-validation) | M | MUST | Universal | Every file passes validation |
| [20.2](part-e/20-conformance-and-validation.md#202-passes-the-govstack-spectral-ruleset) | M | MUST | Universal | Passes the GovStack Spectral ruleset |
| [20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) | M | MUST | Universal | Declared guide conformance version |

