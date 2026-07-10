---
description: "Mandatory pagination for collections, cursor and offset envelopes, page-size bounds, and conventions for sorting and filtering."
---

# 12. Pagination, filtering, sorting

{% hint style="info" %}
**Intent.** Collection endpoints survive production data volumes.

**Applies to:** OpenAPI surface only (HTTP/REST). AsyncAPI streams use transport-specific backpressure and replay primitives; the declaration requirements for those contracts are in [§17](../part-d/17-asyncapi-channel-rules.md).
{% endhint %}

## 12.1 Collections must paginate <a href="#121-collections-must-paginate" id="121-collections-must-paginate"></a>

**[M+R]** Endpoints returning collections **MUST** paginate. Unbounded responses are forbidden.

## 12.2 Cursor pagination by default <a href="#122-cursor-pagination-by-default" id="122-cursor-pagination-by-default"></a>

**[M+R]** Default pagination **MUST** be cursor-based, modelled on Google AIP-158, with query parameters `pageSize` and `cursor`. The `cursor` name is used in place of AIP-158's `pageToken` to align with the wider non-Google ecosystem (GraphQL Relay Connections, GitHub, Twitter). The cursor **MUST** be opaque to clients (server-encoded, typically base64 of an internal representation); clients **MUST NOT** parse or construct cursor values.

## 12.3 Cursor pagination envelope <a href="#123-cursor-pagination-envelope" id="123-cursor-pagination-envelope"></a>

**[M]** Pagination response envelope **MUST** be `{ items: [...], pageInfo: { nextCursor, hasMore, total? } }`. The `pageInfo` wrapper is inspired by the GraphQL Relay Connections specification but deliberately simplified: it uses a flat `items` array rather than Relay's `edges`/`node`, and `nextCursor`/`hasMore` rather than Relay's `endCursor`/`hasNextPage`.

**Example (informative).** A cursor-paginated collection response (`total` omitted per [§12.5](#125-optional-total-count)):

```json
{
  "items": [
    { "id": "0d4b2a4e-3f5d-4a83-9b0e-6f2e8d1c7a90", "status": "ACTIVE" },
    { "id": "8a1f9c2b-7e64-4f0d-8a3b-2c5d9e0f1b47", "status": "PENDING_REVIEW" }
  ],
  "pageInfo": {
    "nextCursor": "eyJvZmZzZXQiOjQyfQ",
    "hasMore": true
  }
}
```

## 12.4 Documented pageSize bounds <a href="#124-documented-pagesize-bounds" id="124-documented-pagesize-bounds"></a>

**[M+R]** `pageSize` **MUST** have a documented default and maximum. Specific numeric values are per-BB.

## 12.5 Optional total count <a href="#125-optional-total-count" id="125-optional-total-count"></a>

**[R]** `total` **MAY** be omitted when computing it is expensive.

## 12.6 Offset pagination envelope <a href="#126-offset-pagination-envelope" id="126-offset-pagination-envelope"></a>

**[M+R]** Offset pagination **MAY** be used for admin or fixed-size lists. In that case the envelope **MUST** be the flat shape `{ items, offset, limit, total }`, distinct from the cursor `pageInfo` envelope in [§12.3](#123-cursor-pagination-envelope); `total` is required here (unlike [§12.3](#123-cursor-pagination-envelope), where it is optional).

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

**[M]** Sort parameter **MUST** be `sort`, values `field` (ascending) or `-field` (descending); multiple criteria separated by commas.

## 12.8 Simple equality filtering <a href="#128-simple-equality-filtering" id="128-simple-equality-filtering"></a>

**[M+R]** Simple filtering **MUST** use one query parameter per field, equality only.

## 12.9 Complex filtering via search <a href="#129-complex-filtering-via-search" id="129-complex-filtering-via-search"></a>

**[M+R]** Complex filtering **MUST** use `POST /v1/{collection}/search` per [§6.6](../part-b/6-http-methods.md#66-post-search-for-complex-queries). For this endpoint, pagination parameters (`pageSize`, `cursor`) **MUST** be carried in the request body, and the response **MUST** use the [§12.3](#123-cursor-pagination-envelope) envelope.

## 12.10 Sparse fieldsets out of scope <a href="#1210-sparse-fieldsets-out-of-scope" id="1210-sparse-fieldsets-out-of-scope"></a>

Sparse fieldsets (response field selection) are out of scope for v1.0.
