---
description: "Rules governing localisation of API content: request-language handling, translation boundaries for stable content, default language, and response-language declaration."
---

# 19. Localisation

{% hint style="info" %}
**Intent.** A single language model for a multi-country ecosystem.

**Applies to:** Universal. On the OpenAPI surface localisation uses `Accept-Language` and `Content-Language` HTTP headers. On the AsyncAPI surface it uses the `acceptLanguage` and `contentLanguage` message headers defined in [§17](../part-d/17-asyncapi-channel-rules.md).

**Layer ([§1.8](../1-introduction.md#18-layering-what-this-guide-constrains)).** [§19.4](#194-declare-the-response-language) constrains the specification: declare the response language header on localised responses. [§19.1](#191-honour-the-request-language)–[§19.3](#193-english-as-default-language) are behavioural-contract rules: they bind a conforming implementation at run time (honour the request language, never translate stable fields, default to English) and are verified by the conformance test pack. The set of languages a given BB must support is per-BB and per-deployment policy ([`[OPEN-19-A]`](../appendix/b-open-questions.md)), not fixed here.
{% endhint %}

## 19.1 Honour the request language <a href="#191-honour-the-request-language" id="191-honour-the-request-language"></a>

**[R]** Localisable content (error `title`/`detail`, enum display labels, free-text status messages) **MUST** respect the request language header appropriate to the surface: `Accept-Language` for HTTP, `acceptLanguage` for AsyncAPI messages.

## 19.2 Never translate stable content <a href="#192-never-translate-stable-content" id="192-never-translate-stable-content"></a>

**[R]** Stable content (HTTP Problem `type`, transport-neutral asynchronous error `code`, enum values, identifiers, timestamps, currency codes) **MUST NOT** be translated.

## 19.3 English as default language <a href="#193-english-as-default-language" id="193-english-as-default-language"></a>

**[R]** Default language **MUST** be English. [`[OPEN-19-A]`](../appendix/b-open-questions.md)

## 19.4 Declare the response language <a href="#194-declare-the-response-language" id="194-declare-the-response-language"></a>

**[M+R]** Responses or messages with localised content **MUST** include the response language header appropriate to the surface: `Content-Language` for HTTP, `contentLanguage` for AsyncAPI messages.
