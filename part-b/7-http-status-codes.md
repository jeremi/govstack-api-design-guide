---
description: "Rules mapping API outcomes to standard HTTP status codes, caching, and concurrency headers."
---

# 7. HTTP status codes

{% hint style="info" %}
**Intent.** Status codes are part of the contract. Same outcome, same code, across BBs.

**Applies to:** OpenAPI surface only (HTTP/REST).
{% endhint %}

## 7.1 200 for successful reads <a href="#71-200-for-successful-reads" id="71-200-for-successful-reads"></a>

<!-- rule-class: R -->

A successful read or completed non-creation action that returns a representation **SHOULD** use `200 OK`.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that successful reads and completed non-creation actions return `200` with a representation.
<!-- verification:end -->

## 7.2 201 Created with Location <a href="#72-201-created-with-location" id="72-201-created-with-location"></a>

<!-- rule-class: M+R -->

A resource creation that completes during the request **MUST** use `201 Created`. The response **MUST** include a `Location` header pointing to the created resource. An operation that has only been accepted for later processing **MUST NOT** return `201`; it **MUST** use `202` under [§7.3](#73-202-accepted-for-async-operations).

Whether an operation creates a resource or merely accepts work requires semantic review. The linter checks declared response structure; an operation's name alone does not establish its creation semantics.

When the requested operation is the creation of a job or Operation resource and that resource is addressable when the response returns, the creation is complete: `201 Created` with `Location` applies even though the work the job represents is still running. `202` under [§7.3](#73-202-accepted-for-async-operations) is for the case where the request has only been accepted and the requested resource is not yet addressable. In both cases the running state of the job does not imply that the business work succeeded (RFC 9110 §15.3.2 and §15.3.3).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that every declared `201` response includes a `Location` header. A reviewer checks that the operation really completes a creation, that accepted-only work uses `202`, and that the header points to the created resource.
<!-- verification:end -->

## 7.3 202 Accepted for async operations <a href="#73-202-accepted-for-async-operations" id="73-202-accepted-for-async-operations"></a>

<!-- rule-class: M+R -->

Work accepted but not completed during the request **MUST** use `202 Accepted`. The response **MUST** include a `Location` header pointing to an Operation resource and, where HTTP permits response content, **MUST** return that Operation representation using the local schema defined under [§15](../part-d/15-asynchronous-operations.md). `202` **MUST NOT** claim that the requested work succeeded.

A request whose requested operation is the creation of a job or Operation resource that is addressable when the response returns is a completed creation under [§7.2](#72-201-created-with-location), not work accepted under this rule.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that every declared `202` response includes a `Location` header and, except for `HEAD`, content with a non-empty schema. A reviewer checks that the work really is asynchronous and that the content follows the local Operation schema.
<!-- verification:end -->

## 7.4 204 for void responses <a href="#74-204-for-void-responses" id="74-204-for-void-responses"></a>

<!-- rule-class: R -->

A successful synchronous DELETE or other successful operation with no response representation **SHOULD** use `204 No Content` and **SHOULD NOT** include a response body.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter flags a `204` response that declares content, and a `DELETE` `204` with a body. A reviewer checks that operations with no representation use `204` rather than `200`.
<!-- verification:end -->

## 7.5 400 for malformed requests <a href="#75-400-for-malformed-requests" id="75-400-for-malformed-requests"></a>

<!-- rule-class: R -->

An operation that accepts path, query, header, or body input **MUST** declare `400 Bad Request` for malformed, unparseable, or structurally invalid input.

Well-formed input that violates domain semantics **SHOULD** use `422` under [§7.11](#711-422-for-semantic-errors).

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter flags an operation with a request body or path or query parameters that declares no `400` response, through the baseline check under 7.14. A reviewer checks that `400` is used for malformed input and `422` for semantic errors.
<!-- verification:end -->

## 7.6 401 with WWW-Authenticate <a href="#76-401-with-www-authenticate" id="76-401-with-www-authenticate"></a>

<!-- rule-class: M+R -->

Every operation requiring authentication **MUST** declare `401 Unauthorized` for missing or invalid authentication. The response **MUST** include a `WWW-Authenticate` header (RFC 9110).

For an OAuth 2.0 bearer scheme ([§13.2](../part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations)), a challenge for an invalid token **SHOULD** carry the RFC 6750 `invalid_token` error; a challenge for a request containing no authentication credentials **SHOULD NOT** include an OAuth error code.

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

The linter checks that every `401` declared on a `GET`, `PUT`, `POST`, `DELETE` or `PATCH` operation under `paths` lists a `WWW-Authenticate` header, and flags secured operations that declare no `401` through the baseline check under 7.14. A reviewer checks the challenge value, such as the bearer `invalid_token` error.
<!-- verification:end -->

## 7.7 403 when not authorised <a href="#77-403-when-not-authorised" id="77-403-when-not-authorised"></a>

<!-- rule-class: R -->

Every secured operation that can reject an authenticated caller for insufficient permission **MUST** declare `403 Forbidden`.

A BB **MAY** return `404` instead when concealing the existence of a forbidden resource is part of its documented security contract, as allowed by RFC 9110.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter flags an operation whose security requirements name scopes but that declares no `403`, through the baseline check under 7.14. A reviewer checks other operations that can reject a caller, and any documented choice to return `404` instead.
<!-- verification:end -->

## 7.8 404 for missing resources <a href="#78-404-for-missing-resources" id="78-404-for-missing-resources"></a>

<!-- rule-class: R -->

Every operation that addresses a specific resource **MUST** declare `404 Not Found` for an absent resource or for a resource whose existence is intentionally concealed under [§7.7](#77-403-when-not-authorised). An empty collection **MUST** return `200` with an empty `items` array, not `404`.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter flags an operation on a path with a `{param}` segment that declares no `404`, through the baseline check under 7.14. A reviewer checks that an empty collection returns `200` with an empty `items` array.
<!-- verification:end -->

## 7.9 409 for state conflicts <a href="#79-409-for-state-conflicts" id="79-409-for-state-conflicts"></a>

<!-- rule-class: R -->

An operation that creates a uniquely keyed resource, performs a state transition, or supports idempotent retry **SHOULD** declare `409 Conflict` when it can conflict with current resource or processing state, including an illegal transition or concurrent in-flight retry under [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch). A failed conditional request precondition **SHOULD** use `412` ([§7.15](#715-412-for-failed-preconditions)), not `409`.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that operations which can conflict with current state declare `409`, and that failed preconditions use `412` instead.
<!-- verification:end -->

## 7.10 410 for permanent removal <a href="#710-410-for-permanent-removal" id="710-410-for-permanent-removal"></a>

<!-- rule-class: R -->

A server **SHOULD** use `410 Gone` only when it knows that a resource or endpoint has been permanently removed; otherwise it **SHOULD** use `404`.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that `410` is used only for a resource or endpoint known to be permanently removed.
<!-- verification:end -->

## 7.11 422 for semantic errors <a href="#711-422-for-semantic-errors" id="711-422-for-semantic-errors"></a>

<!-- rule-class: R -->

A well-formed request that violates domain validation or other semantic constraints **SHOULD** use `422 Unprocessable Content` (RFC 9110; formerly "Unprocessable Entity"). The idempotency-fingerprint use of `422` is in [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch).

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that well-formed requests that violate domain validation return `422`.
<!-- verification:end -->

## 7.12 429 for rate limits <a href="#712-429-for-rate-limits" id="712-429-for-rate-limits"></a>

<!-- rule-class: R -->

An operation that enforces a caller-visible rate limit **SHOULD** declare `429 Too Many Requests` with the `Retry-After` header described in [§8.7](../part-b/8-headers.md#87-rate-limit-headers-declared).

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter only checks that a declared `429` response lists `Retry-After`, as an information-level finding under 8.7. A reviewer checks that operations enforcing a caller-visible rate limit declare `429` at all.
<!-- verification:end -->

## 7.13 Server errors documented <a href="#713-server-errors-documented" id="713-server-errors-documented"></a>

<!-- rule-class: M -->

Every operation **MUST** declare `500 Internal Server Error`.

Operations exposed through a gateway or dependent service **SHOULD** additionally declare the applicable `502`, `503`, and `504` responses.

<!-- verification:start -->
**Verification:** Automated specification check.

The linter flags any operation under `paths` that declares no `500` response. A reviewer checks the additional `502`, `503` and `504` responses for operations behind a gateway or dependent service.
<!-- verification:end -->

## 7.14 All status codes declared <a href="#714-all-status-codes-declared" id="714-all-status-codes-declared"></a>

<!-- rule-class: M -->

Every operation **MUST** declare the status codes it can return. Declaring only `200` is forbidden.

A `default` response **MUST NOT** replace an explicitly required status code. Non-error responses **MUST** be declared explicitly; `default`, when used, **MUST** describe only otherwise unspecified errors and follow [§11.1](../part-c/11-errors.md#111-rfc-9457-problem-details).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter flags operations with fewer than two responses or no error response, creation-like `POST` operations without `201` or `202`, and missing `400`, `401`, `403` or `404` where security, parameters or path call for them. A reviewer checks completeness and use of `default`.
<!-- verification:end -->

## 7.15 412 for failed preconditions <a href="#715-412-for-failed-preconditions" id="715-412-for-failed-preconditions"></a>

<!-- rule-class: R -->

A failed conditional request precondition such as `If-Match` **SHOULD** use `412 Precondition Failed`.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter only checks that `PUT` and `PATCH` operations declare a `412` response, as an information-level finding under 7.17. A reviewer checks that failed preconditions use `412` rather than `409`.
<!-- verification:end -->

## 7.16 ETag and If-None-Match <a href="#716-etag-and-if-none-match" id="716-etag-and-if-none-match"></a>

<!-- rule-class: M+R -->

Endpoints that return a single resource **SHOULD** advertise an `ETag` response header derived from the selected representation.

Collection responses, including paginated pages, **MAY** advertise an `ETag`. `GET` clients **MAY** send `If-None-Match` to receive `304 Not Modified` on no change. The validator requirements for write concurrency are in [§7.17](#717-optimistic-concurrency-with-if-match).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags, as an information-level finding, a `GET` returning a single resource that has no `ETag` header on its `200` response or no `304` response. Collection responses, `/health` and `/ready` are skipped; a reviewer checks the `ETag` is derived from the representation.
<!-- verification:end -->

## 7.17 Optimistic concurrency with If-Match <a href="#717-optimistic-concurrency-with-if-match" id="717-optimistic-concurrency-with-if-match"></a>

<!-- rule-class: M+R -->

An endpoint that supports optimistic concurrency **MUST** accept `If-Match` carrying a strong `ETag`, **MUST** provide a strong validator suitable for the strong comparison `If-Match` requires, and **MUST** return `412 Precondition Failed` ([§7.15](#715-412-for-failed-preconditions)) when the resource has changed, not `409`; `409` ([§7.9](#79-409-for-state-conflicts)) is reserved for conflicts not expressed by a conditional precondition.

`PUT` and `PATCH` endpoints **SHOULD** support optimistic concurrency. An endpoint that requires a conditional write **SHOULD** return `428 Precondition Required` when `If-Match` is absent.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags, as an information-level finding, a `PUT` or `PATCH` that declares no `If-Match` header parameter or no `412` response. It cannot tell which endpoints support optimistic concurrency; a reviewer checks strong validators, `428` and the reservation of `409`.
<!-- verification:end -->

## 7.18 405 with Allow header <a href="#718-405-with-allow-header" id="718-405-with-allow-header"></a>

<!-- rule-class: M -->

`405 Method Not Allowed`: the target resource does not support the request method. The response **MUST** include an `Allow` header listing the supported methods (RFC 9110).

<!-- verification:start -->
**Verification:** Automated specification check.

The linter checks that every `405` declared on a `GET`, `PUT`, `POST`, `DELETE` or `PATCH` operation under `paths` lists an `Allow` header. It does not check the listed methods; a test against a running implementation checks that the header names the methods the resource supports.
<!-- verification:end -->

## 7.19 415 for unsupported media types <a href="#719-415-for-unsupported-media-types" id="719-415-for-unsupported-media-types"></a>

<!-- rule-class: M+R -->

`415 Unsupported Media Type`: the request payload media type is not supported. PATCH endpoints ([§6.4](../part-b/6-http-methods.md#64-patch-uses-a-registered-patch-format)) **MUST** return `415` when the request does not use one of the registered patch media types documented by that operation.

`406 Not Acceptable` **MAY** be returned when no representation matches the request `Accept` header.

<!-- verification:start -->
**Verification:** Automated specification check. Semantic review is also required.

The linter checks that every `PATCH` operation declares a `415` response. A test against a running implementation checks that an unsupported patch media type is actually rejected with `415`.
<!-- verification:end -->

## 7.20 No-store on error responses <a href="#720-no-store-on-error-responses" id="720-no-store-on-error-responses"></a>

<!-- rule-class: M -->

Error responses (`application/problem+json`) and Operation-status responses ([§15](../part-d/15-asynchronous-operations.md)) **SHOULD** declare `Cache-Control: no-store`, so a shared cache cannot replay a transient failure or stale operation state. Broader caching behaviour is operational and out of scope ([§1.2](../1-introduction.md#12-scope)).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter checks that a response offering `application/problem+json` declares a `Cache-Control` header, but not its value. A reviewer checks for `no-store` and covers Operation-status responses, which the linter does not recognise.
<!-- verification:end -->

## 7.21 Schemas for successful response bodies <a href="#721-schemas-for-successful-response-bodies" id="721-schemas-for-successful-response-bodies"></a>

<!-- rule-class: M -->

Every declared `2xx` response that carries a body **MUST** declare at least one concrete media type and a response schema for each declared media type. An empty schema or description without a schema **MUST NOT** stand in for a response contract. Responses whose HTTP semantics prohibit a body, including `204`, **MUST NOT** declare response content.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter flags a `2xx` response whose media type has no schema or an empty one, and any `HEAD`, `204` or `205` response that declares content. Paths, webhooks and callbacks are covered; `202` bodies are checked under 15.1. A `2xx` with no `content` and wildcard media types such as `*/*` are not flagged; a reviewer checks that every response carrying a body declares a concrete media type.
<!-- verification:end -->
