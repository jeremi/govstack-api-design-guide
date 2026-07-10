---
description: "Documentation requirements for schemas, examples, and operation descriptions across OpenAPI and AsyncAPI surfaces."
---

# 4. Documentation requirements

{% hint style="info" %}
**Intent.** The spec is read by implementers, not only by tools. Operations and schemas need human-readable prose.

**Applies to:** Universal (OpenAPI and AsyncAPI surfaces).
{% endhint %}

## 4.1 Every schema described <a href="#41-every-schema-described" id="41-every-schema-described"></a>

**[M]** Every schema **MUST** have a `description`.

## 4.2 Examples for bodies and enums <a href="#42-examples-for-bodies-and-enums" id="42-examples-for-bodies-and-enums"></a>

**[M+R]** Every request body and response body **MUST** have at least one `example`. Every `enum` **MUST** document what its values mean (an `example` alone is insufficient when the values are not self-explanatory).

## 4.3 No placeholder text <a href="#43-no-placeholder-text" id="43-no-placeholder-text"></a>

**[M+R]** The spec **MUST NOT** contain placeholder text: `TBD`, `Lorem ipsum`, `a, b, c`, content from other BBs with the original BB name still present, or test plans with literal placeholder steps.

## 4.4 Accurate operation descriptions <a href="#44-accurate-operation-descriptions" id="44-accurate-operation-descriptions"></a>

**[R]** Operation `description` **MUST** describe what the operation actually does. (The audit found at least 9 BBs with cross-endpoint description mismatches from copy-paste.)
