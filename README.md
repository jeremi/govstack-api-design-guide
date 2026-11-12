---
description: "Design and review API contracts for GovStack Building Block specifications."
---

# GovStack Cross-BB API Design Guide

Design an API as part of a GovStack Building Block (BB) specification. This guide helps specification authors define the operations, data, errors, and client-visible behaviour in the specification repository.

**Draft `0.3.0-draft`, for feedback.** Unofficial and not yet ratified.

## Start here

1. **Design or revise an API.** [How to use this guide](how-to-use-this-guide.md) takes you from the specification's requirements to the contract files and the rules that apply.
2. **Review a specification.** Use the [spec editor checklist](guides/spec-editor-checklist.md) to check the contract before submitting it for review.
3. **Validate the files.** [Validating your spec](guides/validating-your-spec.md) gives the setup, commands, and checks that still need a reviewer.

You can use the guide as a reference while you write. There is no need to read every chapter first.

## Find a rule

- [Rules by API kind](rules-by-kind.md): find the rules for HTTP reads, mutations, and events. Apply each rule where its stated conditions hold.
- [Rules at a glance](all-rules.md): look up a rule by number, title, or requirement level.
- Common topics: [errors](part-c/11-errors.md), [pagination](part-c/12-pagination-filtering-sorting.md), [authentication](part-d/13-authentication-and-authorisation.md), [safe retries](part-d/14-idempotency.md), and [asynchronous operations](part-d/15-asynchronous-operations.md).

## Executive summary

Consistent API contracts reduce the differences integrators must handle across Building Blocks. This guide covers OpenAPI 3.1, CloudEvents, HTTP webhooks, and AsyncAPI 3, with common conventions for data, errors, authentication, pagination, events, and compatibility.

The work happens in the specification: choose one canonical contract for each API surface, describe what a client can rely on, link the contract to functional requirements, and validate the files. Running and operating an implementation is a separate activity. The [Introduction](1-introduction.md) explains the scope, requirement levels, and relationship to other standards.

## About this draft

**Author and maintainer:** Jeremi Joslin. This incubation repository is not an official GovStack publication. See the [official GovStack specifications](https://specs.govstack.global/).

**Specification:** `govstack-cfr-api` · **Version:** `0.3.0-draft`.

The proposed parent is the Cross-Functional Requirements specification, `govstack-cfr`. That relationship depends on CFR issues [#7](https://github.com/GovStackWorkingGroup/cfr-architecture/issues/7) and [#8](https://github.com/GovStackWorkingGroup/cfr-architecture/issues/8), as explained in [§1.3](1-introduction.md#13-relationship-to-existing-govstack-documents).

See [draft changes](draft-changes.md) for revision history and [how to review this draft](how-to-use-this-guide.md#how-to-review-this-draft) for the feedback needed before ratification.
