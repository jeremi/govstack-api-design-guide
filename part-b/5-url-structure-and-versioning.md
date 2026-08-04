---
description: "Rules governing URL path structure, resource naming, and version placement in the API surface."
---

# 5. URL structure and versioning

{% hint style="info" %}
**Intent.** Paths describe resources, not actions. Versions are visible. The same resource lives at the same path across BBs.

**Applies to:** OpenAPI surface only (HTTP/REST).
{% endhint %}

## 5.1 Major version in the path <a href="#51-major-version-in-the-path" id="51-major-version-in-the-path"></a>

**[M]** Major version **MUST** appear in the URL path as `/v{N}/...` (e.g., `/v1/policies`). The unversioned operational endpoints of [§5.9](#59-unversioned-health-endpoint) (`/health`, and `/ready` where exposed) are the only exception. [`[OPEN-4-A]`](../appendix/b-open-questions.md)

## 5.2 Plural noun resources <a href="#52-plural-noun-resources" id="52-plural-noun-resources"></a>

**[M+R]** Resource paths **MUST** use plural nouns (`/policies`, not `/policy`).

## 5.3 Kebab-case path segments <a href="#53-kebab-case-path-segments" id="53-kebab-case-path-segments"></a>

**[M]** Multi-word path segments **MUST** use kebab-case (`/event-subscriptions`).

## 5.4 Shallow path nesting <a href="#54-shallow-path-nesting" id="54-shallow-path-nesting"></a>

**[M]** Path hierarchy **SHOULD** be shallow, with at most two levels of nesting after `/v{N}/`. Deep nesting makes paths hard to read and discourages addressable sub-resources. [`[OPEN-4-C]`](../appendix/b-open-questions.md)

## 5.5 Identifiers as path parameters <a href="#55-identifiers-as-path-parameters" id="55-identifiers-as-path-parameters"></a>

**[M+R]** Resource identifiers **MUST** be path parameters, not query parameters. (`DELETE /v1/events/{eventId}`, not `DELETE /v1/event?event_id=...`.)

## 5.6 Query parameter naming <a href="#56-query-parameter-naming" id="56-query-parameter-naming"></a>

**[M]** Query parameter names **MUST** follow the JSON naming convention defined in [§9](../part-c/9-json-conventions-and-naming.md).

## 5.7 No verbs in CRUD paths <a href="#57-no-verbs-in-crud-paths" id="57-no-verbs-in-crud-paths"></a>

**[M+R]** Verbs **MUST NOT** appear in paths for CRUD operations. (`POST /v1/events`, not `POST /v1/event/new`.)

## 5.8 Actions as sub-resources <a href="#58-actions-as-sub-resources" id="58-actions-as-sub-resources"></a>

**[R]** Non-CRUD actions **MUST** be expressed as sub-resources: `POST /v1/events/{eventId}/cancel`, `POST /v1/operations/{operationId}/cancel`.

## 5.9 Unversioned health endpoint <a href="#59-unversioned-health-endpoint" id="59-unversioned-health-endpoint"></a>

**[M+R]** Each BB **MUST** expose an unversioned operational liveness endpoint at `/health` using media type `application/health+json` with `status` values `"pass" | "fail" | "warn"`. This shape is modelled on `draft-inadarei-api-health-check`, an expired individual Internet-Draft (never adopted as an RFC); GovStack adopts it as a local convention, not as a live IETF standard. A separate `/ready` endpoint **MAY** be exposed for readiness probes. These endpoints **MUST NOT** carry citizen authentication and **MUST NOT** expose system-internal detail. [`[OPEN-4-B]`](../appendix/b-open-questions.md)

**Example (informative).** A `/health` response (media type `application/health+json`), aligned with `draft-inadarei-api-health-check`:

```json
{
  "status": "pass",
  "description": "health of the registration BB"
}
```
