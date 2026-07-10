---
description: "One RFC 9457 problem-details error envelope, GovStack extension fields, namespaced stable error codes, and a shared common-error catalogue."
---

# 11. Errors

{% hint style="info" %}
**Intent.** One error format ecosystem-wide. A shared error schema lets integrators handle failures uniformly across BBs.

**Applies to:** Universal at the envelope and code-catalogue level. HTTP status mapping ([§7](../part-b/7-http-status-codes.md)) is OpenAPI-specific; the AsyncAPI surface signals errors via transport-appropriate mechanisms using the same envelope.
{% endhint %}

## 11.1 RFC 9457 problem details <a href="#111-rfc-9457-problem-details" id="111-rfc-9457-problem-details"></a>

**[M]** Error responses **MUST** use media type `application/problem+json` per RFC 9457 (which obsoletes RFC 7807 and retains the `application/problem+json` media type). The standard provides broad client and tooling support and removes the burden of maintaining a custom envelope.

## 11.2 Standard problem fields present <a href="#112-standard-problem-fields-present" id="112-standard-problem-fields-present"></a>

**[M+R]** Standard RFC 9457 fields `type`, `title`, `status` **MUST** be present. `type` **SHOULD** be a stable URI for the problem type and **MAY** be a dereferenceable documentation URL, for example `https://docs.govstack.org/errors/{bb-code}/{error-name}`. `detail` and `instance` **SHOULD** be present when they add diagnostic value. The spec **MUST** declare that these fields carry no personal data and no system-internal details (stack traces, hostnames, query fragments).

## 11.3 GovStack error extension fields <a href="#113-govstack-error-extension-fields" id="113-govstack-error-extension-fields"></a>

**[M]** GovStack extensions **MUST** include `code` (machine-stable error code), `traceId` (correlation), and `timestamp`.

## 11.4 Field-level errors array <a href="#114-field-level-errors-array" id="114-field-level-errors-array"></a>

**[M+R]** Where a failure is attributable to specific request fields, those field-level validation errors **MUST** appear in an `errors` array; each entry contains `pointer` (JSON Pointer), `code`, and `message`. The `errors` array is omitted for failures not attributable to a field (for example, an idempotency-key fingerprint mismatch, [§14.5](../part-d/14-idempotency.md#145-key-reuse-and-fingerprint-mismatch)).

**Example (informative).** A `422` validation failure carrying the RFC 9457 fields, the GovStack extensions, and the field-level `errors` array:

```json
{
  "type": "https://docs.govstack.org/errors/registration/validationFailed",
  "title": "Request validation failed",
  "status": 422,
  "detail": "Two request fields failed validation.",
  "instance": "/v1/applications/3f6c0e63-9f7e-4d51-a3ce-58b2c7d0f3a1",
  "code": "org.govstack.registration.validationFailed",
  "traceId": "6f1c3f0e2a9b4c8d",
  "timestamp": "2026-07-10T08:30:00Z",
  "errors": [
    {
      "pointer": "/applicant/phoneNumber",
      "code": "org.govstack.registration.invalidPhoneNumber",
      "message": "Phone number must be an E.164 string."
    },
    {
      "pointer": "/applicant/birthDate",
      "code": "org.govstack.registration.invalidDate",
      "message": "Date must be an RFC 3339 calendar date."
    }
  ]
}
```

## 11.5 Namespaced stable error codes <a href="#115-namespaced-stable-error-codes" id="115-namespaced-stable-error-codes"></a>

**[M+R]** Error codes **MUST** be stable, machine-readable identifiers, namespaced by BB so that integrators can disambiguate identical codes from different BBs. The `code` field is an identifier, not a URL; the problem-type URI belongs in `type` ([§11.2](#112-standard-problem-fields-present)). The default shape is reverse-DNS: `org.govstack.{bb-code}.{error-name}`. The `{bb-code}` segment is the BB's single registered code per [§9.11](../part-c/9-json-conventions-and-naming.md#911-single-registered-bb-code). The `{error-name}` segment **MUST** use lowerCamelCase, for example `org.govstack.identity.personNotFound`. Numeric suffixes **MAY** be used where a BB already maintains a numbered error catalogue, for example `org.govstack.{bb-code}.{number}`. [`[OPEN-10-A]`](../appendix/b-open-questions.md)

## 11.6 Stable codes across languages <a href="#116-stable-codes-across-languages" id="116-stable-codes-across-languages"></a>

**[R]** `title` and `detail` **MAY** be localised; `code` and `type` **MUST** remain stable across languages.

## 11.7 Common error catalogue <a href="#117-common-error-catalogue" id="117-common-error-catalogue"></a>

**[M+R]** A small set of cross-BB common errors **MUST** be defined in `govstack-openapi-common.yaml` and reused. The starting set is modelled on `google.rpc.Code` (gRPC canonical error codes) but uses the GovStack reverse-DNS error-code convention: `org.govstack.common.unauthenticated`, `org.govstack.common.permissionDenied`, `org.govstack.common.notFound`, `org.govstack.common.invalidArgument`, `org.govstack.common.alreadyExists`, `org.govstack.common.aborted`, `org.govstack.common.resourceExhausted`, `org.govstack.common.internal`, `org.govstack.common.unimplemented`. The final list is [`[OPEN-10-B]`](../appendix/b-open-questions.md).
