---
description: "The rules every GovStack Building Block API specification must follow, so that BBs compose into a consistent national platform."
---

# GovStack Cross-BB API Design Guide

{% hint style="warning" %}
**Status: DRAFT v0.2, for GovStack committee feedback.** This guide is not yet ratified. It supersedes the v0.1 document circulated on 2026-05-31; the [version history](version-history.md) lists every change, and [How to use this guide](how-to-use-this-guide.md) maps the old section numbers to the new ones.
{% endhint %}

**Author:** Jeremi Joslin · **Date:** 2026-07-10

## Start here

- **Editing a BB specification?** Run the [spec editor checklist](guides/spec-editor-checklist.md) against your spec, use [Rules at a glance](all-rules.md) to jump to any rule, and [validate mechanically](guides/validating-your-spec.md) before review.
- **Reviewing this draft for the committee?** [How to use this guide](how-to-use-this-guide.md) says what feedback is most useful at this stage; [Appendix B](appendix/b-open-questions.md) is the decision agenda, with the questions that block v1.0 marked.
- **Pointing an AI coding agent at the rules?** The book ships a machine-readable index of every rule (`rules.yaml`, at the root of this folder in the repository); [Using this guide with AI agents](guides/using-with-ai-agents.md) has a ready-made instruction block for a BB repository.

## Executive summary

GovStack has standardised a great deal, but never a single API design guide that every Building Block follows. In its absence each BB team made reasonable local choices that, predictably, diverged. The rules below were drafted against the published Building Block API specifications as they stood in 2026, so this guide closes gaps observed in those specifications, not hypothetical ones.

The GovStack Cross-BB API Design Guide defines the rules every Building Block API specification must follow, so that an integrator combining several BBs into a national digital platform sees consistent shapes for authentication, errors, identifiers, pagination, events, and lifecycle. It governs OpenAPI 3.1 REST surfaces, CloudEvents event payloads, OpenAPI webhooks, and AsyncAPI 3.0 documentation for brokered event channels and event streams. Operational behaviour (token validation, key rotation, audit logging) and ecosystem governance (ratification, enforcement, exception lifecycle) are out of scope.

The pay-off is interoperability by construction. A canonical, machine-validatable, consistently shaped specification lets human implementers and AI coding agents generate correct clients or servers from the spec alone; an ambiguous or divergent one yields plausible-but-wrong code that quietly breaks interoperability. A guide precise enough for a linter to enforce is precise enough for an agent to implement.

This draft is intended to be stress-tested immediately against live specification work, so the rules can be checked for clarity, enforceability, and implementability without excessive ceremony. Lessons from those pilots should feed back into v1.0 before ratification.

The substantive rules establish:

- Canonical, machine-validatable OpenAPI and AsyncAPI entrypoints at known locations ([§2](part-a/2-openapi-document-standards.md), [§3](part-a/3-asyncapi-document-standards.md)).
- REST-style URLs with major versions in the path, plural-noun resource names, standard HTTP verb semantics, and an unversioned `/health` endpoint ([§5](part-b/5-url-structure-and-versioning.md)–[§6](part-b/6-http-methods.md)).
- Standard HTTP status codes used consistently, with `ETag` / `If-Match` for optimistic concurrency ([§7](part-b/7-http-status-codes.md)).
- Standard headers for authentication, idempotency, localisation, correlation, and rate limiting; no personal data in URLs, channel addresses, routing keys, or message headers ([§8](part-b/8-headers.md), [§17](part-d/17-asyncapi-channel-rules.md)).
- `camelCase` JSON, RFC 3339 timestamps, decimal-string monetary amounts, E.164 phone numbers, ISO code lists for country / currency / language ([§9](part-c/9-json-conventions-and-naming.md)–[§10](part-c/10-data-types-and-formats.md)).
- One ecosystem-wide error format (RFC 9457 Problem Details, which obsoletes RFC 7807) with GovStack extensions for stable error codes, trace IDs, and field-level validation ([§11](part-c/11-errors.md)).
- Cursor-based pagination by default, with a single envelope shape for collection responses ([§12](part-c/12-pagination-filtering-sorting.md)).
- OAuth 2.0 + OIDC for citizen-facing operations, mutual TLS or OAuth client credentials for BB-to-BB calls ([§13](part-d/13-authentication-and-authorisation.md)).
- An `Idempotency-Key` contract for retry-safe POSTs ([§14](part-d/14-idempotency.md)).
- A single async pattern: `202 Accepted` plus an Operation resource referenced from a shared YAML file ([§15](part-d/15-asynchronous-operations.md)).
- CloudEvents as the normative event envelope and type/source model across transports; OpenAPI `webhooks` and AsyncAPI 3.0 document the event surfaces ([§16](part-d/16-cloudevents-and-webhooks.md), [§17](part-d/17-asyncapi-channel-rules.md)).
- SemVer with major versions visible in the relevant surface contract, additive minor changes, deprecation and sunset headers ([§18](part-d/18-compatibility-and-lifecycle.md)).
- A single language model based on `Accept-Language` and `Content-Language` ([§19](part-e/19-localisation.md)).
- Mechanical validation: every BB spec MUST pass schema validation and the machine-checkable GovStack Spectral ruleset rules ([§20](part-e/20-conformance-and-validation.md)).

Where the guide adopts an external standard or convention (RFC 9457, CloudEvents, OAuth 2.0 + OIDC, the health-check response convention, ISO code lists), that standard or convention takes precedence over the guide's generic rules ([§1.7](1-introduction.md#17-precedence-of-external-standards)). Rules use RFC 2119 keywords (see [§1.5](1-introduction.md#15-language)). Open design calls are consolidated in [Appendix B](appendix/b-open-questions.md).
