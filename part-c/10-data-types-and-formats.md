---
description: "Canonical representations for identifiers, dates, money, phone numbers, emails, binaries, and standardised code fields shared across building blocks."
---

# 10. Data types and formats

{% hint style="info" %}
**Intent.** A given concept has the same representation across BBs.

**Applies to:** Universal.
{% endhint %}

The BB specification owns the representations of its common resource fields and operation inputs. It can also adopt a published domain schema for a separately governed payload. The adopted schema identifies the field meanings and validation rules; it need not be replaced by a generic GovStack domain model. Adoption follows the standard-precedence rules in [§1.7](../1-introduction.md#17-precedence-of-external-standards). Merely placing data in a nested object or declaring it source-owned does not waive this section or inherited CFR requirements. In particular, the UTC timestamp and UTF-8 requirements below remain applicable; a conflicting domain representation needs resolution at the owning requirement, not a silent adapter exemption.

## 10.1 Opaque server-generated identifiers <a href="#101-opaque-server-generated-identifiers" id="101-opaque-server-generated-identifiers"></a>

<!-- rule-class: M+R -->

Resource identifiers **MUST** be strings and unique within their resource scope. Identifiers used in URLs **MUST** be URL-safe and satisfy [§8.6](../part-b/8-headers.md#86-no-personal-data-in-addressable-locations). Clients **MUST** treat IDs as opaque references, even when their spelling is recognisable.

Newly assigned identifiers **SHOULD** be server-generated opaque values, with UUID v4 (`format: uuid`) as the default.

The default scope is the BB; a specification **MAY** declare a narrower scope, such as a tenant, collection, or source system, where the enclosing endpoint or resource reference identifies that scope unambiguously. ULID, KSUID, or other opaque IDs **MAY** be used. A BB **MAY** reuse stable identifiers assigned by an existing source or governing scheme instead of allocating aliases solely to satisfy the guide.

The documented scope and identifier together identify the resource. Reusing a source key is appropriate when the key remains stable for that resource and is not reassigned to a different resource in that scope. This does not require a particular database key type or an identifier mapping service. A statutory identifier can be used in a URL only when it does not constitute personal data; a national ID or passport number instead belongs in a body-based lookup under [§6.6](../part-b/6-http-methods.md#66-post-search-for-complex-queries). Opaque spelling is not itself evidence that an identifier is safe to disclose.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags properties named `id` or ending in `Id` that do not declare `type: string`. A reviewer checks uniqueness within the scope, stability, opacity, URL safety and personal-data disclosure.
<!-- verification:end -->

## 10.2 RFC 3339 timestamps <a href="#102-rfc-3339-timestamps" id="102-rfc-3339-timestamps"></a>

<!-- rule-class: M -->

Timestamps **MUST** be RFC 3339 in UTC, serialized with the `Z` designator and declared as `format: date-time`. A non-UTC offset **MUST NOT** be used in an API payload; where a local time zone is significant to the consumer, it is carried in a separate field alongside the UTC value. UTC-only is inherited from `govstack-cfr-data#req-2` and cannot be relaxed by a BB specification.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter checks that properties ending in `At` declare a string with `format: date` or `date-time`, and that properties ending in `Timestamp` declare `date-time`. A test against a running implementation checks UTC values with the `Z` designator.
<!-- verification:end -->

## 10.3 RFC 3339 calendar dates <a href="#103-rfc-3339-calendar-dates" id="103-rfc-3339-calendar-dates"></a>

<!-- rule-class: M -->

Dates without time **MUST** be RFC 3339 calendar dates, declared as `format: date`.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification.

The linter checks that properties ending in `Date` declare `type: string` with `format: date`. Date fields with other names, and whether values are valid calendar dates, are left to a reviewer and to tests against a running implementation.
<!-- verification:end -->

## 10.4 Decimal-string monetary amounts <a href="#104-decimal-string-monetary-amounts" id="104-decimal-string-monetary-amounts"></a>

<!-- rule-class: M+R -->

Monetary amounts **MUST** use the object `{ amount: string (decimal), currency: string (ISO 4217) }`. Floats **MUST NOT** be used for money. Decimal-string is chosen over minor-units because GovStack-adopting countries may include currencies with non-decimal subunits and zero-subunit currencies, which a minor-units convention handles inconsistently.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter flags properties whose names end in `amount`, `price` or `balance` (any case) when typed `number` or `integer`. It does not check for the `{ amount, currency }` object or a decimal string; a reviewer checks that.
<!-- verification:end -->

## 10.5 E.164 phone numbers <a href="#105-e164-phone-numbers" id="105-e164-phone-numbers"></a>

<!-- rule-class: M+R -->

Phone numbers **MUST** be E.164 strings.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that properties with `phone` in the name are strings with exactly the pattern `^\+[1-9]\d{1,14}$`, and flags any other pattern. Other field names, and whether a number is real, are left to a reviewer.
<!-- verification:end -->

## 10.6 Email addresses <a href="#106-rfc-5322-email-addresses" id="106-rfc-5322-email-addresses"></a>

<!-- rule-class: M+R -->

Email addresses **MUST** be strings declared as `format: email`, using the RFC 5321 `Mailbox` syntax defined by the JSON Schema 2020-12 `email` format.

Display names belong in separate fields, not in the email address value.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that properties with `email` in the name are strings declared with `format: email`. A reviewer checks that display names stay out of the value, and a test checks that real values follow the syntax.
<!-- verification:end -->

## 10.7 Binary uploads and base64 payloads <a href="#107-binary-uploads-and-base64-payloads" id="107-binary-uploads-and-base64-payloads"></a>

<!-- rule-class: M+R -->

Large binary uploads **MUST** use `multipart/form-data` or a dedicated binary endpoint. A base64-encoded field **MUST** then be declared with `contentEncoding: base64` and a documented size limit.

Small inline payloads (signatures, certificates, QR codes, attestations) **MAY** be base64-encoded in JSON bodies.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that properties with `signature`, `certificate`, `qrCode`, `qr_code` or `attestation` in the name declare a string with `contentEncoding: base64` and a `maxLength`. A reviewer checks other base64 fields and that large binaries use `multipart/form-data` or a dedicated endpoint.
<!-- verification:end -->

## 10.8 ISO 3166-1 country codes <a href="#108-iso-3166-1-country-codes" id="108-iso-3166-1-country-codes"></a>

<!-- rule-class: M+R -->

Country codes **MUST** be ISO 3166-1 alpha-2.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that properties with `country` in the name are strings with exactly the pattern `^[A-Z]{2}$`. It does not check that the code is assigned, and a field limited by an `enum` of codes without that pattern is flagged.
<!-- verification:end -->

## 10.9 BCP 47 language codes <a href="#109-bcp-47-language-codes" id="109-bcp-47-language-codes"></a>

<!-- rule-class: M+R -->

Language codes **MUST** be BCP 47.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that properties with `language` or `locale` in the name are strings declaring one specific common-case BCP 47 pattern, and flags any other pattern. A reviewer judges whether a fuller BCP 47 pattern is acceptable.
<!-- verification:end -->

## 10.10 ISO 4217 currency codes <a href="#1010-iso-4217-currency-codes" id="1010-iso-4217-currency-codes"></a>

<!-- rule-class: M+R -->

Currency codes **MUST** be ISO 4217.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter checks that properties named `currency`, starting with `currency` or containing `Currency` are strings with exactly the pattern `^[A-Z]{3}$`. It does not check that the code is assigned, and an `enum` of codes without the pattern is flagged.
<!-- verification:end -->

## 10.11 UTF-8 text encoding <a href="#1011-utf-8-text-encoding" id="1011-utf-8-text-encoding"></a>

<!-- rule-class: M -->

Text in API payloads **MUST** be UTF-8. A media type declared anywhere in the specification **MUST NOT** carry a `charset` parameter naming any other encoding. This is inherited from `govstack-cfr-data#req-1` and cannot be relaxed by a BB specification.

`charset=utf-8` **MAY** be stated explicitly, though it is redundant on JSON media types, whose encoding RFC 8259 already fixes at UTF-8.

<!-- verification:start -->
**Verification:** Automated specification check.

The linter flags a `charset` other than UTF-8 on request and response media types under `paths`, `webhooks`, `components.requestBodies` and `components.responses`, and on AsyncAPI `defaultContentType` and message `contentType` (under `components.messages` and inline channel messages). Callbacks, parameter and header `content` maps and `encoding` entries are not checked. A test against a running implementation checks the payload bytes.
<!-- verification:end -->
