---
description: "The local Operation resource shape and polling pattern BBs use for operations that cannot complete synchronously."
---

# 15. Asynchronous operations

{% hint style="info" %}
**Intent.** A common way to discover and poll accepted work across BBs. The `202` response and `Location` let a client find its status; the BB's local schema explains how to read that status and its result. *Operation resource* (capitalised) is that polling resource; lowercase *operation* means an OpenAPI or AsyncAPI operation.

**Applies to:** OpenAPI surface (HTTP/REST). The Operation resource is defined locally by each BB; the `202` and polling mechanics are HTTP-specific.
{% endhint %}

## 15.1 202 with Operation Location <a href="#151-202-with-operation-location" id="151-202-with-operation-location"></a>

<!-- rule-class: M+R -->

Operations that cannot complete synchronously **MUST** return `202 Accepted` with a `Location` header pointing to an Operation resource and, where HTTP permits response content, **MUST** return the current Operation representation in the response body. Such a response **MUST** declare content and a concrete, non-empty schema. A `HEAD` response **MUST NOT** declare content.

Creating a job or Operation resource that is itself addressable when the response returns is a completed creation, and it uses `201` under [§7.2](../part-b/7-http-status-codes.md#72-201-created-with-location). `202` applies when nothing addressable exists yet beyond the Operation resource that [§15.2](#152-local-operation-resource-shape) describes.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags a non-`HEAD` `202` response that declares no content or a media type with an empty schema, and a `HEAD` `202` that declares content. A separate check covers `Location`; a reviewer checks that the work is asynchronous and the body is an Operation.
<!-- verification:end -->

## 15.2 Local Operation resource shape <a href="#152-local-operation-resource-shape" id="152-local-operation-resource-shape"></a>

<!-- rule-class: M+R -->

The local Operation schema **SHOULD** document how the identifier, lifecycle state, result, error, and any progress metadata are represented, including when each state-dependent field is present. Its identifier **SHOULD** be an opaque string and clients **SHOULD NOT** infer a UUID or any other internal format. The guide does not fix those field names or shapes. A shared Operation schema is deferred until multiple BBs demonstrate a stable reusable contract.

The response schema is required by [§7.21](../part-b/7-http-status-codes.md#721-schemas-for-successful-response-bodies) and defined locally under [§2.8](../part-a/2-openapi-document-standards.md#28-conditional-vendored-openapi-schemas).

<!-- verification:start -->
**Verification:** Review or evidence assessment required. Semantic review is also required.

The linter does not check this rule. A reviewer checks that the local Operation schema documents its identifier, state, result, error and progress fields, and when each is present.
<!-- verification:end -->

## 15.3 Documented Operation lifecycle <a href="#153-documented-operation-lifecycle" id="153-documented-operation-lifecycle"></a>

<!-- rule-class: M+R -->

The local Operation contract **SHOULD** distinguish terminal from non-terminal states and **SHOULD** document the result, error, polling, and cancellation semantics for each applicable state. The guide does not prescribe a status enum or lifecycle model.

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

<!-- verification:start -->
**Verification:** Review or evidence assessment required. Semantic review is also required.

The linter does not check this rule. A reviewer checks that terminal and non-terminal states are distinguished and that result, error, polling and cancellation behaviour is documented per state.
<!-- verification:end -->

## 15.4 Polling the Operation resource <a href="#154-polling-the-operation-resource" id="154-polling-the-operation-resource"></a>

<!-- rule-class: M+R -->

A BB exposing an Operation resource **MUST** make it pollable with `GET` at the URI returned in `Location`.

The conventional path **SHOULD** be `/v{major}/operations/{operationId}`. A non-terminal polling response **SHOULD** include `Retry-After` when the server can advise a useful minimum polling interval.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when an OpenAPI document has an `Operation` schema or an `/operations/` path but no `GET /v{N}/operations/{id}` path (any parameter name). A reviewer checks the polling response shape, the `Location` target and `Retry-After`.
<!-- verification:end -->

## 15.5 Cancellation via cancel sub-resource <a href="#155-cancellation-via-cancel-sub-resource" id="155-cancellation-via-cancel-sub-resource"></a>

<!-- rule-class: M+R -->

Cancellation, when supported, **MUST** be documented and discoverable from the Operation contract.

The conventional action **SHOULD** be `POST /v{major}/operations/{operationId}/cancel`.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns about an `/operations/.../cancel` path that is not `/v{N}/operations/{id}/cancel` (any parameter name), or that has no `POST`. A reviewer checks that cancellation, or its absence, is documented and discoverable.
<!-- verification:end -->

## 15.6 Webhook completion notification <a href="#156-webhook-completion-notification" id="156-webhook-completion-notification"></a>

<!-- rule-class: R -->

Long-running operations **SHOULD** support completion notification via webhook ([§16](../part-d/16-cloudevents-and-webhooks.md)) rather than requiring clients to poll indefinitely. The threshold at which notification becomes expected is operational and per-BB.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks whether long-running operations offer completion notification through a webhook.
<!-- verification:end -->

## 15.7 Documented result retention <a href="#157-documented-result-retention" id="157-documented-result-retention"></a>

<!-- rule-class: R -->

Operation result availability **SHOULD** be documented as a consumer-visible contract. A reference specification **SHOULD** state the required minimum retention or the configuration parameter that controls it. Concrete retention values belong in implementation profiles.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that Operation result retention, or the parameter that controls it, is documented.
<!-- verification:end -->

## 15.8 Per-request callback URL <a href="#158-per-request-callback-url" id="158-per-request-callback-url"></a>

<!-- rule-class: M+R -->

When an operation accepts a per-request callback URL (a URL the server calls when the work completes, as opposed to the subscription-managed webhooks of [§16](../part-d/16-cloudevents-and-webhooks.md)), the URL **MUST** be carried in the request body in a property named `callbackUrl`, **MUST** use `https` ([§13.7](../part-d/13-authentication-and-authorisation.md#137-protected-transport)), and **MUST NOT** be carried in a header or query parameter. The OpenAPI operation **MUST** describe the callback request with an OpenAPI `callbacks` object whose runtime expression references that property (`{$request.body#/callbackUrl}`). The callback request body **MUST** be the Operation representation of [§15.2](#152-local-operation-resource-shape) or a CloudEvent ([§16](../part-d/16-cloudevents-and-webhooks.md)) carrying it, and the callback request **MUST** be authenticated under [§13](../part-d/13-authentication-and-authorisation.md), with the mechanism documented in the specification.

An operation **MAY** offer a per-request callback as an alternative to polling ([§15.4](#154-polling-the-operation-resource)) or to the subscription webhooks of [§15.6](#156-webhook-completion-notification). Retries and the delivery-failure contract follow [§16.10](../part-d/16-cloudevents-and-webhooks.md#1610-documented-delivery-failure-contract).

**Example (informative).**

```yaml
paths:
  /v1/exports:
    post:
      operationId: createExport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [format]
              properties:
                format:
                  type: string
                callbackUrl:
                  type: string
                  format: uri
                  pattern: "^https://"
      callbacks:
        exportCompleted:
          "{$request.body#/callbackUrl}":
            post:
              security:
                - mutualTLS: []
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      $ref: "#/components/schemas/Operation"
              responses:
                "204":
                  description: Callback received.
```

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags a header or query parameter named like "callback", flags a request body `callbackUrl` with no `callbacks` object, and warns when it lacks `format: uri`. A reviewer checks `https`, the runtime expression, the callback body and its authentication.
<!-- verification:end -->
