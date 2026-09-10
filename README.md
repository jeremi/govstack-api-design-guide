---
description: "The rules every GovStack Building Block API specification must follow, so that BBs compose into a consistent national platform."
---

# GovStack Cross-BB API Design Guide

{% hint style="warning" %}
**Status: DRAFT, for GovStack committee feedback.** This guide has not been
published or ratified.
{% endhint %}

**Author:** Jeremi Joslin

**Specification:** `govstack-cfr-api`<br>
**Version:** `0.2.0-draft`<br>
**Proposed parent:** `govstack-cfr` (candidate relationship pending CFR issues
[#7](https://github.com/GovStackWorkingGroup/cfr-architecture/issues/7) and
[#8](https://github.com/GovStackWorkingGroup/cfr-architecture/issues/8))

The [draft change record](draft-changes.md) explains the current revision and its compatibility with the preceding unpublished draft.

## Start here

- **Editing a BB specification?** [What a BB publishes](how-to-use-this-guide.md#what-a-bb-publishes) lists the four artifacts, [Rules by API kind](rules-by-kind.md) shows which rules apply to your surface, the [spec editor checklist](guides/spec-editor-checklist.md) is the review pass, [Rules at a glance](all-rules.md) jumps to any rule, and [Validating your spec](guides/validating-your-spec.md) is the mechanical check.
- **Reviewing this draft for the committee?** [How to use this guide](how-to-use-this-guide.md) says what feedback is most useful at this stage.
- **Reviewing CFR alignment?** [§1.3](1-introduction.md#13-relationship-to-existing-govstack-documents) maps the guide to its proposed parent requirements and identifies the CFR changes needed for protocol-native and non-HTTP interfaces.
- **Pointing an AI coding agent at the rules?** The book ships a machine-readable index of every rule with its level and API kinds (`rules.yaml`, at the root of this folder in the repository); [Using this guide with AI agents](guides/using-with-ai-agents.md) has a ready-made instruction block for a BB repository.

## Executive summary

GovStack has standardised a great deal, but never a single API design guide that every Building Block follows. In its absence each BB team made reasonable local choices that, predictably, diverged. The rules below address gaps observed in published Building Block API specifications, not hypothetical ones.

The GovStack Cross-BB API Design Guide defines the rules every Building Block API specification must follow, so that an integrator combining several BBs into a national digital platform sees consistent shapes for authentication, errors, identifiers, pagination, events, and lifecycle. It governs OpenAPI 3.1 REST surfaces, CloudEvents event payloads, OpenAPI webhooks, and AsyncAPI 3 documentation for brokered event channels and event streams. Operational behaviour (token validation, key rotation, audit logging) and ecosystem governance (ratification, enforcement, exception lifecycle) are out of scope.

The aim is to reduce integration work across BBs. A canonical, machine-validatable specification supports client generation and makes differences easier to review. Validation catches structural defects; human review and implementation tests establish whether the documented behaviour is usable and interoperable. A clean linter result alone does not establish that.

This draft is intended to be stress-tested immediately against live specification work, so the rules can be checked for clarity, enforceability, and implementability without excessive ceremony. Lessons from those pilots should feed back into v1.0 before ratification.

The substantive rules establish:

- Canonical, machine-validatable OpenAPI and AsyncAPI entrypoints at known locations ([§2](part-a/2-openapi-document-standards.md), [§3](part-a/3-asyncapi-document-standards.md)).
- Standard HTTP semantics and an unversioned `/health` endpoint, with versioned resource paths and consistent URL naming as recommended defaults rather than universal wire requirements ([§5](part-b/5-url-structure-and-versioning.md)–[§6](part-b/6-http-methods.md)).
- Standard HTTP status codes used consistently, with `ETag` / `If-Match` for optimistic concurrency ([§7](part-b/7-http-status-codes.md)).
- Standard headers for authentication, idempotency, localisation, correlation, and rate limiting; no personal data in URLs, channel addresses, routing keys, or message headers ([§8](part-b/8-headers.md), [§17](part-d/17-asyncapi-channel-rules.md)).
- Recommended `camelCase` for GovStack-owned JSON, plus normative RFC 3339 timestamps, decimal-string monetary amounts, E.164 phone numbers, and ISO code lists for country / currency / language ([§9](part-c/9-json-conventions-and-naming.md)–[§10](part-c/10-data-types-and-formats.md)).
- One ecosystem-wide HTTP error format based on RFC 9457 Problem Details, with a stable `https://govstack.global/problems/...` type URI, trace IDs, and field-level validation ([§11](part-c/11-errors.md)).
- Cursor-based pagination by default, with a single envelope shape for collection responses ([§12](part-c/12-pagination-filtering-sorting.md)).
- OAuth 2.0 + OIDC for citizen-facing operations, mutual TLS or OAuth client credentials for BB-to-BB calls ([§13](part-d/13-authentication-and-authorisation.md)).
- An `Idempotency-Key` contract for retry-safe POSTs ([§14](part-d/14-idempotency.md)).
- A common async discovery and polling pattern: `202 Accepted` plus a locally defined Operation resource ([§15](part-d/15-asynchronous-operations.md)).
- CloudEvents as the normative event envelope and type/source model across transports; OpenAPI `webhooks` and AsyncAPI 3 document the event surfaces ([§16](part-d/16-cloudevents-and-webhooks.md), [§17](part-d/17-asyncapi-channel-rules.md)).
- SemVer with major versions visible in the relevant surface contract, additive minor changes, deprecation and sunset headers ([§18](part-d/18-compatibility-and-lifecycle.md)).
- A single language model based on `Accept-Language` and `Content-Language` ([§19](part-e/19-localisation.md)).
- Mechanical validation: every BB spec MUST pass schema validation and the machine-checkable GovStack Spectral ruleset rules ([§20](part-e/20-conformance-and-validation.md)).

Where the guide adopts an external standard or convention (RFC 9457, CloudEvents, OAuth 2.0 + OIDC, the health-check response convention, ISO code lists), that standard or convention takes precedence over the guide's generic rules ([§1.7](1-introduction.md#17-precedence-of-external-standards)). Rules use RFC 2119 keywords (see [§1.5](1-introduction.md#15-language)).
