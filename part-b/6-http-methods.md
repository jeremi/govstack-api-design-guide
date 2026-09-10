---
description: "Rules defining the meaning, safety, and idempotency guarantees of each HTTP method."
---

# 6. HTTP methods

{% hint style="info" %}
**Intent.** Each verb has one meaning. Specs MUST NOT redefine them.

**Applies to:** OpenAPI surface only (HTTP/REST).
{% endhint %}

## 6.1 GET is safe and idempotent <a href="#61-get-is-safe-and-idempotent" id="61-get-is-safe-and-idempotent"></a>

**[M+R]** `GET` **MUST** be safe and idempotent. Requests **MUST NOT** carry a body.

## 6.2 POST creates or performs actions <a href="#62-post-creates-or-performs-actions" id="62-post-creates-or-performs-actions"></a>

**[R]** `POST` **SHOULD** be used to create a server-assigned resource or to perform an action that is not expressed by another HTTP method. A creation completed during the request **SHOULD** return `201 Created`; work accepted but not completed **SHOULD** return `202 Accepted` with an Operation resource; a completed non-creation action **SHOULD** return `200 OK` with a result or `204 No Content` without one.

A POST action **MAY** be naturally idempotent or made retry-safe under [§14](../part-d/14-idempotency.md).

## 6.3 PUT replaces the entire resource <a href="#63-put-replaces-the-entire-resource" id="63-put-replaces-the-entire-resource"></a>

**[R]** `PUT` **MUST** replace the entire resource and **MUST** be idempotent.

## 6.4 PATCH uses a registered patch format <a href="#64-patch-uses-a-registered-patch-format" id="64-patch-uses-a-registered-patch-format"></a>

**[M+R]** `PATCH` partially updates a resource. Its request body **MUST** use a registered patch media type and the operation **MUST** document the selected patch semantics.

JSON Merge Patch (RFC 7396) with `application/merge-patch+json` **SHOULD** be the default for simple object updates. Under RFC 7396 a member set to `null` means "remove this member", so Merge Patch cannot set a nullable field ([§9.4](../part-c/9-json-conventions-and-naming.md#94-explicit-nullability)) *to* JSON `null`; it can only remove it.

Endpoints where setting a field to `null` must be distinguishable from removing it, or which need element-wise array mutation, **MAY** use RFC 6902 JSON Patch via `application/json-patch+json` or another registered format suited to the contract.

## 6.5 DELETE response semantics <a href="#65-delete-response-semantics" id="65-delete-response-semantics"></a>

**[M+R]** `DELETE` removes a resource. Synchronous hard delete **MUST** return `204 No Content` with no body.

Soft delete or async delete (audit retention, undo window) **MAY** return `200` with a body describing the resulting state, or `202` with an Operation per [§15](../part-d/15-asynchronous-operations.md).

## 6.6 POST search for complex queries <a href="#66-post-search-for-complex-queries" id="66-post-search-for-complex-queries"></a>

**[M+R]** A successful read returning a representation **MUST** return `200`, not `201`, consistently with [§7.1](7-http-status-codes.md#71-200-for-successful-reads).

A read operation **MAY** use `POST` with a request body when inputs are sensitive, structured, too large for a URL, or governed by a documented body-based contract. This includes exact lookup or resolution returning a single resource, as well as collection search. The path follows the convention chosen under [§5.8](5-url-structure-and-versioning.md#58-actions-as-sub-resources), for example `POST /v1/policies:lookup`, `POST /v1/policies:search`, or `POST /v1/policies/search`.

Exact lookup is a single-resource operation: it does not acquire pagination merely because it uses POST. Collection search follows [§12.9](../part-c/12-pagination-filtering-sorting.md#129-complex-filtering-via-search). The operation description states its selection and result semantics; its request schema can define named selectors without requiring a generic query language. Read-only POSTs do not require an `Idempotency-Key` under [§14.1](../part-d/14-idempotency.md#141-idempotency-key-on-non-idempotent-posts). Read-only describes the operation's effects; it does not change the HTTP method semantics or make POST automatically cacheable.

## 6.7 Bulk mutation needs explicit selection <a href="#67-bulk-mutation-needs-explicit-selection" id="67-bulk-mutation-needs-explicit-selection"></a>

**[M+R]** A bulk-mutating or bulk-deleting operation (a `PUT`, `PATCH`, or `DELETE` whose target is a collection rather than a single identified resource) **MUST** require at least one explicit selection parameter. An operation that mutates or deletes every record when invoked with no criteria is forbidden. Resources designated append-only (audit logs, event logs, ledgers) **MUST NOT** expose `PUT`, `PATCH`, or `DELETE`. (Mutable audit logs and filter-less bulk update or delete operations that could rewrite or destroy an entire registry have both been observed in existing BB specifications.)
