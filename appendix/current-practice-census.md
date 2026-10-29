---
description: "Informative snapshot of the conventions used by published Building Block API specifications, and where the guide departs from them."
---

# Appendix. Current practice census

This appendix is informative. It records what the published Building Block (BB) API specifications did on 2026-10-22, so that each rule that departs from current practice can be read with its evidence and its transition path.

## Method

On 2026-10-22 a script kept outside this book parsed every OpenAPI or Swagger file under the `api/` folder of the GovStack repositories `bb-consent`, `bb-digital-registries`, `bb-esignature`, `bb-gis`, `bb-identity`, `bb-information-mediator`, `bb-payments`, `bb-registration`, and `bb-wallet`, plus `govstack-api-common` and `bb-template` (which carry shared schemas and no operations). It read the repository working trees and counted conventions on twenty axes. For digital registries the counts cover the canonical files only (`api/openapi.yaml`, `api/examples/`, `api/common/`), not the `api/legacy/` archive. The wallet repository holds only empty specification files, and one payments file did not parse, so payments counts cover 35 of its 36 files; three more payments files repeat a `parameters` key, which the census parser resolved by keeping the last occurrence. AsyncAPI documents were not counted. Collection and pagination detection is heuristic, and the census reads specification files only, not implementations. Surfaces governed by an external standard keep that standard's spelling ([§1.7](../1-introduction.md#17-precedence-of-external-standards)), so OAuth 2.0 and OpenID Connect names in identity are not counted as departures.

Abbreviations: CON consent, REG digital registries, ESG esignature, GIS gis, IDN identity, IM information mediator, PAY payments, RGN registration. The eight BBs with operations are the population; "BBs" in the counts below means these eight specifications.

## Findings by convention

### Path casing

| Variant | BBs | Detail |
|---|---|---|
| Multi-word segments in kebab-case | 3 (CON, REG, IDN) | CON 17 kebab segments, REG 5, IDN 16 |
| Multi-word segments mostly in camelCase | 5 (ESG, GIS, IM, PAY, RGN) | ESG 2, GIS 28 (and 1 kebab), IM 6, PAY 13 (and 2 kebab), RGN 2 |

Across all eight BBs: 51 camelCase multi-word segments and 41 kebab-case ones.

### Major version placement

| Variant | BBs | Detail |
|---|---|---|
| No version in path or server | 3 (CON, IDN, RGN) | |
| `/v1` path prefix on every path | 1 (REG) | 10 versioned paths; the 8 unversioned ones are well-known and health endpoints |
| `/api/v1` on some paths | 2 (IM, PAY) | IM 4 of 16 paths, PAY 2 of 35 |
| `{version}` path parameter | 1 (ESG) | on all 12 paths |
| `{version}` server variable | 1 (GIS) | `https://host/{version}/gisBB/<module>` |

### Pagination parameters, envelope, and totals

| Variant | BBs | Detail |
|---|---|---|
| `pageSize` and `cursor` | 1 (REG) | |
| `offset` and `limit` | 1 (CON) | on 11 list operations |
| `pageNo` and `pageSize` | 1 (PAY) | on 1 operation |
| `pageSize` only | 1 (IM) | on 1 operation |
| `start` | 1 (ESG) | on 1 operation |
| No pagination parameters | 2 (GIS, RGN) | RGN returns 5 bare-array lists |

| Collection envelope | BBs | Detail |
|---|---|---|
| `{items, pageInfo}` | 1 (REG) | |
| Resource-named arrays | 2 (CON, IM) | CON `consentRecords`, `individuals`, `dataAgreements`, `policies`, `webhooks`; IM `member`, `members`, `allowList` |
| Bare arrays | 3 (ESG, PAY, RGN) | PAY also `{paymentModalityList}` |
| Not detected | 1 (GIS) | |

No BB returns a total count except REG, where it is optional. Sorting: REG uses `sort`, RGN uses `sortBy` with `sortOrder`, the others have none. Field selection: REG uses `fields` for top-level data fields; PAY uses `fields` as an enumerated view switch on 2 operations.

### Error format

| Variant | BBs | Detail |
|---|---|---|
| RFC 9457 `application/problem+json` | 1 (REG) | 48 declared problem responses |
| House JSON shape with a code, message, and request or trace id | 2 (PAY, RGN) | PAY `{code, reason, requestID}` plus 5 spelling variants under `application/json`; RGN `{traceId, code, message, localizedMessage}` under `*/*` |
| OAuth `{error, error_description}` | 1 (IDN) | external standard |
| No error body declared | 4 (CON, ESG, GIS, IM) | description only |

Declared `500` responses: CON 0 of 42 operations, REG 12 of 13, ESG 0 of 12, GIS 5 of 67, IDN 0 of 15, IM 22 of 26, PAY 0 of 35, RGN 6 of 13.

### Custom headers

| Variant | BBs | Detail |
|---|---|---|
| `X-` prefixed request headers | 4 (ESG, IDN, IM, PAY) | 16 distinct `X-` names; ESG `X-GovStack-AuthenticationToken`, `X-GovStack-PaymentToken`, `X-Pseodonym-Token`; IDN `X-XSRF-TOKEN`; IM `X-GovStack-Client` (17 uses); PAY `X-CorrelationID` (15), `X-Platform-TenantId` (12), `X-Callback-URL` (7), `X-billerId` (6), `X-PayerFI-Id` (4), and others |
| Unprefixed custom request headers | 3 (IDN, PAY, RGN) | IDN `PARTNER-ID`, `PARTNER-API-KEY`; PAY `Platform-TenantId` (4); RGN `Information-Mediator-Client` (5) |
| Only standard headers | 3 (CON, REG, GIS) | REG declares `traceparent` and `If-None-Match`; CON and GIS declare none |

Only REG declares W3C `traceparent`. PAY carries tenant, biller, payer institution, and programme identifiers, and callback URLs, in request headers.

The client-identification header for calls through the Information Mediator is spelled `X-GovStack-Client` in IM's own API and `Information-Mediator-Client` in RGN (and 52 times in the REG legacy archive).

### Identifiers

| Variant | BBs | Detail |
|---|---|---|
| `<thing>Id` path parameters | 7 (CON, REG, ESG, GIS, IM, PAY, RGN) | IM also uses X-Road addressing segments (`instanceId`, `memberClass`, `memberCode`, `applicationCode`); IDN uses `client_id` from OpenID Connect |
| `id` property on resources | 4 (CON, IDN, IM, RGN) | CON 12, IDN 4, IM 6, RGN 1 (RGN otherwise uses `<thing>Id`) |
| `<thing>Id` properties only | 4 (REG, ESG, GIS, PAY) | PAY spells its request id `requestID` (34), `requestId` (15), `RequestID` (7) |
| `href` property | 1 (REG) | one, as an RFC 9264 link target |

### Specification extensions

| Variant | BBs | Detail |
|---|---|---|
| `x-govstack-` prefixed | 1 (REG) | `x-govstack-api-guide`, `x-govstack-digital-registries`, `x-govstack-components-version` |
| Other GovStack-authored prefix | 1 (CON) | `x-specification-usecase`, `-scenario`, `-pii-or-sensitive`, `-crudl-model` on all 42 operations |
| Tool extensions only | 2 (IDN, IM) | IDN `x-stoplight`, `x-internal`; IM `x-logo` |
| None | 4 (ESG, GIS, PAY, RGN) | |

### Security schemes

| Variant | BBs | Detail |
|---|---|---|
| OAuth 2.0 | 1 (REG) | authorization code and client credentials, on every operation |
| OAuth 2.0 and mutual TLS | 1 (IM) | 22 of 26 operations secured |
| HTTP bearer | 1 (IDN) | 4 of 15 operations |
| API key bound to `X-CorrelationID`, plus bearer | 1 (PAY) | API key in 14 files, bearer in 4, API key on `X-Callback-URL` in 1 |
| None declared | 4 (CON, ESG, GIS, RGN) | ESG authenticates through `X-GovStack-AuthenticationToken` |

### Asynchronous pattern

| Variant | BBs | Detail |
|---|---|---|
| `202` with an identifier in the body, no `Location` | 1 (PAY) | 18 responses; batch identifier in the body |
| Per-request callback URL | 3 (ESG, IDN, PAY) | ESG `callbackUrl` query parameter and body field; IDN callback body fields (2); PAY `X-Callback-URL` header (7), `X-Callback_URL` header (2), once as a path parameter |
| None | 5 (CON, REG, GIS, IM, RGN) | |

No BB declares an Operation resource, an OpenAPI `callbacks` object, or OpenAPI `webhooks`.

### Other axes

| Axis | Finding |
|---|---|
| OpenAPI version | 3.1 in REG, GIS, IDN; 3.0.x in CON, ESG, PAY, RGN; IM has 2 files on 3.0.0 and 1 on 3.1.0 |
| Canonical entrypoint `api/openapi.yaml` | REG only |
| `operationId` coverage | CON 42/42, REG 13/13, ESG 0/12, GIS 0/67, IDN 14/15, IM 26/26, PAY 3/35, RGN 11/13 |
| `201` used for creation | GIS (13), IM (5), IDN (1); not in CON, ESG, PAY, RGN |
| `info.version` matches the specification version | None of the 8; REG documents the two as independent |
| Guide conformance declared | REG only (4 files) |
| JSON property casing | camelCase dominant in all 8 |
| Plural collection segments | plural in REG, GIS, PAY, RGN; CON uses singular (15) |
| Money | PAY only, declared as `format: float` (13) |
| PATCH bodies | ESG 1, GIS 1, IM 4, all plain JSON |

## Departures from current practice

One row per rule where the census shows a majority or a large minority of BBs diverging. "Adopt now" means the change does not alter the wire contract and falls under the immediate obligations of [§1.10](../1-introduction.md#110-applicability-and-transition); the legacy profile of [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) keeps those rules enforced. "Next major" means a wire change that waits for the surface's next major version under [§1.10](../1-introduction.md#110-applicability-and-transition); until then the legacy profile reports it at informational severity. A gap that must outlive the next major goes through the exception process of [§1.6](../1-introduction.md#16-exception-process).

| Rule | Current practice | Guide | Transition |
|---|---|---|---|
| [§2.1](../part-a/2-openapi-document-standards.md#21-openapi-31-required) | 4 BBs on OpenAPI 3.0.x, IM mixed | OpenAPI 3.1 | Adopt now |
| [§2.2](../part-a/2-openapi-document-standards.md#22-one-canonical-openapi-entrypoint) | 7 BBs have no canonical entrypoint; several have empty or duplicate files | One canonical entrypoint per surface | Adopt now |
| [§4.7](../part-a/4-documentation-requirements.md#47-operation-metadata-extensions), [§9.10](../part-c/9-json-conventions-and-naming.md#910-govstack-extension-prefix) | CON uses `x-specification-*` on every operation | `x-govstack-use-case`, `x-govstack-pii`; GovStack extensions prefixed `x-govstack-` | Adopt now (extension names are not wire contract) |
| [§5.1](../part-b/5-url-structure-and-versioning.md#51-major-version-in-the-path) | 3 BBs unversioned, 2 partial `/api/v1`, ESG client-chosen `{version}` path parameter | Major version visible in the path | Next major; GIS meets it by pinning its server variable to the major |
| [§5.2](../part-b/5-url-structure-and-versioning.md#52-plural-noun-resources) | CON singular (15 collections) | Plural nouns (SHOULD) | Next major |
| [§5.3](../part-b/5-url-structure-and-versioning.md#53-kebab-case-path-segments) | 5 BBs use camelCase segments; 51 camel against 41 kebab overall | kebab-case (SHOULD) | Next major |
| [§6.4](../part-b/6-http-methods.md#64-patch-uses-a-registered-patch-format) | All 3 BBs with PATCH (ESG, GIS, IM) use plain JSON | A registered patch format | Next major |
| [§7.2](../part-b/7-http-status-codes.md#72-201-created-with-location) | 4 BBs (CON, ESG, PAY, RGN) return `200` or `202` for creation | `201` with `Location`, including addressable job resources | Next major |
| [§7.13](../part-b/7-http-status-codes.md#713-server-errors-documented), [§7.14](../part-b/7-http-status-codes.md#714-all-status-codes-declared) | REG declares a complete status set except on one `HEAD` operation; 4 BBs declare no `500` | Every status code declared | Adopt now |
| [§8.4](../part-b/8-headers.md#84-w3c-trace-context-correlation) | 7 BBs have no `traceparent`; PAY uses `X-CorrelationID` | W3C Trace Context | Declare as optional now; required behaviour at next major |
| [§8.5](../part-b/8-headers.md#85-no-new-x--prefixed-headers), [§8.8](../part-b/8-headers.md#88-custom-header-naming-and-placement) | 4 BBs use `X-` headers (16 names); PAY carries tenant, business ids, and callback URLs in headers | No `X-` prefix; `GovStack-` for cross-BB headers; identifiers and URLs not in headers | Next major; the mediator header follows [§13.3](../part-d/13-authentication-and-authorisation.md#133-distinct-scheme-for-bb-to-bb-calls) |
| [§10.4](../part-c/10-data-types-and-formats.md#104-decimal-string-monetary-amounts) | The only money user (PAY) declares `float` | Decimal strings | Next major |
| [§11.1](../part-c/11-errors.md#111-rfc-9457-problem-details) | 1 BB on RFC 9457; 2 house shapes; 4 declare no error body | RFC 9457, with optional `code` ([§11.2](../part-c/11-errors.md#112-stable-http-problem-type-uri)) and legacy `requestId` beside `traceId` ([§11.3](../part-c/11-errors.md#113-trace-identifier)) | Next major; existing codes map to `type` and `code` |
| [§12.3](../part-c/12-pagination-filtering-sorting.md#123-cursor-pagination-envelope), [§12.6](../part-c/12-pagination-filtering-sorting.md#126-offset-pagination-envelope) | Only REG uses `items`; 5 other parameter vocabularies; named or bare arrays; no totals | `{items, pageInfo}` or `{items, offset, limit, total?}` | Next major; `total` is optional, matching practice |
| [§12.10](../part-c/12-pagination-filtering-sorting.md#1210-sparse-fieldsets-out-of-scope) | PAY uses `fields` as a view switch | `fields` reserved for top-level field selection | Next major |
| [§13.1](../part-d/13-authentication-and-authorisation.md#131-default-security-on-every-operation) | 4 BBs declare no security scheme; PAY declares a correlation header as an API key | Security declared on every operation | Adopt now, describing what is deployed; shared Information Mediator scheme under [§13.3](../part-d/13-authentication-and-authorisation.md#133-distinct-scheme-for-bb-to-bb-calls) once published |
| [§15.1](../part-d/15-asynchronous-operations.md#151-202-with-operation-location) | PAY returns `202` with a batch id and no `Location`; no BB has an Operation resource | `202` with `Location` and Operation body, or `201` for an addressable job | Next major (PAY batch creation becomes `201`) |
| [§15.8](../part-d/15-asynchronous-operations.md#158-per-request-callback-url) | 3 BBs take callback URLs in headers, query parameters, a path parameter, or body fields | `callbackUrl` body property with an OpenAPI `callbacks` object | Next major |
| [§18.1](../part-d/18-compatibility-and-lifecycle.md#181-semver-versioning) | `info.version` differs from the specification version in all 8 BBs; REG documents the two as independent | Independent versions; each release records the shipped `info.version` | Adopt now |
| [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version) | 7 BBs declare no guide version | Exact guide and ruleset versions, with `profile: legacy` where it applies | Adopt now |

The census is a snapshot taken on 2026-10-22 to inform the guide's decisions. It is not normative, and later changes to BB specifications do not update it.
