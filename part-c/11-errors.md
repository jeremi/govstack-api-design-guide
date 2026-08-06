---
description: "One RFC 9457 HTTP problem model with stable type URIs, trace correlation, field-level validation, and a separate transport-neutral asynchronous error model."
---

# 11. Errors

{% hint style="info" %}
**Intent.** One HTTP error format ecosystem-wide. The RFC 9457 `type` URI is the machine identifier, so clients do not have to reconcile a second error-code field.

**Applies to:** Universal. RFC 9457 and its `status` member apply only to HTTP responses. AsyncAPI rejection and failure messages keep the separate transport-neutral shape in [§11.6](#116-transport-neutral-asynchronous-errors).
{% endhint %}

## 11.1 RFC 9457 problem details <a href="#111-rfc-9457-problem-details" id="111-rfc-9457-problem-details"></a>

**[M]** HTTP `4xx` and `5xx` responses **MUST** use media type `application/problem+json` and the RFC 9457 Problem Details model (RFC 9457 obsoletes RFC 7807 and retains this media type). This rule **MUST NOT** be represented as an RFC 9457 requirement on a non-HTTP message; [§11.6](#116-transport-neutral-asynchronous-errors) defines the separate asynchronous model.

## 11.2 Stable HTTP problem type URI <a href="#112-stable-http-problem-type-uri" id="112-stable-http-problem-type-uri"></a>

**[M+R]** Standard RFC 9457 fields `type`, `title`, and `status` **MUST** be present in every GovStack HTTP problem. `type` **MUST** be the sole machine identifier for the problem and **MUST** use `https://govstack.global/problems/{bb-code}/{problem-slug}`. `{bb-code}` is the registered code from [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code); `{problem-slug}` **MUST** be stable kebab-case, for example `bad-request`, `invalid-field`, or `internal-error`. The URI **SHOULD** dereference to human-readable documentation. A GovStack HTTP Problem **MUST NOT** add a duplicate machine identifier such as `code`.

`status` **MUST** equal the actual HTTP response status. `detail` and `instance` **SHOULD** be present when they add diagnostic value. The spec **MUST** declare that these fields carry no personal data and no system-internal details such as stack traces, hostnames, or query fragments. HTTP problems **MUST NOT** add a `timestamp`; use response metadata and trace correlation for occurrence diagnostics.

## 11.3 Trace identifier <a href="#113-trace-identifier" id="113-trace-identifier"></a>

**[M]** Every GovStack HTTP problem **MUST** include `traceId`, containing the W3C trace-id defined by [§8.4](../part-b/8-headers.md#84-w3c-trace-context-correlation).

## 11.4 Field-level errors array <a href="#114-field-level-errors-array" id="114-field-level-errors-array"></a>

**[M+R]** Where an HTTP failure is attributable to specific request fields, those field-level validation errors **MUST** appear in an `errors` array; each entry **MUST** contain `pointer` (JSON Pointer) and `message`. It **MUST NOT** add a field-level `code`; the enclosing Problem `type` identifies the problem class. The `errors` array is omitted for failures not attributable to a field (for example, an idempotency-key fingerprint mismatch, [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch)).

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

## 11.5 Stable HTTP problem fields across languages <a href="#115-stable-http-problem-fields-across-languages" id="115-stable-http-problem-fields-across-languages"></a>

**[R]** HTTP Problem `title`, `detail`, and field-error `message` **MAY** be localised. The `type` URI, `status`, `traceId`, `instance`, and field-error `pointer` **MUST NOT** be translated.

## 11.6 Transport-neutral asynchronous errors <a href="#116-transport-neutral-asynchronous-errors" id="116-transport-neutral-asynchronous-errors"></a>

**[M+R]** An asynchronous command rejection or processing failure **MUST** use the shared `GovStackAsyncError` schema from `govstack-asyncapi-common.yaml`, with message `contentType: application/json`. This transport-neutral schema remains separate from the HTTP Problem model and **MUST** contain `type` (a stable absolute problem-type URI), `title`, `code`, `traceId`, and `timestamp`; it **MAY** contain `detail` and `errors`. Each asynchronous field error contains `pointer`, `code`, and `message` as defined by the shared `AsyncFieldError` schema. When carried as a structured CloudEvent, this object **MUST** be the event `data`. It **MUST NOT** contain RFC 9457 `status` merely to simulate an HTTP response; a protocol-specific rejection code **MUST** be declared in the applicable binding or as a separately named field whose semantics the BB defines.
