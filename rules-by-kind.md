---
description: "The rules that apply to each kind of API: read-only, read-write, events, and the deployment profile."
---

# Rules by API kind

This page is generated from the section pages and `tools/rule-kinds.json` by `tools/build_rules_index.py`; do not edit it by hand. A read-write HTTP API follows the read-only list plus the mutations list. Rules apply where their stated conditions hold. A rule listed for both an API kind and deployment has specification declarations and runtime obligations assessed separately. Level is the requirement level of the rule's first paragraph; see [§1.11](1-introduction.md#111-which-rules-apply-to-your-api).

## Read-only HTTP APIs

101 rules.

| Rule | Level | Class | Title |
| --- | --- | --- | --- |
| [2.1](part-a/2-openapi-document-standards.md#21-openapi-31-required) | MUST | M | OpenAPI 3.1 required |
| [2.2](part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint) | MUST | M+R | One canonical OpenAPI entrypoint |
| [2.3](part-a/2-openapi-document-standards.md#23-no-divergent-openapi-copies) | MUST | R | No divergent OpenAPI copies |
| [2.4](part-a/2-openapi-document-standards.md#24-passes-openapi-spec-validator) | MUST | M | Passes openapi-spec-validator |
| [2.5](part-a/2-openapi-document-standards.md#25-complete-info-block) | MUST | M | Complete info block |
| [2.6](part-a/2-openapi-document-standards.md#26-meaningful-servers-block) | MUST | M+R | Meaningful servers block |
| [2.7](part-a/2-openapi-document-standards.md#27-complete-operation-metadata) | MUST | M+R | Complete operation metadata |
| [2.8](part-a/2-openapi-document-standards.md#28-conditional-vendored-openapi-schemas) | MUST | M+R | Conditional vendored OpenAPI schemas |
| [4.1](part-a/4-documentation-requirements.md#41-useful-schema-descriptions) | MUST | M | Useful schema descriptions |
| [4.2](part-a/4-documentation-requirements.md#42-examples-for-bodies-and-enums) | MUST | M+R | Examples for bodies and enums |
| [4.3](part-a/4-documentation-requirements.md#43-no-placeholder-text) | MUST | M+R | No placeholder text |
| [4.4](part-a/4-documentation-requirements.md#44-accurate-operation-descriptions) | MUST | R | Accurate operation descriptions |
| [4.5](part-a/4-documentation-requirements.md#45-api-surface-inventory) | MUST | M+R | API surface inventory |
| [4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability) | MUST | M+R | Functional-requirement traceability |
| [5.1](part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path) | MUST | M | Major version in the path |
| [5.2](part-b/5-url-structure-and-versioning.md#52-plural-noun-resources) | SHOULD | M+R | Plural noun resources |
| [5.3](part-b/5-url-structure-and-versioning.md#53-kebab-case-path-segments) | SHOULD | M | Kebab-case path segments |
| [5.4](part-b/5-url-structure-and-versioning.md#54-shallow-path-nesting) | SHOULD | M | Shallow path nesting |
| [5.5](part-b/5-url-structure-and-versioning.md#55-identifiers-as-path-parameters) | MUST | M+R | Identifiers as path parameters |
| [5.6](part-b/5-url-structure-and-versioning.md#56-query-parameter-naming) | SHOULD | M | Query parameter naming |
| [5.7](part-b/5-url-structure-and-versioning.md#57-no-verbs-in-crud-paths) | SHOULD | M+R | No verbs in CRUD paths |
| [5.8](part-b/5-url-structure-and-versioning.md#58-actions-as-sub-resources) | SHOULD | R | Custom operations |
| [5.9](part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint) | MUST | M+R | Unversioned health endpoint |
| [5.10](part-b/5-url-structure-and-versioning.md#510-standard-unversioned-endpoints) | MUST | M | Standard unversioned endpoints |
| [6.1](part-b/6-http-methods.md#61-get-is-safe-and-idempotent) | MUST | M+R | GET is safe and idempotent |
| [6.6](part-b/6-http-methods.md#66-post-search-for-complex-queries) | MUST | M+R | POST search for complex queries |
| [7.1](part-b/7-http-status-codes.md#71-200-for-successful-reads) | SHOULD | R | 200 for successful reads |
| [7.5](part-b/7-http-status-codes.md#75-400-for-malformed-requests) | MUST | R | 400 for malformed requests |
| [7.6](part-b/7-http-status-codes.md#76-401-with-www-authenticate) | MUST | M+R | 401 with WWW-Authenticate |
| [7.7](part-b/7-http-status-codes.md#77-403-when-not-authorised) | MUST | R | 403 when not authorised |
| [7.8](part-b/7-http-status-codes.md#78-404-for-missing-resources) | MUST | R | 404 for missing resources |
| [7.10](part-b/7-http-status-codes.md#710-410-for-permanent-removal) | SHOULD | R | 410 for permanent removal |
| [7.11](part-b/7-http-status-codes.md#711-422-for-semantic-errors) | SHOULD | R | 422 for semantic errors |
| [7.12](part-b/7-http-status-codes.md#712-429-for-rate-limits) | SHOULD | R | 429 for rate limits |
| [7.13](part-b/7-http-status-codes.md#713-server-errors-documented) | MUST | M | Server errors documented |
| [7.14](part-b/7-http-status-codes.md#714-all-status-codes-declared) | MUST | M | All status codes declared |
| [7.16](part-b/7-http-status-codes.md#716-etag-and-if-none-match) | SHOULD | M+R | ETag and If-None-Match |
| [7.18](part-b/7-http-status-codes.md#718-405-with-allow-header) | MUST | M | 405 with Allow header |
| [7.20](part-b/7-http-status-codes.md#720-no-store-on-error-responses) | SHOULD | M | No-store on error responses |
| [7.21](part-b/7-http-status-codes.md#721-schemas-for-successful-response-bodies) | MUST | M | Schemas for successful response bodies |
| [8.1](part-b/8-headers.md#81-credentials-in-authorization-header) | MUST | M+R | Credentials in Authorization header |
| [8.2](part-b/8-headers.md#82-accept-language-and-content-language) | MUST | M+R | Accept-Language and Content-Language |
| [8.4](part-b/8-headers.md#84-w3c-trace-context-correlation) | MUST | M+R | W3C Trace Context correlation |
| [8.5](part-b/8-headers.md#85-no-new-x--prefixed-headers) | MUST | M | No new X- prefixed headers |
| [8.6](part-b/8-headers.md#86-no-personal-data-in-addressable-locations) | MUST | R | No personal data in addressable locations |
| [8.7](part-b/8-headers.md#87-rate-limit-headers-declared) | SHOULD | M+R | Rate-limit headers declared |
| [9.1](part-c/9-json-conventions-and-naming.md#91-json-as-default-media-type) | MUST | M+R | JSON as default media type |
| [9.2](part-c/9-json-conventions-and-naming.md#92-camelcase-field-names) | SHOULD | M | camelCase field names |
| [9.3](part-c/9-json-conventions-and-naming.md#93-real-json-booleans) | MUST | M | Real JSON booleans |
| [9.4](part-c/9-json-conventions-and-naming.md#94-explicit-nullability) | MUST | M | Explicit nullability |
| [9.5](part-c/9-json-conventions-and-naming.md#95-no-spaces-or-non-ascii-names) | SHOULD | M | No spaces or non-ASCII names |
| [9.6](part-c/9-json-conventions-and-naming.md#96-avoid-abbreviations) | SHOULD | R | Avoid abbreviations |
| [9.7](part-c/9-json-conventions-and-naming.md#97-screaming-snake-case-enum-values) | MUST | M | Screaming snake case enum values |
| [9.8](part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas) | MUST | M | Forward-compatible schemas |
| [9.9](part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets) | MUST | R | No closed enums for growing sets |
| [9.10](part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix) | MUST | M+R | GovStack extension prefix |
| [9.11](part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | MUST | M+R | Single registered BB code |
| [10.1](part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers) | MUST | M+R | Opaque server-generated identifiers |
| [10.2](part-c/10-data-types-and-formats.md#102-rfc-3339-timestamps) | MUST | M | RFC 3339 timestamps |
| [10.3](part-c/10-data-types-and-formats.md#103-rfc-3339-calendar-dates) | MUST | M | RFC 3339 calendar dates |
| [10.4](part-c/10-data-types-and-formats.md#104-decimal-string-monetary-amounts) | MUST | M+R | Decimal-string monetary amounts |
| [10.5](part-c/10-data-types-and-formats.md#105-e164-phone-numbers) | MUST | M+R | E.164 phone numbers |
| [10.6](part-c/10-data-types-and-formats.md#106-rfc-5322-email-addresses) | MUST | M+R | RFC 5322 email addresses |
| [10.7](part-c/10-data-types-and-formats.md#107-binary-uploads-and-base64-payloads) | MUST | M+R | Binary uploads and base64 payloads |
| [10.8](part-c/10-data-types-and-formats.md#108-iso-3166-1-country-codes) | MUST | M+R | ISO 3166-1 country codes |
| [10.9](part-c/10-data-types-and-formats.md#109-bcp-47-language-codes) | MUST | M+R | BCP 47 language codes |
| [10.10](part-c/10-data-types-and-formats.md#1010-iso-4217-currency-codes) | MUST | M+R | ISO 4217 currency codes |
| [10.11](part-c/10-data-types-and-formats.md#1011-utf-8-text-encoding) | MUST | M | UTF-8 text encoding |
| [11.1](part-c/11-errors.md#111-rfc-9457-problem-details) | MUST | M | RFC 9457 problem details |
| [11.2](part-c/11-errors.md#112-stable-http-problem-type-uri) | MUST | M+R | Stable HTTP problem type URI |
| [11.3](part-c/11-errors.md#113-trace-identifier) | MUST | M | Trace identifier |
| [11.4](part-c/11-errors.md#114-field-level-errors-array) | MUST | M+R | Field-level errors array |
| [12.1](part-c/12-pagination-filtering-sorting.md#121-collections-must-paginate) | MUST | M+R | Collections must paginate |
| [12.2](part-c/12-pagination-filtering-sorting.md#122-cursor-pagination-by-default) | MUST | M+R | Cursor pagination by default |
| [12.3](part-c/12-pagination-filtering-sorting.md#123-cursor-pagination-envelope) | MUST | M | Cursor pagination envelope |
| [12.4](part-c/12-pagination-filtering-sorting.md#124-documented-pagesize-bounds) | MUST | M+R | Documented pageSize bounds |
| [12.5](part-c/12-pagination-filtering-sorting.md#125-optional-total-count) | MAY | R | Optional total count |
| [12.6](part-c/12-pagination-filtering-sorting.md#126-offset-pagination-envelope) | MUST | M+R | Offset pagination envelope |
| [12.7](part-c/12-pagination-filtering-sorting.md#127-sort-parameter-convention) | MUST | M | Sort parameter convention |
| [12.8](part-c/12-pagination-filtering-sorting.md#128-simple-equality-filtering) | MUST | M+R | Simple equality filtering |
| [12.9](part-c/12-pagination-filtering-sorting.md#129-complex-filtering-via-search) | MUST | M+R | Complex filtering via search |
| [12.10](part-c/12-pagination-filtering-sorting.md#1210-sparse-fieldsets-out-of-scope) | — | — | Sparse fieldsets out of scope |
| [13.1](part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) | MUST | M | Default security on every operation |
| [13.2](part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations) | MUST | M+R | OAuth and OIDC for citizen operations |
| [13.3](part-d/13-authentication-and-authorisation.md#133-distinct-scheme-for-bb-to-bb-calls) | MUST | M+R | Distinct scheme for BB-to-BB calls |
| [13.4](part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | MUST | M | Namespaced OAuth scopes |
| [13.5](part-d/13-authentication-and-authorisation.md#135-authorization-is-the-credential-channel) | MUST | M+R | Authorization is the credential channel |
| [13.6](part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) | MUST | R | API keys only for operational endpoints |
| [13.7](part-d/13-authentication-and-authorisation.md#137-protected-transport) | MUST | M+R | Protected transport |
| [14.2](part-d/14-idempotency.md#142-opaque-client-generated-keys) | MUST | R | Opaque client-generated keys |
| [18.1](part-d/18-compatibility-and-lifecycle.md#181-semver-versioning) | MUST | M | SemVer versioning |
| [18.2](part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel) | MUST | M | Major version in path or channel |
| [18.3](part-d/18-compatibility-and-lifecycle.md#183-backward-compatible-minor-changes) | MUST | M+R | Backward-compatible minor changes |
| [18.4](part-d/18-compatibility-and-lifecycle.md#184-breaking-changes-bump-major-version) | MUST | M+R | Breaking changes bump major version |
| [18.5](part-d/18-compatibility-and-lifecycle.md#185-deprecation-and-sunset-headers) | MUST | M+R | Deprecation and Sunset headers |
| [18.6](part-d/18-compatibility-and-lifecycle.md#186-clients-ignore-unknown-fields) | — | — | Clients ignore unknown fields |
| [19.3](part-e/19-localisation.md#193-declared-default-language) | MUST | R | Declared default language |
| [19.4](part-e/19-localisation.md#194-declare-the-response-language) | MUST | M+R | Declare the response language |
| [20.1](part-e/20-conformance-and-validation.md#201-every-file-passes-validation) | MUST | M | Every file passes validation |
| [20.2](part-e/20-conformance-and-validation.md#202-passes-the-govstack-spectral-ruleset) | MUST | M | Passes the GovStack Spectral ruleset |
| [20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) | MUST | M | Declared guide conformance version |

## HTTP APIs with mutations (in addition to the read-only rules)

123 rules.

| Rule | Level | Class | Title |
| --- | --- | --- | --- |
| [2.1](part-a/2-openapi-document-standards.md#21-openapi-31-required) | MUST | M | OpenAPI 3.1 required |
| [2.2](part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint) | MUST | M+R | One canonical OpenAPI entrypoint |
| [2.3](part-a/2-openapi-document-standards.md#23-no-divergent-openapi-copies) | MUST | R | No divergent OpenAPI copies |
| [2.4](part-a/2-openapi-document-standards.md#24-passes-openapi-spec-validator) | MUST | M | Passes openapi-spec-validator |
| [2.5](part-a/2-openapi-document-standards.md#25-complete-info-block) | MUST | M | Complete info block |
| [2.6](part-a/2-openapi-document-standards.md#26-meaningful-servers-block) | MUST | M+R | Meaningful servers block |
| [2.7](part-a/2-openapi-document-standards.md#27-complete-operation-metadata) | MUST | M+R | Complete operation metadata |
| [2.8](part-a/2-openapi-document-standards.md#28-conditional-vendored-openapi-schemas) | MUST | M+R | Conditional vendored OpenAPI schemas |
| [4.1](part-a/4-documentation-requirements.md#41-useful-schema-descriptions) | MUST | M | Useful schema descriptions |
| [4.2](part-a/4-documentation-requirements.md#42-examples-for-bodies-and-enums) | MUST | M+R | Examples for bodies and enums |
| [4.3](part-a/4-documentation-requirements.md#43-no-placeholder-text) | MUST | M+R | No placeholder text |
| [4.4](part-a/4-documentation-requirements.md#44-accurate-operation-descriptions) | MUST | R | Accurate operation descriptions |
| [4.5](part-a/4-documentation-requirements.md#45-api-surface-inventory) | MUST | M+R | API surface inventory |
| [4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability) | MUST | M+R | Functional-requirement traceability |
| [5.1](part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path) | MUST | M | Major version in the path |
| [5.2](part-b/5-url-structure-and-versioning.md#52-plural-noun-resources) | SHOULD | M+R | Plural noun resources |
| [5.3](part-b/5-url-structure-and-versioning.md#53-kebab-case-path-segments) | SHOULD | M | Kebab-case path segments |
| [5.4](part-b/5-url-structure-and-versioning.md#54-shallow-path-nesting) | SHOULD | M | Shallow path nesting |
| [5.5](part-b/5-url-structure-and-versioning.md#55-identifiers-as-path-parameters) | MUST | M+R | Identifiers as path parameters |
| [5.6](part-b/5-url-structure-and-versioning.md#56-query-parameter-naming) | SHOULD | M | Query parameter naming |
| [5.7](part-b/5-url-structure-and-versioning.md#57-no-verbs-in-crud-paths) | SHOULD | M+R | No verbs in CRUD paths |
| [5.8](part-b/5-url-structure-and-versioning.md#58-actions-as-sub-resources) | SHOULD | R | Custom operations |
| [5.9](part-b/5-url-structure-and-versioning.md#59-unversioned-health-endpoint) | MUST | M+R | Unversioned health endpoint |
| [5.10](part-b/5-url-structure-and-versioning.md#510-standard-unversioned-endpoints) | MUST | M | Standard unversioned endpoints |
| [6.1](part-b/6-http-methods.md#61-get-is-safe-and-idempotent) | MUST | M+R | GET is safe and idempotent |
| [6.2](part-b/6-http-methods.md#62-post-creates-or-performs-actions) | SHOULD | R | POST creates or performs actions |
| [6.4](part-b/6-http-methods.md#64-patch-uses-a-registered-patch-format) | MUST | M+R | PATCH uses a registered patch format |
| [6.5](part-b/6-http-methods.md#65-delete-response-semantics) | MUST | M+R | DELETE response semantics |
| [6.6](part-b/6-http-methods.md#66-post-search-for-complex-queries) | MUST | M+R | POST search for complex queries |
| [6.7](part-b/6-http-methods.md#67-bulk-mutation-needs-explicit-selection) | MUST | M+R | Bulk mutation needs explicit selection |
| [7.1](part-b/7-http-status-codes.md#71-200-for-successful-reads) | SHOULD | R | 200 for successful reads |
| [7.2](part-b/7-http-status-codes.md#72-201-created-with-location) | MUST | M | 201 Created with Location |
| [7.3](part-b/7-http-status-codes.md#73-202-accepted-for-async-operations) | MUST | M+R | 202 Accepted for async operations |
| [7.4](part-b/7-http-status-codes.md#74-204-for-void-responses) | SHOULD | R | 204 for void responses |
| [7.5](part-b/7-http-status-codes.md#75-400-for-malformed-requests) | MUST | R | 400 for malformed requests |
| [7.6](part-b/7-http-status-codes.md#76-401-with-www-authenticate) | MUST | M+R | 401 with WWW-Authenticate |
| [7.7](part-b/7-http-status-codes.md#77-403-when-not-authorised) | MUST | R | 403 when not authorised |
| [7.8](part-b/7-http-status-codes.md#78-404-for-missing-resources) | MUST | R | 404 for missing resources |
| [7.9](part-b/7-http-status-codes.md#79-409-for-state-conflicts) | SHOULD | R | 409 for state conflicts |
| [7.10](part-b/7-http-status-codes.md#710-410-for-permanent-removal) | SHOULD | R | 410 for permanent removal |
| [7.11](part-b/7-http-status-codes.md#711-422-for-semantic-errors) | SHOULD | R | 422 for semantic errors |
| [7.12](part-b/7-http-status-codes.md#712-429-for-rate-limits) | SHOULD | R | 429 for rate limits |
| [7.13](part-b/7-http-status-codes.md#713-server-errors-documented) | MUST | M | Server errors documented |
| [7.14](part-b/7-http-status-codes.md#714-all-status-codes-declared) | MUST | M | All status codes declared |
| [7.15](part-b/7-http-status-codes.md#715-412-for-failed-preconditions) | SHOULD | R | 412 for failed preconditions |
| [7.16](part-b/7-http-status-codes.md#716-etag-and-if-none-match) | SHOULD | M+R | ETag and If-None-Match |
| [7.17](part-b/7-http-status-codes.md#717-optimistic-concurrency-with-if-match) | MUST | M+R | Optimistic concurrency with If-Match |
| [7.18](part-b/7-http-status-codes.md#718-405-with-allow-header) | MUST | M | 405 with Allow header |
| [7.19](part-b/7-http-status-codes.md#719-415-for-unsupported-media-types) | MUST | M+R | 415 for unsupported media types |
| [7.20](part-b/7-http-status-codes.md#720-no-store-on-error-responses) | SHOULD | M | No-store on error responses |
| [7.21](part-b/7-http-status-codes.md#721-schemas-for-successful-response-bodies) | MUST | M | Schemas for successful response bodies |
| [8.1](part-b/8-headers.md#81-credentials-in-authorization-header) | MUST | M+R | Credentials in Authorization header |
| [8.2](part-b/8-headers.md#82-accept-language-and-content-language) | MUST | M+R | Accept-Language and Content-Language |
| [8.3](part-b/8-headers.md#83-idempotency-key-header-accepted) | MUST | M+R | Idempotency-Key header accepted |
| [8.4](part-b/8-headers.md#84-w3c-trace-context-correlation) | MUST | M+R | W3C Trace Context correlation |
| [8.5](part-b/8-headers.md#85-no-new-x--prefixed-headers) | MUST | M | No new X- prefixed headers |
| [8.6](part-b/8-headers.md#86-no-personal-data-in-addressable-locations) | MUST | R | No personal data in addressable locations |
| [8.7](part-b/8-headers.md#87-rate-limit-headers-declared) | SHOULD | M+R | Rate-limit headers declared |
| [9.1](part-c/9-json-conventions-and-naming.md#91-json-as-default-media-type) | MUST | M+R | JSON as default media type |
| [9.2](part-c/9-json-conventions-and-naming.md#92-camelcase-field-names) | SHOULD | M | camelCase field names |
| [9.3](part-c/9-json-conventions-and-naming.md#93-real-json-booleans) | MUST | M | Real JSON booleans |
| [9.4](part-c/9-json-conventions-and-naming.md#94-explicit-nullability) | MUST | M | Explicit nullability |
| [9.5](part-c/9-json-conventions-and-naming.md#95-no-spaces-or-non-ascii-names) | SHOULD | M | No spaces or non-ASCII names |
| [9.6](part-c/9-json-conventions-and-naming.md#96-avoid-abbreviations) | SHOULD | R | Avoid abbreviations |
| [9.7](part-c/9-json-conventions-and-naming.md#97-screaming-snake-case-enum-values) | MUST | M | Screaming snake case enum values |
| [9.8](part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas) | MUST | M | Forward-compatible schemas |
| [9.9](part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets) | MUST | R | No closed enums for growing sets |
| [9.10](part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix) | MUST | M+R | GovStack extension prefix |
| [9.11](part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | MUST | M+R | Single registered BB code |
| [10.1](part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers) | MUST | M+R | Opaque server-generated identifiers |
| [10.2](part-c/10-data-types-and-formats.md#102-rfc-3339-timestamps) | MUST | M | RFC 3339 timestamps |
| [10.3](part-c/10-data-types-and-formats.md#103-rfc-3339-calendar-dates) | MUST | M | RFC 3339 calendar dates |
| [10.4](part-c/10-data-types-and-formats.md#104-decimal-string-monetary-amounts) | MUST | M+R | Decimal-string monetary amounts |
| [10.5](part-c/10-data-types-and-formats.md#105-e164-phone-numbers) | MUST | M+R | E.164 phone numbers |
| [10.6](part-c/10-data-types-and-formats.md#106-rfc-5322-email-addresses) | MUST | M+R | RFC 5322 email addresses |
| [10.7](part-c/10-data-types-and-formats.md#107-binary-uploads-and-base64-payloads) | MUST | M+R | Binary uploads and base64 payloads |
| [10.8](part-c/10-data-types-and-formats.md#108-iso-3166-1-country-codes) | MUST | M+R | ISO 3166-1 country codes |
| [10.9](part-c/10-data-types-and-formats.md#109-bcp-47-language-codes) | MUST | M+R | BCP 47 language codes |
| [10.10](part-c/10-data-types-and-formats.md#1010-iso-4217-currency-codes) | MUST | M+R | ISO 4217 currency codes |
| [10.11](part-c/10-data-types-and-formats.md#1011-utf-8-text-encoding) | MUST | M | UTF-8 text encoding |
| [11.1](part-c/11-errors.md#111-rfc-9457-problem-details) | MUST | M | RFC 9457 problem details |
| [11.2](part-c/11-errors.md#112-stable-http-problem-type-uri) | MUST | M+R | Stable HTTP problem type URI |
| [11.3](part-c/11-errors.md#113-trace-identifier) | MUST | M | Trace identifier |
| [11.4](part-c/11-errors.md#114-field-level-errors-array) | MUST | M+R | Field-level errors array |
| [12.1](part-c/12-pagination-filtering-sorting.md#121-collections-must-paginate) | MUST | M+R | Collections must paginate |
| [12.2](part-c/12-pagination-filtering-sorting.md#122-cursor-pagination-by-default) | MUST | M+R | Cursor pagination by default |
| [12.3](part-c/12-pagination-filtering-sorting.md#123-cursor-pagination-envelope) | MUST | M | Cursor pagination envelope |
| [12.4](part-c/12-pagination-filtering-sorting.md#124-documented-pagesize-bounds) | MUST | M+R | Documented pageSize bounds |
| [12.5](part-c/12-pagination-filtering-sorting.md#125-optional-total-count) | MAY | R | Optional total count |
| [12.6](part-c/12-pagination-filtering-sorting.md#126-offset-pagination-envelope) | MUST | M+R | Offset pagination envelope |
| [12.7](part-c/12-pagination-filtering-sorting.md#127-sort-parameter-convention) | MUST | M | Sort parameter convention |
| [12.8](part-c/12-pagination-filtering-sorting.md#128-simple-equality-filtering) | MUST | M+R | Simple equality filtering |
| [12.9](part-c/12-pagination-filtering-sorting.md#129-complex-filtering-via-search) | MUST | M+R | Complex filtering via search |
| [12.10](part-c/12-pagination-filtering-sorting.md#1210-sparse-fieldsets-out-of-scope) | — | — | Sparse fieldsets out of scope |
| [13.1](part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) | MUST | M | Default security on every operation |
| [13.2](part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations) | MUST | M+R | OAuth and OIDC for citizen operations |
| [13.3](part-d/13-authentication-and-authorisation.md#133-distinct-scheme-for-bb-to-bb-calls) | MUST | M+R | Distinct scheme for BB-to-BB calls |
| [13.4](part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | MUST | M | Namespaced OAuth scopes |
| [13.5](part-d/13-authentication-and-authorisation.md#135-authorization-is-the-credential-channel) | MUST | M+R | Authorization is the credential channel |
| [13.6](part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) | MUST | R | API keys only for operational endpoints |
| [13.7](part-d/13-authentication-and-authorisation.md#137-protected-transport) | MUST | M+R | Protected transport |
| [14.1](part-d/14-idempotency.md#141-idempotency-key-on-non-idempotent-posts) | MUST | M+R | Idempotency-Key on non-idempotent POSTs |
| [14.2](part-d/14-idempotency.md#142-opaque-client-generated-keys) | MUST | R | Opaque client-generated keys |
| [14.3](part-d/14-idempotency.md#143-documented-replay-window) | SHOULD | R | Documented replay window |
| [14.6](part-d/14-idempotency.md#146-naturally-idempotent-designs) | SHOULD | R | Naturally idempotent designs |
| [15.1](part-d/15-asynchronous-operations.md#151-202-with-operation-location) | MUST | M+R | 202 with Operation Location |
| [15.2](part-d/15-asynchronous-operations.md#152-local-operation-resource-shape) | SHOULD | M+R | Local Operation resource shape |
| [15.3](part-d/15-asynchronous-operations.md#153-documented-operation-lifecycle) | SHOULD | M+R | Documented Operation lifecycle |
| [15.4](part-d/15-asynchronous-operations.md#154-polling-the-operation-resource) | MUST | M+R | Polling the Operation resource |
| [15.5](part-d/15-asynchronous-operations.md#155-cancellation-via-cancel-sub-resource) | MUST | M+R | Cancellation via cancel sub-resource |
| [15.6](part-d/15-asynchronous-operations.md#156-webhook-completion-notification) | SHOULD | R | Webhook completion notification |
| [15.7](part-d/15-asynchronous-operations.md#157-documented-result-retention) | SHOULD | R | Documented result retention |
| [18.1](part-d/18-compatibility-and-lifecycle.md#181-semver-versioning) | MUST | M | SemVer versioning |
| [18.2](part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel) | MUST | M | Major version in path or channel |
| [18.3](part-d/18-compatibility-and-lifecycle.md#183-backward-compatible-minor-changes) | MUST | M+R | Backward-compatible minor changes |
| [18.4](part-d/18-compatibility-and-lifecycle.md#184-breaking-changes-bump-major-version) | MUST | M+R | Breaking changes bump major version |
| [18.5](part-d/18-compatibility-and-lifecycle.md#185-deprecation-and-sunset-headers) | MUST | M+R | Deprecation and Sunset headers |
| [18.6](part-d/18-compatibility-and-lifecycle.md#186-clients-ignore-unknown-fields) | — | — | Clients ignore unknown fields |
| [19.3](part-e/19-localisation.md#193-declared-default-language) | MUST | R | Declared default language |
| [19.4](part-e/19-localisation.md#194-declare-the-response-language) | MUST | M+R | Declare the response language |
| [20.1](part-e/20-conformance-and-validation.md#201-every-file-passes-validation) | MUST | M | Every file passes validation |
| [20.2](part-e/20-conformance-and-validation.md#202-passes-the-govstack-spectral-ruleset) | MUST | M | Passes the GovStack Spectral ruleset |
| [20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) | MUST | M | Declared guide conformance version |

## Event and webhook surfaces

87 rules.

| Rule | Level | Class | Title |
| --- | --- | --- | --- |
| [3.1](part-a/3-asyncapi-document-standards.md#31-asyncapi-300-required) | MUST | M | Qualified AsyncAPI 3 version required |
| [3.2](part-a/3-asyncapi-document-standards.md#32-one-canonical-asyncapi-entrypoint) | MUST | M+R | One canonical AsyncAPI entrypoint |
| [3.3](part-a/3-asyncapi-document-standards.md#33-no-divergent-asyncapi-copies) | MUST | R | No divergent AsyncAPI copies |
| [3.4](part-a/3-asyncapi-document-standards.md#34-passes-an-asyncapi-validator) | MUST | M | Passes an AsyncAPI validator |
| [3.5](part-a/3-asyncapi-document-standards.md#35-complete-asyncapi-info-block) | MUST | M | Complete AsyncAPI info block |
| [3.6](part-a/3-asyncapi-document-standards.md#36-servers-channels-operations-and-messages) | MUST | M+R | Servers channels operations and messages |
| [3.7](part-a/3-asyncapi-document-standards.md#37-complete-asyncapi-operation-metadata) | MUST | M+R | Complete AsyncAPI operation metadata |
| [3.8](part-a/3-asyncapi-document-standards.md#38-pinned-vendored-asyncapi-components) | MUST | M | Pinned vendored AsyncAPI components |
| [3.9](part-a/3-asyncapi-document-standards.md#39-json-schema-payload-conventions) | MUST | M | JSON Schema payload conventions |
| [4.1](part-a/4-documentation-requirements.md#41-useful-schema-descriptions) | MUST | M | Useful schema descriptions |
| [4.2](part-a/4-documentation-requirements.md#42-examples-for-bodies-and-enums) | MUST | M+R | Examples for bodies and enums |
| [4.3](part-a/4-documentation-requirements.md#43-no-placeholder-text) | MUST | M+R | No placeholder text |
| [4.4](part-a/4-documentation-requirements.md#44-accurate-operation-descriptions) | MUST | R | Accurate operation descriptions |
| [4.5](part-a/4-documentation-requirements.md#45-api-surface-inventory) | MUST | M+R | API surface inventory |
| [4.6](part-a/4-documentation-requirements.md#46-functional-requirement-traceability) | MUST | M+R | Functional-requirement traceability |
| [9.1](part-c/9-json-conventions-and-naming.md#91-json-as-default-media-type) | MUST | M+R | JSON as default media type |
| [9.2](part-c/9-json-conventions-and-naming.md#92-camelcase-field-names) | SHOULD | M | camelCase field names |
| [9.3](part-c/9-json-conventions-and-naming.md#93-real-json-booleans) | MUST | M | Real JSON booleans |
| [9.4](part-c/9-json-conventions-and-naming.md#94-explicit-nullability) | MUST | M | Explicit nullability |
| [9.5](part-c/9-json-conventions-and-naming.md#95-no-spaces-or-non-ascii-names) | SHOULD | M | No spaces or non-ASCII names |
| [9.6](part-c/9-json-conventions-and-naming.md#96-avoid-abbreviations) | SHOULD | R | Avoid abbreviations |
| [9.7](part-c/9-json-conventions-and-naming.md#97-screaming-snake-case-enum-values) | MUST | M | Screaming snake case enum values |
| [9.8](part-c/9-json-conventions-and-naming.md#98-forward-compatible-schemas) | MUST | M | Forward-compatible schemas |
| [9.9](part-c/9-json-conventions-and-naming.md#99-no-closed-enums-for-growing-sets) | MUST | R | No closed enums for growing sets |
| [9.10](part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix) | MUST | M+R | GovStack extension prefix |
| [9.11](part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code) | MUST | M+R | Single registered BB code |
| [10.1](part-c/10-data-types-and-formats.md#101-opaque-server-generated-identifiers) | MUST | M+R | Opaque server-generated identifiers |
| [10.2](part-c/10-data-types-and-formats.md#102-rfc-3339-timestamps) | MUST | M | RFC 3339 timestamps |
| [10.3](part-c/10-data-types-and-formats.md#103-rfc-3339-calendar-dates) | MUST | M | RFC 3339 calendar dates |
| [10.4](part-c/10-data-types-and-formats.md#104-decimal-string-monetary-amounts) | MUST | M+R | Decimal-string monetary amounts |
| [10.5](part-c/10-data-types-and-formats.md#105-e164-phone-numbers) | MUST | M+R | E.164 phone numbers |
| [10.6](part-c/10-data-types-and-formats.md#106-rfc-5322-email-addresses) | MUST | M+R | RFC 5322 email addresses |
| [10.7](part-c/10-data-types-and-formats.md#107-binary-uploads-and-base64-payloads) | MUST | M+R | Binary uploads and base64 payloads |
| [10.8](part-c/10-data-types-and-formats.md#108-iso-3166-1-country-codes) | MUST | M+R | ISO 3166-1 country codes |
| [10.9](part-c/10-data-types-and-formats.md#109-bcp-47-language-codes) | MUST | M+R | BCP 47 language codes |
| [10.10](part-c/10-data-types-and-formats.md#1010-iso-4217-currency-codes) | MUST | M+R | ISO 4217 currency codes |
| [10.11](part-c/10-data-types-and-formats.md#1011-utf-8-text-encoding) | MUST | M | UTF-8 text encoding |
| [11.6](part-c/11-errors.md#116-transport-neutral-asynchronous-errors) | MUST | M+R | Transport-neutral asynchronous errors |
| [13.1](part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) | MUST | M | Default security on every operation |
| [13.2](part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations) | MUST | M+R | OAuth and OIDC for citizen operations |
| [13.3](part-d/13-authentication-and-authorisation.md#133-distinct-scheme-for-bb-to-bb-calls) | MUST | M+R | Distinct scheme for BB-to-BB calls |
| [13.4](part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes) | MUST | M | Namespaced OAuth scopes |
| [13.5](part-d/13-authentication-and-authorisation.md#135-authorization-is-the-credential-channel) | MUST | M+R | Authorization is the credential channel |
| [13.6](part-d/13-authentication-and-authorisation.md#136-api-keys-only-for-operational-endpoints) | MUST | R | API keys only for operational endpoints |
| [13.7](part-d/13-authentication-and-authorisation.md#137-protected-transport) | MUST | M+R | Protected transport |
| [16.1](part-d/16-cloudevents-and-webhooks.md#161-event-surfaces-documented) | MUST | M+R | Event surfaces documented |
| [16.2](part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required) | MUST | M | CloudEvents envelope required |
| [16.3](part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types) | MUST | M | Reverse-DNS event types |
| [16.4](part-d/16-cloudevents-and-webhooks.md#164-stable-cloudevents-source) | MUST | M+R | Stable CloudEvents source |
| [16.5](part-d/16-cloudevents-and-webhooks.md#165-optional-signed-event-delivery) | MAY | R | Optional signed event delivery |
| [16.6](part-d/16-cloudevents-and-webhooks.md#166-signature-metadata-when-used) | MUST | R | Signature metadata when used |
| [16.8](part-d/16-cloudevents-and-webhooks.md#168-separate-experimental-signing-profile) | MUST | R | Separate experimental signing profile |
| [16.9](part-d/16-cloudevents-and-webhooks.md#169-readiness-for-a-shared-signature-profile) | — | — | Readiness for a shared signature profile |
| [16.10](part-d/16-cloudevents-and-webhooks.md#1610-documented-delivery-failure-contract) | SHOULD | R | Documented delivery-failure contract |
| [16.11](part-d/16-cloudevents-and-webhooks.md#1611-subscription-management-interfaces) | MUST | M+R | Subscription management interfaces |
| [17.1](part-d/17-asyncapi-channel-rules.md#171-send-and-receive-perspective) | MUST | M+R | Send and receive perspective |
| [17.2](part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses) | MUST | M+R | Stable logical channel IDs and native addresses |
| [17.3](part-d/17-asyncapi-channel-rules.md#173-no-personal-data-in-channels) | MUST | R | No personal data in channels |
| [17.4](part-d/17-asyncapi-channel-rules.md#174-declared-channel-parameters) | MUST | M+R | Declared channel parameters |
| [17.5](part-d/17-asyncapi-channel-rules.md#175-no-environment-names-in-addresses) | SHOULD | M+R | No environment names in addresses |
| [17.6](part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads) | MUST | M | Structured CloudEvents JSON payloads |
| [17.7](part-d/17-asyncapi-channel-rules.md#177-shared-cloudevents-envelope-schema) | MUST | M | Shared CloudEvents envelope schema |
| [17.8](part-d/17-asyncapi-channel-rules.md#178-message-headers-and-idempotency-metadata) | MUST | M+R | Message headers and idempotency metadata |
| [17.9](part-d/17-asyncapi-channel-rules.md#179-message-localisation-headers) | MUST | M+R | Message localisation headers |
| [17.10](part-d/17-asyncapi-channel-rules.md#1710-security-schemes-cover-every-operation) | MUST | M+R | Security schemes cover every operation |
| [17.11](part-d/17-asyncapi-channel-rules.md#1711-duplicate-delivery-contract) | SHOULD | R | Duplicate delivery contract |
| [17.12](part-d/17-asyncapi-channel-rules.md#1712-ordering-only-when-promised) | SHOULD | R | Ordering only when promised |
| [17.13](part-d/17-asyncapi-channel-rules.md#1713-public-delivery-management-capabilities) | SHOULD | R | Public delivery-management capabilities |
| [17.14](part-d/17-asyncapi-channel-rules.md#1714-implementation-values-in-protocol-profiles) | SHOULD | R | Implementation values in protocol profiles |
| [17.15](part-d/17-asyncapi-channel-rules.md#1715-no-universal-delivery-extensions) | SHOULD | R | No universal delivery extensions |
| [17.16](part-d/17-asyncapi-channel-rules.md#1716-async-rejection-error-messages) | MUST | M+R | Async rejection error messages |
| [17.17](part-d/17-asyncapi-channel-rules.md#1717-declared-request-reply-correlation) | MUST | M+R | Declared request-reply correlation |
| [17.18](part-d/17-asyncapi-channel-rules.md#1718-correlated-completion-signals) | SHOULD | M+R | Correlated completion signals |
| [17.19](part-d/17-asyncapi-channel-rules.md#1719-protocol-bindings-where-relevant) | MUST | M+R | Protocol bindings where relevant |
| [17.20](part-d/17-asyncapi-channel-rules.md#1720-representative-message-examples) | SHOULD | M+R | Representative message examples |
| [18.1](part-d/18-compatibility-and-lifecycle.md#181-semver-versioning) | MUST | M | SemVer versioning |
| [18.2](part-d/18-compatibility-and-lifecycle.md#182-major-version-in-path-or-channel) | MUST | M | Major version in path or channel |
| [18.3](part-d/18-compatibility-and-lifecycle.md#183-backward-compatible-minor-changes) | MUST | M+R | Backward-compatible minor changes |
| [18.4](part-d/18-compatibility-and-lifecycle.md#184-breaking-changes-bump-major-version) | MUST | M+R | Breaking changes bump major version |
| [18.5](part-d/18-compatibility-and-lifecycle.md#185-deprecation-and-sunset-headers) | MUST | M+R | Deprecation and Sunset headers |
| [18.6](part-d/18-compatibility-and-lifecycle.md#186-clients-ignore-unknown-fields) | — | — | Clients ignore unknown fields |
| [18.7](part-d/18-compatibility-and-lifecycle.md#187-asyncapi-deprecation-metadata) | MUST | M+R | AsyncAPI deprecation metadata |
| [19.3](part-e/19-localisation.md#193-declared-default-language) | MUST | R | Declared default language |
| [19.4](part-e/19-localisation.md#194-declare-the-response-language) | MUST | M+R | Declare the response language |
| [20.1](part-e/20-conformance-and-validation.md#201-every-file-passes-validation) | MUST | M | Every file passes validation |
| [20.2](part-e/20-conformance-and-validation.md#202-passes-the-govstack-spectral-ruleset) | MUST | M | Passes the GovStack Spectral ruleset |
| [20.3](part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) | MUST | M | Declared guide conformance version |

## Deployment profile (runtime obligations)

8 rules.

| Rule | Level | Class | Title |
| --- | --- | --- | --- |
| [6.3](part-b/6-http-methods.md#63-put-replaces-the-entire-resource) | MUST | R | PUT replaces the entire resource |
| [11.5](part-c/11-errors.md#115-stable-http-problem-fields-across-languages) | MUST | R | Stable HTTP problem fields across languages |
| [14.2](part-d/14-idempotency.md#142-opaque-client-generated-keys) | MUST | R | Opaque client-generated keys |
| [14.4](part-d/14-idempotency.md#144-replay-returns-original-response) | MUST | R | Replay returns original response |
| [14.5](part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch) | MUST | R | Key reuse and fingerprint mismatch |
| [16.7](part-d/16-cloudevents-and-webhooks.md#167-replay-detectable-signed-material) | MUST | R | Replay-detectable signed material |
| [19.1](part-e/19-localisation.md#191-honour-the-request-language) | MUST | R | Honour the request language |
| [19.2](part-e/19-localisation.md#192-never-translate-stable-content) | MUST | R | Never translate stable content |
