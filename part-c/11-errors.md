---
description: "One RFC 9457 HTTP problem model with stable type URIs, trace correlation, field-level validation, and a separate transport-neutral asynchronous error model."
---

# 11. Errors

{% hint style="info" %}
**Intent.** One HTTP error format ecosystem-wide. The RFC 9457 `type` URI is the machine identifier, so clients never have to reconcile a second error-code field; the optional `code` of [§11.2](#112-stable-http-problem-type-uri) only mirrors a code that already exists elsewhere.

**Applies to:** Universal. RFC 9457 and its `status` member apply only to HTTP responses. AsyncAPI rejection and failure messages keep the separate transport-neutral shape in [§11.6](#116-transport-neutral-asynchronous-errors).
{% endhint %}

## 11.1 RFC 9457 problem details <a href="#111-rfc-9457-problem-details" id="111-rfc-9457-problem-details"></a>

<!-- rule-class: M -->

HTTP `4xx` and `5xx` responses, including fallback errors declared with `default` under [§7.14](../part-b/7-http-status-codes.md#714-all-status-codes-declared), **MUST** declare response content using media type `application/problem+json` and the RFC 9457 Problem Details model (RFC 9457 obsoletes RFC 7807 and retains this media type), except where HTTP prohibits response content. A `HEAD` response **MUST NOT** declare content; its applicable error statuses are still declared under [§7.13](../part-b/7-http-status-codes.md#713-server-errors-documented) and [§7.14](../part-b/7-http-status-codes.md#714-all-status-codes-declared). This rule **MUST NOT** be represented as an RFC 9457 requirement on a non-HTTP message; [§11.6](#116-transport-neutral-asynchronous-errors) defines the separate asynchronous model.

<!-- verification:start -->
**Verification:** Automated specification check.

The linter checks that every 4xx, 5xx and `default` response in an OpenAPI document declares `application/problem+json` content with a schema, and that `HEAD` responses declare no content. The problem schema itself is checked separately.
<!-- verification:end -->

## 11.2 Stable HTTP problem type URI <a href="#112-stable-http-problem-type-uri" id="112-stable-http-problem-type-uri"></a>

<!-- rule-class: M+R -->

Standard RFC 9457 fields `type`, `title`, and `status` **MUST** be present in every GovStack HTTP problem. `type` **MUST** be the identifier of the problem and **MUST** use `https://govstack.global/problems/{bb-code}/{problem-slug}`. `{bb-code}` is the registered code from [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code); `{problem-slug}` **MUST** be stable kebab-case, for example `bad-request`, `invalid-field`, or `internal-error`. A GovStack HTTP Problem **MUST NOT** add a machine identifier other than `type`, except an optional string member named exactly `code` that mirrors a machine code already defined by a documented BB domain model or an adopted external standard. `code` **MUST NOT** be the only way to distinguish two problems that share the same `type`, and a specification **MUST NOT** require clients to read `code` to interpret the problem. `status` **MUST** equal the actual HTTP response status. The spec **MUST** declare that these fields carry no personal data and no system-internal details such as stack traces, hostnames, or query fragments. HTTP problems **MUST NOT** add a `timestamp`; use response metadata and trace correlation for occurrence diagnostics.

The URI **SHOULD** dereference to human-readable documentation. `detail` and `instance` **SHOULD** be present when they add diagnostic value.

HTTP status describes the outcome of the current request; domain status describes the underlying business process. A successful status lookup can return `200` with a failed payment or job state, and a callback reporting that state can be acknowledged successfully. Domain codes in those representations remain business data. Failure of the current request uses an appropriate HTTP error status and the Problem Details contract in [§11.1](#111-rfc-9457-problem-details).

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that the problem schema requires `type`, `title` and `status`, declares no `timestamp`, and types any `code` as a string, and that literal `type` examples use the canonical problem URI form. A reviewer checks the remaining clauses.
<!-- verification:end -->

## 11.3 Trace identifier <a href="#113-trace-identifier" id="113-trace-identifier"></a>

<!-- rule-class: M -->

Every GovStack HTTP problem **MUST** include `traceId`, containing the W3C trace-id defined by [§8.4](../part-b/8-headers.md#84-w3c-trace-context-correlation).

A surface that already publishes a legacy `requestId` or `correlationId` member **MAY** keep it in addition to `traceId`. That member does not replace `traceId`, and a new surface does not introduce it.

<!-- verification:start -->
**Verification:** Automated specification check.

The linter checks that the `application/problem+json` response schema lists `traceId` as required. A test against a running implementation checks that its value equals the trace-id of the request's `traceparent`.
<!-- verification:end -->

## 11.4 Field-level errors array <a href="#114-field-level-errors-array" id="114-field-level-errors-array"></a>

<!-- rule-class: M+R -->

Where an HTTP failure is attributable to specific fields in a JSON request body, those field-level validation errors **MUST** appear in an `errors` array; each entry **MUST** contain `pointer` (JSON Pointer, relative to that body) and `message`. It **MUST NOT** add a field-level `code`; the enclosing Problem `type` identifies the problem class. The `errors` array is omitted for failures not attributable to a field (for example, an idempotency-key fingerprint mismatch, [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch)).

For query, path, or header parameters, a BB **MAY** use field errors when its contract defines the JSON document against which their pointers are evaluated. Otherwise it **MAY** describe the invalid parameter in the Problem `detail` without an `errors` array.

**Example (informative).** A `422` validation failure carrying the RFC 9457 fields, `traceId`, and the field-level `errors` array:

```json
{
  "type": "https://govstack.global/problems/registration/invalid-field",
  "title": "Request validation failed",
  "status": 422,
  "detail": "Two request fields failed validation.",
  "instance": "/v1/applications/3f6c0e63-9f7e-4d51-a3ce-58b2c7d0f3a1",
  "traceId": "6f1c3f0e2a9b4c8d7e6f5a4b3c2d1e0f",
  "errors": [
    {
      "pointer": "/applicant/phoneNumber",
      "message": "Phone number must be an E.164 string."
    },
    {
      "pointer": "/applicant/birthDate",
      "message": "Date must be an RFC 3339 calendar date."
    }
  ]
}
```

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

When a problem schema declares `errors`, the linter checks that it is required, is an array, requires `pointer` and `message` in each item, and declares no item `code`. A reviewer decides which failures are attributable to request fields.
<!-- verification:end -->

## 11.5 Stable HTTP problem fields across languages <a href="#115-stable-http-problem-fields-across-languages" id="115-stable-http-problem-fields-across-languages"></a>

<!-- rule-class: R -->

The `type` URI, `status`, `traceId`, `instance`, and field-error `pointer` **MUST NOT** be translated.

HTTP Problem `title`, `detail`, and field-error `message` **MAY** be localised.

<!-- verification:start -->
**Verification:** Runtime verification required; outside the specification linter.

A test against a running implementation checks that `type`, `status`, `traceId`, `instance` and field-error `pointer` stay identical across localised responses.
<!-- verification:end -->

## 11.6 Transport-neutral asynchronous errors <a href="#116-transport-neutral-asynchronous-errors" id="116-transport-neutral-asynchronous-errors"></a>

<!-- rule-class: M+R -->

An asynchronous command rejection or processing failure **MUST** use the shared `GovStackAsyncError` schema from `govstack-asyncapi-common.yaml`. When this object is the whole message payload, the message **MUST** use `contentType: application/json`. This transport-neutral schema remains separate from the HTTP Problem model and **MUST** contain `type` (a stable absolute problem-type URI), `title`, `code`, `traceId`, and `timestamp`. When carried as a structured CloudEvent, this object **MUST** be the event `data` and the message **MUST** use `contentType: application/cloudevents+json` under [§17.6](../part-d/17-asyncapi-channel-rules.md#176-structured-cloudevents-json-payloads). It **MUST NOT** contain RFC 9457 `status` merely to simulate an HTTP response; a protocol-specific rejection code **MUST** be declared in the applicable binding or as a separately named field whose semantics the BB defines.

For a wrapped error, `datacontenttype: application/json` describes the inner `data` object; message `contentType` describes the outer CloudEvent. The two describe different layers.

It **MAY** contain `detail` and `errors`. Each asynchronous field error contains `pointer`, `code`, and `message` as defined by the shared `AsyncFieldError` schema.

<!-- verification:start -->
**Verification:** Additional context required for verification. Semantic review is also required.

The linter does not check this rule. Resolving the shared `GovStackAsyncError` schema and the transport-specific rejection binding needs the common AsyncAPI artefact, so a reviewer checks them.
<!-- verification:end -->
