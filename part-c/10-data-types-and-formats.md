---
description: "Canonical representations for identifiers, dates, money, phone numbers, emails, binaries, and standardised code fields shared across building blocks."
---

# 10. Data types and formats

{% hint style="info" %}
**Intent.** A given concept has the same representation across BBs.

**Applies to:** Universal.
{% endhint %}

## 10.1 Opaque server-generated identifiers <a href="#101-opaque-server-generated-identifiers" id="101-opaque-server-generated-identifiers"></a>

**[M+R]** Resource identifiers **MUST** be opaque, URL-safe strings, server-generated, and globally unique within the BB. UUID v4 (`format: uuid`) **SHOULD** be the default; ULID, KSUID, or other opaque IDs **MAY** be used where ordering or sortability matters. Clients **MUST** treat all IDs as opaque. **Exception:** registries with statutory identifiers (civil registry numbers, parcel IDs, business numbers, licence numbers) **MAY** use those identifiers in URL paths provided [§8.6](../part-b/8-headers.md#86-no-personal-data-in-addressable-locations) is satisfied (the identifier does not constitute personal data; a parcel number or business number is acceptable, a national ID or passport number is not). The opacity requirement applies to BB-generated identifiers; statutory identifiers are by definition not opaque to clients.

## 10.2 RFC 3339 timestamps <a href="#102-rfc-3339-timestamps" id="102-rfc-3339-timestamps"></a>

**[M]** Timestamps **MUST** be RFC 3339 with timezone, declared as `format: date-time`.

## 10.3 RFC 3339 calendar dates <a href="#103-rfc-3339-calendar-dates" id="103-rfc-3339-calendar-dates"></a>

**[M]** Dates without time **MUST** be RFC 3339 calendar dates, declared as `format: date`.

## 10.4 Decimal-string monetary amounts <a href="#104-decimal-string-monetary-amounts" id="104-decimal-string-monetary-amounts"></a>

**[M+R]** Monetary amounts **MUST** use the object `{ amount: string (decimal), currency: string (ISO 4217) }`. Floats **MUST NOT** be used for money. Decimal-string is chosen over minor-units because GovStack-adopting countries may include currencies with non-decimal subunits and zero-subunit currencies, which a minor-units convention handles inconsistently.

## 10.5 E.164 phone numbers <a href="#105-e164-phone-numbers" id="105-e164-phone-numbers"></a>

**[M+R]** Phone numbers **MUST** be E.164 strings.

## 10.6 RFC 5322 email addresses <a href="#106-rfc-5322-email-addresses" id="106-rfc-5322-email-addresses"></a>

**[M+R]** Email addresses **MUST** be RFC 5322 strings, declared as `format: email`.

## 10.7 Binary uploads and base64 payloads <a href="#107-binary-uploads-and-base64-payloads" id="107-binary-uploads-and-base64-payloads"></a>

**[M+R]** Large binary uploads **MUST** use `multipart/form-data` or a dedicated binary endpoint. Small inline payloads (signatures, certificates, QR codes, attestations) **MAY** be base64-encoded in JSON bodies; the field **MUST** then be declared with `contentEncoding: base64` and a documented size limit.

## 10.8 ISO 3166-1 country codes <a href="#108-iso-3166-1-country-codes" id="108-iso-3166-1-country-codes"></a>

**[M+R]** Country codes **MUST** be ISO 3166-1 alpha-2.

## 10.9 BCP 47 language codes <a href="#109-bcp-47-language-codes" id="109-bcp-47-language-codes"></a>

**[M+R]** Language codes **MUST** be BCP 47.

## 10.10 ISO 4217 currency codes <a href="#1010-iso-4217-currency-codes" id="1010-iso-4217-currency-codes"></a>

**[M+R]** Currency codes **MUST** be ISO 4217.
