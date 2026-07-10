---
description: "The shared Operation resource shape and polling pattern BBs use for operations that cannot complete synchronously."
---

# 15. Asynchronous operations

{% hint style="info" %}
**Intent.** A single async pattern across BBs. Without one, every BB picks a different status code (200, 201, or 202) and a different polling shape, and integrators write per-BB glue. In this guide, *Operation resource* (capitalised) is the polling resource defined in this section; lowercase *operation* means an OpenAPI or AsyncAPI operation.

**Applies to:** OpenAPI surface (HTTP/REST). The Operation resource shape is reusable across surfaces; the `202` and polling mechanics are HTTP-specific.
{% endhint %}

## 15.1 202 with Operation Location <a href="#151-202-with-operation-location" id="151-202-with-operation-location"></a>

**[M+R]** Operations that cannot complete synchronously **MUST** return `202 Accepted` with a `Location` header pointing to an Operation resource.

## 15.2 Shared Operation resource shape <a href="#152-shared-operation-resource-shape" id="152-shared-operation-resource-shape"></a>

**[M]** The Operation resource **MUST** be declared once in `govstack-openapi-common.yaml` and `$ref`'d by all BBs. The default shape is `{ id, status, result, error, createdAt, updatedAt, progress? }`, modelled on Google AIP-151 (Long-Running Operations). A stricter AIP-151 mirror (with `done` and `metadata`) is a defensible alternative. [`[OPEN-14-A]`](../appendix/b-open-questions.md)

## 15.3 Fixed Operation status enum <a href="#153-fixed-operation-status-enum" id="153-fixed-operation-status-enum"></a>

**[M]** Operation `status` **MUST** be drawn from a fixed enumeration declared in the common file. The default set is `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`. AIP-151's boolean `done` plus a result-or-error union is a defensible alternative. [`[OPEN-14-A]`](../appendix/b-open-questions.md)

**Example (informative).** An in-progress Operation resource:

```json
{
  "id": "9c3d2f6a-5b1e-4d7c-a8f0-1e2d3c4b5a69",
  "status": "RUNNING",
  "createdAt": "2026-07-10T08:30:00Z",
  "updatedAt": "2026-07-10T08:30:05Z",
  "progress": 40
}
```

## 15.4 Polling the Operation resource <a href="#154-polling-the-operation-resource" id="154-polling-the-operation-resource"></a>

**[M+R]** Clients poll via `GET /v1/operations/{operationId}`.

## 15.5 Cancellation via cancel sub-resource <a href="#155-cancellation-via-cancel-sub-resource" id="155-cancellation-via-cancel-sub-resource"></a>

**[M+R]** Cancellation, when supported, **MUST** be `POST /v1/operations/{operationId}/cancel`.

## 15.6 Webhook completion notification <a href="#156-webhook-completion-notification" id="156-webhook-completion-notification"></a>

**[R]** Long-running operations **SHOULD** support completion notification via webhook ([§16](../part-d/16-cloudevents-and-webhooks.md)) rather than requiring clients to poll indefinitely. The threshold at which notification becomes expected is operational and per-BB.

## 15.7 Documented result retention <a href="#157-documented-result-retention" id="157-documented-result-retention"></a>

**[R]** Operation result availability **MUST** be documented as a consumer-visible contract. A reference specification **SHOULD** state the required minimum retention or the configuration parameter that controls it. Concrete retention values belong in implementation profiles.
