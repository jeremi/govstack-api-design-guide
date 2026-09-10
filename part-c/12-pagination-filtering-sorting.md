---
description: "Mandatory pagination for collections, cursor and offset envelopes, page-size bounds, and conventions for sorting and filtering."
---

# 12. Pagination, filtering, sorting

{% hint style="info" %}
**Intent.** Collection endpoints survive production data volumes.

**Applies to:** OpenAPI surface only (HTTP/REST). AsyncAPI streams use transport-specific backpressure and replay primitives; the declaration requirements for those contracts are in [§17](../part-d/17-asyncapi-channel-rules.md).
{% endhint %}

## 12.1 Collections must paginate <a href="#121-collections-must-paginate" id="121-collections-must-paginate"></a>

**[M+R]** Endpoints returning collections **MUST** paginate. Unbounded responses are forbidden. The standard unversioned endpoints of [§5.10](../part-b/5-url-structure-and-versioning.md#510-standard-unversioned-endpoints) are not collections and this section does not apply to them.

A collection whose size is fixed by the specification itself **MAY** be returned unpaginated, provided the bound is declared in the schema with `maxItems`; an undeclared expectation that a collection stays small does not qualify, because an integrator cannot see it and a linter cannot check it.

A single resource **MAY** contain schema-defined subobjects and bounded embedded arrays without a separate Page envelope around each one. The applicable representation schema or domain profile declares the bounds, using `maxItems` for an array where JSON Schema expresses the contract. This guide does not prescribe universal relationship cardinalities. A bounded complete embedded view **MAY** return a documented overflow failure when the complete permitted result exceeds its bound. Growth in the underlying relationships does not by itself require pagination inside that view. If traversal beyond the embedded-view bound is offered, it follows the collection-pagination contract through a documented paginated relationship, resource, or query. Separately exposed unbounded collection endpoints remain subject to the pagination requirement above.

The representation contract distinguishes an embedded array that is complete for the declared selection and the caller's permitted view from a partial or selected subset. It identifies the selection or continuation behavior without requiring disclosure of hidden relationships. Applying a size limit does not justify silently truncating an array represented as complete. Omitted or empty relationship data is interpreted under the documented selection and disclosure rules; it does not by itself establish that no underlying relationship exists.

**Example (informative).** A household representation can include all members visible to the caller without a separate Page envelope. This example's API declares a limit of 50 members and a documented overflow error when the complete permitted view exceeds that limit. The number is illustrative, not a GovStack household-size limit. The endpoint does not silently return the first 50 members.

```yaml
type: object
properties:
  members:
    type: array
    maxItems: 50
    items:
      type: object
      properties:
        id:
          type: string
```

## 12.2 Cursor pagination by default <a href="#122-cursor-pagination-by-default" id="122-cursor-pagination-by-default"></a>

**[M+R]** Default pagination **MUST** be cursor-based, modelled on Google AIP-158, with optional query parameters `pageSize` and `cursor`. The `cursor` name is used in place of AIP-158's `pageToken`. A cursor **MUST** be URL-safe, opaque, and integrity-protected; base64 encoding of a transparent internal value is not sufficient. It **MUST NOT** contain personal data, grant authority, or bypass authorization on a later request. Clients **MUST NOT** parse or construct cursor values, and servers **MUST** re-authorize every page request. Filter and sort arguments on a follow-up request **MUST** equal those that produced the cursor; a mismatch, malformed cursor, or expired cursor **MUST** return `400` with a stable Problem `type`. The specification **MUST** document cursor expiry and a deterministic default order with a unique tie-breaker so concurrent records do not create ambiguous page boundaries.

A specification **MAY** bind the effective `pageSize` to the traversal and document how omitted or changed values are handled; otherwise the client can change `pageSize` between requests.

Cursor pagination defines continuation, not an implementation technique or a snapshot guarantee. A cursor can wrap an upstream continuation token or refer to adapter-managed state. The operation description can state whether traversal observes a live collection or a snapshot and how concurrent changes affect results. Supporting a deterministic default order does not require caller-selectable sorting.

## 12.3 Cursor pagination envelope <a href="#123-cursor-pagination-envelope" id="123-cursor-pagination-envelope"></a>

**[M]** The cursor-pagination response envelope **MUST** be `{ items: [...], pageInfo: { nextCursor, total? } }`. `nextCursor` **MUST** be a non-empty string when traversal can continue and **MUST** be `null` on the final page; its schema therefore **MUST** declare explicit nullability. `total`, when present, **MUST** state whether it is exact or estimated and whether it reflects the first-page snapshot or the current collection. The `pageInfo` wrapper is inspired by GraphQL Relay Connections but deliberately uses flat `items` and one continuation field.

A page **MAY** contain fewer than `pageSize` items, including no items, while still carrying a continuation cursor. Clients determine completion from `nextCursor`, not the number of returned items, and no separate `hasMore` field is used. A continuation cursor does not guarantee that a later page contains matching items.

**Example (informative).** A cursor-paginated collection response (`total` omitted per [§12.5](#125-optional-total-count)):

```json
{
  "items": [
    { "id": "0d4b2a4e-3f5d-4a83-9b0e-6f2e8d1c7a90", "status": "ACTIVE" },
    { "id": "8a1f9c2b-7e64-4f0d-8a3b-2c5d9e0f1b47", "status": "PENDING_REVIEW" }
  ],
  "pageInfo": {
    "nextCursor": "pgn_7JpQ9m2W4xK8fR3cT6vN1"
  }
}
```

## 12.4 Documented pageSize bounds <a href="#124-documented-pagesize-bounds" id="124-documented-pagesize-bounds"></a>

**[M+R]** `pageSize` **MUST** have a documented default and maximum. Specific numeric values are per-BB.

## 12.5 Optional total count <a href="#125-optional-total-count" id="125-optional-total-count"></a>

**[R]** `total` **MAY** be omitted when computing it is expensive.

## 12.6 Offset pagination envelope <a href="#126-offset-pagination-envelope" id="126-offset-pagination-envelope"></a>

**[M+R]** Where offset pagination is used, the envelope **MUST** be the flat shape `{ items, offset, limit, total }`, distinct from the cursor `pageInfo` envelope in [§12.3](#123-cursor-pagination-envelope); `total` is required here (unlike [§12.3](#123-cursor-pagination-envelope), where it is optional).

Offset pagination **MAY** be used for admin or fixed-size lists.

**Example (informative).** An offset-paginated response for an admin list (`total` required here):

```json
{
  "items": [
    { "id": "b7f3d9e0-1a2b-4c5d-8e9f-0a1b2c3d4e5f", "name": "Civil registration office 12" }
  ],
  "offset": 0,
  "limit": 20,
  "total": 134
}
```

## 12.7 Sort parameter convention <a href="#127-sort-parameter-convention" id="127-sort-parameter-convention"></a>

**[M]** An API that supports sorting **MUST** document the parameter, allowed fields, direction syntax, default order, and a stable tie-breaker.

The GovStack default **SHOULD** be `sort`, with `field` for ascending, `-field` for descending, and commas between multiple criteria.

## 12.8 Simple equality filtering <a href="#128-simple-equality-filtering" id="128-simple-equality-filtering"></a>

**[M+R]** A filter containing personal data or another value prohibited from URLs by [§8.6](../part-b/8-headers.md#86-no-personal-data-in-addressable-locations) **MUST NOT** use a query parameter and **MUST** use a documented body-based search contract such as [§12.9](#129-complex-filtering-via-search).

Simple equality filtering on non-personal, non-secret fields **SHOULD** use one query parameter per field.

## 12.9 Complex filtering via search <a href="#129-complex-filtering-via-search" id="129-complex-filtering-via-search"></a>

**[M+R]** When a body-based search is used, pagination parameters (`pageSize`, `cursor`) **MUST** be carried in the request body, and the response **MUST** use the [§12.3](#123-cursor-pagination-envelope) envelope. A follow-up request **MUST** retain the same search criteria and sort values as the request that produced its cursor.

Complex filtering and any filtering that contains personal data **SHOULD** use a request body, for example at `POST /v1/policies:search` or `POST /v1/policies/search` per [§6.6](../part-b/6-http-methods.md#66-post-search-for-complex-queries).

## 12.10 Sparse fieldsets out of scope <a href="#1210-sparse-fieldsets-out-of-scope" id="1210-sparse-fieldsets-out-of-scope"></a>

Sparse fieldsets (response field selection) are out of scope for v1.0.
