---
description: "Rules governing localisation of API content: request-language handling, translation boundaries for stable content, default language, and response-language declaration."
---

# 19. Localisation

{% hint style="info" %}
**Intent.** A single language model for a multi-country ecosystem.

**Applies to:** Universal. On the OpenAPI surface localisation uses `Accept-Language` and `Content-Language` HTTP headers. On the AsyncAPI surface it uses the `acceptLanguage` and `contentLanguage` message headers defined in [§17](../part-d/17-asyncapi-channel-rules.md).

**Layer ([§1.8](../1-introduction.md#18-layering-what-this-guide-constrains)).** [§19.3](#193-declared-default-language)–[§19.4](#194-declare-the-response-language) constrain the specification: declare the default and selected response languages. [§19.1](#191-honour-the-request-language)–[§19.2](#192-never-translate-stable-content) are behavioural-contract rules verified by implementation-level conformance tests. The set of languages a given BB must support is per-BB and per-deployment policy, not fixed here.
{% endhint %}

## 19.1 Honour the request language <a href="#191-honour-the-request-language" id="191-honour-the-request-language"></a>

<!-- rule-class: R -->

Localisable content (error `title`/`detail`, enum display labels, free-text status messages) **MUST** respect the request language header appropriate to the surface: `Accept-Language` for HTTP, `acceptLanguage` for AsyncAPI messages.

A deployment offering one language satisfies this rule by declaring that supported language as its default under [§19.3](#193-declared-default-language) and identifying it in responses under [§19.4](#194-declare-the-response-language). A request for an unsupported language uses that declared fallback; it does not require translation into a language the deployment does not offer.

<!-- verification:start -->
**Verification:** Runtime verification required; outside the specification linter.

A test against a running implementation checks that error text, labels and status messages follow the request language, and that an unsupported language falls back to the declared default.
<!-- verification:end -->

## 19.2 Never translate stable content <a href="#192-never-translate-stable-content" id="192-never-translate-stable-content"></a>

<!-- rule-class: R -->

Stable content (HTTP Problem `type`, transport-neutral asynchronous error `code`, enum values, identifiers, timestamps, currency codes) **MUST NOT** be translated.

<!-- verification:start -->
**Verification:** Runtime verification required; outside the specification linter.

A test against a running implementation checks that problem types, error codes, enum values, identifiers, timestamps and currency codes are never translated.
<!-- verification:end -->

## 19.3 Declared default language <a href="#193-declared-default-language" id="193-declared-default-language"></a>

<!-- rule-class: R -->

The specification **MUST** declare its default response language.

English **SHOULD** be used as the cross-border fallback when deployment policy or law does not select another default.

<!-- verification:start -->
**Verification:** Review or evidence assessment required.

The linter does not check this rule. A reviewer checks that the specification states its default response language, and that English is used as the fallback where deployment policy or law does not choose another.
<!-- verification:end -->

## 19.4 Declare the response language <a href="#194-declare-the-response-language" id="194-declare-the-response-language"></a>

<!-- rule-class: M+R -->

Responses or messages with localised content **MUST** include the response language header appropriate to the surface: `Content-Language` for HTTP, `contentLanguage` for AsyncAPI messages.

<!-- verification:start -->
**Verification:** Partial linter check. Remaining clauses need separate verification. Semantic review is also required.

The linter warns when an OpenAPI operation declares an operation-level `Accept-Language` header parameter but no response declares `Content-Language`, and when an AsyncAPI channel has an `acceptLanguage` message but no `contentLanguage` message. Path-item-level parameters are not read. A reviewer checks every other localised response.
<!-- verification:end -->
