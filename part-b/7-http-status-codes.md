---
description: "Rules mapping API outcomes to standard HTTP status codes, caching, and concurrency headers."
---

# 7. HTTP status codes

{% hint style="info" %}
**Intent.** Status codes are part of the contract. Same outcome, same code, across BBs.

**Applies to:** OpenAPI surface only (HTTP/REST).
{% endhint %}

## 7.1 200 for successful reads <a href="#71-200-for-successful-reads" id="71-200-for-successful-reads"></a>

**[R]** `200 OK`: successful read or non-creation action.

## 7.2 201 Created with Location <a href="#72-201-created-with-location" id="72-201-created-with-location"></a>

**[M]** `201 Created`: resource creation. Response **MUST** include a `Location` header pointing to the created resource.

## 7.3 202 Accepted for async operations <a href="#73-202-accepted-for-async-operations" id="73-202-accepted-for-async-operations"></a>

**[M+R]** `202 Accepted`: async operation. Response **MUST** include a `Location` header pointing to an Operation resource (see [§15](../part-d/15-asynchronous-operations.md)).

## 7.4 204 for void responses <a href="#74-204-for-void-responses" id="74-204-for-void-responses"></a>

**[R]** `204 No Content`: successful DELETE or void response.

## 7.5 400 for malformed requests <a href="#75-400-for-malformed-requests" id="75-400-for-malformed-requests"></a>

**[R]** `400 Bad Request`: request is malformed or unparseable.

## 7.6 401 with WWW-Authenticate <a href="#76-401-with-www-authenticate" id="76-401-with-www-authenticate"></a>

**[M+R]** `401 Unauthorized`: missing or invalid authentication. The response **MUST** include a `WWW-Authenticate` header (RFC 9110). For OAuth 2.0 bearer schemes ([§13.2](../part-d/13-authentication-and-authorisation.md#132-oauth-and-oidc-for-citizen-operations)) it **SHOULD** carry the RFC 6750 challenge with an `error` value such as `invalid_token`.

## 7.7 403 when not authorised <a href="#77-403-when-not-authorised" id="77-403-when-not-authorised"></a>

**[R]** `403 Forbidden`: authenticated but not authorised.

## 7.8 404 for missing resources <a href="#78-404-for-missing-resources" id="78-404-for-missing-resources"></a>

**[R]** `404 Not Found`: resource does not exist.

## 7.9 409 for state conflicts <a href="#79-409-for-state-conflicts" id="79-409-for-state-conflicts"></a>

**[R]** `409 Conflict`: a conflict with the current state of the resource that is not expressed as a failed precondition (e.g., creating a duplicate of a uniquely-keyed resource, an illegal state transition, or a concurrent in-flight idempotency retry per [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch)). A failed conditional precondition is `412` ([7.15](#715-412-for-failed-preconditions)), not `409`.

## 7.10 410 for permanent removal <a href="#710-410-for-permanent-removal" id="710-410-for-permanent-removal"></a>

**[R]** `410 Gone`: resource permanently removed; deprecated endpoint past sunset.

## 7.11 422 for semantic errors <a href="#711-422-for-semantic-errors" id="711-422-for-semantic-errors"></a>

**[R]** `422 Unprocessable Content` (RFC 9110; formerly "Unprocessable Entity"): request is well-formed but semantically invalid. The idempotency-fingerprint use of `422` is in [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch). [`[OPEN-6-A]`](../appendix/b-open-questions.md)

## 7.12 429 for rate limits <a href="#712-429-for-rate-limits" id="712-429-for-rate-limits"></a>

**[R]** `429 Too Many Requests`: client exceeded rate limit.

## 7.13 Server errors documented <a href="#713-server-errors-documented" id="713-server-errors-documented"></a>

**[M]** `500`, `502`, `503`, `504`: server errors. Specs **MUST** document `500` at minimum.

## 7.14 All status codes declared <a href="#714-all-status-codes-declared" id="714-all-status-codes-declared"></a>

**[M]** Every operation **MUST** declare the status codes it can return. Declaring only `200` is forbidden.

## 7.15 412 for failed preconditions <a href="#715-412-for-failed-preconditions" id="715-412-for-failed-preconditions"></a>

**[R]** `412 Precondition Failed`: conditional request precondition (e.g., `If-Match`) was not satisfied.

## 7.16 ETag and If-None-Match <a href="#716-etag-and-if-none-match" id="716-etag-and-if-none-match"></a>

**[M+R]** Endpoints that return resources **SHOULD** advertise an `ETag` response header derived from the resource state. `GET` clients **MAY** send `If-None-Match` to receive `304 Not Modified` on no change.

## 7.17 Optimistic concurrency with If-Match <a href="#717-optimistic-concurrency-with-if-match" id="717-optimistic-concurrency-with-if-match"></a>

**[M+R]** `PUT` and `PATCH` endpoints **SHOULD** support optimistic concurrency: clients send `If-Match: <etag>` and the server returns `412 Precondition Failed` ([7.15](#715-412-for-failed-preconditions)) if the resource has changed since that ETag. A failed `If-Match` precondition is `412`, not `409`; `409` ([7.9](#79-409-for-state-conflicts)) is reserved for state or uniqueness conflicts that are not expressed as a conditional precondition.

## 7.18 405 with Allow header <a href="#718-405-with-allow-header" id="718-405-with-allow-header"></a>

**[M]** `405 Method Not Allowed`: the target resource does not support the request method. The response **MUST** include an `Allow` header listing the supported methods (RFC 9110).

## 7.19 415 for unsupported media types <a href="#719-415-for-unsupported-media-types" id="719-415-for-unsupported-media-types"></a>

**[M+R]** `415 Unsupported Media Type`: the request payload media type is not supported. PATCH endpoints ([§6.4](../part-b/6-http-methods.md#64-patch-uses-json-merge-patch)) **MUST** return `415` when the patch media type is neither `application/merge-patch+json` nor a documented `application/json-patch+json`. `406 Not Acceptable` **MAY** be returned when no representation matches the request `Accept` header.

## 7.20 No-store on error responses <a href="#720-no-store-on-error-responses" id="720-no-store-on-error-responses"></a>

**[M]** Error responses (`application/problem+json`) and Operation-status responses ([§15](../part-d/15-asynchronous-operations.md)) **SHOULD** declare `Cache-Control: no-store`, so a shared cache cannot replay a transient failure or stale operation state. Broader caching behaviour is operational and out of scope ([§1.2](../1-introduction.md#12-scope)).
