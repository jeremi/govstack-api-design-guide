---
description: "The local Operation resource shape and polling pattern BBs use for operations that cannot complete synchronously."
---

# 15. Asynchronous operations

{% hint style="info" %}
**Intent.** A single async pattern across BBs. Without one, every BB picks a different status code (200, 201, or 202) and a different polling shape, and integrators write per-BB glue. In this guide, *Operation resource* (capitalised) is the polling resource defined in this section; lowercase *operation* means an OpenAPI or AsyncAPI operation.

**Applies to:** OpenAPI surface (HTTP/REST). The Operation resource is defined locally by each BB; the `202` and polling mechanics are HTTP-specific.
{% endhint %}

## 15.1 202 with Operation Location <a href="#151-202-with-operation-location" id="151-202-with-operation-location"></a>

**[M+R]** Operations that cannot complete synchronously **MUST** return `202 Accepted` with a `Location` header pointing to an Operation resource and **MUST** return the current Operation representation in the response body.

## 15.2 Local Operation resource shape <a href="#152-local-operation-resource-shape" id="152-local-operation-resource-shape"></a>

**[M+R]** A BB that exposes long-running work **MUST** define its Operation schema locally. Its identifier **MUST** be an opaque string and clients **MUST NOT** infer a UUID or any other internal format. The local schema **MUST** document how the identifier, lifecycle state, result, error, and any progress metadata are represented, including when each state-dependent field is present. This guide does not fix those field names or shapes. A shared Operation schema is deferred until multiple BBs demonstrate a stable reusable contract.

## 15.3 Documented Operation lifecycle <a href="#153-documented-operation-lifecycle" id="153-documented-operation-lifecycle"></a>

**[M+R]** The local Operation contract **MUST** distinguish terminal from non-terminal states and **MUST** document the result, error, polling, and cancellation semantics for each applicable state. This guide does not prescribe a status enum or lifecycle model.

**Example (informative).** An in-progress Operation resource:

```json
{
  "id": "op_7JpQ9m2W4xK8fR3cT6vN1",
  "status": "RUNNING",
  "createdAt": "2026-07-10T08:30:00Z",
  "updatedAt": "2026-07-10T08:30:05Z",
  "progress": 40
}
```

## 15.4 Polling the Operation resource <a href="#154-polling-the-operation-resource" id="154-polling-the-operation-resource"></a>

**[M+R]** A BB exposing an Operation resource **MUST** make it pollable with `GET` at the URI returned in `Location`. The conventional path **SHOULD** be `/v{major}/operations/{operationId}`. A non-terminal polling response **SHOULD** include `Retry-After` when the server can advise a useful minimum polling interval.

## 15.5 Cancellation via cancel sub-resource <a href="#155-cancellation-via-cancel-sub-resource" id="155-cancellation-via-cancel-sub-resource"></a>

**[M+R]** Cancellation, when supported, **MUST** be documented and discoverable from the Operation contract. The conventional action **SHOULD** be `POST /v{major}/operations/{operationId}/cancel`.

## 15.6 Webhook completion notification <a href="#156-webhook-completion-notification" id="156-webhook-completion-notification"></a>

**[R]** Long-running operations **SHOULD** support completion notification via webhook ([§16](../part-d/16-cloudevents-and-webhooks.md)) rather than requiring clients to poll indefinitely. The threshold at which notification becomes expected is operational and per-BB.

## 15.7 Documented result retention <a href="#157-documented-result-retention" id="157-documented-result-retention"></a>

**[R]** Operation result availability **MUST** be documented as a consumer-visible contract. A reference specification **SHOULD** state the required minimum retention or the configuration parameter that controls it. Concrete retention values belong in implementation profiles.
