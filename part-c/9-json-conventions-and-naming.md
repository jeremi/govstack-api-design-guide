---
description: "Field naming, JSON representation, forward-compatibility, and specification-extension conventions applied across every building block."
---

# 9. JSON conventions and naming

{% hint style="info" %}
**Intent.** One naming style ecosystem-wide. Existing BB specifications mix camelCase, PascalCase, snake_case, and fields with literal spaces, sometimes within a single BB.

**Applies to:** Universal.
{% endhint %}

## 9.1 JSON as default media type <a href="#91-json-as-default-media-type" id="91-json-as-default-media-type"></a>

**[M+R]** Default response media type **MUST** be `application/json` unless the resource is binary or a document export.

## 9.2 camelCase field names <a href="#92-camelcase-field-names" id="92-camelcase-field-names"></a>

**[M]** GovStack-owned JSON field names **SHOULD** use `camelCase` consistently within a surface. Fields adopted from an external standard retain that standard's spelling. (See [note below](#note-on-92) on the choice of casing.)

## 9.3 Real JSON booleans <a href="#93-real-json-booleans" id="93-real-json-booleans"></a>

**[M]** Boolean fields **MUST** be JSON booleans (`true`/`false`), not strings.

## 9.4 Explicit nullability <a href="#94-explicit-nullability" id="94-explicit-nullability"></a>

**[M]** Nullability **MUST** be explicit (`type: [..., "null"]` per OpenAPI 3.1).

## 9.5 No spaces or non-ASCII names <a href="#95-no-spaces-or-non-ascii-names" id="95-no-spaces-or-non-ascii-names"></a>

**[M]** GovStack-owned field names **SHOULD** use ASCII identifiers without spaces. Fields adopted from an external standard retain that standard's spelling.

## 9.6 Avoid abbreviations <a href="#96-avoid-abbreviations" id="96-avoid-abbreviations"></a>

**[R]** Abbreviations **SHOULD NOT** be used (prefer `quantity` over `qty`).

## 9.7 Screaming snake case enum values <a href="#97-screaming-snake-case-enum-values" id="97-screaming-snake-case-enum-values"></a>

**[M]** Enum values that name a BB-defined state or category **SHOULD** use SCREAMING_SNAKE_CASE (`ACTIVE`, `PENDING_REVIEW`). Values whose form is fixed elsewhere keep the casing their own definition gives them and **MUST NOT** be re-cased to satisfy this rule: identifiers built to a shape this guide defines (event types per [§16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types), sort keys per [§12.7](../part-c/12-pagination-filtering-sorting.md#127-sort-parameter-convention)), codes drawn from an external standard (BCP 47 language tags per [§10.9](../part-c/10-data-types-and-formats.md#109-bcp-47-language-codes), ISO 4217 currency codes per [§10.10](../part-c/10-data-types-and-formats.md#1010-iso-4217-currency-codes)), and values registered in an IANA registry, including JOSE and COSE algorithm and curve names such as `ES256`, `EdDSA`, and `Ed25519`, and media types.

## 9.8 Forward-compatible schemas <a href="#98-forward-compatible-schemas" id="98-forward-compatible-schemas"></a>

**[M]** Schemas **MUST** be designed for forward-compatibility: unknown fields and unknown enum values **MUST** be safely ignorable by conforming clients. Schemas **MUST NOT** rely on `additionalProperties: false` at the top level of resource bodies, since that prevents adding fields without a breaking change. Conforming client behaviour (ignoring unknowns) is documented in [§18.6](../part-d/18-compatibility-and-lifecycle.md#186-clients-ignore-unknown-fields) as a non-normative reader expectation.

## 9.9 No closed enums for growing sets <a href="#99-no-closed-enums-for-growing-sets" id="99-no-closed-enums-for-growing-sets"></a>

**[R]** Fields whose value set is expected to grow **MUST NOT** be declared as a closed OpenAPI `enum`, because client code generated from a closed enum typically rejects values added later, which would make the "adding enum values is non-breaking" guarantee of [§18.3](../part-d/18-compatibility-and-lifecycle.md#183-backward-compatible-minor-changes) false in practice. Such fields **MUST** either be declared as an open `type: string` annotated with `x-extensible-enum` (carrying the known values), or define an explicit fallback member (e.g., `UNKNOWN`) that conforming clients map unrecognised values to. Truly fixed value sets (e.g., ISO-defined codes) **MAY** remain closed enums.

## 9.10 GovStack extension prefix <a href="#910-govstack-extension-prefix" id="910-govstack-extension-prefix"></a>

**[M+R]** GovStack-defined specification extensions on OpenAPI or AsyncAPI documents **MUST** be prefixed `x-govstack-` (for example, `x-govstack-deprecated` in [§18.7](../part-d/18-compatibility-and-lifecycle.md#187-asyncapi-deprecation-metadata), and `x-govstack-api-guide` in [§20.3](../part-e/20-conformance-and-validation.md#203-declared-guide-conformance-version)). A prefix rule does not create or standardise an extension; each GovStack extension still requires an explicit schema and governing rule.

## 9.11 Single registered BB code <a href="#911-single-registered-bb-code" id="911-single-registered-bb-code"></a>

**[M+R]** Every namespace that embeds a BB code (HTTP problem-type URLs [§11.2](../part-c/11-errors.md#112-stable-http-problem-type-uri), OAuth scopes [§13.4](../part-d/13-authentication-and-authorisation.md#134-namespaced-oauth-scopes), event types [§16.3](../part-d/16-cloudevents-and-webhooks.md#163-reverse-dns-event-types), logical channel IDs [§17.2](../part-d/17-asyncapi-channel-rules.md#172-stable-logical-channel-ids-and-native-addresses), and any transport-neutral asynchronous error code that embeds one [§11.6](../part-c/11-errors.md#116-transport-neutral-asynchronous-errors)) **MUST** use the BB's single registered code, identically in all of them. BB codes **MUST** match `^[a-z][a-z0-9-]{1,30}$` and **MUST** be unique across the ecosystem. Until GovStack publishes a canonical register, codes **SHOULD** be agreed through the API Working Group.

## Note on 9.2 <a href="#note-on-92" id="note-on-92"></a>

`camelCase` aligns with OAuth/OIDC, OpenID Federation, JSON:API, and the majority of public REST APIs. `snake_case` would align with the Python ecosystem. Either is defensible; consistency across BBs is what matters most. Existing published surfaces follow the compatibility rules in [§18](../part-d/18-compatibility-and-lifecycle.md) rather than renaming fields in place.

## Carve-out from 9.2 <a href="#carve-out-from-92" id="carve-out-from-92"></a>

(Per [§1.7](../1-introduction.md#17-precedence-of-external-standards).)

Fields imported wholesale from an external standard retain that standard's naming. The known cases are RFC 9457 error fields (`type`, `title`, `status`, `detail`, `instance`; see [§11.1](../part-c/11-errors.md#111-rfc-9457-problem-details)) and CloudEvents fields (`specversion`, `id`, `source`, `type`, `time`, `datacontenttype`, `data`; see [§16.2](../part-d/16-cloudevents-and-webhooks.md#162-cloudevents-envelope-required)). CloudEvents extension attributes also follow CloudEvents naming rules, not [§9.2](#92-camelcase-field-names), because CloudEvents requires lowercase ASCII attribute names. The carve-out applies only to fields defined by the imported standard or by a CloudEvents extension. The HTTP `traceId` extension in [§11.3](../part-c/11-errors.md#113-trace-identifier), transport-neutral asynchronous error fields in [§11.6](../part-c/11-errors.md#116-transport-neutral-asynchronous-errors), GovStack-owned transport/application headers, and the contents of event `data` follow [§9.2](#92-camelcase-field-names).

## Carve-out from 9.7 <a href="#carve-out-from-97" id="carve-out-from-97"></a>

(Per [§1.7](../1-introduction.md#17-precedence-of-external-standards).)

Enum values defined by an external standard retain that standard's casing. The known cases are values drawn from an IANA registry: JOSE and COSE algorithm and curve names (`ES256`, `EdDSA`, `Ed25519`, `P-256`) where a BB declares the algorithms it accepts, and media types.
