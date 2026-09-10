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

**[M+R]** Resource identifiers **MUST** be strings and unique within their resource scope. Identifiers used in URLs **MUST** be URL-safe and satisfy [§8.6](../part-b/8-headers.md#86-no-personal-data-in-addressable-locations). Clients **MUST** treat IDs as opaque references, even when their spelling is recognisable.

Newly assigned identifiers **SHOULD** be server-generated opaque values, with UUID v4 (`format: uuid`) as the default.

The default scope is the BB; a specification **MAY** declare a narrower scope, such as a tenant, collection, or source system, where the enclosing endpoint or resource reference identifies that scope unambiguously. ULID, KSUID, or other opaque IDs **MAY** be used. A BB **MAY** reuse stable identifiers assigned by an existing source or governing scheme instead of allocating aliases solely to satisfy this guide.

The documented scope and identifier together identify the resource. Reusing a source key is appropriate when the key remains stable for that resource and is not reassigned to a different resource in that scope. This does not require a particular database key type or an identifier mapping service. A statutory identifier can be used in a URL only when it does not constitute personal data; a national ID or passport number instead belongs in a body-based lookup under [§6.6](../part-b/6-http-methods.md#66-post-search-for-complex-queries). Opaque spelling is not itself evidence that an identifier is safe to disclose.

## 10.2 RFC 3339 timestamps <a href="#102-rfc-3339-timestamps" id="102-rfc-3339-timestamps"></a>

**[M]** Timestamps **MUST** be RFC 3339 in UTC, serialized with the `Z` designator and declared as `format: date-time`. A non-UTC offset **MUST NOT** be used in an API payload; where a local time zone is significant to the consumer, it is carried in a separate field alongside the UTC value. UTC-only is inherited from `govstack-cfr-data#req-2` and cannot be relaxed by a BB specification.

## 10.3 RFC 3339 calendar dates <a href="#103-rfc-3339-calendar-dates" id="103-rfc-3339-calendar-dates"></a>

**[M]** Dates without time **MUST** be RFC 3339 calendar dates, declared as `format: date`.

## 10.4 Decimal-string monetary amounts <a href="#104-decimal-string-monetary-amounts" id="104-decimal-string-monetary-amounts"></a>

**[M+R]** Monetary amounts **MUST** use the object `{ amount: string (decimal), currency: string (ISO 4217) }`. Floats **MUST NOT** be used for money. Decimal-string is chosen over minor-units because GovStack-adopting countries may include currencies with non-decimal subunits and zero-subunit currencies, which a minor-units convention handles inconsistently.

## 10.5 E.164 phone numbers <a href="#105-e164-phone-numbers" id="105-e164-phone-numbers"></a>

**[M+R]** Phone numbers **MUST** be E.164 strings.

## 10.6 RFC 5322 email addresses <a href="#106-rfc-5322-email-addresses" id="106-rfc-5322-email-addresses"></a>

**[M+R]** Email addresses **MUST** be RFC 5322 strings, declared as `format: email`.

## 10.7 Binary uploads and base64 payloads <a href="#107-binary-uploads-and-base64-payloads" id="107-binary-uploads-and-base64-payloads"></a>

**[M+R]** Large binary uploads **MUST** use `multipart/form-data` or a dedicated binary endpoint. A base64-encoded field **MUST** then be declared with `contentEncoding: base64` and a documented size limit.

Small inline payloads (signatures, certificates, QR codes, attestations) **MAY** be base64-encoded in JSON bodies.

## 10.8 ISO 3166-1 country codes <a href="#108-iso-3166-1-country-codes" id="108-iso-3166-1-country-codes"></a>

**[M+R]** Country codes **MUST** be ISO 3166-1 alpha-2.

## 10.9 BCP 47 language codes <a href="#109-bcp-47-language-codes" id="109-bcp-47-language-codes"></a>

**[M+R]** Language codes **MUST** be BCP 47.

## 10.10 ISO 4217 currency codes <a href="#1010-iso-4217-currency-codes" id="1010-iso-4217-currency-codes"></a>

**[M+R]** Currency codes **MUST** be ISO 4217.

## 10.11 UTF-8 text encoding <a href="#1011-utf-8-text-encoding" id="1011-utf-8-text-encoding"></a>

**[M]** Text in API payloads **MUST** be UTF-8. A media type declared anywhere in the specification **MUST NOT** carry a `charset` parameter naming any other encoding. This is inherited from `govstack-cfr-data#req-1` and cannot be relaxed by a BB specification.

`charset=utf-8` **MAY** be stated explicitly, though it is redundant on JSON media types, whose encoding RFC 8259 already fixes at UTF-8.
